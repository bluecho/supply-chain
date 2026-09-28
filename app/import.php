<?php
declare(strict_types=1);

// Import of the dispatch log book (.xlsx). Only monthly totals are kept:
// trucks, tonnes dispatched and delivered, transit weight loss and transit days.
// Truck numbers, driver/transporter details, rates, invoices and margins in the
// workbook are read to count trips but never stored.

// ---------- minimal .xlsx reader (ZipArchive + SimpleXML) ----------

/** @return array<string, array<int, array<int, mixed>>> sheet name => rows => cells (0-based columns) */
function read_xlsx(string $path): array
{
    if (!class_exists('ZipArchive')) {
        throw new RuntimeException('The PHP "zip" extension is not enabled on this server. Ask your host to enable it.');
    }
    $zip = new ZipArchive();
    if ($zip->open($path) !== true) {
        throw new InvalidArgumentException('That file is not a valid .xlsx workbook.');
    }
    $xml = function (string $name) use ($zip): ?SimpleXMLElement {
        $data = $zip->getFromName($name);
        return $data === false ? null : simplexml_load_string($data, 'SimpleXMLElement', LIBXML_NONET);
    };

    $shared = [];
    if ($ss = $xml('xl/sharedStrings.xml')) {
        foreach ($ss->si as $si) {
            $text = (string) $si->t;
            foreach ($si->r as $run) {
                $text .= (string) $run->t;
            }
            $shared[] = $text;
        }
    }

    // Which cell styles are dates, so serial numbers can be turned into dates.
    $dateStyles = [];
    if ($styles = $xml('xl/styles.xml')) {
        $custom = [];
        foreach ($styles->numFmts->numFmt ?? [] as $f) {
            $custom[(int) $f['numFmtId']] = (string) $f['formatCode'];
        }
        $i = 0;
        foreach ($styles->cellXfs->xf ?? [] as $xf) {
            $id = (int) $xf['numFmtId'];
            $code = $custom[$id] ?? '';
            $dateStyles[$i++] = ($id >= 14 && $id <= 22) || ($id >= 45 && $id <= 47)
                || ($code !== '' && preg_match('/[dmy]/i', preg_replace('/"[^"]*"|\[[^\]]*\]/', '', $code)));
        }
    }

    $workbook = $xml('xl/workbook.xml');
    $rels = $xml('xl/_rels/workbook.xml.rels');
    if (!$workbook || !$rels) {
        throw new InvalidArgumentException('That file is not a valid .xlsx workbook.');
    }
    $targets = [];
    foreach ($rels->Relationship as $r) {
        $targets[(string) $r['Id']] = ltrim(preg_replace('#^/?xl/#', '', (string) $r['Target']), '/');
    }

    $sheets = [];
    foreach ($workbook->sheets->sheet as $sheet) {
        $rid = (string) $sheet->attributes('http://schemas.openxmlformats.org/officeDocument/2006/relationships')['id'];
        $doc = isset($targets[$rid]) ? $xml('xl/' . $targets[$rid]) : null;
        if (!$doc) {
            continue;
        }
        $rows = [];
        foreach ($doc->sheetData->row as $row) {
            $cells = [];
            foreach ($row->c as $c) {
                preg_match('/^([A-Z]+)/', (string) $c['r'], $m);
                $col = 0;
                foreach (str_split($m[1] ?? 'A') as $ch) {
                    $col = $col * 26 + (ord($ch) - 64);
                }
                $type = (string) $c['t'];
                $v = (string) $c->v;
                if ($type === 's') {
                    $value = $shared[(int) $v] ?? '';
                } elseif ($type === 'inlineStr') {
                    $value = (string) $c->is->t;
                } elseif ($type === 'str' || $type === 'e') {
                    $value = $v;
                } elseif ($type === 'b') {
                    $value = $v === '1';
                } elseif ($v === '') {
                    $value = null;
                } else {
                    $value = (float) $v;
                    if (!empty($dateStyles[(int) $c['s']]) && $value > 0 && $value < 100000) {
                        $value = (new DateTimeImmutable('1899-12-30'))->modify('+' . (int) floor($value) . ' days');
                    }
                }
                $cells[$col - 1] = $value;
            }
            $rows[(int) $row['r']] = $cells;
        }
        $sheets[(string) $sheet['name']] = $rows;
    }
    $zip->close();
    return $sheets;
}

// ---------- log book analysis ----------

function parse_log_date(mixed $v): ?DateTimeImmutable
{
    if ($v instanceof DateTimeImmutable) {
        $d = $v;
    } elseif (is_string($v) && preg_match('#^\s*(\d{1,2})[./-](\d{1,2})[./-](\d{4})\s*$#', $v, $m) && checkdate((int) $m[2], (int) $m[1], (int) $m[3])) {
        $d = new DateTimeImmutable(sprintf('%04d-%02d-%02d', $m[3], $m[2], $m[1]));
    } elseif (is_string($v) && preg_match('#^\s*(\d{4})-(\d{2})-(\d{2})#', $v, $m) && checkdate((int) $m[2], (int) $m[3], (int) $m[1])) {
        $d = new DateTimeImmutable("$m[1]-$m[2]-$m[3]");
    } else {
        return null;
    }
    $year = (int) $d->format('Y');
    return $year >= 2015 && $year <= 2050 ? $d : null;
}

function weight(mixed $v): ?float
{
    return is_float($v) && $v > 0 && $v < 60 ? $v : null;
}

/**
 * Finds the header row (the one with "Truck Number") and turns each truck trip
 * into monthly totals. Returns null for sheets that are not dispatch logs.
 */
function analyse_log_sheet(string $name, array $rows): ?array
{
    $headerRow = null;
    $cols = [];
    foreach (array_slice($rows, 0, 8, true) as $r => $cells) {
        foreach ($cells as $i => $v) {
            if (is_string($v) && preg_match('/truck\s*number/i', $v)) {
                $headerRow = $r;
                break 2;
            }
        }
    }
    if ($headerRow === null) {
        return null;
    }
    $find = function (string $pattern) use ($rows, $headerRow): ?int {
        foreach ($rows[$headerRow] as $i => $v) {
            if (is_string($v) && preg_match($pattern, strtolower(trim($v)))) {
                return $i;
            }
        }
        return null;
    };
    $cols = [
        'truck'    => $find('/truck\s*number/'),
        'dispatch' => $find('/date\s*of\s*dispatch/'),
        'pi'       => $find('/weight at (pi|prakritik)/'),
        'itc'      => $find('/weight at (itc|mill|customer)/'),
        'exit'     => $find('/truck exit/'),
        'entry'    => $find('/truck entry|reached on/'),
        'wc'       => $find('/^wc\b|weighbridge/'),
    ];
    if ($cols['itc'] === null && $cols['pi'] === null) {
        return null;
    }

    $cell = fn (array $cells, ?int $i) => $i === null ? null : ($cells[$i] ?? null);
    $months = [];
    $seenWc = [];
    $stats = ['trips' => 0, 'duplicates' => 0, 'undated' => 0];
    foreach ($rows as $r => $cells) {
        if ($r <= $headerRow) {
            continue;
        }
        $truck = strtoupper(preg_replace('/\s+/', '', (string) $cell($cells, $cols['truck'])));
        if (!preg_match('/^[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{3,4}$/', $truck)) {
            continue;
        }
        $itc = weight($cell($cells, $cols['itc']));
        $pi = weight($cell($cells, $cols['pi']));
        if ($itc === null && $pi === null) {
            continue;
        }
        // The weighbridge ticket identifies one delivery; the same ticket twice is a duplicate entry.
        $wc = trim((string) $cell($cells, $cols['wc']));
        if ($wc !== '' && isset($seenWc[$wc])) {
            $stats['duplicates']++;
            continue;
        }
        if ($wc !== '') {
            $seenWc[$wc] = true;
        }
        $dispatched = parse_log_date($cell($cells, $cols['dispatch']));
        $delivered = parse_log_date($cell($cells, $cols['exit'])) ?? parse_log_date($cell($cells, $cols['entry']));
        $when = $delivered ?? $dispatched;
        if (!$when) {
            $stats['undated']++;
            continue;
        }
        $month = $when->format('Y-m');
        $m = &$months[$month];
        $m ??= ['trucks' => 0, 'delivered' => 0.0, 'dispatched' => 0.0, 'loss' => 0.0, 'lossBase' => 0.0, 'transitDays' => 0, 'transitTrips' => 0];
        $m['trucks']++;
        $m['delivered'] += $itc ?? 0;
        $m['dispatched'] += $pi ?? 0;
        if ($itc !== null && $pi !== null && $pi >= $itc && $pi - $itc < 10) {
            $m['loss'] += $pi - $itc;
            $m['lossBase'] += $pi;
        }
        if ($delivered && $dispatched) {
            $days = (int) $dispatched->diff($delivered)->format('%r%a');
            if ($days >= 0 && $days <= 30) {
                $m['transitDays'] += $days;
                $m['transitTrips']++;
            }
        }
        unset($m);
        $stats['trips']++;
    }
    if (!$stats['trips']) {
        return null;
    }
    ksort($months);
    // Readable default name for the website, e.g. "Euca Chips " -> "Eucalyptus chips".
    $label = trim(preg_replace('/\s+/', ' ', $name));
    $label = preg_replace(['/\beuca\b/i', '/\bpopl\b/i', '/\bshuba?\b/i', '/\bcasu\b/i'], ['Eucalyptus', 'Poplar', 'Shubabul', 'Casuarina'], $label);
    $label = ucfirst(strtolower($label));
    return [
        'name'       => $name,
        'label'      => mb_substr($label, 0, 80),
        'months'     => $months,
        'trips'      => $stats['trips'],
        'duplicates' => $stats['duplicates'],
        'undated'    => $stats['undated'],
        'deliveredMt'  => round(array_sum(array_column($months, 'delivered')), 1),
        'dispatchedMt' => round(array_sum(array_column($months, 'dispatched')), 1),
        'from'       => array_key_first($months),
        'to'         => array_key_last($months),
        // Summary / assessment sheets repeat trips from the main sheets.
        'include'    => !preg_match('/log\s*book|assis?ment|assessment|summary/i', $name),
        'productId'  => guess_product($name),
    ];
}

function guess_product(string $sheet): ?int
{
    $s = strtolower($sheet);
    $material = null;
    foreach (['euca' => 'eucalyptus', 'popl' => 'poplar', 'shub' => 'shubabul', 'subab' => 'shubabul', 'casu' => 'casuarina'] as $needle => $id) {
        if (str_contains($s, $needle)) {
            $material = $id;
            break;
        }
    }
    if (!$material) {
        return null;
    }
    $form = str_contains($s, 'core') ? 'core_chips' : (str_contains($s, 'chip') || str_contains($s, 'debark') ? 'debarked' : 'with_bark');
    $stmt = db()->prepare('SELECT id FROM products WHERE material_id = ? AND form = ? ORDER BY sort_order LIMIT 1');
    $stmt->execute([$material, $form]);
    $id = $stmt->fetchColumn();
    return $id === false ? null : (int) $id;
}

/** Step 1: read the uploaded workbook and keep the monthly totals in the session for step 2. */
function import_preview(array $file): array
{
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        throw new InvalidArgumentException('Upload failed. Choose the .xlsx file and try again (maximum 10 MB).');
    }
    if (!preg_match('/\.xlsx$/i', (string) $file['name']) || $file['size'] > 10 * 1024 * 1024) {
        throw new InvalidArgumentException('Upload an .xlsx workbook of up to 10 MB.');
    }
    $sheets = [];
    foreach (read_xlsx($file['tmp_name']) as $name => $rows) {
        if ($s = analyse_log_sheet($name, $rows)) {
            $sheets[] = $s;
        }
    }
    if (!$sheets) {
        throw new InvalidArgumentException('No dispatch sheet found. Sheets need a "Truck Number" column and a weight column.');
    }
    start_session();
    $_SESSION['import'] = ['file' => mb_substr(basename((string) $file['name']), 0, 200), 'sheets' => $sheets];
    return ['file' => $_SESSION['import']['file'], 'sheets' => array_map(fn ($s) => array_diff_key($s, ['months' => 1]) + ['monthCount' => count($s['months'])], $sheets)];
}

/** Step 2: store the chosen sheets for one customer, replacing that customer's previous import. */
function import_commit(string $customerId, array $choices): array
{
    start_session();
    $pending = $_SESSION['import'] ?? null;
    if (!$pending) {
        throw new InvalidArgumentException('Upload the workbook again, the preview has expired.');
    }
    $exists = db()->prepare('SELECT 1 FROM customers WHERE id = ?');
    $exists->execute([$customerId]);
    if (!$exists->fetchColumn()) {
        throw new InvalidArgumentException('Choose the customer these deliveries went to.');
    }
    $validProducts = array_map('intval', db()->query('SELECT id FROM products')->fetchAll(PDO::FETCH_COLUMN));
    $bySheet = array_column($pending['sheets'], null, 'name');
    $rows = [];
    foreach ($choices as $choice) {
        $sheet = $bySheet[$choice['name'] ?? ''] ?? null;
        if (!$sheet) {
            continue;
        }
        $pid = (int) ($choice['productId'] ?? 0);
        $pid = in_array($pid, $validProducts, true) ? $pid : null;
        $label = clean_str($choice['label'] ?? $sheet['label'], 80) ?: $sheet['label'];
        foreach ($sheet['months'] as $month => $m) {
            $key = "$month|$label";
            $rows[$key] ??= ['month' => $month, 'label' => $label, 'pid' => $pid, 'trucks' => 0, 'delivered' => 0, 'dispatched' => 0, 'loss' => 0, 'lossBase' => 0, 'transitDays' => 0, 'transitTrips' => 0];
            foreach (['trucks', 'delivered', 'dispatched', 'loss', 'lossBase', 'transitDays', 'transitTrips'] as $f) {
                $rows[$key][$f] += $m[$f];
            }
        }
    }
    if (!$rows) {
        throw new InvalidArgumentException('Tick at least one sheet to import.');
    }

    $pdo = db();
    $pdo->beginTransaction();
    try {
        $pdo->prepare('DELETE FROM supply_log WHERE customer_id = ?')->execute([$customerId]);
        $ins = $pdo->prepare('INSERT INTO supply_log (customer_id, product_id, material_label, month, trucks, delivered_mt, dispatched_mt, loss_mt, loss_base_mt, transit_days_sum, transit_trips, source_file)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        foreach ($rows as $r) {
            $ins->execute([$customerId, $r['pid'], $r['label'], $r['month'] . '-01', $r['trucks'], round($r['delivered'], 2), round($r['dispatched'], 2),
                round($r['loss'], 2), round($r['lossBase'], 2), $r['transitDays'], $r['transitTrips'], $pending['file']]);
        }
        // The customer's supply history chart and products follow the imported log.
        $pdo->prepare('DELETE FROM customer_supply_history WHERE customer_id = ?')->execute([$customerId]);
        $hist = $pdo->prepare('INSERT INTO customer_supply_history (customer_id, month, quantity_mt, dispatches)
            SELECT customer_id, month, ROUND(SUM(delivered_mt)), SUM(trucks) FROM supply_log WHERE customer_id = ? GROUP BY customer_id, month');
        $hist->execute([$customerId]);
        $prod = $pdo->prepare('INSERT IGNORE INTO customer_products (customer_id, product_id) SELECT DISTINCT customer_id, product_id FROM supply_log WHERE customer_id = ? AND product_id IS NOT NULL');
        $prod->execute([$customerId]);
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
    unset($_SESSION['import']);
    return ['months' => count(array_unique(array_column($rows, 'month'))), 'trucks' => array_sum(array_column($rows, 'trucks')),
        'deliveredMt' => round(array_sum(array_column($rows, 'delivered')), 1)];
}

function clear_supply_log(string $customerId): void
{
    db()->prepare('DELETE FROM supply_log WHERE customer_id = ?')->execute([$customerId]);
}

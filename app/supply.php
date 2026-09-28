<?php
declare(strict_types=1);

const ASSET_TYPES = [
    'sourcing'   => ['label' => 'Sourcing Location',   'plural' => 'Sourcing Locations',    'color' => '#2f9e44'],
    'chipping'   => ['label' => 'Chipping Center',     'plural' => 'Chipping Centers',      'color' => '#2f6fe4'],
    'processing' => ['label' => 'Processing Facility', 'plural' => 'Processing Facilities', 'color' => '#0c8599'],
    'collection' => ['label' => 'Collection Center',   'plural' => 'Collection Centers',    'color' => '#e8590c'],
    'storage'    => ['label' => 'Storage Yard',        'plural' => 'Storage Yards',         'color' => '#7048e8'],
    'logistics'  => ['label' => 'Logistics Hub',       'plural' => 'Logistics Hubs',        'color' => '#e03131'],
];

const CAPABILITIES = [
    'procurement' => 'Wood procurement',
    'debarking'   => 'Debarking',
    'chipping'    => 'Chipping',
    'screening'   => 'Screening',
    'sizing'      => 'Sizing',
    'segregation' => 'Material segregation',
    'quality'     => 'Quality testing',
    'storage'     => 'Storage',
    'weighment'   => 'Weighment',
    'loading'     => 'Truck loading',
];

const PRODUCT_FORMS = [
    'debarked'   => 'Debarked',
    'with_bark'  => 'With Bark',
    'core_chips' => 'Core Chips',
];

const ASSET_STATUSES = ['Operational', 'Commissioning', 'Seasonal', 'Inactive'];

const PRIVATE_FIELDS = [
    'site_incharge' => 'siteIncharge',
    'phone'         => 'phone',
    'email'         => 'email',
    'address'       => 'address',
    'maps_url'      => 'mapsUrl',
    'notes'         => 'notes',
];

const CONTENT_KEYS = ['company_name', 'hero_title', 'hero_subtitle', 'company_statement', 'about', 'sustainability',
    'contact_email', 'contact_phone', 'contact_address'];

/** False until install.php has created (or upgraded to) the asset-based tables. */
function schema_ready(): bool
{
    static $ready = null;
    if ($ready === null) {
        $stmt = db()->query("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name IN ('assets', 'site_content')");
        $ready = (int) $stmt->fetchColumn() === 2;
    }
    return $ready;
}

function site_content(): array
{
    $rows = db()->query('SELECT content_key, body FROM site_content')->fetchAll(PDO::FETCH_KEY_PAIR);
    return array_merge(array_fill_keys(CONTENT_KEYS, ''), $rows);
}

/**
 * Everything the app needs. For viewer accounts (potential customers) the
 * asset_private table is never queried, so site contacts and exact addresses
 * never leave the server, and coordinates are rounded to 2 decimals (~1 km).
 */
function supply_data(array $user): array
{
    $admin = $user['role'] === 'admin';
    $pdo = db();
    $pairs = function (string $sql, string $key, string $value, ?callable $cast = null): array {
        $out = [];
        foreach (db()->query($sql)->fetchAll() as $r) {
            $out[$r[$key]][] = $cast ? $cast($r[$value]) : $r[$value];
        }
        return $out;
    };
    $intOrNull = fn ($v) => $v === null ? null : (int) $v;

    $materials = $pdo->query('SELECT id, name, color FROM materials ORDER BY sort_order, name')->fetchAll();
    $products = array_map(fn ($p) => [...$p, 'id' => (int) $p['id']],
        $pdo->query('SELECT id, material_id AS material, name, form FROM products ORDER BY material_id, sort_order')->fetchAll());

    $customerProducts = $pairs('SELECT customer_id, product_id FROM customer_products', 'customer_id', 'product_id', 'intval');
    $history = [];
    foreach ($pdo->query('SELECT customer_id, DATE_FORMAT(month, "%Y-%m") AS month, quantity_mt, dispatches FROM customer_supply_history ORDER BY month')->fetchAll() as $h) {
        $history[$h['customer_id']][] = ['month' => $h['month'], 'quantityMt' => (int) $h['quantity_mt'], 'dispatches' => (int) $h['dispatches']];
    }
    $customers = array_map(fn ($c) => [
        'id'                 => $c['id'],
        'name'               => $c['name'],
        'industry'           => $c['industry'],
        'place'              => $c['place'],
        'lat'                => (float) $c['lat'],
        'lng'                => (float) $c['lng'],
        'monthlyVolumeMt'    => $intOrNull($c['monthly_volume_mt']),
        'dispatchesPerMonth' => $intOrNull($c['dispatches_per_month']),
        'supplyingSince'     => $intOrNull($c['supplying_since']),
        'products'           => $customerProducts[$c['id']] ?? [],
        'history'            => $history[$c['id']] ?? [],
    ], $pdo->query('SELECT * FROM customers ORDER BY name')->fetchAll());

    $assetProducts = $pairs('SELECT asset_id, product_id FROM asset_products', 'asset_id', 'product_id', 'intval');
    $private = [];
    if ($admin) {
        foreach ($pdo->query('SELECT * FROM asset_private')->fetchAll() as $row) {
            foreach (PRIVATE_FIELDS as $col => $key) {
                $private[(int) $row['asset_id']][$key] = $row[$col];
            }
        }
    }

    $assets = [];
    foreach ($pdo->query('SELECT * FROM assets ORDER BY code')->fetchAll() as $a) {
        $id = (int) $a['id'];
        $assets[] = [
            'id'             => $id,
            'code'           => $a['code'],
            'name'           => $a['name'],
            'type'           => $a['asset_type'],
            'region'         => $a['region'],
            'district'       => $a['district'],
            'state'          => $a['state'],
            'lat'            => $admin ? (float) $a['lat'] : round((float) $a['lat'], 2),
            'lng'            => $admin ? (float) $a['lng'] : round((float) $a['lng'], 2),
            'capacityMt'     => $intOrNull($a['capacity_mt']),
            'trucksPerMonth' => $intOrNull($a['trucks_per_month']),
            'capabilities'   => array_values(array_filter(explode(',', $a['capabilities']))),
            'description'    => $a['description'],
            'status'         => $a['status'],
            'sinceYear'      => $intOrNull($a['since_year']),
            'products'       => $assetProducts[$id] ?? [],
            'private'        => $admin ? ($private[$id] ?? array_fill_keys(array_values(PRIVATE_FIELDS), '')) : null,
        ];
    }

    $links = array_map(fn ($l) => [
        'from'       => (int) $l['from_asset_id'],
        'toAsset'    => $intOrNull($l['to_asset_id']),
        'toCustomer' => $l['to_customer_id'],
    ], $pdo->query('SELECT from_asset_id, to_asset_id, to_customer_id FROM supply_links')->fetchAll());

    return [
        'app' => [
            'salesContact' => config()['sales_contact'] ?? '',
            'mapTiles'     => config()['map_tiles'] ?? null,
        ],
        'content'      => site_content(),
        'user'         => ['username' => $user['username'], 'displayName' => $user['display_name'], 'role' => $user['role']],
        'assetTypes'   => ASSET_TYPES,
        'capabilities' => CAPABILITIES,
        'productForms' => PRODUCT_FORMS,
        'statuses'     => ASSET_STATUSES,
        'materials'    => $materials,
        'products'     => $products,
        'customers'    => $customers,
        'assets'       => $assets,
        'links'        => $links,
    ];
}

// ---------- validation helpers ----------

function clean_str(mixed $v, int $max = 300): string
{
    return mb_substr(trim((string) ($v ?? '')), 0, $max);
}

function clean_num(mixed $v, string $label, float $min, float $max, bool $nullable = false): float|int|null
{
    if ($nullable && ($v === null || $v === '')) {
        return null;
    }
    if (!is_numeric($v)) {
        throw new InvalidArgumentException("$label must be a number.");
    }
    $n = (float) $v;
    if ($n < $min || $n > $max) {
        throw new InvalidArgumentException("$label is out of range.");
    }
    return $n;
}

function int_or_null(float|int|null $v): ?int
{
    return $v === null ? null : (int) $v;
}

// ---------- assets ----------

function save_asset(?int $id, array $in): int
{
    $pdo = db();
    $name = clean_str($in['name'] ?? '', 160);
    $region = clean_str($in['region'] ?? '', 120);
    if ($name === '' || $region === '') {
        throw new InvalidArgumentException('Asset name and region are required.');
    }
    if (!array_key_exists($in['type'] ?? '', ASSET_TYPES)) {
        throw new InvalidArgumentException('Choose an asset type.');
    }
    $data = [
        'name'             => $name,
        'asset_type'       => $in['type'],
        'region'           => $region,
        'district'         => clean_str($in['district'] ?? '', 120),
        'state'            => clean_str($in['state'] ?? '', 120),
        'lat'              => clean_num($in['lat'] ?? null, 'Latitude', -90, 90),
        'lng'              => clean_num($in['lng'] ?? null, 'Longitude', -180, 180),
        'capacity_mt'      => int_or_null(clean_num($in['capacityMt'] ?? null, 'Capacity', 0, 10_000_000, true)),
        'trucks_per_month' => int_or_null(clean_num($in['trucksPerMonth'] ?? null, 'Trucks per month', 0, 100_000, true)),
        'capabilities'     => implode(',', array_values(array_intersect((array) ($in['capabilities'] ?? []), array_keys(CAPABILITIES)))),
        'description'      => clean_str($in['description'] ?? '', 1000),
        'status'           => in_array($in['status'] ?? '', ASSET_STATUSES, true) ? $in['status'] : 'Operational',
        'since_year'       => int_or_null(clean_num($in['sinceYear'] ?? null, 'Since year', 1900, 2100, true)),
    ];

    $validProducts = array_map('intval', $pdo->query('SELECT id FROM products')->fetchAll(PDO::FETCH_COLUMN));
    $products = array_values(array_intersect(array_map('intval', (array) ($in['products'] ?? [])), $validProducts));
    $validCustomers = $pdo->query('SELECT id FROM customers')->fetchAll(PDO::FETCH_COLUMN);
    $toCustomers = array_values(array_intersect((array) ($in['toCustomers'] ?? []), $validCustomers));
    $toAssets = array_map('intval', (array) ($in['toAssets'] ?? []));
    $privateIn = (array) ($in['private'] ?? []);

    $pdo->beginTransaction();
    try {
        if ($id === null) {
            $next = (int) $pdo->query('SELECT COALESCE(MAX(id), 0) + 1 FROM assets')->fetchColumn();
            $check = $pdo->prepare('SELECT 1 FROM assets WHERE code = ?');
            do {
                $data['code'] = sprintf('A-%02d', $next++);
                $check->execute([$data['code']]);
            } while ($check->fetchColumn());
            $cols = array_keys($data);
            $pdo->prepare('INSERT INTO assets (' . implode(',', $cols) . ') VALUES (' . implode(',', array_fill(0, count($cols), '?')) . ')')
                ->execute(array_values($data));
            $id = (int) $pdo->lastInsertId();
        } else {
            $exists = $pdo->prepare('SELECT 1 FROM assets WHERE id = ?');
            $exists->execute([$id]);
            if (!$exists->fetchColumn()) {
                throw new InvalidArgumentException('Asset not found.');
            }
            $sets = implode(',', array_map(fn ($c) => "$c = ?", array_keys($data)));
            $pdo->prepare("UPDATE assets SET $sets WHERE id = ?")->execute([...array_values($data), $id]);
        }

        $private = [];
        foreach (PRIVATE_FIELDS as $col => $key) {
            $private[$col] = clean_str($privateIn[$key] ?? '', in_array($col, ['maps_url', 'notes'], true) ? 1000 : 300);
        }
        $cols = array_keys($private);
        $pdo->prepare('REPLACE INTO asset_private (asset_id,' . implode(',', $cols) . ') VALUES (?' . str_repeat(',?', count($cols)) . ')')
            ->execute([$id, ...array_values($private)]);

        $pdo->prepare('DELETE FROM asset_products WHERE asset_id = ?')->execute([$id]);
        $ins = $pdo->prepare('INSERT INTO asset_products (asset_id, product_id) VALUES (?, ?)');
        foreach ($products as $p) {
            $ins->execute([$id, $p]);
        }

        // Outgoing supply routes from this asset.
        $validAssets = array_map('intval', $pdo->query('SELECT id FROM assets')->fetchAll(PDO::FETCH_COLUMN));
        $toAssets = array_values(array_filter(array_intersect($toAssets, $validAssets), fn ($a) => $a !== $id));
        $pdo->prepare('DELETE FROM supply_links WHERE from_asset_id = ?')->execute([$id]);
        $insA = $pdo->prepare('INSERT INTO supply_links (from_asset_id, to_asset_id) VALUES (?, ?)');
        foreach ($toAssets as $a) {
            $insA->execute([$id, $a]);
        }
        $insC = $pdo->prepare('INSERT INTO supply_links (from_asset_id, to_customer_id) VALUES (?, ?)');
        foreach ($toCustomers as $c) {
            $insC->execute([$id, $c]);
        }
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
    return $id;
}

function delete_asset(int $id): void
{
    $stmt = db()->prepare('DELETE FROM assets WHERE id = ?');
    $stmt->execute([$id]);
    if ($stmt->rowCount() === 0) {
        throw new InvalidArgumentException('Asset not found.');
    }
}

// ---------- customers ----------

function save_customer(?string $id, array $in): string
{
    $pdo = db();
    $name = clean_str($in['name'] ?? '', 120);
    $place = clean_str($in['place'] ?? '', 160);
    if ($name === '' || $place === '') {
        throw new InvalidArgumentException('Customer name and location are required.');
    }
    $data = [
        'name'                 => $name,
        'industry'             => clean_str($in['industry'] ?? '', 120),
        'place'                => $place,
        'lat'                  => clean_num($in['lat'] ?? null, 'Latitude', -90, 90),
        'lng'                  => clean_num($in['lng'] ?? null, 'Longitude', -180, 180),
        'monthly_volume_mt'    => int_or_null(clean_num($in['monthlyVolumeMt'] ?? null, 'Monthly volume', 0, 10_000_000, true)),
        'dispatches_per_month' => int_or_null(clean_num($in['dispatchesPerMonth'] ?? null, 'Dispatches per month', 0, 100_000, true)),
        'supplying_since'      => int_or_null(clean_num($in['supplyingSince'] ?? null, 'Supplying since', 1900, 2100, true)),
    ];
    $validProducts = array_map('intval', $pdo->query('SELECT id FROM products')->fetchAll(PDO::FETCH_COLUMN));
    $products = array_values(array_intersect(array_map('intval', (array) ($in['products'] ?? [])), $validProducts));

    $history = [];
    foreach ((array) ($in['history'] ?? []) as $h) {
        $month = clean_str($h['month'] ?? '', 7);
        if ($month === '') {
            continue;
        }
        if (!preg_match('/^(\d{4})-(0[1-9]|1[0-2])$/', $month)) {
            throw new InvalidArgumentException("Supply history month \"$month\" must look like 2026-04.");
        }
        $history[$month] = [
            (int) clean_num($h['quantityMt'] ?? 0, 'History quantity', 0, 100_000_000),
            (int) clean_num($h['dispatches'] ?? 0, 'History dispatches', 0, 1_000_000),
        ];
    }

    $pdo->beginTransaction();
    try {
        if ($id === null) {
            $base = trim(preg_replace('/[^a-z0-9]+/', '-', strtolower($name)), '-') ?: 'customer';
            $id = mb_substr($base, 0, 28);
            $check = $pdo->prepare('SELECT 1 FROM customers WHERE id = ?');
            for ($n = 2; $check->execute([$id]) && $check->fetchColumn(); $n++) {
                $id = mb_substr($base, 0, 26) . '-' . $n;
            }
            $cols = ['id', ...array_keys($data)];
            $pdo->prepare('INSERT INTO customers (' . implode(',', $cols) . ') VALUES (' . implode(',', array_fill(0, count($cols), '?')) . ')')
                ->execute([$id, ...array_values($data)]);
        } else {
            $exists = $pdo->prepare('SELECT 1 FROM customers WHERE id = ?');
            $exists->execute([$id]);
            if (!$exists->fetchColumn()) {
                throw new InvalidArgumentException('Customer not found.');
            }
            $sets = implode(',', array_map(fn ($c) => "$c = ?", array_keys($data)));
            $pdo->prepare("UPDATE customers SET $sets WHERE id = ?")->execute([...array_values($data), $id]);
        }
        $pdo->prepare('DELETE FROM customer_products WHERE customer_id = ?')->execute([$id]);
        $ins = $pdo->prepare('INSERT INTO customer_products (customer_id, product_id) VALUES (?, ?)');
        foreach ($products as $p) {
            $ins->execute([$id, $p]);
        }
        $pdo->prepare('DELETE FROM customer_supply_history WHERE customer_id = ?')->execute([$id]);
        $insH = $pdo->prepare('INSERT INTO customer_supply_history (customer_id, month, quantity_mt, dispatches) VALUES (?, ?, ?, ?)');
        foreach ($history as $month => [$qty, $dispatches]) {
            $insH->execute([$id, $month . '-01', $qty, $dispatches]);
        }
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
    return $id;
}

function delete_customer(string $id): void
{
    $stmt = db()->prepare('DELETE FROM customers WHERE id = ?');
    $stmt->execute([$id]);
    if ($stmt->rowCount() === 0) {
        throw new InvalidArgumentException('Customer not found.');
    }
}

// ---------- site content ----------

function save_content(array $in): void
{
    $stmt = db()->prepare('REPLACE INTO site_content (content_key, body) VALUES (?, ?)');
    foreach (CONTENT_KEYS as $key) {
        if (array_key_exists($key, $in)) {
            $stmt->execute([$key, clean_str($in[$key], 5000)]);
        }
    }
}

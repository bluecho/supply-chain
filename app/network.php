<?php
declare(strict_types=1);

const VENDOR_STATUSES = ['Active', 'Onboarding', 'Inactive'];
const CONTACT_COLUMNS = [
    'vendor_name'    => 'name',
    'contact_person' => 'person',
    'phone'          => 'phone',
    'email'          => 'email',
    'address'        => 'address',
    'gstin'          => 'gstin',
    'maps_url'       => 'mapsUrl',
];

/**
 * Everything the map needs. For viewers (potential customers) the vendor_contacts
 * table is never queried, so names and contact details never leave the server -
 * the browser only draws a blurred placeholder. Viewer coordinates are also
 * rounded to 2 decimals (~1 km) so the exact yard can't be looked up.
 */
function network_for(array $user): array
{
    $admin = $user['role'] === 'admin';
    $pdo = db();

    $materials = $pdo->query('SELECT id, name, color FROM materials ORDER BY sort_order, name')->fetchAll();
    $products = $pdo->query('SELECT material_id, name FROM material_products ORDER BY id')->fetchAll();
    foreach ($materials as &$m) {
        $m['products'] = array_values(array_map(
            fn ($p) => $p['name'],
            array_filter($products, fn ($p) => $p['material_id'] === $m['id'])
        ));
    }
    unset($m);

    $customers = array_map(fn ($c) => [...$c, 'lat' => (float) $c['lat'], 'lng' => (float) $c['lng']],
        $pdo->query('SELECT id, name, place, lat, lng FROM customers ORDER BY name')->fetchAll());

    $vendorMaterials = group_pairs($pdo->query('SELECT vendor_id, material_id FROM vendor_materials')->fetchAll(), 'material_id');
    $vendorCustomers = group_pairs($pdo->query('SELECT vendor_id, customer_id FROM vendor_customers')->fetchAll(), 'customer_id');

    $contacts = [];
    if ($admin) {
        foreach ($pdo->query('SELECT * FROM vendor_contacts')->fetchAll() as $row) {
            $contact = [];
            foreach (CONTACT_COLUMNS as $col => $key) {
                $contact[$key] = $row[$col];
            }
            $contacts[(int) $row['vendor_id']] = $contact;
        }
    }

    $vendors = [];
    foreach ($pdo->query('SELECT * FROM vendors ORDER BY code')->fetchAll() as $v) {
        $id = (int) $v['id'];
        $lat = (float) $v['lat'];
        $lng = (float) $v['lng'];
        $vendors[] = [
            'id'             => $id,
            'code'           => $v['code'],
            'region'         => $v['region'],
            'district'       => $v['district'],
            'state'          => $v['state'],
            'lat'            => $admin ? $lat : round($lat, 2),
            'lng'            => $admin ? $lng : round($lng, 2),
            'capacityMt'     => (int) $v['capacity_mt'],
            'trucksPerMonth' => (int) $v['trucks_per_month'],
            'activeSince'    => $v['active_since'] !== null ? (int) $v['active_since'] : null,
            'status'         => $v['status'],
            'materials'      => $vendorMaterials[$id] ?? [],
            'suppliesTo'     => $vendorCustomers[$id] ?? [],
            'contact'        => $admin ? ($contacts[$id] ?? array_fill_keys(array_values(CONTACT_COLUMNS), '')) : null,
            'contactLocked'  => !$admin,
        ];
    }

    return [
        'app'       => ['name' => config()['app_name'] ?? 'Supply Network', 'salesContact' => config()['sales_contact'] ?? '', 'mapTiles' => config()['map_tiles'] ?? null],
        'user'      => ['username' => $user['username'], 'displayName' => $user['display_name'], 'role' => $user['role']],
        'materials' => $materials,
        'customers' => $customers,
        'vendors'   => $vendors,
    ];
}

function group_pairs(array $rows, string $valueKey): array
{
    $out = [];
    foreach ($rows as $r) {
        $out[(int) $r['vendor_id']][] = $r[$valueKey];
    }
    return $out;
}

function save_vendor(?int $id, array $input): int
{
    $pdo = db();
    $str = fn ($v, $max = 300) => mb_substr(trim((string) ($v ?? '')), 0, $max);
    $num = function ($v, string $label, float $min, float $max) {
        if (!is_numeric($v)) {
            throw new InvalidArgumentException("$label must be a number.");
        }
        $n = (float) $v;
        if ($n < $min || $n > $max) {
            throw new InvalidArgumentException("$label is out of range.");
        }
        return $n;
    };

    $region = $str($input['region'] ?? '', 120);
    if ($region === '') {
        throw new InvalidArgumentException('Region is required.');
    }
    $data = [
        'region'           => $region,
        'district'         => $str($input['district'] ?? '', 120),
        'state'            => $str($input['state'] ?? '', 120),
        'lat'              => $num($input['lat'] ?? null, 'Latitude', -90, 90),
        'lng'              => $num($input['lng'] ?? null, 'Longitude', -180, 180),
        'capacity_mt'      => (int) $num($input['capacityMt'] ?? 0, 'Capacity', 0, 10_000_000),
        'trucks_per_month' => (int) $num($input['trucksPerMonth'] ?? 0, 'Trucks per month', 0, 100_000),
        'active_since'     => ($input['activeSince'] ?? '') === '' ? null : (int) $num($input['activeSince'], 'Active since', 1900, 2100),
        'status'           => in_array($input['status'] ?? '', VENDOR_STATUSES, true) ? $input['status'] : 'Active',
    ];

    $validMaterials = $pdo->query('SELECT id FROM materials')->fetchAll(PDO::FETCH_COLUMN);
    $validCustomers = $pdo->query('SELECT id FROM customers')->fetchAll(PDO::FETCH_COLUMN);
    $materials = array_values(array_intersect((array) ($input['materials'] ?? []), $validMaterials));
    $customers = array_values(array_intersect((array) ($input['suppliesTo'] ?? []), $validCustomers));
    $contactIn = (array) ($input['contact'] ?? []);

    $pdo->beginTransaction();
    try {
        if ($id === null) {
            $next = (int) $pdo->query('SELECT COALESCE(MAX(id), 0) + 1 FROM vendors')->fetchColumn();
            $data['code'] = sprintf('V-%02d', $next);
            while (true) {
                $check = $pdo->prepare('SELECT 1 FROM vendors WHERE code = ?');
                $check->execute([$data['code']]);
                if (!$check->fetchColumn()) {
                    break;
                }
                $data['code'] = sprintf('V-%02d', ++$next);
            }
            $cols = array_keys($data);
            $pdo->prepare('INSERT INTO vendors (' . implode(',', $cols) . ') VALUES (' . implode(',', array_fill(0, count($cols), '?')) . ')')
                ->execute(array_values($data));
            $id = (int) $pdo->lastInsertId();
        } else {
            $sets = implode(',', array_map(fn ($c) => "$c = ?", array_keys($data)));
            $stmt = $pdo->prepare("UPDATE vendors SET $sets WHERE id = ?");
            $stmt->execute([...array_values($data), $id]);
            $exists = $pdo->prepare('SELECT 1 FROM vendors WHERE id = ?');
            $exists->execute([$id]);
            if (!$exists->fetchColumn()) {
                throw new InvalidArgumentException('Vendor not found.');
            }
        }

        $contact = [];
        foreach (CONTACT_COLUMNS as $col => $key) {
            $contact[$col] = $str($contactIn[$key] ?? '', $col === 'maps_url' ? 500 : 300);
        }
        $cols = array_keys($contact);
        $pdo->prepare('REPLACE INTO vendor_contacts (vendor_id,' . implode(',', $cols) . ') VALUES (?' . str_repeat(',?', count($cols)) . ')')
            ->execute([$id, ...array_values($contact)]);

        $pdo->prepare('DELETE FROM vendor_materials WHERE vendor_id = ?')->execute([$id]);
        $insM = $pdo->prepare('INSERT INTO vendor_materials (vendor_id, material_id) VALUES (?, ?)');
        foreach ($materials as $m) {
            $insM->execute([$id, $m]);
        }
        $pdo->prepare('DELETE FROM vendor_customers WHERE vendor_id = ?')->execute([$id]);
        $insC = $pdo->prepare('INSERT INTO vendor_customers (vendor_id, customer_id) VALUES (?, ?)');
        foreach ($customers as $c) {
            $insC->execute([$id, $c]);
        }
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
    return $id;
}

function delete_vendor(int $id): void
{
    $stmt = db()->prepare('DELETE FROM vendors WHERE id = ?');
    $stmt->execute([$id]);
    if ($stmt->rowCount() === 0) {
        throw new InvalidArgumentException('Vendor not found.');
    }
}

<?php
declare(strict_types=1);

// Road routes for supply links. Each link is routed once through an OSRM-compatible
// service (the free public OSRM server by default) and the road geometry, distance
// and drive time are cached in supply_links, so page views never call the service.

function routing_config(): array
{
    $c = config()['routing'] ?? [];
    return [
        'enabled' => $c['enabled'] ?? true,
        'url'     => rtrim($c['url'] ?? 'https://router.project-osrm.org', '/'),
        'timeout' => (int) ($c['timeout'] ?? 10),
    ];
}

/** Endpoints of every link as [id, fromLat, fromLng, toLat, toLng, routeKey, hasGeometry]. */
function link_endpoints(?string $where = null, array $params = []): array
{
    $sql = 'SELECT l.id, a.lat AS flat, a.lng AS flng, COALESCE(b.lat, c.lat) AS tlat, COALESCE(b.lng, c.lng) AS tlng,
                   l.route_key, l.road_geometry IS NOT NULL AS routed
            FROM supply_links l
            JOIN assets a ON a.id = l.from_asset_id
            LEFT JOIN assets b ON b.id = l.to_asset_id
            LEFT JOIN customers c ON c.id = l.to_customer_id'
        . ($where ? " WHERE $where" : '');
    $stmt = db()->prepare($sql);
    $stmt->execute($params);
    return $stmt->fetchAll();
}

function route_key(array $l): string
{
    return md5(sprintf('%.6f,%.6f;%.6f,%.6f', $l['flat'], $l['flng'], $l['tlat'], $l['tlng']));
}

function http_get_json(string $url, int $timeout): array
{
    $headers = ['Accept: application/json', 'User-Agent: PrakritikSupplyNetwork/1.0 (+route cache)'];
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => $timeout,
            CURLOPT_CONNECTTIMEOUT => min(5, $timeout),
            CURLOPT_HTTPHEADER     => $headers,
            CURLOPT_FOLLOWLOCATION => true,
        ]);
        $body = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        $err = curl_error($ch);
        curl_close($ch);
        if ($body === false) {
            throw new RuntimeException('Routing service unreachable: ' . $err);
        }
    } else {
        $ctx = stream_context_create(['http' => ['timeout' => $timeout, 'header' => implode("\r\n", $headers), 'ignore_errors' => true]]);
        $body = @file_get_contents($url, false, $ctx);
        if ($body === false) {
            throw new RuntimeException('Routing service unreachable (allow_url_fopen or network blocked).');
        }
        preg_match('/\s(\d{3})\s/', $http_response_header[0] ?? '', $m);
        $status = (int) ($m[1] ?? 0);
    }
    $json = json_decode($body, true);
    if (!is_array($json)) {
        throw new RuntimeException("Routing service returned an unexpected response (HTTP $status).");
    }
    return $json;
}

/** Calls the routing service for one link and stores the result (or the error). */
function route_one(array $l): bool
{
    $cfg = routing_config();
    $url = sprintf('%s/route/v1/driving/%.6f,%.6f;%.6f,%.6f?overview=simplified&geometries=geojson',
        $cfg['url'], $l['flng'], $l['flat'], $l['tlng'], $l['tlat']);
    try {
        $json = http_get_json($url, $cfg['timeout']);
        if (($json['code'] ?? '') !== 'Ok' || empty($json['routes'][0]['geometry']['coordinates'])) {
            throw new RuntimeException('No road route found' . (isset($json['message']) ? ': ' . $json['message'] : '.'));
        }
        $route = $json['routes'][0];
        $points = array_map(fn ($c) => [round((float) $c[1], 5), round((float) $c[0], 5)], $route['geometry']['coordinates']);
        db()->prepare('UPDATE supply_links SET road_geometry = ?, road_km = ?, road_minutes = ?, route_key = ?, route_error = NULL, routed_at = NOW() WHERE id = ?')
            ->execute([json_encode($points), round($route['distance'] / 1000, 1), (int) round($route['duration'] / 60), route_key($l), $l['id']]);
        return true;
    } catch (Throwable $e) {
        db()->prepare('UPDATE supply_links SET route_error = ?, routed_at = NOW() WHERE id = ?')
            ->execute([mb_substr($e->getMessage(), 0, 250), $l['id']]);
        return false;
    }
}

/**
 * Routes links that have no road geometry yet or whose endpoints moved.
 * $force re-routes everything in scope. Returns counts for the admin screen.
 */
function refresh_routes(?int $assetId = null, ?string $customerId = null, bool $force = false): array
{
    $result = ['routed' => 0, 'failed' => 0, 'unchanged' => 0, 'errors' => []];
    if (!routing_config()['enabled']) {
        return $result;
    }
    if ($assetId !== null) {
        $links = link_endpoints('l.from_asset_id = ? OR l.to_asset_id = ?', [$assetId, $assetId]);
    } elseif ($customerId !== null) {
        $links = link_endpoints('l.to_customer_id = ?', [$customerId]);
    } else {
        $links = link_endpoints();
    }
    foreach ($links as $l) {
        if (!$force && $l['routed'] && $l['route_key'] === route_key($l)) {
            $result['unchanged']++;
            continue;
        }
        if (route_one($l)) {
            $result['routed']++;
        } else {
            $result['failed']++;
        }
    }
    if ($result['failed']) {
        $result['errors'] = db()->query('SELECT DISTINCT route_error FROM supply_links WHERE route_error IS NOT NULL LIMIT 3')->fetchAll(PDO::FETCH_COLUMN);
    }
    return $result;
}

/**
 * Viewers see coordinates rounded to ~1 km, so the road line must not lead to the
 * exact yard either: drop points within 1.5 km of an asset end and start the line
 * at the rounded position instead.
 */
function trim_route_for_viewer(array $points, array $from, ?array $toAsset): array
{
    $near = fn (array $p, array $q) => distance_km($p[0], $p[1], $q[0], $q[1]) < 1.5;
    while (count($points) > 2 && $near($points[0], $from)) {
        array_shift($points);
    }
    array_unshift($points, [round($from[0], 2), round($from[1], 2)]);
    if ($toAsset) {
        while (count($points) > 2 && $near($points[count($points) - 1], $toAsset)) {
            array_pop($points);
        }
        $points[] = [round($toAsset[0], 2), round($toAsset[1], 2)];
    }
    return $points;
}

function distance_km(float $lat1, float $lng1, float $lat2, float $lng2): float
{
    $rad = M_PI / 180;
    $h = sin(($lat2 - $lat1) * $rad / 2) ** 2 + cos($lat1 * $rad) * cos($lat2 * $rad) * sin(($lng2 - $lng1) * $rad / 2) ** 2;
    return 2 * 6371 * asin(sqrt($h));
}

<?php
declare(strict_types=1);

require __DIR__ . '/../app/bootstrap.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
send_security_headers();

function respond(mixed $data, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$user = current_user();
if ($user === null) {
    respond(['error' => 'Please sign in.'], 401);
}

if (!schema_ready()) {
    respond(['error' => 'The site is being updated. Please try again in a few minutes.'], 503);
}

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];
$body = [];
if ($method === 'POST') {
    if (!csrf_valid($_SERVER['HTTP_X_CSRF_TOKEN'] ?? null)) {
        respond(['error' => 'Your session expired. Please reload the page.'], 419);
    }
    $body = json_decode(file_get_contents('php://input') ?: '[]', true) ?: [];
}

$adminActions = ['asset_save', 'asset_delete', 'customer_save', 'customer_delete', 'content_save',
    'users', 'user_create', 'user_delete', 'user_password'];
if (in_array($action, $adminActions, true) && $user['role'] !== 'admin') {
    respond(['error' => 'Admin access required.'], 403);
}

$optionalId = fn ($v) => isset($v) && $v !== '' ? $v : null;

try {
    switch ("$method $action") {
        case 'GET data':
            respond(supply_data($user));
        case 'POST asset_save':
            $id = $optionalId($body['id'] ?? null);
            respond(['id' => save_asset($id === null ? null : (int) $id, $body)]);
        case 'POST asset_delete':
            delete_asset((int) ($body['id'] ?? 0));
            respond(['ok' => true]);
        case 'POST customer_save':
            $id = $optionalId($body['id'] ?? null);
            respond(['id' => save_customer($id === null ? null : (string) $id, $body)]);
        case 'POST customer_delete':
            delete_customer((string) ($body['id'] ?? ''));
            respond(['ok' => true]);
        case 'POST content_save':
            save_content($body);
            respond(['ok' => true]);
        case 'GET users':
            respond(list_users());
        case 'POST user_create':
            respond(create_user((string) ($body['username'] ?? ''), (string) ($body['displayName'] ?? ''),
                (string) ($body['password'] ?? ''), (string) ($body['role'] ?? 'viewer')));
        case 'POST user_delete':
            delete_user((int) ($body['id'] ?? 0), (int) $user['id']);
            respond(['ok' => true]);
        case 'POST user_password':
            reset_password((int) ($body['id'] ?? 0), (string) ($body['password'] ?? ''));
            respond(['ok' => true]);
        default:
            respond(['error' => 'Unknown action.'], 404);
    }
} catch (InvalidArgumentException $e) {
    respond(['error' => $e->getMessage()], 422);
} catch (Throwable $e) {
    error_log('[supply-network] ' . $e);
    // Admins get the real reason so problems on the live server can be diagnosed.
    respond(['error' => $user['role'] === 'admin' ? 'Server error: ' . $e->getMessage() : 'Something went wrong. Please try again.'], 500);
}

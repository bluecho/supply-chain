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

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];
$body = [];
if ($method === 'POST') {
    if (!csrf_valid($_SERVER['HTTP_X_CSRF_TOKEN'] ?? null)) {
        respond(['error' => 'Your session expired. Please reload the page.'], 419);
    }
    $body = json_decode(file_get_contents('php://input') ?: '[]', true) ?: [];
}

$adminActions = ['vendor_save', 'vendor_delete', 'users', 'user_create', 'user_delete', 'user_password'];
if (in_array($action, $adminActions, true) && $user['role'] !== 'admin') {
    respond(['error' => 'Admin access required.'], 403);
}

try {
    switch ("$method $action") {
        case 'GET network':
            respond(network_for($user));
        case 'POST vendor_save':
            $id = isset($body['id']) && $body['id'] !== '' ? (int) $body['id'] : null;
            respond(['id' => save_vendor($id, $body)]);
        case 'POST vendor_delete':
            delete_vendor((int) ($body['id'] ?? 0));
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
    respond(['error' => 'Something went wrong. Please try again.'], 500);
}

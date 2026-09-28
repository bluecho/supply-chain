<?php
declare(strict_types=1);

const ROLES = ['admin', 'viewer'];
const MAX_LOGIN_ATTEMPTS = 10;   // per IP ...
const LOGIN_WINDOW_MINUTES = 15; // ... in this window

/** The signed-in user, re-read from the database so role changes and deletions apply immediately. */
function current_user(): ?array
{
    static $user = false;
    if ($user !== false) {
        return $user;
    }
    start_session();
    $user = null;
    if (!empty($_SESSION['user_id'])) {
        $stmt = db()->prepare('SELECT id, username, display_name, role FROM users WHERE id = ?');
        $stmt->execute([$_SESSION['user_id']]);
        $user = $stmt->fetch() ?: null;
        if ($user === null) {
            unset($_SESSION['user_id']);
        }
    }
    return $user;
}

function is_admin(): bool
{
    return (current_user()['role'] ?? null) === 'admin';
}

function login_blocked(string $ip): bool
{
    $stmt = db()->prepare('SELECT COUNT(*) FROM login_attempts WHERE ip = ? AND attempted_at > (NOW() - INTERVAL ' . LOGIN_WINDOW_MINUTES . ' MINUTE)');
    $stmt->execute([$ip]);
    return (int) $stmt->fetchColumn() >= MAX_LOGIN_ATTEMPTS;
}

/** @return string|null error message, or null on success */
function attempt_login(string $username, string $password): ?string
{
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    if (login_blocked($ip)) {
        return 'Too many attempts. Please try again in ' . LOGIN_WINDOW_MINUTES . ' minutes.';
    }
    $stmt = db()->prepare('SELECT id, password_hash FROM users WHERE username = ?');
    $stmt->execute([$username]);
    $row = $stmt->fetch();
    if (!$row || !password_verify($password, $row['password_hash'])) {
        db()->prepare('INSERT INTO login_attempts (ip) VALUES (?)')->execute([$ip]);
        return 'Invalid username or password.';
    }
    if (password_needs_rehash($row['password_hash'], PASSWORD_DEFAULT)) {
        db()->prepare('UPDATE users SET password_hash = ? WHERE id = ?')
            ->execute([password_hash($password, PASSWORD_DEFAULT), $row['id']]);
    }
    db()->prepare('DELETE FROM login_attempts WHERE ip = ?')->execute([$ip]);
    db()->prepare('UPDATE users SET last_login_at = NOW() WHERE id = ?')->execute([$row['id']]);
    start_session();
    session_regenerate_id(true);
    $_SESSION['user_id'] = (int) $row['id'];
    return null;
}

function logout(): void
{
    start_session();
    $_SESSION = [];
    session_destroy();
}

function list_users(): array
{
    return db()->query('SELECT id, username, display_name, role, created_at, last_login_at FROM users ORDER BY role, username')->fetchAll();
}

function create_user(string $username, string $displayName, string $password, string $role): array
{
    $username = trim($username);
    if (!preg_match('/^[A-Za-z0-9._@-]{3,64}$/', $username)) {
        throw new InvalidArgumentException('Username must be 3-64 characters (letters, digits, . _ @ -).');
    }
    if (strlen($password) < 8) {
        throw new InvalidArgumentException('Password must be at least 8 characters.');
    }
    if (!in_array($role, ROLES, true)) {
        throw new InvalidArgumentException('Role must be admin or viewer.');
    }
    $exists = db()->prepare('SELECT 1 FROM users WHERE username = ?');
    $exists->execute([$username]);
    if ($exists->fetchColumn()) {
        throw new InvalidArgumentException('That username is already taken.');
    }
    $displayName = trim($displayName) !== '' ? mb_substr(trim($displayName), 0, 120) : $username;
    db()->prepare('INSERT INTO users (username, display_name, password_hash, role) VALUES (?, ?, ?, ?)')
        ->execute([$username, $displayName, password_hash($password, PASSWORD_DEFAULT), $role]);
    return ['id' => (int) db()->lastInsertId(), 'username' => $username, 'display_name' => $displayName, 'role' => $role];
}

function delete_user(int $id, int $currentUserId): void
{
    if ($id === $currentUserId) {
        throw new InvalidArgumentException('You cannot delete your own account.');
    }
    $stmt = db()->prepare('SELECT role FROM users WHERE id = ?');
    $stmt->execute([$id]);
    $role = $stmt->fetchColumn();
    if ($role === false) {
        throw new InvalidArgumentException('User not found.');
    }
    if ($role === 'admin' && (int) db()->query("SELECT COUNT(*) FROM users WHERE role = 'admin'")->fetchColumn() <= 1) {
        throw new InvalidArgumentException('You cannot delete the last admin.');
    }
    db()->prepare('DELETE FROM users WHERE id = ?')->execute([$id]);
}

function reset_password(int $id, string $password): void
{
    if (strlen($password) < 8) {
        throw new InvalidArgumentException('Password must be at least 8 characters.');
    }
    $stmt = db()->prepare('UPDATE users SET password_hash = ? WHERE id = ?');
    $stmt->execute([password_hash($password, PASSWORD_DEFAULT), $id]);
    if ($stmt->rowCount() === 0) {
        throw new InvalidArgumentException('User not found.');
    }
}

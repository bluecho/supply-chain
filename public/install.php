<?php
declare(strict_types=1);

// Installer and upgrader.
// - Fresh database: creates the tables, loads the starting data and the first admin.
// - Existing install from the earlier "vendor" version: an admin can upgrade it to the
//   asset-based supply network. User accounts are kept; old vendor tables are replaced.
// Delete this file from the server after use.
require __DIR__ . '/../app/bootstrap.php';
send_security_headers();

function table_exists(string $table): bool
{
    $stmt = db()->prepare('SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?');
    $stmt->execute([$table]);
    return (int) $stmt->fetchColumn() > 0;
}

function run_sql_file(string $file): void
{
    $sql = preg_replace('/^\s*--.*$/m', '', file_get_contents($file));
    foreach (array_filter(array_map('trim', explode(";\n", str_replace("\r\n", "\n", $sql)))) as $statement) {
        db()->exec(rtrim($statement, ';'));
    }
}

function load_network(): void
{
    run_sql_file(APP_ROOT . '/database/schema.sql');
    if ((int) db()->query('SELECT COUNT(*) FROM assets')->fetchColumn() === 0
        && (int) db()->query('SELECT COUNT(*) FROM materials')->fetchColumn() === 0) {
        run_sql_file(APP_ROOT . '/database/seed.sql');
    }
}

/** The upgrade needs an admin: either the signed-in session or admin credentials typed on this page. */
function upgrade_authorised(): bool
{
    if (is_admin()) {
        return true;
    }
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    if (login_blocked($ip)) {
        return false;
    }
    $stmt = db()->prepare("SELECT password_hash FROM users WHERE username = ? AND role = 'admin'");
    $stmt->execute([trim((string) ($_POST['username'] ?? ''))]);
    $hash = $stmt->fetchColumn();
    if ($hash && password_verify((string) ($_POST['password'] ?? ''), $hash)) {
        return true;
    }
    db()->prepare('INSERT INTO login_attempts (ip) VALUES (?)')->execute([$ip]);
    return false;
}

$hasUsers = table_exists('users') && (int) db()->query('SELECT COUNT(*) FROM users')->fetchColumn() > 0;
$mode = !$hasUsers ? 'install' : (table_exists('assets') ? 'done' : 'upgrade');
$error = null;
$finished = false;

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $mode !== 'done') {
    if (!csrf_valid($_POST['csrf'] ?? null)) {
        $error = 'Session expired, please try again.';
    } elseif ($mode === 'install') {
        if (($_POST['password'] ?? '') !== ($_POST['password2'] ?? '')) {
            $error = 'Passwords do not match.';
        } else {
            try {
                load_network();
                create_user((string) $_POST['username'], 'Administrator', (string) $_POST['password'], 'admin');
                $finished = true;
            } catch (InvalidArgumentException $e) {
                $error = $e->getMessage();
            } catch (PDOException $e) {
                $error = 'Database error: ' . $e->getMessage();
            }
        }
    } elseif ($mode === 'upgrade' && !upgrade_authorised()) {
        $error = 'Enter the username and password of an admin account.';
    } elseif ($mode === 'upgrade') {
        try {
            db()->exec('SET FOREIGN_KEY_CHECKS = 0');
            foreach (['vendor_customers', 'vendor_materials', 'vendor_contacts', 'vendors', 'material_products', 'customers', 'materials'] as $old) {
                db()->exec("DROP TABLE IF EXISTS `$old`");
            }
            db()->exec('SET FOREIGN_KEY_CHECKS = 1');
            load_network();
            $finished = true;
        } catch (PDOException $e) {
            $error = 'Database error: ' . $e->getMessage();
        }
    }
}
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Install · Supply Network</title>
  <link rel="stylesheet" href="assets/styles.css">
</head>
<body>
  <section class="login" style="grid-template-columns:1fr">
    <div class="login-card">
      <?php if ($finished): ?>
        <h2><?= $mode === 'upgrade' ? 'Upgrade complete' : 'Installed' ?></h2>
        <p>The supply network is set up<?= $mode === 'install' ? ' and your admin account is ready' : '' ?>.</p>
        <p class="muted"><b>Delete <code>public/install.php</code> from the server now.</b></p>
        <a class="btn btn-primary btn-block" href="index.php" style="text-align:center;text-decoration:none">Open the app</a>
      <?php elseif ($mode === 'done'): ?>
        <h2>Already installed</h2>
        <p>Delete <code>public/install.php</code> from the server.</p>
        <a class="btn btn-primary btn-block" href="login.php" style="text-align:center;text-decoration:none">Go to sign in</a>
      <?php elseif ($mode === 'upgrade'): ?>
        <h2>Upgrade to the asset-based network</h2>
        <form method="post" style="display:grid;gap:14px">
          <p>This replaces the old vendor tables with the new supply network: assets, supply routes, customers and site content. It loads the 5 locations as your own assets.</p>
          <p class="muted">User accounts are kept. Vendor details entered in the old version are removed, so note down anything you still need first.</p>
          <input type="hidden" name="csrf" value="<?= e(csrf_token()) ?>">
          <?php if (!is_admin()): ?>
            <label>Admin username<input name="username" autocomplete="username" required></label>
            <label>Admin password<input name="password" type="password" autocomplete="current-password" required></label>
          <?php endif; ?>
          <p class="error" role="alert"><?= e($error) ?></p>
          <button class="btn btn-primary btn-block" type="submit">Upgrade now</button>
        </form>
      <?php else: ?>
        <h2>Install Supply Network</h2>
        <form method="post" style="display:grid;gap:14px">
          <p class="muted">This creates the tables in the MySQL database from <code>app/config.php</code>, loads your supply network, and creates the first admin account.</p>
          <input type="hidden" name="csrf" value="<?= e(csrf_token()) ?>">
          <label>Admin username<input name="username" value="admin" required></label>
          <label>Admin password (min 8 characters)<input name="password" type="password" minlength="8" required></label>
          <label>Confirm password<input name="password2" type="password" minlength="8" required></label>
          <p class="error" role="alert"><?= e($error) ?></p>
          <button class="btn btn-primary btn-block" type="submit">Install</button>
        </form>
      <?php endif; ?>
    </div>
  </section>
</body>
</html>

<?php
declare(strict_types=1);

// One-time installer: creates the tables, loads the starting data and the first
// admin account. It locks itself once any user exists. Delete it after setup.
require __DIR__ . '/../app/bootstrap.php';
send_security_headers();

function installed(): bool
{
    try {
        return (int) db()->query('SELECT COUNT(*) FROM users')->fetchColumn() > 0;
    } catch (PDOException) {
        return false;
    }
}

function run_sql_file(string $file): void
{
    $sql = preg_replace('/^\s*--.*$/m', '', file_get_contents($file));
    foreach (array_filter(array_map('trim', explode(';', $sql))) as $statement) {
        db()->exec($statement);
    }
}

$error = null;
$done = false;
$locked = installed();

if (!$locked && $_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrf_valid($_POST['csrf'] ?? null)) {
        $error = 'Session expired, please try again.';
    } elseif (($_POST['password'] ?? '') !== ($_POST['password2'] ?? '')) {
        $error = 'Passwords do not match.';
    } else {
        try {
            run_sql_file(APP_ROOT . '/database/schema.sql');
            if ((int) db()->query('SELECT COUNT(*) FROM vendors')->fetchColumn() === 0) {
                run_sql_file(APP_ROOT . '/database/seed.sql');
            }
            create_user((string) $_POST['username'], 'Administrator', (string) $_POST['password'], 'admin');
            $done = true;
        } catch (InvalidArgumentException $e) {
            $error = $e->getMessage();
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
      <h2>Install Supply Network</h2>
      <?php if ($done): ?>
        <p>Done. The database is set up and your admin account is ready.</p>
        <p class="muted"><b>Delete <code>public/install.php</code> from the server now.</b></p>
        <a class="btn btn-primary btn-block" href="login.php" style="text-align:center;text-decoration:none">Go to sign in</a>
      <?php elseif ($locked): ?>
        <p>The app is already installed. Delete <code>public/install.php</code> from the server.</p>
        <a class="btn btn-primary btn-block" href="login.php" style="text-align:center;text-decoration:none">Go to sign in</a>
      <?php else: ?>
        <form method="post" style="display:grid;gap:14px">
          <p class="muted">This creates the tables in the MySQL database from <code>app/config.php</code>, loads your 5 vendor locations, and creates the first admin account.</p>
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

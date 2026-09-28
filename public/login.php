<?php
declare(strict_types=1);

require __DIR__ . '/../app/bootstrap.php';
send_security_headers();

if (current_user()) {
    redirect('index.php');
}

$error = null;
$username = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim((string) ($_POST['username'] ?? ''));
    if (!csrf_valid($_POST['csrf'] ?? null)) {
        $error = 'Your session expired. Please try again.';
    } else {
        $error = attempt_login($username, (string) ($_POST['password'] ?? ''));
        if ($error === null) {
            redirect('index.php');
        }
    }
}
$appName = config()['app_name'] ?? 'Supply Network';
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Sign in · <?= e($appName) ?></title>
  <link href="https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="assets/styles.css">
</head>
<body>
  <section class="login">
    <div class="login-hero">
      <div class="brand brand-lg"><span class="brand-mark"></span><span><?= e($appName) ?></span></div>
      <h1>Raw material sourcing,<br>mapped end to end.</h1>
      <p>Explore our vendor network across India and the routes that feed the mills we supply.</p>
      <ul class="login-points">
        <li>Live vendor map</li>
        <li>Species-wise sourcing</li>
        <li>Routes to mills</li>
      </ul>
    </div>
    <form class="login-card" method="post" autocomplete="on">
      <h2>Sign in</h2>
      <p class="muted">Use the account shared with you.</p>
      <input type="hidden" name="csrf" value="<?= e(csrf_token()) ?>">
      <label>Username<input name="username" value="<?= e($username) ?>" autocomplete="username" required autofocus></label>
      <label>Password<input name="password" type="password" autocomplete="current-password" required></label>
      <p class="error" role="alert"><?= e($error) ?></p>
      <button class="btn btn-primary btn-block" type="submit">Sign in</button>
    </form>
  </section>
</body>
</html>

<?php
declare(strict_types=1);

require __DIR__ . '/../app/bootstrap.php';
send_security_headers();

$user = current_user();
if ($user === null) {
    redirect('login.php');
}
$admin = $user['role'] === 'admin';
$appName = config()['app_name'] ?? 'Supply Network';
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="csrf-token" content="<?= e(csrf_token()) ?>">
  <title><?= e($appName) ?></title>
  <link href="https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="assets/vendor/leaflet/leaflet.css">
  <link rel="stylesheet" href="assets/styles.css">
</head>
<body class="<?= $admin ? 'is-admin' : 'is-viewer' ?>">
  <header class="topbar">
    <div class="brand"><span class="brand-mark"></span><span><?= e($appName) ?></span></div>
    <nav class="tabs" id="tabs">
      <a href="#overview" data-tab="overview">Overview</a>
      <a href="#vendors" data-tab="vendors">Vendors</a>
      <a href="#materials" data-tab="materials">Materials</a>
      <?php if ($admin): ?><a href="#admin" data-tab="admin">Admin</a><?php endif; ?>
    </nav>
    <div class="user-box">
      <span class="role-badge <?= $admin ? 'admin' : '' ?>"><?= $admin ? 'Admin' : 'Customer view' ?></span>
      <span class="user-name"><?= e($user['display_name']) ?></span>
      <form method="post" action="logout.php">
        <input type="hidden" name="csrf" value="<?= e(csrf_token()) ?>">
        <button class="btn btn-ghost-light" type="submit">Sign out</button>
      </form>
    </div>
  </header>

  <main>
    <div class="page" data-page="overview">
      <?php if (!$admin): ?>
        <div class="banner">
          <span class="lock-ico" aria-hidden="true"></span>
          <span>You're viewing our supply network in <b>customer view</b>. Vendor names and contact details are kept confidential.</span>
        </div>
      <?php endif; ?>
      <div class="kpis" id="kpis"></div>

      <div class="toolbar">
        <div class="chips" id="material-chips"></div>
        <div class="search"><input id="search" type="search" placeholder="Search region, district or state"></div>
      </div>

      <div class="map-grid">
        <div class="card map-card">
          <div id="map"></div>
          <div class="legend" id="legend"></div>
        </div>
        <aside class="card side-panel" id="side-panel"></aside>
      </div>

      <div class="card">
        <div class="card-head"><h3>Supply journey</h3><span class="muted">How material moves from our vendors to the mill</span></div>
        <div class="journey" id="journey"></div>
      </div>

      <div class="card">
        <div class="card-head"><h3>Vendor network</h3><span class="muted" id="table-count"></span></div>
        <div class="table-wrap"><table class="table" id="vendor-table"></table></div>
      </div>
    </div>

    <div class="page" data-page="vendors">
      <div class="page-head"><h2>Vendor sites</h2><span class="muted" id="vendors-sub"></span></div>
      <div class="vendor-grid" id="vendor-grid"></div>
    </div>

    <div class="page" data-page="materials">
      <div class="page-head"><h2>Material catalogue</h2><span class="muted">Species and product forms we source</span></div>
      <div class="material-grid" id="material-grid"></div>
    </div>

    <?php if ($admin): ?>
    <div class="page" data-page="admin">
      <div class="page-head">
        <h2>Admin</h2>
        <button class="btn btn-primary" id="add-vendor" type="button">+ Add vendor</button>
      </div>
      <div class="card">
        <div class="card-head"><h3>Vendors</h3><span class="muted">Full details, including confidential contacts</span></div>
        <div class="table-wrap"><table class="table" id="admin-vendor-table"></table></div>
      </div>
      <div class="card">
        <div class="card-head"><h3>User accounts</h3><span class="muted">Admins see everything. Viewers (customers) see the network with vendor details hidden.</span></div>
        <form id="user-form" class="inline-form">
          <input name="username" placeholder="Username" required>
          <input name="displayName" placeholder="Display name (e.g. company)">
          <input name="password" type="password" placeholder="Password (min 8 chars)" minlength="8" required>
          <select name="role"><option value="viewer">Viewer (customer)</option><option value="admin">Admin</option></select>
          <button class="btn btn-primary" type="submit">Add user</button>
        </form>
        <p id="user-error" class="error" role="alert" style="padding:0 18px"></p>
        <div class="table-wrap"><table class="table" id="user-table"></table></div>
      </div>
    </div>

    <dialog id="vendor-dialog">
      <form id="vendor-form" method="dialog">
        <h3 id="vendor-dialog-title">Edit vendor</h3>
        <fieldset>
          <legend>Location &amp; supply (visible to customers)</legend>
          <div class="form-grid">
            <label>Region / village<input name="region" required></label>
            <label>District<input name="district"></label>
            <label>State<input name="state"></label>
            <label>Status<select name="status"><option>Active</option><option>Onboarding</option><option>Inactive</option></select></label>
            <label class="span-2">Paste a Google Maps link to fill the coordinates<input name="mapsPaste" placeholder="https://www.google.com/maps?q=27.73,81.14"></label>
            <label>Latitude<input name="lat" type="number" step="any" required></label>
            <label>Longitude<input name="lng" type="number" step="any" required></label>
            <label>Capacity (MT / month)<input name="capacityMt" type="number" min="0"></label>
            <label>Trucks / month<input name="trucksPerMonth" type="number" min="0"></label>
            <label>Active since (year)<input name="activeSince" type="number" min="1900" max="2100"></label>
          </div>
          <div class="check-row" id="dlg-materials"></div>
          <div class="check-row" id="dlg-customers"></div>
        </fieldset>
        <fieldset>
          <legend>Confidential (admins only)</legend>
          <div class="form-grid">
            <label>Vendor name<input name="c.name"></label>
            <label>Contact person<input name="c.person"></label>
            <label>Phone<input name="c.phone"></label>
            <label>Email<input name="c.email" type="email"></label>
            <label class="span-2">Address<input name="c.address"></label>
            <label>GSTIN<input name="c.gstin"></label>
            <label>Google Maps link<input name="c.mapsUrl"></label>
          </div>
        </fieldset>
        <p id="vendor-error" class="error" role="alert"></p>
        <div class="dialog-actions">
          <button class="btn" value="cancel" formnovalidate type="submit">Cancel</button>
          <button class="btn btn-primary" id="vendor-save" type="button">Save vendor</button>
        </div>
      </form>
    </dialog>
    <?php endif; ?>
  </main>

  <script src="assets/vendor/leaflet/leaflet.js"></script>
  <script src="assets/app.js"></script>
</body>
</html>

<?php
declare(strict_types=1);

require __DIR__ . '/../app/bootstrap.php';
send_security_headers();

$user = current_user();
if ($user === null) {
    redirect('login.php');
}
$admin = $user['role'] === 'admin';
if (!schema_ready()) {
    // Files were updated but the database has not been upgraded yet.
    if ($admin) {
        redirect('install.php');
    }
    http_response_code(503);
    exit('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Updating</title>'
        . '<link rel="stylesheet" href="' . asset_url('assets/styles.css') . '"><section class="login" style="grid-template-columns:1fr"><div class="login-card">'
        . '<h2>We are updating the site</h2><p class="muted">Please check back in a few minutes.</p></div></section>');
}
$company = site_content()['company_name'] ?: (config()['app_name'] ?? 'Supply Network');
// Top-level sections; sections with several pages get a small sub-navigation.
$groups = [
    'dashboard'      => ['Overview', ['dashboard' => ['Overview', '', '']]],
    'network'        => ['Network', [
        'network'   => ['Map', 'All our sites on one map', 'map'],
        'assets'    => ['Assets', 'A profile for every site', 'chipping'],
        'logistics' => ['Routes', 'Trace a truck route to the mill', 'logistics'],
    ]],
    'materials'      => ['Products', [
        'materials'  => ['Materials', 'Wood species and product forms', 'sourcing'],
        'processing' => ['Processing', 'How wood becomes chips', 'processing'],
    ]],
    'customers'      => ['Customers', ['customers' => ['Customers', '', '']]],
    'sustainability' => ['Sustainability', ['sustainability' => ['Sustainability', '', '']]],
    'about'          => ['About', ['about' => ['About us', '', '']]],
];
if ($admin) {
    $groups['admin'] = ['Admin', ['admin' => ['Admin', '', '']]];
}
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="csrf-token" content="<?= e(csrf_token()) ?>">
  <title><?= e($company) ?> · Supply Network</title>
  <link rel="icon" type="image/png" href="<?= asset_url('assets/favicon.png') ?>">
  <link rel="apple-touch-icon" href="<?= asset_url('assets/apple-touch-icon.png') ?>">
  <link href="https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="assets/vendor/leaflet/leaflet.css">
  <link rel="stylesheet" href="<?= asset_url('assets/styles.css') ?>">
</head>
<body class="<?= $admin ? 'is-admin' : 'is-viewer' ?>">
  <header class="topbar">
    <a class="brand" href="#dashboard"><img class="brand-logo" src="<?= asset_url('assets/logo.png') ?>" alt="<?= e($company) ?> logo"><span><?= e($company) ?></span></a>
    <div class="user-box">
      <span class="role-badge <?= $admin ? 'admin' : '' ?>"><?= $admin ? 'Admin' : 'Customer view' ?></span>
      <span class="user-name"><?= e($user['display_name']) ?></span>
      <form method="post" action="logout.php">
        <input type="hidden" name="csrf" value="<?= e(csrf_token()) ?>">
        <button class="btn btn-ghost-light" type="submit">Sign out</button>
      </form>
    </div>
    <nav class="tabs" id="tabs">
      <?php foreach ($groups as $id => [$label, $pages]): ?>
        <a href="#<?= $id ?>" data-group="<?= $id ?>"><?= e($label) ?></a>
      <?php endforeach; ?>
    </nav>
  </header>

  <main>
    <?php foreach ($groups as $id => [$label, $pages]): if (count($pages) > 1): ?>
      <nav class="section-tabs" data-subnav="<?= $id ?>" aria-label="<?= e($label) ?> views" hidden>
        <?php $n = 0; foreach ($pages as $page => [$pageLabel, $desc, $icon]): $n++; ?>
          <a class="stab" href="#<?= $page ?>" data-page-link="<?= $page ?>">
            <span class="stab-ico" data-icon="<?= $icon ?>"></span>
            <span class="stab-text"><b><?= e($pageLabel) ?></b><small><?= e($desc) ?></small></span>
            <span class="stab-step"><?= $n ?>/<?= count($pages) ?></span>
          </a>
        <?php endforeach; ?>
      </nav>
    <?php endif; endforeach; ?>
    <!-- Dashboard -->
    <div class="page" data-page="dashboard">
      <section class="hero card">
        <div>
          <p class="eyebrow" id="hero-company"></p>
          <h1 id="hero-title"></h1>
          <p id="hero-subtitle" class="hero-sub"></p>
          <p id="hero-statement" class="statement"></p>
          <div id="hero-eudr"></div>
          <div class="hero-actions">
            <a class="btn btn-primary" href="#network">Explore the supply network</a>
            <a class="btn" href="#logistics">Trace a supply route</a>
          </div>
        </div>
      </section>
      <div class="stats-row" id="kpis"></div>
      <div class="card map-card">
        <div class="card-head"><h3>Where we operate</h3><span class="muted">Our own assets and the mills we supply</span><a class="head-link" href="#network">Open full map →</a></div>
        <div id="dash-map" class="map map-sm"></div>
        <div class="legend" data-legend></div>
      </div>
      <section class="card" id="supply-record" hidden></section>
    </div>

    <!-- Supply network map -->
    <div class="page" data-page="network">
      <div class="page-head"><h2>Our supply network</h2><span class="muted">Every location is our own sourcing, processing, aggregation or logistics asset</span></div>
      <div class="filter-bar">
        <select id="f-type" aria-label="Asset type"></select>
        <select id="f-material" aria-label="Material"></select>
        <select id="f-form" aria-label="Product type"></select>
        <input id="f-search" type="search" placeholder="Search" aria-label="Search assets">
      </div>
      <div class="map-grid">
        <div class="card map-card">
          <div id="net-map" class="map"></div>
          <div class="legend" data-legend></div>
        </div>
        <aside class="card side-panel" id="side-panel"></aside>
      </div>
    </div>

    <!-- Assets -->
    <div class="page" data-page="assets">
      <div class="page-head"><h2>Our assets</h2><span class="muted" id="assets-sub"></span></div>
      <div id="asset-groups" class="groups"></div>
    </div>

    <!-- Asset profile -->
    <div class="page" data-page="asset">
      <div id="asset-profile"></div>
    </div>

    <!-- Materials -->
    <div class="page" data-page="materials">
      <div class="page-head"><h2>Our material portfolio</h2><span class="muted">Four wood species, supplied in debarked, with-bark and core-chip forms</span></div>
      <div class="material-grid" id="material-grid"></div>
    </div>

    <!-- Processing -->
    <div class="page" data-page="processing">
      <div class="page-head"><h2>Processing</h2><span class="muted">Debarking, chipping, screening and quality control at our own centers</span></div>
      <div class="card"><div class="flow" data-flow></div></div>
      <div class="cap-grid" id="cap-grid"></div>
      <div class="card">
        <div class="card-head"><h3>Processing assets</h3><span class="muted" id="proc-sub"></span></div>
        <div class="table-wrap"><table class="table" id="proc-table"></table></div>
      </div>
    </div>

    <!-- Logistics -->
    <div class="page" data-page="logistics">
      <div class="page-head"><h2>Logistics &amp; supply routes</h2><span class="muted">Pick a product and a customer to trace how it reaches the mill</span></div>
      <div class="filter-bar">
        <select id="l-product" aria-label="Product"></select>
        <select id="l-customer" aria-label="Customer"></select>
      </div>
      <div class="map-grid">
        <div class="card map-card">
          <div id="log-map" class="map"></div>
        </div>
        <aside class="card side-panel" id="route-panel"></aside>
      </div>
      <div class="stats-row" id="log-kpis"></div>
    </div>

    <!-- Customers -->
    <div class="page" data-page="customers">
      <div class="page-head"><h2>Our customers</h2><span class="muted">Mills supplied from our network</span></div>
      <div id="customer-list" class="customer-list"></div>
    </div>

    <!-- Sustainability -->
    <div class="page" data-page="sustainability">
      <div class="page-head"><h2>Sustainability</h2><span class="muted">Responsible sourcing across our network</span></div>
      <section class="card eudr" id="eudr"></section>
      <div class="sus-grid" id="sus-grid"></div>
    </div>

    <!-- About -->
    <div class="page" data-page="about">
      <div class="about-grid">
        <div class="card prose" id="about-body"></div>
        <div class="card" id="about-contact"></div>
        <div class="card about-org"><div class="card-head"><h3>How we are organised</h3></div><div class="hero-org" id="hero-org"></div></div>
      </div>
    </div>

    <?php if ($admin): ?>
    <div class="page" data-page="admin">
      <div class="page-head"><h2>Admin</h2></div>
      <div class="tab-bar" id="admin-tabs" role="tablist">
        <button type="button" data-admin-tab="assets"><span data-icon="chipping"></span>Assets</button>
        <button type="button" data-admin-tab="customers"><span data-icon="customer"></span>Customers</button>
        <button type="button" data-admin-tab="supply"><span data-icon="scale"></span>Supply data</button>
        <button type="button" data-admin-tab="routes"><span data-icon="route"></span>Road routes</button>
        <button type="button" data-admin-tab="content"><span data-icon="log"></span>Site content</button>
        <button type="button" data-admin-tab="users"><span data-icon="people"></span>Users</button>
      </div>
      <div class="card" data-admin-section="assets">
        <div class="card-head"><h3>Assets</h3><span class="muted">Locations, capabilities, products handled and outgoing routes</span>
          <button class="btn btn-primary head-btn" data-add-asset type="button">+ Add asset</button></div>
        <div class="table-wrap"><table class="table" id="admin-assets"></table></div>
      </div>
      <div class="card" data-admin-section="customers">
        <div class="card-head"><h3>Customers</h3><span class="muted">Destinations, products supplied and monthly supply history</span>
          <button class="btn btn-primary head-btn" data-add-customer type="button">+ Add customer</button></div>
        <div class="table-wrap"><table class="table" id="admin-customers"></table></div>
      </div>
      <div class="card" data-admin-section="supply">
        <div class="card-head"><h3>Supply data</h3><span class="muted">Import the dispatch log book (.xlsx). Only monthly totals are stored, never truck, driver, transporter or payment details.</span></div>
        <div class="import-box">
          <form id="import-form" class="inline-form">
            <input type="file" name="file" accept=".xlsx" required>
            <button class="btn btn-primary" type="submit">Read workbook</button>
          </form>
          <div id="import-preview"></div>
          <p class="error" id="import-error"></p>
          <div id="import-current"></div>
        </div>
      </div>
      <div class="card" data-admin-section="routes">
        <div class="card-head"><h3>Road routes</h3><span class="muted">Truck routes by road, calculated once per supply link and stored</span>
          <button class="btn head-btn" data-routes-refresh type="button">Calculate missing routes</button>
          <button class="btn" data-routes-refresh="force" type="button">Recalculate all</button></div>
        <p class="error" id="routes-error" style="padding:0 18px"></p>
        <div class="table-wrap"><table class="table" id="admin-routes"></table></div>
      </div>
      <div class="card" data-admin-section="content">
        <div class="card-head"><h3>Site content</h3><span class="muted">Text shown on the Dashboard, Sustainability and About Us pages</span></div>
        <form id="content-form" class="content-form"></form>
      </div>
      <div class="card" data-admin-section="users">
        <div class="card-head"><h3>User accounts</h3><span class="muted">Admins see everything. Viewers (customers) see the network with internal site details hidden.</span></div>
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

    <dialog id="asset-dialog"><form id="asset-form" method="dialog" class="dlg-form"></form></dialog>
    <dialog id="customer-dialog"><form id="customer-form" method="dialog" class="dlg-form"></form></dialog>
    <?php endif; ?>
    <nav class="pager" id="pager" hidden></nav>
  </main>

  <script src="assets/vendor/leaflet/leaflet.js"></script>
  <script src="<?= asset_url('assets/app.js') ?>"></script>
</body>
</html>

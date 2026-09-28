(() => {
  'use strict';

  const CSRF = document.querySelector('meta[name="csrf-token"]').content;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (n) => Number(n || 0).toLocaleString('en-IN');

  const ICON = {
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></svg>',
    mill: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M2 21V10l6 3.5V10l6 3.5V4h3v4h2V4h3v17H2zm4-4v2h3v-2H6zm5 0v2h3v-2h-3zm5 0v2h3v-2h-3z"/></svg>',
    scale: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v18M5 21h14M6 7h12M6 7l-3 7a3 3 0 0 0 6 0L6 7zm12 0-3 7a3 3 0 0 0 6 0l-3-7z"/></svg>',
    truck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h11v10H3zM14 9h4l3 3v4h-7z"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/></svg>',
    map: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14"/></svg>',
    tree: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22v-6M8 16h8l-2.5-4H16l-4-7-4 7h2.5z"/></svg>',
    saw: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></svg>',
    yard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21V9l9-5 9 5v12M7 21v-7h10v7M7 17h10"/></svg>',
  };

  const state = { data: null, material: null, search: '', selected: null, users: [] };
  let map, vendorLayer, routeLayer, customerLayer;
  const markers = new Map();

  // ---------- API ----------
  async function api(action, body) {
    const res = await fetch(`api.php?action=${encodeURIComponent(action)}`, {
      method: body ? 'POST' : 'GET',
      headers: body ? { 'Content-Type': 'application/json', 'X-CSRF-Token': CSRF } : {},
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'same-origin',
    });
    if (res.status === 401) { location.href = 'login.php'; throw new Error('Signed out'); }
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Request failed');
    return json;
  }

  const isAdmin = () => state.data?.user.role === 'admin';
  const material = (id) => state.data.materials.find((m) => m.id === id);
  const customer = (id) => state.data.customers.find((c) => c.id === id);
  const vendorById = (id) => state.data.vendors.find((v) => v.id === id);
  const vendorTitle = (v) => (isAdmin() && v.contact?.name ? v.contact.name : `Vendor ${v.code}`);

  function visibleVendors() {
    const q = state.search.trim().toLowerCase();
    return state.data.vendors.filter((v) =>
      (!state.material || v.materials.includes(state.material)) &&
      (!q || [v.code, v.region, v.district, v.state, isAdmin() ? v.contact?.name : ''].join(' ').toLowerCase().includes(q)));
  }

  function distanceKm(a, b) {
    const R = 6371, rad = Math.PI / 180;
    const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  function materialTags(ids) {
    return `<div class="tags">${ids.map((id) => {
      const m = material(id);
      return m ? `<span class="tag" style="background:${esc(m.color)}">${esc(m.name)}</span>` : '';
    }).join('')}</div>`;
  }

  function markerBackground(v) {
    const colors = v.materials.map((id) => material(id)?.color).filter(Boolean);
    if (!colors.length) return '#64748b';
    if (colors.length === 1) return colors[0];
    const step = 360 / colors.length;
    return `conic-gradient(${colors.map((c, i) => `${c} ${i * step}deg ${(i + 1) * step}deg`).join(',')})`;
  }

  // ---------- KPIs, chips, legend ----------
  function renderKpis() {
    const vs = state.data.vendors.filter((v) => v.status !== 'Inactive');
    const states = new Set(vs.map((v) => v.state).filter(Boolean));
    const items = [
      ['Vendor sites', fmt(vs.length), '', ICON.pin],
      ['Monthly capacity', fmt(vs.reduce((s, v) => s + v.capacityMt, 0)), 'MT', ICON.scale],
      ['Trucks / month', fmt(vs.reduce((s, v) => s + v.trucksPerMonth, 0)), '', ICON.truck],
      ['States covered', fmt(states.size), '', ICON.map],
      ['Wood species', fmt(state.data.materials.length), '', ICON.tree],
      ['Destination mills', fmt(state.data.customers.length), '', ICON.mill],
    ];
    $('#kpis').innerHTML = items.map(([label, value, unit, icon]) => `
      <div class="kpi"><div class="kpi-ico">${icon}</div><div class="kpi-label">${label}</div>
      <div class="kpi-value">${value}${unit ? `<small>${unit}</small>` : ''}</div></div>`).join('');
  }

  function renderChips() {
    const chips = [{ id: null, name: 'All materials', color: '#94a3b8' }, ...state.data.materials];
    $('#material-chips').innerHTML = chips.map((m) => `
      <button class="chip ${state.material === m.id ? 'active' : ''}" data-material="${esc(m.id ?? '')}" type="button">
        <span class="dot" style="background:${esc(m.color)}"></span>${esc(m.name)}</button>`).join('');
    $('#legend').innerHTML = state.data.materials.map((m) =>
      `<div><span class="sw" style="background:${esc(m.color)}"></span>${esc(m.name)}</div>`).join('') +
      '<div><span class="sw sq"></span>Destination mill</div><div><span class="sw ln"></span>Supply route</div>';
  }

  // ---------- Map ----------
  function initMap() {
    map = L.map('map', { zoomControl: true, scrollWheelZoom: true }).setView([22.5, 79], 5);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO', subdomains: 'abcd', maxZoom: 19,
    }).addTo(map);
    routeLayer = L.layerGroup().addTo(map);
    customerLayer = L.layerGroup().addTo(map);
    vendorLayer = L.layerGroup().addTo(map);
  }

  function curve(a, b) {
    const pts = [];
    const mx = (a.lat + b.lat) / 2, my = (a.lng + b.lng) / 2;
    const dx = b.lat - a.lat, dy = b.lng - a.lng;
    const cx = mx - dy * 0.18, cy = my + dx * 0.18; // bend perpendicular to the line
    for (let t = 0; t <= 1.0001; t += 1 / 40) {
      const u = 1 - t;
      pts.push([u * u * a.lat + 2 * u * t * cx + t * t * b.lat, u * u * a.lng + 2 * u * t * cy + t * t * b.lng]);
    }
    return pts;
  }

  function renderMap(fit) {
    vendorLayer.clearLayers(); routeLayer.clearLayers(); customerLayer.clearLayers(); markers.clear();
    const vs = visibleVendors();
    const usedCustomers = new Set(vs.flatMap((v) => v.suppliesTo));

    state.data.customers.forEach((c) => {
      const icon = L.divIcon({ className: '', html: `<div class="c-marker">${ICON.mill}</div>`, iconSize: [34, 34], iconAnchor: [17, 17] });
      L.marker([c.lat, c.lng], { icon, opacity: usedCustomers.has(c.id) || !vs.length ? 1 : 0.45 })
        .bindTooltip(`<b>${esc(c.name)}</b><br>${esc(c.place)}`, { className: 'tip', direction: 'top', offset: [0, -16] })
        .addTo(customerLayer);
    });

    vs.forEach((v) => {
      v.suppliesTo.map(customer).filter(Boolean).forEach((c) => {
        const selected = state.selected === v.id;
        L.polyline(curve(v, c), {
          color: selected ? '#1b3478' : '#2f6fe4', weight: selected ? 3.5 : 2, opacity: state.selected && !selected ? 0.25 : 0.8,
          className: 'route',
        }).addTo(routeLayer);
      });
      const icon = L.divIcon({
        className: '',
        html: `<div class="v-marker ${state.selected === v.id ? 'selected' : ''}" style="background:${markerBackground(v)}">${esc(v.code.replace('V-', ''))}</div>`,
        iconSize: [30, 30], iconAnchor: [15, 15],
      });
      const m = L.marker([v.lat, v.lng], { icon, riseOnHover: true, zIndexOffset: state.selected === v.id ? 1000 : 0 })
        .bindTooltip(`<b>${esc(vendorTitle(v))}</b><br>${esc(v.region)}, ${esc(v.state)}`, { className: 'tip', direction: 'top', offset: [0, -14] })
        .on('click', () => selectVendor(v.id))
        .addTo(vendorLayer);
      markers.set(v.id, m);
    });

    if (fit) {
      const pts = [...vs.map((v) => [v.lat, v.lng]), ...state.data.customers.filter((c) => usedCustomers.has(c.id)).map((c) => [c.lat, c.lng])];
      if (pts.length) map.fitBounds(pts, { padding: [40, 40], maxZoom: 9 });
    }
  }

  // ---------- Side panel ----------
  function renderPanel() {
    const panel = $('#side-panel');
    const v = state.selected && vendorById(state.selected);
    if (!v) {
      const vs = visibleVendors();
      panel.innerHTML = `
        <div class="panel-head"><h3>Vendor sites</h3><span class="muted">${vs.length} shown · click a site for details</span></div>
        <ul class="v-list">${vs.map((x) => `
          <li class="v-item" data-vendor="${x.id}" tabindex="0">
            <span class="pin">${ICON.pin}</span>
            <span><span class="t">${esc(vendorTitle(x))}</span><br><span class="s">${esc(x.region)} · ${esc(x.district)}, ${esc(x.state)}</span></span>
            <span class="cap">${fmt(x.capacityMt)}<small>MT / month</small></span>
          </li>`).join('') || '<li class="muted" style="padding:12px">No vendors match these filters.</li>'}</ul>`;
      return;
    }

    const route = v.suppliesTo.map(customer).filter(Boolean);
    panel.innerHTML = `
      <div class="panel-head"><button class="back" data-back type="button">← All sites</button><span class="status ${esc(v.status)}" style="margin-left:auto">${esc(v.status)}</span></div>
      <div class="panel-body">
        <div>
          <div class="muted" style="font-weight:700">${esc(v.code)}</div>
          <h3 style="font-size:20px">${esc(vendorTitle(v))}</h3>
          <div class="muted">${esc(v.region)} · ${esc(v.district)}, ${esc(v.state)}</div>
        </div>
        ${materialTags(v.materials)}
        <div class="stats">
          <div class="stat"><div class="l">Capacity</div><div class="v">${fmt(v.capacityMt)} MT/mo</div></div>
          <div class="stat"><div class="l">Dispatch</div><div class="v">${fmt(v.trucksPerMonth)} trucks/mo</div></div>
          <div class="stat"><div class="l">Supplying since</div><div class="v">${esc(v.activeSince ?? '–')}</div></div>
          <div class="stat"><div class="l">Supplies to</div><div class="v">${route.map((c) => esc(c.name)).join(', ') || '–'}</div></div>
        </div>
        <div>
          <div class="section-title">Products</div>
          <div class="muted">${v.materials.flatMap((id) => material(id)?.products || []).map(esc).join(' · ')}</div>
        </div>
        ${route.length ? `<div>
          <div class="section-title">Supply route</div>
          <ul class="timeline">
            <li><b>${esc(v.region)} vendor yard</b><span>Sourcing, debarking &amp; chipping</span></li>
            <li><b>Quality check &amp; weighment</b><span>Loaded onto trucks at source</span></li>
            ${route.map((c) => `<li><b>${esc(c.name)}</b><span>${esc(c.place)} · ~${fmt(Math.round(distanceKm(v, c)))} km straight-line</span></li>`).join('')}
          </ul></div>` : ''}
        <div>
          <div class="section-title">Vendor contact</div>
          ${contactBlock(v)}
        </div>
      </div>`;
  }

  function contactBlock(v) {
    if (v.contactLocked || !v.contact) {
      // Placeholder text only: the real details are never sent to customer accounts.
      const fake = ['Registered Vendor Name Pvt Ltd', 'Contact Person Name', '+91 98XXX XXXXX', 'contact@vendor-name.in', 'Village, District, State 000000'];
      const sales = state.data.app.salesContact;
      return `<div class="contact locked">
        ${['Vendor', 'Contact', 'Phone', 'Email', 'Address'].map((l, i) => `<div class="row"><span>${l}</span><span aria-hidden="true">${fake[i]}</span></div>`).join('')}
        <div class="lock-overlay"><div><span class="lock-ico"></span>Vendor details are confidential
          <small>${sales ? `Talk to us at ${esc(sales)} to source through this network` : 'Contact us to source through this network'}</small></div></div>
      </div>`;
    }
    const c = v.contact;
    const link = /^https?:\/\//i.test(c.mapsUrl) ? `<a href="${esc(c.mapsUrl)}" target="_blank" rel="noopener">Open in Google Maps</a>` : '–';
    return `<div class="contact">
      <div class="row"><span>Vendor</span><span>${esc(c.name) || '–'}</span></div>
      <div class="row"><span>Contact</span><span>${esc(c.person) || '–'}</span></div>
      <div class="row"><span>Phone</span><span>${c.phone ? `<a href="tel:${esc(c.phone.replace(/\s/g, ''))}">${esc(c.phone)}</a>` : '–'}</span></div>
      <div class="row"><span>Email</span><span>${c.email ? `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : '–'}</span></div>
      <div class="row"><span>Address</span><span>${esc(c.address) || '–'}</span></div>
      <div class="row"><span>GSTIN</span><span>${esc(c.gstin) || '–'}</span></div>
      <div class="row"><span>Location</span><span>${link}</span></div>
    </div>`;
  }

  function selectVendor(id) {
    state.selected = id;
    renderPanel();
    renderMap(false);
    const v = vendorById(id);
    if (v) map.flyTo([v.lat, v.lng], Math.max(map.getZoom(), 7), { duration: 0.8 });
  }

  // ---------- Journey & tables ----------
  function renderJourney() {
    const vs = state.data.vendors.filter((v) => v.status !== 'Inactive');
    const steps = [
      [ICON.tree, 'Plantation source', 'Farm & agro-forestry wood'],
      [ICON.yard, 'Vendor yards', `${vs.length} sites, ${new Set(vs.map((v) => v.state)).size} states`],
      [ICON.saw, 'Debarking & chipping', 'Chips, core & with-bark'],
      [ICON.check, 'Quality check', 'Moisture & size'],
      [ICON.scale, 'Weighment & loading', `${fmt(vs.reduce((s, v) => s + v.trucksPerMonth, 0))} trucks / month`],
      [ICON.truck, 'Road transport', 'Direct to mill'],
      [ICON.mill, 'Mill delivery', state.data.customers.map((c) => c.name).join(' · ')],
    ];
    $('#journey').innerHTML = steps.map(([ico, t, s], i) =>
      `${i ? '<div class="connector"></div>' : ''}<div class="step"><span class="ico">${ico}</span><span><b>${esc(t)}</b><span>${esc(s)}</span></span></div>`).join('');
  }

  function renderVendorTable() {
    const vs = visibleVendors();
    $('#table-count').textContent = `${vs.length} of ${state.data.vendors.length} sites`;
    $('#vendor-table').innerHTML = `
      <thead><tr><th>Site</th><th>Vendor</th><th>Region</th><th>State</th><th>Materials</th><th>Capacity (MT/mo)</th><th>Trucks/mo</th><th>Supplies to</th><th>Status</th></tr></thead>
      <tbody>${vs.map((v) => `<tr>
        <td><button class="link" data-view="${v.id}" type="button">${esc(v.code)} · View</button></td>
        <td>${isAdmin() ? esc(v.contact?.name || '–') : '<span class="masked" aria-label="Confidential">Confidential Vendor</span>'}</td>
        <td>${esc(v.region)}<br><span class="muted">${esc(v.district)}</span></td>
        <td>${esc(v.state)}</td>
        <td>${materialTags(v.materials)}</td>
        <td>${fmt(v.capacityMt)}</td>
        <td>${fmt(v.trucksPerMonth)}</td>
        <td>${v.suppliesTo.map((id) => esc(customer(id)?.name)).join(', ')}</td>
        <td><span class="status ${esc(v.status)}">${esc(v.status)}</span></td>
      </tr>`).join('')}</tbody>`;
  }

  function renderVendorGrid() {
    $('#vendors-sub').textContent = `${state.data.vendors.length} sourcing locations`;
    $('#vendor-grid').innerHTML = state.data.vendors.map((v) => `
      <div class="card v-card">
        <div class="v-card-head"><span class="pin kpi-ico">${ICON.pin}</span>
          <div><h3>${esc(vendorTitle(v))}</h3><div class="muted">${esc(v.region)}, ${esc(v.state)}</div></div>
          <span class="status ${esc(v.status)}">${esc(v.status)}</span></div>
        ${materialTags(v.materials)}
        <div class="stats">
          <div class="stat"><div class="l">Capacity</div><div class="v">${fmt(v.capacityMt)} MT/mo</div></div>
          <div class="stat"><div class="l">Supplies to</div><div class="v">${v.suppliesTo.map((id) => esc(customer(id)?.name)).join(', ') || '–'}</div></div>
        </div>
        ${contactBlock(v)}
        <button class="btn" data-view="${v.id}" type="button">Show on map</button>
      </div>`).join('');
  }

  function renderMaterials() {
    $('#material-grid').innerHTML = state.data.materials.map((m) => {
      const vs = state.data.vendors.filter((v) => v.materials.includes(m.id));
      const states = [...new Set(vs.map((v) => v.state))];
      return `<div class="card m-card" style="--c:${esc(m.color)}">
        <h3>${esc(m.name)}</h3>
        <ul>${m.products.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
        <div class="stats">
          <div class="stat"><div class="l">Vendor sites</div><div class="v">${vs.length}</div></div>
          <div class="stat"><div class="l">Source states</div><div class="v">${esc(states.join(', ') || '–')}</div></div>
        </div>
        <button class="btn" data-material-map="${esc(m.id)}" type="button">View ${esc(m.name)} network</button>
      </div>`;
    }).join('');
  }

  // ---------- Admin ----------
  function renderAdmin() {
    if (!isAdmin()) return;
    $('#admin-vendor-table').innerHTML = `
      <thead><tr><th>Site</th><th>Vendor name</th><th>Location</th><th>Contact</th><th>Materials</th><th>Capacity</th><th>Status</th><th></th></tr></thead>
      <tbody>${state.data.vendors.map((v) => `<tr>
        <td>${esc(v.code)}</td>
        <td><b>${esc(v.contact?.name || '–')}</b></td>
        <td>${esc(v.region)}, ${esc(v.state)}<br><span class="muted">${v.lat.toFixed(5)}, ${v.lng.toFixed(5)}</span></td>
        <td>${esc(v.contact?.person || '–')}<br><span class="muted">${esc(v.contact?.phone || '')}</span></td>
        <td>${materialTags(v.materials)}</td>
        <td>${fmt(v.capacityMt)} MT</td>
        <td><span class="status ${esc(v.status)}">${esc(v.status)}</span></td>
        <td><div class="actions"><button class="btn btn-sm" data-edit="${v.id}" type="button">Edit</button>
          <button class="btn btn-sm btn-danger" data-delete="${v.id}" type="button">Delete</button></div></td>
      </tr>`).join('')}</tbody>`;
    renderUsers();
  }

  async function loadUsers() {
    state.users = await api('users');
    renderUsers();
  }

  function renderUsers() {
    $('#user-table').innerHTML = `
      <thead><tr><th>Username</th><th>Display name</th><th>Access</th><th>Last sign-in</th><th></th></tr></thead>
      <tbody>${state.users.map((u) => `<tr>
        <td><b>${esc(u.username)}</b></td>
        <td>${esc(u.display_name)}</td>
        <td>${u.role === 'admin' ? '<span class="status">Admin · full access</span>' : '<span class="status Onboarding">Viewer · details hidden</span>'}</td>
        <td class="muted">${esc(u.last_login_at || 'Never')}</td>
        <td><div class="actions">
          <button class="btn btn-sm" data-reset="${u.id}" type="button">Reset password</button>
          ${u.username === state.data.user.username ? '' : `<button class="btn btn-sm btn-danger" data-user-delete="${u.id}" type="button">Remove</button>`}
        </div></td></tr>`).join('')}</tbody>`;
  }

  function parseCoords(text) {
    const patterns = [/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/, /[?&]q=(-?\d+\.\d+),\s*(-?\d+\.\d+)/, /@(-?\d+\.\d+),(-?\d+\.\d+)/, /^\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)\s*$/];
    for (const p of patterns) {
      const m = decodeURIComponent(text).match(p);
      if (m) return [Number(m[1]), Number(m[2])];
    }
    return null;
  }

  function openVendorDialog(v) {
    const form = $('#vendor-form');
    form.reset();
    form.dataset.id = v ? v.id : '';
    $('#vendor-dialog-title').textContent = v ? `Edit ${v.code}` : 'Add vendor';
    $('#vendor-error').textContent = '';
    const fields = v ? { ...v, ...Object.fromEntries(Object.entries(v.contact || {}).map(([k, val]) => [`c.${k}`, val])) } : { status: 'Active' };
    $$('input[name], select[name]', form).forEach((el) => { if (el.name in fields && fields[el.name] != null) el.value = fields[el.name]; });
    $('#dlg-materials').innerHTML = '<strong>Materials supplied</strong>' + state.data.materials.map((m) =>
      `<label><input type="checkbox" name="materials" value="${esc(m.id)}" ${v?.materials.includes(m.id) ? 'checked' : ''}>${esc(m.name)}</label>`).join('');
    $('#dlg-customers').innerHTML = '<strong>Supplies to</strong>' + state.data.customers.map((c) =>
      `<label><input type="checkbox" name="suppliesTo" value="${esc(c.id)}" ${v?.suppliesTo.includes(c.id) ? 'checked' : ''}>${esc(c.name)}</label>`).join('');
    $('#vendor-dialog').showModal();
  }

  async function saveVendor() {
    const form = $('#vendor-form');
    if (!form.reportValidity()) return;
    const val = (n) => form.elements[n].value;
    const body = {
      id: form.dataset.id || null,
      region: val('region'), district: val('district'), state: val('state'), status: val('status'),
      lat: val('lat'), lng: val('lng'), capacityMt: val('capacityMt'), trucksPerMonth: val('trucksPerMonth'), activeSince: val('activeSince'),
      materials: $$('input[name="materials"]:checked', form).map((i) => i.value),
      suppliesTo: $$('input[name="suppliesTo"]:checked', form).map((i) => i.value),
      contact: Object.fromEntries(['name', 'person', 'phone', 'email', 'address', 'gstin', 'mapsUrl'].map((k) => [k, val(`c.${k}`)])),
    };
    try {
      await api('vendor_save', body);
      $('#vendor-dialog').close();
      await reload();
    } catch (err) {
      $('#vendor-error').textContent = err.message;
    }
  }

  // ---------- Routing & events ----------
  function showTab(tab) {
    const pages = $$('.page').map((p) => p.dataset.page);
    if (!pages.includes(tab)) tab = 'overview';
    $$('.page').forEach((p) => { p.hidden = p.dataset.page !== tab; });
    $$('#tabs a').forEach((a) => a.classList.toggle('active', a.dataset.tab === tab));
    if (tab === 'overview' && map) setTimeout(() => map.invalidateSize(), 0);
    if (tab === 'admin') loadUsers().catch((e) => { $('#user-error').textContent = e.message; });
  }

  function goToVendor(id) {
    location.hash = 'overview';
    showTab('overview');
    setTimeout(() => selectVendor(id), 50);
  }

  function refreshFiltered(fit) {
    if (state.selected && !visibleVendors().some((v) => v.id === state.selected)) state.selected = null;
    renderChips(); renderMap(fit); renderPanel(); renderVendorTable();
  }

  function renderAll(fit) {
    document.title = state.data.app.name;
    renderKpis(); renderJourney(); renderVendorGrid(); renderMaterials(); renderAdmin();
    refreshFiltered(fit);
  }

  async function reload() {
    state.data = await api('network');
    renderAll(false);
  }

  function bindEvents() {
    window.addEventListener('hashchange', () => showTab(location.hash.slice(1)));

    document.addEventListener('click', async (e) => {
      const t = e.target.closest('[data-material],[data-vendor],[data-back],[data-view],[data-material-map],[data-edit],[data-delete],[data-user-delete],[data-reset],#add-vendor,#vendor-save');
      if (!t) return;
      if (t.dataset.material !== undefined) { state.material = t.dataset.material || null; refreshFiltered(true); }
      else if (t.dataset.vendor) selectVendor(Number(t.dataset.vendor));
      else if (t.dataset.back !== undefined) { state.selected = null; renderPanel(); renderMap(true); }
      else if (t.dataset.view) goToVendor(Number(t.dataset.view));
      else if (t.dataset.materialMap) { state.material = t.dataset.materialMap; location.hash = 'overview'; refreshFiltered(true); }
      else if (t.dataset.edit) openVendorDialog(vendorById(Number(t.dataset.edit)));
      else if (t.id === 'add-vendor') openVendorDialog(null);
      else if (t.id === 'vendor-save') saveVendor();
      else if (t.dataset.delete) {
        const v = vendorById(Number(t.dataset.delete));
        if (confirm(`Delete ${v.code} (${v.contact?.name || v.region})? This cannot be undone.`)) {
          try { await api('vendor_delete', { id: v.id }); if (state.selected === v.id) state.selected = null; await reload(); } catch (err) { alert(err.message); }
        }
      } else if (t.dataset.userDelete) {
        const u = state.users.find((x) => x.id === Number(t.dataset.userDelete));
        if (confirm(`Remove ${u.username}? They will be signed out.`)) {
          try { await api('user_delete', { id: u.id }); await loadUsers(); } catch (err) { $('#user-error').textContent = err.message; }
        }
      } else if (t.dataset.reset) {
        const u = state.users.find((x) => x.id === Number(t.dataset.reset));
        const pw = prompt(`New password for ${u.username} (min 8 characters):`);
        if (pw) {
          try { await api('user_password', { id: u.id, password: pw }); $('#user-error').textContent = ''; alert('Password updated.'); } catch (err) { $('#user-error').textContent = err.message; }
        }
      }
    });

    document.addEventListener('keydown', (e) => {
      const item = e.target.closest?.('[data-vendor]');
      if (item && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); selectVendor(Number(item.dataset.vendor)); }
    });

    let timer;
    $('#search').addEventListener('input', (e) => {
      clearTimeout(timer);
      timer = setTimeout(() => { state.search = e.target.value; refreshFiltered(true); }, 150);
    });

    const userForm = $('#user-form');
    if (userForm) {
      userForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const body = Object.fromEntries(new FormData(userForm));
        try {
          await api('user_create', body);
          userForm.reset();
          $('#user-error').textContent = '';
          await loadUsers();
        } catch (err) { $('#user-error').textContent = err.message; }
      });
      $('#vendor-form input[name="mapsPaste"]').addEventListener('input', (e) => {
        const c = parseCoords(e.target.value);
        if (c) {
          const form = $('#vendor-form');
          form.elements.lat.value = c[0];
          form.elements.lng.value = c[1];
          if (!form.elements['c.mapsUrl'].value) form.elements['c.mapsUrl'].value = e.target.value.trim();
        }
      });
    }
  }

  async function start() {
    initMap();
    bindEvents();
    try {
      state.data = await api('network');
    } catch (err) {
      $('#side-panel').innerHTML = `<p class="error" style="padding:18px">${esc(err.message)}</p>`;
      return;
    }
    showTab(location.hash.slice(1) || 'overview');
    renderAll(true);
  }

  start();
})();

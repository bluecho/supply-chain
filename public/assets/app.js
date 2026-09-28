(() => {
  'use strict';

  const CSRF = document.querySelector('meta[name="csrf-token"]').content;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (n) => Number(n || 0).toLocaleString('en-IN');
  const sum = (arr, fn) => arr.reduce((s, x) => s + (fn(x) || 0), 0);
  const uniq = (arr) => [...new Set(arr)];

  // ---------- Icons ----------
  const svg = (body, fill = false) => `<svg viewBox="0 0 24 24" ${fill ? 'fill="currentColor"' : 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'}>${body}</svg>`;
  const ICON = {
    sourcing: svg('<path d="M12 22v-5"/><path d="M7 17h10l-2.6-4H16l-4-8-4 8h1.6z"/>'),
    chipping: svg('<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>'),
    processing: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
    collection: svg('<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>'),
    storage: svg('<path d="M3 21V9l9-5 9 5v12"/><path d="M7 21v-8h10v8M7 17h10"/>'),
    logistics: svg('<path d="M3 6h11v10H3zM14 9h4l3 3v4h-7z"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>'),
    customer: svg('<path d="M2 21V10l6 3.5V10l6 3.5V4h3v4h2V4h3v17H2zm4-4v2h3v-2H6zm5 0v2h3v-2h-3zm5 0v2h3v-2h-3z"/>', true),
    company: svg('<path d="M12 2 3 7v10l9 5 9-5V7z"/><path d="M12 22V12M3 7l9 5 9-5"/>'),
    route: svg('<circle cx="6" cy="19" r="2.5"/><circle cx="18" cy="5" r="2.5"/><path d="M8.5 19H16a3.5 3.5 0 0 0 0-7H8a3.5 3.5 0 0 1 0-7h7.5"/>'),
    scale: svg('<path d="M12 3v18M5 21h14M6 7h12M6 7l-3 7a3 3 0 0 0 6 0L6 7zm12 0-3 7a3 3 0 0 0 6 0l-3-7z"/>'),
    box: svg('<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>'),
    log: svg('<path d="M4 7c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3z"/><path d="M4 7v10c0 1.7 3.6 3 8 3s8-1.3 8-3V7"/><path d="M12 10v10"/>'),
    check: svg('<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>'),
    search: svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>'),
    leaf: svg('<path d="M11 20A7 7 0 0 1 4 13c0-6 7-10 16-10 0 9-4 16-10 16z"/><path d="M4 21c4-4 7-7 11-10"/>'),
    people: svg('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14a5 5 0 0 1 5.5 5"/>'),
    recycle: svg('<path d="M7 19H4.8a1.8 1.8 0 0 1-1.6-2.7L5 13M11 19h8.2a1.8 1.8 0 0 0 1.6-2.7l-1.4-2.4M14 16l-3 3 3 3M8.3 6.7 9.6 4.4a1.8 1.8 0 0 1 3 0l4.2 7.3M13.5 11.7l3.3.2.9-3.3M5 13l-1-4 4 1"/>'),
    lock: svg('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'),
    arrow: svg('<path d="M5 12h14M13 6l6 6-6 6"/>'),
    pin: svg('<path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>'),
    map: svg('<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14"/>'),
  };
  const CAP_INFO = {
    procurement: 'Buying plantation and agro-forestry wood from growers',
    debarking: 'Removing bark to produce clean, debarked wood',
    chipping: 'Converting logs into uniform wood chips',
    screening: 'Removing oversize chips, fines and dust',
    sizing: 'Grading chips to the customer\'s size specification',
    segregation: 'Keeping species and product forms separate',
    quality: 'Checking moisture, bark content and chip size',
    storage: 'Stocking material to keep supply steady',
    weighment: 'Weighing every load before dispatch',
    loading: 'Loading trucks for dispatch to the mill',
  };

  // ---------- State ----------
  const state = {
    data: null,
    net: { type: null, material: null, form: null, search: '', selected: null },
    log: { product: '', customer: '' },
    users: [],
  };
  const maps = {};

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

  // ---------- Lookups & graph ----------
  const D = () => state.data;
  const isAdmin = () => D().user.role === 'admin';
  const assetById = (id) => D().assets.find((a) => a.id === id);
  const customerById = (id) => D().customers.find((c) => c.id === id);
  const productById = (id) => D().products.find((p) => p.id === id);
  const materialById = (id) => D().materials.find((m) => m.id === id);
  const typeInfo = (t) => D().assetTypes[t] || { label: t, plural: t, color: '#64748b' };
  const assetMaterials = (a) => uniq(a.products.map((p) => productById(p)?.material).filter(Boolean));
  const assetForms = (a) => uniq(a.products.map((p) => productById(p)?.form).filter(Boolean));
  const linkKey = (l) => `${l.from}>${l.toAsset ? 'a' + l.toAsset : 'c' + l.toCustomer}`;
  const outLinks = (id) => D().links.filter((l) => l.from === id);
  const inLinks = (id) => D().links.filter((l) => l.toAsset === id);
  const place = (a) => [a.district, a.state].filter(Boolean).join(', ');

  /** All complete routes: chains of asset ids that start at an asset with no inbound link and end at a customer. */
  function allPaths() {
    const paths = [];
    const walk = (id, trail) => {
      if (trail.includes(id)) return; // guard against cycles
      const next = [...trail, id];
      outLinks(id).forEach((l) => {
        if (l.toCustomer) paths.push({ assets: next, customer: l.toCustomer });
        else if (l.toAsset) walk(l.toAsset, next);
      });
    };
    D().assets.filter((a) => a.status !== 'Inactive' && inLinks(a.id).length === 0).forEach((a) => walk(a.id, []));
    return paths;
  }

  function pathLinks(p) {
    const keys = [];
    for (let i = 0; i < p.assets.length - 1; i++) keys.push(`${p.assets[i]}>a${p.assets[i + 1]}`);
    keys.push(`${p.assets[p.assets.length - 1]}>c${p.customer}`);
    return keys;
  }

  function distanceKm(a, b) {
    const R = 6371, rad = Math.PI / 180;
    const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  const linkOf = (key) => D().links.find((l) => linkKey(l) === key);

  /** Distance of a complete route: road km where every leg has been routed, else straight-line. */
  function pathInfo(p) {
    const pts = [...p.assets.map(assetById), customerById(p.customer)];
    const legs = pathLinks(p).map(linkOf);
    const road = legs.every((l) => l && l.roadKm != null);
    let km = 0, minutes = 0;
    legs.forEach((l, i) => {
      if (road) { km += l.roadKm; minutes += l.roadMinutes || 0; } else km += distanceKm(pts[i], pts[i + 1]);
    });
    return { km, minutes, road };
  }
  const pathDistance = (p) => pathInfo(p).km;
  const hours = (min) => (min >= 90 ? `${fmt(Math.round(min / 60))} h` : `${fmt(min)} min`);
  function distLabel(p) {
    const i = pathInfo(p);
    return i.road ? `~${fmt(Math.round(i.km))} km by road · ~${hours(i.minutes)} drive` : `~${fmt(Math.round(i.km))} km straight-line`;
  }

  // ---------- Small render helpers ----------
  const typeBadge = (t) => `<span class="type-badge" style="--c:${esc(typeInfo(t).color)}">${ICON[t] || ''}${esc(typeInfo(t).label)}</span>`;
  const statusPill = (s) => `<span class="status ${esc(s)}">${esc(s)}</span>`;
  const formLabel = (f) => D().productForms[f] || f;

  function materialTags(ids) {
    return `<div class="tags">${ids.map((id) => {
      const m = materialById(id);
      return m ? `<span class="tag" style="--c:${esc(m.color)}"><i></i>${esc(m.name)}</span>` : '';
    }).join('')}</div>`;
  }

  function assetChip(a) {
    return `<a class="node-chip" href="#asset/${a.id}" style="--c:${esc(typeInfo(a.type).color)}"><span class="ni">${ICON[a.type] || ''}</span>${esc(a.name)}</a>`;
  }
  function customerChip(c) {
    return `<a class="node-chip customer" href="#customers" data-customer-link="${esc(c.id)}"><span class="ni">${ICON.customer}</span>${esc(c.name)}</a>`;
  }

  function chain(p) {
    return `<div class="chain">${p.assets.map((id) => assetChip(assetById(id))).join('<span class="chain-arrow">' + ICON.arrow + '</span>')}<span class="chain-arrow">${ICON.arrow}</span>${customerChip(customerById(p.customer))}</div>`;
  }

  function lockedBlock(label) {
    const fake = ['Site In-charge Name', '+91 98XXX XXXXX', 'site@company.in', 'Village, District, State 000000'];
    const sales = D().app.salesContact || D().content.contact_email;
    return `<div class="contact locked">
      ${['In-charge', 'Phone', 'Email', 'Address'].map((l, i) => `<div class="row"><span>${l}</span><span aria-hidden="true">${fake[i]}</span></div>`).join('')}
      <div class="lock-overlay"><div>${ICON.lock}${esc(label)}
        <small>${sales ? `Contact us at ${esc(sales)} for a site visit` : 'Contact us to arrange a site visit'}</small></div></div>
    </div>`;
  }

  function privateBlock(a) {
    if (!a.private) return lockedBlock('Site contacts and exact locations are internal');
    const p = a.private;
    const link = /^https?:\/\//i.test(p.mapsUrl) ? `<a href="${esc(p.mapsUrl)}" target="_blank" rel="noopener">Open in Google Maps</a>` : '–';
    return `<div class="contact">
      <div class="row"><span>In-charge</span><span>${esc(p.siteIncharge) || '–'}</span></div>
      <div class="row"><span>Phone</span><span>${p.phone ? `<a href="tel:${esc(p.phone.replace(/\s/g, ''))}">${esc(p.phone)}</a>` : '–'}</span></div>
      <div class="row"><span>Email</span><span>${p.email ? `<a href="mailto:${esc(p.email)}">${esc(p.email)}</a>` : '–'}</span></div>
      <div class="row"><span>Address</span><span>${esc(p.address) || '–'}</span></div>
      <div class="row"><span>Location</span><span>${link}</span></div>
      ${p.notes ? `<div class="row"><span>Notes</span><span>${esc(p.notes)}</span></div>` : ''}
      <div class="internal-note">${ICON.lock} Visible to admins only</div>
    </div>`;
  }

  // ---------- Maps ----------
  const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services';
  const ESRI_ATTR = 'Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors';
  function baseLayers() {
    const layers = {};
    const custom = D().app.mapTiles;
    if (custom && custom.url) {
      layers[custom.name || 'Custom'] = L.tileLayer(custom.url, { attribution: custom.attribution || '', maxZoom: custom.maxZoom || 19 });
    }
    layers.Light = L.layerGroup([
      L.tileLayer(`${ESRI}/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}`, { attribution: ESRI_ATTR, maxZoom: 16 }),
      L.tileLayer(`${ESRI}/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}`, { maxZoom: 16 }),
    ]);
    layers.Streets = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors', maxZoom: 19,
    });
    layers.Satellite = L.tileLayer(`${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`, {
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics', maxZoom: 18,
    });
    return layers;
  }

  // Creates a Leaflet map. If the active base map fails to load (blocked,
  // rate-limited or down), it switches to the next one automatically.
  function createMap(elId) {
    const map = L.map(elId, { scrollWheelZoom: true }).setView([22.5, 79], 5);
    const layers = baseLayers();
    const names = Object.keys(layers);
    L.control.layers(layers, null, { position: 'topright' }).addTo(map);
    let current = 0;
    const use = (i) => { names.forEach((n) => map.removeLayer(layers[n])); current = i; layers[names[i]].addTo(map); };
    names.forEach((name, i) => {
      const tiles = layers[name] instanceof L.TileLayer ? [layers[name]] : layers[name].getLayers();
      let errors = 0, loaded = false;
      tiles.forEach((t) => {
        t.on('tileload', () => { loaded = true; });
        t.on('tileerror', () => { errors += 1; if (!loaded && errors >= 4 && current === i && i + 1 < names.length) use(i + 1); });
      });
    });
    use(0);
    return {
      map,
      routes: L.layerGroup().addTo(map),
      nodes: L.layerGroup().addTo(map),
      trucks: L.layerGroup().addTo(map),
      anim: null,
      fitted: false,
    };
  }

  function getMap(id) {
    if (!maps[id]) maps[id] = createMap(id);
    return maps[id];
  }

  function curve(a, b) {
    const pts = [];
    const mx = (a.lat + b.lat) / 2, my = (a.lng + b.lng) / 2;
    const dx = b.lat - a.lat, dy = b.lng - a.lng;
    const cx = mx - dy * 0.18, cy = my + dx * 0.18;
    for (let i = 0; i <= 40; i++) {
      const t = i / 40, u = 1 - t;
      pts.push([u * u * a.lat + 2 * u * t * cx + t * t * b.lat, u * u * a.lng + 2 * u * t * cy + t * t * b.lng]);
    }
    return pts;
  }

  const assetIcon = (a, selected, dim) => L.divIcon({
    className: '',
    html: `<div class="a-marker ${selected ? 'selected' : ''} ${dim ? 'dim' : ''}" style="--c:${esc(typeInfo(a.type).color)}">${ICON[a.type] || ''}</div>`,
    iconSize: [34, 34], iconAnchor: [17, 17],
  });
  const customerIcon = (dim) => L.divIcon({
    className: '', html: `<div class="c-marker ${dim ? 'dim' : ''}">${ICON.customer}</div>`, iconSize: [36, 36], iconAnchor: [18, 18],
  });

  /**
   * Draws assets, customers and supply links on a map.
   * opts: assets (visible assets), highlight (Set of link keys or null), selected, onAsset, trucks (bool), fit
   */
  function drawNetwork(m, opts) {
    const { assets, highlight = null, selected = null, onAsset, trucks = false, fit = false } = opts;
    m.routes.clearLayers(); m.nodes.clearLayers(); m.trucks.clearLayers();
    if (m.anim) { cancelAnimationFrame(m.anim); m.anim = null; }
    const visible = new Set(assets.map((a) => a.id));
    const involved = new Set();
    const truckPaths = [];

    D().links.forEach((l) => {
      if (!visible.has(l.from)) return;
      const from = assetById(l.from);
      const to = l.toAsset ? assetById(l.toAsset) : customerById(l.toCustomer);
      if (!from || !to || (l.toAsset && !visible.has(l.toAsset))) return;
      const key = linkKey(l);
      const on = !highlight || highlight.has(key);
      const pts = l.road && l.road.length > 1 ? l.road : curve(from, to);
      if (on) { involved.add(`a${l.from}`); involved.add(l.toAsset ? `a${l.toAsset}` : `c${l.toCustomer}`); }
      const line = L.polyline(pts, {
        color: highlight && on ? '#14532d' : '#2a7d52',
        weight: highlight && on ? 4 : 2.5,
        opacity: on ? 0.85 : 0.15,
        className: on ? (l.road ? 'route road' : 'route') : '',
      }).addTo(m.routes);
      line.bindTooltip(`<b>${esc(from.name)} → ${esc(to.name)}</b><br>${l.roadKm != null ? `~${fmt(Math.round(l.roadKm))} km by road · ~${hours(l.roadMinutes || 0)} drive` : 'Road route not calculated yet'}`,
        { className: 'tip', sticky: true });
      if (trucks && on && highlight) truckPaths.push(pts);
    });

    D().customers.forEach((c) => {
      const dim = highlight ? !involved.has(`c${c.id}`) : false;
      L.marker([c.lat, c.lng], { icon: customerIcon(dim), zIndexOffset: 500 })
        .bindTooltip(`<b>${esc(c.name)}</b><br>Customer · ${esc(c.place)}`, { className: 'tip', direction: 'top', offset: [0, -16] })
        .on('click', () => { location.hash = 'customers'; setTimeout(() => $(`#cust-${CSS.escape(c.id)}`)?.scrollIntoView({ behavior: 'smooth' }), 80); })
        .addTo(m.nodes);
    });

    assets.forEach((a) => {
      const dim = highlight ? !involved.has(`a${a.id}`) : false;
      L.marker([a.lat, a.lng], { icon: assetIcon(a, selected === a.id, dim), riseOnHover: true, zIndexOffset: selected === a.id ? 1000 : 0 })
        .bindTooltip(`<b>${esc(a.name)}</b><br>${esc(typeInfo(a.type).label)} · ${esc(place(a))}`, { className: 'tip', direction: 'top', offset: [0, -16] })
        .on('click', () => onAsset && onAsset(a.id))
        .addTo(m.nodes);
    });

    if (truckPaths.length) animateTrucks(m, truckPaths);

    if (fit) {
      const pts = [...assets.map((a) => [a.lat, a.lng])];
      D().customers.forEach((c) => { if (!highlight || involved.has(`c${c.id}`)) pts.push([c.lat, c.lng]); });
      if (highlight && involved.size) {
        pts.length = 0;
        involved.forEach((k) => {
          const n = k[0] === 'a' ? assetById(Number(k.slice(1))) : customerById(k.slice(1));
          if (n) pts.push([n.lat, n.lng]);
        });
      }
      if (pts.length) m.map.fitBounds(pts, { padding: [40, 40], maxZoom: 8 });
    }
  }

  function animateTrucks(m, paths) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const markers = paths.map((pts) => L.marker(pts[0], {
      icon: L.divIcon({ className: '', html: `<div class="truck">${ICON.logistics}</div>`, iconSize: [26, 26], iconAnchor: [13, 13] }),
      interactive: false, zIndexOffset: 2000,
    }).addTo(m.trucks));
    const start = performance.now();
    const step = (now) => {
      paths.forEach((pts, i) => {
        const t = ((Math.max(0, now - start) / 6000) + i * 0.17) % 1;
        const f = t * (pts.length - 1), k = Math.floor(f), r = f - k;
        const a = pts[k], b = pts[Math.min(k + 1, pts.length - 1)];
        markers[i].setLatLng([a[0] + (b[0] - a[0]) * r, a[1] + (b[1] - a[1]) * r]);
      });
      m.anim = requestAnimationFrame(step);
    };
    m.anim = requestAnimationFrame(step);
  }

  function renderLegends() {
    const types = uniq(D().assets.map((a) => a.type));
    const html = Object.entries(D().assetTypes).filter(([t]) => types.includes(t)).map(([t, info]) =>
      `<div><span class="lg-ico" style="--c:${esc(info.color)}">${ICON[t]}</span>${esc(info.label)}</div>`).join('') +
      `<div><span class="lg-ico sq">${ICON.customer}</span>Customer</div><div><span class="sw ln"></span>Supply route</div>`;
    $$('[data-legend]').forEach((el) => { el.innerHTML = html; });
  }

  // ---------- Dashboard ----------
  function renderDashboard() {
    const c = D().content;
    $('#hero-company').textContent = c.company_name;
    $('#hero-title').textContent = c.hero_title;
    $('#hero-subtitle').textContent = c.hero_subtitle;
    $('#hero-statement').innerHTML = c.company_statement ? `${ICON.company}<span>${esc(c.company_statement)}</span>` : '';
    $('#hero-eudr').innerHTML = c.eudr_intro ? `<a class="eudr-pill" href="#sustainability">${ICON.leaf}EUDR-compliant sourcing</a>` : '';

    const active = D().assets.filter((a) => a.status !== 'Inactive');
    const count = (t) => active.filter((a) => a.type === t).length;
    const groups = [
      ['Raw material locations', ['sourcing']],
      ['Chipping centers / plants', ['chipping', 'processing']],
      ['Collection & other assets', ['collection', 'storage', 'logistics']],
    ];
    $('#hero-org').innerHTML = `
      <div class="org-node org-top">${ICON.company}<b>${esc(c.company_name)}</b><span>Supply chain operator</span></div>
      <div class="org-branches">${groups.filter(([, types]) => sum(types, count) > 0).map(([label, types]) => `
        <div class="org-node"><b>${fmt(sum(types, count))}</b><span>${esc(label)}</span></div>`).join('')}</div>
      <div class="org-node org-mid">${ICON.check}<span>Quality &amp; processing</span></div>
      <div class="org-node org-mid">${ICON.logistics}<span>Dispatch &amp; logistics</span></div>
      <div class="org-branches">${D().customers.map((cu) => `<div class="org-node org-cust">${ICON.customer}<b>${esc(cu.name)}</b></div>`).join('')}</div>`;

    const log = supplyStats(D().supplyLog);
    const procCap = sum(active.filter((a) => ['chipping', 'processing'].includes(a.type)), (a) => a.capacityMt);
    const typesInUse = Object.entries(D().assetTypes).filter(([t]) => count(t) > 0);
    const items = [
      ['Network assets', fmt(active.length), typesInUse.map(([t, i]) => `${count(t)} ${i.plural.toLowerCase()}`).join(' · ')],
      ['Supply routes', fmt(allPaths().length), `to ${D().customers.map((cu) => cu.name).join(' and ')}`],
      log.trucks ? ['Delivered', `${fmt(Math.round(log.delivered))}<small>MT</small>`, `${fmt(log.trucks)} trucks · ${log.period}`]
        : ['Processing capacity', `${fmt(procCap)}<small>MT / month</small>`, 'chipping & processing'],
      ['Products', fmt(D().products.length), `${D().materials.length} wood species`],
    ];
    $('#kpis').innerHTML = items.map(([label, value, note]) => `
      <div class="stat-tile"><div class="kpi-label">${esc(label)}</div><div class="kpi-value">${value}</div><div class="stat-note">${esc(note)}</div></div>`).join('');
  }

  function renderFlow() {
    const steps = [
      ['sourcing', 'Source locations'], ['log', 'Wood procurement'], ['chipping', 'Debarking / chipping'],
      ['search', 'Quality control'], ['box', 'Aggregation / storage'], ['logistics', 'Logistics'], ['customer', 'Customer'],
    ];
    const html = `<div class="flow-steps">${steps.map(([ico, label], i) =>
      `${i ? `<span class="flow-arrow">${ICON.arrow}</span>` : ''}<div class="flow-step"><span class="flow-ico">${ICON[ico]}</span><b>${esc(label)}</b></div>`).join('')}</div>
      <div class="flow-customers">${D().customers.map((c) => `<span>${ICON.customer}${esc(c.name)}</span>`).join('')}</div>`;
    $$('[data-flow]').forEach((el) => { el.innerHTML = html; });
  }

  function drawDashMap() {
    const m = getMap('dash-map');
    drawNetwork(m, { assets: D().assets, onAsset: (id) => { location.hash = `asset/${id}`; }, fit: !m.fitted });
    m.fitted = true;
  }

  // ---------- Supply network page ----------
  function netVisibleAssets() {
    const f = state.net;
    const q = f.search.trim().toLowerCase();
    if (f.type === 'customer') return [];
    return D().assets.filter((a) => {
      if (f.type && a.type !== f.type) return false;
      const prods = a.products.map(productById).filter(Boolean);
      if (f.material && !prods.some((p) => p.material === f.material && (!f.form || p.form === f.form))) return false;
      if (f.form && !prods.some((p) => p.form === f.form)) return false;
      return !q || [a.code, a.name, a.region, a.district, a.state, typeInfo(a.type).label].join(' ').toLowerCase().includes(q);
    });
  }

  function renderNetFilters() {
    const f = state.net;
    const types = uniq(D().assets.map((a) => a.type));
    const opts = (all, list, value) => `<option value="">${esc(all)}</option>` +
      list.map(([v, l]) => `<option value="${esc(v)}" ${value === v ? 'selected' : ''}>${esc(l)}</option>`).join('');
    $('#f-type').innerHTML = opts('All asset types', [...Object.entries(D().assetTypes).filter(([t]) => types.includes(t)).map(([t, i]) => [t, i.plural]), ['customer', 'Customers']], f.type);
    $('#f-material').innerHTML = opts('All materials', D().materials.map((m) => [m.id, m.name]), f.material);
    $('#f-form').innerHTML = opts('All product types', Object.entries(D().productForms), f.form);
  }


  function drawNetMap(fit) {
    const m = getMap('net-map');
    const assets = netVisibleAssets();
    if (state.net.selected && !assets.some((a) => a.id === state.net.selected)) state.net.selected = null;
    drawNetwork(m, { assets, selected: state.net.selected, onAsset: selectNetAsset, fit: fit || !m.fitted });
    m.fitted = true;
  }

  function renderSidePanel() {
    const panel = $('#side-panel');
    const a = state.net.selected && assetById(state.net.selected);
    if (!a) {
      const assets = netVisibleAssets();
      const custMode = state.net.type === 'customer';
      panel.innerHTML = `
        <div class="panel-head"><h3>${custMode ? 'Customers' : 'Network assets'}</h3><span class="muted">${custMode ? D().customers.length : assets.length} shown</span></div>
        <ul class="a-list">${custMode
          ? D().customers.map((c) => `<li><a class="a-item" href="#customers" data-customer-link="${esc(c.id)}"><span class="lg-ico big sq">${ICON.customer}</span>
              <span><span class="t">${esc(c.name)}</span><br><span class="s">${esc(c.place)}</span></span><span></span></a></li>`).join('')
          : assets.map((x) => `<li><button class="a-item" data-select="${x.id}" type="button">
              <span class="lg-ico big" style="--c:${esc(typeInfo(x.type).color)}">${ICON[x.type]}</span>
              <span><span class="t">${esc(x.name)}</span><br><span class="s">${esc(typeInfo(x.type).label)} · ${esc(place(x))}</span></span>
              <span class="cap">${x.capacityMt ? `${fmt(x.capacityMt)}<small>MT / month</small>` : ''}</span></button></li>`).join('')
            || '<li class="muted" style="padding:12px">No assets match these filters.</li>'}</ul>`;
      return;
    }
    const paths = allPaths().filter((p) => p.assets.includes(a.id));
    panel.innerHTML = `
      <div class="panel-head"><button class="back" data-back type="button">← All assets</button><span style="margin-left:auto">${statusPill(a.status)}</span></div>
      <div class="panel-body">
        <div>${typeBadge(a.type)}<h3 class="asset-title">${esc(a.name)}</h3><div class="muted">${esc(a.region)} · ${esc(place(a))}</div></div>
        ${a.description ? `<p class="desc">${esc(a.description)}</p>` : ''}
        <div class="stats">
          <div class="stat"><div class="l">Capacity</div><div class="v">${a.capacityMt ? `${fmt(a.capacityMt)} MT/mo` : '–'}</div></div>
          <div class="stat"><div class="l">Dispatch</div><div class="v">${a.trucksPerMonth ? `${fmt(a.trucksPerMonth)} trucks/mo` : '–'}</div></div>
        </div>
        <div><div class="section-title">Capabilities</div><div class="cap-chips">${a.capabilities.map((c) => `<span>${esc(D().capabilities[c] || c)}</span>`).join('') || '<span class="muted">–</span>'}</div></div>
        <div><div class="section-title">Materials handled</div><ul class="plain">${a.products.map((p) => `<li>${esc(productById(p)?.name)}</li>`).join('') || '<li class="muted">–</li>'}</ul></div>
        ${paths.length ? `<div><div class="section-title">Supply routes</div>${paths.map(chain).join('')}</div>` : ''}
        <a class="btn btn-primary btn-block" href="#asset/${a.id}">Open asset profile</a>
      </div>`;
  }

  function selectNetAsset(id) {
    state.net.selected = id;
    renderSidePanel();
    drawNetMap(false);
    const a = assetById(id);
    if (a) maps['net-map'].map.flyTo([a.lat, a.lng], Math.max(maps['net-map'].map.getZoom(), 7), { duration: 0.8 });
  }

  function refreshNetwork(fit) {
    renderNetFilters();
    renderSidePanel();
    if (currentPage() === 'network') drawNetMap(fit);
  }

  // ---------- Assets page & profile ----------
  function renderAssetGroups() {
    $('#assets-sub').textContent = `${D().assets.length} assets across ${uniq(D().assets.map((a) => a.state)).length} states`;
    $('#asset-groups').innerHTML = Object.entries(D().assetTypes).map(([t, info]) => {
      const list = D().assets.filter((a) => a.type === t);
      if (!list.length) return '';
      return `<section class="group" id="group-${t}">
        <div class="group-head"><span class="lg-ico big" style="--c:${esc(info.color)}">${ICON[t]}</span><h3>${esc(info.plural)}</h3><span class="muted">${list.length}</span></div>
        <div class="asset-grid">${list.map((a) => `
          <a class="card asset-card" href="#asset/${a.id}" style="--c:${esc(info.color)}">
            <div class="asset-card-head"><span class="muted code">${esc(a.code)}</span>${statusPill(a.status)}</div>
            <h4>${esc(a.name)}</h4>
            <div class="muted">${esc(place(a))}</div>
            ${materialTags(assetMaterials(a))}
            <div class="asset-card-foot"><span>${a.capacityMt ? `<b>${fmt(a.capacityMt)}</b> MT/month` : ''}</span><span class="link-text">View profile →</span></div>
          </a>`).join('')}</div>
      </section>`;
    }).join('');
  }

  function renderAssetProfile(id) {
    const a = assetById(id);
    const el = $('#asset-profile');
    if (!a) { el.innerHTML = '<div class="card empty">This asset no longer exists. <a href="#assets">Back to assets</a></div>'; return; }
    const info = typeInfo(a.type);
    const upstream = inLinks(a.id).map((l) => assetById(l.from)).filter(Boolean);
    const downstream = outLinks(a.id).map((l) => (l.toAsset ? { asset: assetById(l.toAsset) } : { customer: customerById(l.toCustomer) })).filter((x) => x.asset || x.customer);
    const paths = allPaths().filter((p) => p.assets.includes(a.id));
    const byMaterial = D().materials.map((m) => ({ m, prods: a.products.map(productById).filter((p) => p && p.material === m.id) })).filter((x) => x.prods.length);

    el.innerHTML = `
      <a class="back" href="#assets">← All assets</a>
      <section class="card profile-head" style="--c:${esc(info.color)}">
        <span class="profile-ico">${ICON[a.type]}</span>
        <div>
          <div class="muted code">${esc(a.code)} · Asset profile</div>
          <h2>${esc(a.name)}</h2>
          <div class="profile-meta">${typeBadge(a.type)}<span>${esc(a.region)} · ${esc(place(a))}</span>${statusPill(a.status)}</div>
          ${a.description ? `<p class="desc">${esc(a.description)}</p>` : ''}
        </div>
      </section>
      <div class="kpis kpis-4">
        <div class="kpi"><div class="kpi-label">Asset type</div><div class="kpi-value kv-sm">${esc(info.label)}</div></div>
        <div class="kpi"><div class="kpi-label">Capacity</div><div class="kpi-value">${a.capacityMt ? fmt(a.capacityMt) + '<small>MT / month</small>' : '–'}</div></div>
        <div class="kpi"><div class="kpi-label">Dispatch</div><div class="kpi-value">${a.trucksPerMonth ? fmt(a.trucksPerMonth) + '<small>trucks / month</small>' : '–'}</div></div>
        <div class="kpi"><div class="kpi-label">Operating since</div><div class="kpi-value">${esc(a.sinceYear ?? '–')}</div></div>
      </div>
      <div class="profile-grid">
        <div class="card">
          <div class="card-head"><h3>Materials</h3></div>
          <div class="table-wrap"><table class="table">
            <thead><tr><th>Material</th><th>Products handled</th><th>Form</th></tr></thead>
            <tbody>${byMaterial.map(({ m, prods }) => `<tr><td>${materialTags([m.id])}</td><td>${prods.map((p) => esc(p.name)).join('<br>')}</td><td>${prods.map((p) => esc(formLabel(p.form))).join('<br>')}</td></tr>`).join('') ||
              '<tr><td colspan="3" class="muted">No materials recorded yet.</td></tr>'}</tbody>
          </table></div>
        </div>
        <div class="card">
          <div class="card-head"><h3>Capabilities</h3></div>
          <ul class="cap-list">${a.capabilities.map((k) => `<li class="on">${ICON.check}${esc(D().capabilities[k] || k)}</li>`).join('') || '<li class="muted">None recorded yet.</li>'}</ul>
        </div>
      </div>
      <div class="card">
        <div class="card-head"><h3>Supply connectivity</h3><span class="muted">Where material comes from and where it goes</span></div>
        <div class="connect">
          <div class="connect-col"><div class="section-title">Receives from</div>${upstream.map(assetChip).join('') || '<span class="muted">Origin point: sourced directly</span>'}</div>
          <span class="connect-arrow">${ICON.arrow}</span>
          <div class="connect-col center"><div class="section-title">This asset</div>${assetChip(a)}</div>
          <span class="connect-arrow">${ICON.arrow}</span>
          <div class="connect-col"><div class="section-title">Sends to</div>${downstream.map((x) => (x.asset ? assetChip(x.asset) : customerChip(x.customer))).join('') || '<span class="muted">No outgoing route yet</span>'}</div>
        </div>
        ${paths.length ? `<div class="paths"><div class="section-title">Complete routes to customers</div>${paths.map((p) => `<div class="path-row">${chain(p)}<span class="muted">${distLabel(p)}</span></div>`).join('')}</div>` : ''}
      </div>
      <div class="profile-grid">
        <div class="card map-card"><div id="asset-map" class="map map-sm"></div></div>
        <div class="card"><div class="card-head"><h3>Site details</h3></div><div style="padding:14px 18px 18px">${privateBlock(a)}</div></div>
      </div>`;

    // Mini map: this asset plus everything connected to it.
    if (maps['asset-map']) { maps['asset-map'].map.remove(); delete maps['asset-map']; }
    const m = getMap('asset-map');
    const related = new Set([a.id, ...upstream.map((x) => x.id), ...paths.flatMap((p) => p.assets)]);
    const highlight = new Set(paths.flatMap(pathLinks));
    inLinks(a.id).forEach((l) => highlight.add(linkKey(l)));
    outLinks(a.id).forEach((l) => highlight.add(linkKey(l)));
    drawNetwork(m, { assets: D().assets.filter((x) => related.has(x.id)), highlight, selected: a.id, onAsset: (id) => { location.hash = `asset/${id}`; }, fit: true });
  }

  // ---------- Materials ----------
  function renderMaterials() {
    $('#material-grid').innerHTML = D().materials.map((m) => {
      const prods = D().products.filter((p) => p.material === m.id);
      const assets = D().assets.filter((a) => assetMaterials(a).includes(m.id));
      const customers = D().customers.filter((c) => c.products.some((pid) => productById(pid)?.material === m.id));
      return `<div class="card m-card" style="--c:${esc(m.color)}">
        <h3>${esc(m.name)}</h3>
        <ul class="prod-list">${prods.map((p) => `<li><span>${esc(p.name)}</span><span class="form-badge ${esc(p.form)}">${esc(formLabel(p.form))}</span></li>`).join('')}</ul>
        <div><div class="section-title">Handled at</div><div class="chip-wrap">${assets.map(assetChip).join('') || '<span class="muted">–</span>'}</div></div>
        <div><div class="section-title">Supplied to</div><div class="chip-wrap">${customers.map(customerChip).join('') || '<span class="muted">–</span>'}</div></div>
        <button class="btn" data-material-map="${esc(m.id)}" type="button">Show ${esc(m.name)} on the map</button>
      </div>`;
    }).join('');
  }

  // ---------- Processing ----------
  function renderProcessing() {
    const procAssets = D().assets.filter((a) => ['chipping', 'processing'].includes(a.type) || a.capabilities.some((c) => ['debarking', 'chipping', 'screening'].includes(c)));
    $('#cap-grid').innerHTML = Object.entries(D().capabilities).map(([k, label]) => {
      const n = D().assets.filter((a) => a.capabilities.includes(k)).length;
      return n ? `<div class="card cap-card"><b>${esc(label)}</b><p>${esc(CAP_INFO[k] || '')}</p><span class="muted">${n} asset${n > 1 ? 's' : ''}</span></div>` : '';
    }).join('');
    $('#proc-sub').textContent = `${procAssets.length} assets · ${fmt(sum(procAssets, (a) => a.capacityMt))} MT / month combined capacity`;
    $('#proc-table').innerHTML = `
      <thead><tr><th>Asset</th><th>Type</th><th>Location</th><th>Capabilities</th><th>Materials</th><th>Capacity</th><th>Status</th></tr></thead>
      <tbody>${procAssets.map((a) => `<tr>
        <td><a class="link" href="#asset/${a.id}">${esc(a.name)}</a></td>
        <td>${typeBadge(a.type)}</td>
        <td>${esc(place(a))}</td>
        <td class="small">${a.capabilities.map((c) => esc(D().capabilities[c])).join(', ')}</td>
        <td>${materialTags(assetMaterials(a))}</td>
        <td>${a.capacityMt ? `${fmt(a.capacityMt)} MT/mo` : '–'}</td>
        <td>${statusPill(a.status)}</td></tr>`).join('')}</tbody>`;
  }

  // ---------- Logistics ----------
  function renderLogisticsControls() {
    const prodSel = $('#l-product'), custSel = $('#l-customer');
    prodSel.innerHTML = '<option value="">All products</option>' + D().materials.map((m) =>
      `<optgroup label="${esc(m.name)}">${D().products.filter((p) => p.material === m.id).map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}</optgroup>`).join('');
    custSel.innerHTML = '<option value="">All customers</option>' + D().customers.map((c) => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');
    prodSel.value = state.log.product;
    custSel.value = state.log.customer;
  }

  function logisticsPaths() {
    const pid = Number(state.log.product) || null;
    return allPaths().filter((p) =>
      (!state.log.customer || p.customer === state.log.customer) &&
      (!pid || p.assets.every((id) => assetById(id).products.includes(pid))));
  }

  function renderLogistics() {
    const paths = logisticsPaths();
    const pid = Number(state.log.product) || null;
    const product = pid && productById(pid);
    const customer = state.log.customer && customerById(state.log.customer);
    const notTaken = product && customer && !customer.products.includes(pid);

    $('#route-panel').innerHTML = `
      <div class="panel-head"><h3>${paths.length} supply route${paths.length === 1 ? '' : 's'}</h3>
        <span class="muted">${product ? esc(product.name) : 'All products'} → ${customer ? esc(customer.name) : 'all customers'}</span></div>
      <div class="panel-body">
        ${notTaken ? `<div class="banner small">${esc(customer.name)} is not currently supplied ${esc(product.name)}. Routes show where it could come from.</div>` : ''}
        ${paths.map((p, i) => `<div class="route-card"><div class="route-num">Route ${i + 1}<span class="muted">${distLabel(p)}</span></div>${chain(p)}
          ${isAdmin() ? `<a class="small link" href="${esc(directionsUrl(p))}" target="_blank" rel="noopener">Open truck route in Google Maps →</a>` : ''}</div>`).join('') ||
          '<p class="muted">No route in the network carries this combination yet.</p>'}
      </div>`;

    const infos = paths.map(pathInfo);
    const allRoad = infos.length && infos.every((i) => i.road);
    const log = supplyStats(D().supplyLog.filter((r) => (!customer || r.customer === customer.id) && (!pid || !r.product || r.product === pid)));
    const items = [
      ['Routes shown', fmt(paths.length), '', ICON.route],
      [allRoad ? 'Average road distance' : 'Average distance', infos.length ? fmt(Math.round(sum(infos, (i) => i.km) / infos.length)) : '–', infos.length ? 'km' : '', ICON.map],
      ['Average drive time', allRoad ? hours(Math.round(sum(infos, (i) => i.minutes) / infos.length)) : '–', '', ICON.logistics],
    ];
    if (log.trucks) {
      items.push(['Trucks delivered', fmt(log.trucks), log.period ? `· ${log.period}` : '', ICON.logistics]);
      if (log.transitAvg != null) items.push(['Recorded dispatch → mill', log.transitAvg.toFixed(1), 'days', ICON.check]);
    }
    $('#log-kpis').innerHTML = items.slice(0, 4).map(([label, value, unit]) => `
      <div class="stat-tile"><div class="kpi-label">${esc(label)}</div><div class="kpi-value">${value}${unit ? `<small>${esc(unit)}</small>` : ''}</div></div>`).join('');

    if (currentPage() === 'logistics') {
      const m = getMap('log-map');
      const involvedAssets = new Set(paths.flatMap((p) => p.assets));
      drawNetwork(m, {
        assets: D().assets.filter((a) => involvedAssets.has(a.id) || !paths.length),
        highlight: new Set(paths.flatMap(pathLinks)),
        trucks: true, fit: true,
        onAsset: (id) => { location.hash = `asset/${id}`; },
      });
    }
  }

  /** Google Maps driving directions through every stop of a route (admins only: exact coordinates). */
  function directionsUrl(p) {
    const stops = [...p.assets.map(assetById), customerById(p.customer)].map((n) => `${n.lat},${n.lng}`);
    const q = new URLSearchParams({ api: '1', travelmode: 'driving', origin: stops[0], destination: stops[stops.length - 1] });
    if (stops.length > 2) q.set('waypoints', stops.slice(1, -1).join('|'));
    return `https://www.google.com/maps/dir/?${q}`;
  }

  // ---------- Supply record (imported dispatch log) ----------
  // Validated for colour-vision deficiency: forest green + amber first, then the reference categorical order.
  const SERIES_COLORS = ['#2a7d52', '#e39a1c', '#2a78d6', '#e87ba4', '#4a3aa7', '#e34948'];
  const monthName = (m, long) => new Date(m + '-01T00:00:00').toLocaleString('en-IN', { month: long ? 'long' : 'short', year: long ? 'numeric' : undefined });
  function seriesLabels() { return uniq(D().supplyLog.map((r) => r.label)).sort(); }
  const seriesColor = (label) => SERIES_COLORS[Math.max(0, seriesLabels().indexOf(label)) % SERIES_COLORS.length];

  function supplyStats(rows) {
    const months = uniq(rows.map((r) => r.month)).sort();
    const trucks = sum(rows, (r) => r.trucks);
    const delivered = sum(rows, (r) => r.deliveredMt);
    const trips = sum(rows, (r) => r.transitTrips);
    const lossBase = sum(rows, (r) => r.lossBaseMt);
    return {
      rows, months, trucks, delivered,
      avgLoad: trucks ? delivered / trucks : 0,
      monthlyAvg: months.length ? delivered / months.length : 0,
      transitAvg: trips ? sum(rows, (r) => r.transitDays) / trips : null,
      lossPct: lossBase ? (sum(rows, (r) => r.lossMt) / lossBase) * 100 : null,
      period: months.length ? `${monthName(months[0])} – ${monthName(months[months.length - 1])} ${months[months.length - 1].slice(0, 4)}` : '',
    };
  }

  /** Stacked monthly bars, one colour per material, with hover details and a table view. */
  function supplyChart(stats, title) {
    const { rows, months } = stats;
    if (!months.length) return '';
    const labels = uniq(rows.map((r) => r.label)).sort();
    const val = (m, l) => sum(rows.filter((r) => r.month === m && r.label === l), (r) => r.deliveredMt);
    const trucksIn = (m) => sum(rows.filter((r) => r.month === m), (r) => r.trucks);
    const W = 900, H = 260, pad = { l: 48, r: 8, t: 12, b: 26 };
    const totals = months.map((m) => sum(labels, (l) => val(m, l)));
    const max = Math.max(...totals, 1);
    const step = Math.pow(10, Math.floor(Math.log10(max)));
    const top = Math.ceil(max / step) * step;
    const bw = (W - pad.l - pad.r) / months.length;
    const barW = Math.max(6, Math.min(34, bw - 10));
    const y = (v) => pad.t + (H - pad.t - pad.b) * (1 - v / top);
    const grid = [0, 0.5, 1].map((f) => `<line x1="${pad.l}" x2="${W - pad.r}" y1="${y(top * f)}" y2="${y(top * f)}" class="grid"/><text x="${pad.l - 6}" y="${y(top * f) + 4}" text-anchor="end" class="axis">${fmt(top * f)}</text>`).join('');
    const bars = months.map((m, i) => {
      const x = pad.l + bw * i + (bw - barW) / 2;
      let base = 0;
      const present = labels.filter((l) => val(m, l) > 0);
      const segs = present.map((l, k) => {
        const v = val(m, l), y1 = y(base + v), y0 = y(base);
        base += v;
        const gap = k ? 2 : 0; // surface gap between stacked segments
        const h = Math.max(0, y0 - y1 - gap);
        const r = k === present.length - 1 ? Math.min(4, barW / 2, h) : 0;
        const d = `M${x},${y1 + h} V${y1 + r} Q${x},${y1} ${x + r},${y1} H${x + barW - r} Q${x + barW},${y1} ${x + barW},${y1 + r} V${y1 + h} Z`;
        return `<path d="${d}" style="fill:${seriesColor(l)}"/>`;
      }).join('');
      const tip = `${monthName(m, true)}: ${fmt(Math.round(totals[i]))} MT · ${fmt(trucksIn(m))} trucks` +
        (labels.length > 1 ? ` (${present.map((l) => `${l} ${fmt(Math.round(val(m, l)))} MT`).join(', ')})` : '');
      return `<g class="bar-g" data-tip="${esc(tip)}"><rect x="${pad.l + bw * i}" y="${pad.t}" width="${bw}" height="${H - pad.t - pad.b}" class="hit"/>${segs}
        <text x="${x + barW / 2}" y="${H - 8}" text-anchor="middle" class="axis">${monthName(m)}</text></g>`;
    }).join('');
    const legend = labels.length > 1 ? `<div class="chart-legend">${labels.map((l) => `<span><i style="background:${seriesColor(l)}"></i>${esc(l)}</span>`).join('')}</div>` : '';
    return `${legend}<div class="chart-wrap"><svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="${esc(title)}">${grid}${bars}</svg><div class="chart-tip" hidden></div></div>
      <details class="table-toggle"><summary>Show as table</summary><div class="table-wrap"><table class="table">
        <thead><tr><th>Month</th>${labels.map((l) => `<th>${esc(l)} (MT)</th>`).join('')}<th>Total (MT)</th><th>Trucks</th></tr></thead>
        <tbody>${months.map((m, i) => `<tr><td>${esc(monthName(m, true))}</td>${labels.map((l) => `<td>${fmt(Math.round(val(m, l)))}</td>`).join('')}<td><b>${fmt(Math.round(totals[i]))}</b></td><td>${fmt(trucksIn(m))}</td></tr>`).join('')}</tbody>
      </table></div></details>`;
  }

  function renderSupplyRecord() {
    const el = $('#supply-record');
    const rows = D().supplyLog;
    if (!rows.length) { el.hidden = true; return; }
    el.hidden = false;
    const byCustomer = uniq(rows.map((r) => r.customer)).map(customerById).filter(Boolean);
    const st = supplyStats(rows);
    el.innerHTML = `<div class="card-head"><h3>Supply record</h3><span class="muted">Deliveries to ${esc(byCustomer.map((c) => c.name).join(', '))} · ${esc(st.period)}</span>
        <a class="head-link" href="#customers">Customer details →</a></div>
      <div class="supply-body"><div class="mini-stats">
        <div><span>Average per month</span><b>${fmt(Math.round(st.monthlyAvg))} MT</b></div>
        <div><span>Average load</span><b>${st.avgLoad.toFixed(1)} MT / truck</b></div>
        ${st.transitAvg != null ? `<div><span>Dispatch to mill</span><b>${st.transitAvg.toFixed(1)} days</b></div>` : ''}
      </div><div>${supplyChart(st, 'Monthly tonnes delivered')}</div></div>`;
  }

  // ---------- Customers ----------
  function historyChart(c) {
    const h = c.history.slice(-12);
    if (!h.length) return `<p class="muted">No monthly supply history recorded yet.${isAdmin() ? ' Add it from Admin → Customers.' : ''}</p>`;
    const W = 560, H = 180, pad = { l: 44, r: 8, t: 12, b: 26 };
    const max = Math.max(...h.map((x) => x.quantityMt), 1);
    const nice = Math.pow(10, Math.floor(Math.log10(max)));
    const top = Math.ceil(max / nice) * nice;
    const bw = (W - pad.l - pad.r) / h.length;
    const barW = Math.max(4, Math.min(28, bw - 6));
    const y = (v) => pad.t + (H - pad.t - pad.b) * (1 - v / top);
    const month = (m) => new Date(m + '-01T00:00:00').toLocaleString('en-IN', { month: 'short' });
    const grid = [0, 0.5, 1].map((f) => `<line x1="${pad.l}" x2="${W - pad.r}" y1="${y(top * f)}" y2="${y(top * f)}" class="grid"/><text x="${pad.l - 6}" y="${y(top * f) + 4}" text-anchor="end" class="axis">${fmt(top * f)}</text>`).join('');
    const bars = h.map((x, i) => {
      const cx = pad.l + bw * i + bw / 2, yy = y(x.quantityMt), hh = H - pad.b - yy;
      const r = Math.min(4, barW / 2, hh);
      const path = hh > 0 ? `M${cx - barW / 2},${H - pad.b} V${yy + r} Q${cx - barW / 2},${yy} ${cx - barW / 2 + r},${yy} H${cx + barW / 2 - r} Q${cx + barW / 2},${yy} ${cx + barW / 2},${yy + r} V${H - pad.b} Z` : '';
      return `<g class="bar-g" data-tip="${esc(`${month(x.month)} ${x.month.slice(0, 4)}: ${fmt(x.quantityMt)} MT · ${fmt(x.dispatches)} dispatches`)}">
        <rect x="${pad.l + bw * i}" y="${pad.t}" width="${bw}" height="${H - pad.t - pad.b}" class="hit"/>
        <path d="${path}" class="bar"/><text x="${cx}" y="${H - 8}" text-anchor="middle" class="axis">${month(x.month)}</text></g>`;
    }).join('');
    return `<div class="chart-wrap"><svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="Monthly supply to ${esc(c.name)} in MT">${grid}${bars}</svg><div class="chart-tip" hidden></div></div>
      <details class="table-toggle"><summary>Show as table</summary><table class="table"><thead><tr><th>Month</th><th>Quantity (MT)</th><th>Dispatches</th></tr></thead>
      <tbody>${h.map((x) => `<tr><td>${esc(x.month)}</td><td>${fmt(x.quantityMt)}</td><td>${fmt(x.dispatches)}</td></tr>`).join('')}</tbody></table></details>`;
  }

  function renderCustomers() {
    const paths = allPaths();
    $('#customer-list').innerHTML = D().customers.map((c) => {
      const ps = paths.filter((p) => p.customer === c.id);
      const connected = uniq(ps.flatMap((p) => p.assets)).map(assetById);
      const prods = c.products.map(productById).filter(Boolean);
      const log = supplyStats(D().supplyLog.filter((r) => r.customer === c.id));
      const monthly = log.trucks ? log.monthlyAvg : c.monthlyVolumeMt;
      const dispatches = log.trucks ? log.trucks / log.months.length : c.dispatchesPerMonth;
      const since = c.supplyingSince ?? (log.months[0] ? monthName(log.months[0], true) : null);
      return `<section class="card customer-card" id="cust-${esc(c.id)}">
        <div class="customer-head">
          <span class="c-marker static">${ICON.customer}</span>
          <div><h3>${esc(c.name)}</h3><div class="muted">${esc(c.industry)}${c.industry ? ' · ' : ''}${esc(c.place)}</div></div>
          <button class="btn head-btn" data-trace="${esc(c.id)}" type="button">Trace supply routes</button>
        </div>
        <div class="stats-row compact">${(log.trucks ? [
            ['Delivered', `${fmt(Math.round(log.delivered))}<small>MT</small>`, `${fmt(log.trucks)} trucks · ${log.period}`],
            ['Average per month', `${fmt(Math.round(log.monthlyAvg))}<small>MT</small>`, `${fmt(Math.round(dispatches))} trucks a month`],
            ['Average load', `${log.avgLoad.toFixed(1)}<small>MT</small>`, 'per truck'],
            log.transitAvg != null ? ['Dispatch to mill', `${log.transitAvg.toFixed(1)}<small>days</small>`, 'average transit'] : ['Supply routes', fmt(ps.length), ''],
          ] : [
            ['Monthly supply', monthly ? `${fmt(Math.round(monthly))}<small>MT</small>` : '–', ''],
            ['Trucks / month', dispatches ? fmt(Math.round(dispatches)) : '–', ''],
            ['Supplying since', esc(since ?? '–'), ''],
            ['Supply routes', fmt(ps.length), ''],
          ]).filter(([, v]) => v !== '–').map(([l, v, n]) => `<div class="stat-tile"><div class="kpi-label">${esc(l)}</div><div class="kpi-value">${v}</div>${n ? `<div class="stat-note">${esc(n)}</div>` : ''}</div>`).join('')}</div>
        <div class="customer-body">
          <div>
            <div class="section-title">Materials supplied</div>
            <ul class="prod-list">${prods.map((p) => `<li><span>${esc(p.name)}</span><span class="form-badge ${esc(p.form)}">${esc(formLabel(p.form))}</span></li>`).join('') || '<li class="muted">–</li>'}</ul>
            <details class="more"><summary>Supply routes and connected assets (${ps.length})</summary>
              <div class="chip-wrap">${connected.map(assetChip).join('') || '<span class="muted">–</span>'}</div>
              ${ps.map((p) => `<div class="path-row">${chain(p)}<span class="muted">${distLabel(p)}</span></div>`).join('')}
            </details>
          </div>
          <div>${!log.trucks && !c.history.length && !isAdmin() ? '' : log.trucks
            ? `<div class="section-title">Monthly deliveries</div>${supplyChart(log, `Monthly tonnes delivered to ${c.name}`)}
               ${isAdmin() && log.lossPct != null ? `<p class="muted small">Transit weight loss ${log.lossPct.toFixed(1)}% (admins only)</p>` : ''}`
            : `<div class="section-title">Supply history (MT per month)</div>${historyChart(c)}`}</div>
        </div>
      </section>`;
    }).join('');
  }

  // ---------- Sustainability & About ----------
  const parsePoints = (text) => (text || '').split('\n').map((l) => l.trim()).filter(Boolean).map((line) => {
    const [title, ...rest] = line.split('|');
    return { title: title.trim(), body: rest.join('|').trim() };
  });

  function renderSustainability() {
    const c = D().content;
    const eudr = parsePoints(c.eudr_points);
    const eudrIcons = [ICON.leaf, ICON.check, ICON.pin, ICON.search];
    $('#eudr').hidden = !c.eudr_intro && !eudr.length;
    $('#eudr').innerHTML = `
      <div class="eudr-head"><span class="eudr-badge">${ICON.leaf}<span>EUDR<small>compliant sourcing</small></span></span>
        <div><h2>EU Deforestation Regulation (EUDR)</h2><p>${esc(c.eudr_intro)}</p></div></div>
      <div class="eudr-grid">${eudr.map((it, i) => `<div class="eudr-item"><span class="sus-ico">${eudrIcons[i % eudrIcons.length]}</span><div><b>${esc(it.title)}</b><p>${esc(it.body)}</p></div></div>`).join('')}</div>`;
    const icons = [ICON.leaf, ICON.people, ICON.recycle, ICON.logistics, ICON.sourcing, ICON.check];
    const items = parsePoints(c.sustainability);
    $('#sus-grid').innerHTML = items.map((it, i) => `<div class="card sus-card"><span class="sus-ico">${icons[i % icons.length]}</span><h3>${esc(it.title)}</h3><p>${esc(it.body)}</p></div>`).join('') ||
      '<div class="card empty">No sustainability content yet.</div>';
  }

  function renderAbout() {
    const c = D().content;
    $('#about-body').innerHTML = `<h2>About ${esc(c.company_name)}</h2>` +
      (c.about || '').split(/\n\s*\n/).map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
    const rows = [['Email', c.contact_email, c.contact_email && `mailto:${c.contact_email}`], ['Phone', c.contact_phone, c.contact_phone && `tel:${c.contact_phone.replace(/\s/g, '')}`], ['Address', c.contact_address]];
    $('#about-contact').innerHTML = `<div class="card-head"><h3>Contact us</h3></div><div class="contact plain-contact">
      ${rows.filter((r) => r[1]).map(([l, v, href]) => `<div class="row"><span>${l}</span><span>${href ? `<a href="${esc(href)}">${esc(v)}</a>` : esc(v)}</span></div>`).join('') || '<p class="muted">Contact details coming soon.</p>'}
    </div>`;
  }

  // ---------- Admin ----------
  function renderAdmin() {
    if (!isAdmin()) return;
    $('#admin-assets').innerHTML = `
      <thead><tr><th>Code</th><th>Asset</th><th>Type</th><th>Location</th><th>Capacity</th><th>Sends to</th><th>Status</th><th></th></tr></thead>
      <tbody>${D().assets.map((a) => `<tr>
        <td>${esc(a.code)}</td>
        <td><b>${esc(a.name)}</b><br><span class="muted small">${a.lat.toFixed(5)}, ${a.lng.toFixed(5)}</span></td>
        <td>${typeBadge(a.type)}</td>
        <td>${esc(place(a))}</td>
        <td>${a.capacityMt ? `${fmt(a.capacityMt)} MT` : '–'}</td>
        <td class="small">${outLinks(a.id).map((l) => esc(l.toAsset ? assetById(l.toAsset)?.name : customerById(l.toCustomer)?.name)).join(', ') || '–'}</td>
        <td>${statusPill(a.status)}</td>
        <td><div class="actions"><button class="btn btn-sm" data-edit-asset="${a.id}" type="button">Edit</button>
          <button class="btn btn-sm btn-danger" data-delete-asset="${a.id}" type="button">Delete</button></div></td></tr>`).join('')}</tbody>`;
    $('#admin-customers').innerHTML = `
      <thead><tr><th>Customer</th><th>Location</th><th>Products</th><th>Monthly supply</th><th>History</th><th></th></tr></thead>
      <tbody>${D().customers.map((c) => `<tr>
        <td><b>${esc(c.name)}</b><br><span class="muted small">${esc(c.industry)}</span></td>
        <td>${esc(c.place)}</td>
        <td>${c.products.length}</td>
        <td>${(() => { const st = supplyStats(D().supplyLog.filter((r) => r.customer === c.id)); const v = st.trucks ? st.monthlyAvg : c.monthlyVolumeMt;
          return v ? `${fmt(Math.round(v))} MT${st.trucks ? ' <span class="muted small">avg, imported</span>' : ''}` : '–'; })()}</td>
        <td>${c.history.length} months</td>
        <td><div class="actions"><button class="btn btn-sm" data-edit-customer="${esc(c.id)}" type="button">Edit</button>
          <button class="btn btn-sm btn-danger" data-delete-customer="${esc(c.id)}" type="button">Delete</button></div></td></tr>`).join('')}</tbody>`;
    renderContentForm();
    renderUsers();
    renderRoutesAdmin();
    renderImportCurrent();
  }

  function showAdminTab(key) {
    state.adminTab = key;
    $$('[data-admin-section]').forEach((el) => { el.hidden = el.dataset.adminSection !== key; });
    $$('#admin-tabs button').forEach((b) => b.classList.toggle('active', b.dataset.adminTab === key));
  }

  function renderRoutesAdmin() {
    const name = (l) => `${esc(assetById(l.from)?.name)} → ${esc(l.toAsset ? assetById(l.toAsset)?.name : customerById(l.toCustomer)?.name)}`;
    $('#admin-routes').innerHTML = `<thead><tr><th>Supply link</th><th>Road distance</th><th>Drive time</th><th>Status</th></tr></thead>
      <tbody>${D().links.map((l) => `<tr><td>${name(l)}</td><td>${l.roadKm != null ? `${fmt(Math.round(l.roadKm))} km` : '–'}</td>
        <td>${l.roadMinutes != null ? hours(l.roadMinutes) : '–'}</td>
        <td>${l.road ? (l.routeError ? `<span class="status Seasonal">Kept last route</span><br><span class="muted small">${esc(l.routeError)}</span>` : '<span class="status">Routed by road</span>')
          : l.routeError ? `<span class="status Inactive">Failed</span><br><span class="muted small">${esc(l.routeError)}</span>` : '<span class="status Commissioning">Not calculated</span>'}</td></tr>`).join('')}</tbody>`;
  }

  async function refreshRoutes(force) {
    $('#routes-error').textContent = 'Calculating road routes…';
    try {
      const r = await api('routes_refresh', { force });
      $('#routes-error').textContent = r.failed ? `${r.failed} route(s) could not be calculated: ${r.errors.join('; ')}` : '';
      await reload();
    } catch (err) { $('#routes-error').textContent = err.message; }
  }

  function renderImportCurrent() {
    const rows = D().supplyLog;
    const byCustomer = uniq(rows.map((r) => r.customer));
    $('#import-current').innerHTML = byCustomer.map((cid) => {
      const st = supplyStats(rows.filter((r) => r.customer === cid));
      const files = uniq(st.rows.map((r) => r.sourceFile).filter(Boolean));
      return `<div class="import-current"><div><b>${esc(customerById(cid)?.name || cid)}</b>: ${fmt(st.trucks)} trucks, ${fmt(Math.round(st.delivered))} MT delivered, ${esc(st.period)}
        <br><span class="muted small">${esc(uniq(st.rows.map((r) => r.label)).join(', '))}${files.length ? ` · from ${esc(files.join(', '))}` : ''}</span></div>
        <button class="btn btn-sm btn-danger" data-import-clear="${esc(cid)}" type="button">Remove</button></div>`;
    }).join('') || '<p class="muted">No supply data imported yet.</p>';
  }

  function renderImportPreview(res) {
    const productOptions = (sel) => '<option value="">(no product)</option>' + D().materials.map((m) => `<optgroup label="${esc(m.name)}">${D().products.filter((p) => p.material === m.id)
      .map((p) => `<option value="${p.id}" ${p.id === sel ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</optgroup>`).join('');
    $('#import-preview').innerHTML = `<div class="table-wrap"><table class="table">
      <thead><tr><th>Import</th><th>Sheet</th><th>Show as</th><th>Product</th><th>Trucks</th><th>Delivered (MT)</th><th>Months</th><th>Notes</th></tr></thead>
      <tbody>${res.sheets.map((sh, i) => `<tr data-sheet="${i}">
        <td><input type="checkbox" name="include" ${sh.include ? 'checked' : ''}></td>
        <td><b>${esc(sh.name)}</b></td>
        <td><input name="label" value="${esc(sh.label)}"></td>
        <td><select name="product">${productOptions(sh.productId)}</select></td>
        <td>${fmt(sh.trips)}</td><td>${fmt(Math.round(sh.deliveredMt))}</td>
        <td>${esc(monthName(sh.from))} – ${esc(monthName(sh.to))} ${esc(sh.to.slice(0, 4))}</td>
        <td class="small muted">${[sh.duplicates ? `${sh.duplicates} duplicate entries skipped` : '', sh.undated ? `${sh.undated} rows without a valid date skipped` : '',
          sh.include ? '' : 'Looks like a summary of the other sheets: left unticked to avoid double counting'].filter(Boolean).join('<br>')}</td></tr>`).join('')}</tbody></table></div>
      <div class="inline-form"><label class="inline-label">Delivered to<select name="customer">${D().customers.map((c) => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}</select></label>
        <button class="btn btn-primary" data-import-commit type="button">Import ticked sheets</button>
        <span class="muted small">Replaces any supply data already imported for this customer.</span></div>`;
    state.importSheets = res.sheets;
  }

  function renderContentForm() {
    const c = D().content;
    const field = (key, label, rows = 0, hint = '') => `<label class="${rows ? 'span-2' : ''}">${esc(label)}${hint ? `<small class="muted">${esc(hint)}</small>` : ''}
      ${rows ? `<textarea name="${key}" rows="${rows}">${esc(c[key])}</textarea>` : `<input name="${key}" value="${esc(c[key])}">`}</label>`;
    $('#content-form').innerHTML = `<div class="form-grid">
      ${field('company_name', 'Company name')}${field('hero_title', 'Dashboard headline')}
      ${field('hero_subtitle', 'Dashboard sub-headline', 2)}
      ${field('company_statement', 'Company statement (shown under the headline)', 2)}
      ${field('about', 'About us', 6, 'Leave a blank line between paragraphs')}
      ${field('eudr_intro', 'EUDR statement (top of the Sustainability page)', 3, 'Leave empty to hide the EUDR section and badge.')}
      ${field('eudr_points', 'EUDR points', 4, 'One per line: Title | Description. EU customers may ask for evidence of each claim.')}
      ${field('sustainability', 'Sustainability points', 5, 'One per line: Title | Description. Only include claims you can back up.')}
      ${field('contact_email', 'Contact email')}${field('contact_phone', 'Contact phone')}
      ${field('contact_address', 'Contact address', 2)}
    </div><p class="error" id="content-error"></p><div class="dialog-actions"><button class="btn btn-primary" type="submit">Save content</button></div>`;
  }

  async function loadUsers() { state.users = await api('users'); renderUsers(); }

  function renderUsers() {
    $('#user-table').innerHTML = `
      <thead><tr><th>Username</th><th>Display name</th><th>Access</th><th>Last sign-in</th><th></th></tr></thead>
      <tbody>${state.users.map((u) => `<tr>
        <td><b>${esc(u.username)}</b></td><td>${esc(u.display_name)}</td>
        <td>${u.role === 'admin' ? '<span class="status">Admin · full access</span>' : '<span class="status Commissioning">Viewer · internal details hidden</span>'}</td>
        <td class="muted">${esc(u.last_login_at || 'Never')}</td>
        <td><div class="actions"><button class="btn btn-sm" data-reset="${u.id}" type="button">Reset password</button>
          ${u.username === D().user.username ? '' : `<button class="btn btn-sm btn-danger" data-user-delete="${u.id}" type="button">Remove</button>`}</div></td></tr>`).join('')}</tbody>`;
  }

  function parseCoords(text) {
    const s = (() => { try { return decodeURIComponent(text); } catch { return text; } })();
    const patterns = [/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/, /[?&]q=(-?\d+\.\d+),\s*(-?\d+\.\d+)/, /@(-?\d+\.\d+),(-?\d+\.\d+)/, /^\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)\s*$/];
    for (const p of patterns) { const m = s.match(p); if (m) return [Number(m[1]), Number(m[2])]; }
    return null;
  }

  const input = (name, label, value, attrs = '') => `<label>${esc(label)}<input name="${name}" value="${esc(value ?? '')}" ${attrs}></label>`;
  const checks = (name, items, selected) => items.map(([v, l]) => `<label class="check"><input type="checkbox" name="${name}" value="${esc(v)}" ${selected.includes(v) ? 'checked' : ''}>${esc(l)}</label>`).join('');

  function openAssetDialog(a) {
    const f = $('#asset-form');
    const p = a?.private || {};
    const outA = a ? outLinks(a.id).filter((l) => l.toAsset).map((l) => String(l.toAsset)) : [];
    const outC = a ? outLinks(a.id).filter((l) => l.toCustomer).map((l) => l.toCustomer) : [];
    f.dataset.id = a ? a.id : '';
    f.innerHTML = `<h3>${a ? `Edit ${esc(a.code)}` : 'Add asset'}</h3>
      <fieldset><legend>Asset (visible to customers)</legend><div class="form-grid">
        ${input('name', 'Asset name', a?.name, 'required placeholder="e.g. Tambour Chipping Center"')}
        <label>Asset type<select name="type">${Object.entries(D().assetTypes).map(([t, i]) => `<option value="${t}" ${a?.type === t ? 'selected' : ''}>${esc(i.label)}</option>`).join('')}</select></label>
        ${input('region', 'Region / village', a?.region, 'required')}${input('district', 'District', a?.district)}
        ${input('state', 'State', a?.state)}
        <label>Status<select name="status">${D().statuses.map((s) => `<option ${(a?.status || 'Operational') === s ? 'selected' : ''}>${s}</option>`).join('')}</select></label>
        <label class="span-2">Paste a Google Maps link to fill the coordinates<input name="mapsPaste" placeholder="https://www.google.com/maps?q=27.73,81.14"></label>
        ${input('lat', 'Latitude', a?.lat, 'type="number" step="any" required')}${input('lng', 'Longitude', a?.lng, 'type="number" step="any" required')}
        ${input('capacityMt', 'Capacity (MT / month)', a?.capacityMt, 'type="number" min="0"')}${input('trucksPerMonth', 'Trucks dispatched / month', a?.trucksPerMonth, 'type="number" min="0"')}
        ${input('sinceYear', 'Operating since (year)', a?.sinceYear, 'type="number" min="1900" max="2100"')}
        <label class="span-2">Description<textarea name="description" rows="2">${esc(a?.description)}</textarea></label>
      </div>
      <div class="check-block"><strong>Capabilities</strong>${checks('capabilities', Object.entries(D().capabilities), a?.capabilities || [])}</div>
      <div class="check-block"><strong>Products handled</strong>${D().materials.map((m) => `<div class="check-group"><em>${esc(m.name)}</em>${checks('products', D().products.filter((x) => x.material === m.id).map((x) => [String(x.id), x.name]), (a?.products || []).map(String))}</div>`).join('')}</div>
      <div class="check-block"><strong>Sends material to (supply routes)</strong>
        ${checks('toAssets', D().assets.filter((x) => !a || x.id !== a.id).map((x) => [String(x.id), `${x.name}`]), outA)}
        ${checks('toCustomers', D().customers.map((c) => [c.id, `${c.name} (customer)`]), outC)}</div>
      </fieldset>
      <fieldset><legend>Internal site details (admins only)</legend><div class="form-grid">
        ${input('p.siteIncharge', 'Site in-charge', p.siteIncharge)}${input('p.phone', 'Phone', p.phone)}
        ${input('p.email', 'Email', p.email, 'type="email"')}${input('p.mapsUrl', 'Google Maps link', p.mapsUrl)}
        <label class="span-2">Address<input name="p.address" value="${esc(p.address)}"></label>
        <label class="span-2">Internal notes<textarea name="p.notes" rows="2">${esc(p.notes)}</textarea></label>
      </div></fieldset>
      <p class="error" id="asset-error"></p>
      <div class="dialog-actions"><button class="btn" value="cancel" formnovalidate type="submit">Cancel</button><button class="btn btn-primary" data-save-asset type="button">Save asset</button></div>`;
    f.elements.mapsPaste.addEventListener('input', (e) => {
      const c = parseCoords(e.target.value);
      if (c) { f.elements.lat.value = c[0]; f.elements.lng.value = c[1]; if (!f.elements['p.mapsUrl'].value) f.elements['p.mapsUrl'].value = e.target.value.trim(); }
    });
    $('#asset-dialog').showModal();
  }

  async function saveAsset() {
    const f = $('#asset-form');
    if (!f.reportValidity()) return;
    const v = (n) => f.elements[n].value;
    const checked = (n) => $$(`input[name="${n}"]:checked`, f).map((i) => i.value);
    const body = {
      id: f.dataset.id || null, name: v('name'), type: v('type'), region: v('region'), district: v('district'), state: v('state'),
      status: v('status'), lat: v('lat'), lng: v('lng'), capacityMt: v('capacityMt'), trucksPerMonth: v('trucksPerMonth'),
      sinceYear: v('sinceYear'), description: v('description'),
      capabilities: checked('capabilities'), products: checked('products').map(Number),
      toAssets: checked('toAssets').map(Number), toCustomers: checked('toCustomers'),
      private: Object.fromEntries(['siteIncharge', 'phone', 'email', 'address', 'mapsUrl', 'notes'].map((k) => [k, v(`p.${k}`)])),
    };
    try { await api('asset_save', body); $('#asset-dialog').close(); await reload(); } catch (err) { $('#asset-error').textContent = err.message; }
  }

  function historyRow(h = {}) {
    return `<div class="hist-row"><input type="month" name="h.month" value="${esc(h.month || '')}"><input type="number" min="0" name="h.qty" placeholder="MT" value="${esc(h.quantityMt ?? '')}">
      <input type="number" min="0" name="h.dispatches" placeholder="Dispatches" value="${esc(h.dispatches ?? '')}"><button class="btn btn-sm" data-remove-row type="button">Remove</button></div>`;
  }

  function openCustomerDialog(c) {
    const f = $('#customer-form');
    f.dataset.id = c ? c.id : '';
    f.innerHTML = `<h3>${c ? `Edit ${esc(c.name)}` : 'Add customer'}</h3>
      <fieldset><legend>Customer</legend><div class="form-grid">
        ${input('name', 'Name', c?.name, 'required')}${input('industry', 'Industry', c?.industry)}
        <label class="span-2">Location<input name="place" value="${esc(c?.place)}" required placeholder="Town, State"></label>
        <label class="span-2">Paste a Google Maps link to fill the coordinates<input name="mapsPaste"></label>
        ${input('lat', 'Latitude', c?.lat, 'type="number" step="any" required')}${input('lng', 'Longitude', c?.lng, 'type="number" step="any" required')}
        ${input('monthlyVolumeMt', 'Monthly supply (MT)', c?.monthlyVolumeMt, 'type="number" min="0"')}${input('dispatchesPerMonth', 'Dispatches / month', c?.dispatchesPerMonth, 'type="number" min="0"')}
        ${input('supplyingSince', 'Supplying since (year)', c?.supplyingSince, 'type="number" min="1900" max="2100"')}
      </div>
      <div class="check-block"><strong>Products supplied</strong>${D().materials.map((m) => `<div class="check-group"><em>${esc(m.name)}</em>${checks('products', D().products.filter((x) => x.material === m.id).map((x) => [String(x.id), x.name]), (c?.products || []).map(String))}</div>`).join('')}</div>
      </fieldset>
      <fieldset><legend>Monthly supply history</legend>
        <div id="hist-rows">${(c?.history || []).map(historyRow).join('')}</div>
        <button class="btn btn-sm" data-add-row type="button">+ Add month</button>
      </fieldset>
      <p class="error" id="customer-error"></p>
      <div class="dialog-actions"><button class="btn" value="cancel" formnovalidate type="submit">Cancel</button><button class="btn btn-primary" data-save-customer type="button">Save customer</button></div>`;
    f.elements.mapsPaste.addEventListener('input', (e) => { const p = parseCoords(e.target.value); if (p) { f.elements.lat.value = p[0]; f.elements.lng.value = p[1]; } });
    $('#customer-dialog').showModal();
  }

  async function saveCustomer() {
    const f = $('#customer-form');
    if (!f.reportValidity()) return;
    const v = (n) => f.elements[n].value;
    const body = {
      id: f.dataset.id || null, name: v('name'), industry: v('industry'), place: v('place'), lat: v('lat'), lng: v('lng'),
      monthlyVolumeMt: v('monthlyVolumeMt'), dispatchesPerMonth: v('dispatchesPerMonth'), supplyingSince: v('supplyingSince'),
      products: $$('input[name="products"]:checked', f).map((i) => Number(i.value)),
      history: $$('.hist-row', f).map((r) => ({ month: $('[name="h.month"]', r).value, quantityMt: $('[name="h.qty"]', r).value || 0, dispatches: $('[name="h.dispatches"]', r).value || 0 })),
    };
    try { await api('customer_save', body); $('#customer-dialog').close(); await reload(); } catch (err) { $('#customer-error').textContent = err.message; }
  }

  // ---------- Routing ----------
  function currentPage() {
    const h = location.hash.slice(1);
    return h.startsWith('asset/') ? 'asset' : h;
  }

  function showPage() {
    let page = currentPage();
    const pages = $$('.page').map((p) => p.dataset.page);
    if (!pages.includes(page)) page = 'dashboard';
    $$('.page').forEach((p) => { p.hidden = p.dataset.page !== page; });
    const tab = page === 'asset' ? 'assets' : page;
    const sub = $(`.section-tabs [data-page-link="${tab}"]`)?.closest('.section-tabs');
    const group = sub ? sub.dataset.subnav : tab;
    $$('#tabs a').forEach((a) => a.classList.toggle('active', a.dataset.group === group));
    $$('.section-tabs').forEach((n) => { n.hidden = n !== sub; });
    $$('.section-tabs a').forEach((a) => {
      a.classList.toggle('active', a.dataset.pageLink === tab);
      a.setAttribute('aria-current', a.dataset.pageLink === tab ? 'page' : 'false');
    });
    renderPager(sub, tab);
    window.scrollTo({ top: 0 });
    // Leaflet needs a visible container, so maps are drawn when their page is shown.
    if (page === 'dashboard') { drawDashMap(); maps['dash-map'].map.invalidateSize(); }
    if (page === 'network') { drawNetMap(false); maps['net-map'].map.invalidateSize(); }
    if (page === 'logistics') { renderLogistics(); maps['log-map'].map.invalidateSize(); }
    if (page === 'asset') renderAssetProfile(Number(location.hash.split('/')[1]));
    if (page === 'admin') { showAdminTab(state.adminTab || 'assets'); loadUsers().catch((e) => { $('#user-error').textContent = e.message; }); }
    $('#tabs .active')?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }

  /** "Back / Next" links at the bottom of pages that belong to a multi-view section. */
  function renderPager(sub, tab) {
    const pager = $('#pager');
    const links = sub ? $$('a', sub) : [];
    const i = links.findIndex((a) => a.dataset.pageLink === tab);
    if (i < 0) { pager.hidden = true; return; }
    const label = (a) => $('b', a).textContent;
    const prev = links[i - 1], next = links[i + 1];
    pager.hidden = false;
    pager.innerHTML = `${prev ? `<a class="pager-link" href="${prev.getAttribute('href')}">← ${esc(label(prev))}</a>` : '<span></span>'}
      ${next ? `<a class="pager-link next" href="${next.getAttribute('href')}"><small>Next</small>${esc(label(next))} →</a>` : ''}`;
  }

  function renderAll() {
    document.title = `${D().content.company_name} · Supply Network`;
    renderLegends(); renderDashboard(); renderSupplyRecord(); renderFlow(); renderNetFilters(); renderSidePanel(); renderAssetGroups();
    renderMaterials(); renderProcessing(); renderLogisticsControls(); renderLogistics(); renderCustomers();
    renderSustainability(); renderAbout(); renderAdmin();
  }

  async function reload() {
    state.data = await api('data');
    renderAll();
    showPage();
  }

  // ---------- Events ----------
  function bindEvents() {
    window.addEventListener('hashchange', showPage);

    document.addEventListener('click', async (e) => {
      const t = e.target.closest('[data-admin-tab],[data-routes-refresh],[data-import-commit],[data-import-clear],[data-filter],[data-select],[data-back],[data-material-map],[data-type-jump],[data-trace],[data-customer-link],[data-add-asset],[data-edit-asset],[data-delete-asset],[data-save-asset],[data-add-customer],[data-edit-customer],[data-delete-customer],[data-save-customer],[data-add-row],[data-remove-row],[data-user-delete],[data-reset]');
      if (!t) return;
      const ds = t.dataset;
      if (ds.adminTab) showAdminTab(ds.adminTab);
      else if (ds.filter) { state.net[ds.filter] = ds.value || null; if (ds.filter === 'type' && ds.value === 'customer') state.net.selected = null; refreshNetwork(true); }
      else if (ds.select) selectNetAsset(Number(ds.select));
      else if (ds.back !== undefined) { state.net.selected = null; renderSidePanel(); drawNetMap(true); }
      else if (ds.materialMap) { Object.assign(state.net, { material: ds.materialMap, type: null, form: null, selected: null }); refreshNetwork(true); location.hash = 'network'; }
      else if (ds.typeJump) { e.preventDefault(); location.hash = 'assets'; setTimeout(() => $(`#group-${ds.typeJump}`)?.scrollIntoView({ behavior: 'smooth' }), 60); }
      else if (ds.trace) { state.log.customer = ds.trace; renderLogisticsControls(); location.hash = 'logistics'; }
      else if (ds.customerLink) { e.preventDefault(); location.hash = 'customers'; setTimeout(() => $(`#cust-${CSS.escape(ds.customerLink)}`)?.scrollIntoView({ behavior: 'smooth' }), 80); }
      else if (ds.addAsset !== undefined) openAssetDialog(null);
      else if (ds.editAsset) openAssetDialog(assetById(Number(ds.editAsset)));
      else if (ds.saveAsset !== undefined) saveAsset();
      else if (ds.deleteAsset) {
        const a = assetById(Number(ds.deleteAsset));
        if (confirm(`Delete ${a.code} ${a.name}? Its supply routes are removed too. This cannot be undone.`)) {
          try { await api('asset_delete', { id: a.id }); if (state.net.selected === a.id) state.net.selected = null; await reload(); } catch (err) { alert(err.message); }
        }
      } else if (ds.addCustomer !== undefined) openCustomerDialog(null);
      else if (ds.editCustomer) openCustomerDialog(customerById(ds.editCustomer));
      else if (ds.saveCustomer !== undefined) saveCustomer();
      else if (ds.deleteCustomer) {
        const c = customerById(ds.deleteCustomer);
        if (confirm(`Delete customer ${c.name}? Routes to it are removed too. This cannot be undone.`)) {
          try { await api('customer_delete', { id: c.id }); if (state.log.customer === c.id) state.log.customer = ''; await reload(); } catch (err) { alert(err.message); }
        }
      } else if (ds.routesRefresh !== undefined) refreshRoutes(ds.routesRefresh === 'force');
      else if (ds.importCommit !== undefined) {
        const rows = $$('#import-preview tr[data-sheet]').filter((tr) => $('[name="include"]', tr).checked);
        try {
          const r = await api('import_commit', {
            customerId: $('#import-preview [name="customer"]').value,
            sheets: rows.map((tr) => ({ name: state.importSheets[Number(tr.dataset.sheet)].name, label: $('[name="label"]', tr).value, productId: $('[name="product"]', tr).value })),
          });
          await reload();
          $('#import-preview').innerHTML = `<div class="banner small">Imported ${fmt(r.trucks)} trucks and ${fmt(Math.round(r.deliveredMt))} MT across ${r.months} months.</div>`;
          $('#import-error').textContent = '';
        } catch (err) { $('#import-error').textContent = err.message; }
      } else if (ds.importClear) {
        if (confirm(`Remove the imported supply data for ${customerById(ds.importClear)?.name}?`)) {
          try { await api('import_clear', { customerId: ds.importClear }); await reload(); } catch (err) { alert(err.message); }
        }
      } else if (ds.addRow !== undefined) $('#hist-rows').insertAdjacentHTML('beforeend', historyRow());
      else if (ds.removeRow !== undefined) t.closest('.hist-row').remove();
      else if (ds.userDelete) {
        const u = state.users.find((x) => x.id === Number(ds.userDelete));
        if (confirm(`Remove ${u.username}? They will be signed out.`)) {
          try { await api('user_delete', { id: u.id }); await loadUsers(); } catch (err) { $('#user-error').textContent = err.message; }
        }
      } else if (ds.reset) {
        const u = state.users.find((x) => x.id === Number(ds.reset));
        const pw = prompt(`New password for ${u.username} (min 8 characters):`);
        if (pw) {
          try { await api('user_password', { id: u.id, password: pw }); $('#user-error').textContent = ''; alert('Password updated.'); } catch (err) { $('#user-error').textContent = err.message; }
        }
      }
    });

    // Chart hover tooltips
    document.addEventListener('pointermove', (e) => {
      const g = e.target.closest?.('.bar-g');
      $$('.chart-tip').forEach((tip) => { if (!g || !tip.parentElement.contains(g)) tip.hidden = true; });
      $$('.bar-g.hover').forEach((x) => x !== g && x.classList.remove('hover'));
      if (!g) return;
      g.classList.add('hover');
      const wrap = g.closest('.chart-wrap'), tip = $('.chart-tip', wrap), r = wrap.getBoundingClientRect();
      tip.textContent = g.dataset.tip;
      tip.hidden = false;
      tip.style.left = `${Math.min(e.clientX - r.left + 12, r.width - tip.offsetWidth - 4)}px`;
      tip.style.top = `${e.clientY - r.top - 36}px`;
    });

    let timer;
    ['type', 'material', 'form'].forEach((k) => $(`#f-${k}`).addEventListener('change', (e) => {
      state.net[k] = e.target.value || null;
      if (k === 'type' && e.target.value === 'customer') state.net.selected = null;
      refreshNetwork(true);
    }));
    $('#f-search').addEventListener('input', (e) => {
      clearTimeout(timer);
      timer = setTimeout(() => { state.net.search = e.target.value; state.net.selected = null; refreshNetwork(true); }, 150);
    });
    $('#l-product').addEventListener('change', (e) => { state.log.product = e.target.value; renderLogistics(); });
    $('#l-customer').addEventListener('change', (e) => { state.log.customer = e.target.value; renderLogistics(); });

    const contentForm = $('#content-form');
    if (contentForm) {
      contentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          await api('content_save', Object.fromEntries(new FormData(contentForm)));
          $('#content-error').textContent = '';
          await reload();
          location.hash = 'admin';
        } catch (err) { $('#content-error').textContent = err.message; }
      });
      const importForm = $('#import-form');
      importForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        $('#import-error').textContent = 'Reading workbook…';
        try {
          const res = await fetch('api.php?action=import_preview', { method: 'POST', headers: { 'X-CSRF-Token': CSRF }, body: new FormData(importForm), credentials: 'same-origin' });
          const json = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(json.error || 'Upload failed');
          $('#import-error').textContent = '';
          renderImportPreview(json);
        } catch (err) { $('#import-error').textContent = err.message; $('#import-preview').innerHTML = ''; }
      });
      const userForm = $('#user-form');
      userForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          await api('user_create', Object.fromEntries(new FormData(userForm)));
          userForm.reset(); $('#user-error').textContent = ''; await loadUsers();
        } catch (err) { $('#user-error').textContent = err.message; }
      });
    }
  }

  async function start() {
    $$('[data-icon]').forEach((el) => { el.innerHTML = ICON[el.dataset.icon] || ''; });
    bindEvents();
    try {
      state.data = await api('data');
    } catch (err) {
      $('main').insertAdjacentHTML('afterbegin', `<div class="card empty error">${esc(err.message)}</div>`);
      return;
    }
    renderAll();
    showPage();
    // First visit after an update: admins calculate the missing road routes once, in the background.
    if (isAdmin() && D().app.routing && D().links.some((l) => !l.road && !l.routeError)) {
      api('routes_refresh', {}).then(() => reload()).catch(() => {});
    }
  }

  start();
})();

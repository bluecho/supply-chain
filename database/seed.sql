-- Starting data for Prakritik India Initiatives.
-- Asset types, capacities, capabilities and routes below are a first draft:
-- correct them from the Admin tab.
SET NAMES utf8mb4;

INSERT INTO site_content (content_key, body) VALUES
  ('company_name', 'Prakritik India Initiatives'),
  ('hero_title', 'Our Integrated Wood Biomass Supply Network'),
  ('hero_subtitle', 'Reliable sourcing, processing and supply of quality wood chips and biomass materials to leading paper & pulp industries.'),
  ('company_statement', 'We are the supplier. Every location on this map is part of our own supply network: our sourcing, processing, aggregation and logistics infrastructure.'),
  ('about', 'Prakritik India Initiatives sources, processes and supplies wood chips and wood biomass to the paper & pulp industry.\n\nWe manage the complete chain ourselves: procurement of plantation and agro-forestry wood, debarking and chipping at our own centers, quality control, aggregation and dispatch to the mill.\n\nOur customers include ITC PSPD and TNPL.'),
  ('sustainability', 'Plantation-linked sourcing | Wood procured from farm and agro-forestry plantations such as poplar, eucalyptus, shubabul and casuarina.\nRural livelihoods | Our sourcing network buys directly from growers across several states.\nFull utilisation | Debarked chips, core chips and with-bark wood are each supplied for the use they suit best.\nOptimised transport | Processing close to the source reduces the distance raw wood travels.'),
  ('contact_email', 'info@prakritik.in'),
  ('contact_phone', ''),
  ('contact_address', '');

INSERT INTO materials (id, name, color, sort_order) VALUES
  ('poplar',     'Poplar',     '#2f855a', 1),
  ('eucalyptus', 'Eucalyptus', '#2b6cb0', 2),
  ('shubabul',   'Shubabul',   '#c05621', 3),
  ('casuarina',  'Casuarina',  '#805ad5', 4);

INSERT INTO products (id, material_id, name, form, sort_order) VALUES
  (1,  'poplar',     'Debarked Poplar Wood Chips',     'debarked',   1),
  (2,  'poplar',     'Poplar Core Chips',              'core_chips', 2),
  (3,  'poplar',     'With Bark Poplar',               'with_bark',  3),
  (4,  'eucalyptus', 'Debarked Eucalyptus Wood Chips', 'debarked',   1),
  (5,  'eucalyptus', 'Eucalyptus Core Chips',          'core_chips', 2),
  (6,  'eucalyptus', 'With Bark Eucalyptus',           'with_bark',  3),
  (7,  'shubabul',   'Debarked Shubabul Wood',         'debarked',   1),
  (8,  'shubabul',   'With Bark Shubabul Wood',        'with_bark',  2),
  (9,  'casuarina',  'Casuarina With Bark',            'with_bark',  1),
  (10, 'casuarina',  'Casuarina Without Bark',         'debarked',   2);

INSERT INTO customers (id, name, industry, place, lat, lng) VALUES
  ('itc-pspd', 'ITC PSPD', 'Paper & Paperboards', 'Bhadrachalam, Telangana',         17.6688000, 80.8936000),
  ('tnpl',     'TNPL',     'Paper & Pulp',        'Kagithapuram, Karur, Tamil Nadu', 11.0510000, 77.9990000);

INSERT INTO customer_products (customer_id, product_id) VALUES
  ('itc-pspd', 1), ('itc-pspd', 2), ('itc-pspd', 4), ('itc-pspd', 5), ('itc-pspd', 7),
  ('tnpl', 4), ('tnpl', 6), ('tnpl', 9), ('tnpl', 10);

INSERT INTO assets (id, code, name, asset_type, region, district, state, lat, lng, capacity_mt, trucks_per_month, capabilities, description, status, since_year) VALUES
  (1, 'A-01', 'Jahangirabad Sourcing Location', 'sourcing', 'Jahangirabad', 'Lucknow Division', 'Uttar Pradesh', 27.5220617, 81.1168333, 600, NULL,
      'procurement,storage,loading', 'Procurement of poplar and eucalyptus from farm plantations in the Lucknow division.', 'Operational', 2022),
  (2, 'A-02', 'Tambour Chipping Center', 'chipping', 'Tambour', 'Sitapur', 'Uttar Pradesh', 27.7387548, 81.1490577, 1500, 50,
      'debarking,chipping,screening,segregation,weighment,loading', 'Debarking and chipping center serving our Uttar Pradesh sourcing locations.', 'Operational', 2023),
  (3, 'A-03', 'Nariyawal Sourcing Location', 'sourcing', 'Nariyawal', 'Bareilly', 'Uttar Pradesh', 28.1603603, 79.5777206, 450, NULL,
      'procurement,storage,loading', 'Poplar procurement from the Bareilly belt.', 'Operational', 2023),
  (4, 'A-04', 'Nanded Chipping Center', 'chipping', 'Nanded', 'Nanded', 'Maharashtra', 19.1399665, 77.3447728, 700, 24,
      'procurement,debarking,chipping,screening,loading', 'Eucalyptus and shubabul sourcing and chipping in Marathwada.', 'Operational', 2022),
  (5, 'A-05', 'Hyderabad Chipping Center', 'chipping', 'Hyderabad', 'Hyderabad', 'Telangana', 13.4936228, 77.4701614, 550, 18,
      'procurement,debarking,chipping,screening,loading', 'Eucalyptus and casuarina processing for our southern customers.', 'Operational', 2024);

INSERT INTO asset_private (asset_id, site_incharge, phone, email, address, maps_url, notes) VALUES
  (1, '', '', '', 'Jahangirabad, Lucknow Division, Uttar Pradesh', 'https://www.google.com/maps?q=27.5220617,81.1168333', ''),
  (2, '', '', '', 'Tambour, Sitapur, Uttar Pradesh', 'https://www.google.com/maps?q=27.7387548,81.1490577', ''),
  (3, '', '', '', 'Nariyawal, Bareilly, Uttar Pradesh', 'https://www.google.com/maps?q=28.16036033630371,79.57772064208984', ''),
  (4, '', '', '', 'Nanded, Maharashtra', 'https://www.google.com/maps?q=19.1399665,77.3447728', ''),
  (5, '', '', '', 'Two Brothers Wood Industries', 'https://www.google.com/maps/search/Two%20Brothers%20Wood%20Industries/@13.493622779846191,77.47016143798828,17z', 'Map pin is near Doddaballapur, Karnataka - confirm location.');

INSERT INTO asset_products (asset_id, product_id) VALUES
  (1, 1), (1, 2), (1, 4), (1, 5),
  (2, 1), (2, 2), (2, 4), (2, 5),
  (3, 1), (3, 2),
  (4, 4), (4, 5), (4, 7),
  (5, 4), (5, 6), (5, 9), (5, 10);

INSERT INTO supply_links (from_asset_id, to_asset_id, to_customer_id) VALUES
  (1, 2, NULL),
  (3, 2, NULL),
  (2, NULL, 'itc-pspd'),
  (4, NULL, 'itc-pspd'),
  (5, NULL, 'tnpl');

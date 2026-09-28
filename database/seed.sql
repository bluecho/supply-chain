-- Starting data. Vendor names, contacts and capacities are placeholders:
-- update them from the Admin tab once the app is running.
SET NAMES utf8mb4;

INSERT INTO materials (id, name, color, sort_order) VALUES
  ('poplar',     'Poplar',     '#2f855a', 1),
  ('eucalyptus', 'Eucalyptus', '#2b6cb0', 2),
  ('shubabul',   'Shubabul',   '#c05621', 3),
  ('casuarina',  'Casuarina',  '#805ad5', 4);

INSERT INTO material_products (material_id, name) VALUES
  ('poplar', 'Debarked Poplar Wood Chips'), ('poplar', 'Poplar Core Chips'), ('poplar', 'With Bark Poplar'),
  ('eucalyptus', 'Debarked Eucalyptus Wood Chips'), ('eucalyptus', 'Eucalyptus Core Chips'), ('eucalyptus', 'With Bark Eucalyptus'),
  ('shubabul', 'Debarked Shubabul Wood'), ('shubabul', 'With Bark Shubabul Wood'),
  ('casuarina', 'Casuarina With Bark'), ('casuarina', 'Casuarina Without Bark');

INSERT INTO customers (id, name, place, lat, lng) VALUES
  ('itc-pspd', 'ITC PSPD', 'Bhadrachalam, Telangana',         17.6688000, 80.8936000),
  ('tnpl',     'TNPL',     'Kagithapuram, Karur, Tamil Nadu', 11.0510000, 77.9990000);

INSERT INTO vendors (id, code, region, district, state, lat, lng, capacity_mt, trucks_per_month, active_since, status) VALUES
  (1, 'V-01', 'Jahangirabad', 'Lucknow Division', 'Uttar Pradesh', 27.5220617, 81.1168333, 600, 20, 2022, 'Active'),
  (2, 'V-02', 'Tambour',      'Sitapur',          'Uttar Pradesh', 27.7387548, 81.1490577, 500, 17, 2023, 'Active'),
  (3, 'V-03', 'Nariyawal',    'Bareilly',         'Uttar Pradesh', 28.1603603, 79.5777206, 450, 15, 2023, 'Active'),
  (4, 'V-04', 'Nanded',       'Nanded',           'Maharashtra',   19.1399665, 77.3447728, 700, 24, 2022, 'Active'),
  (5, 'V-05', 'Hyderabad',    'Hyderabad',        'Telangana',     13.4936228, 77.4701614, 550, 18, 2024, 'Active');

INSERT INTO vendor_contacts (vendor_id, vendor_name, contact_person, phone, email, address, maps_url) VALUES
  (1, 'Vendor name (update in Admin)', 'Contact person', '+91 00000 00000', 'vendor@example.com', 'Jahangirabad, Lucknow Division, Uttar Pradesh', 'https://www.google.com/maps?q=27.5220617,81.1168333'),
  (2, 'Vendor name (update in Admin)', 'Contact person', '+91 00000 00000', 'vendor@example.com', 'Tambour, Sitapur, Uttar Pradesh',               'https://www.google.com/maps?q=27.7387548,81.1490577'),
  (3, 'Vendor name (update in Admin)', 'Contact person', '+91 00000 00000', 'vendor@example.com', 'Nariyawal, Bareilly, Uttar Pradesh',            'https://www.google.com/maps?q=28.16036033630371,79.57772064208984'),
  (4, 'Vendor name (update in Admin)', 'Contact person', '+91 00000 00000', 'vendor@example.com', 'Nanded, Maharashtra',                           'https://www.google.com/maps?q=19.1399665,77.3447728'),
  (5, 'Two Brothers Wood Industries',  'Contact person', '+91 00000 00000', 'vendor@example.com', 'Update address in Admin',                       'https://www.google.com/maps/search/Two%20Brothers%20Wood%20Industries/@13.493622779846191,77.47016143798828,17z');

INSERT INTO vendor_materials (vendor_id, material_id) VALUES
  (1, 'poplar'), (1, 'eucalyptus'),
  (2, 'poplar'), (2, 'eucalyptus'),
  (3, 'poplar'),
  (4, 'eucalyptus'), (4, 'shubabul'),
  (5, 'eucalyptus'), (5, 'casuarina');

INSERT INTO vendor_customers (vendor_id, customer_id) VALUES
  (1, 'itc-pspd'), (2, 'itc-pspd'), (3, 'itc-pspd'), (4, 'itc-pspd'), (5, 'tnpl');

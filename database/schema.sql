-- Prakritik India Initiatives - Supply Network schema (MySQL 5.7+ / MariaDB 10.3+)
-- The company is the supplier. Map locations are the company's own assets
-- (sourcing locations, chipping centers, storage yards, logistics hubs...).
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(64)  NOT NULL UNIQUE,
  display_name  VARCHAR(120) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('admin','viewer') NOT NULL DEFAULT 'viewer',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS login_attempts (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ip           VARCHAR(45) NOT NULL,
  attempted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ip_time (ip, attempted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Editable text blocks (hero, about us, sustainability, contact).
CREATE TABLE IF NOT EXISTS site_content (
  content_key VARCHAR(64) PRIMARY KEY,
  body        TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Material groups: Poplar, Eucalyptus, Shubabul, Casuarina
CREATE TABLE IF NOT EXISTS materials (
  id         VARCHAR(32) PRIMARY KEY,
  name       VARCHAR(80) NOT NULL,
  color      CHAR(7)     NOT NULL,
  sort_order INT         NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Products within a group, e.g. "Debarked Eucalyptus Wood Chips"
CREATE TABLE IF NOT EXISTS products (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  material_id VARCHAR(32)  NOT NULL,
  name        VARCHAR(120) NOT NULL,
  form        ENUM('debarked','with_bark','core_chips') NOT NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Customer destinations (ITC PSPD, TNPL)
CREATE TABLE IF NOT EXISTS customers (
  id                   VARCHAR(32)  PRIMARY KEY,
  name                 VARCHAR(120) NOT NULL,
  industry             VARCHAR(120) NOT NULL DEFAULT '',
  place                VARCHAR(160) NOT NULL,
  lat                  DECIMAL(10,7) NOT NULL,
  lng                  DECIMAL(10,7) NOT NULL,
  monthly_volume_mt    INT UNSIGNED NULL,
  dispatches_per_month INT UNSIGNED NULL,
  supplying_since      SMALLINT UNSIGNED NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS customer_products (
  customer_id VARCHAR(32)  NOT NULL,
  product_id  INT UNSIGNED NOT NULL,
  PRIMARY KEY (customer_id, product_id),
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id)  REFERENCES products(id)  ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS customer_supply_history (
  customer_id VARCHAR(32)  NOT NULL,
  month       DATE         NOT NULL,  -- first day of the month
  quantity_mt INT UNSIGNED NOT NULL DEFAULT 0,
  dispatches  INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (customer_id, month),
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Our own supply network assets. Public to every signed-in user
-- (coordinates are rounded for viewer accounts).
CREATE TABLE IF NOT EXISTS assets (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code            VARCHAR(16)  NOT NULL UNIQUE,
  name            VARCHAR(160) NOT NULL,
  asset_type      ENUM('sourcing','chipping','processing','collection','storage','logistics') NOT NULL,
  region          VARCHAR(120) NOT NULL,
  district        VARCHAR(120) NOT NULL DEFAULT '',
  state           VARCHAR(120) NOT NULL DEFAULT '',
  lat             DECIMAL(10,7) NOT NULL,
  lng             DECIMAL(10,7) NOT NULL,
  capacity_mt     INT UNSIGNED NULL,
  trucks_per_month INT UNSIGNED NULL,
  capabilities    VARCHAR(500) NOT NULL DEFAULT '',  -- comma-separated capability ids
  description     VARCHAR(1000) NOT NULL DEFAULT '',
  status          ENUM('Operational','Commissioning','Seasonal','Inactive') NOT NULL DEFAULT 'Operational',
  since_year      SMALLINT UNSIGNED NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Internal site details: only ever queried for admin sessions.
CREATE TABLE IF NOT EXISTS asset_private (
  asset_id     INT UNSIGNED PRIMARY KEY,
  site_incharge VARCHAR(120) NOT NULL DEFAULT '',
  phone        VARCHAR(40)  NOT NULL DEFAULT '',
  email        VARCHAR(160) NOT NULL DEFAULT '',
  address      VARCHAR(300) NOT NULL DEFAULT '',
  maps_url     VARCHAR(500) NOT NULL DEFAULT '',
  notes        VARCHAR(1000) NOT NULL DEFAULT '',
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS asset_products (
  asset_id   INT UNSIGNED NOT NULL,
  product_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (asset_id, product_id),
  FOREIGN KEY (asset_id)   REFERENCES assets(id)   ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Supply routes: material moves from an asset to another asset or to a customer.
CREATE TABLE IF NOT EXISTS supply_links (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  from_asset_id INT UNSIGNED NOT NULL,
  to_asset_id   INT UNSIGNED NULL,
  to_customer_id VARCHAR(32) NULL,
  UNIQUE KEY uniq_link (from_asset_id, to_asset_id, to_customer_id),
  FOREIGN KEY (from_asset_id)  REFERENCES assets(id)    ON DELETE CASCADE,
  FOREIGN KEY (to_asset_id)    REFERENCES assets(id)    ON DELETE CASCADE,
  FOREIGN KEY (to_customer_id) REFERENCES customers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

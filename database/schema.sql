-- Supply Network schema (MySQL 5.7+ / MariaDB 10.3+)
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

CREATE TABLE IF NOT EXISTS materials (
  id         VARCHAR(32) PRIMARY KEY,
  name       VARCHAR(80) NOT NULL,
  color      CHAR(7)     NOT NULL,
  sort_order INT         NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS material_products (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  material_id VARCHAR(32)  NOT NULL,
  name        VARCHAR(120) NOT NULL,
  FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Destination mills
CREATE TABLE IF NOT EXISTS customers (
  id    VARCHAR(32)  PRIMARY KEY,
  name  VARCHAR(120) NOT NULL,
  place VARCHAR(160) NOT NULL,
  lat   DECIMAL(10,7) NOT NULL,
  lng   DECIMAL(10,7) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Public vendor data: shown to every signed-in user (coordinates rounded for viewers).
CREATE TABLE IF NOT EXISTS vendors (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code             VARCHAR(16)  NOT NULL UNIQUE,
  region           VARCHAR(120) NOT NULL,
  district         VARCHAR(120) NOT NULL DEFAULT '',
  state            VARCHAR(120) NOT NULL DEFAULT '',
  lat              DECIMAL(10,7) NOT NULL,
  lng              DECIMAL(10,7) NOT NULL,
  capacity_mt      INT UNSIGNED NOT NULL DEFAULT 0,
  trucks_per_month INT UNSIGNED NOT NULL DEFAULT 0,
  active_since     SMALLINT UNSIGNED NULL,
  status           ENUM('Active','Onboarding','Inactive') NOT NULL DEFAULT 'Active',
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Confidential vendor data: only ever queried for admin sessions.
CREATE TABLE IF NOT EXISTS vendor_contacts (
  vendor_id      INT UNSIGNED PRIMARY KEY,
  vendor_name    VARCHAR(160) NOT NULL DEFAULT '',
  contact_person VARCHAR(120) NOT NULL DEFAULT '',
  phone          VARCHAR(40)  NOT NULL DEFAULT '',
  email          VARCHAR(160) NOT NULL DEFAULT '',
  address        VARCHAR(300) NOT NULL DEFAULT '',
  gstin          VARCHAR(20)  NOT NULL DEFAULT '',
  maps_url       VARCHAR(500) NOT NULL DEFAULT '',
  FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS vendor_materials (
  vendor_id   INT UNSIGNED NOT NULL,
  material_id VARCHAR(32)  NOT NULL,
  PRIMARY KEY (vendor_id, material_id),
  FOREIGN KEY (vendor_id)   REFERENCES vendors(id)   ON DELETE CASCADE,
  FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS vendor_customers (
  vendor_id   INT UNSIGNED NOT NULL,
  customer_id VARCHAR(32)  NOT NULL,
  PRIMARY KEY (vendor_id, customer_id),
  FOREIGN KEY (vendor_id)   REFERENCES vendors(id)   ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

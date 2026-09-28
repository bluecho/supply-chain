<?php
declare(strict_types=1);

// Database migrations. They run automatically (once) on the first request after
// new files are uploaded, so updates don't need install.php. Each step must be
// safe to re-run.

const DB_VERSION = 2;

function column_exists(string $table, string $column): bool
{
    $stmt = db()->prepare('SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?');
    $stmt->execute([$table, $column]);
    return (int) $stmt->fetchColumn() > 0;
}

function db_version(): int
{
    db()->exec('CREATE TABLE IF NOT EXISTS app_meta (meta_key VARCHAR(64) PRIMARY KEY, meta_value VARCHAR(255) NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');
    $v = db()->query("SELECT meta_value FROM app_meta WHERE meta_key = 'db_version'")->fetchColumn();
    return $v === false ? 1 : (int) $v;
}

function run_migrations(): void
{
    $version = db_version();
    if ($version >= DB_VERSION) {
        return;
    }
    $pdo = db();

    if ($version < 2) {
        // Road routes cached per supply link.
        $columns = [
            'road_geometry' => 'MEDIUMTEXT NULL',
            'road_km'       => 'DECIMAL(8,1) NULL',
            'road_minutes'  => 'INT UNSIGNED NULL',
            'route_key'     => 'CHAR(32) NULL',
            'route_error'   => 'VARCHAR(255) NULL',
            'routed_at'     => 'DATETIME NULL',
        ];
        foreach ($columns as $name => $type) {
            if (!column_exists('supply_links', $name)) {
                $pdo->exec("ALTER TABLE supply_links ADD COLUMN $name $type");
            }
        }

        // Monthly supply totals imported from the dispatch log book.
        $pdo->exec("CREATE TABLE IF NOT EXISTS supply_log (
            id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            customer_id      VARCHAR(32)  NOT NULL,
            product_id       INT UNSIGNED NULL,
            material_label   VARCHAR(80)  NOT NULL,
            month            DATE         NOT NULL,
            trucks           INT UNSIGNED NOT NULL DEFAULT 0,
            delivered_mt     DECIMAL(12,2) NOT NULL DEFAULT 0,
            dispatched_mt    DECIMAL(12,2) NOT NULL DEFAULT 0,
            loss_mt          DECIMAL(12,2) NOT NULL DEFAULT 0,
            loss_base_mt     DECIMAL(12,2) NOT NULL DEFAULT 0,
            transit_days_sum INT UNSIGNED NOT NULL DEFAULT 0,
            transit_trips    INT UNSIGNED NOT NULL DEFAULT 0,
            source_file      VARCHAR(200) NOT NULL DEFAULT '',
            imported_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_month (customer_id, month, material_label),
            FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
            FOREIGN KEY (product_id)  REFERENCES products(id)  ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

        // EUDR section on the Sustainability page (only added if not already there).
        $insert = $pdo->prepare('INSERT IGNORE INTO site_content (content_key, body) VALUES (?, ?)');
        $insert->execute(['eudr_intro', 'We follow the EU Deforestation Regulation (EUDR, Regulation (EU) 2023/1115). The wood we supply comes from farm and agro-forestry plantations, is legally harvested and can be traced back to where it was grown, so our supply does not contribute to deforestation or forest degradation.']);
        $insert->execute(['eudr_points', implode("\n", [
            'Deforestation-free | Wood comes from land that has not been deforested or degraded after 31 December 2020, the EUDR cut-off date.',
            'Legally harvested | Harvest and transport follow the applicable Indian laws, including land rights, transit permits and taxes.',
            'Traceable to the plot | We record the geolocation of sourcing plots and link each dispatch to its origin.',
            'Due-diligence ready | We keep the information our customers need for their EUDR due diligence statements.',
        ])]);
    }

    $pdo->prepare("REPLACE INTO app_meta (meta_key, meta_value) VALUES ('db_version', ?)")->execute([(string) DB_VERSION]);
}

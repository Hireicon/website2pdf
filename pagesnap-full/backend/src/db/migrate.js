require('dotenv').config();
const { query } = require('./connection');
const logger = require('../utils/logger');

const migrations = [
  {
    name: '001_create_users',
    sql: `
      CREATE TABLE IF NOT EXISTS users (
        id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        email             VARCHAR(255) NOT NULL UNIQUE,
        password_hash     VARCHAR(255) NOT NULL,
        name              VARCHAR(100),
        plan              ENUM('free','pro','business') DEFAULT 'free',
        conversions_today INT DEFAULT 0,
        last_reset_at     DATETIME,
        email_verified    BOOLEAN DEFAULT FALSE,
        stripe_customer_id VARCHAR(64),
        created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at        DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: '002_create_conversions',
    sql: `
      CREATE TABLE IF NOT EXISTS conversions (
        id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id       BIGINT UNSIGNED NULL,
        original_url  TEXT NOT NULL,
        page_title    VARCHAR(255),
        storage_path  VARCHAR(512) NOT NULL,
        file_size_kb  INT,
        format        ENUM('A4','Letter','A3') DEFAULT 'A4',
        reader_mode   BOOLEAN DEFAULT FALSE,
        render_ms     INT,
        status        ENUM('pending','done','error') DEFAULT 'pending',
        error_msg     TEXT,
        ip_hash       VARCHAR(64),
        created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_user_id (user_id),
        INDEX idx_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: '003_create_share_links',
    sql: `
      CREATE TABLE IF NOT EXISTS share_links (
        id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        share_id       CHAR(8) NOT NULL UNIQUE,
        conversion_id  BIGINT UNSIGNED NOT NULL,
        download_count INT DEFAULT 0,
        expires_at     DATETIME NOT NULL,
        is_active      BOOLEAN DEFAULT TRUE,
        created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversion_id) REFERENCES conversions(id) ON DELETE CASCADE,
        INDEX idx_share_id (share_id),
        INDEX idx_expires (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: '004_create_api_keys',
    sql: `
      CREATE TABLE IF NOT EXISTS api_keys (
        id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id     BIGINT UNSIGNED NOT NULL,
        key_hash    VARCHAR(255) NOT NULL UNIQUE,
        name        VARCHAR(100) DEFAULT 'Default',
        calls_today INT DEFAULT 0,
        last_used   DATETIME,
        is_active   BOOLEAN DEFAULT TRUE,
        created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: '005_create_refresh_tokens',
    sql: `
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id     BIGINT UNSIGNED NOT NULL,
        token_hash  VARCHAR(255) NOT NULL UNIQUE,
        expires_at  DATETIME NOT NULL,
        revoked     BOOLEAN DEFAULT FALSE,
        created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_token (token_hash),
        INDEX idx_user (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },
  {
    name: '006_create_migrations_table',
    sql: `
      CREATE TABLE IF NOT EXISTS _migrations (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        name       VARCHAR(255) NOT NULL UNIQUE,
        run_at     DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `,
  },
];

async function migrate() {
  logger.info('Running migrations...');

  // Create migrations table first if not exists
  await query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id     INT AUTO_INCREMENT PRIMARY KEY,
      name   VARCHAR(255) NOT NULL UNIQUE,
      run_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  const [ran] = await query('SELECT name FROM _migrations');
  const ranNames = new Set(ran.map(r => r.name));

  for (const migration of migrations) {
    if (ranNames.has(migration.name)) {
      logger.info(`  skip  ${migration.name}`);
      continue;
    }
    try {
      await query(migration.sql);
      await query('INSERT INTO _migrations (name) VALUES (?)', [migration.name]);
      logger.info(`  ✓  ${migration.name}`);
    } catch (err) {
      logger.error(`  ✗  ${migration.name}: ${err.message}`);
      process.exit(1);
    }
  }

  logger.info('Migrations complete.');
  process.exit(0);
}

migrate();

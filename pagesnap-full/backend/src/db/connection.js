const mysql = require('mysql2/promise');
const logger = require('../utils/logger');

const pool = mysql.createPool({
  host:     process.env.DB_HOST || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 3306,
  database: process.env.DB_NAME || 'pagesnap',
  user:     process.env.DB_USER || 'pagesnap',
  password: process.env.DB_PASSWORD || 'pagesnap_dev',
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_POOL_MAX) || 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  charset: 'utf8mb4',
});

// Test connection on startup
pool.getConnection()
  .then(conn => {
    logger.info('MySQL connected successfully');
    conn.release();
  })
  .catch(err => {
    logger.error('MySQL connection failed:', err.message);
    process.exit(1);
  });

/**
 * Execute a parameterised query. Always use this — never raw string SQL.
 * @param {string} sql  - SQL with ? placeholders
 * @param {Array}  params - Values matching placeholders
 * @returns {Promise<[rows, fields]>}
 */
async function query(sql, params = []) {
  try {
    const [rows, fields] = await pool.execute(sql, params);
    return [rows, fields];
  } catch (err) {
    logger.error('DB query error', { message: err.message, sql: sql.slice(0, 80) });
    throw err;
  }
}

/**
 * Run multiple queries in a transaction.
 * @param {Function} fn - async (conn) => { ... }
 */
async function transaction(fn) {
  const conn = await pool.getConnection();
  await conn.beginTransaction();
  try {
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { pool, query, transaction };

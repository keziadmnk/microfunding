const mysql = require("mysql2/promise");

let pool;

function getDbConfig(withDatabase = true) {
  const baseConfig = {
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: "utf8mb4",
  };

  if (withDatabase) {
    baseConfig.database = process.env.DB_NAME || "microfunding";
  }

  return baseConfig;
}

function getPool() {
  if (!pool) {
    pool = mysql.createPool(getDbConfig(true));
  }

  return pool;
}

async function testConnection() {
  try {
    const activePool = getPool();
    await activePool.query("SELECT 1");

    return {
      ok: true,
      database: process.env.DB_NAME || "microfunding",
    };
  } catch (error) {
    return {
      ok: false,
      database: process.env.DB_NAME || "microfunding",
      message: error.message,
    };
  }
}

module.exports = {
  getDbConfig,
  getPool,
  testConnection,
};

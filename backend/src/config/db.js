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

async function ensureUmkmBusinessColumns(activePool) {
  try {
    const [columns] = await activePool.query("SHOW COLUMNS FROM umkm_business");
    const columnNames = columns.map((c) => c.Field);

    const columnsToAdd = {
      year_established: "INT NULL",
      employee_count: "INT NULL",
      monthly_revenue: "VARCHAR(255) NULL",
      legal_documents: "TEXT NULL",
      funding_target: "BIGINT NULL",
      funding_purpose: "TEXT NULL",
      business_goals: "TEXT NULL",
    };

    for (const [colName, colType] of Object.entries(columnsToAdd)) {
      if (!columnNames.includes(colName)) {
        console.log(`[Migration] Adding column ${colName} to umkm_business table...`);
        await activePool.query(`ALTER TABLE umkm_business ADD COLUMN ${colName} ${colType}`);
      }
    }
  } catch (error) {
    console.error("[Migration Error] Failed to auto-migrate columns in umkm_business:", error);
  }
}

async function ensureFunderColumns(activePool) {
  try {
    const [columns] = await activePool.query("SHOW COLUMNS FROM funders");
    const columnNames = columns.map((c) => c.Field);

    const columnsToAdd = {
      funding_min: "BIGINT NULL",
      funding_max: "BIGINT NULL",
      investment_interests: "TEXT NULL",
      expertise_areas: "TEXT NULL",
    };

    for (const [colName, colType] of Object.entries(columnsToAdd)) {
      if (!columnNames.includes(colName)) {
        console.log(`[Migration] Adding column ${colName} to funders table...`);
        await activePool.query(`ALTER TABLE funders ADD COLUMN ${colName} ${colType}`);
      }
    }
  } catch (error) {
    console.error("[Migration Error] Failed to auto-migrate columns in funders:", error);
  }
}

async function ensureMentorColumns(activePool) {
  try {
    const [columns] = await activePool.query("SHOW COLUMNS FROM mentors");
    const columnNames = columns.map((c) => c.Field);

    const columnsToAdd = {
      achievements: "TEXT NULL",
    };

    for (const [colName, colType] of Object.entries(columnsToAdd)) {
      if (!columnNames.includes(colName)) {
        console.log(`[Migration] Adding column ${colName} to mentors table...`);
        await activePool.query(`ALTER TABLE mentors ADD COLUMN ${colName} ${colType}`);
      }
    }
  } catch (error) {
    console.error("[Migration Error] Failed to auto-migrate columns in mentors:", error);
  }
}

async function ensureMentorSessionColumns(activePool) {
  try {
    const [columns] = await activePool.query("SHOW COLUMNS FROM mentor_sessions");
    const columnNames = columns.map((c) => c.Field);

    const columnsToAdd = {
      business_problem: "TEXT NULL",
      mentoring_goal: "TEXT NULL",
      additional_message: "TEXT NULL",
    };

    for (const [colName, colType] of Object.entries(columnsToAdd)) {
      if (!columnNames.includes(colName)) {
        console.log(`[Migration] Adding column ${colName} to mentor_sessions table...`);
        await activePool.query(`ALTER TABLE mentor_sessions ADD COLUMN ${colName} ${colType}`);
      }
    }
  } catch (error) {
    console.error("[Migration Error] Failed to auto-migrate columns in mentor_sessions:", error);
  }
}

async function testConnection() {
  try {
    const activePool = getPool();
    await activePool.query("SELECT 1");
    await ensureUmkmBusinessColumns(activePool);
    await ensureFunderColumns(activePool);
    await ensureMentorColumns(activePool);
    await ensureMentorSessionColumns(activePool);

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

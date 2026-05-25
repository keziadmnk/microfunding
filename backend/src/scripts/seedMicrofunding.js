require("dotenv").config();

const bcrypt = require("bcryptjs");

const { getPool } = require("../config/db");
const sampleData = require("./seeders/sampleData");

const insertionOrder = [
  "users",
  "mentors",
  "mentor_skills",
  "umkm_owners",
  "umkm_business",
  "mentor_sessions",
  "mentor_hours_log",
  "funders",
  "fundings",
  "forums",
  "posts",
  "post_likes",
  "post_tags",
  "comments",
  "comment_replies",
  "pictures",
  "user_documents",
  "verification_logs",
];

async function clearTables(connection) {
  await connection.query("SET FOREIGN_KEY_CHECKS = 0");
  for (const table of [...insertionOrder].reverse()) {
    await connection.query(`DELETE FROM ${table}`);
  }
  await connection.query("SET FOREIGN_KEY_CHECKS = 1");
}

async function insertRows(connection, table, rows) {
  if (!rows || !rows.length) {
    return;
  }

  const keys = Object.keys(rows[0]);
  const placeholdersPerRow = `(${keys.map(() => "?").join(",")})`;
  const placeholders = rows.map(() => placeholdersPerRow).join(",");
  const values = rows.flatMap((row) => keys.map((key) => row[key] ?? null));

  const sql = `INSERT INTO ${table} (${keys.join(",")}) VALUES ${placeholders}`;
  await connection.query(sql, values);
}

function prepareSeedData(data) {
  const users = (data.users || []).map((user) => {
    const alreadyHashed = typeof user.password === "string" && user.password.startsWith("$2");

    return {
      ...user,
      password: alreadyHashed ? user.password : bcrypt.hashSync(user.password, 12),
    };
  });

  return {
    ...data,
    users,
  };
}

async function seed() {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    await clearTables(connection);

    const preparedData = prepareSeedData(sampleData);

    for (const table of insertionOrder) {
      await insertRows(connection, table, preparedData[table]);
    }

    await connection.commit();
    console.log("Seed microfunding berhasil dijalankan.");
  } catch (error) {
    await connection.rollback();
    console.error("Seed gagal:", error.message);
    process.exitCode = 1;
  } finally {
    connection.release();
    await pool.end();
  }
}

seed();

require("dotenv").config();

const fs = require("fs/promises");
const path = require("path");
const mysql = require("mysql2/promise");

const { getDbConfig } = require("../config/db");

async function run() {
  const schemaPath = path.resolve(__dirname, "../../db/microfunding_schema.sql");
  const sql = await fs.readFile(schemaPath, "utf8");

  const connection = await mysql.createConnection({
    ...getDbConfig(false),
    multipleStatements: true,
  });

  try {
    await connection.query(sql);
    console.log("Schema microfunding berhasil dibuat / diperbarui.");
  } finally {
    await connection.end();
  }
}

run().catch((error) => {
  console.error("Gagal membuat schema microfunding:", error.message);
  process.exitCode = 1;
});

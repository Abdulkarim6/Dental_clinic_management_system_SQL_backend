const fs = require("fs");
const path = require("path");
const pool = require("../config/db");

async function migrate() {
  const sql = fs.readFileSync(
    path.join(__dirname, "../../sql/001_schema.sql"), "utf8"
  );

  const statements = sql.split(";").map(s => s.trim()).filter(Boolean);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    for (const statement of statements) await connection.query(statement);
    await connection.commit();
    console.log("MySQL migration completed.");
  } catch (error) {
    await connection.rollback();
    console.error("Migration failed:", error.message);
    process.exitCode = 1;
  } finally {
    connection.release();
    await pool.end();
  }
}

migrate();

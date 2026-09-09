const fs = require("fs");
const path = require("path");
const pool = require("./config/db");

const sqlPath = path.join(__dirname, "../sql/002_create_patient.sql");
const sql = fs.readFileSync(sqlPath, "utf8");

pool
  .query(sql)
  .then(() => {
    console.log("Tables created successfully");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });

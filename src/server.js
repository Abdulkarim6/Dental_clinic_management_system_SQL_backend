require("dotenv").config();
const app = require("./app");
const pool = require("./config/db");

const PORT = Number(process.env.PORT || 5000);

async function start() {
  try {
    const c = await pool.getConnection();
    await c.ping();
    c.release();

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (e) {
    console.error("MySQL connection failed:", e.message);
    process.exit(1);
  }
}

start();

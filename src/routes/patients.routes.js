const express = require("express");
const pool = require("../config/db");
const bcrypt = require("bcryptjs");

const router = express.Router();

async function parsePatientBody(body) {
  const { password} = body;

  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  return {
    ...body,
    password: hashedPassword,
    role: "patient",
  };
}

/* Create patient */
router.post("/register", async (req, res) => {
  try {
    const patient = await parsePatientBody(req?.body);

    const [result] = await pool.query(
      `INSERT INTO patients (name, email, password, role) VALUES (?, ?, ?, ?)`,
      [patient.name, patient.email, patient.password, patient.role]
    );

    // const [rows] = await pool.query(
    //   "SELECT id, name, email, role FROM patients WHERE id=?",
    //   [result.insertId]
    // );

    res.status(201).json({
      message: "Patient created successfully",
    });
  } catch (error) {
    console.error(error.Error);
    if (error.code === "ER_DUP_ENTRY") {
      const errorMsg = error.message.toLowerCase();

      if (errorMsg.includes("email")) {
        return res.status(400).json({
          success: false,
          message: "Email already Exists!",
        });
      }
    } else {
      res.status(500).json({
        message: error.message || "Failed to create patient account",
      });
    }
  }
});

/* Get all patients */
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM patients ORDER BY id DESC");
    res.status(200).json(rows);
  } catch (error) {
    res
      .status(500)
      .json({ message: error.message || "Failed to fetch patients" });
  }
});

/* get singel patient */
router.get("/:id", async (req, res) => {
  try {
    const patientId = req.params.id;
    const [result] = await pool.query("SELECT * FROM patients WHERE id = ?", [
      patientId,
    ]);
    res.status(200).json(result[0]);
  } catch (error) {
    res
      .status(500)
      .json({ message: error.message || "Failed to load the patient" });
  }
});
/* Delete patient */
router.delete("/:id", async (req, res) => {
  try {
    const patientId = req.params.id;
    const [result] = await pool.query("DELETE FROM patients WHERE id = ?", [
      patientId,
    ]);

    res.status(200).json({ message: "Patient deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: error.message || "Failed to delete patient" });
  }
});




router.use((error, req, res, next) => {
  res
    .status(400)
    .json({ message: error.message || "Something went wrong, Try again" });
});

module.exports = router;

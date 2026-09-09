const express = require("express");
const pool = require("../config/db");
const bcrypt = require("bcryptjs");

const router = express.Router();

async function parsePatientBody(body) {
  const { name, email, password, role } = body;

  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  return {
    name,
    email,
    password: hashedPassword,
    role: role || "patient",
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

    const [rows] = await pool.query(
      "SELECT id, name, email, role FROM patients WHERE id=?",
      [result.insertId]
    );

    res.status(201).json({
      message: "Patient created successfully",
      patient: rows[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: error.message || "Failed to create patient account",
    });
  }
});


router.use((error, req, res, next) => {
  res.status(400).json({ message: error.message || "Upload error" });
});

module.exports = router;

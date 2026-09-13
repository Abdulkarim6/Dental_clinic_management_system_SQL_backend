const express = require("express");
const pool = require("../config/db");
const bcrypt = require("bcryptjs");

const router = express.Router();

async function parsePatientBody(body) {
  const { password, role } = body;

  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  return {
    ...body,
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

router.use((error, req, res, next) => {
  res
    .status(400)
    .json({ message: error.message || "Something went wrong, Try again" });
});

module.exports = router;

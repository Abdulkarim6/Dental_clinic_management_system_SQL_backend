const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

const router = express.Router();

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // const sql = `
    //   SELECT * FROM admins WHERE email = ?
    // `;
    const sql = `
      SELECT id, name, email, password as password_hash, 'doctor' AS role FROM doctors WHERE email = ?
      UNION ALL
      SELECT id, name, email, password as password_hash, 'patient' AS role FROM patients WHERE email = ?
      LIMIT 1
    `;

    const [rows] = await pool.query(sql, [email, email]);

    if (rows.length === 0) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const user = rows[0];
    console.log("user:", user);

    // password check
    const isMatch = await bcrypt.compare(password, user?.password_hash);

    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // JWT তৈরি
    const token = jwt.sign(
      {
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    res.status(200).send({
      message: "Login successful",
      id: user.id,
      name: user.name,
      token,
      role: user.role,
      email: user.email
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      message: "Server error",
    });
  }
});

module.exports = router;

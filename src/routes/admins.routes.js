const express = require("express");
const pool = require("../config/db");
const bcrypt = require("bcryptjs");

const router = express.Router();

async function parseAdminBody(body) {
  const { password } = body;

  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  return {
    ...body,
    password: hashedPassword,
    role: "admin",
  };
}

router.post("/", async (req, res) => {
  try {
    const admin = await parseAdminBody(req.body);

    const [result] = await pool.query(
      `INSERT INTO admins
   (name, phone, email, password, description)
   VALUES (?, ?, ?, ?, ?)`,
      [
        admin.name,
        admin.phone,
        admin.email,
        admin.password,
        admin.description,
      ]
    );

    //checks insert status
    if (!result || !result.insertId) {
      return res.status(400).json({
        success: false,
        message: "Failed to create admin",
      });
    }

    res.status(201).json({
      message: "Admin created successfully",
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      const errorMsg = error.message.toLowerCase();

      if (errorMsg.includes("email")) {
        return res.status(400).json({
          success: false,
          message: "Email already Exists!",
        });
      }
    } else {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to create admin",
      });
    }
  }
});

//Global Error handler
router.use((error, req, res, next) => {
  console.log(error);
  res.status(400).json({ message: error.message || "Something went wrong" });
});

module.exports = router;

const express = require("express");
const router = express.Router();

const pool = require("../config/db");
const authenticate = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");

// =====================================================
// Doctor: Add Treatment
// =====================================================

router.post("/", authenticate, requireRole("doctor"), async (req, res) => {
  try {
    const { appointment_id, diagnosis, treatment_details, notes } = req.body;

    if (!appointment_id || !diagnosis || !treatment_details) {
      return res.status(400).json({
        message: "Required fields are missing",
      });
    }

    const doctor_id = req.user.id;

    const [appointmentRows] = await pool.query(
      `
        SELECT
          appointment_id,
          patient_id,
          doctor_id,
          status
        FROM appointments
        WHERE appointment_id = ?
        AND doctor_id = ?
        `,
      [appointment_id, doctor_id]
    );

    if (appointmentRows.length === 0) {
      return res.status(403).json({
        message: "You are not assigned to this appointment",
      });
    }

    const appointment = appointmentRows[0];

    // -------------------------------------------------
    // Add treatment
    // -------------------------------------------------

    await pool.query(
      `
        INSERT INTO treatments
        (
          appointment_id,
          diagnosis,
          treatment_details,
          notes
        )
        VALUES (?, ?, ?, ?)
        `,
      [appointment_id, diagnosis, treatment_details, notes || null]
    );

    // Appointment completed
    await pool.query(
      `
        UPDATE appointments
        SET status = 'completed'
        WHERE appointment_id = ?
        `,
      [appointment_id]
    );

    res.status(201).json({
      message: "Treatment added successfully",
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "Treatment already exists for this appointment",
      });
    }

    console.error("Add treatment error:", error);

    res.status(500).json({
      message: "Failed to add treatment",
    });
  }
});




module.exports = router;

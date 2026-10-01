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


// =====================================================
// Patient: My Treatment History
// =====================================================

router.get("/my", authenticate, requireRole("patient"), async (req, res) => {
  try {
    const patient_id = req.user.id;

    const [rows] = await pool.query(
      `
        SELECT
    t.treatment_id,
    t.diagnosis,
    t.treatment_details,
    t.notes,
    t.created_at,

    t.appointment_id,

    (SELECT a.appointment_date
     FROM appointments a
     WHERE a.appointment_id = t.appointment_id) AS appointment_date,

    (SELECT a.appointment_time
     FROM appointments a
     WHERE a.appointment_id = t.appointment_id) AS appointment_time,

    (SELECT a.service_name
     FROM appointments a
     WHERE a.appointment_id = t.appointment_id) AS service_name,

    (SELECT a.doctor_id
     FROM appointments a
     WHERE a.appointment_id = t.appointment_id) AS doctor_id,

    (SELECT d.name
     FROM doctors d
     WHERE d.id = (
         SELECT a.doctor_id
         FROM appointments a
         WHERE a.appointment_id = t.appointment_id
     )
    ) AS doctor_name,

    (SELECT d.specialization
     FROM doctors d
     WHERE d.id = (
         SELECT a.doctor_id
         FROM appointments a
         WHERE a.appointment_id = t.appointment_id
     )
    ) AS specialization

FROM treatments t

WHERE t.appointment_id IN (
    SELECT a.appointment_id
    FROM appointments a
    WHERE a.patient_id = ?
)

ORDER BY t.created_at DESC;
        `,
      [patient_id]
    );

    res.json(rows);
  } catch (error) {
    console.error("Treatment history error:", error);

    res.status(500).json({
      message: "Failed to load treatment history",
    });
  }
});




module.exports = router;

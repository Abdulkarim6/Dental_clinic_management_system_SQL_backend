const express = require("express");
const router = express.Router();

const pool = require("../config/db");
const authenticate = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");

const TIME_SLOTS = [
  "08:00:00",
  "08:30:00",
  "09:00:00",
  "09:30:00",
  "10:00:00",
  "10:30:00",
  "11:00:00",
  "11:30:00",
  "12:00:00",
  "14:00:00",
  "14:30:00",
  "15:00:00",
  "15:30:00",
  "16:00:00",
  "16:30:00",
  "17:00:00",
];

// Available slots
router.get("/available-slots", async (req, res) => {
  try {
      const { doctor_id, date } = req.query;
      console.log(doctor_id, date);

    if (!doctor_id || !date) {
      return res.status(400).json({
        message: "Doctor and date are required",
      });
    }

    const [rows] = await pool.query(
      `
      SELECT TIME_FORMAT(appointment_time, '%H:%i:%s') AS appointment_time
      FROM appointments
      WHERE doctor_id = ?
      AND appointment_date = ?
      AND status IN ('pending', 'confirmed')
      `,
      [doctor_id, date]
    );

    const bookedSlots = rows.map((row) => row.appointment_time);

    const result = TIME_SLOTS.map((slot) => ({
      time: slot,
      available: !bookedSlots.includes(slot),
    }));

    res.json(result);
  } catch (error) {
    console.error("Available slots error:", error);

    res.status(500).json({
      message: "Failed to load available slots",
    });
  }
});

// Create appointment
router.post("/", authenticate, requireRole("patient"), async (req, res) => {
  try {
    const {
      doctor_id,
      service_name,
      appointment_date,
      appointment_time,
      reason,
    } = req.body;

    console.log(req.body);

    if (!doctor_id || !service_name || !appointment_date || !appointment_time) {
      return res.status(400).json({
        message: "Required fields are missing",
      });
    }

    // JWT থেকে patient id
    const patient_id = req.user.id;

    // Doctor exists কিনা
    const [doctorRows] = await pool.query(
      "SELECT id, name, specialization FROM doctors WHERE id = ?",
      [doctor_id]
    );

    if (doctorRows.length === 0) {
      return res.status(404).json({
        message: "Doctor not found",
      });
    }

    // Appointment create
    await pool.query(
      `
        INSERT INTO appointments
        (
          patient_id,
          doctor_id,
          service_name,
          appointment_date,
          appointment_time,
          reason
        )
        VALUES (?, ?, ?, ?, ?, ?)
        `,
      [
        patient_id,
        doctor_id,
        service_name,
        appointment_date,
        appointment_time,
        reason || null,
      ]
    );

    res.status(201).json({
      message: "Appointment booked successfully",
    });
  } catch (error) {
    // Same doctor/date/time already booked
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "This time slot is already booked",
      });
    }

    console.error("Appointment booking error:", error);

    res.status(500).json({
      message: "Failed to book appointment",
    });
  }
});

// Patient's own appointments
router.get("/my", authenticate, requireRole("patient"), async (req, res) => {
  try {
    const patient_id = req.user.id;

    const [rows] = await pool.query(
      `
  SELECT
    a.appointment_id,
    a.service_name,
    a.appointment_date,
    a.appointment_time,
    a.reason,
    a.status,

    a.doctor_id,

    (SELECT d.name
     FROM doctors d
     WHERE d.id = a.doctor_id) AS doctor_name,

    (SELECT d.specialization
     FROM doctors d
     WHERE d.id = a.doctor_id) AS specialization

  FROM appointments a
  WHERE a.patient_id = ?
  ORDER BY a.appointment_date DESC,
           a.appointment_time DESC
  `,
      [patient_id]
    );

    
    res.json(rows);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to load appointments",
    });
  }
});

//loads all appointments for admin page
router.get("/", authenticate, requireRole("admin"), async (req, res) => {
  try {
    const [rows] = await pool.query(`
        SELECT
    a.appointment_id,
    a.service_name,
    a.appointment_date,
    a.appointment_time,
    a.status,

    a.patient_id,

    (SELECT p.name
     FROM patients p
     WHERE p.id = a.patient_id) AS patient_name,

    a.doctor_id,

    (SELECT d.name
     FROM doctors d
     WHERE d.id = a.doctor_id) AS doctor_name

FROM appointments a

ORDER BY
    a.appointment_date DESC,
    a.appointment_time DESC;
      `);

    res.json(rows);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to load appointments",
    });
  }
});

module.exports = router;

const express = require("express");
const multer = require("multer");
const pool = require("../config/db");
const cloudinary = require("../config/cloudinary");
const bcrypt = require("bcryptjs");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) {
      return cb(new Error("Only JPG, PNG and WEBP images are allowed"));
    }
    cb(null, true);
  },
});

function uploadToCloudinary(file) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "dental-clinic/doctors",
        resource_type: "image",
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({ url: result?.secure_url, public_id: result?.public_id });
      }
    );

    stream.end(file.buffer);
  });
}

async function deleteFromCloudinary(publicId) {
  if (!publicId) return;
  await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
}

async function parseDoctorBody(body) {
  const {
    name,
    specialization,
    experience = 0,
    description,
    phone,
    email,
    password,
  } = body;

  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  return {
    name,
    specialization,
    experience: Number(experience) || 0,
    rating: null,
    description: description || null,
    phone: phone || null,
    email: email || null,
    password: hashedPassword,
  };
}

/* Create doctor */
router.post("/", upload.single("image"), async (req, res) => {
  let image = null;

  try {
    const doctor = await parseDoctorBody(req.body);
    if (!doctor.name || !doctor.specialization) {
      return res.status(400).json({
        message: "Name and specialization are required",
      });
    }

    if (doctor.rating !== null && (doctor.rating < 0 || doctor.rating > 5)) {
      return res
        .status(400)
        .json({ message: "Rating must be between 0 and 5" });
    }

    if (req.file) {
      image = await uploadToCloudinary(req.file);
    }

    const [result] = await pool.query(
      `INSERT INTO doctors
   (name, specialization, experience, rating, image_url, image_public_id, description, phone, email, password)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        doctor.name,
        doctor.specialization,
        doctor.experience,
        doctor.rating,
        image?.url || null,
        image?.public_id || null,
        doctor.description,
        doctor.phone,
        doctor.email,
        doctor.password,
      ]
    );

    const [rows] = await pool.query("SELECT * FROM doctors WHERE id=?", [
      result.insertId,
    ]);

    res.status(201).json({
      message: "Doctor created successfully",
      doctor: rows[0],
    });
  } catch (error) {
    if (image?.public_id) {
      await deleteFromCloudinary(image.public_id).catch(() => {});
    }

    console.error(error);
    res.status(error.code === "ER_DUP_ENTRY" ? 409 : 500).json({
      message:
        error.code === "ER_DUP_ENTRY"
          ? "Email already exists"
          : error.message || "Failed to create doctor",
    });
  }
});

/* Get all doctors */
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM doctors");
    res.status(200).json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to fetch doctors" });
  }
});


router.use((error, req, res, next) => {
  res.status(400).json({ message: error.message || "Upload error" });
});

module.exports = router;

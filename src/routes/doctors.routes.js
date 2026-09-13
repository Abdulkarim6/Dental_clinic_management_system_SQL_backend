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

//convert to hashing password
async function parseDoctorBody(body) {
  const { password } = body;

  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  return {
    ...body,
    password: hashedPassword,
  };
}

/* Create doctor */
router.post("/", upload.single("image"), async (req, res) => {
  let image = null;

  try {
    const doctor = await parseDoctorBody(req.body);

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

    //checks insert status
    if (!result || !result.insertId) {
      return res.status(400).json({
        success: false,
        message: "Failed to create doctor",
      });
    }

    res.status(201).json({
      message: "Doctor created successfully",
    });
  } catch (error) {
    if (image?.public_id) {
      await deleteFromCloudinary(image.public_id).catch(() => {});
    }

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
        message: error.message || "Failed to create doctor",
      });
    }
  }
});

/* Get all doctors */
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM doctors");
    res.status(200).json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to fetch doctors" });
  }
});

/* Delete doctor by id */
router.delete("/:id", async (req, res) => {
    try {
        const doctorId = req.params.id;
        
        
        const [result] = await pool.query("DELETE FROM doctors WHERE id = ?", [doctorId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Doctor not found" });
        }

        res.status(200).json({ message: "Doctor deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message || "Failed to delete doctor" });
    }
});


//Global Error handler
router.use((error, req, res, next) => {
  console.log(error);
  res.status(400).json({ message: error.message || "Upload error" });
});

module.exports = router;

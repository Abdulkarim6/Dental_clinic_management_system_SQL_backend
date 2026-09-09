const express = require("express");
const cors = require("cors");
require("dotenv").config();

const doctorRoutes = require("./routes/doctors.routes");
const patinetRoutes = require("./routes/patients.routes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "Dental Clinic API is running" });
});

app.use("/api/doctors", doctorRoutes);
app.use("/api/patients", patinetRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

module.exports = app;

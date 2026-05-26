const cors = require("cors");
const express = require("express");
const path = require("path");

const authRoutes = require("./routes/authRoutes");
const profileRoutes = require("./routes/profileRoutes");
const funderProfileRoutes = require("./routes/funderProfileRoutes");
const fundingRoutes = require("./routes/fundingRoutes");
const mentorRoutes = require("./routes/mentorRoutes");
const aiRoutes = require("./routes/aiRoutes");
const { testConnection } = require("./src/config/db");

const app = express();

app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ limit: "5mb", extended: true }));

// Serve static uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/funder-profile", funderProfileRoutes);
app.use("/api/funding", fundingRoutes);
app.use("/api/mentor", mentorRoutes);
app.use("/api/ai", aiRoutes);

app.get("/api/health", async (_req, res) => {
	const dbStatus = await testConnection();

	res.status(dbStatus.ok ? 200 : 503).json({
		service: "irex-microfun-backend",
		status: dbStatus.ok ? "ok" : "degraded",
		database: dbStatus,
	});
});

app.use((error, _req, res, _next) => {
	console.error(error);
	res.status(500).json({ message: "Internal server error" });
});

module.exports = app;

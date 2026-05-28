const cors = require("cors");
const express = require("express");
const path = require("path");

const authRoutes = require("./routes/authRoutes");
const profileRoutes = require("./routes/profileRoutes");
const funderProfileRoutes = require("./routes/funderProfileRoutes");
const fundingRoutes = require("./routes/fundingRoutes");
const mentorRoutes = require("./routes/mentorRoutes");
const mentorsRoutes = require("./routes/mentorsRoutes");
const mentoringRoutes = require("./routes/mentoringRoutes");
const aiRoutes = require("./routes/aiRoutes");
const forumRoutes = require("./routes/forumRoutes");
const adminRoutes = require("./routes/adminRoutes");
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
app.use("/api/mentors", mentorsRoutes);
app.use("/api/mentoring", mentoringRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/forum", forumRoutes);
app.use("/api/admin", adminRoutes);

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
	if (error.code === "LIMIT_FILE_SIZE") {
		return res.status(400).json({ message: "Ukuran file maksimal 10MB." });
	}
	if (error.message === "Format file tidak didukung untuk pengumpulan task.") {
		return res.status(400).json({ message: error.message });
	}
	if (error.message === "Format file materi tidak didukung.") {
		return res.status(400).json({ message: error.message });
	}
	res.status(500).json({ message: "Internal server error" });
});

module.exports = app;

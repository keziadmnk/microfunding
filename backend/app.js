const cors = require("cors");
const express = require("express");

const authRoutes = require("./routes/authRoutes");
const { testConnection } = require("./src/config/db");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);

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

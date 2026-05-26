const path = require("path");

require("dotenv").config({ path: path.join(__dirname, ".env") });

const app = require("./app");
const { testConnection } = require("./src/config/db");

const port = Number(process.env.PORT || 4000);

async function start() {
	const dbStatus = await testConnection();

	if (!dbStatus.ok) {
		console.error(`Database connection failed: ${dbStatus.message}`);
	}

	app.listen(port, () => {
		console.log(`Backend running on http://localhost:${port}`);
	});
}

start().catch((error) => {
	console.error("Failed to start backend:", error);
	process.exitCode = 1;
});

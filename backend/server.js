const path = require("path");
const http = require("http");

require("dotenv").config({ path: path.join(__dirname, ".env") });

const app = require("./app");
const { initSocket } = require("./socket");
const { testConnection } = require("./src/config/db");

const port = Number(process.env.PORT || 4000);

async function start() {
	const dbStatus = await testConnection();
	const server = http.createServer(app);
	initSocket(server);

	if (!dbStatus.ok) {
		console.error(`Database connection failed: ${dbStatus.message}`);
	}

	server.listen(port, () => {
		console.log(`Backend running on http://localhost:${port}`);
	});
}

start().catch((error) => {
	console.error("Failed to start backend:", error);
	process.exitCode = 1;
});

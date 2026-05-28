const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");

const { getPool } = require("./src/config/db");

let io = null;

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || true,
      methods: ["GET", "POST"],
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Unauthorized"));

    try {
      socket.user = jwt.verify(token, process.env.JWT_SECRET || "microfun-dev-secret");
      return next();
    } catch {
      return next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    socket.on("mentoring:join", async (workspaceId) => {
      if (!workspaceId) return;
      const allowed = await canAccessWorkspace(workspaceId, socket.user).catch(() => false);
      if (!allowed) return;
      socket.join(getWorkspaceRoom(workspaceId));
    });

    socket.on("mentoring:leave", (workspaceId) => {
      if (!workspaceId) return;
      socket.leave(getWorkspaceRoom(workspaceId));
    });
  });

  return io;
}

function getWorkspaceRoom(workspaceId) {
  return `mentoring-workspace:${workspaceId}`;
}

function emitWorkspaceMessage(workspaceId, message) {
  if (!io) return;
  io.to(getWorkspaceRoom(workspaceId)).emit("mentoring:message", message);
}

async function canAccessWorkspace(workspaceId, user) {
  const [rows] = await getPool().query(
    `SELECT w.id
    FROM mentoring_workspaces w
    LEFT JOIN mentor_profiles mp ON mp.id = w.mentor_id
    WHERE w.id = ? AND (w.umkm_user_id = ? OR mp.user_id = ?)
    LIMIT 1`,
    [workspaceId, user?.sub, user?.sub]
  );
  return rows.length > 0;
}

module.exports = {
  emitWorkspaceMessage,
  initSocket,
};

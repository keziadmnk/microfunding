const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const { getPool } = require("../src/config/db");

const roleMap = {
  msme: "umkm_owner",
  funder: "funder",
  mentor: "mentor",
};

function createToken(user, rememberMe = false) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    },
    process.env.JWT_SECRET || "microfun-dev-secret",
    { expiresIn: rememberMe ? "30d" : "1d" }
  );
}

async function login(req, res) {
  const { email, password, rememberMe = false } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ message: "Email dan password wajib diisi" });
  }

  const [rows] = await getPool().query(
    "SELECT id, name, email, password, role FROM users WHERE email = ? LIMIT 1",
    [String(email).trim().toLowerCase()]
  );

  const user = rows[0];

  if (!user) {
    return res.status(401).json({ message: "Email atau password salah" });
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    return res.status(401).json({ message: "Email atau password salah" });
  }

  const token = createToken(user, Boolean(rememberMe));

  return res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
}

async function register(req, res) {
  const { name, email, password, confirmPassword, role, rememberMe = true } = req.body || {};

  if (!name || !email || !password || !confirmPassword || !role) {
    return res.status(400).json({ message: "Semua field wajib diisi" });
  }

  if (password.length < 8) {
    return res.status(400).json({ message: "Password minimal 8 karakter" });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: "Password dan konfirmasi password tidak sama" });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const normalizedName = String(name).trim();
  const mappedRole = roleMap[String(role).trim().toLowerCase()];

  if (!mappedRole) {
    return res.status(400).json({ message: "Role tidak valid" });
  }

  const connection = await getPool().getConnection();

  try {
    const [existingUsers] = await connection.query(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [normalizedEmail]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({ message: "Email sudah terdaftar" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const now = new Date().toISOString().slice(0, 19).replace("T", " ");

    await connection.beginTransaction();

    const [userInsert] = await connection.query(
      "INSERT INTO users (name, email, password, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
      [normalizedName, normalizedEmail, hashedPassword, mappedRole, now, now]
    );

    const userId = userInsert.insertId;

    if (mappedRole === "umkm_owner") {
      await connection.query(
        "INSERT INTO umkm_owners (user_id, verified, created_at, updated_at) VALUES (?, 0, ?, ?)",
        [userId, now, now]
      );
    }

    if (mappedRole === "funder") {
      await connection.query(
        "INSERT INTO funders (user_id, verified, created_at, updated_at) VALUES (?, 0, ?, ?)",
        [userId, now, now]
      );
    }

    if (mappedRole === "mentor") {
      await connection.query(
        "INSERT INTO mentors (user_id, verified, created_at, updated_at) VALUES (?, 0, ?, ?)",
        [userId, now, now]
      );
    }

    await connection.commit();

    const [createdRows] = await connection.query(
      "SELECT id, name, email, role FROM users WHERE id = ? LIMIT 1",
      [userId]
    );

    const createdUser = createdRows[0];
    const token = createToken(createdUser, Boolean(rememberMe));

    return res.status(201).json({
      token,
      user: createdUser,
    });
  } catch (error) {
    await connection.rollback();
    return res.status(500).json({ message: error.message || "Gagal membuat akun" });
  } finally {
    connection.release();
  }
}

async function me(req, res) {
  const userId = req.user?.sub;

  const [rows] = await getPool().query(
    "SELECT id, name, email, role, phone, address, bio, profile_photo, created_at, updated_at FROM users WHERE id = ? LIMIT 1",
    [userId]
  );

  const user = rows[0];

  if (!user) {
    return res.status(404).json({ message: "User tidak ditemukan" });
  }

  return res.json({ user });
}

module.exports = {
  login,
  register,
  me,
};

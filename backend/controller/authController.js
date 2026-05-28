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
  const { name, email, password, confirmPassword, role, rememberMe = true, umkmProfile = null } = req.body || {};

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

  if (mappedRole === "umkm_owner") {
    const profile = umkmProfile || {};
    if (!profile.businessName || !profile.category || !profile.location || !profile.description) {
      return res.status(400).json({ message: "Nama UMKM, kategori, lokasi, dan deskripsi UMKM wajib diisi." });
    }

    if (profile.category === "lainnya" && !profile.otherCategory) {
      return res.status(400).json({ message: "Kategori lainnya wajib diisi." });
    }

    if (String(profile.description).length > 1000) {
      return res.status(400).json({ message: "Deskripsi UMKM maksimal 1000 karakter." });
    }
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
      await ensureUmkmRegisterColumns(connection);

      const profile = umkmProfile || {};
      const [ownerInsert] = await connection.query(
        "INSERT INTO umkm_owners (user_id, npwp, verified, created_at, updated_at) VALUES (?, ?, 0, ?, ?)",
        [userId, profile.npwp || null, now, now]
      );

      await connection.query(
        `INSERT INTO umkm_business
          (owner_id, name, category, other_category, location, latitude, longitude, description, year_established, employee_count, monthly_revenue, legal_documents, verified, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
        [
          ownerInsert.insertId,
          String(profile.businessName || "").trim(),
          profile.category,
          profile.otherCategory || null,
          profile.location,
          parseNullableNumber(profile.latitude),
          parseNullableNumber(profile.longitude),
          String(profile.description || "").trim(),
          parseNullableInteger(profile.yearEstablished),
          parseNullableInteger(profile.employeeCount),
          profile.monthlyRevenue || null,
          JSON.stringify(Array.isArray(profile.legalDocuments) ? profile.legalDocuments : []),
          now,
          now,
        ]
      );

      await connection.query(
        "UPDATE users SET address = ?, updated_at = ? WHERE id = ?",
        [profile.address || null, now, userId]
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
      `SELECT
        u.id,
        u.name,
        u.email,
        u.role,
        COALESCE(o.verified, 0) AS ownerVerified,
        COALESCE(b.verified, 0) AS businessVerified
      FROM users u
      LEFT JOIN umkm_owners o ON o.user_id = u.id
      LEFT JOIN umkm_business b ON b.owner_id = o.id
      WHERE u.id = ?
      LIMIT 1`,
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

  await ensureUserProfileColumns();
  await ensureUmkmRegisterColumns();

  const [rows] = await getPool().query(
    `SELECT
      u.id,
      u.name,
      u.email,
      u.role,
      u.phone,
      u.location,
      u.address,
      u.latitude,
      u.longitude,
      u.bio,
      u.profile_photo,
      u.created_at,
      u.updated_at,
      COALESCE(o.verified, 0) AS ownerVerified,
      COALESCE(b.verified, 0) AS businessVerified
    FROM users u
    LEFT JOIN umkm_owners o ON o.user_id = u.id
    LEFT JOIN umkm_business b ON b.owner_id = o.id
    WHERE u.id = ?
    LIMIT 1`,
    [userId]
  );

  const user = rows[0];

  if (!user) {
    return res.status(404).json({ message: "User tidak ditemukan" });
  }

  return res.json({ user });
}

async function ensureUmkmRegisterColumns(connection = getPool()) {
  const [ownerColumns] = await connection.query("SHOW COLUMNS FROM umkm_owners");
  const ownerExisting = new Set(ownerColumns.map((column) => column.Field));
  if (!ownerExisting.has("npwp")) {
    await connection.query("ALTER TABLE umkm_owners ADD COLUMN npwp VARCHAR(255) NULL AFTER nik");
  }

  const [businessColumns] = await connection.query("SHOW COLUMNS FROM umkm_business");
  const businessExisting = new Set(businessColumns.map((column) => column.Field));
  const columnsToAdd = {
    other_category: "VARCHAR(255) NULL",
    latitude: "DECIMAL(10, 7) NULL",
    longitude: "DECIMAL(10, 7) NULL",
    year_established: "INT NULL",
    employee_count: "INT NULL",
    monthly_revenue: "VARCHAR(255) NULL",
    legal_documents: "TEXT NULL",
  };

  for (const [column, definition] of Object.entries(columnsToAdd)) {
    if (!businessExisting.has(column)) {
      await connection.query(`ALTER TABLE umkm_business ADD COLUMN ${column} ${definition}`);
    }
  }
}

function parseNullableInteger(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) ? number : null;
}

function parseNullableNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

async function ensureUserProfileColumns() {
  const [columns] = await getPool().query("SHOW COLUMNS FROM users");
  const existing = new Set(columns.map((column) => column.Field));

  if (!existing.has("location")) {
    await getPool().query("ALTER TABLE users ADD COLUMN location VARCHAR(255) NULL AFTER role");
  }

  if (!existing.has("latitude")) {
    await getPool().query("ALTER TABLE users ADD COLUMN latitude DECIMAL(10, 7) NULL AFTER address");
  }

  if (!existing.has("longitude")) {
    await getPool().query("ALTER TABLE users ADD COLUMN longitude DECIMAL(10, 7) NULL AFTER latitude");
  }
}

module.exports = {
  login,
  register,
  me,
};

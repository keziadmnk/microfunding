const fs = require("fs");
const path = require("path");
const { getPool } = require("../src/config/db");

function saveBase64Image(base64Str, userId) {
  const matches = base64Str.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error("Format file gambar tidak valid.");
  }

  const mimeType = matches[1];
  const base64Data = matches[2];
  const buffer = Buffer.from(base64Data, "base64");
  const sizeInMb = buffer.length / (1024 * 1024);

  if (sizeInMb > 2) {
    throw new Error("Ukuran file gambar maksimal 2MB.");
  }

  let ext = "png";
  if (mimeType.includes("jpeg") || mimeType.includes("jpg")) {
    ext = "jpg";
  } else if (mimeType.includes("gif")) {
    ext = "gif";
  }

  const filename = `profile_${userId}_${Date.now()}.${ext}`;
  const uploadsDir = path.join(__dirname, "..", "uploads");

  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const filepath = path.join(uploadsDir, filename);
  fs.writeFileSync(filepath, buffer);

  return `/uploads/${filename}`;
}

async function getFunderProfile(req, res) {
  const userId = req.user?.sub;
  const userRole = req.user?.role;

  if (userRole !== "funder") {
    return res.status(403).json({ message: "Hanya Funder yang dapat mengakses profil ini." });
  }

  try {
    await ensureUserCoordinateColumns();
    const [userRows] = await getPool().query(
      `SELECT id, name, email, email_verified_at, phone, location, address, latitude, longitude, bio, profile_photo
       FROM users WHERE id = ? LIMIT 1`,
      [userId]
    );
    const dbUser = userRows[0];

    if (!dbUser) {
      return res.status(404).json({ message: "Profil akun user tidak ditemukan." });
    }

    const [funderRows] = await getPool().query(
      "SELECT * FROM funders WHERE user_id = ? LIMIT 1",
      [userId]
    );

    let funder = funderRows[0];
    const now = new Date().toISOString().slice(0, 19).replace("T", " ");

    if (!funder) {
      const [insertResult] = await getPool().query(
        "INSERT INTO funders (user_id, verified, created_at, updated_at) VALUES (?, 0, ?, ?)",
        [userId, now, now]
      );

      const [newFunders] = await getPool().query(
        "SELECT * FROM funders WHERE id = ? LIMIT 1",
        [insertResult.insertId]
      );
      funder = newFunders[0];
    }

    return res.json({
      profile: {
        userId,
        funderId: funder.id,
        name: dbUser.name,
        email: dbUser.email,
        email_verified_at: dbUser.email_verified_at,
        phone: dbUser.phone,
        location: dbUser.location,
        address: dbUser.address,
        latitude: dbUser.latitude,
        longitude: dbUser.longitude,
        bio: dbUser.bio,
        profile_photo: dbUser.profile_photo,
        organization_name: funder.organization_name,
        verified: funder.verified,
        funding_min: funder.funding_min,
        funding_max: funder.funding_max,
        investment_interests: parseJsonArray(funder.investment_interests),
        expertise_areas: parseJsonArray(funder.expertise_areas),
      },
    });
  } catch (error) {
    console.error("Error in getFunderProfile:", error);
    return res.status(500).json({ message: "Gagal mengambil profil funder.", error: error.message });
  }
}

async function updateFunderProfile(req, res) {
  const userId = req.user?.sub;
  const userRole = req.user?.role;

  if (userRole !== "funder") {
    return res.status(403).json({ message: "Hanya Funder yang dapat memperbarui profil ini." });
  }

  const {
    name,
    phone = null,
    location = null,
    address = null,
    latitude = null,
    longitude = null,
    bio = null,
    profile_photo = null,
    funding_min = null,
    funding_max = null,
    investment_interests = [],
    expertise_areas = [],
  } = req.body || {};

  if (!name || !String(name).trim()) {
    return res.status(400).json({ message: "Nama lengkap wajib diisi." });
  }

  if (bio && String(bio).length > 1000) {
    return res.status(400).json({ message: "Bio maksimal 1000 karakter." });
  }

  const connection = await getPool().getConnection();
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");

  try {
    await connection.beginTransaction();
    await ensureUserCoordinateColumns(connection);

    const [userRows] = await connection.query(
      "SELECT profile_photo FROM users WHERE id = ? LIMIT 1",
      [userId]
    );
    const dbUser = userRows[0];

    if (!dbUser) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ message: "Profil akun user tidak ditemukan." });
    }

    const [funderRows] = await connection.query(
      "SELECT id FROM funders WHERE user_id = ? LIMIT 1",
      [userId]
    );
    let funder = funderRows[0];

    if (!funder) {
      const [insertResult] = await connection.query(
        "INSERT INTO funders (user_id, verified, created_at, updated_at) VALUES (?, 0, ?, ?)",
        [userId, now, now]
      );
      funder = { id: insertResult.insertId };
    }

    let savedPhotoPath = dbUser.profile_photo;
    if (profile_photo && String(profile_photo).startsWith("data:image/")) {
      try {
        savedPhotoPath = saveBase64Image(profile_photo, userId);
      } catch (uploadError) {
        await connection.rollback();
        connection.release();
        return res.status(400).json({ message: uploadError.message });
      }
    } else if (profile_photo === null || profile_photo === "") {
      savedPhotoPath = null;
    }

    await connection.query(
      `UPDATE users SET
        name = ?,
        phone = ?,
        location = ?,
        address = ?,
        latitude = ?,
        longitude = ?,
        bio = ?,
        profile_photo = ?,
        updated_at = ?
      WHERE id = ?`,
      [
        String(name).trim(),
        phone || null,
        location || null,
        address || null,
        parseCoordinate(latitude),
        parseCoordinate(longitude),
        bio || null,
        savedPhotoPath,
        now,
        userId,
      ]
    );

    await connection.query(
      `UPDATE funders SET
        funding_min = ?,
        funding_max = ?,
        investment_interests = ?,
        expertise_areas = ?,
        updated_at = ?
      WHERE id = ?`,
      [
        funding_min ? parseInt(funding_min, 10) : null,
        funding_max ? parseInt(funding_max, 10) : null,
        JSON.stringify(Array.isArray(investment_interests) ? investment_interests : []),
        JSON.stringify(Array.isArray(expertise_areas) ? expertise_areas : []),
        now,
        funder.id,
      ]
    );

    await connection.commit();
    connection.release();

    return res.json({
      message: "Profil funder berhasil diperbarui.",
      profilePhotoUrl: savedPhotoPath,
    });
  } catch (error) {
    try {
      await connection.rollback();
    } catch (_) {}
    connection.release();
    console.error("Error in updateFunderProfile:", error);
    return res.status(500).json({ message: "Gagal memperbarui profil funder.", error: error.message });
  }
}

function parseJsonArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

async function ensureUserCoordinateColumns(connection = getPool()) {
  const [columns] = await connection.query("SHOW COLUMNS FROM users");
  const existing = new Set(columns.map((column) => column.Field));

  if (!existing.has("location")) {
    await connection.query("ALTER TABLE users ADD COLUMN location VARCHAR(255) NULL AFTER role");
  }

  if (!existing.has("latitude")) {
    await connection.query("ALTER TABLE users ADD COLUMN latitude DECIMAL(10, 7) NULL AFTER address");
  }

  if (!existing.has("longitude")) {
    await connection.query("ALTER TABLE users ADD COLUMN longitude DECIMAL(10, 7) NULL AFTER latitude");
  }
}

function parseCoordinate(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

module.exports = {
  getFunderProfile,
  updateFunderProfile,
};

const fs = require("fs");
const path = require("path");
const { getPool } = require("../src/config/db");

// Helper to save base64 image data to disk
function saveBase64Image(base64Str, ownerId) {
  const matches = base64Str.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error("Format file gambar tidak valid.");
  }

  const mimeType = matches[1];
  const base64Data = matches[2];
  const buffer = Buffer.from(base64Data, "base64");

  // Validate size (max 2MB)
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

  const filename = `logo_${ownerId}_${Date.now()}.${ext}`;
  const uploadsDir = path.join(__dirname, "..", "uploads");

  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const filepath = path.join(uploadsDir, filename);
  fs.writeFileSync(filepath, buffer);

  return `/uploads/${filename}`;
}

async function getProfile(req, res) {
  const userId = req.user?.sub;
  const userRole = req.user?.role;

  if (userRole !== "umkm_owner") {
    return res.status(403).json({ message: "Hanya UMKM Owner yang dapat mengakses halaman ini." });
  }

  try {
    // 0. Fetch user record from users table
    const [userRows] = await getPool().query(
      "SELECT id, name, email FROM users WHERE id = ? LIMIT 1",
      [userId]
    );
    const dbUser = userRows[0];
    if (!dbUser) {
      return res.status(404).json({ message: "Profil akun user tidak ditemukan." });
    }

    // 1. Fetch umkm_owners record
    const [owners] = await getPool().query(
      "SELECT id, nik, npwp, verified FROM umkm_owners WHERE user_id = ? LIMIT 1",
      [userId]
    );

    const owner = owners[0];
    if (!owner) {
      return res.status(404).json({ message: "Profil UMKM Owner tidak ditemukan." });
    }

    // 2. Fetch umkm_business record
    const [businesses] = await getPool().query(
      "SELECT * FROM umkm_business WHERE owner_id = ? LIMIT 1",
      [owner.id]
    );

    let business = businesses[0];
    const now = new Date().toISOString().slice(0, 19).replace("T", " ");

    // 3. Create default business profile if it doesn't exist
    if (!business) {
      const defaultName = dbUser.name || "Nama UMKM Baru";
      const [insertResult] = await getPool().query(
        "INSERT INTO umkm_business (owner_id, name, category, created_at, updated_at) VALUES (?, ?, 'lainnya', ?, ?)",
        [owner.id, defaultName, now, now]
      );

      const [newBusinesses] = await getPool().query(
        "SELECT * FROM umkm_business WHERE id = ? LIMIT 1",
        [insertResult.insertId]
      );
      business = newBusinesses[0];
    }

    return res.json({
      profile: {
        userId,
        email: dbUser.email,
        ownerId: owner.id,
        nik: owner.nik,
        npwp: owner.npwp,
        verified: owner.verified, // Owner verification status
        businessId: business.id,
        name: business.name,
        category: business.category,
        other_category: business.other_category,
        description: business.description,
        location: business.location,
        logo: business.logo,
        businessVerified: business.verified, // Business status
        year_established: business.year_established,
        employee_count: business.employee_count,
        monthly_revenue: business.monthly_revenue,
        legal_documents: parseLegalDocuments(business.legal_documents),
        funding_target: business.funding_target,
        funding_purpose: business.funding_purpose,
        business_goals: business.business_goals,
      },
    });
  } catch (error) {
    console.error("Error in getProfile:", error);
    return res.status(500).json({ message: "Gagal mengambil data profil.", error: error.message });
  }
}

async function updateProfile(req, res) {
  const userId = req.user?.sub;
  const userRole = req.user?.role;

  if (userRole !== "umkm_owner") {
    return res.status(403).json({ message: "Hanya UMKM Owner yang dapat memperbarui profil." });
  }

  const {
    name,
    category,
    other_category = null,
    location,
    year_established = null,
    employee_count = null,
    monthly_revenue = null,
    legal_documents = [],
    description,
    logo,
    funding_target = null,
    funding_purpose = null,
    business_goals = null,
  } = req.body || {};

  // Validation
  if (!name || !category || !location || !description) {
    return res.status(400).json({ message: "Nama, Sektor/Kategori, Lokasi, dan Deskripsi wajib diisi." });
  }

  if (description.length > 1000) {
    return res.status(400).json({ message: "Deskripsi UMKM maksimal 1000 karakter." });
  }

  const connection = await getPool().getConnection();
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");

  try {
    await connection.beginTransaction();

    // 1. Get owner ID
    const [owners] = await connection.query(
      "SELECT id FROM umkm_owners WHERE user_id = ? LIMIT 1",
      [userId]
    );
    const owner = owners[0];
    if (!owner) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ message: "Profil UMKM Owner tidak ditemukan." });
    }

    // 2. Fetch current business profile
    const [businesses] = await connection.query(
      "SELECT id, logo FROM umkm_business WHERE owner_id = ? LIMIT 1",
      [owner.id]
    );
    let business = businesses[0];
    if (!business) {
      const [insertResult] = await connection.query(
        "INSERT INTO umkm_business (owner_id, name, category, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        [owner.id, name, category, now, now]
      );
      business = { id: insertResult.insertId, logo: null };
    }

    // 3. Handle logo image upload if sent as base64
    let savedLogoPath = business.logo;
    if (logo && logo.startsWith("data:image/")) {
      try {
        savedLogoPath = saveBase64Image(logo, owner.id);
      } catch (uploadError) {
        await connection.rollback();
        connection.release();
        return res.status(400).json({ message: uploadError.message });
      }
    } else if (logo === null || logo === "") {
      savedLogoPath = null;
    }

    // 4. Update umkm_business table
    const legalDocsStr = JSON.stringify(legal_documents);

    await connection.query(
      `UPDATE umkm_business SET 
        name = ?, 
        category = ?, 
        other_category = ?, 
        location = ?, 
        description = ?, 
        logo = ?, 
        year_established = ?, 
        employee_count = ?, 
        monthly_revenue = ?, 
        legal_documents = ?, 
        funding_target = ?, 
        funding_purpose = ?, 
        business_goals = ?, 
        updated_at = ? 
      WHERE owner_id = ?`,
      [
        name,
        category,
        other_category,
        location,
        description,
        savedLogoPath,
        year_established ? parseInt(year_established, 10) : null,
        employee_count ? parseInt(employee_count, 10) : null,
        monthly_revenue,
        legalDocsStr,
        funding_target ? parseFloat(funding_target) : null,
        funding_purpose,
        business_goals,
        now,
        owner.id,
      ]
    );

    await connection.commit();
    connection.release();

    return res.json({
      message: "Profil UMKM berhasil diperbarui.",
      logoUrl: savedLogoPath,
    });
  } catch (error) {
    try {
      await connection.rollback();
    } catch (_) {}
    connection.release();
    console.error("Error in updateProfile:", error);
    return res.status(500).json({ message: "Gagal memperbarui profil.", error: error.message });
  }
}

module.exports = {
  getProfile,
  updateProfile,
};

function parseLegalDocuments(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

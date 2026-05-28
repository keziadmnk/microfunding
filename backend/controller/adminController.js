const { getPool } = require("../src/config/db");

/**
 * GET /api/admin/umkms
 * Returns ALL UMKMs (pending, approved, declined) for filtering and stats.
 */
async function getAllUmkms(req, res) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Akses ditolak. Hanya admin yang dapat mengakses endpoint ini." });
  }

  try {
    const [rows] = await getPool().query(
      `SELECT
         ub.id           AS businessId,
         ub.name         AS businessName,
         ub.category,
         ub.other_category,
         ub.description,
         ub.location,
         ub.logo,
         ub.year_established,
         ub.employee_count,
         ub.monthly_revenue,
         ub.legal_documents,
         ub.funding_target,
         ub.funding_purpose,
         ub.business_goals,
         ub.verified     AS businessVerified,
         ub.created_at   AS registeredAt,
         uo.id           AS ownerId,
         uo.nik,
         uo.npwp,
         uo.verified     AS ownerVerified,
         u.id            AS userId,
         u.name          AS ownerName,
         u.email,
         u.phone,
         u.address
       FROM umkm_business ub
       JOIN umkm_owners uo ON ub.owner_id = uo.id
       JOIN users u ON uo.user_id = u.id
       ORDER BY ub.created_at DESC`
    );

    return res.json({ data: rows });
  } catch (error) {
    console.error("Error in getAllUmkms:", error);
    return res.status(500).json({ message: "Gagal mengambil data UMKM.", error: error.message });
  }
}

/**
 * GET /api/admin/umkms/pending
 * Returns all UMKMs whose verification status is pending (NULL or 0).
 * Joins users, umkm_owners, and umkm_business tables.
 */
async function getPendingUmkms(req, res) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Akses ditolak. Hanya admin yang dapat mengakses endpoint ini." });
  }

  try {
    const [rows] = await getPool().query(
      `SELECT
         ub.id           AS businessId,
         ub.name         AS businessName,
         ub.category,
         ub.other_category,
         ub.description,
         ub.location,
         ub.logo,
         ub.year_established,
         ub.employee_count,
         ub.monthly_revenue,
         ub.legal_documents,
         ub.funding_target,
         ub.funding_purpose,
         ub.business_goals,
         ub.verified     AS businessVerified,
         ub.created_at   AS registeredAt,
         uo.id           AS ownerId,
         uo.nik,
         uo.npwp,
         uo.verified     AS ownerVerified,
         u.id            AS userId,
         u.name          AS ownerName,
         u.email,
         u.phone,
         u.address
       FROM umkm_business ub
       JOIN umkm_owners uo ON ub.owner_id = uo.id
       JOIN users u ON uo.user_id = u.id
       WHERE (ub.verified IS NULL OR ub.verified = 0)
       ORDER BY ub.created_at DESC`
    );

    return res.json({ data: rows });
  } catch (error) {
    console.error("Error in getPendingUmkms:", error);
    return res.status(500).json({ message: "Gagal mengambil data UMKM pending.", error: error.message });
  }
}

/**
 * PUT /api/admin/umkms/:id/approve
 * Approves a UMKM business (sets verified = 1 on both umkm_business and umkm_owners),
 * and records an entry in verification_logs.
 */
async function approveUmkm(req, res) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Akses ditolak. Hanya admin yang dapat melakukan verifikasi." });
  }

  const businessId = parseInt(req.params.id, 10);
  if (!businessId) {
    return res.status(400).json({ message: "ID bisnis tidak valid." });
  }

  const adminUserId = req.user?.sub;
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");

  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();

    // Fetch business and owner
    const [businesses] = await connection.query(
      "SELECT id, owner_id FROM umkm_business WHERE id = ? LIMIT 1",
      [businessId]
    );
    const business = businesses[0];
    if (!business) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ message: "Data bisnis UMKM tidak ditemukan." });
    }

    // Update umkm_business.verified = 1
    await connection.query(
      "UPDATE umkm_business SET verified = 1, updated_at = ? WHERE id = ?",
      [now, businessId]
    );

    // Update umkm_owners.verified = 1
    await connection.query(
      "UPDATE umkm_owners SET verified = 1, updated_at = ? WHERE id = ?",
      [now, business.owner_id]
    );

    // Insert verification log
    await connection.query(
      `INSERT INTO verification_logs (verified_by, verified_entity_type, verified_entity_id, status, notes, created_at)
       VALUES (?, 'umkm_business', ?, 'approved', NULL, ?)`,
      [adminUserId, businessId, now]
    );

    await connection.commit();
    connection.release();

    return res.json({ message: "UMKM berhasil diverifikasi (disetujui).", businessId });
  } catch (error) {
    try { await connection.rollback(); } catch (_) {}
    connection.release();
    console.error("Error in approveUmkm:", error);
    return res.status(500).json({ message: "Gagal menyetujui UMKM.", error: error.message });
  }
}

/**
 * PUT /api/admin/umkms/:id/decline
 * Declines a UMKM business (sets verified = 2 = declined),
 * and records an entry in verification_logs.
 */
async function declineUmkm(req, res) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Akses ditolak. Hanya admin yang dapat melakukan verifikasi." });
  }

  const businessId = parseInt(req.params.id, 10);
  if (!businessId) {
    return res.status(400).json({ message: "ID bisnis tidak valid." });
  }

  const adminUserId = req.user?.sub;
  const { notes = null } = req.body || {};
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");

  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();

    // Fetch business
    const [businesses] = await connection.query(
      "SELECT id FROM umkm_business WHERE id = ? LIMIT 1",
      [businessId]
    );
    const business = businesses[0];
    if (!business) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ message: "Data bisnis UMKM tidak ditemukan." });
    }

    // Update umkm_business.verified = 2 (declined)
    await connection.query(
      "UPDATE umkm_business SET verified = 2, updated_at = ? WHERE id = ?",
      [now, businessId]
    );

    // Insert verification log
    await connection.query(
      `INSERT INTO verification_logs (verified_by, verified_entity_type, verified_entity_id, status, notes, created_at)
       VALUES (?, 'umkm_business', ?, 'declined', ?, ?)`,
      [adminUserId, businessId, notes, now]
    );

    await connection.commit();
    connection.release();

    return res.json({ message: "UMKM berhasil ditolak.", businessId });
  } catch (error) {
    try { await connection.rollback(); } catch (_) {}
    connection.release();
    console.error("Error in declineUmkm:", error);
    return res.status(500).json({ message: "Gagal menolak UMKM.", error: error.message });
  }
}

module.exports = {
  getAllUmkms,
  getPendingUmkms,
  approveUmkm,
  declineUmkm,
  getAllMentors,
  approveMentor,
  declineMentor,
  getAllFunders,
};

/* ──────────────────────────────────────────────────────────
 * MENTOR MANAGEMENT
 * ────────────────────────────────────────────────────────── */

/**
 * GET /api/admin/mentors
 * Returns all mentors regardless of verification status.
 */
async function getAllMentors(req, res) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Akses ditolak." });
  }
  try {
    const [rows] = await getPool().query(
      `SELECT
         m.id          AS mentorId,
         m.current_job,
         m.experience,
         m.about,
         m.achievements,
         m.reputation_score,
         m.verified    AS mentorVerified,
         m.created_at  AS registeredAt,
         u.id          AS userId,
         u.name,
         u.email,
         u.phone,
         u.location,
         u.address,
         u.profile_photo,
         GROUP_CONCAT(ms.skill ORDER BY ms.skill SEPARATOR ', ') AS skills
       FROM mentors m
       JOIN users u ON u.id = m.user_id
       LEFT JOIN mentor_skills ms ON ms.mentor_id = m.id
       GROUP BY m.id, m.current_job, m.experience, m.about, m.achievements,
                m.reputation_score, m.verified, m.created_at,
                u.id, u.name, u.email, u.phone, u.location, u.address, u.profile_photo
       ORDER BY m.created_at DESC`
    );
    return res.json({ data: rows });
  } catch (error) {
    console.error("Error in getAllMentors:", error);
    return res.status(500).json({ message: "Gagal mengambil data mentor.", error: error.message });
  }
}

/**
 * PUT /api/admin/mentors/:id/approve
 * Approves a mentor (sets mentors.verified = 1).
 */
async function approveMentor(req, res) {
  if (req.user?.role !== "admin") return res.status(403).json({ message: "Akses ditolak." });

  const mentorId = parseInt(req.params.id, 10);
  if (!mentorId) return res.status(400).json({ message: "ID mentor tidak valid." });

  const adminUserId = req.user?.sub;
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");

  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query("SELECT id FROM mentors WHERE id = ? LIMIT 1", [mentorId]);
    if (!rows[0]) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ message: "Mentor tidak ditemukan." });
    }
    await connection.query("UPDATE mentors SET verified = 1, updated_at = ? WHERE id = ?", [now, mentorId]);
    await connection.query(
      `INSERT INTO verification_logs (verified_by, verified_entity_type, verified_entity_id, status, notes, created_at)
       VALUES (?, 'mentor', ?, 'approved', NULL, ?)`,
      [adminUserId, mentorId, now]
    );
    await connection.commit();
    connection.release();
    return res.json({ message: "Mentor berhasil diverifikasi.", mentorId });
  } catch (error) {
    try { await connection.rollback(); } catch (_) {}
    connection.release();
    console.error("Error in approveMentor:", error);
    return res.status(500).json({ message: "Gagal menyetujui mentor.", error: error.message });
  }
}

/**
 * PUT /api/admin/mentors/:id/decline
 * Declines a mentor (sets mentors.verified = 2).
 */
async function declineMentor(req, res) {
  if (req.user?.role !== "admin") return res.status(403).json({ message: "Akses ditolak." });

  const mentorId = parseInt(req.params.id, 10);
  if (!mentorId) return res.status(400).json({ message: "ID mentor tidak valid." });

  const adminUserId = req.user?.sub;
  const { notes = null } = req.body || {};
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");

  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query("SELECT id FROM mentors WHERE id = ? LIMIT 1", [mentorId]);
    if (!rows[0]) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ message: "Mentor tidak ditemukan." });
    }
    await connection.query("UPDATE mentors SET verified = 2, updated_at = ? WHERE id = ?", [now, mentorId]);
    await connection.query(
      `INSERT INTO verification_logs (verified_by, verified_entity_type, verified_entity_id, status, notes, created_at)
       VALUES (?, 'mentor', ?, 'declined', ?, ?)`,
      [adminUserId, mentorId, notes, now]
    );
    await connection.commit();
    connection.release();
    return res.json({ message: "Mentor berhasil ditolak.", mentorId });
  } catch (error) {
    try { await connection.rollback(); } catch (_) {}
    connection.release();
    console.error("Error in declineMentor:", error);
    return res.status(500).json({ message: "Gagal menolak mentor.", error: error.message });
  }
}

/* ──────────────────────────────────────────────────────────
 * FUNDER MANAGEMENT
 * ────────────────────────────────────────────────────────── */

/**
 * GET /api/admin/funders
 * Returns all registered funders.
 */
async function getAllFunders(req, res) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Akses ditolak." });
  }
  try {
    const [rows] = await getPool().query(
      `SELECT
         f.id              AS funderId,
         f.organization_name,
         f.funding_min,
         f.funding_max,
         f.investment_interests,
         f.expertise_areas,
         f.verified        AS funderVerified,
         f.created_at      AS registeredAt,
         u.id              AS userId,
         u.name,
         u.email,
         u.phone,
         u.location,
         u.address,
         u.profile_photo
       FROM funders f
       JOIN users u ON u.id = f.user_id
       ORDER BY f.created_at DESC`
    );
    return res.json({ data: rows });
  } catch (error) {
    console.error("Error in getAllFunders:", error);
    return res.status(500).json({ message: "Gagal mengambil data funder.", error: error.message });
  }
}

const { getPool } = require("../src/config/db");

const mentorRequestSelect = `
  SELECT
    s.id,
    s.topic,
    s.scheduled_at,
    s.duration_minutes,
    s.status,
    s.business_problem,
    s.mentoring_goal,
    s.additional_message,
    s.notes,
    s.created_at,
    s.updated_at,
    u.name AS requester_name,
    u.email AS requester_email,
    u.profile_photo AS requester_photo,
    b.id AS business_id,
    b.name AS business_name,
    b.category,
    b.other_category,
    b.description AS business_description,
    b.location,
    b.logo,
    b.year_established,
    b.employee_count,
    b.monthly_revenue,
    b.funding_target,
    b.funding_purpose,
    b.business_goals,
    b.verified AS business_verified
  FROM mentor_sessions s
  JOIN umkm_owners o ON o.id = s.umkm_owner
  JOIN users u ON u.id = o.user_id
  LEFT JOIN umkm_business b ON b.owner_id = o.id
`;

async function getMentorProfile(req, res) {
  if (req.user?.role !== "mentor") {
    return res.status(403).json({ message: "Hanya Mentor yang dapat mengakses profil mentor." });
  }

  try {
    const profile = await findMentorProfileByUserId(req.user.sub);
    if (!profile) return res.status(404).json({ message: "Profil mentor tidak ditemukan." });

    return res.json({ profile });
  } catch (error) {
    console.error("Error in getMentorProfile:", error);
    return res.status(500).json({ message: "Gagal mengambil profil mentor." });
  }
}

async function updateMentorProfile(req, res) {
  if (req.user?.role !== "mentor") {
    return res.status(403).json({ message: "Hanya Mentor yang dapat mengubah profil mentor." });
  }

  const {
    name,
    current_job = "",
    experience = "",
    about = "",
    achievements = "",
    skills = [],
  } = req.body || {};

  const connection = await getPool().getConnection();

  try {
    await connection.beginTransaction();

    const [mentors] = await connection.query("SELECT id FROM mentors WHERE user_id = ? LIMIT 1", [req.user.sub]);
    const mentor = mentors[0];
    if (!mentor) {
      await connection.rollback();
      return res.status(404).json({ message: "Profil mentor tidak ditemukan." });
    }

    const now = new Date();

    if (name) {
      await connection.query("UPDATE users SET name = ?, updated_at = ? WHERE id = ?", [
        String(name).trim(),
        now,
        req.user.sub,
      ]);
    }

    await connection.query(
      `UPDATE mentors
      SET current_job = ?, experience = ?, about = ?, achievements = ?, updated_at = ?
      WHERE id = ?`,
      [current_job, experience, about, achievements, now, mentor.id]
    );

    await connection.query("DELETE FROM mentor_skills WHERE mentor_id = ?", [mentor.id]);
    const normalizedSkills = Array.isArray(skills)
      ? skills.map((skill) => String(skill).trim()).filter(Boolean)
      : [];

    for (const skill of normalizedSkills) {
      await connection.query(
        "INSERT INTO mentor_skills (mentor_id, skill, created_at, updated_at) VALUES (?, ?, ?, ?)",
        [mentor.id, skill, now, now]
      );
    }

    await connection.commit();

    const profile = await findMentorProfileByUserId(req.user.sub);
    return res.json({ message: "Profil mentor berhasil disimpan.", profile });
  } catch (error) {
    await connection.rollback();
    console.error("Error in updateMentorProfile:", error);
    return res.status(500).json({ message: "Gagal menyimpan profil mentor." });
  } finally {
    connection.release();
  }
}

async function listMentorsForUmkm(req, res) {
  if (req.user?.role !== "umkm_owner") {
    return res.status(403).json({ message: "Hanya UMKM yang dapat melihat daftar mentor." });
  }

  try {
    const [rows] = await getPool().query(
      `SELECT
        m.id,
        u.name,
        u.email,
        u.profile_photo,
        m.current_job,
        m.experience,
        m.about,
        m.achievements,
        m.reputation_score,
        m.verified,
        GROUP_CONCAT(ms.skill ORDER BY ms.skill SEPARATOR ', ') AS skills
      FROM mentors m
      JOIN users u ON u.id = m.user_id
      LEFT JOIN mentor_skills ms ON ms.mentor_id = m.id
      GROUP BY m.id, u.name, u.email, u.profile_photo, m.current_job, m.experience, m.about, m.achievements, m.reputation_score, m.verified
      ORDER BY m.verified DESC, m.reputation_score DESC, m.updated_at DESC`
    );

    return res.json({ data: rows.map(normalizeMentorRow) });
  } catch (error) {
    console.error("Error in listMentorsForUmkm:", error);
    return res.status(500).json({ message: "Gagal mengambil daftar mentor." });
  }
}

async function createMentorRequest(req, res) {
  if (req.user?.role !== "umkm_owner") {
    return res.status(403).json({ message: "Hanya UMKM yang dapat membuat request mentoring." });
  }

  const mentorId = Number(req.params.id);
  const {
    topic = "",
    scheduled_at = "",
    duration_minutes = 60,
    business_problem = "",
    mentoring_goal = "",
    additional_message = "",
    notes = "",
  } = req.body || {};

  if (!mentorId || !topic || !business_problem || !mentoring_goal || !scheduled_at) {
    return res.status(400).json({ message: "Mentor, topik, masalah bisnis, tujuan mentoring, dan jadwal wajib diisi." });
  }

  try {
    const [[owner]] = await getPool().query("SELECT id FROM umkm_owners WHERE user_id = ? LIMIT 1", [req.user.sub]);
    if (!owner) return res.status(404).json({ message: "Profil UMKM tidak ditemukan." });

    const [[mentor]] = await getPool().query("SELECT id FROM mentors WHERE id = ? LIMIT 1", [mentorId]);
    if (!mentor) return res.status(404).json({ message: "Mentor tidak ditemukan." });

    const now = new Date();
    const [result] = await getPool().query(
      `INSERT INTO mentor_sessions
        (umkm_owner, mentor_id, topic, scheduled_at, duration_minutes, status, business_problem, mentoring_goal, additional_message, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?)`,
      [
        owner.id,
        mentorId,
        topic,
        scheduled_at,
        Number(duration_minutes || 60),
        business_problem,
        mentoring_goal,
        additional_message,
        notes || additional_message,
        now,
        now,
      ]
    );

    return res.status(201).json({
      message: "Request mentoring berhasil dikirim.",
      data: { id: result.insertId },
    });
  } catch (error) {
    console.error("Error in createMentorRequest:", error);
    return res.status(500).json({ message: "Gagal mengirim request mentoring." });
  }
}

async function listMentorRequests(req, res) {
  if (req.user?.role !== "mentor") {
    return res.status(403).json({ message: "Hanya Mentor yang dapat melihat request masuk." });
  }

  try {
    const [[mentor]] = await getPool().query("SELECT id FROM mentors WHERE user_id = ? LIMIT 1", [req.user.sub]);
    if (!mentor) return res.status(404).json({ message: "Profil mentor tidak ditemukan." });

    const [rows] = await getPool().query(
      `${mentorRequestSelect}
      WHERE s.mentor_id = ?
      ORDER BY s.created_at DESC`,
      [mentor.id]
    );

    return res.json({ data: rows });
  } catch (error) {
    console.error("Error in listMentorRequests:", error);
    return res.status(500).json({ message: "Gagal mengambil request mentoring." });
  }
}

async function getMentorRequestDetail(req, res) {
  if (req.user?.role !== "mentor") {
    return res.status(403).json({ message: "Hanya Mentor yang dapat melihat detail request." });
  }

  try {
    const [[mentor]] = await getPool().query("SELECT id FROM mentors WHERE user_id = ? LIMIT 1", [req.user.sub]);
    if (!mentor) return res.status(404).json({ message: "Profil mentor tidak ditemukan." });

    const [rows] = await getPool().query(
      `${mentorRequestSelect}
      WHERE s.mentor_id = ? AND s.id = ?
      LIMIT 1`,
      [mentor.id, req.params.id]
    );

    if (!rows[0]) return res.status(404).json({ message: "Request mentoring tidak ditemukan." });

    return res.json({ data: normalizeMentorRequestRow(rows[0]) });
  } catch (error) {
    console.error("Error in getMentorRequestDetail:", error);
    return res.status(500).json({ message: "Gagal mengambil detail request mentoring." });
  }
}

async function updateMentorRequestStatus(req, res) {
  if (req.user?.role !== "mentor") {
    return res.status(403).json({ message: "Hanya Mentor yang dapat mengubah status request." });
  }

  const status = String(req.body?.status || "").trim();
  if (!["accepted", "rejected", "completed"].includes(status)) {
    return res.status(400).json({ message: "Status tidak valid." });
  }

  try {
    const [[mentor]] = await getPool().query("SELECT id FROM mentors WHERE user_id = ? LIMIT 1", [req.user.sub]);
    if (!mentor) return res.status(404).json({ message: "Profil mentor tidak ditemukan." });

    const [result] = await getPool().query(
      "UPDATE mentor_sessions SET status = ?, updated_at = ? WHERE id = ? AND mentor_id = ?",
      [status, new Date(), req.params.id, mentor.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Request mentoring tidak ditemukan." });
    }

    return res.json({ message: "Status request berhasil diperbarui." });
  } catch (error) {
    console.error("Error in updateMentorRequestStatus:", error);
    return res.status(500).json({ message: "Gagal mengubah status request." });
  }
}

async function findMentorProfileByUserId(userId) {
  const [rows] = await getPool().query(
    `SELECT
      m.id,
      u.name,
      u.email,
      u.profile_photo,
      m.current_job,
      m.experience,
      m.about,
      m.achievements,
      m.reputation_score,
      m.verified,
      GROUP_CONCAT(ms.skill ORDER BY ms.skill SEPARATOR ', ') AS skills
    FROM mentors m
    JOIN users u ON u.id = m.user_id
    LEFT JOIN mentor_skills ms ON ms.mentor_id = m.id
    WHERE u.id = ?
    GROUP BY m.id, u.name, u.email, u.profile_photo, m.current_job, m.experience, m.about, m.achievements, m.reputation_score, m.verified
    LIMIT 1`,
    [userId]
  );

  return rows[0] ? normalizeMentorRow(rows[0]) : null;
}

function normalizeMentorRow(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    profile_photo: row.profile_photo,
    current_job: row.current_job || "",
    experience: row.experience || "",
    about: row.about || "",
    achievements: row.achievements || "",
    reputation_score: row.reputation_score || 0,
    verified: Boolean(row.verified),
    skills: row.skills ? row.skills.split(", ").filter(Boolean) : [],
  };
}

function normalizeMentorRequestRow(row) {
  return {
    id: row.id,
    topic: row.topic,
    scheduledAt: row.scheduled_at,
    durationMinutes: row.duration_minutes,
    status: row.status,
    businessProblem: row.business_problem || row.notes || "",
    mentoringGoal: row.mentoring_goal || "",
    additionalMessage: row.additional_message || "",
    notes: row.notes || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    requester: {
      name: row.requester_name,
      email: row.requester_email,
      profilePhoto: row.requester_photo,
    },
    business: {
      id: row.business_id,
      name: row.business_name,
      ownerName: row.requester_name,
      category: row.other_category || row.category || "UMKM",
      description: row.business_description,
      location: row.location,
      logo: row.logo,
      yearEstablished: row.year_established,
      employeeCount: row.employee_count,
      monthlyRevenue: row.monthly_revenue,
      fundingTarget: Number(row.funding_target || 0),
      fundingPurpose: row.funding_purpose,
      businessGoals: row.business_goals,
      verified: Boolean(row.business_verified),
    },
  };
}

module.exports = {
  createMentorRequest,
  getMentorRequestDetail,
  getMentorProfile,
  listMentorRequests,
  listMentorsForUmkm,
  updateMentorProfile,
  updateMentorRequestStatus,
};

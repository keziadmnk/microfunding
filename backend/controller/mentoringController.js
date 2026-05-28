const { getPool } = require("../src/config/db");
const { emitWorkspaceMessage } = require("../socket");

const SESSION_STATUSES = ["Upcoming", "Completed", "Cancelled", "Rescheduled"];
const TASK_PRIORITIES = ["High", "Medium", "Low"];
const TASK_STATUSES = ["Pending", "In Progress", "Done", "Revision"];
const WORKSPACE_STATUSES = ["Active", "Completed", "Cancelled"];

function sendError(res, error, fallbackMessage) {
  console.error(fallbackMessage, error);
  return res.status(500).json({ message: fallbackMessage });
}

function requireRole(req, res, roles) {
  const allowed = Array.isArray(roles) ? roles : [roles];
  if (!allowed.includes(req.user?.role)) {
    res.status(403).json({ message: "Anda tidak memiliki akses untuk aksi ini." });
    return false;
  }
  return true;
}

function required(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function getRequestId(req) {
  return req.params.requestId || req.params.id;
}

function getWorkspaceId(req) {
  return req.params.workspaceId || req.params.id;
}

function getSessionId(req) {
  return req.params.sessionId || req.params.id;
}

function getTaskId(req) {
  return req.params.taskId || req.params.id;
}

function getMessageId(req) {
  return req.params.messageId || req.params.id;
}

function getProgressId(req) {
  return req.params.progressId || req.params.id;
}

function getNoteId(req) {
  return req.params.noteId || req.params.id;
}

function isWorkspaceLockedForNewItems(workspace) {
  return ["Completed", "Cancelled"].includes(workspace?.status);
}

function serializeList(value) {
  if (Array.isArray(value)) return JSON.stringify(value.map((item) => String(item).trim()).filter(Boolean));
  return value ? String(value).trim() : "";
}

function parseList(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // Fallback for comma-separated expertise values.
  }
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeMentorProfile(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    email: row.email,
    profilePhoto: row.profile_photo,
    profession: row.profession || "",
    expertise: parseList(row.expertise),
    achievements: row.achievements || "",
    experienceYears: row.experience_years,
    bio: row.bio || "",
    rating: Number(row.rating || 0),
    availability: row.availability || "",
    status: row.status || "Available",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeRequest(row) {
  if (!row) return null;
  return {
    id: row.id,
    umkmUserId: row.umkm_user_id,
    mentorId: row.mentor_id,
    topic: row.topic,
    businessProblem: row.business_problem || "",
    mentoringGoal: row.mentoring_goal || "",
    duration: row.duration || "",
    preferredSchedule: row.preferred_schedule || "",
    additionalMessage: row.additional_message || "",
    status: row.status,
    rejectionReason: row.rejection_reason || "",
    requestedAt: row.requested_at,
    respondedAt: row.responded_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    mentor: row.mentor_name
      ? {
          id: row.mentor_id,
          name: row.mentor_name,
          profession: row.mentor_profession || "",
          status: row.mentor_status || "",
          rating: Number(row.mentor_rating || 0),
        }
      : undefined,
    umkm: row.umkm_name
      ? {
          id: row.umkm_user_id,
          name: row.umkm_name,
          email: row.umkm_email,
          businessName: row.business_name || "",
          ownerName: row.owner_name || row.umkm_name,
          location: row.business_location || "",
          category: row.business_category || "",
          description: row.business_description || "",
        }
      : undefined,
    workspaceId: row.workspace_id || null,
  };
}

function normalizeWorkspace(row) {
  if (!row) return null;
  return {
    id: row.id,
    requestId: row.request_id,
    umkmUserId: row.umkm_user_id,
    mentorId: row.mentor_id,
    topic: row.topic,
    goal: row.goal || "",
    status: row.status,
    startDate: row.start_date,
    endDate: row.end_date,
    acceptanceNote: row.acceptance_note || "",
    cancellationReason: row.cancellation_reason || "",
    finalEvaluation: row.final_evaluation || "",
    finalRecommendation: row.final_recommendation || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    mentor: row.mentor_name
      ? {
          id: row.mentor_id,
          name: row.mentor_name,
          profession: row.mentor_profession || "",
          expertise: parseList(row.mentor_expertise),
        }
      : undefined,
    umkm: row.umkm_name
      ? {
          id: row.umkm_user_id,
          name: row.umkm_name,
          email: row.umkm_email,
          businessName: row.business_name || "",
          location: row.business_location || "",
          category: row.business_category || "",
          description: row.business_description || "",
        }
      : undefined,
  };
}

function normalizeTaskSubmission(row) {
  if (!row?.submission_id) return null;
  return {
    id: row.submission_id,
    taskId: row.id || row.task_id,
    workspaceId: row.workspace_id,
    note: row.submission_note || "",
    fileName: row.submission_file_name || "",
    filePath: row.submission_file_path || "",
    fileUrl: row.submission_file_path ? `/${row.submission_file_path.replace(/\\/g, "/")}` : "",
    fileMime: row.submission_file_mime || "",
    fileSize: row.submission_file_size || 0,
    submissionStatus: row.submission_status || "Submitted",
    submittedAt: row.submitted_at,
  };
}

function normalizeChatMessage(row) {
  if (!row) return null;
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    senderUserId: row.sender_user_id,
    senderRole: row.sender_role,
    senderName: row.sender_name || (row.sender_role === "mentor" ? "Mentor" : "UMKM"),
    message: row.message,
    createdAt: row.created_at,
  };
}

function normalizeWorkspaceFile(row) {
  if (!row) return null;
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    uploadedBy: row.uploaded_by,
    uploadedByName: row.uploader_name || "Mentor",
    title: row.title,
    description: row.description || "",
    fileName: row.file_name,
    filePath: row.file_path,
    fileUrl: row.file_path ? `/${row.file_path.replace(/\\/g, "/")}` : "",
    fileMime: row.file_mime || "",
    fileSize: Number(row.file_size || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function findTaskForUser(taskId, user) {
  const [[task]] = await getPool().query("SELECT * FROM mentoring_tasks WHERE id = ? LIMIT 1", [taskId]);
  if (!task) return { task: null, workspace: null };
  const workspace = await findWorkspaceForUser(task.workspace_id, user);
  if (!workspace) return { task: null, workspace: null };
  return { task, workspace };
}

function getRelativeUploadPath(file) {
  if (!file?.path) return "";
  const normalized = file.path.replace(/\\/g, "/");
  const marker = "/uploads/";
  const index = normalized.lastIndexOf(marker);
  if (index === -1) return "";
  return normalized.slice(index + 1);
}

function getDeadlineEndOfDay(value) {
  if (!value) return null;
  const date = value instanceof Date ? new Date(value) : new Date(String(value).slice(0, 10));
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(23, 59, 59, 999);
  return date;
}

async function findMentorProfileByUserId(userId, connection = getPool()) {
  const [rows] = await connection.query(
    `SELECT mp.*, u.email, u.profile_photo
    FROM mentor_profiles mp
    JOIN users u ON u.id = mp.user_id
    WHERE mp.user_id = ?
    LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

async function findWorkspaceForUser(workspaceId, user, connection = getPool()) {
  const [rows] = await connection.query(
    `SELECT
      w.*,
      mp.name AS mentor_name,
      mp.profession AS mentor_profession,
      mp.expertise AS mentor_expertise,
      u.name AS umkm_name,
      u.email AS umkm_email,
      b.name AS business_name,
      b.location AS business_location,
      COALESCE(b.other_category, b.category) AS business_category,
      b.description AS business_description
    FROM mentoring_workspaces w
    JOIN mentor_profiles mp ON mp.id = w.mentor_id
    JOIN users u ON u.id = w.umkm_user_id
    LEFT JOIN umkm_owners o ON o.user_id = u.id
    LEFT JOIN umkm_business b ON b.owner_id = o.id
    WHERE w.id = ?
    LIMIT 1`,
    [workspaceId]
  );

  const workspace = rows[0];
  if (!workspace) return null;
  if (Number(workspace.umkm_user_id) === Number(user?.sub)) return workspace;

  const mentor = await findMentorProfileByUserId(user?.sub, connection);
  if (mentor && Number(mentor.id) === Number(workspace.mentor_id)) return workspace;

  return null;
}

async function listMentorProfiles(_req, res) {
  try {
    const [rows] = await getPool().query(
      `SELECT mp.*, u.email, u.profile_photo
      FROM mentor_profiles mp
      JOIN users u ON u.id = mp.user_id
      ORDER BY mp.status = 'Available' DESC, mp.rating DESC, mp.updated_at DESC`
    );
    return res.json({ data: rows.map(normalizeMentorProfile) });
  } catch (error) {
    return sendError(res, error, "Gagal mengambil daftar mentor.");
  }
}

async function getMentorProfile(req, res) {
  try {
    const [rows] = await getPool().query(
      `SELECT mp.*, u.email, u.profile_photo
      FROM mentor_profiles mp
      JOIN users u ON u.id = mp.user_id
      WHERE mp.id = ?
      LIMIT 1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ message: "Profil mentor tidak ditemukan." });
    return res.json({ data: normalizeMentorProfile(rows[0]) });
  } catch (error) {
    return sendError(res, error, "Gagal mengambil profil mentor.");
  }
}

async function upsertMyMentorProfile(req, res) {
  if (!requireRole(req, res, "mentor")) return null;

  const {
    name = "",
    profession = "",
    expertise = [],
    achievements = "",
    experienceYears = null,
    bio = "",
    rating = 0,
    availability = "",
    status = "Available",
  } = req.body || {};

  if (!required(name)) return res.status(400).json({ message: "Nama mentor wajib diisi." });
  if (!["Available", "Busy"].includes(status)) return res.status(400).json({ message: "Status mentor tidak valid." });

  const now = new Date();

  try {
    const [[existing]] = await getPool().query("SELECT id FROM mentor_profiles WHERE user_id = ? LIMIT 1", [
      req.user.sub,
    ]);

    if (existing) {
      await getPool().query(
        `UPDATE mentor_profiles
        SET name = ?, profession = ?, expertise = ?, achievements = ?, experience_years = ?, bio = ?,
          rating = ?, availability = ?, status = ?, updated_at = ?
        WHERE id = ?`,
        [
          name,
          profession,
          serializeList(expertise),
          achievements,
          experienceYears,
          bio,
          Number(rating || 0),
          availability,
          status,
          now,
          existing.id,
        ]
      );
    } else {
      await getPool().query(
        `INSERT INTO mentor_profiles
          (user_id, name, profession, expertise, achievements, experience_years, bio, rating, availability, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          req.user.sub,
          name,
          profession,
          serializeList(expertise),
          achievements,
          experienceYears,
          bio,
          Number(rating || 0),
          availability,
          status,
          now,
          now,
        ]
      );
    }

    const profile = await findMentorProfileByUserId(req.user.sub);
    return res.json({ message: "Profil mentor berhasil disimpan.", data: normalizeMentorProfile(profile) });
  } catch (error) {
    return sendError(res, error, "Gagal menyimpan profil mentor.");
  }
}

async function createMentoringRequest(req, res) {
  if (!requireRole(req, res, "umkm_owner")) return null;

  const {
    mentorId,
    umkmUserId,
    topic = "",
    businessProblem = "",
    mentoringGoal = "",
    duration = "",
    preferredSchedule = "",
    additionalMessage = "",
  } = req.body || {};

  if (!mentorId || !required(topic) || !required(businessProblem) || !required(mentoringGoal)) {
    return res.status(400).json({ message: "Mentor, topik, masalah bisnis, dan tujuan mentoring wajib diisi." });
  }

  const requestUmkmUserId = umkmUserId || req.user.sub;
  if (Number(requestUmkmUserId) !== Number(req.user.sub)) {
    return res.status(403).json({ message: "UMKM hanya dapat membuat request untuk akunnya sendiri." });
  }

  try {
    const [[mentor]] = await getPool().query("SELECT id FROM mentor_profiles WHERE id = ? LIMIT 1", [mentorId]);
    if (!mentor) return res.status(404).json({ message: "Mentor tidak ditemukan." });

    const now = new Date();
    const [result] = await getPool().query(
      `INSERT INTO mentoring_requests
        (umkm_user_id, mentor_id, topic, business_problem, mentoring_goal, duration, preferred_schedule,
          additional_message, status, requested_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?, ?, ?)`,
      [
        requestUmkmUserId,
        mentorId,
        topic,
        businessProblem,
        mentoringGoal,
        duration,
        preferredSchedule,
        additionalMessage,
        now,
        now,
        now,
      ]
    );

    return res.status(201).json({ message: "Request mentoring berhasil dikirim.", data: { id: result.insertId } });
  } catch (error) {
    return sendError(res, error, "Gagal mengirim request mentoring.");
  }
}

async function listRequestsByUmkm(req, res) {
  if (!requireRole(req, res, "umkm_owner")) return null;

  const umkmUserId = Number(req.params.umkmUserId);
  if (umkmUserId !== Number(req.user.sub)) {
    return res.status(403).json({ message: "UMKM hanya dapat melihat request miliknya sendiri." });
  }

  try {
    const [rows] = await getPool().query(
      `SELECT
        r.*,
        mp.name AS mentor_name,
        mp.profession AS mentor_profession,
        mp.status AS mentor_status,
        mp.rating AS mentor_rating,
        w.id AS workspace_id
      FROM mentoring_requests r
      JOIN mentor_profiles mp ON mp.id = r.mentor_id
      LEFT JOIN mentoring_workspaces w ON w.request_id = r.id
      WHERE r.umkm_user_id = ?
      ORDER BY r.requested_at DESC, r.id DESC`,
      [umkmUserId]
    );
    return res.json({ data: rows.map(normalizeRequest) });
  } catch (error) {
    return sendError(res, error, "Gagal mengambil request mentoring UMKM.");
  }
}

async function listRequestsByMentor(req, res) {
  if (!requireRole(req, res, "mentor")) return null;

  try {
    const mentor = await findMentorProfileByUserId(req.user.sub);
    if (!mentor) return res.status(404).json({ message: "Profil mentor belum dibuat." });
    if (Number(mentor.id) !== Number(req.params.mentorId)) {
      return res.status(403).json({ message: "Mentor hanya dapat melihat request masuk miliknya sendiri." });
    }

    const [rows] = await getPool().query(
      `SELECT
        r.*,
        u.name AS umkm_name,
        u.email AS umkm_email,
        u.name AS owner_name,
        b.name AS business_name,
        b.location AS business_location,
        COALESCE(b.other_category, b.category) AS business_category,
        b.description AS business_description,
        w.id AS workspace_id
      FROM mentoring_requests r
      JOIN users u ON u.id = r.umkm_user_id
      LEFT JOIN umkm_owners o ON o.user_id = u.id
      LEFT JOIN umkm_business b ON b.owner_id = o.id
      LEFT JOIN mentoring_workspaces w ON w.request_id = r.id
      WHERE r.mentor_id = ?
      ORDER BY r.requested_at DESC, r.id DESC`,
      [mentor.id]
    );
    return res.json({ data: rows.map(normalizeRequest) });
  } catch (error) {
    return sendError(res, error, "Gagal mengambil request mentoring mentor.");
  }
}

async function listMyMentoringRequests(req, res) {
  if (!requireRole(req, res, "umkm_owner")) return null;

  try {
    const [rows] = await getPool().query(
      `SELECT
        r.*,
        mp.name AS mentor_name,
        mp.profession AS mentor_profession,
        mp.status AS mentor_status,
        mp.rating AS mentor_rating,
        w.id AS workspace_id
      FROM mentoring_requests r
      JOIN mentor_profiles mp ON mp.id = r.mentor_id
      LEFT JOIN mentoring_workspaces w ON w.request_id = r.id
      WHERE r.umkm_user_id = ?
      ORDER BY r.requested_at DESC, r.id DESC`,
      [req.user.sub]
    );
    return res.json({ data: rows.map(normalizeRequest) });
  } catch (error) {
    return sendError(res, error, "Gagal mengambil request mentoring Anda.");
  }
}

async function listIncomingMentoringRequests(req, res) {
  if (!requireRole(req, res, "mentor")) return null;

  try {
    const mentor = await findMentorProfileByUserId(req.user.sub);
    if (!mentor) return res.status(404).json({ message: "Profil mentor belum dibuat." });

    const [rows] = await getPool().query(
      `SELECT
        r.*,
        u.name AS umkm_name,
        u.email AS umkm_email,
        u.name AS owner_name,
        b.name AS business_name,
        b.location AS business_location,
        COALESCE(b.other_category, b.category) AS business_category,
        b.description AS business_description,
        w.id AS workspace_id
      FROM mentoring_requests r
      JOIN users u ON u.id = r.umkm_user_id
      LEFT JOIN umkm_owners o ON o.user_id = u.id
      LEFT JOIN umkm_business b ON b.owner_id = o.id
      LEFT JOIN mentoring_workspaces w ON w.request_id = r.id
      WHERE r.mentor_id = ?
      ORDER BY r.requested_at DESC, r.id DESC`,
      [mentor.id]
    );
    return res.json({ data: rows.map(normalizeRequest) });
  } catch (error) {
    return sendError(res, error, "Gagal mengambil request mentoring masuk.");
  }
}

async function respondMentoringRequest(req, res) {
  if (!requireRole(req, res, "mentor")) return null;

  const status = String(req.body?.status || "").trim();
  if (!["Accepted", "Rejected"].includes(status)) {
    return res.status(400).json({ message: "Status harus Accepted atau Rejected." });
  }

  const rejectionReason = String(req.body?.rejectionReason || "").trim();
  if (status === "Rejected" && !rejectionReason) {
    return res.status(400).json({ message: "Alasan penolakan wajib diisi." });
  }

  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();

    const mentor = await findMentorProfileByUserId(req.user.sub, connection);
    if (!mentor) {
      await connection.rollback();
      return res.status(404).json({ message: "Profil mentor belum dibuat." });
    }

    const [[request]] = await connection.query("SELECT * FROM mentoring_requests WHERE id = ? FOR UPDATE", [
      req.params.id,
    ]);
    if (!request || Number(request.mentor_id) !== Number(mentor.id)) {
      await connection.rollback();
      return res.status(404).json({ message: "Request mentoring tidak ditemukan." });
    }

    const blockedMessage = blockedRequestStatusMessage(request.status, status);
    if (blockedMessage) {
      await connection.rollback();
      return res.status(409).json({ message: blockedMessage });
    }

    const now = new Date();
    let workspace = null;

    if (status === "Rejected") {
      await connection.query(
        `UPDATE mentoring_requests
        SET status = 'Rejected', rejection_reason = ?, responded_at = ?, updated_at = ?
        WHERE id = ?`,
        [rejectionReason, now, now, request.id]
      );
    } else {
      await connection.query(
        `UPDATE mentoring_requests
        SET status = 'Accepted', rejection_reason = NULL, responded_at = ?, updated_at = ?
        WHERE id = ?`,
        [now, now, request.id]
      );

      await connection.query(
        `INSERT INTO mentoring_workspaces
          (request_id, umkm_user_id, mentor_id, topic, goal, status, start_date, end_date,
            acceptance_note, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'Active', ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          status = 'Active',
          start_date = VALUES(start_date),
          end_date = VALUES(end_date),
          acceptance_note = VALUES(acceptance_note),
          updated_at = VALUES(updated_at)`,
        [
          request.id,
          request.umkm_user_id,
          request.mentor_id,
          request.topic,
          request.mentoring_goal,
          req.body?.startDate || null,
          req.body?.endDate || null,
          req.body?.acceptanceNote || "",
          now,
          now,
        ]
      );

      const [[workspaceRow]] = await connection.query(
        "SELECT * FROM mentoring_workspaces WHERE request_id = ? LIMIT 1",
        [request.id]
      );
      workspace = workspaceRow;
    }

    await connection.commit();
    return res.json({
      message: status === "Accepted" ? "Request diterima dan workspace dibuat." : "Request berhasil ditolak.",
      data: { status, workspace: normalizeWorkspace(workspace) },
    });
  } catch (error) {
    await connection.rollback();
    return sendError(res, error, "Gagal merespons request mentoring.");
  } finally {
    connection.release();
  }
}

function blockedRequestStatusMessage(requestStatus, targetStatus) {
  if (requestStatus === "Accepted" && targetStatus === "Rejected") return "Request yang sudah Accepted tidak bisa ditolak lagi.";
  if (requestStatus === "Rejected" && targetStatus === "Accepted") return "Request yang sudah Rejected tidak bisa diterima lagi.";
  if (requestStatus === "Cancelled") return "Request yang Cancelled tidak bisa diproses lagi.";
  if (requestStatus === "Accepted" && targetStatus === "Accepted") return "Request sudah Accepted.";
  if (requestStatus === "Rejected" && targetStatus === "Rejected") return "Request sudah Rejected.";
  return null;
}

function hasFirstSession(firstSession) {
  return firstSession && Object.values(firstSession).some((value) => required(value));
}

async function acceptMentoringRequest(req, res) {
  if (!requireRole(req, res, "mentor")) return null;

  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();

    const mentor = await findMentorProfileByUserId(req.user.sub, connection);
    if (!mentor) {
      await connection.rollback();
      return res.status(404).json({ message: "Profil mentor belum dibuat." });
    }

    const [[request]] = await connection.query("SELECT * FROM mentoring_requests WHERE id = ? FOR UPDATE", [
      getRequestId(req),
    ]);
    if (!request || Number(request.mentor_id) !== Number(mentor.id)) {
      await connection.rollback();
      return res.status(404).json({ message: "Request mentoring tidak ditemukan." });
    }

    const blockedMessage = blockedRequestStatusMessage(request.status, "Accepted");
    if (blockedMessage) {
      await connection.rollback();
      return res.status(409).json({ message: blockedMessage });
    }

    const now = new Date();
    await connection.query(
      `UPDATE mentoring_requests
      SET status = 'Accepted', rejection_reason = NULL, responded_at = ?, updated_at = ?
      WHERE id = ?`,
      [now, now, request.id]
    );

    await connection.query(
      `INSERT INTO mentoring_workspaces
        (request_id, umkm_user_id, mentor_id, topic, goal, status, start_date, end_date,
          acceptance_note, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'Active', ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        status = 'Active',
        start_date = VALUES(start_date),
        end_date = VALUES(end_date),
        acceptance_note = VALUES(acceptance_note),
        updated_at = VALUES(updated_at)`,
      [
        request.id,
        request.umkm_user_id,
        request.mentor_id,
        request.topic,
        request.mentoring_goal,
        req.body?.startDate || null,
        req.body?.endDate || null,
        req.body?.acceptanceNote || "",
        now,
        now,
      ]
    );

    const [[workspace]] = await connection.query("SELECT * FROM mentoring_workspaces WHERE request_id = ? LIMIT 1", [
      request.id,
    ]);

    const firstSession = req.body?.firstSession || null;
    let sessionId = null;
    if (hasFirstSession(firstSession)) {
      if (!required(firstSession.title)) {
        await connection.rollback();
        return res.status(400).json({ message: "Judul sesi pertama wajib diisi jika firstSession dikirim." });
      }

      const [sessionResult] = await connection.query(
        `INSERT INTO mentoring_sessions
          (workspace_id, title, date, start_time, end_time, platform, meeting_link, agenda, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Upcoming', ?, ?)`,
        [
          workspace.id,
          firstSession.title,
          firstSession.date || null,
          firstSession.startTime || null,
          firstSession.endTime || null,
          firstSession.platform || "",
          firstSession.meetingLink || "",
          firstSession.agenda || "",
          now,
          now,
        ]
      );
      sessionId = sessionResult.insertId;
    }

    await connection.commit();
    return res.json({
      message: sessionId
        ? "Request diterima, workspace dibuat, dan sesi pertama berhasil dijadwalkan."
        : "Request diterima dan workspace dibuat.",
      data: { requestId: request.id, workspaceId: workspace.id, firstSessionId: sessionId },
    });
  } catch (error) {
    await connection.rollback();
    return sendError(res, error, "Gagal menerima request mentoring.");
  } finally {
    connection.release();
  }
}

async function rejectMentoringRequest(req, res) {
  if (!requireRole(req, res, "mentor")) return null;

  const rejectionReason = String(req.body?.rejectionReason || "").trim();
  if (!rejectionReason) return res.status(400).json({ message: "Alasan penolakan wajib diisi." });

  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();

    const mentor = await findMentorProfileByUserId(req.user.sub, connection);
    if (!mentor) {
      await connection.rollback();
      return res.status(404).json({ message: "Profil mentor belum dibuat." });
    }

    const [[request]] = await connection.query("SELECT * FROM mentoring_requests WHERE id = ? FOR UPDATE", [
      getRequestId(req),
    ]);
    if (!request || Number(request.mentor_id) !== Number(mentor.id)) {
      await connection.rollback();
      return res.status(404).json({ message: "Request mentoring tidak ditemukan." });
    }

    const blockedMessage = blockedRequestStatusMessage(request.status, "Rejected");
    if (blockedMessage) {
      await connection.rollback();
      return res.status(409).json({ message: blockedMessage });
    }

    const now = new Date();
    await connection.query(
      `UPDATE mentoring_requests
      SET status = 'Rejected', rejection_reason = ?, responded_at = ?, updated_at = ?
      WHERE id = ?`,
      [rejectionReason, now, now, request.id]
    );

    await connection.commit();
    return res.json({ message: "Request mentoring berhasil ditolak.", data: { requestId: request.id } });
  } catch (error) {
    await connection.rollback();
    return sendError(res, error, "Gagal menolak request mentoring.");
  } finally {
    connection.release();
  }
}

async function cancelMentoringRequest(req, res) {
  if (!requireRole(req, res, "umkm_owner")) return null;

  try {
    const [[request]] = await getPool().query(
      "SELECT id, status FROM mentoring_requests WHERE id = ? AND umkm_user_id = ? LIMIT 1",
      [getRequestId(req), req.user.sub]
    );

    if (!request) return res.status(404).json({ message: "Request mentoring tidak ditemukan." });
    if (request.status !== "Pending") {
      return res.status(409).json({ message: "UMKM hanya dapat membatalkan request yang masih Pending." });
    }

    const [result] = await getPool().query(
      `UPDATE mentoring_requests
      SET status = 'Cancelled', updated_at = ?
      WHERE id = ? AND umkm_user_id = ? AND status = 'Pending'`,
      [new Date(), getRequestId(req), req.user.sub]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Request pending tidak ditemukan." });
    }
    return res.json({ message: "Request mentoring berhasil dibatalkan." });
  } catch (error) {
    return sendError(res, error, "Gagal membatalkan request mentoring.");
  }
}

async function listMyWorkspaces(req, res) {
  try {
    const params = [];
    let where = "w.umkm_user_id = ?";
    params.push(req.user.sub);

    if (req.user?.role === "mentor") {
      const mentor = await findMentorProfileByUserId(req.user.sub);
      if (!mentor) return res.status(404).json({ message: "Profil mentor belum dibuat." });
      where = "w.mentor_id = ?";
      params[0] = mentor.id;
    }

    const [rows] = await getPool().query(
      `SELECT
        w.*,
        mp.name AS mentor_name,
        mp.profession AS mentor_profession,
        mp.expertise AS mentor_expertise,
        u.name AS umkm_name,
        u.email AS umkm_email,
        b.name AS business_name,
        b.location AS business_location,
        COALESCE(b.other_category, b.category) AS business_category,
        b.description AS business_description
      FROM mentoring_workspaces w
      JOIN mentor_profiles mp ON mp.id = w.mentor_id
      JOIN users u ON u.id = w.umkm_user_id
      LEFT JOIN umkm_owners o ON o.user_id = u.id
      LEFT JOIN umkm_business b ON b.owner_id = o.id
      WHERE ${where}
      ORDER BY w.updated_at DESC, w.id DESC`,
      params
    );
    return res.json({ data: rows.map(normalizeWorkspace) });
  } catch (error) {
    return sendError(res, error, "Gagal mengambil workspace mentoring.");
  }
}

async function listWorkspacesByUmkm(req, res) {
  if (!requireRole(req, res, "umkm_owner")) return null;

  const umkmUserId = Number(req.params.umkmUserId);
  if (umkmUserId !== Number(req.user.sub)) {
    return res.status(403).json({ message: "UMKM hanya dapat melihat workspace miliknya sendiri." });
  }

  try {
    const [rows] = await getPool().query(
      `SELECT
        w.*,
        mp.name AS mentor_name,
        mp.profession AS mentor_profession,
        mp.expertise AS mentor_expertise,
        u.name AS umkm_name,
        u.email AS umkm_email,
        b.name AS business_name,
        b.location AS business_location,
        COALESCE(b.other_category, b.category) AS business_category,
        b.description AS business_description
      FROM mentoring_workspaces w
      JOIN mentor_profiles mp ON mp.id = w.mentor_id
      JOIN users u ON u.id = w.umkm_user_id
      LEFT JOIN umkm_owners o ON o.user_id = u.id
      LEFT JOIN umkm_business b ON b.owner_id = o.id
      WHERE w.umkm_user_id = ?
      ORDER BY w.updated_at DESC, w.id DESC`,
      [umkmUserId]
    );
    return res.json({ data: rows.map(normalizeWorkspace) });
  } catch (error) {
    return sendError(res, error, "Gagal mengambil workspace mentoring UMKM.");
  }
}

async function listWorkspacesByMentor(req, res) {
  if (!requireRole(req, res, "mentor")) return null;

  try {
    const mentor = await findMentorProfileByUserId(req.user.sub);
    if (!mentor) return res.status(404).json({ message: "Profil mentor belum dibuat." });
    if (Number(mentor.id) !== Number(req.params.mentorId)) {
      return res.status(403).json({ message: "Mentor hanya dapat melihat workspace miliknya sendiri." });
    }

    const [rows] = await getPool().query(
      `SELECT
        w.*,
        mp.name AS mentor_name,
        mp.profession AS mentor_profession,
        mp.expertise AS mentor_expertise,
        u.name AS umkm_name,
        u.email AS umkm_email,
        b.name AS business_name,
        b.location AS business_location,
        COALESCE(b.other_category, b.category) AS business_category,
        b.description AS business_description
      FROM mentoring_workspaces w
      JOIN mentor_profiles mp ON mp.id = w.mentor_id
      JOIN users u ON u.id = w.umkm_user_id
      LEFT JOIN umkm_owners o ON o.user_id = u.id
      LEFT JOIN umkm_business b ON b.owner_id = o.id
      WHERE w.mentor_id = ?
      ORDER BY w.updated_at DESC, w.id DESC`,
      [mentor.id]
    );
    return res.json({ data: rows.map(normalizeWorkspace) });
  } catch (error) {
    return sendError(res, error, "Gagal mengambil workspace mentoring mentor.");
  }
}

async function getWorkspace(req, res) {
  try {
    const workspace = await findWorkspaceForUser(getWorkspaceId(req), req.user);
    if (!workspace) return res.status(404).json({ message: "Workspace mentoring tidak ditemukan." });
    return res.json({ data: normalizeWorkspace(workspace) });
  } catch (error) {
    return sendError(res, error, "Gagal mengambil workspace mentoring.");
  }
}

async function updateWorkspaceStatus(req, res) {
  const status = String(req.body?.status || "").trim();
  if (!WORKSPACE_STATUSES.includes(status)) return res.status(400).json({ message: "Status workspace tidak valid." });

  const workspace = await findWorkspaceForUser(getWorkspaceId(req), req.user);
  if (!workspace) return res.status(404).json({ message: "Workspace mentoring tidak ditemukan." });

  if (status === "Completed" && req.user?.role !== "mentor") {
    return res.status(403).json({ message: "Hanya Mentor yang dapat menyelesaikan workspace." });
  }

  try {
    await getPool().query("UPDATE mentoring_workspaces SET status = ?, updated_at = ? WHERE id = ?", [
      status,
      new Date(),
      workspace.id,
    ]);
    return res.json({ message: "Status workspace berhasil diperbarui.", data: { workspaceId: workspace.id, status } });
  } catch (error) {
    return sendError(res, error, "Gagal memperbarui status workspace.");
  }
}

async function createSession(req, res) {
  if (!requireRole(req, res, "mentor")) return null;

  const workspace = await findWorkspaceForUser(req.params.workspaceId, req.user);
  if (!workspace) return res.status(404).json({ message: "Workspace mentoring tidak ditemukan." });
  if (isWorkspaceLockedForNewItems(workspace)) {
    return res.status(409).json({ message: "Workspace Completed atau Cancelled tidak bisa ditambah sesi baru." });
  }

  const { title = "", date = null, startTime = null, endTime = null, platform = "", meetingLink = "", agenda = "" } =
    req.body || {};
  if (!required(title)) return res.status(400).json({ message: "Judul sesi wajib diisi." });

  try {
    const now = new Date();
    const [result] = await getPool().query(
      `INSERT INTO mentoring_sessions
        (workspace_id, title, date, start_time, end_time, platform, meeting_link, agenda, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Upcoming', ?, ?)`,
      [workspace.id, title, date, startTime, endTime, platform, meetingLink, agenda, now, now]
    );
    return res.status(201).json({ message: "Sesi mentoring berhasil dibuat.", data: { id: result.insertId } });
  } catch (error) {
    return sendError(res, error, "Gagal membuat sesi mentoring.");
  }
}

async function listSessionsByWorkspace(req, res) {
  try {
    const workspace = await findWorkspaceForUser(req.params.workspaceId, req.user);
    if (!workspace) return res.status(404).json({ message: "Workspace mentoring tidak ditemukan." });

    const [rows] = await getPool().query(
      "SELECT * FROM mentoring_sessions WHERE workspace_id = ? ORDER BY date ASC, start_time ASC, id DESC",
      [workspace.id]
    );
    return res.json({ data: rows });
  } catch (error) {
    return sendError(res, error, "Gagal mengambil sesi mentoring.");
  }
}

async function updateSession(req, res) {
  if (!requireRole(req, res, "mentor")) return null;

  const { title, date, startTime, endTime, platform, meetingLink, agenda, status } = req.body || {};
  if (status && !SESSION_STATUSES.includes(status)) return res.status(400).json({ message: "Status sesi tidak valid." });

  try {
    const [[session]] = await getPool().query("SELECT workspace_id FROM mentoring_sessions WHERE id = ? LIMIT 1", [
      getSessionId(req),
    ]);
    if (!session) return res.status(404).json({ message: "Sesi mentoring tidak ditemukan." });

    const workspace = await findWorkspaceForUser(session.workspace_id, req.user);
    if (!workspace) return res.status(404).json({ message: "Workspace mentoring tidak ditemukan." });

    await getPool().query(
      `UPDATE mentoring_sessions
      SET title = COALESCE(?, title), date = COALESCE(?, date), start_time = COALESCE(?, start_time),
        end_time = COALESCE(?, end_time), platform = COALESCE(?, platform), meeting_link = COALESCE(?, meeting_link),
        agenda = COALESCE(?, agenda), status = COALESCE(?, status), updated_at = ?
      WHERE id = ?`,
      [title, date, startTime, endTime, platform, meetingLink, agenda, status, new Date(), getSessionId(req)]
    );
    return res.json({ message: "Sesi mentoring berhasil diperbarui." });
  } catch (error) {
    return sendError(res, error, "Gagal memperbarui sesi mentoring.");
  }
}

async function completeSession(req, res) {
  if (!requireRole(req, res, "mentor")) return null;

  try {
    const [[session]] = await getPool().query("SELECT workspace_id FROM mentoring_sessions WHERE id = ? LIMIT 1", [
      getSessionId(req),
    ]);
    if (!session) return res.status(404).json({ message: "Sesi mentoring tidak ditemukan." });

    const workspace = await findWorkspaceForUser(session.workspace_id, req.user);
    if (!workspace) return res.status(404).json({ message: "Workspace mentoring tidak ditemukan." });

    await getPool().query("UPDATE mentoring_sessions SET status = 'Completed', updated_at = ? WHERE id = ?", [
      new Date(),
      getSessionId(req),
    ]);
    return res.json({ message: "Sesi mentoring ditandai selesai.", data: { sessionId: Number(getSessionId(req)), status: "Completed" } });
  } catch (error) {
    return sendError(res, error, "Gagal menyelesaikan sesi mentoring.");
  }
}

async function cancelSession(req, res) {
  if (!requireRole(req, res, "mentor")) return null;
  const reason = String(req.body?.reason || "").trim();
  if (!reason) return res.status(400).json({ message: "Alasan pembatalan sesi wajib diisi." });

  try {
    const [[session]] = await getPool().query("SELECT workspace_id FROM mentoring_sessions WHERE id = ? LIMIT 1", [
      getSessionId(req),
    ]);
    if (!session) return res.status(404).json({ message: "Sesi mentoring tidak ditemukan." });

    const workspace = await findWorkspaceForUser(session.workspace_id, req.user);
    if (!workspace) return res.status(404).json({ message: "Workspace mentoring tidak ditemukan." });

    await getPool().query("UPDATE mentoring_sessions SET status = 'Cancelled', cancellation_reason = ?, updated_at = ? WHERE id = ?", [
      reason,
      new Date(),
      getSessionId(req),
    ]);
    return res.json({ message: "Sesi mentoring berhasil dibatalkan.", data: { sessionId: Number(getSessionId(req)), status: "Cancelled", reason } });
  } catch (error) {
    return sendError(res, error, "Gagal membatalkan sesi mentoring.");
  }
}

async function createTask(req, res) {
  if (!requireRole(req, res, "mentor")) return null;

  const workspace = await findWorkspaceForUser(req.params.workspaceId, req.user);
  if (!workspace) return res.status(404).json({ message: "Workspace mentoring tidak ditemukan." });
  if (isWorkspaceLockedForNewItems(workspace)) {
    return res.status(409).json({ message: "Workspace Completed atau Cancelled tidak bisa ditambah task baru." });
  }

  const { title = "", instruction = "", deadline = null, priority = "Medium" } = req.body || {};
  if (!required(title)) return res.status(400).json({ message: "Judul task wajib diisi." });
  if (!TASK_PRIORITIES.includes(priority)) return res.status(400).json({ message: "Prioritas task tidak valid." });

  try {
    const now = new Date();
    const [result] = await getPool().query(
      `INSERT INTO mentoring_tasks
        (workspace_id, title, instruction, deadline, priority, status, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'Pending', ?, ?, ?)`,
      [workspace.id, title, instruction, deadline, priority, req.user.sub, now, now]
    );
    return res.status(201).json({ message: "Task mentoring berhasil dibuat.", data: { id: result.insertId } });
  } catch (error) {
    return sendError(res, error, "Gagal membuat task mentoring.");
  }
}

async function listTasksByWorkspace(req, res) {
  try {
    const workspace = await findWorkspaceForUser(req.params.workspaceId, req.user);
    if (!workspace) return res.status(404).json({ message: "Workspace mentoring tidak ditemukan." });

    const [rows] = await getPool().query(
      `SELECT
        t.*,
        s.id AS submission_id,
        s.note AS submission_note,
        s.file_name AS submission_file_name,
        s.file_path AS submission_file_path,
        s.file_mime AS submission_file_mime,
        s.file_size AS submission_file_size,
        s.submission_status,
        s.submitted_at,
        w.topic AS workspace_topic,
        w.status AS workspace_status,
        mp.name AS mentor_name,
        u.name AS umkm_name
      FROM mentoring_tasks t
      JOIN mentoring_workspaces w ON w.id = t.workspace_id
      JOIN mentor_profiles mp ON mp.id = w.mentor_id
      JOIN users u ON u.id = w.umkm_user_id
      LEFT JOIN mentoring_task_submissions s ON s.id = (
        SELECT mts.id
        FROM mentoring_task_submissions mts
        WHERE mts.task_id = t.id AND mts.submission_status <> 'Cancelled'
        ORDER BY mts.submitted_at DESC, mts.id DESC
        LIMIT 1
      )
      WHERE t.workspace_id = ?
      ORDER BY t.deadline ASC, t.id DESC`,
      [workspace.id]
    );
    return res.json({ data: rows.map((row) => ({ ...row, submission: normalizeTaskSubmission(row) })) });
  } catch (error) {
    return sendError(res, error, "Gagal mengambil task mentoring.");
  }
}

async function listTasksByUmkm(req, res) {
  if (!requireRole(req, res, "umkm_owner")) return null;

  const umkmUserId = Number(req.params.umkmUserId);
  if (umkmUserId !== Number(req.user.sub)) {
    return res.status(403).json({ message: "UMKM hanya dapat melihat task miliknya sendiri." });
  }

  try {
    const [rows] = await getPool().query(
      `SELECT
        t.*,
        s.id AS submission_id,
        s.note AS submission_note,
        s.file_name AS submission_file_name,
        s.file_path AS submission_file_path,
        s.file_mime AS submission_file_mime,
        s.file_size AS submission_file_size,
        s.submission_status,
        s.submitted_at,
        w.id AS workspace_id,
        w.topic AS workspace_topic,
        w.status AS workspace_status,
        w.start_date,
        w.end_date,
        mp.id AS mentor_id,
        mp.name AS mentor_name,
        mp.profession AS mentor_profession
      FROM mentoring_tasks t
      JOIN mentoring_workspaces w ON w.id = t.workspace_id
      JOIN mentor_profiles mp ON mp.id = w.mentor_id
      LEFT JOIN mentoring_task_submissions s ON s.id = (
        SELECT mts.id
        FROM mentoring_task_submissions mts
        WHERE mts.task_id = t.id AND mts.submission_status <> 'Cancelled'
        ORDER BY mts.submitted_at DESC, mts.id DESC
        LIMIT 1
      )
      WHERE w.umkm_user_id = ? AND w.status = 'Active'
      ORDER BY t.deadline ASC, t.id DESC`,
      [umkmUserId]
    );
    return res.json({ data: rows.map((row) => ({ ...row, submission: normalizeTaskSubmission(row) })) });
  } catch (error) {
    return sendError(res, error, "Gagal mengambil semua task UMKM.");
  }
}

async function updateTask(req, res) {
  if (!requireRole(req, res, "mentor")) return null;

  const { title, instruction, deadline, priority, status, mentorComment } = req.body || {};
  if (priority && !TASK_PRIORITIES.includes(priority)) return res.status(400).json({ message: "Prioritas task tidak valid." });
  if (status && !TASK_STATUSES.includes(status)) return res.status(400).json({ message: "Status task tidak valid." });

  try {
    const [[task]] = await getPool().query("SELECT workspace_id FROM mentoring_tasks WHERE id = ? LIMIT 1", [
      getTaskId(req),
    ]);
    if (!task) return res.status(404).json({ message: "Task mentoring tidak ditemukan." });

    const workspace = await findWorkspaceForUser(task.workspace_id, req.user);
    if (!workspace) return res.status(404).json({ message: "Workspace mentoring tidak ditemukan." });

    await getPool().query(
      `UPDATE mentoring_tasks
      SET title = COALESCE(?, title), instruction = COALESCE(?, instruction), deadline = COALESCE(?, deadline),
        priority = COALESCE(?, priority), status = COALESCE(?, status), mentor_comment = COALESCE(?, mentor_comment), updated_at = ?
      WHERE id = ?`,
      [title, instruction, deadline, priority, status, mentorComment, new Date(), getTaskId(req)]
    );
    return res.json({ message: "Task mentoring berhasil diperbarui." });
  } catch (error) {
    return sendError(res, error, "Gagal memperbarui task mentoring.");
  }
}

async function updateTaskStatus(req, res) {
  if (!requireRole(req, res, "umkm_owner")) return null;

  const status = String(req.body?.status || "").trim();
  if (!TASK_STATUSES.includes(status)) return res.status(400).json({ message: "Status task tidak valid." });

  try {
    const [[task]] = await getPool().query("SELECT workspace_id FROM mentoring_tasks WHERE id = ? LIMIT 1", [
      getTaskId(req),
    ]);
    if (!task) return res.status(404).json({ message: "Task mentoring tidak ditemukan." });

    const workspace = await findWorkspaceForUser(task.workspace_id, req.user);
    if (!workspace) return res.status(404).json({ message: "Workspace mentoring tidak ditemukan." });

    await getPool().query("UPDATE mentoring_tasks SET status = ?, updated_at = ? WHERE id = ?", [
      status,
      new Date(),
      getTaskId(req),
    ]);
    return res.json({ message: "Status task berhasil diperbarui.", data: { taskId: Number(getTaskId(req)), status } });
  } catch (error) {
    return sendError(res, error, "Gagal memperbarui status task.");
  }
}

async function submitTask(req, res) {
  if (!requireRole(req, res, "umkm_owner")) return null;

  const note = String(req.body?.note || "").trim();
  if (!note && !req.file) {
    return res.status(400).json({ message: "Unggah file atau isi keterangan sebelum mengumpulkan task." });
  }

  try {
    const { task, workspace } = await findTaskForUser(getTaskId(req), req.user);
    if (!task) return res.status(404).json({ message: "Task mentoring tidak ditemukan." });
    if (Number(workspace.umkm_user_id) !== Number(req.user.sub)) {
      return res.status(403).json({ message: "UMKM hanya dapat mengumpulkan task miliknya sendiri." });
    }

    const now = new Date();
    const deadline = getDeadlineEndOfDay(task.deadline);
    const submissionStatus = deadline && now.getTime() > deadline.getTime() ? "Late" : "Submitted";
    const filePath = getRelativeUploadPath(req.file);

    const [result] = await getPool().query(
      `INSERT INTO mentoring_task_submissions
        (task_id, workspace_id, submitted_by, note, file_name, file_path, file_mime, file_size,
          submission_status, submitted_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        task.id,
        workspace.id,
        req.user.sub,
        note,
        req.file?.originalname || null,
        filePath || null,
        req.file?.mimetype || null,
        req.file?.size || null,
        submissionStatus,
        now,
        now,
        now,
      ]
    );

    await getPool().query("UPDATE mentoring_tasks SET status = 'Done', updated_at = ? WHERE id = ?", [now, task.id]);

    return res.status(201).json({
      message: "Task berhasil dikumpulkan.",
      data: {
        id: result.insertId,
        taskId: Number(task.id),
        workspaceId: Number(workspace.id),
        note,
        fileName: req.file?.originalname || "",
        filePath,
        fileUrl: filePath ? `/${filePath}` : "",
        fileMime: req.file?.mimetype || "",
        fileSize: req.file?.size || 0,
        submissionStatus,
        submittedAt: now,
      },
    });
  } catch (error) {
    return sendError(res, error, "Gagal mengumpulkan task.");
  }
}

async function cancelTaskSubmission(req, res) {
  if (!requireRole(req, res, "umkm_owner")) return null;

  try {
    const { task, workspace } = await findTaskForUser(getTaskId(req), req.user);
    if (!task) return res.status(404).json({ message: "Task mentoring tidak ditemukan." });
    if (Number(workspace.umkm_user_id) !== Number(req.user.sub)) {
      return res.status(403).json({ message: "UMKM hanya dapat membatalkan pengumpulan task miliknya sendiri." });
    }

    const [[submission]] = await getPool().query(
      `SELECT id FROM mentoring_task_submissions
      WHERE task_id = ? AND submitted_by = ? AND submission_status <> 'Cancelled'
      ORDER BY submitted_at DESC, id DESC
      LIMIT 1`,
      [task.id, req.user.sub]
    );
    if (!submission) return res.status(404).json({ message: "Pengumpulan task tidak ditemukan." });

    const now = new Date();
    await getPool().query(
      "UPDATE mentoring_task_submissions SET submission_status = 'Cancelled', cancelled_at = ?, updated_at = ? WHERE id = ?",
      [now, now, submission.id]
    );
    await getPool().query("UPDATE mentoring_tasks SET status = 'Pending', updated_at = ? WHERE id = ?", [now, task.id]);

    return res.json({ message: "Pengumpulan task berhasil dibatalkan.", data: { taskId: Number(task.id), status: "Pending" } });
  } catch (error) {
    return sendError(res, error, "Gagal membatalkan pengumpulan task.");
  }
}

async function deleteTask(req, res) {
  if (!requireRole(req, res, "mentor")) return null;

  try {
    const [[task]] = await getPool().query("SELECT workspace_id FROM mentoring_tasks WHERE id = ? LIMIT 1", [
      getTaskId(req),
    ]);
    if (!task) return res.status(404).json({ message: "Task mentoring tidak ditemukan." });

    const workspace = await findWorkspaceForUser(task.workspace_id, req.user);
    if (!workspace) return res.status(404).json({ message: "Workspace mentoring tidak ditemukan." });

    await getPool().query("DELETE FROM mentoring_tasks WHERE id = ?", [getTaskId(req)]);
    return res.json({ message: "Task mentoring berhasil dihapus." });
  } catch (error) {
    return sendError(res, error, "Gagal menghapus task mentoring.");
  }
}

async function getWorkspaceItems(req, res) {
  try {
    const workspace = await findWorkspaceForUser(req.params.workspaceId, req.user);
    if (!workspace) return res.status(404).json({ message: "Workspace mentoring tidak ditemukan." });

    const [[sessions], [tasks], [progress], [notes], [reviews]] = await Promise.all([
      getPool().query("SELECT * FROM mentoring_sessions WHERE workspace_id = ? ORDER BY date ASC, start_time ASC", [
        workspace.id,
      ]),
      getPool().query("SELECT * FROM mentoring_tasks WHERE workspace_id = ? ORDER BY deadline ASC, id DESC", [
        workspace.id,
      ]),
      getPool().query("SELECT * FROM business_progress WHERE workspace_id = ? ORDER BY created_at DESC, id DESC", [
        workspace.id,
      ]),
      getPool().query("SELECT * FROM mentor_notes WHERE workspace_id = ? ORDER BY created_at DESC, id DESC", [
        workspace.id,
      ]),
      getPool().query("SELECT * FROM mentoring_reviews WHERE workspace_id = ? LIMIT 1", [workspace.id]),
    ]);

    return res.json({ data: { sessions, tasks, progress, notes, review: reviews[0] || null } });
  } catch (error) {
    return sendError(res, error, "Gagal mengambil data workspace mentoring.");
  }
}

async function createBusinessProgress(req, res) {
  if (!requireRole(req, res, "umkm_owner")) return null;

  const workspace = await findWorkspaceForUser(req.params.workspaceId, req.user);
  if (!workspace) return res.status(404).json({ message: "Workspace mentoring tidak ditemukan." });

  const {
    omzet = null,
    orderCount = null,
    followers = null,
    engagement = "",
    obstacle = "",
    implementationResult = "",
    questionForMentor = "",
  } = req.body || {};

  try {
    const now = new Date();
    const [result] = await getPool().query(
      `INSERT INTO business_progress
        (workspace_id, omzet, order_count, followers, engagement, obstacle, implementation_result,
          question_for_mentor, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [workspace.id, omzet, orderCount, followers, engagement, obstacle, implementationResult, questionForMentor, now, now]
    );
    return res.status(201).json({ message: "Progress bisnis berhasil dikirim.", data: { id: result.insertId } });
  } catch (error) {
    return sendError(res, error, "Gagal menyimpan progress bisnis.");
  }
}

async function listProgressByWorkspace(req, res) {
  try {
    const workspace = await findWorkspaceForUser(req.params.workspaceId, req.user);
    if (!workspace) return res.status(404).json({ message: "Workspace mentoring tidak ditemukan." });

    const [rows] = await getPool().query(
      `SELECT
        bp.*,
        w.topic AS workspace_topic,
        w.status AS workspace_status,
        mp.name AS mentor_name,
        u.name AS umkm_name
      FROM business_progress bp
      JOIN mentoring_workspaces w ON w.id = bp.workspace_id
      JOIN mentor_profiles mp ON mp.id = w.mentor_id
      JOIN users u ON u.id = w.umkm_user_id
      WHERE bp.workspace_id = ?
      ORDER BY bp.created_at DESC, bp.id DESC`,
      [workspace.id]
    );
    return res.json({ data: rows });
  } catch (error) {
    return sendError(res, error, "Gagal mengambil progress bisnis.");
  }
}

async function updateProgressRecommendation(req, res) {
  if (!requireRole(req, res, "mentor")) return null;

  const { mentorRecommendation = "" } = req.body || {};
  if (!required(mentorRecommendation)) return res.status(400).json({ message: "Rekomendasi mentor wajib diisi." });

  try {
    const [[progress]] = await getPool().query("SELECT workspace_id FROM business_progress WHERE id = ? LIMIT 1", [
      getProgressId(req),
    ]);
    if (!progress) return res.status(404).json({ message: "Progress bisnis tidak ditemukan." });

    const workspace = await findWorkspaceForUser(progress.workspace_id, req.user);
    if (!workspace) return res.status(404).json({ message: "Workspace mentoring tidak ditemukan." });

    await getPool().query("UPDATE business_progress SET mentor_recommendation = ?, updated_at = ? WHERE id = ?", [
      mentorRecommendation,
      new Date(),
      getProgressId(req),
    ]);
    return res.json({ message: "Rekomendasi progress berhasil disimpan." });
  } catch (error) {
    return sendError(res, error, "Gagal menyimpan rekomendasi progress.");
  }
}

async function createMentorNote(req, res) {
  if (!requireRole(req, res, "mentor")) return null;

  const workspace = await findWorkspaceForUser(req.params.workspaceId, req.user);
  if (!workspace) return res.status(404).json({ message: "Workspace mentoring tidak ditemukan." });

  const { sessionId = null, evaluation = "", obstacleFound = "", advice = "", nextRecommendation = "" } = req.body || {};

  try {
    if (sessionId) {
      const [[session]] = await getPool().query(
        "SELECT id FROM mentoring_sessions WHERE id = ? AND workspace_id = ? LIMIT 1",
        [sessionId, workspace.id]
      );
      if (!session) return res.status(400).json({ message: "Sesi tidak ditemukan di workspace ini." });
    }

    const now = new Date();
    const [result] = await getPool().query(
      `INSERT INTO mentor_notes
        (workspace_id, session_id, evaluation, obstacle_found, advice, next_recommendation, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [workspace.id, sessionId, evaluation, obstacleFound, advice, nextRecommendation, now, now]
    );
    return res.status(201).json({ message: "Catatan mentor berhasil dibuat.", data: { id: result.insertId } });
  } catch (error) {
    return sendError(res, error, "Gagal membuat catatan mentor.");
  }
}

async function listNotesByWorkspace(req, res) {
  try {
    const workspace = await findWorkspaceForUser(req.params.workspaceId, req.user);
    if (!workspace) return res.status(404).json({ message: "Workspace mentoring tidak ditemukan." });

    const [rows] = await getPool().query(
      `SELECT
        n.*,
        s.title AS session_title,
        s.date AS session_date,
        w.topic AS workspace_topic,
        mp.name AS mentor_name,
        u.name AS umkm_name
      FROM mentor_notes n
      JOIN mentoring_workspaces w ON w.id = n.workspace_id
      JOIN mentor_profiles mp ON mp.id = w.mentor_id
      JOIN users u ON u.id = w.umkm_user_id
      LEFT JOIN mentoring_sessions s ON s.id = n.session_id
      WHERE n.workspace_id = ?
      ORDER BY n.created_at DESC, n.id DESC`,
      [workspace.id]
    );
    return res.json({ data: rows });
  } catch (error) {
    return sendError(res, error, "Gagal mengambil catatan mentor.");
  }
}

async function updateMentorNote(req, res) {
  if (!requireRole(req, res, "mentor")) return null;

  const { sessionId, evaluation, obstacleFound, advice, nextRecommendation } = req.body || {};

  try {
    const [[note]] = await getPool().query("SELECT workspace_id FROM mentor_notes WHERE id = ? LIMIT 1", [
      getNoteId(req),
    ]);
    if (!note) return res.status(404).json({ message: "Catatan mentor tidak ditemukan." });

    const workspace = await findWorkspaceForUser(note.workspace_id, req.user);
    if (!workspace) return res.status(404).json({ message: "Workspace mentoring tidak ditemukan." });

    if (sessionId) {
      const [[session]] = await getPool().query(
        "SELECT id FROM mentoring_sessions WHERE id = ? AND workspace_id = ? LIMIT 1",
        [sessionId, workspace.id]
      );
      if (!session) return res.status(400).json({ message: "Sesi tidak ditemukan di workspace ini." });
    }

    await getPool().query(
      `UPDATE mentor_notes
      SET session_id = COALESCE(?, session_id),
        evaluation = COALESCE(?, evaluation),
        obstacle_found = COALESCE(?, obstacle_found),
        advice = COALESCE(?, advice),
        next_recommendation = COALESCE(?, next_recommendation),
        updated_at = ?
      WHERE id = ?`,
      [sessionId, evaluation, obstacleFound, advice, nextRecommendation, new Date(), getNoteId(req)]
    );
    return res.json({ message: "Catatan mentor berhasil diperbarui." });
  } catch (error) {
    return sendError(res, error, "Gagal memperbarui catatan mentor.");
  }
}

async function deleteMentorNote(req, res) {
  if (!requireRole(req, res, "mentor")) return null;

  try {
    const [[note]] = await getPool().query("SELECT workspace_id FROM mentor_notes WHERE id = ? LIMIT 1", [
      getNoteId(req),
    ]);
    if (!note) return res.status(404).json({ message: "Catatan mentor tidak ditemukan." });

    const workspace = await findWorkspaceForUser(note.workspace_id, req.user);
    if (!workspace) return res.status(404).json({ message: "Workspace mentoring tidak ditemukan." });

    await getPool().query("DELETE FROM mentor_notes WHERE id = ?", [getNoteId(req)]);
    return res.json({ message: "Catatan mentor berhasil dihapus." });
  } catch (error) {
    return sendError(res, error, "Gagal menghapus catatan mentor.");
  }
}

async function listWorkspaceMessages(req, res) {
  try {
    const workspace = await findWorkspaceForUser(req.params.workspaceId, req.user);
    if (!workspace) return res.status(404).json({ message: "Workspace mentoring tidak ditemukan." });

    const [rows] = await getPool().query(
      `SELECT m.*, u.name AS sender_name
      FROM mentoring_chat_messages m
      JOIN users u ON u.id = m.sender_user_id
      WHERE m.workspace_id = ?
      ORDER BY m.created_at ASC, m.id ASC`,
      [workspace.id]
    );

    return res.json({ data: rows.map(normalizeChatMessage) });
  } catch (error) {
    return sendError(res, error, "Gagal mengambil pesan mentoring.");
  }
}

async function createWorkspaceMessage(req, res) {
  const message = String(req.body?.message || "").trim();
  if (!message) return res.status(400).json({ message: "Pesan tidak boleh kosong." });

  try {
    const workspace = await findWorkspaceForUser(req.params.workspaceId, req.user);
    if (!workspace) return res.status(404).json({ message: "Workspace mentoring tidak ditemukan." });

    const senderRole = req.user.role === "mentor" ? "mentor" : "umkm";
    const now = new Date();
    const [result] = await getPool().query(
      `INSERT INTO mentoring_chat_messages (workspace_id, sender_user_id, sender_role, message, created_at)
      VALUES (?, ?, ?, ?, ?)`,
      [workspace.id, req.user.sub, senderRole, message, now]
    );

    const [[row]] = await getPool().query(
      `SELECT m.*, u.name AS sender_name
      FROM mentoring_chat_messages m
      JOIN users u ON u.id = m.sender_user_id
      WHERE m.id = ?
      LIMIT 1`,
      [result.insertId]
    );
    const data = normalizeChatMessage(row);
    emitWorkspaceMessage(workspace.id, data);

    return res.status(201).json({ message: "Pesan terkirim.", data });
  } catch (error) {
    return sendError(res, error, "Gagal mengirim pesan mentoring.");
  }
}

async function listWorkspaceFiles(req, res) {
  try {
    const workspace = await findWorkspaceForUser(req.params.workspaceId, req.user);
    if (!workspace) return res.status(404).json({ message: "Workspace mentoring tidak ditemukan." });

    const [rows] = await getPool().query(
      `SELECT f.*, u.name AS uploader_name
      FROM mentoring_files f
      JOIN users u ON u.id = f.uploaded_by
      WHERE f.workspace_id = ?
      ORDER BY f.created_at DESC, f.id DESC`,
      [workspace.id]
    );

    return res.json({ data: rows.map(normalizeWorkspaceFile) });
  } catch (error) {
    return sendError(res, error, "Gagal mengambil file mentoring.");
  }
}

async function uploadWorkspaceFile(req, res) {
  if (!requireRole(req, res, "mentor")) return null;
  if (!req.file) return res.status(400).json({ message: "File materi wajib diunggah." });

  const title = String(req.body?.title || req.file.originalname || "").trim();
  if (!required(title)) return res.status(400).json({ message: "Judul materi wajib diisi." });

  try {
    const workspace = await findWorkspaceForUser(req.params.workspaceId, req.user);
    if (!workspace) return res.status(404).json({ message: "Workspace mentoring tidak ditemukan." });
    if (workspace.status === "Cancelled") {
      return res.status(409).json({ message: "Workspace Cancelled tidak bisa ditambah file materi." });
    }

    const now = new Date();
    const filePath = getRelativeUploadPath(req.file);
    const [result] = await getPool().query(
      `INSERT INTO mentoring_files
        (workspace_id, uploaded_by, title, description, file_name, file_path, file_mime, file_size, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        workspace.id,
        req.user.sub,
        title,
        req.body?.description || "",
        req.file.originalname,
        filePath,
        req.file.mimetype,
        req.file.size,
        now,
        now,
      ]
    );

    const [[row]] = await getPool().query(
      `SELECT f.*, u.name AS uploader_name
      FROM mentoring_files f
      JOIN users u ON u.id = f.uploaded_by
      WHERE f.id = ?
      LIMIT 1`,
      [result.insertId]
    );

    return res.status(201).json({ message: "Materi mentoring berhasil diunggah.", data: normalizeWorkspaceFile(row) });
  } catch (error) {
    return sendError(res, error, "Gagal mengunggah materi mentoring.");
  }
}

async function createReview(req, res) {
  if (!requireRole(req, res, "umkm_owner")) return null;

  const workspace = await findWorkspaceForUser(req.params.workspaceId, req.user);
  if (!workspace) return res.status(404).json({ message: "Workspace mentoring tidak ditemukan." });
  if (workspace.status !== "Completed") {
    return res.status(400).json({ message: "Evaluasi hanya bisa dikirim setelah mentoring selesai." });
  }

  const rating = Number(req.body?.rating || 0);
  if (rating < 1 || rating > 5) return res.status(400).json({ message: "Rating harus 1 sampai 5." });

  try {
    const now = new Date();
    await getPool().query(
      `INSERT INTO mentoring_reviews (workspace_id, rating, feedback, impact_testimonial, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        rating = VALUES(rating),
        feedback = VALUES(feedback),
        impact_testimonial = VALUES(impact_testimonial),
        updated_at = VALUES(updated_at)`,
      [workspace.id, rating, req.body?.feedback || "", req.body?.impactTestimonial || "", now, now]
    );
    return res.status(201).json({ message: "Evaluasi mentoring berhasil disimpan." });
  } catch (error) {
    return sendError(res, error, "Gagal menyimpan evaluasi mentoring.");
  }
}

async function completeWorkspace(req, res) {
  if (!requireRole(req, res, "mentor")) return null;

  const workspace = await findWorkspaceForUser(getWorkspaceId(req), req.user);
  if (!workspace) return res.status(404).json({ message: "Workspace mentoring tidak ditemukan." });
  if (workspace.status === "Cancelled") {
    return res.status(409).json({ message: "Workspace Cancelled tidak bisa diselesaikan." });
  }

  try {
    await getPool().query(
      `UPDATE mentoring_workspaces
      SET status = 'Completed', final_evaluation = ?, final_recommendation = ?, updated_at = ?
      WHERE id = ?`,
      [req.body?.finalEvaluation || "", req.body?.finalRecommendation || "", new Date(), workspace.id]
    );
    return res.json({ message: "Mentoring berhasil diselesaikan." });
  } catch (error) {
    return sendError(res, error, "Gagal menyelesaikan mentoring.");
  }
}

async function cancelWorkspace(req, res) {
  const workspace = await findWorkspaceForUser(getWorkspaceId(req), req.user);
  if (!workspace) return res.status(404).json({ message: "Workspace mentoring tidak ditemukan." });
  if (workspace.status === "Completed") {
    return res.status(409).json({ message: "Workspace Completed tetap bisa dibuka sebagai arsip dan tidak bisa dibatalkan." });
  }

  try {
    await getPool().query(
      `UPDATE mentoring_workspaces
      SET status = 'Cancelled', cancellation_reason = ?, updated_at = ?
      WHERE id = ?`,
      [req.body?.reason || "", new Date(), workspace.id]
    );
    return res.json({
      message: "Workspace mentoring berhasil dibatalkan.",
      data: { workspaceId: workspace.id, status: "Cancelled" },
    });
  } catch (error) {
    return sendError(res, error, "Gagal membatalkan workspace mentoring.");
  }
}

module.exports = {
  cancelMentoringRequest,
  acceptMentoringRequest,
  cancelWorkspace,
  cancelSession,
  completeSession,
  completeWorkspace,
  createBusinessProgress,
  createMentorNote,
  createMentoringRequest,
  createReview,
  createSession,
  createTask,
  createWorkspaceMessage,
  uploadWorkspaceFile,
  cancelTaskSubmission,
  deleteMentorNote,
  deleteTask,
  getMentorProfile,
  getWorkspace,
  getWorkspaceItems,
  listIncomingMentoringRequests,
  listMentorProfiles,
  listMyMentoringRequests,
  listRequestsByMentor,
  listRequestsByUmkm,
  listSessionsByWorkspace,
  listProgressByWorkspace,
  listNotesByWorkspace,
  listWorkspaceMessages,
  listWorkspaceFiles,
  listTasksByUmkm,
  listTasksByWorkspace,
  listMyWorkspaces,
  listWorkspacesByMentor,
  listWorkspacesByUmkm,
  rejectMentoringRequest,
  respondMentoringRequest,
  updateWorkspaceStatus,
  updateProgressRecommendation,
  updateMentorNote,
  updateSession,
  updateTask,
  updateTaskStatus,
  submitTask,
  upsertMyMentorProfile,
};

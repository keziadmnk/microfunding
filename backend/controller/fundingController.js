const { getPool } = require("../src/config/db");

async function listRecommendedUmkms(req, res) {
  if (req.user?.role !== "funder") {
    return res.status(403).json({ message: "Hanya Funder yang dapat melihat daftar UMKM pendanaan." });
  }

  try {
    const [rows] = await getPool().query(
      `SELECT
        b.id,
        b.name,
        b.category,
        b.other_category,
        b.description,
        b.location,
        b.logo,
        b.year_established,
        b.employee_count,
        b.monthly_revenue,
        b.funding_target,
        b.funding_purpose,
        b.business_goals,
        b.verified,
        u.name AS owner_name,
        COALESCE(SUM(CASE WHEN f.status IN ('approved', 'completed') THEN f.amount ELSE 0 END), 0) AS funded_amount
      FROM umkm_business b
      JOIN umkm_owners o ON o.id = b.owner_id
      JOIN users u ON u.id = o.user_id
      LEFT JOIN fundings f ON f.business_id = b.id
      GROUP BY
        b.id,
        b.name,
        b.category,
        b.other_category,
        b.description,
        b.location,
        b.logo,
        b.year_established,
        b.employee_count,
        b.monthly_revenue,
        b.funding_target,
        b.funding_purpose,
        b.business_goals,
        b.verified,
        u.name
      ORDER BY b.verified DESC, b.updated_at DESC, b.created_at DESC
      LIMIT 30`
    );

    const data = rows.map((row) => {
      const target = Number(row.funding_target || 0);
      const funded = Number(row.funded_amount || 0);
      const progress = target > 0 ? Math.min(100, Math.round((funded / target) * 100)) : 0;

      return {
        id: row.id,
        name: row.name,
        ownerName: row.owner_name,
        category: row.other_category || row.category || "Lainnya",
        description: row.description,
        location: row.location,
        logo: row.logo,
        yearEstablished: row.year_established,
        employeeCount: row.employee_count,
        monthlyRevenue: row.monthly_revenue,
        fundingTarget: target,
        fundedAmount: funded,
        fundingPurpose: row.funding_purpose,
        businessGoals: row.business_goals,
        progress,
        verified: Boolean(row.verified),
      };
    });

    return res.json({ data });
  } catch (error) {
    console.error("Error in listRecommendedUmkms:", error);
    return res.status(500).json({ message: "Gagal mengambil data UMKM dari database." });
  }
}

async function getFundingUmkm(req, res) {
  if (req.user?.role !== "funder") {
    return res.status(403).json({ message: "Hanya Funder yang dapat melihat detail UMKM pendanaan." });
  }

  try {
    const umkm = await findFundingUmkm(req.params.id);

    if (!umkm) {
      return res.status(404).json({ message: "Data UMKM tidak ditemukan." });
    }

    return res.json({ data: umkm });
  } catch (error) {
    console.error("Error in getFundingUmkm:", error);
    return res.status(500).json({ message: "Gagal mengambil detail UMKM." });
  }
}

async function createFunding(req, res) {
  if (req.user?.role !== "funder") {
    return res.status(403).json({ message: "Hanya Funder yang dapat melakukan pendanaan." });
  }

  const businessId = Number(req.params.id);
  const amount = Number(req.body?.amount || 0);
  const description = String(req.body?.description || "").trim() || null;

  if (!businessId) {
    return res.status(400).json({ message: "ID UMKM tidak valid." });
  }

  if (!amount || amount <= 0) {
    return res.status(400).json({ message: "Nominal pendanaan wajib lebih dari 0." });
  }

  try {
    const [funders] = await getPool().query("SELECT id FROM funders WHERE user_id = ? LIMIT 1", [req.user.sub]);
    const funder = funders[0];

    if (!funder) {
      return res.status(404).json({ message: "Profil funder tidak ditemukan." });
    }

    const umkm = await findFundingUmkm(businessId);
    if (!umkm) {
      return res.status(404).json({ message: "Data UMKM tidak ditemukan." });
    }

    const now = new Date();
    const [result] = await getPool().query(
      `INSERT INTO fundings
        (funder_id, business_id, amount, description, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'completed', ?, ?)`,
      [funder.id, businessId, amount, description, now, now]
    );

    return res.status(201).json({
      message: "Pendanaan berhasil diselesaikan dan tercatat di funding history.",
      data: {
        id: result.insertId,
        businessId,
        amount,
        status: "completed",
      },
    });
  } catch (error) {
    console.error("Error in createFunding:", error);
    return res.status(500).json({ message: "Gagal menyimpan data pendanaan." });
  }
}

async function listFundingHistory(req, res) {
  if (req.user?.role !== "funder") {
    return res.status(403).json({ message: "Hanya Funder yang dapat melihat funding history." });
  }

  try {
    const [funders] = await getPool().query("SELECT id FROM funders WHERE user_id = ? LIMIT 1", [req.user.sub]);
    const funder = funders[0];

    if (!funder) {
      return res.status(404).json({ message: "Profil funder tidak ditemukan." });
    }

    const [rows] = await getPool().query(
      `SELECT
        f.id,
        f.business_id,
        f.amount,
        f.description,
        f.proof_of_transfer,
        f.status,
        f.created_at,
        f.updated_at,
        b.name AS business_name,
        b.category,
        b.other_category,
        b.description AS business_description,
        b.location,
        b.logo,
        b.funding_target,
        u.name AS owner_name,
        COALESCE(SUM(CASE WHEN all_f.status IN ('approved', 'completed') THEN all_f.amount ELSE 0 END), 0) AS funded_amount
      FROM fundings f
      JOIN umkm_business b ON b.id = f.business_id
      JOIN umkm_owners o ON o.id = b.owner_id
      JOIN users u ON u.id = o.user_id
      LEFT JOIN fundings all_f ON all_f.business_id = b.id
      WHERE f.funder_id = ?
      GROUP BY
        f.id,
        f.business_id,
        f.amount,
        f.description,
        f.proof_of_transfer,
        f.status,
        f.created_at,
        f.updated_at,
        b.name,
        b.category,
        b.other_category,
        b.description,
        b.location,
        b.logo,
        b.funding_target,
        u.name
      ORDER BY f.created_at DESC, f.id DESC`,
      [funder.id]
    );

    const data = rows.map((row) => {
      const target = Number(row.funding_target || 0);
      const funded = Number(row.funded_amount || 0);
      const progress = target > 0 ? Math.min(100, Math.round((funded / target) * 100)) : 0;

      return {
        id: row.id,
        businessId: row.business_id,
        businessName: row.business_name,
        ownerName: row.owner_name,
        category: row.other_category || row.category || "Lainnya",
        description: row.business_description,
        businessDescription: row.business_description,
        requestDescription: row.description,
        location: row.location,
        logo: row.logo,
        amount: Number(row.amount || 0),
        status: row.status,
        fundingTarget: target,
        fundedAmount: funded,
        progress,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    });

    return res.json({
      pending: data.filter((item) => item.status === "pending"),
      history: data.filter((item) => ["approved", "completed"].includes(item.status)),
    });
  } catch (error) {
    console.error("Error in listFundingHistory:", error);
    return res.status(500).json({ message: "Gagal mengambil funding history." });
  }
}

async function getFundingRequest(req, res) {
  if (req.user?.role !== "funder") {
    return res.status(403).json({ message: "Hanya Funder yang dapat melihat request funding." });
  }

  const requestId = Number(req.params.id);
  if (!requestId) {
    return res.status(400).json({ message: "ID request funding tidak valid." });
  }

  try {
    await normalizeCompletedPaymentFundings();
    const [funders] = await getPool().query("SELECT id FROM funders WHERE user_id = ? LIMIT 1", [req.user.sub]);
    const funder = funders[0];
    if (!funder) {
      return res.status(404).json({ message: "Profil funder tidak ditemukan." });
    }

    const [rows] = await getPool().query(
      `SELECT
        f.id,
        f.business_id,
        f.amount,
        f.description,
        f.status,
        f.created_at,
        b.name AS business_name,
        b.category,
        b.other_category,
        b.description AS business_description,
        b.location,
        b.logo,
        b.funding_target,
        b.funding_purpose,
        b.business_goals,
        b.verified,
        u.name AS owner_name,
        COALESCE(SUM(CASE WHEN all_f.status IN ('approved', 'completed') THEN all_f.amount ELSE 0 END), 0) AS funded_amount
      FROM fundings f
      JOIN umkm_business b ON b.id = f.business_id
      JOIN umkm_owners o ON o.id = b.owner_id
      JOIN users u ON u.id = o.user_id
      LEFT JOIN fundings all_f ON all_f.business_id = b.id
      WHERE f.id = ? AND f.funder_id = ?
      GROUP BY
        f.id,
        f.business_id,
        f.amount,
        f.description,
        f.status,
        f.created_at,
        b.name,
        b.category,
        b.other_category,
        b.description,
        b.location,
        b.logo,
        b.funding_target,
        b.funding_purpose,
        b.business_goals,
        b.verified,
        u.name
      LIMIT 1`,
      [requestId, funder.id]
    );

    const row = rows[0];
    if (!row) {
      return res.status(404).json({ message: "Request funding tidak ditemukan." });
    }

    const target = Number(row.funding_target || 0);
    const funded = Number(row.funded_amount || 0);
    const progress = target > 0 ? Math.min(100, Math.round((funded / target) * 100)) : 0;

    return res.json({
      data: {
        id: row.id,
        businessId: row.business_id,
        businessName: row.business_name,
        ownerName: row.owner_name,
        category: row.other_category || row.category || "Lainnya",
        description: row.business_description,
        businessDescription: row.business_description,
        requestDescription: row.description,
        location: row.location,
        logo: row.logo,
        amount: Number(row.amount || 0),
        status: row.status,
        fundingTarget: target,
        fundedAmount: funded,
        fundingPurpose: row.funding_purpose,
        businessGoals: row.business_goals,
        progress,
        verified: Boolean(row.verified),
        createdAt: row.created_at,
      },
    });
  } catch (error) {
    console.error("Error in getFundingRequest:", error);
    return res.status(500).json({ message: "Gagal mengambil detail request funding." });
  }
}

async function completeFundingRequest(req, res) {
  if (req.user?.role !== "funder") {
    return res.status(403).json({ message: "Hanya Funder yang dapat menyelesaikan pembayaran funding." });
  }

  const requestId = Number(req.params.id);
  const contributionAmount = Number(req.body?.amount || 0);
  if (!requestId) {
    return res.status(400).json({ message: "ID request funding tidak valid." });
  }

  if (!contributionAmount || contributionAmount <= 0) {
    return res.status(400).json({ message: "Jumlah kontribusi funder wajib lebih dari 0." });
  }

  try {
    const [funders] = await getPool().query("SELECT id FROM funders WHERE user_id = ? LIMIT 1", [req.user.sub]);
    const funder = funders[0];
    if (!funder) {
      return res.status(404).json({ message: "Profil funder tidak ditemukan." });
    }

    const [requests] = await getPool().query(
      "SELECT id, status FROM fundings WHERE id = ? AND funder_id = ? LIMIT 1",
      [requestId, funder.id]
    );
    const request = requests[0];
    if (!request) {
      return res.status(404).json({ message: "Request funding tidak ditemukan." });
    }

    if (request.status !== "pending") {
      return res.status(400).json({ message: "Request funding ini sudah diproses." });
    }

    const now = new Date();
    await getPool().query(
      "UPDATE fundings SET amount = ?, status = 'completed', updated_at = ? WHERE id = ?",
      [contributionAmount, now, requestId]
    );

    return res.json({
      message: "Pembayaran berhasil diselesaikan dan funding telah tercatat.",
      data: {
        id: requestId,
        amount: contributionAmount,
        status: "completed",
      },
    });
  } catch (error) {
    console.error("Error in completeFundingRequest:", error);
    return res.status(500).json({ message: "Gagal menyelesaikan pembayaran funding." });
  }
}

async function listUmkmFundingHistory(req, res) {
  if (req.user?.role !== "umkm_owner") {
    return res.status(403).json({ message: "Hanya UMKM Owner yang dapat melihat funding history UMKM." });
  }

  try {
    await normalizeCompletedPaymentFundings();
    const [businessRows] = await getPool().query(
      `SELECT
        b.id,
        b.name,
        b.funding_target,
        COALESCE(SUM(CASE WHEN f.status IN ('approved', 'completed') THEN f.amount ELSE 0 END), 0) AS funded_amount,
        COUNT(DISTINCT CASE WHEN f.status IN ('approved', 'completed') THEN f.funder_id END) AS funder_count
      FROM umkm_business b
      JOIN umkm_owners o ON o.id = b.owner_id
      LEFT JOIN fundings f ON f.business_id = b.id
      WHERE o.user_id = ?
      GROUP BY b.id, b.name, b.funding_target
      LIMIT 1`,
      [req.user.sub]
    );

    const business = businessRows[0];
    if (!business) {
      return res.status(404).json({ message: "Profil bisnis UMKM tidak ditemukan." });
    }

    const [funderRows] = await getPool().query(
      `SELECT
        f.id,
        f.funder_id,
        COALESCE(NULLIF(fd.organization_name, ''), u.name, 'Funder MicroFun') AS funder_name,
        f.amount AS total_funded,
        f.updated_at AS last_funded_at
      FROM fundings f
      LEFT JOIN funders fd ON fd.id = f.funder_id
      LEFT JOIN users u ON u.id = fd.user_id
      WHERE f.business_id = ?
        AND f.status IN ('approved', 'completed')
      ORDER BY f.updated_at DESC, f.id DESC
      LIMIT 20`,
      [business.id]
    );

    const [pendingRows] = await getPool().query(
      `SELECT
        f.id,
        f.funder_id,
        COALESCE(NULLIF(fd.organization_name, ''), u.name, 'Funder MicroFun') AS funder_name,
        f.amount,
        f.description,
        f.created_at
      FROM fundings f
      LEFT JOIN funders fd ON fd.id = f.funder_id
      LEFT JOIN users u ON u.id = fd.user_id
      WHERE f.business_id = ?
        AND f.status = 'pending'
        AND (f.description IS NULL OR f.description NOT LIKE 'Metode pembayaran:%')
      ORDER BY f.created_at DESC, f.id DESC`,
      [business.id]
    );

    const target = Number(business.funding_target || 0);
    const funded = Number(business.funded_amount || 0);
    const progress = target > 0 ? Math.min(100, Math.round((funded / target) * 100)) : 0;

    return res.json({
      summary: {
        businessId: business.id,
        businessName: business.name,
        fundingTarget: target,
        fundedAmount: funded,
        progress,
        funderCount: Number(business.funder_count || 0),
      },
      funders: funderRows.map((row) => ({
        id: row.id,
        funderId: row.funder_id,
        name: row.funder_name,
        totalFunded: Number(row.total_funded || 0),
        lastFundedAt: row.last_funded_at,
      })),
      pendingRequests: pendingRows.map((row) => ({
        id: row.id,
        funderId: row.funder_id,
        name: row.funder_name,
        amount: Number(row.amount || 0),
        description: row.description,
        requestedAt: row.created_at,
      })),
    });
  } catch (error) {
    console.error("Error in listUmkmFundingHistory:", error);
    return res.status(500).json({ message: "Gagal mengambil funding history UMKM." });
  }
}

async function listFundersForUmkm(req, res) {
  if (req.user?.role !== "umkm_owner") {
    return res.status(403).json({ message: "Hanya UMKM Owner yang dapat melihat daftar funder." });
  }

  try {
    await normalizeCompletedPaymentFundings();
    const [rows] = await getPool().query(
      `SELECT
        f.id,
        f.organization_name,
        f.funding_min,
        f.funding_max,
        f.investment_interests,
        f.expertise_areas,
        f.verified,
        f.updated_at,
        u.name AS user_name,
        u.bio AS user_bio,
        u.profile_photo
      FROM funders f
      JOIN users u ON u.id = f.user_id
      ORDER BY f.verified DESC, f.updated_at DESC, f.created_at DESC
      LIMIT 50`
    );

    return res.json({
      data: rows.map((row) => ({
        id: row.id,
        name: row.organization_name || row.user_name || "Funder MicroFun",
        fundingMin: Number(row.funding_min || 0),
        fundingMax: Number(row.funding_max || 0),
        investmentInterests: parseJsonArray(row.investment_interests),
        expertiseAreas: parseJsonArray(row.expertise_areas),
        bio: row.user_bio || "Funder ini belum menambahkan bio investasi lengkap.",
        profilePhoto: row.profile_photo,
        verified: Boolean(row.verified),
        updatedAt: row.updated_at,
      })),
    });
  } catch (error) {
    console.error("Error in listFundersForUmkm:", error);
    return res.status(500).json({ message: "Gagal mengambil daftar funder." });
  }
}

async function createFundingRequestByUmkm(req, res) {
  if (req.user?.role !== "umkm_owner") {
    return res.status(403).json({ message: "Hanya UMKM Owner yang dapat mengirim request funding." });
  }

  const funderId = Number(req.params.id);
  const amount = Number(req.body?.amount || 0);
  const description = String(req.body?.description || "").trim();

  if (!funderId) {
    return res.status(400).json({ message: "ID funder tidak valid." });
  }

  if (!amount || amount < 1000000 || amount > 100000000) {
    return res.status(400).json({ message: "Jumlah pendanaan harus antara Rp 1.000.000 dan Rp 100.000.000." });
  }

  if (description.length > 1000) {
    return res.status(400).json({ message: "Deskripsi permohonan maksimal 1000 karakter." });
  }

  try {
    const [[funder]] = await getPool().query("SELECT id FROM funders WHERE id = ? LIMIT 1", [funderId]);
    if (!funder) {
      return res.status(404).json({ message: "Funder tidak ditemukan." });
    }

    const [[business]] = await getPool().query(
      `SELECT b.id
       FROM umkm_business b
       JOIN umkm_owners o ON o.id = b.owner_id
       WHERE o.user_id = ?
       ORDER BY b.updated_at DESC, b.created_at DESC
       LIMIT 1`,
      [req.user.sub]
    );

    if (!business) {
      return res.status(404).json({ message: "Profil bisnis UMKM tidak ditemukan. Lengkapi profil bisnis terlebih dahulu." });
    }

    const now = new Date();
    const [result] = await getPool().query(
      `INSERT INTO fundings
        (funder_id, business_id, amount, description, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'pending', ?, ?)`,
      [funderId, business.id, amount, description || null, now, now]
    );

    return res.status(201).json({
      message: "Request funding berhasil dikirim ke funder.",
      data: {
        id: result.insertId,
        funderId,
        businessId: business.id,
        amount,
        status: "pending",
      },
    });
  } catch (error) {
    console.error("Error in createFundingRequestByUmkm:", error);
    return res.status(500).json({ message: "Gagal mengirim request funding." });
  }
}

async function findFundingUmkm(id) {
  await normalizeCompletedPaymentFundings();

  const [rows] = await getPool().query(
    `SELECT
      b.id,
      b.name,
      b.category,
      b.other_category,
      b.description,
      b.location,
      b.logo,
      b.year_established,
      b.employee_count,
      b.monthly_revenue,
      b.funding_target,
      b.funding_purpose,
      b.business_goals,
      b.verified,
      u.name AS owner_name,
      COALESCE(SUM(CASE WHEN f.status IN ('approved', 'completed') THEN f.amount ELSE 0 END), 0) AS funded_amount
    FROM umkm_business b
    JOIN umkm_owners o ON o.id = b.owner_id
    JOIN users u ON u.id = o.user_id
    LEFT JOIN fundings f ON f.business_id = b.id
    WHERE b.id = ?
    GROUP BY
      b.id,
      b.name,
      b.category,
      b.other_category,
      b.description,
      b.location,
      b.logo,
      b.year_established,
      b.employee_count,
      b.monthly_revenue,
      b.funding_target,
      b.funding_purpose,
      b.business_goals,
      b.verified,
      u.name
    LIMIT 1`,
    [id]
  );

  const row = rows[0];
  if (!row) return null;

  const target = Number(row.funding_target || 0);
  const funded = Number(row.funded_amount || 0);
  const progress = target > 0 ? Math.min(100, Math.round((funded / target) * 100)) : 0;

  return {
    id: row.id,
    name: row.name,
    ownerName: row.owner_name,
    category: row.other_category || row.category || "Lainnya",
    description: row.description,
    location: row.location,
    logo: row.logo,
    yearEstablished: row.year_established,
    employeeCount: row.employee_count,
    monthlyRevenue: row.monthly_revenue,
    fundingTarget: target,
    fundedAmount: funded,
    fundingPurpose: row.funding_purpose,
    businessGoals: row.business_goals,
    progress,
    verified: Boolean(row.verified),
  };
}

function parseJsonArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return String(value)
      .split(/[,;\n]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
}

async function normalizeCompletedPaymentFundings() {
  await getPool().query(
    `UPDATE fundings
     SET status = 'completed'
     WHERE status = 'pending'
       AND description LIKE 'Metode pembayaran:%'`
  );
}

module.exports = {
  listRecommendedUmkms,
  getFundingUmkm,
  createFunding,
  getFundingRequest,
  completeFundingRequest,
  listFundingHistory,
  listUmkmFundingHistory,
  listFundersForUmkm,
  createFundingRequestByUmkm,
};

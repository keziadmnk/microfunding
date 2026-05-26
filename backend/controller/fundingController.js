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
      VALUES (?, ?, ?, ?, 'pending', ?, ?)`,
      [funder.id, businessId, amount, description, now, now]
    );

    return res.status(201).json({
      message: "Pendanaan berhasil dibuat dan menunggu verifikasi.",
      data: {
        id: result.insertId,
        businessId,
        amount,
        status: "pending",
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
      history: data,
    });
  } catch (error) {
    console.error("Error in listFundingHistory:", error);
    return res.status(500).json({ message: "Gagal mengambil funding history." });
  }
}

async function findFundingUmkm(id) {
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

module.exports = {
  listRecommendedUmkms,
  getFundingUmkm,
  createFunding,
  listFundingHistory,
};

const { getPool } = require("../src/config/db");

const GEMINI_GENERATE_CONTENT_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

async function businessAdvisor(req, res) {
  const userId = req.user?.sub;
  const userRole = req.user?.role;

  if (userRole !== "umkm_owner") {
    return res.status(403).json({ message: "Hanya UMKM Owner yang dapat menggunakan AI Business Advisor." });
  }

  const { question, history = [] } = req.body || {};
  const trimmedQuestion = String(question || "").trim();

  if (!trimmedQuestion) {
    return res.status(400).json({ message: "Pertanyaan wajib diisi." });
  }

  if (!getGeminiApiKey()) {
    return res.status(500).json({ message: "GEMINI_API_KEY belum dikonfigurasi di backend." });
  }

  try {
    const profile = await getUmkmBusinessProfile(userId);
    const prompt = buildBusinessAdvisorPrompt(profile, trimmedQuestion, history);
    const aiResponse = await callGeminiGenerateContent(prompt);

    return res.json({
      answer: aiResponse.answer,
      model: aiResponse.model,
      usage: aiResponse.usage,
    });
  } catch (error) {
    console.error("Error in businessAdvisor:", error);
    return res.status(error.statusCode || 500).json({
      message: error.publicMessage || "Gagal menghubungi AI Business Advisor.",
      error: error.message,
    });
  }
}

async function umkmAiMatching(req, res) {
  const userId = req.user?.sub;
  const userRole = req.user?.role;

  if (userRole !== "umkm_owner") {
    return res.status(403).json({ message: "Hanya UMKM Owner yang dapat mencari funder dan mentor dengan AI." });
  }

  if (!getGeminiApiKey()) {
    return res.status(500).json({ message: "GEMINI_API_KEY belum dikonfigurasi di backend." });
  }

  try {
    const [profile, funders, mentors] = await Promise.all([
      getUmkmBusinessProfile(userId),
      getFunderCandidates(),
      getMentorCandidates(),
    ]);

    const prompt = buildUmkmMatchingPrompt(profile, funders, mentors);
    const aiResponse = await callGeminiGenerateContent(prompt, { json: true, maxOutputTokens: 1600 });
    const parsed = parseAiJson(aiResponse.answer);

    return res.json({
      summary: parsed.summary || "AI berhasil menganalisis kecocokan funder dan mentor.",
      funders: Array.isArray(parsed.funders) ? parsed.funders : [],
      mentors: Array.isArray(parsed.mentors) ? parsed.mentors : [],
      model: aiResponse.model,
    });
  } catch (error) {
    console.error("Error in umkmAiMatching:", error);
    return res.status(error.statusCode || 500).json({
      message: error.publicMessage || "Gagal membuat rekomendasi funder dan mentor.",
      error: error.message,
    });
  }
}

async function funderAiRecommendations(req, res) {
  const userId = req.user?.sub;
  const userRole = req.user?.role;

  if (userRole !== "funder") {
    return res.status(403).json({ message: "Hanya Funder yang dapat menggunakan rekomendasi AI." });
  }

  if (!getGeminiApiKey()) {
    return res.status(500).json({ message: "GEMINI_API_KEY belum dikonfigurasi di backend." });
  }

  const { target = "", supportType = "" } = req.body || {};

  try {
    const [funderProfile, umkms] = await Promise.all([
      getFunderProfile(userId),
      getUmkmCandidates(),
    ]);

    const prompt = buildFunderRecommendationPrompt(funderProfile, umkms, target, supportType);
    const aiResponse = await callGeminiGenerateContent(prompt, { json: true, maxOutputTokens: 1600 });
    const parsed = parseAiJson(aiResponse.answer);

    return res.json({
      summary: parsed.summary || "AI berhasil menganalisis UMKM yang paling sesuai.",
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
      model: aiResponse.model,
    });
  } catch (error) {
    console.error("Error in funderAiRecommendations:", error);
    return res.status(error.statusCode || 500).json({
      message: error.publicMessage || "Gagal membuat rekomendasi UMKM.",
      error: error.message,
    });
  }
}

async function getUmkmBusinessProfile(userId) {
  const [rows] = await getPool().query(
    `SELECT
      u.name AS owner_name,
      u.email,
      b.name AS business_name,
      b.category,
      b.other_category,
      b.description,
      b.location,
      b.year_established,
      b.employee_count,
      b.monthly_revenue,
      b.funding_target,
      b.funding_purpose,
      b.business_goals,
      b.legal_documents
    FROM users u
    JOIN umkm_owners o ON o.user_id = u.id
    LEFT JOIN umkm_business b ON b.owner_id = o.id
    WHERE u.id = ?
    LIMIT 1`,
    [userId]
  );

  return rows[0] || {};
}

async function getFunderProfile(userId) {
  const [rows] = await getPool().query(
    `SELECT
      u.name,
      u.email,
      u.bio,
      f.id AS funder_id,
      f.organization_name,
      f.funding_min,
      f.funding_max,
      f.investment_interests,
      f.expertise_areas,
      f.verified
    FROM users u
    JOIN funders f ON f.user_id = u.id
    WHERE u.id = ?
    LIMIT 1`,
    [userId]
  );

  const profile = rows[0] || {};
  return {
    ...profile,
    investment_interests: parseJsonArray(profile.investment_interests),
    expertise_areas: parseJsonArray(profile.expertise_areas),
  };
}

async function getFunderCandidates() {
  const [rows] = await getPool().query(
    `SELECT
      f.id,
      u.name,
      u.email,
      u.bio,
      f.organization_name,
      f.funding_min,
      f.funding_max,
      f.investment_interests,
      f.expertise_areas,
      f.verified
    FROM funders f
    JOIN users u ON u.id = f.user_id
    ORDER BY f.verified DESC, f.updated_at DESC
    LIMIT 20`
  );

  return rows.map((row) => ({
    ...row,
    investment_interests: parseJsonArray(row.investment_interests),
    expertise_areas: parseJsonArray(row.expertise_areas),
  }));
}

async function getMentorCandidates() {
  const [rows] = await getPool().query(
    `SELECT
      m.id,
      u.name,
      u.email,
      m.current_job,
      m.experience,
      m.about,
      m.reputation_score,
      m.verified,
      GROUP_CONCAT(ms.skill ORDER BY ms.skill SEPARATOR ', ') AS skills
    FROM mentors m
    JOIN users u ON u.id = m.user_id
    LEFT JOIN mentor_skills ms ON ms.mentor_id = m.id
    GROUP BY m.id, u.name, u.email, m.current_job, m.experience, m.about, m.reputation_score, m.verified
    ORDER BY m.verified DESC, m.reputation_score DESC
    LIMIT 20`
  );

  return rows.map((row) => ({
    ...row,
    skills: row.skills ? row.skills.split(", ").filter(Boolean) : [],
  }));
}

async function getUmkmCandidates() {
  const [rows] = await getPool().query(
    `SELECT
      b.id,
      b.name,
      b.category,
      b.other_category,
      b.description,
      b.location,
      b.year_established,
      b.employee_count,
      b.monthly_revenue,
      b.funding_target,
      b.funding_purpose,
      b.business_goals,
      b.legal_documents,
      b.verified,
      u.name AS owner_name,
      u.email AS owner_email
    FROM umkm_business b
    JOIN umkm_owners o ON o.id = b.owner_id
    JOIN users u ON u.id = o.user_id
    ORDER BY b.verified DESC, b.updated_at DESC
    LIMIT 30`
  );

  return rows.map((row) => ({
    ...row,
    legal_documents: parseJsonArray(row.legal_documents),
  }));
}

function buildBusinessAdvisorPrompt(profile, question, history) {
  const safeHistory = Array.isArray(history) ? history.slice(-8) : [];
  const normalizedHistory = safeHistory
    .filter((message) => ["user", "assistant"].includes(message.role) && message.content)
    .map((message) => `${message.role === "user" ? "User" : "AI Advisor"}: ${String(message.content).slice(0, 2000)}`)
    .join("\n");

  return `Anda adalah MicroFun AI Business Advisor untuk UMKM Indonesia.
Jawab dalam Bahasa Indonesia yang praktis, jelas, dan langsung bisa dijalankan.
Berikan saran bisnis yang realistis untuk UMKM, terutama pemasaran, operasional, harga, ekspansi, pendanaan, dan kesiapan bertemu funder/mentor.
Jangan mengarang data yang tidak ada. Jika data profil belum lengkap, jelaskan data apa yang perlu dilengkapi.
Format jawaban ringkas dengan langkah konkret. Jika cocok, gunakan 3-5 poin aksi.

Konteks profil UMKM:
- Pemilik: ${profile.owner_name || "-"}
- Email akun: ${profile.email || "-"}
- Nama bisnis: ${profile.business_name || "-"}
- Sektor: ${profile.other_category || profile.category || "-"}
- Lokasi: ${profile.location || "-"}
- Tahun berdiri: ${profile.year_established || "-"}
- Jumlah karyawan: ${profile.employee_count || "-"}
- Omzet bulanan: ${profile.monthly_revenue || "-"}
- Deskripsi: ${profile.description || "-"}
- Target pendanaan: ${profile.funding_target || "-"}
- Rencana penggunaan dana: ${profile.funding_purpose || "-"}
- Goal bisnis: ${profile.business_goals || "-"}
- Dokumen legalitas: ${formatJsonArray(profile.legal_documents)}

Riwayat percakapan:
${normalizedHistory || "-"}

Pertanyaan terbaru user:
${question}`;
}

function buildUmkmMatchingPrompt(profile, funders, mentors) {
  return `Anda adalah AI Matching Engine MicroFun.
Tugas: rekomendasikan funder dan mentor paling cocok untuk UMKM berdasarkan profil bisnis UMKM dan profil kandidat.
Analisis harus nyambung. Contoh: jika UMKM F&B, prioritaskan funder yang minatnya Kuliner/F&B/Food & Beverage dan mentor dengan skill marketing, operasional, distribusi, atau food business.
Jangan rekomendasikan kandidat yang tidak ada di daftar.
Berikan output JSON valid saja, tanpa markdown.

Profil UMKM:
${JSON.stringify(profile, null, 2)}

Kandidat funder:
${JSON.stringify(funders, null, 2)}

Kandidat mentor:
${JSON.stringify(mentors, null, 2)}

Format JSON:
{
  "summary": "ringkasan singkat analisis",
  "funders": [
    {
      "id": 1,
      "name": "nama funder",
      "organization": "organisasi atau null",
      "matchScore": 92,
      "reason": "alasan cocok yang spesifik",
      "nextStep": "aksi lanjutan yang disarankan"
    }
  ],
  "mentors": [
    {
      "id": 1,
      "name": "nama mentor",
      "expertise": "keahlian utama",
      "matchScore": 88,
      "reason": "alasan cocok yang spesifik",
      "nextStep": "aksi lanjutan yang disarankan"
    }
  ]
}

Pilih maksimal 3 funder dan 3 mentor.`;
}

function buildFunderRecommendationPrompt(funderProfile, umkms, target, supportType) {
  return `Anda adalah AI Discovery Engine MicroFun untuk funder.
Tugas: rekomendasikan UMKM paling sesuai berdasarkan profil funder, minat investasi, budget, input target/harapan, jenis bantuan yang ingin diberikan, dan profil UMKM.
Analisis harus nyambung. Contoh: jika funder minat di F&B/Kuliner, UMKM F&B harus diprioritaskan. Jika budget funder 10-15 juta, jelaskan apakah target pendanaan UMKM sesuai atau butuh partial funding.
Jangan rekomendasikan UMKM yang tidak ada di daftar.
Berikan output JSON valid saja, tanpa markdown.

Profil funder:
${JSON.stringify(funderProfile, null, 2)}

Input target/harapan funder:
${target || "-"}

Jenis bantuan yang ingin diberikan:
${supportType || "-"}

Kandidat UMKM:
${JSON.stringify(umkms, null, 2)}

Format JSON:
{
  "summary": "ringkasan singkat analisis",
  "recommendations": [
    {
      "id": 1,
      "name": "nama UMKM",
      "category": "kategori",
      "location": "lokasi",
      "fundingTarget": 10000000,
      "matchScore": 91,
      "reason": "alasan cocok yang spesifik dengan profil funder dan input target",
      "supportFit": "bantuan funder yang paling relevan",
      "nextStep": "aksi lanjutan yang disarankan"
    }
  ]
}

Pilih maksimal 6 UMKM.`;
}

async function callGeminiGenerateContent(prompt, options = {}) {
  const apiKey = getGeminiApiKey();
  const model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  const endpoint = `${process.env.GEMINI_BASE_URL || GEMINI_GENERATE_CONTENT_URL}/${model}:generateContent`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: options.temperature ?? 0.4,
        maxOutputTokens: options.maxOutputTokens || 900,
        ...(options.json ? { responseMimeType: "application/json" } : {}),
        thinkingConfig: {
          thinkingBudget: 0,
        },
      },
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const providerMessage = getProviderErrorMessage(payload, response.status);
    const error = new Error(providerMessage);
    error.statusCode = response.status === 400 || response.status === 401 || response.status === 403 ? 502 : response.status;
    error.publicMessage = buildGeminiPublicErrorMessage(response.status, providerMessage);
    throw error;
  }

  const answer = payload?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || "")
    .join("")
    .trim();

  if (!answer) {
    throw new Error("Respons Gemini tidak berisi jawaban.");
  }

  return {
    answer,
    model,
    usage: payload.usage,
  };
}

function getProviderErrorMessage(payload, status) {
  if (typeof payload?.error === "string") return payload.error;
  if (payload?.error?.message) return payload.error.message;
  if (payload?.message) return payload.message;
  if (payload?.code) return payload.code;

  return `Gemini API error ${status}`;
}

function getGeminiApiKey() {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
}

function parseAiJson(text) {
  const cleaned = String(text || "")
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (error) {
    throw new Error(`AI mengembalikan format JSON tidak valid: ${error.message}`);
  }
}

function buildGeminiPublicErrorMessage(status, providerMessage) {
  if (status === 400) {
    return `Gemini menolak format request atau model tidak tersedia. Detail provider: ${providerMessage}`;
  }

  if (status === 401) {
    return "Gemini menolak API key. Periksa GEMINI_API_KEY di backend/.env.";
  }

  if (status === 403) {
    return [
      "Gemini menolak request dengan status 403.",
      "Biasanya karena API key belum aktif, project belum diberi akses, quota habis, atau region tidak didukung.",
      `Detail provider: ${providerMessage}`,
    ].join(" ");
  }

  return `Gagal menghubungi Gemini: ${providerMessage}`;
}

function formatJsonArray(value) {
  if (!value) return "-";

  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(", ") : "-";
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed.join(", ") : "-";
  } catch (_) {
    return String(value);
  }
}

function parseJsonArray(value) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value;
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

module.exports = {
  businessAdvisor,
  umkmAiMatching,
  funderAiRecommendations,
};

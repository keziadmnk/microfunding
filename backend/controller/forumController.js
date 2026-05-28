const { getPool } = require("../src/config/db");

const defaultForum = {
  title: "MicroFun Ecosystem Forum",
  description: "Collaboration and discussion forum for the MicroFun ecosystem.",
};

async function listPosts(req, res) {
  const userId = req.user?.sub;

  try {
    await ensureUserCoordinateColumns();
    await ensureBusinessCoordinateColumns();
    const forumId = await ensureDefaultForum();
    const [posts] = await getPool().query(
      `SELECT
        p.id,
        p.title,
        p.body,
        p.created_at,
        p.updated_at,
        u.id AS author_id,
        COALESCE(
          CASE
            WHEN u.role = 'umkm_owner' THEN NULLIF(b.name, '')
            WHEN u.role = 'funder' THEN NULLIF(fd.organization_name, '')
            ELSE NULL
          END,
          u.name
        ) AS author_name,
        u.role AS author_role,
        u.profile_photo,
        b.logo AS business_logo,
        COUNT(DISTINCT pl.id) AS like_count,
        COUNT(DISTINCT c.id) AS comment_count,
        MAX(CASE WHEN pl.user_id = ? THEN 1 ELSE 0 END) AS liked_by_me
      FROM posts p
      JOIN users u ON u.id = p.posted_by
      LEFT JOIN umkm_owners o ON o.user_id = u.id
      LEFT JOIN umkm_business b ON b.owner_id = o.id
      LEFT JOIN funders fd ON fd.user_id = u.id
      LEFT JOIN post_likes pl ON pl.post_id = p.id
      LEFT JOIN comments c ON c.post_id = p.id
      WHERE p.forum_id = ?
        AND (p.status IS NULL OR p.status = 'published')
      GROUP BY
        p.id,
        p.title,
        p.body,
        p.created_at,
        p.updated_at,
        u.id,
        u.name,
        b.name,
        fd.organization_name,
        u.role,
        u.profile_photo,
        b.logo
      ORDER BY p.created_at DESC, p.id DESC
      LIMIT 50`,
      [userId, forumId]
    );

    const [myPosts] = await getPool().query(
      `SELECT
        p.id,
        p.title,
        p.body,
        p.created_at,
        p.updated_at,
        u.id AS author_id,
        COALESCE(
          CASE
            WHEN u.role = 'umkm_owner' THEN NULLIF(b.name, '')
            WHEN u.role = 'funder' THEN NULLIF(fd.organization_name, '')
            ELSE NULL
          END,
          u.name
        ) AS author_name,
        u.role AS author_role,
        u.profile_photo,
        b.logo AS business_logo,
        COUNT(DISTINCT pl.id) AS like_count,
        COUNT(DISTINCT c.id) AS comment_count,
        MAX(CASE WHEN pl.user_id = ? THEN 1 ELSE 0 END) AS liked_by_me
      FROM posts p
      JOIN users u ON u.id = p.posted_by
      LEFT JOIN umkm_owners o ON o.user_id = u.id
      LEFT JOIN umkm_business b ON b.owner_id = o.id
      LEFT JOIN funders fd ON fd.user_id = u.id
      LEFT JOIN post_likes pl ON pl.post_id = p.id
      LEFT JOIN comments c ON c.post_id = p.id
      WHERE p.forum_id = ?
        AND p.posted_by = ?
        AND (p.status IS NULL OR p.status = 'published')
      GROUP BY
        p.id,
        p.title,
        p.body,
        p.created_at,
        p.updated_at,
        u.id,
        u.name,
        b.name,
        fd.organization_name,
        u.role,
        u.profile_photo,
        b.logo
      ORDER BY p.created_at DESC, p.id DESC
      LIMIT 50`,
      [userId, forumId, userId]
    );

    const postIds = Array.from(new Set([...posts, ...myPosts].map((post) => post.id)));
    const commentsByPost = await getCommentsByPost(postIds);
    const network = await getNetworkParticipants();
    const stats = await getForumStats(userId);

    return res.json({
      posts: posts.map((post) => ({
        id: post.id,
        title: post.title,
        body: post.body,
        createdAt: post.created_at,
        updatedAt: post.updated_at,
        author: {
          id: post.author_id,
          name: post.author_name,
          role: post.author_role,
          profilePhoto: post.profile_photo || post.business_logo,
        },
        likeCount: Number(post.like_count || 0),
        commentCount: Number(post.comment_count || 0),
        likedByMe: Boolean(post.liked_by_me),
        comments: commentsByPost[post.id] || [],
      })),
      myPosts: myPosts.map((post) => ({
        id: post.id,
        title: post.title,
        body: post.body,
        createdAt: post.created_at,
        updatedAt: post.updated_at,
        author: {
          id: post.author_id,
          name: post.author_name,
          role: post.author_role,
          profilePhoto: post.profile_photo || post.business_logo,
        },
        likeCount: Number(post.like_count || 0),
        commentCount: Number(post.comment_count || 0),
        likedByMe: Boolean(post.liked_by_me),
        comments: commentsByPost[post.id] || [],
      })),
      stats,
      network,
    });
  } catch (error) {
    console.error("Error in listPosts:", error);
    return res.status(500).json({ message: "Gagal mengambil forum aktivitas." });
  }
}

async function createPost(req, res) {
  const userId = req.user?.sub;
  const body = String(req.body?.body || "").trim();

  if (!body) {
    return res.status(400).json({ message: "Isi postingan wajib diisi." });
  }

  if (body.length > 1000) {
    return res.status(400).json({ message: "Postingan maksimal 1000 karakter." });
  }

  try {
    const forumId = await ensureDefaultForum();
    const now = new Date();
    const title = body.length > 80 ? `${body.slice(0, 77)}...` : body;
    const [result] = await getPool().query(
      `INSERT INTO posts (forum_id, posted_by, title, body, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'published', ?, ?)`,
      [forumId, userId, title || "Forum post", body, now, now]
    );

    return res.status(201).json({
      message: "Postingan berhasil dibagikan.",
      id: result.insertId,
    });
  } catch (error) {
    console.error("Error in createPost:", error);
    return res.status(500).json({ message: "Gagal membuat postingan forum." });
  }
}

async function toggleLike(req, res) {
  const userId = req.user?.sub;
  const postId = Number(req.params.id);

  if (!postId) {
    return res.status(400).json({ message: "ID postingan tidak valid." });
  }

  try {
    const [existingRows] = await getPool().query(
      "SELECT id FROM post_likes WHERE post_id = ? AND user_id = ? LIMIT 1",
      [postId, userId]
    );

    let liked = false;
    if (existingRows[0]) {
      await getPool().query("DELETE FROM post_likes WHERE id = ?", [existingRows[0].id]);
    } else {
      await getPool().query("INSERT INTO post_likes (post_id, user_id, created_at) VALUES (?, ?, ?)", [
        postId,
        userId,
        new Date(),
      ]);
      liked = true;
    }

    const [countRows] = await getPool().query("SELECT COUNT(*) AS total FROM post_likes WHERE post_id = ?", [postId]);

    return res.json({
      liked,
      likeCount: Number(countRows[0]?.total || 0),
    });
  } catch (error) {
    console.error("Error in toggleLike:", error);
    return res.status(500).json({ message: "Gagal memperbarui like." });
  }
}

async function createComment(req, res) {
  const userId = req.user?.sub;
  const postId = Number(req.params.id);
  const body = String(req.body?.body || "").trim();

  if (!postId) {
    return res.status(400).json({ message: "ID postingan tidak valid." });
  }

  if (!body) {
    return res.status(400).json({ message: "Komentar wajib diisi." });
  }

  if (body.length > 500) {
    return res.status(400).json({ message: "Komentar maksimal 500 karakter." });
  }

  try {
    const now = new Date();
    const [result] = await getPool().query(
      "INSERT INTO comments (post_id, user_id, body, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
      [postId, userId, body, now, now]
    );

    return res.status(201).json({
      message: "Komentar berhasil dikirim.",
      id: result.insertId,
    });
  } catch (error) {
    console.error("Error in createComment:", error);
    return res.status(500).json({ message: "Gagal mengirim komentar." });
  }
}

async function updateUserLocation(req, res) {
  const userId = req.user?.sub;
  const latitude = Number(req.body?.latitude);
  const longitude = Number(req.body?.longitude);
  const address = String(req.body?.address || "").trim();

  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    return res.status(400).json({ message: "Latitude tidak valid." });
  }

  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return res.status(400).json({ message: "Longitude tidak valid." });
  }

  try {
    await ensureUserCoordinateColumns();
    await getPool().query(
      `UPDATE users SET
        latitude = ?,
        longitude = ?,
        address = COALESCE(NULLIF(?, ''), address),
        updated_at = ?
      WHERE id = ?`,
      [latitude, longitude, address, new Date(), userId]
    );

    return res.json({
      message: "Lokasi peta berhasil disimpan.",
      location: { latitude, longitude, address },
    });
  } catch (error) {
    console.error("Error in updateUserLocation:", error);
    return res.status(500).json({ message: "Gagal menyimpan lokasi peta." });
  }
}

async function ensureDefaultForum() {
  const [forums] = await getPool().query("SELECT id FROM forums ORDER BY id ASC LIMIT 1");
  if (forums[0]) return forums[0].id;

  const now = new Date();
  const [result] = await getPool().query(
    "INSERT INTO forums (title, description, created_at, updated_at) VALUES (?, ?, ?, ?)",
    [defaultForum.title, defaultForum.description, now, now]
  );

  return result.insertId;
}

async function ensureUserCoordinateColumns() {
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

async function ensureBusinessCoordinateColumns() {
  const [columns] = await getPool().query("SHOW COLUMNS FROM umkm_business");
  const existing = new Set(columns.map((column) => column.Field));

  if (!existing.has("latitude")) {
    await getPool().query("ALTER TABLE umkm_business ADD COLUMN latitude DECIMAL(10, 7) NULL AFTER location");
  }

  if (!existing.has("longitude")) {
    await getPool().query("ALTER TABLE umkm_business ADD COLUMN longitude DECIMAL(10, 7) NULL AFTER latitude");
  }
}

async function getCommentsByPost(postIds) {
  if (!postIds.length) return {};

  const placeholders = postIds.map(() => "?").join(", ");
  const [comments] = await getPool().query(
    `SELECT
      c.id,
      c.post_id,
      c.body,
      c.created_at,
      COALESCE(
        CASE
          WHEN u.role = 'umkm_owner' THEN NULLIF(b.name, '')
          WHEN u.role = 'funder' THEN NULLIF(fd.organization_name, '')
          ELSE NULL
        END,
        u.name
      ) AS author_name,
      u.role AS author_role,
      u.profile_photo,
      b.logo AS business_logo
    FROM comments c
    JOIN users u ON u.id = c.user_id
    LEFT JOIN umkm_owners o ON o.user_id = u.id
    LEFT JOIN umkm_business b ON b.owner_id = o.id
    LEFT JOIN funders fd ON fd.user_id = u.id
    WHERE c.post_id IN (${placeholders})
    ORDER BY c.created_at ASC, c.id ASC`,
    postIds
  );

  return comments.reduce((grouped, comment) => {
    const postComments = grouped[comment.post_id] || [];
    postComments.push({
      id: comment.id,
      body: comment.body,
      createdAt: comment.created_at,
      authorName: comment.author_name,
      authorRole: comment.author_role,
      authorProfilePhoto: comment.profile_photo || comment.business_logo,
    });
    grouped[comment.post_id] = postComments;
    return grouped;
  }, {});
}

async function getNetworkParticipants() {
  const [rows] = await getPool().query(
    `SELECT
      u.id,
      COALESCE(NULLIF(b.name, ''), NULLIF(f.organization_name, ''), u.name) AS name,
      u.role,
      COALESCE(b.latitude, u.latitude) AS latitude,
      COALESCE(b.longitude, u.longitude) AS longitude,
      COALESCE(NULLIF(b.location, ''), NULLIF(u.location, ''), NULLIF(u.address, ''), '') AS location
    FROM users u
    LEFT JOIN umkm_owners o ON o.user_id = u.id
    LEFT JOIN umkm_business b ON b.owner_id = o.id
    LEFT JOIN funders f ON f.user_id = u.id
    WHERE u.role IN ('umkm_owner', 'funder', 'mentor')
    ORDER BY u.updated_at DESC, u.created_at DESC
    LIMIT 80`
  );

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    role: row.role,
    location: row.location,
    latitude: row.latitude === null || row.latitude === undefined ? null : Number(row.latitude),
    longitude: row.longitude === null || row.longitude === undefined ? null : Number(row.longitude),
  }));
}

async function getForumStats(userId) {
  const [[postStats]] = await getPool().query(
    `SELECT
      COUNT(DISTINCT p.id) AS my_post_count,
      COUNT(DISTINCT pl.id) AS total_likes,
      COUNT(DISTINCT CASE WHEN c.user_id <> ? THEN c.id END) AS comments_to_me
    FROM posts p
    LEFT JOIN post_likes pl ON pl.post_id = p.id
    LEFT JOIN comments c ON c.post_id = p.id
    WHERE p.posted_by = ?`,
    [userId, userId]
  );

  const [[forumStats]] = await getPool().query(
    `SELECT
      COUNT(DISTINCT p.id) AS forum_post_count,
      COUNT(DISTINCT p.posted_by) AS contributor_count
    FROM posts p
    WHERE p.status IS NULL OR p.status = 'published'`
  );

  return {
    myPostCount: Number(postStats?.my_post_count || 0),
    commentsToMe: Number(postStats?.comments_to_me || 0),
    totalLikes: Number(postStats?.total_likes || 0),
    forumPostCount: Number(forumStats?.forum_post_count || 0),
    contributorCount: Number(forumStats?.contributor_count || 0),
  };
}

module.exports = {
  createComment,
  createPost,
  listPosts,
  toggleLike,
  updateUserLocation,
};

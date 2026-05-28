const mysql = require("mysql2/promise");

let pool;

function getDbConfig(withDatabase = true) {
  const baseConfig = {
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: "utf8mb4",
  };

  if (withDatabase) {
    baseConfig.database = process.env.DB_NAME || "microfunding";
  }

  return baseConfig;
}

function getPool() {
  if (!pool) {
    pool = mysql.createPool(getDbConfig(true));
  }

  return pool;
}

async function ensureUmkmBusinessColumns(activePool) {
  try {
    const [columns] = await activePool.query("SHOW COLUMNS FROM umkm_business");
    const columnNames = columns.map((c) => c.Field);

    const columnsToAdd = {
      year_established: "INT NULL",
      employee_count: "INT NULL",
      monthly_revenue: "VARCHAR(255) NULL",
      legal_documents: "TEXT NULL",
      funding_target: "BIGINT NULL",
      funding_purpose: "TEXT NULL",
      business_goals: "TEXT NULL",
    };

    for (const [colName, colType] of Object.entries(columnsToAdd)) {
      if (!columnNames.includes(colName)) {
        console.log(`[Migration] Adding column ${colName} to umkm_business table...`);
        await activePool.query(`ALTER TABLE umkm_business ADD COLUMN ${colName} ${colType}`);
      }
    }
  } catch (error) {
    console.error("[Migration Error] Failed to auto-migrate columns in umkm_business:", error);
  }
}

async function ensureUmkmOwnerColumns(activePool) {
  try {
    const [columns] = await activePool.query("SHOW COLUMNS FROM umkm_owners");
    const columnNames = columns.map((c) => c.Field);

    if (!columnNames.includes("npwp")) {
      console.log("[Migration] Adding column npwp to umkm_owners table...");
      await activePool.query("ALTER TABLE umkm_owners ADD COLUMN npwp VARCHAR(255) NULL AFTER nik");
    }
  } catch (error) {
    console.error("[Migration Error] Failed to auto-migrate columns in umkm_owners:", error);
  }
}

async function ensureFunderColumns(activePool) {
  try {
    const [columns] = await activePool.query("SHOW COLUMNS FROM funders");
    const columnNames = columns.map((c) => c.Field);

    const columnsToAdd = {
      funding_min: "BIGINT NULL",
      funding_max: "BIGINT NULL",
      investment_interests: "TEXT NULL",
      expertise_areas: "TEXT NULL",
    };

    for (const [colName, colType] of Object.entries(columnsToAdd)) {
      if (!columnNames.includes(colName)) {
        console.log(`[Migration] Adding column ${colName} to funders table...`);
        await activePool.query(`ALTER TABLE funders ADD COLUMN ${colName} ${colType}`);
      }
    }
  } catch (error) {
    console.error("[Migration Error] Failed to auto-migrate columns in funders:", error);
  }
}

async function ensureMentorColumns(activePool) {
  try {
    const [columns] = await activePool.query("SHOW COLUMNS FROM mentors");
    const columnNames = columns.map((c) => c.Field);

    const columnsToAdd = {
      achievements: "TEXT NULL",
    };

    for (const [colName, colType] of Object.entries(columnsToAdd)) {
      if (!columnNames.includes(colName)) {
        console.log(`[Migration] Adding column ${colName} to mentors table...`);
        await activePool.query(`ALTER TABLE mentors ADD COLUMN ${colName} ${colType}`);
      }
    }
  } catch (error) {
    console.error("[Migration Error] Failed to auto-migrate columns in mentors:", error);
  }
}

async function ensureMentorSessionColumns(activePool) {
  try {
    const [columns] = await activePool.query("SHOW COLUMNS FROM mentor_sessions");
    const columnNames = columns.map((c) => c.Field);

    const columnsToAdd = {
      business_problem: "TEXT NULL",
      mentoring_goal: "TEXT NULL",
      additional_message: "TEXT NULL",
    };

    for (const [colName, colType] of Object.entries(columnsToAdd)) {
      if (!columnNames.includes(colName)) {
        console.log(`[Migration] Adding column ${colName} to mentor_sessions table...`);
        await activePool.query(`ALTER TABLE mentor_sessions ADD COLUMN ${colName} ${colType}`);
      }
    }
  } catch (error) {
    console.error("[Migration Error] Failed to auto-migrate columns in mentor_sessions:", error);
  }
}

async function ensureMentoringModuleTables(activePool) {
  try {
    await activePool.query(`
      CREATE TABLE IF NOT EXISTS mentor_profiles (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id BIGINT UNSIGNED NOT NULL,
        name VARCHAR(255) NOT NULL,
        profession VARCHAR(255) NULL,
        expertise TEXT NULL,
        achievements TEXT NULL,
        experience_years INT NULL,
        bio TEXT NULL,
        rating DECIMAL(3,2) NOT NULL DEFAULT 0.00,
        availability VARCHAR(255) NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'Available',
        created_at TIMESTAMP NULL DEFAULT NULL,
        updated_at TIMESTAMP NULL DEFAULT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY mentor_profiles_user_id_unique (user_id),
        KEY mentor_profiles_status_index (status),
        CONSTRAINT mentor_profiles_user_id_foreign FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await activePool.query(`
      CREATE TABLE IF NOT EXISTS mentoring_requests (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        umkm_user_id BIGINT UNSIGNED NOT NULL,
        mentor_id BIGINT UNSIGNED NOT NULL,
        topic VARCHAR(255) NOT NULL,
        business_problem TEXT NULL,
        mentoring_goal TEXT NULL,
        duration VARCHAR(255) NULL,
        preferred_schedule VARCHAR(255) NULL,
        additional_message TEXT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'Pending',
        rejection_reason TEXT NULL,
        requested_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        responded_at TIMESTAMP NULL DEFAULT NULL,
        created_at TIMESTAMP NULL DEFAULT NULL,
        updated_at TIMESTAMP NULL DEFAULT NULL,
        PRIMARY KEY (id),
        KEY mentoring_requests_umkm_user_id_foreign (umkm_user_id),
        KEY mentoring_requests_mentor_id_foreign (mentor_id),
        KEY mentoring_requests_status_index (status),
        CONSTRAINT mentoring_requests_umkm_user_id_foreign FOREIGN KEY (umkm_user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT mentoring_requests_mentor_id_foreign FOREIGN KEY (mentor_id) REFERENCES mentor_profiles(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await activePool.query(`
      CREATE TABLE IF NOT EXISTS mentoring_workspaces (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        request_id BIGINT UNSIGNED NOT NULL,
        umkm_user_id BIGINT UNSIGNED NOT NULL,
        mentor_id BIGINT UNSIGNED NOT NULL,
        topic VARCHAR(255) NOT NULL,
        goal TEXT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'Active',
        start_date DATE NULL,
        end_date DATE NULL,
        acceptance_note TEXT NULL,
        cancellation_reason TEXT NULL,
        final_evaluation TEXT NULL,
        final_recommendation TEXT NULL,
        created_at TIMESTAMP NULL DEFAULT NULL,
        updated_at TIMESTAMP NULL DEFAULT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY mentoring_workspaces_request_id_unique (request_id),
        KEY mentoring_workspaces_umkm_user_id_foreign (umkm_user_id),
        KEY mentoring_workspaces_mentor_id_foreign (mentor_id),
        KEY mentoring_workspaces_status_index (status),
        CONSTRAINT mentoring_workspaces_request_id_foreign FOREIGN KEY (request_id) REFERENCES mentoring_requests(id) ON DELETE CASCADE,
        CONSTRAINT mentoring_workspaces_umkm_user_id_foreign FOREIGN KEY (umkm_user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT mentoring_workspaces_mentor_id_foreign FOREIGN KEY (mentor_id) REFERENCES mentor_profiles(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    const [workspaceColumns] = await activePool.query("SHOW COLUMNS FROM mentoring_workspaces");
    const workspaceColumnNames = workspaceColumns.map((column) => column.Field);
    if (!workspaceColumnNames.includes("cancellation_reason")) {
      console.log("[Migration] Adding column cancellation_reason to mentoring_workspaces table...");
      await activePool.query("ALTER TABLE mentoring_workspaces ADD COLUMN cancellation_reason TEXT NULL AFTER acceptance_note");
    }

    await activePool.query(`
      CREATE TABLE IF NOT EXISTS mentoring_sessions (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        workspace_id BIGINT UNSIGNED NOT NULL,
        title VARCHAR(255) NOT NULL,
        date DATE NULL,
        start_time TIME NULL,
        end_time TIME NULL,
        platform VARCHAR(100) NULL,
        meeting_link VARCHAR(500) NULL,
        agenda TEXT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'Upcoming',
        cancellation_reason TEXT NULL,
        created_at TIMESTAMP NULL DEFAULT NULL,
        updated_at TIMESTAMP NULL DEFAULT NULL,
        PRIMARY KEY (id),
        KEY mentoring_sessions_workspace_id_foreign (workspace_id),
        KEY mentoring_sessions_status_index (status),
        CONSTRAINT mentoring_sessions_workspace_id_foreign FOREIGN KEY (workspace_id) REFERENCES mentoring_workspaces(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    const [sessionColumns] = await activePool.query("SHOW COLUMNS FROM mentoring_sessions");
    const sessionColumnNames = sessionColumns.map((column) => column.Field);
    if (!sessionColumnNames.includes("cancellation_reason")) {
      console.log("[Migration] Adding column cancellation_reason to mentoring_sessions table...");
      await activePool.query("ALTER TABLE mentoring_sessions ADD COLUMN cancellation_reason TEXT NULL AFTER status");
    }

    await activePool.query(`
      CREATE TABLE IF NOT EXISTS mentoring_tasks (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        workspace_id BIGINT UNSIGNED NOT NULL,
        title VARCHAR(255) NOT NULL,
        instruction TEXT NULL,
        deadline DATE NULL,
        priority VARCHAR(50) NOT NULL DEFAULT 'Medium',
        status VARCHAR(50) NOT NULL DEFAULT 'Pending',
        mentor_comment TEXT NULL,
        created_by BIGINT UNSIGNED NULL,
        created_at TIMESTAMP NULL DEFAULT NULL,
        updated_at TIMESTAMP NULL DEFAULT NULL,
        PRIMARY KEY (id),
        KEY mentoring_tasks_workspace_id_foreign (workspace_id),
        KEY mentoring_tasks_created_by_foreign (created_by),
        KEY mentoring_tasks_status_index (status),
        CONSTRAINT mentoring_tasks_workspace_id_foreign FOREIGN KEY (workspace_id) REFERENCES mentoring_workspaces(id) ON DELETE CASCADE,
        CONSTRAINT mentoring_tasks_created_by_foreign FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    const [taskColumns] = await activePool.query("SHOW COLUMNS FROM mentoring_tasks");
    const taskColumnNames = taskColumns.map((column) => column.Field);
    if (!taskColumnNames.includes("mentor_comment")) {
      console.log("[Migration] Adding column mentor_comment to mentoring_tasks table...");
      await activePool.query("ALTER TABLE mentoring_tasks ADD COLUMN mentor_comment TEXT NULL AFTER status");
    }

    await activePool.query(`
      CREATE TABLE IF NOT EXISTS mentoring_task_submissions (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        task_id BIGINT UNSIGNED NOT NULL,
        workspace_id BIGINT UNSIGNED NOT NULL,
        submitted_by BIGINT UNSIGNED NOT NULL,
        note TEXT NULL,
        file_name VARCHAR(255) NULL,
        file_path VARCHAR(500) NULL,
        file_mime VARCHAR(120) NULL,
        file_size BIGINT UNSIGNED NULL,
        submission_status VARCHAR(50) NOT NULL DEFAULT 'Submitted',
        submitted_at TIMESTAMP NULL DEFAULT NULL,
        cancelled_at TIMESTAMP NULL DEFAULT NULL,
        created_at TIMESTAMP NULL DEFAULT NULL,
        updated_at TIMESTAMP NULL DEFAULT NULL,
        PRIMARY KEY (id),
        KEY mentoring_task_submissions_task_id_foreign (task_id),
        KEY mentoring_task_submissions_workspace_id_foreign (workspace_id),
        KEY mentoring_task_submissions_submitted_by_foreign (submitted_by),
        KEY mentoring_task_submissions_status_index (submission_status),
        CONSTRAINT mentoring_task_submissions_task_id_foreign FOREIGN KEY (task_id) REFERENCES mentoring_tasks(id) ON DELETE CASCADE,
        CONSTRAINT mentoring_task_submissions_workspace_id_foreign FOREIGN KEY (workspace_id) REFERENCES mentoring_workspaces(id) ON DELETE CASCADE,
        CONSTRAINT mentoring_task_submissions_submitted_by_foreign FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await activePool.query(`
      CREATE TABLE IF NOT EXISTS mentoring_chat_messages (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        workspace_id BIGINT UNSIGNED NOT NULL,
        sender_user_id BIGINT UNSIGNED NOT NULL,
        sender_role VARCHAR(50) NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP NULL DEFAULT NULL,
        PRIMARY KEY (id),
        KEY mentoring_chat_messages_workspace_id_foreign (workspace_id),
        KEY mentoring_chat_messages_sender_user_id_foreign (sender_user_id),
        CONSTRAINT mentoring_chat_messages_workspace_id_foreign FOREIGN KEY (workspace_id) REFERENCES mentoring_workspaces(id) ON DELETE CASCADE,
        CONSTRAINT mentoring_chat_messages_sender_user_id_foreign FOREIGN KEY (sender_user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await activePool.query(`
      CREATE TABLE IF NOT EXISTS mentoring_files (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        workspace_id BIGINT UNSIGNED NOT NULL,
        uploaded_by BIGINT UNSIGNED NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_mime VARCHAR(120) NULL,
        file_size BIGINT UNSIGNED NULL,
        created_at TIMESTAMP NULL DEFAULT NULL,
        updated_at TIMESTAMP NULL DEFAULT NULL,
        PRIMARY KEY (id),
        KEY mentoring_files_workspace_id_foreign (workspace_id),
        KEY mentoring_files_uploaded_by_foreign (uploaded_by),
        CONSTRAINT mentoring_files_workspace_id_foreign FOREIGN KEY (workspace_id) REFERENCES mentoring_workspaces(id) ON DELETE CASCADE,
        CONSTRAINT mentoring_files_uploaded_by_foreign FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await activePool.query(`
      CREATE TABLE IF NOT EXISTS business_progress (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        workspace_id BIGINT UNSIGNED NOT NULL,
        omzet BIGINT NULL,
        order_count INT NULL,
        followers INT NULL,
        engagement VARCHAR(100) NULL,
        obstacle TEXT NULL,
        implementation_result TEXT NULL,
        question_for_mentor TEXT NULL,
        mentor_recommendation TEXT NULL,
        created_at TIMESTAMP NULL DEFAULT NULL,
        updated_at TIMESTAMP NULL DEFAULT NULL,
        PRIMARY KEY (id),
        KEY business_progress_workspace_id_foreign (workspace_id),
        CONSTRAINT business_progress_workspace_id_foreign FOREIGN KEY (workspace_id) REFERENCES mentoring_workspaces(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await activePool.query(`
      CREATE TABLE IF NOT EXISTS mentor_notes (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        workspace_id BIGINT UNSIGNED NOT NULL,
        session_id BIGINT UNSIGNED NULL,
        evaluation TEXT NULL,
        obstacle_found TEXT NULL,
        advice TEXT NULL,
        next_recommendation TEXT NULL,
        created_at TIMESTAMP NULL DEFAULT NULL,
        updated_at TIMESTAMP NULL DEFAULT NULL,
        PRIMARY KEY (id),
        KEY mentor_notes_workspace_id_foreign (workspace_id),
        KEY mentor_notes_session_id_foreign (session_id),
        CONSTRAINT mentor_notes_workspace_id_foreign FOREIGN KEY (workspace_id) REFERENCES mentoring_workspaces(id) ON DELETE CASCADE,
        CONSTRAINT mentor_notes_session_id_foreign FOREIGN KEY (session_id) REFERENCES mentoring_sessions(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await activePool.query(`
      CREATE TABLE IF NOT EXISTS mentoring_reviews (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        workspace_id BIGINT UNSIGNED NOT NULL,
        rating TINYINT UNSIGNED NOT NULL,
        feedback TEXT NULL,
        impact_testimonial TEXT NULL,
        created_at TIMESTAMP NULL DEFAULT NULL,
        updated_at TIMESTAMP NULL DEFAULT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY mentoring_reviews_workspace_id_unique (workspace_id),
        CONSTRAINT mentoring_reviews_workspace_id_foreign FOREIGN KEY (workspace_id) REFERENCES mentoring_workspaces(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  } catch (error) {
    console.error("[Migration Error] Failed to ensure mentoring module tables:", error);
  }
}

async function testConnection() {
  try {
    const activePool = getPool();
    await activePool.query("SELECT 1");
    await ensureUmkmOwnerColumns(activePool);
    await ensureUmkmBusinessColumns(activePool);
    await ensureFunderColumns(activePool);
    await ensureMentorColumns(activePool);
    await ensureMentorSessionColumns(activePool);
    await ensureMentoringModuleTables(activePool);

    return {
      ok: true,
      database: process.env.DB_NAME || "microfunding",
    };
  } catch (error) {
    return {
      ok: false,
      database: process.env.DB_NAME || "microfunding",
      message: error.message,
    };
  }
}

module.exports = {
  getDbConfig,
  getPool,
  testConnection,
};

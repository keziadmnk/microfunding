CREATE DATABASE IF NOT EXISTS microfunding
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE microfunding;

SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  email_verified_at TIMESTAMP NULL DEFAULT NULL,
  password VARCHAR(255) NOT NULL,
  two_factor_secret TEXT NULL,
  two_factor_recovery_codes TEXT NULL,
  two_factor_confirmed_at TIMESTAMP NULL DEFAULT NULL,
  phone VARCHAR(255) NULL,
  profile_photo VARCHAR(255) NULL,
  bio TEXT NULL,
  role VARCHAR(255) NOT NULL DEFAULT 'user',
  address VARCHAR(255) NULL,
  remember_token VARCHAR(100) NULL,
  created_at TIMESTAMP NULL DEFAULT NULL,
  updated_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY users_email_unique (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  email VARCHAR(255) NOT NULL,
  token VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(255) NOT NULL,
  user_id BIGINT UNSIGNED NULL,
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  payload LONGTEXT NOT NULL,
  last_activity INT NOT NULL,
  PRIMARY KEY (id),
  KEY sessions_user_id_index (user_id),
  KEY sessions_last_activity_index (last_activity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cache (
  `key` VARCHAR(255) NOT NULL,
  value MEDIUMTEXT NOT NULL,
  expiration INT NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cache_locks (
  `key` VARCHAR(255) NOT NULL,
  owner VARCHAR(255) NOT NULL,
  expiration INT NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS jobs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  queue VARCHAR(255) NOT NULL,
  payload LONGTEXT NOT NULL,
  attempts TINYINT UNSIGNED NOT NULL,
  reserved_at INT UNSIGNED NULL,
  available_at INT UNSIGNED NOT NULL,
  created_at INT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  KEY jobs_queue_index (queue)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS job_batches (
  id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  total_jobs INT NOT NULL,
  pending_jobs INT NOT NULL,
  failed_jobs INT NOT NULL,
  failed_job_ids LONGTEXT NOT NULL,
  options MEDIUMTEXT NULL,
  cancelled_at INT NULL,
  created_at INT NOT NULL,
  finished_at INT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS failed_jobs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  uuid VARCHAR(255) NOT NULL,
  connection TEXT NOT NULL,
  queue TEXT NOT NULL,
  payload LONGTEXT NOT NULL,
  exception LONGTEXT NOT NULL,
  failed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY failed_jobs_uuid_unique (uuid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_documents (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  related_type VARCHAR(255) NULL,
  document_type VARCHAR(255) NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  status VARCHAR(255) NOT NULL DEFAULT 'pending',
  notes TEXT NULL,
  created_at TIMESTAMP NULL DEFAULT NULL,
  updated_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  KEY user_documents_user_id_foreign (user_id),
  CONSTRAINT user_documents_user_id_foreign FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS verification_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  verified_by BIGINT UNSIGNED NOT NULL,
  verified_entity_type VARCHAR(255) NULL,
  verified_entity_id BIGINT UNSIGNED NULL,
  status VARCHAR(255) NOT NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY verification_logs_verified_by_foreign (verified_by),
  CONSTRAINT verification_logs_verified_by_foreign FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS mentors (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  current_job TEXT NULL,
  experience TEXT NULL,
  about TEXT NULL,
  reputation_score FLOAT NOT NULL DEFAULT 0,
  verified TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NULL DEFAULT NULL,
  updated_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  KEY mentors_user_id_foreign (user_id),
  CONSTRAINT mentors_user_id_foreign FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS mentor_skills (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  mentor_id BIGINT UNSIGNED NOT NULL,
  skill VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NULL DEFAULT NULL,
  updated_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  KEY mentor_skills_mentor_id_foreign (mentor_id),
  CONSTRAINT mentor_skills_mentor_id_foreign FOREIGN KEY (mentor_id) REFERENCES mentors(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS umkm_owners (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  nik VARCHAR(255) NULL,
  npwp VARCHAR(255) NULL,
  verified TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NULL DEFAULT NULL,
  updated_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  KEY umkm_owners_user_id_foreign (user_id),
  CONSTRAINT umkm_owners_user_id_foreign FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS mentor_sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  umkm_owner BIGINT UNSIGNED NOT NULL,
  mentor_id BIGINT UNSIGNED NOT NULL,
  topic VARCHAR(255) NOT NULL,
  scheduled_at DATETIME NOT NULL,
  duration_minutes INT NOT NULL,
  status VARCHAR(255) NOT NULL DEFAULT 'pending',
  business_problem TEXT NULL,
  mentoring_goal TEXT NULL,
  additional_message TEXT NULL,
  notes TEXT NULL,
  feedback TEXT NULL,
  rating INT NULL,
  created_at TIMESTAMP NULL DEFAULT NULL,
  updated_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  KEY mentor_sessions_umkm_owner_foreign (umkm_owner),
  KEY mentor_sessions_mentor_id_foreign (mentor_id),
  CONSTRAINT mentor_sessions_umkm_owner_foreign FOREIGN KEY (umkm_owner) REFERENCES umkm_owners(id) ON DELETE CASCADE,
  CONSTRAINT mentor_sessions_mentor_id_foreign FOREIGN KEY (mentor_id) REFERENCES mentors(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS mentor_hours_log (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  mentor_id BIGINT UNSIGNED NOT NULL,
  session_id BIGINT UNSIGNED NOT NULL,
  hours_contributed INT NOT NULL,
  earned_points INT NOT NULL,
  star FLOAT NULL,
  created_at TIMESTAMP NULL DEFAULT NULL,
  updated_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  KEY mentor_hours_log_mentor_id_foreign (mentor_id),
  KEY mentor_hours_log_session_id_foreign (session_id),
  CONSTRAINT mentor_hours_log_mentor_id_foreign FOREIGN KEY (mentor_id) REFERENCES mentors(id) ON DELETE CASCADE,
  CONSTRAINT mentor_hours_log_session_id_foreign FOREIGN KEY (session_id) REFERENCES mentor_sessions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS funders (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  organization_name VARCHAR(255) NULL,
  funding_min BIGINT NULL,
  funding_max BIGINT NULL,
  investment_interests TEXT NULL,
  expertise_areas TEXT NULL,
  verified TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NULL DEFAULT NULL,
  updated_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  KEY funders_user_id_foreign (user_id),
  CONSTRAINT funders_user_id_foreign FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS umkm_business (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  owner_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(255) NOT NULL DEFAULT 'lainnya',
  other_category VARCHAR(255) NULL,
  description TEXT NULL,
  location VARCHAR(255) NULL,
  logo VARCHAR(255) NULL,
  year_established INT NULL,
  employee_count INT NULL,
  monthly_revenue VARCHAR(255) NULL,
  legal_documents TEXT NULL,
  funding_target BIGINT NULL,
  funding_purpose TEXT NULL,
  business_goals TEXT NULL,
  verified TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NULL DEFAULT NULL,
  updated_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  KEY umkm_business_owner_id_foreign (owner_id),
  CONSTRAINT umkm_business_owner_id_foreign FOREIGN KEY (owner_id) REFERENCES umkm_owners(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fundings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  funder_id BIGINT UNSIGNED NULL,
  business_id BIGINT UNSIGNED NOT NULL,
  amount INT NOT NULL,
  description TEXT NULL,
  proof_of_transfer VARCHAR(255) NULL,
  status VARCHAR(255) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NULL DEFAULT NULL,
  updated_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  KEY fundings_funder_id_foreign (funder_id),
  KEY fundings_business_id_foreign (business_id),
  CONSTRAINT fundings_funder_id_foreign FOREIGN KEY (funder_id) REFERENCES funders(id) ON DELETE CASCADE,
  CONSTRAINT fundings_business_id_foreign FOREIGN KEY (business_id) REFERENCES umkm_business(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS forums (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  created_at TIMESTAMP NULL DEFAULT NULL,
  updated_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS posts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  forum_id BIGINT UNSIGNED NOT NULL,
  posted_by BIGINT UNSIGNED NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  status VARCHAR(255) NULL,
  created_at TIMESTAMP NULL DEFAULT NULL,
  updated_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  KEY posts_forum_id_foreign (forum_id),
  KEY posts_posted_by_foreign (posted_by),
  CONSTRAINT posts_forum_id_foreign FOREIGN KEY (forum_id) REFERENCES forums(id) ON DELETE CASCADE,
  CONSTRAINT posts_posted_by_foreign FOREIGN KEY (posted_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS post_likes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  post_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY post_likes_post_id_user_id_unique (post_id, user_id),
  KEY post_likes_user_id_foreign (user_id),
  CONSTRAINT post_likes_post_id_foreign FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  CONSTRAINT post_likes_user_id_foreign FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS comments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  post_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMP NULL DEFAULT NULL,
  updated_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  KEY comments_post_id_foreign (post_id),
  KEY comments_user_id_foreign (user_id),
  CONSTRAINT comments_post_id_foreign FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  CONSTRAINT comments_user_id_foreign FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS comment_replies (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  comment_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMP NULL DEFAULT NULL,
  updated_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  KEY comment_replies_comment_id_foreign (comment_id),
  KEY comment_replies_user_id_foreign (user_id),
  CONSTRAINT comment_replies_comment_id_foreign FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
  CONSTRAINT comment_replies_user_id_foreign FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pictures (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  related_id BIGINT UNSIGNED NOT NULL,
  type VARCHAR(255) NOT NULL,
  caption VARCHAR(255) NULL,
  filepath VARCHAR(255) NOT NULL,
  mime_type VARCHAR(255) NULL,
  alt_text VARCHAR(255) NULL,
  created_at TIMESTAMP NULL DEFAULT NULL,
  updated_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS post_tags (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  post_id BIGINT UNSIGNED NOT NULL,
  tag VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NULL DEFAULT NULL,
  updated_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  KEY post_tags_post_id_foreign (post_id),
  CONSTRAINT post_tags_post_id_foreign FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

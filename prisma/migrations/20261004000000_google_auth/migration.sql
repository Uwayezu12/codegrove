-- Additive only: existing users, password hashes, progress and sessions are retained.
CREATE TABLE `google_identities` (
  `subject` VARCHAR(255) NOT NULL,
  `user_id` VARCHAR(191) NOT NULL,
  UNIQUE INDEX `google_identities_user_id_key` (`user_id`),
  PRIMARY KEY (`subject`),
  CONSTRAINT `google_identities_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

CREATE TABLE `google_auth_attempts` (
  `state_hash` CHAR(64) NOT NULL,
  `browser_hash` CHAR(64) NOT NULL,
  `nonce` VARCHAR(128) NOT NULL,
  `code_verifier` VARCHAR(128) NOT NULL,
  `return_to` VARCHAR(2048) NOT NULL,
  `mode` VARCHAR(16) NOT NULL,
  `link_user_id` VARCHAR(191) NULL,
  `link_session_hash` CHAR(64) NULL,
  `expires_at` DATETIME(3) NOT NULL,
  INDEX `google_auth_attempts_expires_at_idx` (`expires_at`),
  INDEX `google_auth_attempts_link_user_id_idx` (`link_user_id`),
  PRIMARY KEY (`state_hash`),
  CONSTRAINT `google_auth_attempts_link_user_id_fkey` FOREIGN KEY (`link_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

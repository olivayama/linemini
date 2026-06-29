-- +goose Up
CREATE TABLE `user` (
  `id` VARCHAR(50) NOT NULL,
  `customer_number` VARCHAR(32) NOT NULL,
  `signed_up_at` DATETIME(3) NOT NULL,
  `referrer` VARCHAR(50) DEFAULT NULL,
  `first_access_path` VARCHAR(2048) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_customer_number` (`customer_number`)
) ENGINE = InnoDB;

CREATE TABLE `user_line_account` (
  `user_id` VARCHAR(50) NOT NULL,
  `uid` VARCHAR(50) NOT NULL,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `uniq_uid` (`uid`),
  CONSTRAINT `fk_user_line_account_user_id` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`)
) ENGINE = InnoDB;

CREATE TABLE `user_profile` (
  `user_id` VARCHAR(50) NOT NULL,
  `birthday` DATE NULL,
  `sex_code` TINYINT NULL,
  `prefecture_code` TINYINT NULL,
  `initial_questionnaire_answers` JSON NULL,
  PRIMARY KEY (`user_id`),
  CONSTRAINT `fk_user_profile_user_id` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`)
) ENGINE = InnoDB;

CREATE TABLE `user_service_agreement` (
  `user_id` VARCHAR(50) NOT NULL,
  `version` VARCHAR(50) NOT NULL,
  `agreed_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`user_id`, `version`),
  CONSTRAINT `fk_user_service_agreement_user_id` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`)
) ENGINE = InnoDB;

CREATE TABLE `user_tutorial_completion` (
  `user_id` VARCHAR(50) NOT NULL,
  `version` VARCHAR(50) NOT NULL,
  `completed_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`user_id`, `version`),
  CONSTRAINT `fk_user_tutorial_completion_user_id` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`)
) ENGINE = InnoDB;

CREATE TABLE `feature_toggle` (
  `user_id` VARCHAR(50) NOT NULL,
  `settings` JSON NOT NULL,
  PRIMARY KEY (`user_id`)
) ENGINE = InnoDB;

CREATE TABLE `administrator` (
  `id` VARCHAR(50) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `deactivated_at` DATETIME(3),
  PRIMARY KEY (`id`)
) ENGINE = InnoDB;

CREATE TABLE `administrator_login_credential` (
  `administrator_id` VARCHAR(50) NOT NULL,
  `hashed_password` VARCHAR(255) NOT NULL,
  `initialized_at` DATETIME(3) NOT NULL,
  `changed_at` DATETIME(3),
  PRIMARY KEY (`administrator_id`),
  CONSTRAINT `fk_administrator_login_credential_administrator_id` FOREIGN KEY (`administrator_id`) REFERENCES `administrator` (`id`)
) ENGINE = InnoDB;

CREATE TABLE `administrator_invitation` (
  `administrator_id` VARCHAR(50) NOT NULL,
  `hashed_token` VARCHAR(255) NOT NULL,
  `expiration_date` DATETIME(3) NOT NULL,
  `invited_at` DATETIME(3) NOT NULL,
  `accepted_at` DATETIME(3),
  PRIMARY KEY (`administrator_id`),
  CONSTRAINT `fk_administrator_invitation_administrator_id` FOREIGN KEY (`administrator_id`) REFERENCES `administrator` (`id`)
) ENGINE = InnoDB;

CREATE TABLE `image` (
  `id` VARCHAR(50) NOT NULL,
  `admin_name` VARCHAR(255) NOT NULL,
  `image_url` VARCHAR(255) NOT NULL,
  `created_at` DATETIME(3) NOT NULL,
  `updated_at` DATETIME(3) NULL,
  PRIMARY KEY (`id`)
) ENGINE = InnoDB;

CREATE TABLE `image_tag` (
  `id` VARCHAR(50) NOT NULL,
  `admin_name` VARCHAR(255) NOT NULL,
  `is_locked` BOOLEAN NOT NULL,
  `created_at` DATETIME(3) NOT NULL,
  `updated_at` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_admin_name` (`admin_name`)
) ENGINE = InnoDB;

CREATE TABLE `image_tag_rel` (
  `image_id` VARCHAR(50) NOT NULL,
  `image_tag_id` VARCHAR(50) NOT NULL,
  PRIMARY KEY (`image_id`, `image_tag_id`),
  CONSTRAINT `fk_image_tag_rel_image_id` FOREIGN KEY (`image_id`) REFERENCES `image` (`id`)
) ENGINE = InnoDB;

-- +goose Down
DROP TABLE `image_tag_rel`;
DROP TABLE `image_tag`;
DROP TABLE `image`;
DROP TABLE `administrator_invitation`;
DROP TABLE `administrator_login_credential`;
DROP TABLE `administrator`;
DROP TABLE `feature_toggle`;
DROP TABLE `user_tutorial_completion`;
DROP TABLE `user_service_agreement`;
DROP TABLE `user_profile`;
DROP TABLE `user_line_account`;
DROP TABLE `user`;


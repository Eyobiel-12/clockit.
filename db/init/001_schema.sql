-- Klokit database schema. Draait automatisch bij de eerste start van de MySQL-container.
SET NAMES utf8mb4;

CREATE TABLE restaurants (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name              VARCHAR(120) NOT NULL,
  address           VARCHAR(255) NULL,
  lat               DECIMAL(9,6) NULL,
  lng               DECIMAL(9,6) NULL,
  radius_m          SMALLINT UNSIGNED NOT NULL DEFAULT 120,
  invite_code       CHAR(6) NOT NULL,
  invite_expires_at DATETIME NOT NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_restaurants_invite_code (invite_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  restaurant_id INT UNSIGNED NOT NULL,
  first_name    VARCHAR(60) NOT NULL,
  last_name     VARCHAR(80) NOT NULL,
  email         VARCHAR(190) NOT NULL,
  password_hash VARCHAR(100) NOT NULL,
  role          ENUM('owner','manager','employee') NOT NULL DEFAULT 'employee',
  department    VARCHAR(60) NULL,
  status        ENUM('active','pending') NOT NULL DEFAULT 'active',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email (email),
  KEY ix_users_restaurant (restaurant_id),
  CONSTRAINT fk_users_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE shifts (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  restaurant_id INT UNSIGNED NOT NULL,
  user_id       INT UNSIGNED NOT NULL,
  clock_in_at   DATETIME NOT NULL,
  clock_out_at  DATETIME NULL,
  distance_m    INT UNSIGNED NOT NULL,
  accuracy_m    INT UNSIGNED NOT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_shifts_restaurant_in (restaurant_id, clock_in_at),
  KEY ix_shifts_open (restaurant_id, clock_out_at),
  CONSTRAINT fk_shifts_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants (id) ON DELETE CASCADE,
  CONSTRAINT fk_shifts_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE corrections (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  restaurant_id INT UNSIGNED NOT NULL,
  user_id       INT UNSIGNED NOT NULL,
  shift_id      INT UNSIGNED NULL,
  type          ENUM('forgot_clock_out','forgot_clock_in','other') NOT NULL,
  reason        VARCHAR(255) NULL,
  status        ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_corrections_restaurant_status (restaurant_id, status),
  CONSTRAINT fk_corrections_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants (id) ON DELETE CASCADE,
  CONSTRAINT fk_corrections_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_corrections_shift FOREIGN KEY (shift_id) REFERENCES shifts (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

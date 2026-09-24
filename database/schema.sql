CREATE DATABASE IF NOT EXISTS smart_hostel CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE smart_hostel;

CREATE TABLE IF NOT EXISTS users (
  user_id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'student') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS profiles (
  user_id INT PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL,
  mobile VARCHAR(15),
  address TEXT,
  profile_photo VARCHAR(255),
  CONSTRAINT fk_profiles_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS students (
  student_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL UNIQUE,
  full_name VARCHAR(100) NOT NULL,
  mobile_number VARCHAR(15),
  address TEXT,
  guardian_name VARCHAR(100),
  guardian_contact VARCHAR(15),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_students_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  INDEX idx_students_name (full_name),
  INDEX idx_students_mobile (mobile_number)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS admins (
  admin_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL UNIQUE,
  full_name VARCHAR(100) NOT NULL,
  mobile_number VARCHAR(15),
  CONSTRAINT fk_admins_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  reset_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_password_reset_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  INDEX idx_password_reset_lookup (token_hash, expires_at),
  INDEX idx_password_reset_user (user_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS rooms (
  room_id INT PRIMARY KEY AUTO_INCREMENT,
  room_number VARCHAR(20) NOT NULL,
  block VARCHAR(50) NOT NULL,
  capacity INT NOT NULL,
  occupied_beds INT NOT NULL DEFAULT 0,
  available_beds INT NOT NULL,
  room_status ENUM('Available', 'Partially Occupied', 'Full') NOT NULL DEFAULT 'Available',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_room_block_number (block, room_number),
  CONSTRAINT chk_room_capacity CHECK (capacity > 0),
  CONSTRAINT chk_room_occupancy CHECK (occupied_beds >= 0 AND occupied_beds <= capacity),
  CONSTRAINT chk_room_available CHECK (available_beds >= 0 AND available_beds <= capacity),
  INDEX idx_rooms_status (room_status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS room_allocations (
  allocation_id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL,
  room_id INT NOT NULL,
  allocation_date DATE NOT NULL,
  status ENUM('Active', 'Vacated') NOT NULL DEFAULT 'Active',
  vacated_at DATE NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_allocations_student FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE RESTRICT,
  CONSTRAINT fk_allocations_room FOREIGN KEY (room_id) REFERENCES rooms(room_id) ON DELETE RESTRICT,
  INDEX idx_allocations_student_status (student_id, status),
  INDEX idx_allocations_room_status (room_id, status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS fees (
  fee_id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL,
  fee_amount DECIMAL(10,2) NOT NULL,
  penalty_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  penalty_reason VARCHAR(255) NULL,
  due_date DATE NULL,
  payment_date DATE NULL,
  payment_method ENUM('Cash', 'Online') NULL,
  payment_status ENUM('Paid', 'Pending') NOT NULL DEFAULT 'Pending',
  description VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_fees_student FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
  CONSTRAINT chk_fee_amount CHECK (fee_amount > 0),
  CONSTRAINT chk_penalty_amount CHECK (penalty_amount >= 0),
  INDEX idx_fees_student_status (student_id, payment_status),
  INDEX idx_fees_date (payment_date),
  INDEX idx_fees_due_date (due_date)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS complaints (
  complaint_id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL,
  complaint_description TEXT NOT NULL,
  complaint_date DATE NOT NULL,
  status ENUM('Pending', 'In Progress', 'Resolved') NOT NULL DEFAULT 'Pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_complaints_student FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
  INDEX idx_complaints_status_date (status, complaint_date)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS feedback (
  feedback_id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL,
  feedback_message TEXT NOT NULL,
  feedback_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_feedback_student FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
  INDEX idx_feedback_date (feedback_date)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS hostel_menu (
  menu_id INT PRIMARY KEY AUTO_INCREMENT,
  day_name ENUM('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday') NOT NULL,
  meal_type ENUM('Breakfast','Lunch','Evening Snack','Dinner') NOT NULL,
  menu_items VARCHAR(500) NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_menu_day_meal (day_name, meal_type)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS activities (
  activity_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NULL,
  activity_type VARCHAR(40) NOT NULL,
  description VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_activities_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL,
  INDEX idx_activity_created (created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS notifications (
  notification_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  title VARCHAR(150) NOT NULL,
  message VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'info',
  link VARCHAR(255) NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  INDEX idx_notifications_user_read (user_id, is_read),
  INDEX idx_notifications_user_date (user_id, created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS wifi_plans (
  plan_id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  validity_days INT NOT NULL,
  speed_mbps INT NOT NULL,
  data_quota_gb INT NULL,
  is_unlimited BOOLEAN NOT NULL DEFAULT FALSE,
  device_limit INT NOT NULL DEFAULT 2,
  description VARCHAR(255) NULL,
  status ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_wifi_plans_status (status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS wifi_subscriptions (
  subscription_id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL,
  plan_id INT NOT NULL,
  amount_paid DECIMAL(10,2) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  payment_method ENUM('Cash', 'Online') NOT NULL DEFAULT 'Online',
  payment_status ENUM('Paid', 'Pending') NOT NULL DEFAULT 'Paid',
  status ENUM('Active', 'Pending', 'Expired', 'Revoked') NOT NULL DEFAULT 'Active',
  voucher_code VARCHAR(50) NOT NULL UNIQUE,
  wifi_username VARCHAR(50) NOT NULL,
  wifi_password VARCHAR(50) NOT NULL,
  device_name VARCHAR(100) NULL,
  device_mac VARCHAR(100) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_wifi_subs_student FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
  CONSTRAINT fk_wifi_subs_plan FOREIGN KEY (plan_id) REFERENCES wifi_plans(plan_id) ON DELETE RESTRICT,
  INDEX idx_wifi_subs_student (student_id, status),
  INDEX idx_wifi_subs_dates (start_date, end_date),
  INDEX idx_wifi_subs_voucher (voucher_code)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS waiting_list (
  waitlist_id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL,
  preferred_block VARCHAR(50) NULL,
  status ENUM('Waiting', 'Offered', 'Allocated', 'Cancelled') NOT NULL DEFAULT 'Waiting',
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_waitlist_student FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
  INDEX idx_waitlist_student_status (student_id, status),
  INDEX idx_waitlist_status_created (status, created_at)
) ENGINE=InnoDB;


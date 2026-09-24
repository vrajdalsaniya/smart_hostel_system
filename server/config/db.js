import mysql from 'mysql2/promise';
import './env.js';

export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'smart_hostel',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true
});

export async function withTransaction(callback) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function testConnection() {
  const connection = await pool.getConnection();
  try {
    await connection.ping();
    await connection.execute(`CREATE TABLE IF NOT EXISTS password_reset_tokens (
      reset_id INT PRIMARY KEY AUTO_INCREMENT, user_id INT NOT NULL, token_hash CHAR(64) NOT NULL UNIQUE,
      expires_at TIMESTAMP NOT NULL, used_at TIMESTAMP NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_password_reset_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
      INDEX idx_password_reset_lookup (token_hash, expires_at), INDEX idx_password_reset_user (user_id)
    ) ENGINE=InnoDB`);
    await connection.execute(`CREATE TABLE IF NOT EXISTS wifi_plans (
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
    ) ENGINE=InnoDB`);
    await connection.execute(`CREATE TABLE IF NOT EXISTS wifi_subscriptions (
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
    ) ENGINE=InnoDB`);
    const [[planCount]] = await connection.execute('SELECT COUNT(*) AS total FROM wifi_plans');
    if (!planCount.total) {
      await connection.execute(`INSERT INTO wifi_plans (name, price, validity_days, speed_mbps, data_quota_gb, is_unlimited, device_limit, description, status) VALUES
        ('Quick Connect', 99.00, 7, 25, 20, FALSE, 1, 'Ideal for short-term study sprints and research.', 'Active'),
        ('Student Standard', 299.00, 30, 50, 100, FALSE, 2, 'Best for everyday classes, streaming, and assignments.', 'Active'),
        ('Study & Stream Pro', 499.00, 30, 100, NULL, TRUE, 3, 'High-speed uncapped access for multitasking and gaming.', 'Active'),
        ('Semester Pass', 899.00, 90, 100, 350, FALSE, 3, 'Full 3-month coverage with priority bandwidth.', 'Active'),
        ('Ultra Semester Unlimited', 1699.00, 180, 200, NULL, TRUE, 4, 'Top tier blazing speeds with unlimited data for 6 months.', 'Active')`);
    }

    await connection.execute(`CREATE TABLE IF NOT EXISTS notifications (
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
    ) ENGINE=InnoDB`);

    const [[notifCount]] = await connection.execute('SELECT COUNT(*) AS total FROM notifications');
    if (!notifCount.total) {
      const [admins] = await connection.execute('SELECT user_id FROM users WHERE role="admin"');
      const [recentActivities] = await connection.execute('SELECT user_id, activity_type, description, created_at FROM activities ORDER BY created_at DESC LIMIT 25');
      for (const act of recentActivities) {
        let type = 'system';
        let link = '/admin/dashboard';
        let title = 'System Activity';
        if (act.activity_type.includes('room')) { type = 'room'; link = '/admin/allocations'; title = 'Room Allocation'; }
        else if (act.activity_type.includes('fee')) { type = 'fee'; link = '/admin/fees'; title = 'Fee Payment'; }
        else if (act.activity_type.includes('complaint')) { type = 'complaint'; link = '/admin/complaints'; title = 'Hostel Complaint'; }
        else if (act.activity_type.includes('wifi')) { type = 'wifi'; link = '/admin/wifi'; title = 'Wi-Fi Network'; }
        else if (act.activity_type.includes('student')) { type = 'student'; link = '/admin/students'; title = 'Student Record'; }
        else if (act.activity_type.includes('feedback')) { type = 'feedback'; link = '/admin/feedback'; title = 'Student Feedback'; }

        for (const admin of admins) {
          await connection.execute(
            'INSERT INTO notifications (user_id, title, message, type, link, is_read, created_at) VALUES (?, ?, ?, ?, ?, FALSE, ?)',
            [admin.user_id, title, act.description, type, link, act.created_at]
          );
        }
        if (act.user_id) {
          const studentLink = link.startsWith('/admin/allocations') ? '/student/room' : link.replace('/admin/', '/student/');
          await connection.execute(
            'INSERT INTO notifications (user_id, title, message, type, link, is_read, created_at) VALUES (?, ?, ?, ?, ?, FALSE, ?)',
            [act.user_id, title, act.description, type, studentLink, act.created_at]
          );
        }
      }
    }

    const [feeCols] = await connection.execute("SHOW COLUMNS FROM fees LIKE 'penalty_amount'");
    if (!feeCols.length) {
      await connection.execute("ALTER TABLE fees ADD COLUMN penalty_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER fee_amount");
      await connection.execute("ALTER TABLE fees ADD COLUMN penalty_reason VARCHAR(255) NULL AFTER penalty_amount");
      await connection.execute("ALTER TABLE fees ADD COLUMN due_date DATE NULL AFTER payment_date");
    }

    await connection.execute(`CREATE TABLE IF NOT EXISTS waiting_list (
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
    ) ENGINE=InnoDB`);

    return true;
  } finally { connection.release(); }
}

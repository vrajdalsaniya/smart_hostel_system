import '../config/env.js';
import bcrypt from 'bcryptjs';
import { pool, withTransaction, testConnection } from '../config/db.js';
import { roomStatus } from '../utils/http.js';

const students = [
  ['student@smarthostel.com', 'Aarav Sharma', '9876500001', '12 Green Park, Delhi', 'Rakesh Sharma', '9876501001'],
  ['isha.patel@smarthostel.com', 'Isha Patel', '9876500002', 'Satellite, Ahmedabad', 'Manish Patel', '9876501002'],
  ['vihaan.kumar@smarthostel.com', 'Vihaan Kumar', '9876500003', 'Kankarbagh, Patna', 'Sanjay Kumar', '9876501003'],
  ['ananya.rao@smarthostel.com', 'Ananya Rao', '9876500004', 'Indiranagar, Bengaluru', 'Suresh Rao', '9876501004'],
  ['kabir.singh@smarthostel.com', 'Kabir Singh', '9876500005', 'Civil Lines, Jaipur', 'Amit Singh', '9876501005'],
  ['meera.nair@smarthostel.com', 'Meera Nair', '9876500006', 'Panampilly Nagar, Kochi', 'Ravi Nair', '9876501006'],
  ['arjun.verma@smarthostel.com', 'Arjun Verma', '9876500007', 'Hazratganj, Lucknow', 'Pankaj Verma', '9876501007'],
  ['diya.shah@smarthostel.com', 'Diya Shah', '9876500008', 'Vastrapur, Ahmedabad', 'Nitin Shah', '9876501008'],
  ['rehan.ali@smarthostel.com', 'Rehan Ali', '9876500009', 'Bandra, Mumbai', 'Farhan Ali', '9876501009'],
  ['kavya.iyer@smarthostel.com', 'Kavya Iyer', '9876500010', 'Adyar, Chennai', 'Srinivas Iyer', '9876501010']
];
const rooms = [['A','101',4],['A','102',3],['A','103',4],['B','201',2],['B','202',3],['C','301',2]];
const menu = {
  Monday: ['Poha, fruit & milk','Dal tadka, rice, roti & salad','Masala chai & veg sandwich','Paneer butter masala, roti & kheer'],
  Tuesday: ['Idli, sambar & chutney','Rajma chawal, salad & curd','Tea & corn chaat','Vegetable pulao, raita & gulab jamun'],
  Wednesday: ['Aloo paratha & curd','Chole, roti, rice & salad','Coffee & veg cutlet','Dal makhani, jeera rice & roti'],
  Thursday: ['Upma, banana & milk','Kadhi pakora, rice & roti','Tea & biscuits','Veg biryani, raita & dessert'],
  Friday: ['Bread omelette / veg toast','Sambar rice, poriyal & curd','Lemon tea & bhel','Shahi paneer, naan & rice'],
  Saturday: ['Chole bhature & lassi','Mixed dal, roti & salad','Tea & samosa','Pav bhaji & ice cream'],
  Sunday: ['Dosa, sambar & chutney','Veg pulao, raita & papad','Cold coffee & fries','Special thali & dessert']
};

async function seed() {
  await testConnection();
  const passwordHash = await bcrypt.hash('Student@123', 12);
  const adminHash = await bcrypt.hash('Admin@123', 12);
  await withTransaction(async (db) => {
    let [existing] = await db.execute('SELECT user_id FROM users WHERE email=?', ['admin@smarthostel.com']);
    if (!existing[0]) {
      const [admin] = await db.execute('INSERT INTO users (email,password,role) VALUES (?,?,"admin")', ['admin@smarthostel.com', adminHash]);
      await db.execute('INSERT INTO profiles (user_id,full_name,email,mobile,address) VALUES (?,?,?,?,?)', [admin.insertId, 'Riya Mehta', 'admin@smarthostel.com', '9876543210', 'Smart Hostel Office']);
      await db.execute('INSERT INTO admins (user_id,full_name,mobile_number) VALUES (?,?,?)', [admin.insertId, 'Riya Mehta', '9876543210']);
    }
    const studentIds = [];
    for (const [email, fullName, mobile, address, guardianName, guardianContact] of students) {
      let [found] = await db.execute('SELECT user_id FROM users WHERE email=?', [email]);
      let userId = found[0]?.user_id;
      if (!userId) {
        const [user] = await db.execute('INSERT INTO users (email,password,role) VALUES (?,?,"student")', [email, passwordHash]); userId = user.insertId;
        await db.execute('INSERT INTO profiles (user_id,full_name,email,mobile,address) VALUES (?,?,?,?,?)', [userId,fullName,email,mobile,address]);
        await db.execute('INSERT INTO students (user_id,full_name,mobile_number,address,guardian_name,guardian_contact) VALUES (?,?,?,?,?,?)', [userId,fullName,mobile,address,guardianName,guardianContact]);
      }
      const [[student]] = await db.execute('SELECT student_id FROM students WHERE user_id=?', [userId]); studentIds.push(student.student_id);
    }
    const roomIds = [];
    for (const [block, roomNumber, capacity] of rooms) {
      let [[room]] = await db.execute('SELECT room_id FROM rooms WHERE block=? AND room_number=?', [block,roomNumber]);
      if (!room) { const [created] = await db.execute('INSERT INTO rooms (block,room_number,capacity,occupied_beds,available_beds,room_status) VALUES (?,?,?,?,?,?)', [block,roomNumber,capacity,0,capacity,'Available']); room = { room_id: created.insertId }; }
      roomIds.push(room.room_id);
    }
    for (let i = 0; i < 8; i++) {
      const [[current]] = await db.execute("SELECT allocation_id FROM room_allocations WHERE student_id=? AND status='Active'", [studentIds[i]]);
      if (!current) await db.execute('INSERT INTO room_allocations (student_id,room_id,allocation_date,status) VALUES (?,?,?,"Active")', [studentIds[i], roomIds[Math.floor(i / 2)], `2026-0${(i % 6) + 1}-15`]);
    }
    for (const roomId of roomIds) {
      const [[room]] = await db.execute('SELECT capacity FROM rooms WHERE room_id=?', [roomId]);
      const [[count]] = await db.execute("SELECT COUNT(*) AS total FROM room_allocations WHERE room_id=? AND status='Active'", [roomId]);
      await db.execute('UPDATE rooms SET occupied_beds=?,available_beds=?,room_status=? WHERE room_id=?', [count.total, room.capacity - count.total, roomStatus(room.capacity, count.total), roomId]);
    }
    const [[feeCount]] = await db.execute('SELECT COUNT(*) AS total FROM fees');
    if (!feeCount.total) for (let i = 0; i < studentIds.length; i++) await db.execute('INSERT INTO fees (student_id,fee_amount,payment_date,payment_method,payment_status,description) VALUES (?,?,?,?,?,?)', [studentIds[i], 12500, i < 6 ? `2026-0${(i % 6) + 1}-05` : null, i < 6 ? (i % 2 ? 'Online' : 'Cash') : null, i < 6 ? 'Paid' : 'Pending', 'Semester hostel fee']);
    const [[complaintCount]] = await db.execute('SELECT COUNT(*) AS total FROM complaints');
    if (!complaintCount.total) {
      await db.execute('INSERT INTO complaints (student_id,complaint_description,complaint_date,status) VALUES (?,?,?,?)', [studentIds[0], 'The study room light needs replacement.', '2026-08-25', 'Pending']);
      await db.execute('INSERT INTO complaints (student_id,complaint_description,complaint_date,status) VALUES (?,?,?,?)', [studentIds[2], 'Water pressure is low in the second floor washroom.', '2026-08-20', 'In Progress']);
      await db.execute('INSERT INTO complaints (student_id,complaint_description,complaint_date,status) VALUES (?,?,?,?)', [studentIds[4], 'Wi-Fi connectivity issue has been resolved.', '2026-08-12', 'Resolved']);
    }
    const [[feedbackCount]] = await db.execute('SELECT COUNT(*) AS total FROM feedback');
    if (!feedbackCount.total) {
      await db.execute('INSERT INTO feedback (student_id,feedback_message,feedback_date) VALUES (?,?,?)', [studentIds[1], 'The new reading corner is calm and thoughtfully designed.', '2026-08-28']);
      await db.execute('INSERT INTO feedback (student_id,feedback_message,feedback_date) VALUES (?,?,?)', [studentIds[5], 'Please consider adding more seasonal fruit at breakfast.', '2026-08-29']);
    }
    for (const [day, meals] of Object.entries(menu)) for (const [index, item] of meals.entries()) await db.execute('INSERT INTO hostel_menu (day_name,meal_type,menu_items) VALUES (?,?,?) ON DUPLICATE KEY UPDATE menu_items=VALUES(menu_items)', [day,['Breakfast','Lunch','Evening Snack','Dinner'][index],item]);
    const [[activityCount]] = await db.execute('SELECT COUNT(*) AS total FROM activities');
    if (!activityCount.total) {
      await db.execute('INSERT INTO activities (user_id,activity_type,description) VALUES (?,?,?)', [studentIds[0], 'student_registered', 'Aarav Sharma registered as a student']);
      await db.execute('INSERT INTO activities (user_id,activity_type,description) VALUES (?,?,?)', [studentIds[0], 'room_allocated', 'Aarav Sharma was allocated to A–101']);
      await db.execute('INSERT INTO activities (user_id,activity_type,description) VALUES (?,?,?)', [studentIds[0], 'fee_recorded', 'Paid fee payment was recorded']);
    }
    const [[subCount]] = await db.execute('SELECT COUNT(*) AS total FROM wifi_subscriptions');
    if (!subCount.total) {
      const [plans] = await db.execute('SELECT plan_id, name, price, validity_days FROM wifi_plans WHERE status="Active" ORDER BY plan_id');
      if (plans.length >= 3 && studentIds.length >= 4) {
        await db.execute(`INSERT INTO wifi_subscriptions 
          (student_id, plan_id, amount_paid, start_date, end_date, payment_method, payment_status, status, voucher_code, wifi_username, wifi_password, device_name, device_mac)
          VALUES (?, ?, ?, '2026-09-01', '2026-10-01', 'Online', 'Paid', 'Active', 'WIFI-STU-8821', 'stu_aarav', 'HostelPass#8821', 'MacBook Air M2', '3C:22:FB:4A:12:88')`,
          [studentIds[0], plans[1].plan_id, plans[1].price]);
        await db.execute(`INSERT INTO wifi_subscriptions 
          (student_id, plan_id, amount_paid, start_date, end_date, payment_method, payment_status, status, voucher_code, wifi_username, wifi_password, device_name, device_mac)
          VALUES (?, ?, ?, '2026-09-05', '2026-10-05', 'Online', 'Paid', 'Active', 'WIFI-STU-4910', 'stu_isha', 'HostelPass#4910', 'Dell XPS 15', 'A4:83:E7:2B:90:1C')`,
          [studentIds[1], plans[2].plan_id, plans[2].price]);
        await db.execute(`INSERT INTO wifi_subscriptions 
          (student_id, plan_id, amount_paid, start_date, end_date, payment_method, payment_status, status, voucher_code, wifi_username, wifi_password, device_name, device_mac)
          VALUES (?, ?, ?, '2026-08-01', '2026-10-30', 'Cash', 'Paid', 'Active', 'WIFI-STU-3129', 'stu_vihaan', 'HostelPass#3129', 'Lenovo Legion', '58:11:22:9A:F0:44')`,
          [studentIds[2], plans[3]?.plan_id || plans[0].plan_id, plans[3]?.price || plans[0].price]);
        await db.execute(`INSERT INTO wifi_subscriptions 
          (student_id, plan_id, amount_paid, start_date, end_date, payment_method, payment_status, status, voucher_code, wifi_username, wifi_password, device_name, device_mac)
          VALUES (?, ?, ?, '2026-08-10', '2026-08-17', 'Online', 'Paid', 'Expired', 'WIFI-STU-1092', 'stu_ananya', 'HostelPass#1092', 'iPad Pro', '70:EF:00:81:CC:22')`,
          [studentIds[3], plans[0].plan_id, plans[0].price]);
        await db.execute('INSERT INTO activities (user_id,activity_type,description) VALUES (?,?,?)', [studentIds[0], 'wifi_subscription', 'Aarav Sharma activated Student Standard Wi-Fi plan (₹299)']);
      }
    }
  });
  console.log('Demo data seeded. Admin: admin@smarthostel.com / Admin@123. Student: student@smarthostel.com / Student@123');
}

seed().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => pool.end());

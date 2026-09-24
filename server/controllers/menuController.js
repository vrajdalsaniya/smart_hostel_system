import { pool } from '../config/db.js';
import { asyncHandler, httpError, required } from '../utils/http.js';
import { notifyStudents, notifyAdmins } from '../services/notificationService.js';

export const listMenu = asyncHandler(async (_req, res) => {
  const [menu] = await pool.execute("SELECT menu_id,day_name,meal_type,menu_items,updated_at FROM hostel_menu ORDER BY FIELD(day_name,'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'), FIELD(meal_type,'Breakfast','Lunch','Evening Snack','Dinner')");
  res.json({ menu });
});

function validatedMenu(body) {
  const { dayName, mealType, menuItems } = body;
  required(dayName, 'Day'); required(mealType, 'Meal type'); required(menuItems, 'Menu items');
  if (!['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].includes(dayName)) throw httpError(400, 'Invalid day.');
  if (!['Breakfast','Lunch','Evening Snack','Dinner'].includes(mealType)) throw httpError(400, 'Invalid meal type.');
  return { dayName, mealType, menuItems: String(menuItems).trim() };
}

export const createMenu = asyncHandler(async (req, res) => {
  const item = validatedMenu(req.body);
  const [result] = await pool.execute('INSERT INTO hostel_menu (day_name,meal_type,menu_items) VALUES (?,?,?)', [item.dayName, item.mealType, item.menuItems]);
  await pool.execute('INSERT INTO activities (user_id,activity_type,description) VALUES (?,?,?)', [req.user.userId, 'menu_updated', `Hostel menu updated for ${item.dayName} ${item.mealType}`]);
  const [[menu]] = await pool.execute('SELECT * FROM hostel_menu WHERE menu_id=?', [result.insertId]);
  notifyStudents({
    title: 'Hostel Menu Updated',
    message: `${item.dayName} ${item.mealType}: ${item.menuItems}`,
    type: 'menu',
    link: '/student/menu'
  });
  notifyAdmins({
    title: 'Hostel Menu Updated',
    message: `${item.dayName} ${item.mealType} was added to the menu.`,
    type: 'menu',
    link: '/admin/menu'
  });
  res.status(201).json({ message: 'Menu item added.', menu });
});

export const updateMenu = asyncHandler(async (req, res) => {
  const item = validatedMenu(req.body);
  const [result] = await pool.execute('UPDATE hostel_menu SET day_name=?,meal_type=?,menu_items=? WHERE menu_id=?', [item.dayName, item.mealType, item.menuItems, req.params.id]);
  if (!result.affectedRows) throw httpError(404, 'Menu item not found.');
  await pool.execute('INSERT INTO activities (user_id,activity_type,description) VALUES (?,?,?)', [req.user.userId, 'menu_updated', `Hostel menu updated for ${item.dayName} ${item.mealType}`]);
  const [[menu]] = await pool.execute('SELECT * FROM hostel_menu WHERE menu_id=?', [req.params.id]);
  notifyStudents({
    title: 'Hostel Menu Updated',
    message: `${item.dayName} ${item.mealType}: ${item.menuItems}`,
    type: 'menu',
    link: '/student/menu'
  });
  notifyAdmins({
    title: 'Hostel Menu Updated',
    message: `${item.dayName} ${item.mealType} menu was updated.`,
    type: 'menu',
    link: '/admin/menu'
  });
  res.json({ message: 'Menu item updated.', menu });
});

export const deleteMenu = asyncHandler(async (req, res) => {
  const [result] = await pool.execute('DELETE FROM hostel_menu WHERE menu_id=?', [req.params.id]);
  if (!result.affectedRows) throw httpError(404, 'Menu item not found.');
  res.json({ message: 'Menu item removed.' });
});

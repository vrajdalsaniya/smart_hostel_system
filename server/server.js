import './config/env.js';
import app from './app.js';
import { testConnection } from './config/db.js';

const port = Number(process.env.PORT || 5000);
app.listen(port, async () => {
  console.log(`Smart Hostel API listening on http://localhost:${port}`);
  try { await testConnection(); console.log('MySQL connection established.'); }
  catch { console.warn('MySQL is not connected. Configure .env and import database/schema.sql before using the API.'); }
});

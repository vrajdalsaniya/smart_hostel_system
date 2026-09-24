# Smart Hostel

A full-stack hostel management application for students and administrators. Smart Hostel replaces manual registers with secure, role-based workflows for resident records, rooms, allocations, fees, complaints, feedback, meal planning, profiles, dashboards, and reports.

## Highlights

- Secure JWT sign-in, bcrypt password hashing, registration, protected routes, and role-based APIs.
- Admin workspace for student and room CRUD, capacity-safe room allocation, fee recording, complaint workflow, feedback, menu editing, reports, and account management.
- Student portal for room details, fee history, complaints, feedback, weekly meals, profile photo, and password changes.
- Live MySQL-backed dashboard statistics and charts—no frontend fixture data.
- Responsive premium SaaS design using the defined lavender/purple visual system.
- Search, filters, confirmation dialogs, empty/loading/error states, CSV download, and print-ready reports.

## Stack

- Client: React, React Router, Vite, Recharts, Lucide icons
- Server: Node.js, Express, mysql2, JWT, bcryptjs, Multer
- Database: MySQL 8+

## Requirements

- Node.js 20+ (Node 24 is supported)
- MySQL 8+ running locally

## Install and configure

1. Install workspace dependencies:

   ```bash
   npm install
   ```

2. Copy the environment template and supply your MySQL credentials:

   ```bash
   Copy-Item .env.example .env
   ```

3. Create the database and tables:

   ```bash
   mysql -u root -p < database/schema.sql
   ```

   In PowerShell, if your shell does not support input redirection, open MySQL and run:

   ```sql
   SOURCE C:/Users/JINISH GOHEL/OneDrive/Documents/New project/database/schema.sql;
   ```

4. Seed the optional presentation/demo records (this script hashes passwords with bcrypt and can be re-run safely):

   ```bash
   npm run seed
   ```

5. Run client and server together:

   ```bash
   npm run dev
   ```

   Open [http://localhost:5173](http://localhost:5173). The API runs at `http://localhost:5000`.

## Demo accounts

These only exist after `npm run seed`:

| Role | Email | Password |
| --- | --- | --- |
| Administrator | `admin@smarthostel.com` | `Admin@123` |
| Student | `student@smarthostel.com` | `Student@123` |

Change demo passwords before any non-development use.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `PORT` | API port (default `5000`) |
| `CLIENT_URL` | Browser app allowed by CORS |
| `JWT_SECRET` | Long random secret used to sign sessions |
| `JWT_EXPIRES_IN` | Session lifetime, such as `7d` |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | MySQL connection settings |

## API overview

All non-auth requests require `Authorization: Bearer <token>`.

- `/api/auth`: registration, login, logout, current session
- `/api/students`, `/api/rooms`, `/api/allocations`, `/api/fees`
- `/api/complaints`, `/api/feedback`, `/api/menu`
- `/api/dashboard/admin`, `/api/dashboard/student`
- `/api/profile`, `/api/profile/password`, `/api/profile/photo`
- `/api/reports/students`, `/fees`, `/complaints`, `/allocations`, `/rooms`

Admin-only APIs enforce server-side authorization. Student APIs automatically scope private information to the authenticated student.

## Project layout

```text
client/                 React application
  src/components/       Shared UI components and layout
  src/context/          Authentication and toast state
  src/pages/            Public, dashboard, and feature pages
  src/services/         API client
server/                 Express REST API
  config/               MySQL connection pool
  controllers/          Domain handlers
  middleware/           Auth, uploads, errors
  routes/               REST endpoint definitions
  scripts/seed.js       Secure demo data seeder
database/schema.sql     MySQL schema, relationships, and indexes
database/seed.sql       Seed entry point note
```

## Useful commands

```bash
npm run dev          # start client and API in watch mode
npm run build        # production-build React client
npm run start        # start API without watch mode
npm run seed         # insert secure demo data
```

## Troubleshooting

- **API starts but MySQL is not connected:** verify `.env`, start MySQL, and import `database/schema.sql` before using the application.
- **CORS error:** confirm `CLIENT_URL` matches the Vite URL exactly.
- **Port occupied:** change `PORT` or stop the process using port 5000; Vite will suggest an alternate client port if needed.
- **Unable to seed:** ensure the schema has been imported and the database account can create/read rows in `smart_hostel`.

## Production notes

Set a strong unique `JWT_SECRET`, use a restricted database account, configure a production client origin, run the built client behind HTTPS, and use a durable object store for uploaded profile images.

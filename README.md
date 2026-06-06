# 🚢 VesselOps

A full-stack maritime crew management platform built for commercial vessels. Digitizes crew scheduling, logbook entries, and STCW certificate tracking — workflows traditionally done on paper or Excel.

**Live demo:** https://vesselops-frontend.vercel.app  
**Demo credentials:** captain@test.com / test1234

---

## Features

- **Crew management** — track crew members, ranks, nationalities, and contract dates
- **Watch schedules** — assign 4-on/8-off bridge, engine, and deck watches by date
- **Digital logbook** — record position (lat/lon), weather, sea state, speed, and course
- **Certificate tracking** — STCW certificates with automatic status updates (valid / expiring soon / expired)
- **Dashboard** — real-time overview of crew status and certificate alerts
- **JWT authentication** — role-based access (admin, captain, officer, cadet)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Backend | Node.js + Express |
| Database | PostgreSQL (Supabase) |
| Auth | JWT + bcrypt |
| Deploy | Vercel (frontend) + Render (backend) |

---

## Architecture

```
vesselops-frontend/          vesselops-api/
├── src/                     ├── src/
│   ├── api/client.ts        │   ├── index.js
│   ├── context/             │   ├── db/pool.js
│   │   └── AuthContext.tsx  │   ├── middleware/auth.js
│   ├── pages/               │   └── routes/
│   │   ├── Dashboard.tsx    │       ├── auth.js
│   │   ├── Crew.tsx         │       ├── vessels.js
│   │   ├── Watches.tsx      │       ├── crew.js
│   │   ├── Logbook.tsx      │       ├── watches.js
│   │   └── Certificates.tsx │       ├── logbook.js
│   └── components/          │       ├── certificates.js
│       └── Navbar.tsx       │       └── dashboard.js
└── vercel.json              └── package.json
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login |
| GET | `/api/vessels` | List vessels |
| GET/POST/PUT/DELETE | `/api/crew` | Crew CRUD |
| GET/POST/DELETE | `/api/watches` | Watch schedules |
| GET/POST | `/api/logbook` | Logbook entries |
| GET/POST/PUT/DELETE | `/api/certificates` | STCW certificates |
| GET | `/api/dashboard` | Aggregated stats |

All endpoints except `/api/auth` require a Bearer JWT token.

---

## Database Schema

6 tables with foreign key relationships and PostgreSQL triggers:

- `users` — authentication with role-based access
- `vessels` — vessel registry with IMO numbers
- `crew_members` — crew with contract dates and status
- `watch_schedules` — daily watch assignments with conflict detection
- `logbook_entries` — position, weather, sea state, speed, course
- `certificates` — STCW certs with auto-updating status trigger

---

## Running locally

### Backend
```bash
cd vesselops-api
npm install
cp .env.example .env
# Add your Supabase DATABASE_URL and JWT_SECRET to .env
npm run dev
# API running at http://localhost:3000
```

### Frontend
```bash
cd vesselops-frontend
npm install
# Update src/api/client.ts baseURL to http://localhost:3000/api
npm run dev
# App running at http://localhost:5173
```

---

## Background

Built by a former Merchant Navy deck officer studying Computer Science. The domain knowledge behind this project comes from firsthand experience managing crew watches, STCW certificates, and logbook entries on commercial vessels.

---

## Author

**Thanos Salas**  
Computer Science student @ Metropolitan College Athens  
[GitHub](https://github.com/thanossala) · [Portfolio](https://thanossala.github.io)

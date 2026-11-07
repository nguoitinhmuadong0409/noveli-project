# novoli

novoli is a full-stack social reading platform that combines book discovery, reading tracking, personalized bookshelves, anonymous discussions, and AI-based recommendations. The platform is built with a **privacy-first architecture**: zero email or phone requirements, zero IP logging, pseudonymous identities (`biDanh`), and 160-bit cryptographic account recovery.

---

## 🌟 Key Features

- **Privacy-First Authentication**:
  - No email, phone numbers, or third-party OAuth trackers required.
  - Accounts use unique pseudonyms (`biDanh`) and bcrypt-hashed passwords.
  - 160-bit cryptographic Recovery Key (`BKHL-XXXXXXXX-...`) for deterministic zero-knowledge account recovery.
  - Dual-token auth: 15-minute JWT access tokens + rotating HttpOnly `SameSite=Strict` refresh cookies.
  - Per-device session invalidation and global session revocation (`logout-all`).
- **Reading Tracking & Streaks**:
  - Track daily reading sessions, start/end pages, duration, and personal notes.
  - Automatic streak calculation and annual goal tracking.
  - Idempotent log synchronization with UUID client identifiers.
- **Monthly Leaderboard**:
  - Compare monthly reading activity and browse rankings for previous months.
- **Realtime Chat**:
  - Start private conversations, create group chats, and exchange messages in realtime.
  - Group membership and message access are checked by the backend.
- **Shelves & Book Catalog**:
  - Curated and custom shelves (`WANT_TO_READ`, `CURRENTLY_READING`, `READ`, `DID_NOT_FINISH`).
  - Integrated search with Google Books API and community rating recalculation.
- **Privacy-Preserving Anonymous Forum**:
  - Book-centric discussion threads and nested replies.
  - Author identities are anonymized per-thread using keyed HMAC hashes with unique pseudonymous display aliases.
  - Spoiler-safe content blurring.
- **AI Reading Advisor**:
  - OpenAI-powered contextual book recommendations based on reader mood, past shelves, and literary preferences.
- **PWA & Push Notifications**:
  - Web Push notifications (VAPID) for daily reading reminders and streak protection.

---

## 🏗 Architecture & Tech Stack

```text
novoli/
├── backend/
│   ├── prisma/
│   │   ├── migrations/0_init/   # Baseline migration for production deployment
│   │   └── schema.prisma        # Complete schema (10 models, indexes, enums)
│   ├── src/
│   │   ├── config/              # Prisma, Redis, ENV loaders
│   │   ├── jobs/                # Web Push notification cron jobs
│   │   ├── middlewares/         # Privacy shield, rate limiter, JWT authenticate
│   │   ├── modules/             # Auth, Books, Shelves, Forum, Reading Logs, AI, Analytics
│   │   ├── utils/               # Tokens, crypto, Zod schemas
│   │   ├── app.ts               # Express application factory
│   │   ├── server.ts            # HTTP server bootstrap & graceful shutdown
│   │   └── seed.ts              # Demo seed data script
│   ├── tests/                   # End-to-end integration & security test suites
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/          # AuthModal, BookCard, Navbar, Modals
│   │   ├── context/             # AuthContext (session restoration, theme manager)
│   │   ├── services/            # API client with auto-refresh queue & credentials
│   │   ├── views/               # Home, Explore, Shelves, Forum, Profile, Analytics
│   │   └── types/               # Full TypeScript definitions
│   ├── public/
│   ├── package.json
│   └── vite.config.ts           # Port 3000 with /api proxy to port 4000
├── docker-compose.yml           # PostgreSQL 16 & Redis 7
├── run.bat                       # Windows local launcher
└── README.md
```

### Technology Highlights
- **Frontend**: React 19, TypeScript, Vite (Port 3000), Lucide React icons, CSS design tokens.
- **Backend**: Node.js 22+, Express 5, TypeScript, Prisma ORM 5.22, Redis 6+ / 7, Helmet, CORS, Morgan.
- **Database**: PostgreSQL 16 (UUID primary keys, composite indexes, cascades).
- **Security**: Privacy Shield middleware (strips `X-Forwarded-For`, `X-Real-IP`, `CF-Connecting-IP`), sliding-window Redis rate limiting, timing-safe bcrypt password comparison.

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v20+ recommended, tested on v22/v26)
- [Docker](https://www.docker.com/) & Docker Compose (or local PostgreSQL & Redis services)

### Windows quick launch
Extract the project ZIP, install Node.js and Docker Desktop, then double-click `run.bat`. It starts PostgreSQL and Redis, installs missing npm dependencies, applies database migrations, and opens the app at `http://localhost:3000`. On first launch it creates `backend/.env` from the example file; keep that private and never upload it to GitHub.

### 2. Start Database & Cache
From the project root:
```bash
docker compose up -d
```
This boots:
- **PostgreSQL** on `localhost:5432` (database: `novoli_db`)
- **Redis** on `localhost:6379`

### 3. Backend Setup
```bash
cd backend
cp .env.example .env
npm install
```

Configure your `backend/.env` with required parameters:
```ini
PORT=4000
NODE_ENV=development
DATABASE_URL="postgresql://novoli:strong_password@localhost:5432/novoli_db?schema=public"
REDIS_URL="redis://localhost:6379"
JWT_ACCESS_SECRET="your-jwt-access-secret-min-32-chars"
JWT_REFRESH_SECRET="your-jwt-refresh-secret-min-32-chars"
FORUM_ANONYMOUS_SECRET="your-forum-hmac-secret-min-32-chars"
CORS_ORIGINS="http://localhost:3000,http://localhost:5173"
OPENAI_API_KEY="" # Optional for AI recommendation features
```

### 4. Database Migration & Seeding
```bash
# Apply baseline migrations
npx prisma migrate deploy

# (Optional) Seed demo users, books, shelves, logs, and forum discussions
npm run db:seed
```

### 5. Launch Backend
```bash
npm run dev
```
API runs at **`http://localhost:4000`** (Health check: `http://localhost:4000/health`).

### Admin Account
1. Set `OWNER_BIDAN` in `backend/.env` to your exact account username.
2. On a fresh database, set a long random `OWNER_SETUP_KEY` and enter it when registering that username; it receives admin automatically. Remove the setup key after registration.
3. If the owner account already exists, grant it admin from the `backend` directory:
   ```bash
   npm run db:promote-admin -- <OWNER_BIDAN>
   ```
4. Sign in again. Only the owner can grant or revoke admin. Delegated admins can view the admin dashboard but cannot change roles.

Admin access is checked against the database for every admin API request. The setup command refuses usernames other than the configured owner.
If you plan to run the optional demo seed, do so before registering or promoting your admin account; the existing seed script clears all application data.

### 6. Frontend Setup & Launch
Open a new terminal:
```bash
cd frontend
npm install
npm run dev
```
Open **`http://localhost:3000`** in your browser. All `/api` requests are automatically proxied to `http://localhost:4000`.

---

## 👥 Preloaded Demo Accounts

When running `npm run db:seed`, three interactive profiles are available:

| Pseudonym (`biDanh`) | Password | Reading Persona | Streak |
|---|---|---|---|
| `sach_va_tra` | `novoli@2026!` | Độc giả yêu trà & triết học | 7 ngày liên tiếp 🔥 |
| `ke_ngao_du` | `novoli@2026!` | Thích phiêu lưu & khoa học viễn tưởng | 12 ngày liên tiếp 🔥 |
| `dem_muon_doc_sach` | `novoli@2026!` | Cú đêm đọc tiểu thuyết cảm động | 3 ngày liên tiếp 🔥 |

You can switch between demo accounts instantly from the **Demo** tab in the Auth Modal, or register brand-new pseudonyms.

---

## 📡 API Reference Overview

All API endpoints reside under `/api/v1`:

### Authentication (`/api/v1/auth`)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/register` | Public | Register with `biDanh` & password; the configured owner also requires `OWNER_SETUP_KEY` and receives admin |
| `POST` | `/login` | Public | Constant-time authentication; sets `bkhl_rt` HttpOnly cookie |
| `POST` | `/refresh` | Cookie | Rotates refresh token and returns fresh access token |
| `POST` | `/recover` | Public | Reset password using 160-bit Recovery Key |
| `POST` | `/recovery-key/rotate` | Authenticated | Replace the recovery key after confirming the current password |
| `GET` | `/me` | Bearer | Get current profile, streak count, and stats |
| `PATCH` | `/me` | Bearer | Update avatar seed and reading preferences |
| `PATCH` | `/password` | Bearer | Authenticated password change (revokes all active sessions) |
| `POST` | `/logout` | Bearer | Invalidate current session and clear refresh cookie |
| `POST` | `/logout-all` | Bearer | Invalidate all active sessions across all devices |

### Books & Shelves (`/api/v1`)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/books` | Optional | Paginated book catalog with category filters |
| `GET` | `/books/:id` | Optional | Detailed book view with community ratings |
| `GET` | `/books/search?q=` | Public | Search external books via Google Books API |
| `POST` | `/books/:id/reviews`| Bearer | Submit book review with rating (1-5) and spoiler flag |
| `GET` | `/shelves` | Bearer | Get current user's shelves (`type` filter supported) |
| `PUT` | `/shelves` | Bearer | Add or move book to shelf |
| `PATCH` | `/shelves/:id/progress` | Bearer | Update reading page progress for book |
| `DELETE` | `/shelves/:id` | Bearer | Remove book from shelf |

### Reading Logs & Analytics (`/api/v1`)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/reading-logs/sync` | Bearer | Idempotent bulk sync of reading sessions |
| `GET` | `/analytics/dashboard`| Bearer | User reading statistics, streak, and annual goals |
| `GET` | `/analytics/reading-chart` | Bearer | Reading history aggregation by day/week |

### Monthly Leaderboard (`/api/v1/leaderboard`)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/?month=MM&year=YYYY` | Public | Rank readers by monthly reading activity |

### Chat (`/api/v1/chat`)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/conversations` | Authenticated | List the current user's conversations |
| `POST` | `/conversations/direct` | Authenticated | Create or open a private conversation |
| `POST` | `/conversations/groups` | Authenticated | Create a group conversation |
| `POST` | `/conversations/:id/members` | Authenticated | Add members as a group admin |
| `GET` | `/conversations/:id/messages` | Authenticated | Read messages in a conversation |
| `POST` | `/conversations/:id/messages` | Authenticated | Send a message to conversation members |

Chat realtime events use Socket.IO on the same origin as the API and require the signed-in user's access token.

### Anonymous Forum (`/api/v1/forum`)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/threads` | Public | List discussion threads (book-filtered or general) |
| `POST` | `/threads` | Bearer | Create thread (author is HMAC-anonymized) |
| `GET` | `/threads/:id/posts`| Public | Fetch nested post replies |
| `POST` | `/posts` | Bearer | Reply to thread or post (author is HMAC-anonymized) |

### AI Advisor (`/api/v1/ai`)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/recommendations` | Bearer | Personalized recommendations by reading mood |

---

## 🧪 Automated Testing

novoli includes end-to-end integration and security test suites using Node's native test runner:

```bash
cd backend
npm test
```

### What is tested:
- **`tests/auth.test.ts`**:
  - Registration & 160-bit recovery key entropy format verification
  - Case-insensitive duplicate username collision detection
  - Constant-time login failure on invalid credentials
  - Profile retrieval (`GET /auth/me`) and modification (`PATCH /auth/me`)
  - Authenticated password modification and automatic session revocation
  - Refresh token rotation & cookie management
  - Zero-knowledge account recovery via recovery key
  - Single device logout & multi-device global session revocation
- **`tests/security.test.ts`**:
  - Strict tenant data isolation (User A cannot access or modify User B's shelves or reading logs)
  - Unauthenticated access rejection across all protected routes (401 verification)
  - Privacy Shield IP header scrubbing
- **`tests/chat.test.ts`**:
  - Private and group conversations, message access, and group-admin membership permissions

---

## 🚢 Production Deployment Checklist

1. **Environment Variables**:
   - Set `NODE_ENV=production`.
   - Set strong cryptographic secrets for `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, and `FORUM_ANONYMOUS_SECRET`.
   - Ensure `CORS_ORIGINS` reflects the production frontend domain.
2. **Database Migrations**:
   - Run `npx prisma migrate deploy` in your CI/CD pipeline before starting the container/process.
3. **Build Bundles**:
   - Backend: `npm run build` generates typed CommonJS artifacts in `dist/`.
   - Frontend: `npm run build` generates optimized assets in `dist/`.
4. **HTTPS / SSL**:
   - In production, refresh cookies automatically activate the `Secure` flag, requiring HTTPS.

### Deploy publicly from GitHub with Railway

The app is served as one HTTPS site so the frontend and API share an origin (including secure refresh cookies). Railway builds from the GitHub repository using the root `Dockerfile`; GitHub Pages alone cannot host the Node.js API or its database.

1. Push the repository to GitHub. Do not commit any `.env` file, password, recovery key, or service token.
2. In Railway, create a project from that GitHub repository and add PostgreSQL and Redis services. Railway uses the root `railway.json` and `Dockerfile`.
3. Configure these variables on the Noveli application service in Railway:
   - `NODE_ENV=production`
   - `DATABASE_URL` from the Railway PostgreSQL service
   - `REDIS_URL` from the Railway Redis service
   - `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, and `FORUM_ANONYMOUS_SECRET` as separate long random values
   - `OWNER_BIDAN` set to the one owner account's exact Noveli username
   - `OWNER_SETUP_KEY` as a long random one-time registration key when creating the owner in a fresh database
   - `CORS_ORIGINS` set to the Railway public app URL (or custom domain)
4. Generate the three application secrets and the one-time setup key locally; enter them directly in Railway's private Variables UI. Never put them in GitHub files or send them in chat. For example, use `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` separately for each value.
5. After the first deployment, register the owner account using `OWNER_BIDAN` and `OWNER_SETUP_KEY`. The backend grants admin only to that account. Remove `OWNER_SETUP_KEY` from Railway Variables after registration. For an existing database, run `node dist/promoteAdmin.js <OWNER_BIDAN>` in a Railway shell; this command refuses any other username.
6. Generate a Railway domain and open its HTTPS URL. The same address works on phones and computers; future commits to the connected GitHub branch trigger deployments.

Only the configured owner can grant or revoke admin. Other admins can use the admin dashboard but cannot change roles. If deploying from a new empty database, do not run the demo seed script in production.

---

## 📄 License

ISC License.

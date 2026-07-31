# 🚀 How to Run This App

A complete guide to installing, configuring, and running the **Book App** — a salon / spa / clinic / gym booking, client, and payments management app.

---

## Table of Contents

1. [What This App Does](#-what-this-app-does)
2. [Prerequisites](#-prerequisites)
3. [Quick Start (Local Mode)](#-quick-start-local-mode)
4. [Full Setup (Supabase + Gemini)](#-full-setup-supabase--gemini)
   - [1. Environment Variables](#1-environment-variables)
   - [2. Create a Supabase Project](#2-create-a-supabase-project)
   - [3. Run the Database Schema](#3-run-the-database-schema)
   - [4. Get a Gemini API Key (optional)](#4-get-a-gemini-api-key-optional)
5. [Run in Development](#-run-in-development)
6. [Run in Production](#-run-in-production)
7. [Available Scripts](#-available-scripts)
8. [Verifying Everything Works](#-verifying-everything-works)
9. [Troubleshooting](#-troubleshooting)

---

## 📖 What This App Does

- **Dashboard** – overview of revenue, upcoming bookings, and a live payment feed.
- **Staff Calendar** – schedule/block bookings per staff member, detect conflicts, mark statuses, print thermal receipt previews, and share via WhatsApp.
- **Client Profiles** – directory with search, sorting, visit/paid/dues metrics.
- **Packages Tracker** – sell prepaid packages/memberships and track sessions remaining.
- **Payments Ledger** – log payments (cash / UPI / card), settle dues, and record package purchases.
- **Settings** – business profile, staff list, services menu, data export/import, and Supabase sync.
- **AI Chat Bot** – built-in assistant that explains how to use the app (needs Gemini).
- **Daily AI Quote** – inspirational money/business quote on the dashboard (needs Gemini, falls back to curated quotes).

**Data storage:** the app runs fully offline with no external services — all data is saved to your browser's `localStorage`. Optionally, it can sync to **Supabase** for cloud persistence across devices, with per-user Row Level Security.

---

## 📋 Prerequisites

| Requirement | Version | Notes |
| :--- | :--- | :--- |
| **Node.js** | 18+ | Includes `npm`. Check with `node -v` |
| **npm** | 9+ | Comes bundled with Node.js |
| **A modern browser** | Chrome / Edge / Firefox / Safari | The app is client-heavy |
| **Supabase account** *(optional)* | Free tier is fine | Only needed for cloud sync |
| **Gemini API key** *(optional)* | — | Only needed for AI chat bot + AI quotes |

> 💡 **You can run the app with zero accounts** — see [Quick Start](#-quick-start-local-mode).

---

## ⚡ Quick Start (Local Mode)

No accounts, no environment variables, no database. Just install and run:

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server
npm run dev
```

3. Open **http://localhost:3000** in your browser.
4. On the login screen, click **Launch Offline Local Demo Mode** (below the sign-in form). The app loads with demo data and saves everything to your browser's `localStorage`.

> ℹ️ **Why `npm run dev`?** Unlike a typical Vite-only app, this project's dev server is a single Express server (`server.ts`) that hosts the Vite middleware, the API routes (`/api/...`), and the WebSocket real-time sync — all on port **3000**.

---

## 🔑 Full Setup (Supabase + Gemini)

### 1. Environment Variables

1. Copy the example file:
   ```bash
   # Windows (cmd / PowerShell)
   copy .env.example .env

   # macOS / Linux
   cp .env.example .env
   ```
2. Open `.env` and fill in the values you want:

| Variable | Required | Description |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | No | Google Gemini key for the AI chat bot + AI quotes |
| `SUPABASE_URL` | No | Your Supabase project URL, e.g. `https://xyzcompany.supabase.co` |
| `SUPABASE_KEY` | No | Supabase **anon** (or service role) key for server-side sync |
| `VITE_SUPABASE_URL` | No | Same URL — used by the frontend when hosted statically |
| `VITE_SUPABASE_ANON_KEY` | No | Same key — used by the frontend when hosted statically |
| `APP_URL` | No | Public URL where the app is hosted (self-referential links; not required locally) |
| `PORT` | No | Server port (default `3000`) |
| `NODE_ENV` | No | Set to `production` to serve the built bundle instead of Vite middleware |

> ⚠️ **Important:** `.env` files are **git-ignored** (see `.gitignore`) — never commit real keys. If you use the Supabase **service role** key, keep it server-side only (it bypasses RLS); for cloud deployments prefer the **anon** key together with RLS policies.

### 2. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) → **New project** (free tier is fine).
2. Note your **Project URL** and the **anon key** from **Project Settings → API**.

### 3. Run the Database Schema

The app expects a specific schema with 7 tables (`businesses`, `staff`, `clients`, `packages`, `bookings`, `payments`, `services`), indexes, and RLS policies:

1. Open your Supabase project → **SQL Editor**.
2. Paste the entire contents of **`supabase_schema.sql`** (in this repo).
3. Click **Run**.

That's it — tables, indexes, and Row Level Security are created. The app will sync data per logged-in user.

### 4. Get a Gemini API Key (optional)

1. Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey) → **Create API key**.
2. Paste it as `GEMINI_API_KEY` in your `.env`.

> Without a key, the app still runs — the daily quote falls back to a curated list, and the AI chat bot returns an error until a key is added.

---

## 🖥️ Run in Development

```bash
npm install      # first time only
npm run dev
```

- App + API + WebSocket: **http://localhost:3000**
- Health check: **http://localhost:3000/api/health**
- Supabase status: **http://localhost:3000/api/supabase/status**

Make edits to `src/` and the page hot-reloads. Editing `server.ts` requires a restart.

---

## 🏭 Run in Production

```bash
# 1. Build the frontend bundle AND bundle the server
npm run build

# 2. Start the production server (serves the built app + API)
npm start
```

- The build outputs to `dist/`:
  - `dist/` — static frontend bundle
  - `dist/server.cjs` — bundled Express server
- The server serves the static files and API from **http://localhost:3000** (override with `PORT`).
- Set `NODE_ENV=production` when deploying so the server serves the built bundle instead of Vite middleware.

> See [DEPLOYMENT.md](DEPLOYMENT.md) for Render / Railway / Docker / Vercel deployment steps.

---

## 📜 Available Scripts

| Script | Command | What it does |
| :--- | :--- | :--- |
| `npm run dev` | `tsx server.ts` | Runs the Express dev server with Vite middleware + HMR on port 3000 |
| `npm run build` | `vite build && esbuild server.ts --bundle ...` | Builds the frontend and bundles the server to `dist/` |
| `npm start` | `node dist/server.cjs` | Runs the production server (after `build`) |
| `npm run preview` | `vite preview` | Serves the built frontend only (no API/WebSocket) |
| `npm run typecheck` | `tsc --noEmit` | Type-checks the whole project |
| `npm run lint` | `tsc --noEmit` | Same as typecheck |
| `npm run clean` | `rm -rf dist server.js` | Removes build artifacts |

---

## ✅ Verifying Everything Works

1. **App loads** → open http://localhost:3000 and log in (or skip).
2. **Health check** → visit `http://localhost:3000/api/health`. Expect:
   ```json
   { "status": "ok", "timestamp": "...", "env": "development" }
   ```
3. **Supabase (if configured)** → visit `http://localhost:3000/api/supabase/status`. Expect:
   ```json
   { "configured": true, "url": "https://..." }
   ```
4. **Database sync** → in **Settings**, click **Sync with Supabase** after logging in. A success toast + saved state confirms the schema and RLS are working.
5. **AI chat bot (if key set)** → open the chat widget and ask a question.

---

## 🛠️ Troubleshooting

| Problem | Cause & Fix |
| :--- | :--- |
| `Port 3000 is already in use` | Something else is on port 3000. Set a different port: add `PORT=4000` to `.env`, or run `PORT=4000 npm run dev` |
| `npm install` errors | Try deleting `node_modules` and `package-lock.json` (or `bun.lock`), then `npm install` again. Node 18+ is required |
| AI chat bot errors | `GEMINI_API_KEY` is missing or invalid. Add it to `.env` and restart |
| Sync fails: *"Please ensure that you have run the schema..."* | The `supabase_schema.sql` hasn't been run, or RLS policies are missing. Run it in the Supabase SQL Editor |
| Sync fails: `JWT issued at future` / `clock skew` | The server handles this automatically with retries — just retry the sync if it persists |
| Login doesn't work with Supabase | Confirm `SUPABASE_URL` / `SUPABASE_KEY` are correct, and that Supabase **Email auth** is enabled (Authentication → Providers) |
| Data lost after clearing browser cache | Expected in **local mode** — data lives in `localStorage`. Enable Supabase sync, or use **Settings → Export Data** for a JSON backup |
| `npm start` says file not found | You must run `npm run build` first so `dist/server.cjs` exists |
| WebSocket "Real-time Sync disconnected" | Normal in local mode (no other clients). It reconnects automatically; requires the Node server (not `vite preview`) to work |

---

## 📄 Related Docs

- **[DEPLOYMENT.md](DEPLOYMENT.md)** – production deployment (Render, Docker, Vercel) with health checks.
- **`.env.example`** – template for all environment variables.
- **`supabase_schema.sql`** – database schema, indexes, and RLS policies.

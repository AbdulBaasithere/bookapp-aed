# Production Deployment Guide

This guide provides step-by-step instructions for deploying this Salon & Appointment Booking application to production environments.

---

## 📋 Prerequisites

Before deploying, ensure you have:
1. A **Supabase** project (for database, sync, & real-time capabilities).
2. A **Google Gemini API Key** (optional, for AI insights & daily quotes).
3. Node.js 18+ installed on your host/build server.

---

## 🔑 Environment Variables Configuration

Configure the following environment variables in your hosting provider's dashboard:

| Environment Variable | Required | Description | Example |
| :--- | :--- | :--- | :--- |
| `PORT` | Optional | Web server listening port (assigned automatically by host) | `3000` / `8080` |
| `NODE_ENV` | Yes | Set to `production` for production builds & static serving | `production` |
| `SUPABASE_URL` | Yes | Your Supabase project URL | `https://xyz company.supabase.co` |
| `SUPABASE_KEY` | Yes | Your Supabase public anon or service role key | `eyJhbGciOi...` |
| `VITE_SUPABASE_URL` | Yes | Frontend build variable for Supabase URL | `https://xyz company.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Yes | Frontend build variable for Supabase key | `eyJhbGciOi...` |
| `GEMINI_API_KEY` | Optional | Gemini API key for AI features & quote generation | `AIzaSy...` |

---

## 🗄️ Database Setup (Supabase)

1. Open your **Supabase Dashboard** -> **SQL Editor**.
2. Copy the full contents of `supabase_schema.sql` from this workspace.
3. Paste into the SQL Editor and click **Run**.
4. This initializes tables (`business`, `staff`, `clients`, `services`, `bookings`, `packages`, `payments`, `expenses`, `notifications`, `audit_logs`) and enables RLS policies.

---

## 🚀 Deployment Options

### Option 1: Render / Railway / Heroku (Node.js Server)

This app includes a production-ready Express server (`server.ts`) that serves compiled static frontend assets and handles API/WebSocket endpoints.

#### Build & Start Commands:
- **Build Command:** `npm run build`
- **Start Command:** `npm start`

#### Steps on Render:
1. Create a **New Web Service** connected to your repository.
2. Set Environment to **Node**.
3. Set Build Command: `npm run build`
4. Set Start Command: `npm start`
5. Add required environment variables under **Environment**.
6. Deploy! Render will build the Vite bundle and start the Node server on dynamic `$PORT`.

---

### Option 2: Docker Container Deployment

You can build and run this application inside a lightweight Docker container.

#### Create `Dockerfile` in root:
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/server.cjs"]
```

#### Build & Run Commands:
```bash
docker build -t salon-book-app .
docker run -p 3000:3000 --env-file .env salon-book-app
```

---

### Option 3: Vercel / Static Hosting

For serverless deployment on Vercel:
1. Connect your repository to **Vercel**.
2. Framework Preset: **Vite**.
3. Build Command: `npm run build`
4. Output Directory: `dist`
5. Add Environment Variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `GEMINI_API_KEY`).

---

## ✅ Production Health Check

Once deployed, verify your service status:
- Health Check: `GET https://your-domain.com/api/health`
- Expected Output: `{"status":"ok","timestamp":"...","env":"production"}`

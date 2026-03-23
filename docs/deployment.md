# Deployment guide (UZ / EN)

This repository is a monorepo:
- Frontend (Vite + React): `assetmanagement/`
- Backend (Java microservices): `services/` (+ `docker-compose.yml` for local/dev)

Note: deploying Kafka + multiple Spring Boot services on serverless-only platforms is not trivial. The most production-like path is a small VPS with Docker Compose.

---

## 1) Frontend deploy (Vercel) - `assetmanagement/`

### UZ
1. Vercel -> New Project -> GitHub repo-ni tanlang.
2. Root Directory: `assetmanagement`
3. Build Command: `npm run build`
4. Output Directory: `dist`
5. Environment Variables (Project Settings -> Environment Variables):
   - `VITE_IDENTITY_API` = `https://<your-identity-service>`
   - `VITE_ASSET_API` = `https://<your-asset-service>`
   - `VITE_AUDIT_API` = `https://<your-audit-service>`
   - `VITE_QR_API` = `https://<your-qr-service>`
   - `VITE_ANALYTICS_API` = `https://<your-analytics-service>`
6. Deploy qiling.

SPA routing (React Router) uchun `assetmanagement/vercel.json` qo'shilgan.

### EN
1. Vercel -> New Project -> select the GitHub repo.
2. Root Directory: `assetmanagement`
3. Build Command: `npm run build`
4. Output Directory: `dist`
5. Set env vars: `VITE_IDENTITY_API`, `VITE_ASSET_API`, `VITE_AUDIT_API`, `VITE_QR_API`, `VITE_ANALYTICS_API`
6. Deploy.

---

## 2) Frontend deploy (Cloudflare Pages) - `assetmanagement/`

### UZ
1. Cloudflare Pages -> Create a project -> GitHub repo.
2. Root directory: `assetmanagement`
3. Build command: `npm run build`
4. Build output directory: `dist`
5. Env vars-ni yuqoridagi kabi qo'ying (`VITE_*`).
6. Deploy.

SPA routing uchun `assetmanagement/public/_redirects` qo'shilgan.

### EN
Same as above (Root: `assetmanagement`, build: `npm run build`, output: `dist`), and set `VITE_*` env vars.

---

## 3) Backend deploy - recommended options

### UZ (amaliy)
Kafka + Zookeeper + bir nechta servislarni Railway kabi platformalarda bitta joyda boshqarish qiyinroq.
Eng amaliy variantlar:

Variant A (tavsiya): VPS + Docker Compose
- Ubuntu VPS oling (Hetzner/DO/AWS).
- Repo clone qiling.
- `.env` yarating (JWT secret, DB creds, Telegram token).
- `docker compose up -d --build`
- Frontend-ni Vercel/Cloudflare-da, backend-ni VPS-da ishlating.
- Batafsil: `docs/vps-docker-compose.md`

Variant B: Railway (services) + managed Kafka
- Railway-ga PostgreSQL va Redis qo'shing.
- Kafka uchun managed provider ishlating (Confluent Cloud / Redpanda Cloud va h.k.).
- Har bir Spring Boot servisni Railway-da alohida deploy qiling (Dockerfile orqali).
- Har servisga env vars:
  - `DB_URL`, `DB_USER`, `DB_PASS`
  - `KAFKA_BOOTSTRAP`
  - `JWT_SECRET`
  - `CORS_ALLOWED_ORIGINS=https://<your-frontend-domain>`
  - `REDIS_HOST`, `REDIS_PORT` (telegram-service uchun)
  - `TELEGRAM_BOT_TOKEN` (telegram-service uchun)

### EN
Railway is great for Postgres/Redis + containerized apps, but hosting Kafka is the main complexity.
Recommended:
- Frontend on Vercel/Cloudflare Pages
- Backend on a small VPS with Docker Compose, or Railway for services + managed Kafka.

---

## 4) CORS (important)

### UZ
Frontend domeni o'zgarsa, barcha backend servislar uchun:
- `CORS_ALLOWED_ORIGINS=https://your-frontend-domain`
ni moslab qo'ying.

### EN
Set `CORS_ALLOWED_ORIGINS=https://your-frontend-domain` on all backend services.

---

## 5) Stable domain for local backend (Cloudflare Tunnel)

### UZ (tavsiya)
Quick tunnel (`trycloudflare.com`) URL o'zgarib turadi. Domeningiz bo'lsa (`api.tahlilchi.uz` kabi), **stable** tunnel qiling:

1. Cloudflare -> **Zero Trust** -> Networks -> Tunnels -> Create tunnel -> token oling.
2. Tunnel ichida **Public Hostname** qo'shing:
   - Hostname: `api.<domeningiz>`
   - Service: `http://localhost:18080` (bu repo'dagi `api-gateway`)
3. Lokal `.env` ga qo'ying:
   - `CLOUDFLARED_TOKEN=...`
4. Ishga tushirish:
   - `docker compose -f docker-compose.yml -f docker-compose.tunnel.yml -f docker-compose.cloudflare.yml up -d --build`

### EN
Use a named Cloudflare Tunnel (stable hostname) instead of quick tunnels:
1. Create tunnel in Zero Trust and copy token.
2. Add Public Hostname `api.<your-domain>` -> `http://localhost:18080` (repo gateway).
3. Set `CLOUDFLARED_TOKEN` in local `.env`.
4. Run: `docker compose -f docker-compose.yml -f docker-compose.tunnel.yml -f docker-compose.cloudflare.yml up -d --build`

# Deployment guide (UZ / EN)

This repository is a **monorepo**:
- Frontend (Vite + React): `assetmanagement/`
- Backend (Java microservices): `services/` (+ `docker-compose.yml` for local/dev)

> Note: deploying **Kafka + multiple Spring Boot services** on “serverless-only” platforms is not trivial. The cleanest production-like path is a small VPS with Docker Compose.  
> Below are practical options for Vercel / Cloudflare Pages / Railway.

---

## 1) Frontend deploy (Vercel) — `assetmanagement/`

### UZ
1. Vercel → **New Project** → GitHub repo’ni tanlang.
2. **Root Directory**: `assetmanagement`
3. **Build Command**: `npm run build`
4. **Output Directory**: `dist`
5. **Environment Variables** (Vercel Project Settings → Environment Variables):
   - `VITE_IDENTITY_API` = `https://<your-identity-service>`
   - `VITE_ASSET_API` = `https://<your-asset-service>`
   - `VITE_AUDIT_API` = `https://<your-audit-service>`
   - `VITE_QR_API` = `https://<your-qr-service>`
   - `VITE_ANALYTICS_API` = `https://<your-analytics-service>`
6. Deploy qiling.

SPA routing (React Router) uchun `assetmanagement/vercel.json` qo‘shilgan.

### EN
1. Vercel → **New Project** → select the GitHub repo.
2. **Root Directory**: `assetmanagement`
3. **Build Command**: `npm run build`
4. **Output Directory**: `dist`
5. Set env vars:
   - `VITE_IDENTITY_API`, `VITE_ASSET_API`, `VITE_AUDIT_API`, `VITE_QR_API`, `VITE_ANALYTICS_API`
6. Deploy.

---

## 2) Frontend deploy (Cloudflare Pages) — `assetmanagement/`

### UZ
1. Cloudflare Pages → **Create a project** → GitHub repo.
2. **Root directory**: `assetmanagement`
3. **Build command**: `npm run build`
4. **Build output directory**: `dist`
5. Env vars’larni yuqoridagi kabi qo‘ying (`VITE_*`).
6. Deploy.

SPA routing uchun `assetmanagement/public/_redirects` qo‘shilgan.

### EN
Same as above (Root: `assetmanagement`, build: `npm run build`, output: `dist`), and set `VITE_*` environment variables.

---

## 3) Backend deploy (Railway) — realistic approach

### UZ (amaliy)
Railway’da **to‘liq docker-compose (Kafka+Zookeeper+services)**’ni bitta joyda ko‘tarish qiyin.
Eng amaliy variantlar:

**Variant A (tavsiya): VPS + Docker Compose**
- Ubuntu VPS oling (Hetzner/DO/AWS).
- Repo clone qiling.
- `.env` yarating (JWT secret, DB creds, Telegram token).
- `docker compose up -d --build`
- Frontend’ni Vercel/Cloudflare’da, backend’ni VPS’da ishlating.

**Variant B: Railway (services) + Managed Kafka**
- Railway’ga PostgreSQL va Redis qo‘shing.
- Kafka uchun managed provider ishlating (masalan, Confluent Cloud/Upstash Kafka/Redpanda Cloud).
- Har bir Spring Boot servisni Railway’da alohida “Service” sifatida deploy qiling (Dockerfile orqali).
- Har servisga env vars:
  - `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD`
  - `SPRING_KAFKA_BOOTSTRAP_SERVERS`
  - `JWT_SECRET`
  - `APP_CORS_ALLOWED_ORIGINS` = `https://<your-frontend-domain>`
  - `REDIS_HOST`, `REDIS_PORT` (telegram-service uchun)
  - `TELEGRAM_BOT_TOKEN` (telegram-service uchun)

### EN
Railway is great for **Postgres/Redis + containerized apps**, but hosting **Kafka** there is the main complexity.
Recommended:
- Frontend on Vercel/Cloudflare Pages
- Backend on a small VPS with Docker Compose **or**
- Railway for services + managed Kafka provider

---

## 4) CORS (important)

### UZ
Frontend domeni o‘zgarsa, barcha backend servislar uchun:
- `APP_CORS_ALLOWED_ORIGINS=https://your-frontend-domain`
ni moslab qo‘ying.

### EN
Set `APP_CORS_ALLOWED_ORIGINS=https://your-frontend-domain` on all backend services.


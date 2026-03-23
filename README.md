# SmartBanking / Smart Office Platform

Microservice-based platform (Java 17 + Spring Boot + PostgreSQL + Kafka + Redis) focused on **bank office asset management** (lifecycle, assignment, QR, audit, analytics).

## Project layout (split)

- Backend (microservices + infra): `services/`, `shared/`, `infra/`, `docker-compose.yml`
- Frontend (admin UI): `assetmanagement/`

## Backend quick start (Docker)

1. Start infrastructure + services:
   - `docker compose up --build -d`
   - If `docker` is not recognized in PowerShell:
     - `& 'C:\Program Files\Docker\Docker\resources\bin\docker.exe' compose up --build -d`
2. Login (first admin is auto-created on first start):
   - 
   - Configure via `.env`: `BOOTSTRAP_ADMIN_USERNAME`, `BOOTSTRAP_ADMIN_PASSWORD`, `BOOTSTRAP_ADMIN_FULL_NAME`

### Forgot admin password (no DB reset)
If DB already has users and you forgot the admin password:
1. Set `.env`: `BOOTSTRAP_ADMIN_RESET=true` + new `BOOTSTRAP_ADMIN_PASSWORD`
2. Restart identity-service: `docker compose restart identity-service`
3. Login, then set `BOOTSTRAP_ADMIN_RESET=false` again.

## API docs (Swagger / OpenAPI)

Open in browser:
- Identity: `http://localhost:8081/swagger-ui/index.html` (OpenAPI JSON: `http://localhost:8081/v3/api-docs`)
- Asset: `http://localhost:8082/swagger-ui/index.html` (OpenAPI JSON: `http://localhost:8082/v3/api-docs`)
- Audit: `http://localhost:8083/swagger-ui/index.html` (OpenAPI JSON: `http://localhost:8083/v3/api-docs`)
- QR: `http://localhost:8084/swagger-ui/index.html` (OpenAPI JSON: `http://localhost:8084/v3/api-docs`)
- Analytics: `http://localhost:8085/swagger-ui/index.html` (OpenAPI JSON: `http://localhost:8085/v3/api-docs`)

## Frontend quick start (Node.js)

1. Start UI:
   - `cd assetmanagement`
   - `copy .env.example .env` (Windows) or `cp .env.example .env`
   - `npm install`
   - `npm run dev`
2. Open UI:
   - `http://localhost:5173/login`
   - Login: 

## Deployment (Vercel / Cloudflare / Railway)

- See `docs/deployment.md`

## Smoke test

- `powershell -ExecutionPolicy Bypass -File scripts/smoke-test.ps1`

## Telegram bot (Smart_Bankingbot)

This repo includes a Telegram bot integration (`telegram-service`) for:
- assignment notifications (on `AssetAssigned` Kafka event)
- periodic "are your devices working?" checks (default: every 30 days)
- employee asset requests via bot (`/request`)
- admin approval flow for "not working" reports
- new employee signup requests (shown in the admin UI: `Employee requests`)

Setup (do **not** commit the token):

1. Create a root `.env` file and set:
   - `TELEGRAM_BOT_TOKEN=...`
2. Start the bot service:
   - `docker compose up --build -d telegram-service`
   - If `docker` is not recognized in PowerShell:
     - `& 'C:\Program Files\Docker\Docker\resources\bin\docker.exe' compose up --build -d telegram-service`
3. Link an account:
   - When assigning an asset to an EMPLOYEE in the UI, fill `Phone number` + `Telegram username or ID`.
   - The employee must open the bot and press `/start` once (Telegram does not allow bots to message users before that).

Config (optional):
- `TELEGRAM_CHECK_PERIOD_DAYS` (default `30`)
- `TELEGRAM_CHECK_CRON` (default daily at `09:00`, and the service enforces `PERIOD_DAYS` per user)

## Notes

- QR scanner page uses camera (works on `http://localhost`, other hosts may require HTTPS for camera permissions).
- A4 QR print is available from the Assets page (opens a print-friendly tab).

## Disk space (Windows / Docker Desktop)

Docker Desktop stores its Linux disk image on **C:** by default (this can grow when building images).

- Quick cleanup (safe): `docker builder prune -af`
- Move Docker disk image to **D:**: Docker Desktop -> Settings -> Resources -> Advanced -> Disk image location -> choose a folder on `D:\` -> Apply & Restart

## Expose your laptop backend to the internet (Cloudflare quick tunnel)

If your frontend is deployed (e.g. Vercel) and you want to make your **local** backend reachable globally **while your laptop is ON**, you can use a Cloudflare quick tunnel:

1. Start backend + tunnel:
   - `docker compose -f docker-compose.yml -f docker-compose.tunnel.yml up -d --build`
   - Or: `bash scripts/compose-tunnel.sh quick up -d --build`
2. Read the public URL:
   - `docker compose -f docker-compose.yml -f docker-compose.tunnel.yml logs -f cloudflared`
   - Look for a `https://<something>.trycloudflare.com` URL
3. Set Vercel env vars (Asset UI project):
   - `VITE_IDENTITY_API=https://<tunnel>/identity`
   - `VITE_ASSET_API=https://<tunnel>/asset`
   - `VITE_AUDIT_API=https://<tunnel>`
   - `VITE_QR_API=https://<tunnel>`
   - `VITE_ANALYTICS_API=https://<tunnel>`
4. Also update backend CORS (local `.env` used by docker compose):
   - `CORS_ALLOWED_ORIGINS=https://assettracing.vercel.app,http://localhost:5173`

Note: the quick tunnel URL can change if you stop/restart `cloudflared`. For a stable URL, use a real domain with Cloudflare Tunnel.

## Stable domain (Cloudflare Tunnel + your domain)

If you bought a domain (e.g. `tahlilchi.uz`) and want a **stable** backend URL like `https://api.tahlilchi.uz`, use a named tunnel token:

1. Cloudflare -> Zero Trust -> Networks -> Tunnels -> Create tunnel (Cloudflared) -> copy the **token**.
2. Add a Public Hostname in the same tunnel:
   - Hostname: `api.<your-domain>`
   - Service: `http://localhost:18080` (this repo's `api-gateway`)
3. Put the token into your local `.env` (do **not** commit it):
   - `CLOUDFLARED_TOKEN=...`
4. Start backend + tunnel:
   - `docker compose -f docker-compose.yml -f docker-compose.tunnel.yml -f docker-compose.cloudflare.yml up -d --build`
   - Or: `bash scripts/compose-tunnel.sh named up -d --build`

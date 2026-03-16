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
2. Create first admin (only once, when DB is empty):
   - `curl -X POST http://localhost:8081/auth/register -H "Content-Type: application/json" -d "{\"username\":\"admin\",\"password\":\"Admin1234!\",\"fullName\":\"System Admin\"}"`

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
   - Login: `admin` / `Admin1234!`

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

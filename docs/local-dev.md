# Local development

## Prerequisites
- Docker Desktop (recommended) OR Java 17 + Maven

## Docker compose

- Start everything:
  - `docker compose up --build`

If you see: `docker : The term 'docker' is not recognized...`
- Close/reopen PowerShell OR use full path:
  - `& 'C:\Program Files\Docker\Docker\resources\bin\docker.exe' compose up --build`

Services:
- Identity: `http://localhost:8081/swagger-ui/index.html` (OpenAPI: `http://localhost:8081/v3/api-docs`)
- Asset: `http://localhost:8082/swagger-ui/index.html` (OpenAPI: `http://localhost:8082/v3/api-docs`)
- Audit: `http://localhost:8083/swagger-ui/index.html` (OpenAPI: `http://localhost:8083/v3/api-docs`)
- QR: `http://localhost:8084/swagger-ui/index.html` (OpenAPI: `http://localhost:8084/v3/api-docs`)
- Analytics: `http://localhost:8085/swagger-ui/index.html` (OpenAPI: `http://localhost:8085/v3/api-docs`)

## Frontend

Requires Node.js.

```
cd assetmanagement
cp .env.example .env
npm install
npm run dev
```

UI: `http://localhost:5173`

Notes:
- QR Scanner uses the device camera on `http://localhost` (other hosts may require HTTPS).
- A4 QR print is available in Assets page (opens a print-friendly tab).

## First login (create ADMIN once)

Registration works only when the users table is empty.

```bash
curl -s -X POST http://localhost:8081/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin1234!","fullName":"System Admin"}'
```

Then login in the UI with:
- username: `admin`
- password: `Admin1234!`

## Smoke test

Runs a quick end-to-end validation (identity -> asset -> kafka outbox -> audit/analytics -> QR):

```
powershell -ExecutionPolicy Bypass -File scripts/smoke-test.ps1
```

## Sample data

- After services are up (migrations applied), seed sample assets:
  - `psql -h localhost -U smartbanking -d asset_db -f infra/sample-data/asset_db.sql`

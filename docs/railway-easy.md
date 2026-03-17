# Railway deploy (easy mode) - no Kafka (UZ / EN)

This guide deploys the **core** backend to Railway with the least moving parts:
- `identity-service` (auth/users)
- `asset-service` (assets + requests)
- `qr-service` (QR token + QR view)

Optional:
- `telegram-service` (bot polling + checks). Kafka-based notifications can be disabled.

Kafka-driven services (`audit-service`, `inventory-analytics-service`) are optional in this "easy mode".

---

## UZ - Eng oson yo'l (Kafka'siz)

### 1) Railway'da infra qo'shing
Railway Project ichida:
- Add -> Database -> **PostgreSQL**
- Add -> Database -> **Redis**

### 2) Postgres schema'larni yarating (1 marta)
Railway -> Postgres -> Query/Console:
```sql
CREATE SCHEMA IF NOT EXISTS identity;
CREATE SCHEMA IF NOT EXISTS asset;
CREATE SCHEMA IF NOT EXISTS audit;
CREATE SCHEMA IF NOT EXISTS analytics;
```

### 3) Servislarni Railway'ga deploy qiling (Dockerfile)
Har bir servis uchun: Add Service -> GitHub Repo -> `smartbanking`

Build settings:
- Builder: **Dockerfile**
- Build context: repo root (`/`)
- Dockerfile path:
  - `services/identity-service/Dockerfile`
  - `services/asset-service/Dockerfile`
  - `services/qr-service/Dockerfile`

### 4) ENV sozlash (muhim)
Hamma servislar uchun:
- `JWT_SECRET` = kuchli secret (hammasida bir xil)
- `CORS_ALLOWED_ORIGINS` = `https://<frontend-domain>`

`identity-service`:
- `DB_URL=jdbc:postgresql://<host>:<port>/<db>?sslmode=require&currentSchema=identity`
- `DB_USER=<user>`
- `DB_PASS=<pass>`
- `SPRING_FLYWAY_SCHEMAS=identity`
- `SPRING_FLYWAY_TABLE=flyway_identity`
- (birinchi admin uchun ixtiyoriy)
  - `BOOTSTRAP_ADMIN_USERNAME=admin`
  - `BOOTSTRAP_ADMIN_PASSWORD=Admin1234!`
  - `BOOTSTRAP_ADMIN_FULL_NAME=System Admin`

`asset-service`:
- `DB_URL=...&currentSchema=asset`
- `DB_USER`, `DB_PASS`
- `SPRING_FLYWAY_SCHEMAS=asset`
- `SPRING_FLYWAY_TABLE=flyway_asset`
- `REDIS_HOST=<redis-host>`
- `REDIS_PORT=<redis-port>`
- Kafka'siz ishlashi uchun:
  - `OUTBOX_PUBLISHER_ENABLED=false`

`qr-service`:
- `REDIS_HOST`, `REDIS_PORT`
- `QR_SECRET=<strong-secret>`
- `ASSET_API_BASE=https://<asset-service-public-url>`
- `IDENTITY_API_BASE=https://<identity-service-public-url>`
- `QR_PAYLOAD_BASE_URL=https://<frontend-domain>/scanner`

### 5) (Ixtiyoriy) telegram-service (Kafka'siz)
Deploy: `services/telegram-service/Dockerfile`

ENV:
- `TELEGRAM_BOT_TOKEN=...`
- `REDIS_HOST`, `REDIS_PORT`
- `IDENTITY_API_BASE=https://<identity-url>`
- `ASSET_API_BASE=https://<asset-url>`
- Kafka listeners'ni o'chirish:
  - `KAFKA_LISTENERS_ENABLED=false`

### 6) Tekshirish
- `identity-service`: `https://<identity>/actuator/health`
- `asset-service`: `https://<asset>/actuator/health`
- `qr-service`: `https://<qr>/actuator/health`

Swagger:
- `https://<identity>/swagger-ui/index.html`
- `https://<asset>/swagger-ui/index.html`
- `https://<qr>/swagger-ui/index.html`

---

## EN - Easy mode (without Kafka)

### 1) Add infra
Inside your Railway project:
- Add -> Database -> **PostgreSQL**
- Add -> Database -> **Redis**

### 2) Create schemas (once)
Railway -> Postgres -> Query/Console:
```sql
CREATE SCHEMA IF NOT EXISTS identity;
CREATE SCHEMA IF NOT EXISTS asset;
CREATE SCHEMA IF NOT EXISTS audit;
CREATE SCHEMA IF NOT EXISTS analytics;
```

### 3) Deploy services (Dockerfile)
Add each service from the GitHub repo (`smartbanking`), using Dockerfile builds:
- Build context: repo root (`/`)
- Dockerfile paths:
  - `services/identity-service/Dockerfile`
  - `services/asset-service/Dockerfile`
  - `services/qr-service/Dockerfile`

### 4) Environment variables
All services:
- `JWT_SECRET` (same value everywhere)
- `CORS_ALLOWED_ORIGINS=https://<frontend-domain>`

`identity-service`:
- `DB_URL=jdbc:postgresql://<host>:<port>/<db>?sslmode=require&currentSchema=identity`
- `DB_USER`, `DB_PASS`
- `SPRING_FLYWAY_SCHEMAS=identity`
- `SPRING_FLYWAY_TABLE=flyway_identity`
- Optional first admin bootstrap: `BOOTSTRAP_ADMIN_*`

`asset-service`:
- `DB_URL=...currentSchema=asset`
- `DB_USER`, `DB_PASS`
- `SPRING_FLYWAY_SCHEMAS=asset`
- `SPRING_FLYWAY_TABLE=flyway_asset`
- `REDIS_HOST`, `REDIS_PORT`
- Disable Kafka outbox publisher:
  - `OUTBOX_PUBLISHER_ENABLED=false`

`qr-service`:
- `REDIS_HOST`, `REDIS_PORT`
- `QR_SECRET`
- `ASSET_API_BASE`, `IDENTITY_API_BASE`
- `QR_PAYLOAD_BASE_URL=https://<frontend-domain>/scanner`

Optional `telegram-service` (no Kafka):
- `KAFKA_LISTENERS_ENABLED=false`

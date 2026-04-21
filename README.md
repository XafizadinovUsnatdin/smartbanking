# SmartBanking / Smart Office Platform

Bank ofisi uchun **aktivlarni boshqarish** platformasi: aktiv hayotiy sikli, biriktirish, QR, audit va analitika.
<img width="1778" height="930" alt="image" src="https://github.com/user-attachments/assets/3a9beb35-6dd5-4c45-94c7-e0a144fe5564" />

<img width="1280" height="642" alt="image" src="https://github.com/user-attachments/assets/20f60640-8027-4b39-af1d-8896587562b8" />

## Loyihaning tuzilishi

- Backend (mikroservislar + infra): `services/`, `shared/`, `infra/`, `docker-compose.yml`
- Frontend (admin UI): `assetmanagement/`

## Tezkor ishga tushirish (Docker)

Talablar: Docker Desktop.

1. Servislarni ishga tushiring:
   - `docker compose up --build -d`
   - Agar PowerShell'da `docker` topilmasa:
     - `& 'C:\Program Files\Docker\Docker\resources\bin\docker.exe' compose up --build -d`

Eslatma: maxfiy sozlamalar (token/parol/kalitlar) uchun lokal `.env` ishlatiladi - ularni Git'ga qo'shmang.

## API hujjatlari (Swagger / OpenAPI)

Brauzerda oching:
- Identity: `http://localhost:8081/swagger-ui/index.html` (OpenAPI JSON: `http://localhost:8081/v3/api-docs`)
- Asset: `http://localhost:8082/swagger-ui/index.html` (OpenAPI JSON: `http://localhost:8082/v3/api-docs`)
- Audit: `http://localhost:8083/swagger-ui/index.html` (OpenAPI JSON: `http://localhost:8083/v3/api-docs`)
- QR: `http://localhost:8084/swagger-ui/index.html` (OpenAPI JSON: `http://localhost:8084/v3/api-docs`)
- Analytics: `http://localhost:8085/swagger-ui/index.html` (OpenAPI JSON: `http://localhost:8085/v3/api-docs`)

## Frontend (Admin UI) - tezkor ishga tushirish

Talablar: Node.js.

1. UI'ni ishga tushiring:
   - `cd assetmanagement`
   - `copy .env.example .env` (Windows) yoki `cp .env.example .env`
   - `npm install`
   - `npm run dev`
2. UI manzili:
   - `http://localhost:5173/login`

## Deploy (Vercel / Cloudflare / Railway)

- `docs/deployment.md` ga qarang.

## Smoke test

- `powershell -ExecutionPolicy Bypass -File scripts/smoke-test.ps1`

## Telegram bot

Bu repoda Telegram bot integratsiyasi (`telegram-service`) bor:
- aktiv biriktirilganda xabarnoma (`AssetAssigned` Kafka hodisasi)
- davriy "qurilmalar ishlayaptimi?" tekshiruvi
- xodimlar uchun aktiv so'rovi (`/request`)
- "ishlamayapti" xabarlari uchun admin tasdiqlash oqimi
- yangi xodim ro'yxatdan o'tish so'rovlari (admin UI'da: `Employee requests`)

Sozlash:
1. Root `.env` ga bot tokenini kiriting (env: `TELEGRAM_BOT_TOKEN`). Tokenni Git'ga qo'shmang.
2. Bot servisini ishga tushiring:
   - `docker compose up --build -d telegram-service`
   - Agar PowerShell'da `docker` topilmasa:
     - `& 'C:\Program Files\Docker\Docker\resources\bin\docker.exe' compose up --build -d telegram-service`
3. Hisobni bog'lash:
   - UI'da aktivni EMPLOYEEga biriktirganda `Phone number` va `Telegram username or ID` maydonlarini to'ldiring.
   - Xodim botni ochib kamida bir marta `/start` bosishi kerak (Telegram qoidasi).

Qo'shimcha sozlamalar:
- `TELEGRAM_CHECK_PERIOD_DAYS`
- `TELEGRAM_CHECK_CRON`

## Eslatmalar

- QR skaner sahifasi kamera ishlatadi (`http://localhost` da ishlaydi; boshqa hostlarda kamera uchun HTTPS talab qilinishi mumkin).
- Aktivlar sahifasidan A4 formatdagi QR print mavjud (print-friendly tab ochiladi).

## Disk maydoni (Windows / Docker Desktop)

Docker Desktop odatda Linux disk image'ini **C:** ga saqlaydi (image build paytida hajm oshishi mumkin).

- Tezkor tozalash (xavfsiz): `docker builder prune -af`
- Disk image'ni **D:** ga ko'chirish: Docker Desktop -> Settings -> Resources -> Advanced -> Disk image location -> `D:\...` -> Apply & Restart


1. Cloudflare Zero Trust'da tunnel yarating va token oling.
2. Tunnel ichida Public Hostname qo'shing:
   - Hostname: `api.<your-domain>`
   - Service: `http://localhost:18080` (bu repodagi `api-gateway`)
3. Tokenni lokal `.env` ga kiriting (env: `CLOUDFLARED_TOKEN`) va Git'ga qo'shmang.
4. Backend + tunnel'ni ishga tushiring:
   - `docker compose -f docker-compose.yml -f docker-compose.tunnel.yml -f docker-compose.cloudflare.yml up -d --build`
   - Yoki: `bash scripts/compose-tunnel.sh named up -d --build`

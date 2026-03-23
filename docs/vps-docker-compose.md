# VPS + Docker Compose deployment (UZ / EN)

If you want **24/7** and the least headaches for multiple Java services + Postgres + Kafka + Redis, the most practical option is:

- Frontend: **Cloudflare Pages** (or Vercel)
- Backend: **1 VPS** with **Docker Compose**
- Optional: put the VPS behind **Cloudflare** (DNS + HTTPS + WAF)

---

## UZ

### A) Noutbukda (demo) + Cloudflare Tunnel (VPS'siz)
Bu usul tez, lekin **24/7 kafolat yo'q** (noutbuk o'chsa yoki internet uzilsa - hammasi to'xtaydi).

1. Lokal backend'ni ko'taring:
   - `cd D:\SmartBanking`
   - `docker compose up -d --build`
2. Lokal frontend'ni ko'taring:
   - `cd assetmanagement`
   - `npm install`
   - `npm run dev`
3. Internetga chiqarish uchun Cloudflare Tunnel ishlating (cloudflared):
   - Cloudflare account + domain bo'lsa: tunnel yaratib `localhost:5173` va API portlarni (`8081..8086`) subdomainlarga bog'laysiz.
   - Tunnel bor bo'lsa, router'da port ochish shart emas.

Izoh: QR skaner kamera ruxsati uchun odatda **HTTPS** kerak (localhost bundan mustasno). Tunnel bu muammoni hal qiladi.

### B) VPS (tavsiya) - 24/7
Noutbuk 24/7 server bo'la olmaydi. 24/7 uchun VPS kerak.

#### 1) VPS tayyorlash
- Ubuntu 22.04/24.04 VPS oling (kamida: 2 vCPU / 4GB RAM tavsiya).
- Domain bo'lsa yaxshi (Cloudflare DNS'ga ulaysiz).

#### 2) SSH bilan kirish
Kompyuteringizdan:
- `ssh root@<VPS_IP>`

#### 3) Docker o'rnatish (Ubuntu)
VPS ichida:
```bash
curl -fsSL https://get.docker.com | sh
apt-get install -y docker-compose-plugin git
```

#### 4) Loyihani yuklash va ishga tushirish
```bash
git clone https://github.com/XafizadinovUsnatdin/smartbanking.git
cd smartbanking
```

VPS uchun 2 xil qulay usul bor:

Variant 1 (subdomain-based): `docker-compose.vps.yml`
- faqat **80/443** portlar ochiq bo'ladi
- Caddy avtomatik **HTTPS** qiladi (domain kerak)
- UI (assetmanagement) ham VPS'da ishlaydi: `https://app.<domain>`
- API servislar subdomainlarda: `identity.<domain>`, `asset.<domain>` va h.k.

Variant 2 (gateway, Vercel uchun qulay): `docker-compose.vps.gateway.yml`
- faqat **80/443** portlar ochiq
- Bitta API domen: `https://smartbanking-api.<domain>`
- Frontend Vercel/Cloudflare Pages'da bo'lsa ham, `VITE_*` env'lar oson bo'ladi:
  - `VITE_IDENTITY_API=https://smartbanking-api.<domain>/identity`
  - `VITE_ASSET_API=https://smartbanking-api.<domain>/asset`
  - `VITE_AUDIT_API=https://smartbanking-api.<domain>`
  - `VITE_QR_API=https://smartbanking-api.<domain>`
  - `VITE_ANALYTICS_API=https://smartbanking-api.<domain>`

`TELEGRAM_BOT_TOKEN` va boshqa secret'lar uchun `.env` yarating (git'ga qo'shmang):
```bash
nano .env
```

Minimal `.env` namunasi:
```env
PUBLIC_DOMAIN=example.com
CADDY_EMAIL=admin@example.com

JWT_SECRET=change-this-to-a-strong-random-32+chars
QR_SECRET=change-this-to-a-strong-random-32+chars

# Frontend origin (CORS)
CORS_ALLOWED_ORIGINS=https://app.example.com,https://smartbanking.example.com

# QR payload opens the public QR view with token
QR_PAYLOAD_BASE_URL=https://smartbanking.example.com

# Optional
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHECK_PERIOD_DAYS=30
```

So'ng ishga tushiring (Variant 1):
```bash
docker compose -f docker-compose.yml -f docker-compose.vps.yml up -d --build
docker compose ps
```

Yoki (Variant 2, gateway):
```bash
docker compose -f docker-compose.yml -f docker-compose.vps.gateway.yml up -d --build
docker compose ps
```

#### 5) HTTPS + Cloudflare (eng to'g'ri yo'l)
Bu variantda Caddy allaqachon bor va 80/443 ishlatadi.

Cloudflare DNS:
- `A` record: `app`, `identity`, `asset`, `audit`, `qr`, `analytics` -> VPS IP
- Proxy (orange cloud) ON bo'lsa ham bo'ladi.

#### 6) Lokal Docker DB'ni VPS'ga ko'chirish (ixtiyoriy)
Eslatma: VPS'dagi Postgres **yangi** bo'ladi. Laptop'dagi DB avtomatik ko'chmaydi.

**A) Laptop (Windows) - dump olish**
1) `D:\SmartBanking` ichida:
```powershell
cd D:\SmartBanking
docker compose up -d postgres
New-Item -ItemType Directory -Force backups | Out-Null

docker compose exec -T postgres pg_dump -U smartbanking -d identity_db   -Fc -f /tmp/identity_db.dump
docker compose exec -T postgres pg_dump -U smartbanking -d asset_db      -Fc -f /tmp/asset_db.dump
docker compose exec -T postgres pg_dump -U smartbanking -d audit_db      -Fc -f /tmp/audit_db.dump
docker compose exec -T postgres pg_dump -U smartbanking -d analytics_db  -Fc -f /tmp/analytics_db.dump

docker compose cp postgres:/tmp/identity_db.dump  backups/identity_db.dump
docker compose cp postgres:/tmp/asset_db.dump     backups/asset_db.dump
docker compose cp postgres:/tmp/audit_db.dump     backups/audit_db.dump
docker compose cp postgres:/tmp/analytics_db.dump backups/analytics_db.dump
```

2) Agar asset rasmlari bor bo'lsa (muhim):
   - Laptop: `D:\SmartBanking\.data\asset-photos\`
   - VPS: `/opt/smartbanking/.data/asset-photos/` ga ko'chiring.

**B) Laptop -> VPS (upload)**
```powershell
scp .\backups\*.dump root@<VPS_IP>:/opt/smartbanking/backups/
scp -r .\.data\asset-photos root@<VPS_IP>:/opt/smartbanking/.data/
```

**C) VPS - restore**
```bash
cd /opt/smartbanking
mkdir -p backups

# App servislarni to'xtatib turamiz (Postgres ishlasin)
docker compose -f docker-compose.yml -f docker-compose.tunnel.yml -f docker-compose.cloudflare.yml stop \
  identity-service asset-service audit-service qr-service inventory-analytics-service telegram-service \
  kafka zookeeper redis api-gateway cloudflared

# Restore (DB ichidagi obyektlarni tozalab, laptop'dagi holatni tiklaydi)
cat backups/identity_db.dump  | docker compose -f docker-compose.yml -f docker-compose.tunnel.yml -f docker-compose.cloudflare.yml exec -T postgres pg_restore -U smartbanking -d identity_db  --clean --if-exists --no-owner --no-privileges
cat backups/asset_db.dump     | docker compose -f docker-compose.yml -f docker-compose.tunnel.yml -f docker-compose.cloudflare.yml exec -T postgres pg_restore -U smartbanking -d asset_db     --clean --if-exists --no-owner --no-privileges
cat backups/audit_db.dump     | docker compose -f docker-compose.yml -f docker-compose.tunnel.yml -f docker-compose.cloudflare.yml exec -T postgres pg_restore -U smartbanking -d audit_db     --clean --if-exists --no-owner --no-privileges
cat backups/analytics_db.dump | docker compose -f docker-compose.yml -f docker-compose.tunnel.yml -f docker-compose.cloudflare.yml exec -T postgres pg_restore -U smartbanking -d analytics_db --clean --if-exists --no-owner --no-privileges

# Hammasini qayta ko'taramiz
docker compose -f docker-compose.yml -f docker-compose.tunnel.yml -f docker-compose.cloudflare.yml up -d --build
```

---

## EN

### A) Laptop demo + Cloudflare Tunnel (no VPS)
Fast, but **not reliable 24/7** (if the laptop sleeps/offline - the system is down).

1. Start backend locally: `docker compose up -d --build`
2. Start UI locally: `cd assetmanagement && npm install && npm run dev`
3. Use **Cloudflare Tunnel** (`cloudflared`) to expose:
   - UI (`localhost:5173`)
   - API ports (`8081..8086`) via subdomains (no router port-forwarding)

### B) VPS (recommended) - 24/7

1. Create an Ubuntu VPS (2 vCPU / 4GB RAM recommended).
2. SSH: `ssh root@<VPS_IP>`
3. Install Docker:
```bash
curl -fsSL https://get.docker.com | sh
apt-get install -y docker-compose-plugin git
```
4. Deploy:
```bash
git clone https://github.com/XafizadinovUsnatdin/smartbanking.git
cd smartbanking
nano .env
docker compose -f docker-compose.yml -f docker-compose.vps.yml up -d --build
```
5. This setup already includes **Caddy** (HTTPS on 80/443). Point your DNS (`app`, `identity`, `asset`, `audit`, `qr`, `analytics`) to the VPS IP.


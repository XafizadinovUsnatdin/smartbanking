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

VPS uchun tavsiya etilgan ishga tushirish usuli: `docker-compose.vps.yml`
- faqat **80/443** portlar ochiq bo'ladi
- Caddy avtomatik **HTTPS** qiladi (domain kerak)
- UI (assetmanagement) ham VPS'da ishlaydi: `https://app.<domain>`

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
CORS_ALLOWED_ORIGINS=https://app.example.com

# QR payload opens the scanner page with token
QR_PAYLOAD_BASE_URL=https://app.example.com

# Optional
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHECK_PERIOD_DAYS=30
```

So'ng ishga tushiring:
```bash
docker compose -f docker-compose.yml -f docker-compose.vps.yml up -d --build
docker compose ps
```

#### 5) HTTPS + Cloudflare (eng to'g'ri yo'l)
Bu variantda Caddy allaqachon bor va 80/443 ishlatadi.

Cloudflare DNS:
- `A` record: `app`, `identity`, `asset`, `audit`, `qr`, `analytics` -> VPS IP
- Proxy (orange cloud) ON bo'lsa ham bo'ladi.

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

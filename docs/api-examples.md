# API examples (dev)

## 1) Create first admin (only when users table is empty)

```bash
curl -s -X POST http://localhost:8081/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin1234!","fullName":"System Admin"}'
```

## 2) Login

```bash
ACCESS=$(curl -s -X POST http://localhost:8081/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin1234!"}' | jq -r .accessToken)
echo $ACCESS
```

## 3) Create an asset

```bash
curl -s -X POST http://localhost:8082/assets \
  -H "Authorization: Bearer $ACCESS" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Dell Latitude 5440",
    "type":"LAPTOP",
    "categoryCode":"IT",
    "serialNumber":"SN-0001",
    "inventoryTag":"INV-0001",
    "model":"5440",
    "vendor":"Dell"
  }'
```

## 4) Generate QR token (QR service)

```bash
curl -s -X POST http://localhost:8084/qr/assets/<ASSET_UUID> \
  -H "Authorization: Bearer $ACCESS"
```

## 5) Lookup by QR token

```bash
curl -s http://localhost:8084/qr/<TOKEN> \
  -H "Authorization: Bearer $ACCESS"
```

## 6) QR "view" (asset + current owner + photos)

```bash
curl -s http://localhost:8084/qr/<TOKEN>/view \
  -H "Authorization: Bearer $ACCESS"
```

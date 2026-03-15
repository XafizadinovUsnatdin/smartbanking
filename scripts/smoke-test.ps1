param(
  [switch]$Build,
  [string]$AdminUsername = "admin",
  [string]$AdminPassword = "Admin1234!",
  [string]$AdminFullName = "System Admin"
)

$ErrorActionPreference = "Stop"

function Wait-HttpOk {
  param(
    [Parameter(Mandatory = $true)][string]$Url,
    [int]$TimeoutSeconds = 120
  )
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    try {
      $resp = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
      if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 300) {
        return
      }
    } catch {}
    Start-Sleep -Seconds 2
  }
  throw "Timeout waiting for $Url"
}

function Decode-JwtPayload {
  param([Parameter(Mandatory = $true)][string]$Jwt)
  $parts = $Jwt.Split(".")
  if ($parts.Count -lt 2) {
    throw "Invalid JWT"
  }
  $payload = $parts[1].Replace("-", "+").Replace("_", "/")
  switch ($payload.Length % 4) {
    2 { $payload += "==" }
    3 { $payload += "=" }
  }
  $bytes = [Convert]::FromBase64String($payload)
  $json = [Text.Encoding]::UTF8.GetString($bytes)
  return $json | ConvertFrom-Json
}

$root = Split-Path -Parent $PSScriptRoot
Push-Location $root
try {
  $dockerCmd = $null
  try {
    $dockerCmd = (Get-Command docker -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty Source)
  } catch {}
  if (-not $dockerCmd) {
    $fallback = "C:\Program Files\Docker\Docker\resources\bin\docker.exe"
    if (Test-Path $fallback) { $dockerCmd = $fallback }
  }
  if (-not $dockerCmd) {
    throw "docker command not found. Install Docker Desktop or add docker to PATH."
  }

  $oldEap = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  if ($Build) {
    & $dockerCmd compose up --build -d 2>$null | Out-Null
  } else {
    & $dockerCmd compose up -d 2>$null | Out-Null
  }
  $ErrorActionPreference = $oldEap
  if ($LASTEXITCODE -ne 0) {
    throw "docker compose up failed with exit code $LASTEXITCODE"
  }

  Wait-HttpOk -Url "http://localhost:8081/actuator/health"
  Wait-HttpOk -Url "http://localhost:8082/actuator/health"
  Wait-HttpOk -Url "http://localhost:8083/actuator/health"
  Wait-HttpOk -Url "http://localhost:8084/actuator/health"
  Wait-HttpOk -Url "http://localhost:8085/actuator/health"

  $registerBody = @{ username = $AdminUsername; password = $AdminPassword; fullName = $AdminFullName } | ConvertTo-Json
  try {
    Invoke-RestMethod -Method Post -Uri "http://localhost:8081/auth/register" -ContentType "application/json" -Body $registerBody | Out-Null
    Write-Host "Admin registered: $AdminUsername"
  } catch {
    Write-Host "Admin register skipped (already initialized)."
  }

  $loginBody = @{ username = $AdminUsername; password = $AdminPassword } | ConvertTo-Json
  $tokens = Invoke-RestMethod -Method Post -Uri "http://localhost:8081/auth/login" -ContentType "application/json" -Body $loginBody
  $access = $tokens.accessToken
  $claims = Decode-JwtPayload -Jwt $access
  $adminId = $claims.sub

  $headers = @{ Authorization = "Bearer $access" }

  # Create a dedicated EMPLOYEE owner for this run to keep inventory expectations isolated
  $empUser = @{
    username = "emp_" + ([guid]::NewGuid().ToString().Substring(0, 8))
    password = "User1234!"
    fullName = "Smoke Employee"
    roles = @("EMPLOYEE")
  } | ConvertTo-Json
  $emp = Invoke-RestMethod -Method Post -Uri "http://localhost:8081/auth/admin/create-user" -ContentType "application/json" -Headers $headers -Body $empUser
  $employeeId = $emp.id
  Write-Host "Employee created: $employeeId"

  $serial = "SN-" + ([guid]::NewGuid().ToString().Substring(0, 8))
  $inv = "INV-" + ([guid]::NewGuid().ToString().Substring(0, 8))
  $assetBody = @{
    name = "Demo Laptop"
    type = "LAPTOP"
    categoryCode = "IT"
    serialNumber = $serial
    inventoryTag = $inv
    model = "Latitude"
    vendor = "Dell"
  } | ConvertTo-Json

  $asset = Invoke-RestMethod -Method Post -Uri "http://localhost:8082/assets" -ContentType "application/json" -Headers $headers -Body $assetBody
  $assetId = $asset.id
  Write-Host "Asset created: $assetId"

  $cats = Invoke-RestMethod -Method Get -Uri "http://localhost:8082/asset-categories" -Headers $headers
  if (($cats | Measure-Object).Count -lt 1) { throw "Categories endpoint failed" }

  $aging = Invoke-RestMethod -Method Get -Uri "http://localhost:8082/assets/aging?days=0&size=10" -Headers $headers
  if (-not $aging.items) { throw "Aging endpoint failed" }

  # Upload a tiny PNG asset photo
  $tmpPng = Join-Path $env:TEMP ("asset-photo-" + [guid]::NewGuid().ToString() + ".png")
  [Convert]::FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z/D/PwAHggJ/Pw0j7wAAAABJRU5ErkJggg==") | Set-Content -Encoding Byte -Path $tmpPng
  $photoJson = & curl.exe -s -X POST "http://localhost:8082/assets/$assetId/photos" `
    -H "Authorization: Bearer $access" `
    -F "file=@$tmpPng;type=image/png"
  if (-not $photoJson) { throw "Photo upload failed (empty response)" }
  $photo = $photoJson | ConvertFrom-Json
  if (-not $photo.id) { throw "Photo upload failed (missing id)" }
  Write-Host "Photo uploaded: $($photo.id)"

  $photos = Invoke-RestMethod -Method Get -Uri "http://localhost:8082/assets/$assetId/photos" -Headers $headers
  if (($photos | Measure-Object).Count -lt 1) { throw "Photo list failed" }
  $dl = Invoke-WebRequest -Method Get -Uri "http://localhost:8082$($photos[0].downloadUrl)" -Headers $headers -UseBasicParsing
  if ($dl.StatusCode -ne 200) { throw "Photo download failed: $($dl.StatusCode)" }
  Write-Host "Photo API OK"

  $assignBody = @{ ownerType = "EMPLOYEE"; ownerId = $employeeId; reason = "Smoke test" } | ConvertTo-Json
  Invoke-RestMethod -Method Post -Uri "http://localhost:8082/assets/$assetId/assign" -ContentType "application/json" -Headers $headers -Body $assignBody | Out-Null
  Write-Host "Asset assigned to EMPLOYEE: $employeeId"

  $invSessionBody = @{ name = "Smoke inventory"; ownerType = "EMPLOYEE"; ownerId = $employeeId } | ConvertTo-Json
  $invSession = Invoke-RestMethod -Method Post -Uri "http://localhost:8082/inventories" -ContentType "application/json" -Headers $headers -Body $invSessionBody
  $invSessionId = $invSession.id
  Write-Host "Inventory session created: $invSessionId"

  $scanBody = @{ assetId = $assetId; note = "Found during smoke test" } | ConvertTo-Json
  Invoke-RestMethod -Method Post -Uri "http://localhost:8082/inventories/$invSessionId/scan" -ContentType "application/json" -Headers $headers -Body $scanBody | Out-Null
  $invReport = Invoke-RestMethod -Method Get -Uri "http://localhost:8082/inventories/$invSessionId/report" -Headers $headers
  if (($invReport.missing | Measure-Object).Count -ne 0) { throw "Inventory report: expected missing=0" }
  if (($invReport.unexpected | Measure-Object).Count -ne 0) { throw "Inventory report: expected unexpected=0" }
  Invoke-RestMethod -Method Post -Uri "http://localhost:8082/inventories/$invSessionId/close" -Headers $headers | Out-Null
  Write-Host "Inventory OK"

  $current = Invoke-WebRequest -Method Get -Uri "http://localhost:8082/assets/$assetId/assignment" -Headers $headers -UseBasicParsing
  if ($current.StatusCode -ne 200) {
    throw "Expected 200 for current assignment, got $($current.StatusCode)"
  }

  $statusBody = @{ toStatus = "IN_REPAIR"; reason = "Smoke test repair" } | ConvertTo-Json
  Invoke-RestMethod -Method Post -Uri "http://localhost:8082/assets/$assetId/status" -ContentType "application/json" -Headers $headers -Body $statusBody | Out-Null
  Write-Host "Asset moved to IN_REPAIR"

  $returnBody = @{ reason = "Back to stock"; nextStatus = "REGISTERED" } | ConvertTo-Json
  Invoke-RestMethod -Method Post -Uri "http://localhost:8082/assets/$assetId/return" -ContentType "application/json" -Headers $headers -Body $returnBody | Out-Null
  Write-Host "Asset returned"

  $qr = Invoke-RestMethod -Method Post -Uri "http://localhost:8084/qr/assets/$assetId" -Headers $headers
  if (-not $qr.token) {
    throw "QR token was not generated"
  }
  Write-Host "QR generated"

  $lookup = Invoke-RestMethod -Method Get -Uri "http://localhost:8084/qr/$($qr.token)" -Headers $headers
  if ($lookup.assetId -ne $assetId) {
    throw "QR lookup mismatch: expected $assetId got $($lookup.assetId)"
  }
  $view = Invoke-RestMethod -Method Get -Uri "http://localhost:8084/qr/$($qr.token)/view" -Headers $headers
  if ($view.asset.id -ne $assetId) {
    throw "QR view mismatch"
  }
  Write-Host "QR view OK"

  # Kafka consumers might join a bit later on fresh startups; poll until events are visible.
  $auditOk = $false
  $auditDeadline = (Get-Date).AddSeconds(90)
  while ((Get-Date) -lt $auditDeadline -and -not $auditOk) {
    try {
      $audit = Invoke-RestMethod -Method Get -Uri "http://localhost:8083/audit?entityType=ASSET&entityId=$assetId"
      if (($audit.totalElements -as [int]) -ge 1) { $auditOk = $true; break }
    } catch {}
    Start-Sleep -Seconds 3
  }
  if (-not $auditOk) {
    throw "Audit check failed: no entries found for asset"
  }
  Write-Host "Audit OK ($($audit.totalElements) entries)"

  $analyticsOk = $false
  $analyticsDeadline = (Get-Date).AddSeconds(90)
  while ((Get-Date) -lt $analyticsDeadline -and -not $analyticsOk) {
    try {
      $analytics = Invoke-RestMethod -Method Get -Uri "http://localhost:8085/analytics/dashboard"
      if ($analytics.byStatus) { $analyticsOk = $true; break }
    } catch {}
    Start-Sleep -Seconds 3
  }
  if (-not $analyticsOk) {
    throw "Analytics check failed: byStatus missing"
  }
  Write-Host "Analytics OK"

  Write-Host "Smoke test PASSED"
} finally {
  Pop-Location
}

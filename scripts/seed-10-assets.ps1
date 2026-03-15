param(
  [int]$Count = 10,
  [string]$AdminUsername = "admin",
  [string]$AdminPassword = "Admin1234!"
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

Wait-HttpOk -Url "http://localhost:8081/actuator/health" -TimeoutSeconds 180
Wait-HttpOk -Url "http://localhost:8082/actuator/health" -TimeoutSeconds 180

$loginBody = @{ username = $AdminUsername; password = $AdminPassword } | ConvertTo-Json
$tokens = Invoke-RestMethod -Method Post -Uri "http://localhost:8081/auth/login" -ContentType "application/json" -Body $loginBody
$access = $tokens.accessToken
$headers = @{ Authorization = "Bearer $access" }

function New-DemoEmployee {
  param([string]$Prefix)
  $u = $Prefix + "_" + ([guid]::NewGuid().ToString().Substring(0, 8))
  $body = @{
    username = $u
    password = "User1234!"
    fullName = ("Demo " + $Prefix)
    roles = @("EMPLOYEE")
  } | ConvertTo-Json
  return Invoke-RestMethod -Method Post -Uri "http://localhost:8081/auth/admin/create-user" -ContentType "application/json" -Headers $headers -Body $body
}

$empA = New-DemoEmployee -Prefix "EmployeeA"
$empB = New-DemoEmployee -Prefix "EmployeeB"

$branches = Invoke-RestMethod -Method Get -Uri "http://localhost:8081/branches" -Headers $headers
$departments = Invoke-RestMethod -Method Get -Uri "http://localhost:8081/departments" -Headers $headers
$branchId = if ($branches -and $branches.Count -gt 0) { $branches[0].id } else { $null }
$departmentId = if ($departments -and $departments.Count -gt 0) { $departments[0].id } else { $null }

$templates = @(
  @{ name = "Dell Latitude 7420"; type = "LAPTOP"; categoryCode = "IT"; vendor = "Dell"; model = "Latitude 7420"; status = "REGISTERED" },
  @{ name = "HP LaserJet M404"; type = "PRINTER"; categoryCode = "OFFICE"; vendor = "HP"; model = "LaserJet M404"; status = "ASSIGNED"; ownerType = "EMPLOYEE"; ownerId = $empA.id },
  @{ name = "Verifone POS"; type = "TERMINAL"; categoryCode = "IT"; vendor = "Verifone"; model = "VX"; status = "IN_REPAIR" },
  @{ name = "Hikvision Camera"; type = "CCTV"; categoryCode = "SECURITY"; vendor = "Hikvision"; model = "DS-2CD"; status = "LOST" },
  @{ name = "Office Chair"; type = "CHAIR"; categoryCode = "FURNITURE"; vendor = "IKEA"; model = "Markus"; status = "WRITTEN_OFF" },
  @{ name = "Cisco Catalyst Switch"; type = "SWITCH"; categoryCode = "NETWORK"; vendor = "Cisco"; model = "C2960"; status = "REGISTERED" },
  @{ name = "Dell PowerEdge R740"; type = "SERVER"; categoryCode = "SERVER"; vendor = "Dell"; model = "R740"; status = "ASSIGNED"; ownerType = "DEPARTMENT"; ownerId = $departmentId },
  @{ name = "MikroTik Router"; type = "ROUTER"; categoryCode = "NETWORK"; vendor = "MikroTik"; model = "RB4011"; status = "REGISTERED" },
  @{ name = "Samsung Monitor 27"; type = "MONITOR"; categoryCode = "IT"; vendor = "Samsung"; model = "S27"; status = "ASSIGNED"; ownerType = "BRANCH"; ownerId = $branchId },
  @{ name = "Cash Safe"; type = "SAFE"; categoryCode = "SECURITY"; vendor = "Secure"; model = "S-100"; status = "REGISTERED" }
)

if ($Count -lt 1) { $Count = 1 }
if ($Count -gt $templates.Count) { $Count = $templates.Count }

$created = @()

for ($i = 0; $i -lt $Count; $i++) {
  $tpl = $templates[$i]
  $serial = "SN-" + ([guid]::NewGuid().ToString().Substring(0, 10))
  $inv = "INV-" + ([guid]::NewGuid().ToString().Substring(0, 10))
  $assetBody = @{
    name = $tpl.name
    type = $tpl.type
    categoryCode = $tpl.categoryCode
    serialNumber = $serial
    inventoryTag = $inv
    model = $tpl.model
    vendor = $tpl.vendor
    description = ("Seed demo asset: " + $tpl.name)
  } | ConvertTo-Json

  $asset = Invoke-RestMethod -Method Post -Uri "http://localhost:8082/assets" -ContentType "application/json" -Headers $headers -Body $assetBody
  $assetId = $asset.id

  if ($tpl.status -eq "ASSIGNED") {
    if (-not $tpl.ownerId) {
      Write-Host "Skipping assign for $assetId (missing ownerId)"
    } else {
      $assignBody = @{ ownerType = $tpl.ownerType; ownerId = $tpl.ownerId; reason = "Demo seed" } | ConvertTo-Json
      Invoke-RestMethod -Method Post -Uri "http://localhost:8082/assets/$assetId/assign" -ContentType "application/json" -Headers $headers -Body $assignBody | Out-Null
    }
  } elseif ($tpl.status -ne "REGISTERED") {
    $statusBody = @{ toStatus = $tpl.status; reason = "Demo seed" } | ConvertTo-Json
    Invoke-RestMethod -Method Post -Uri "http://localhost:8082/assets/$assetId/status" -ContentType "application/json" -Headers $headers -Body $statusBody | Out-Null
  }

  $created += $assetId
  Write-Host ("Created: {0} ({1}/{2}) [{3}] {4}" -f $assetId, ($i + 1), $Count, $tpl.categoryCode, $tpl.name)
}

Write-Host ""
Write-Host "Seed complete. Asset IDs:"
$created | ForEach-Object { Write-Host ("- " + $_) }


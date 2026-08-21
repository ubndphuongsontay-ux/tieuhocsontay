$pg = "C:\Program Files\PostgreSQL\18\bin"
$env:PGCLIENTENCODING = "UTF8"
& "$pg\pg_isready.exe" -h 127.0.0.1 -p 54329 -U postgres
if ($LASTEXITCODE -ne 0) {
  & "$PSScriptRoot\start_local_pg.ps1"
}
$src = Join-Path $PSScriptRoot "..\supabase\migrations"
$tmp = Join-Path $env:LOCALAPPDATA "th-son-tay-pg\migrations"
New-Item -ItemType Directory -Force -Path $tmp | Out-Null
$files = Get-ChildItem $src -Filter "202608211*.sql" | Sort-Object Name
foreach ($f in $files) {
  Write-Host "APPLY $($f.Name)"
  $dest = Join-Path $tmp $f.Name
  Copy-Item $f.FullName $dest -Force
  & "$pg\psql.exe" -h 127.0.0.1 -p 54329 -U postgres -d th_son_tay -v ON_ERROR_STOP=1 -f $dest
  if ($LASTEXITCODE -ne 0) { throw "Migration failed: $($f.Name)" }
}
Write-Host "OK migrations"

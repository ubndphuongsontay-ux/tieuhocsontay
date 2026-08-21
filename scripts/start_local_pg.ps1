$pg = "C:\Program Files\PostgreSQL\18\bin"
$data = "C:\Users\cuong\AppData\Local\th-son-tay-pg\data"
$log = "C:\Users\cuong\AppData\Local\th-son-tay-pg\logfile.log"
& "$pg\pg_isready.exe" -h 127.0.0.1 -p 54329 -U postgres 2>$null
if ($LASTEXITCODE -ne 0) {
  & "$pg\pg_ctl.exe" -D $data -l $log -o "-p 54329 -h 127.0.0.1" start
}
& "$pg\pg_isready.exe" -h 127.0.0.1 -p 54329 -U postgres

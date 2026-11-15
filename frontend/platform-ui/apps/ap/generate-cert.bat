@echo off
mkdir ssl 2>nul

openssl req -x509 -nodes -newkey rsa:2048 ^
  -keyout ssl\localhost-key.pem ^
  -out ssl\localhost.pem ^
  -days 365 ^
  -config ssl\localhost-openssl.cnf ^
  -extensions req_ext

if errorlevel 1 (
  echo.
  echo Certificate generation FAILED.
  pause
  exit /b 1
)

echo.
echo Certificates and Keys created on ssl\
openssl x509 -in ssl\localhost.pem -noout -dates -subject -ext subjectAltName
pause

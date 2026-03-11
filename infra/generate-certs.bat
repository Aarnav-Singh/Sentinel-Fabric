@echo off
setlocal

mkdir "%~dp0\nginx\certs" 2>nul
echo Generating self-signed certificates for Nginx...

openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout "%~dp0\nginx\certs\key.pem" -out "%~dp0\nginx\certs\cert.pem" -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"

echo Self-signed certificates generated successfully in infra\nginx\certs\
endlocal

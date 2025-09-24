@echo off
echo.
echo Starting HTTPS Server for iPhone Camera Access
echo =============================================
echo.
echo This will create a self-signed certificate and start HTTPS server
echo You will need to accept the security warning on your iPhone
echo.
pause

python https-server.py

pause
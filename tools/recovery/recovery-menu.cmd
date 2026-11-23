@echo off
setlocal
if "%~1"=="" (
  echo Usage: recovery-menu.cmd "C:\Path\to\IT-controlled\host.env"
  echo An approved Node.js 24 installation and IT operator key are required.
  exit /b 2
)
powershell.exe -NoProfile -File "%~dp0recovery-menu.ps1" -EnvFile "%~f1"
exit /b %ERRORLEVEL%

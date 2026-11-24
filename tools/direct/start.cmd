@echo off
setlocal DisableDelayedExpansion
if "%~1"=="" (
  echo Usage: start.cmd "C:\IT-config\host.env"
  exit /b 2
)
node "%~dp0host.mjs" start %*
exit /b %ERRORLEVEL%

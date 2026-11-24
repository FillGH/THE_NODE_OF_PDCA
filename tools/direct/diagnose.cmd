@echo off
setlocal DisableDelayedExpansion
if "%~1"=="" (
  echo Usage: diagnose.cmd "C:\IT-config\host.env"
  exit /b 2
)
node "%~dp0host.mjs" diagnose %*
exit /b %ERRORLEVEL%

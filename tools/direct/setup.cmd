@echo off
setlocal DisableDelayedExpansion
if "%~1"=="" (
  echo Usage: setup.cmd "C:\IT-config\host.env" [PRIVATE_IPV4 PORT "D:\PDCA\data"]
  exit /b 2
)
node "%~dp0host.mjs" setup %*
exit /b %ERRORLEVEL%

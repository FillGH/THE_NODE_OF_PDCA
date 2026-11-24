@echo off
setlocal DisableDelayedExpansion
call "%~dp0..\Application\tools\recovery\recovery-menu.cmd" "%~dp0..\Configuration\host.env"
if errorlevel 1 (
  echo Recovery stopped. Preserve the data and contact IT.
  pause
  exit /b 1
)
exit /b 0

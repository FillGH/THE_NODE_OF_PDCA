@echo off
setlocal DisableDelayedExpansion
node.exe "%~dp0_support\launcher.mjs" start %*
if errorlevel 1 (
  echo See STOP message above. Do not delete existing data.
  pause
  exit /b 1
)
exit /b 0

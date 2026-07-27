@echo off
REM Start the overlay dev server by double-click, so it is not a terminal ritual
REM before going live. OBS Browser Sources point at http://localhost:8000/... and
REM those URLs only resolve while this is running — if it is not up when OBS loads
REM a source, the overlay is simply blank.
REM
REM To start it automatically at login: press Win+R, run `shell:startup`, and drop
REM a shortcut to this file in the folder that opens.
title Stream Overlays - dev server
cd /d "%~dp0\.."
echo Serving overlays at http://localhost:8000/
echo Setup:   http://localhost:8000/pages/setup.html
echo Gallery: http://localhost:8000/pages/gallery.html
echo.
echo Leave this window open while streaming. Ctrl+C or close it to stop.
echo.
node scripts\serve.mjs
echo.
echo Server stopped.
pause

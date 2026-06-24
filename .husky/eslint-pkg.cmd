@echo off
REM lint-staged wrapper: cd into package dir, strip prefix from paths, run eslint
set pkg=%1
set prefix=%2
shift
shift

cd /d "%pkg%" || exit /b 1

setlocal enabledelayedexpansion
set args=
:loop
if "%~1"=="" goto :run
set file=%~1
set file=!file:%prefix%=!
set args=!args! "!file!"
shift
goto :loop

:run
node_modules\.bin\eslint --fix %args%

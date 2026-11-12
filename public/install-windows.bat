@echo off
REM ==============================================================================
REM Moody.Ai - Windows 10/11 Standalone Desktop Installer & Shortcut Generator
REM ==============================================================================

echo ==========================================================
echo        Moody.Ai - Windows 10/11 Desktop Installer        
echo ==========================================================
echo Sovereign Intelligence ^| E2EE ^| LAN Connect ^| 3D Studio
echo.

set APP_URL=https://ais-dev-yqg6ldjf6fyrlxctbpx577-650110562309.us-west2.run.app
set SHORTCUT_NAME=Moody.Ai.lnk

echo [1/2] Bezig met maken van snelkoppeling op uw Bureaublad...

powershell -Command "$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut([System.Environment]::GetFolderPath('Desktop') + '\Moody.Ai.lnk'); $Shortcut.TargetPath = 'msedge.exe'; $Shortcut.Arguments = '--app=%APP_URL%'; $Shortcut.Description = 'Moody.Ai Sovereign Desktop Application'; $Shortcut.Save()"

echo [2/2] Bezig met toevoegen aan Start Menu...

powershell -Command "$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut([System.Environment]::GetFolderPath('StartMenu') + '\Programs\Moody.Ai.lnk'); $Shortcut.TargetPath = 'msedge.exe'; $Shortcut.Arguments = '--app=%APP_URL%'; $Shortcut.Description = 'Moody.Ai Sovereign Desktop Application'; $Shortcut.Save()"

echo.
echo ==========================================================
echo       INSTALLATIE VOLTOOID OP WINDOWS 10 / 11!          
echo ==========================================================
echo Er staat een 'Moody.Ai' snelkoppeling op uw Bureaublad en
echo in uw Startmenu. Dubbelklik om Moody.Ai native te starten!
echo ==========================================================
pause

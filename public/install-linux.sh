#!/usr/bin/env bash
# ==============================================================================
# Moody.Ai - Universeel & Linux Native Installatie Script
# Ondersteunt: Ubuntu, Debian, Fedora, Arch Linux, Linux Mint, Manjaro, openSUSE
# ==============================================================================

set -e

APP_NAME="Moody.Ai"
APP_DIR="$HOME/.local/share/moody-ai"
BIN_DIR="$HOME/.local/bin"
DESKTOP_DIR="$HOME/.local/share/applications"
ICON_DIR="$HOME/.local/share/icons/hicolor/512x512/apps"

echo "=========================================================="
echo "      Moody.Ai - Universele & Linux Desktop Installer     "
echo "=========================================================="
echo "Sovereign Intelligence | E2EE | LAN Connect | 3D Studio"
echo ""

# 1. Mapstructuren aanmaken
echo "[1/4] Aanmaken van lokale applicatiemappen..."
mkdir -p "$APP_DIR"
mkdir -p "$BIN_DIR"
mkdir -p "$DESKTOP_DIR"
mkdir -p "$ICON_DIR"

# 2. Icoon installeren
echo "[2/4] Installeren van high-res SVG applicatie-icoon..."
cat << 'EOF' > "$ICON_DIR/moody-ai.svg"
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#022c22"/>
      <stop offset="50%" stop-color="#064e3b"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
    <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#34d399"/>
      <stop offset="100%" stop-color="#059669"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="108" fill="url(#bg)"/>
  <path d="M256 80 L390 140 C390 270 330 360 256 420 C182 270 122 140 Z" fill="none" stroke="url(#shieldGrad)" stroke-width="16" stroke-linejoin="round"/>
  <circle cx="256" cy="220" r="38" fill="url(#shieldGrad)"/>
  <polygon points="242,240 270,240 278,310 234,310" fill="url(#shieldGrad)"/>
  <circle cx="256" cy="150" r="12" fill="#f97316"/>
</svg>
EOF

# 3. Executable launcher script genereren in ~/.local/bin/moody-ai
echo "[3/4] Genereren van standalone launcher script..."
APP_URL="${APP_URL:-https://ais-dev-yqg6ldjf6fyrlxctbpx577-650110562309.us-west2.run.app}"

cat << EOF > "$BIN_DIR/moody-ai"
#!/usr/bin/env bash
# Moody.Ai Standalone Native Launcher
URL="$APP_URL"

# Zoek naar Chrome, Chromium, Brave of Firefox voor native standalone window
if command -v google-chrome &> /dev/null; then
    exec google-chrome --app="\$URL" --class="MoodyAi" "\$@"
elif command -v chromium-browser &> /dev/null; then
    exec chromium-browser --app="\$URL" --class="MoodyAi" "\$@"
elif command -v chromium &> /dev/null; then
    exec chromium --app="\$URL" --class="MoodyAi" "\$@"
elif command -v brave-browser &> /dev/null; then
    exec brave-browser --app="\$URL" --class="MoodyAi" "\$@"
elif command -v firefox &> /dev/null; then
    exec firefox --new-window "\$URL" "\$@"
else
    xdg-open "\$URL"
fi
EOF

chmod +x "$BIN_DIR/moody-ai"

# 4. Linux Desktop Entry (.desktop launcher voor GNOME, KDE, XFCE)
echo "[4/4] Integreren in Linux applicatiemenu (GNOME / KDE / XFCE)..."
cat << EOF > "$DESKTOP_DIR/moody-ai.desktop"
[Desktop Entry]
Version=1.0
Type=Application
Name=Moody.Ai
GenericName=Sovereign AI & 3D Creation Assistant
Comment=Moody.Ai - Encrypted Multilingual Voice AI, LAN Peer Connect, 3D Studio & Agent Zero
Exec=$BIN_DIR/moody-ai %u
Icon=$ICON_DIR/moody-ai.svg
Terminal=false
Categories=Utility;Development;Graphics;Network;
StartupWMClass=MoodyAi
Keywords=AI;Gemini;Voice;E2EE;3D;AgentZero;
Actions=NewWindow;

[Desktop Action NewWindow]
Name=Nieuw Moody.Ai Venster
Exec=$BIN_DIR/moody-ai
EOF

chmod +x "$DESKTOP_DIR/moody-ai.desktop"

# Update desktop database
if command -v update-desktop-database &> /dev/null; then
    update-desktop-database "$DESKTOP_DIR" 2>/dev/null || true
fi

echo ""
echo "=========================================================="
echo "       INSTALLATIE SUCCESVOL VOLTOOID OP LINUX!          "
echo "=========================================================="
echo "• Start direct via terminal: moody-ai"
echo "• Of zoek naar 'Moody.Ai' in uw applicatiemenu / GNOME Dash"
echo "• Desktop snelkoppeling: $DESKTOP_DIR/moody-ai.desktop"
echo "=========================================================="

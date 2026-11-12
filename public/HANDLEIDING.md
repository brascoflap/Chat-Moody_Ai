# Moody.Ai - Universeel Installatie- & Gebruikershandboek

Welkom bij **Moody.Ai**, de soevereine, meertalige AI-assistent met end-to-end encryptie (E2EE), Nederlandse spraakinterface, LAN-collegakoppeling, Agent Zero multi-agent orchestratie en 3D Creatie Studio.

---

## Inhoud van dit Installatiepakket

1. `install-linux.sh` - Automatische native desktop installer voor alle Linux-distributies (Ubuntu, Debian, Fedora, Arch, Mint, etc.).
2. `install-windows.bat` - Windows 10/11 desktop & startmenu installer.
3. `manifest.json` - Universele Progressive Web App configuratie voor Chromium, Safari, Edge, Firefox, iOS en Android.
4. `icon.svg` - Schaalbaar vectoricoon (512x512) met veilige marges.
5. `HANDLEIDING.md` - Deze handleiding.

---

## 1. Installatie op Linux (Ubuntu, Debian, Fedora, Arch, Mint, openSUSE)

### Methode A: Automatisch script via Terminal (Aanbevolen)
Open een terminalvenster in deze map en voer uit:

```bash
chmod +x install-linux.sh
./install-linux.sh
```

Of via het 1-regel curl commando:
```bash
curl -fsSL https://ais-dev-yqg6ldjf6fyrlxctbpx577-650110562309.us-west2.run.app/install-linux.sh | bash
```

**Wat dit doet:**
- Plaatst het `moody-ai` startcommando in `~/.local/bin/moody-ai`.
- Installeert het desktop-icoon in `~/.local/share/icons/hicolor/512x512/apps/moody-ai.svg`.
- Maakt de `.desktop` launcher aan in `~/.local/share/applications/moody-ai.desktop`.
- Moody.Ai verschijnt direct in uw **GNOME Dash, KDE Applicatiemenu of XFCE menu**.

---

## 2. Installatie op Windows 10 & Windows 11

### Methode A: Dubbelklikken op het installatiebestand
Dubbelklik op `install-windows.bat`.

**Wat dit doet:**
- Maakt direct een snelkoppeling aan op uw **Bureaublad** (`Moody.Ai.lnk`).
- Voegt Moody.Ai toe aan uw **Startmenu** onder Programma's.
- Start de app in een dedicated standalone venster zonder adresbalken.

---

## 3. Installatie op macOS (Apple Silicon M1/M2/M3 & Intel)

1. Open de applicatie in **Safari** of **Google Chrome**:
   `https://ais-dev-yqg6ldjf6fyrlxctbpx577-650110562309.us-west2.run.app`
2. **In Safari**: Klik in de menubalk op **Bestand > Voeg toe aan Dock...** (Add to Dock).
3. **In Chrome**: Klik op het installatie-icoon in de URL-balk of via ⋮ > *Moody.Ai installeren*.
4. Moody.Ai staat nu in uw **Dock** en opent via **Spotlight** (`Cmd + Spatie`).

---

## 4. Installatie op Mobiel (iOS & Android)

- **Apple iPhone / iPad (Safari)**:
  Tik onderin op het **Deel-icoon** (vierkantje met pijl omhoog) en kies **"Zet op beginscherm"**.
- **Android (Chrome)**:
  Tik rechtsboven op de drie puntjes ⋮ en kies **"App installeren"** of **"Toevoegen aan startscherm"**.

---

## 5. Belangrijkste Functies van Moody.Ai

- **Nederlandse Stem & Meertalige Vertaling**:
  Spreek via uw microfoon en luister naar natuurlijke Nederlandse stemmen via Gemini TTS.
- **Client-Side AES-GCM-256 Encryptie**:
  Al uw gesprekken, bestanden en gegevens worden op uw eigen apparaat versleuteld vóór opslag.
- **LAN Collega Koppelen**:
  Deel uw 4-cijferige pincode met een collega op hetzelfde netwerk voor directe, veilige samenwerking.
- **Agent Zero Multi-Agent Studio**:
  Stuur gelijktijdig meerdere AI-agents aan (Gemini, Open-Source / Ollama, ChatGPT, Codex, Claude, Grok).
- **3D Creatie Studio**:
  Zet schetsen of foto's realtime om naar een 3D-model en exporteer als `.OBJ`, standalone `HTML 3D` of Vector blauwdruk.
- **100% Admin Rechten**:
  Elke gebruiker beschikt over volledige beheerrechten om prompts, modellen en interface-instellingen aan te passen.

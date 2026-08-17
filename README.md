# 🎴 2D Real-Time Multiplayer UNO Game

Ein voll funktionsfähiges, 2D-basiertes UNO-Multiplayer-Spiel in JavaScript (Node.js & Socket.io), optimiert für mobile Endgeräte und vorbereitet für ein einfaches Deployment auf der Plattform **Render**.

---

## 🌟 Features

- **Real-Time Multiplayer**: Synchronisierte Spielräume mit 4-stelligen Raumcodes für 2 bis 8 Spieler.
- **Vollständiges UNO-Regelwerk**:
  - Zahlenkarten (0-9 in 4 Farben: Rot, Gelb, Grün, Blau).
  - Aktionskarten (Aussetzen 🚫, Richtungswechsel 🔄, Ziehe 2 +2).
  - Farbwahl (Wild ★, Ziehe 4 Wild +4).
  - 20-Sekunden Zugaablauf-Timer pro Spieler.
  - „UNO!“-Button & Strafkarten-Mechanismus („Erwischt! 🚨“).
  - Automatische Punkteberechnung nach Rundenende.
- **2D Canvas Rendering**: Flüssige Kartendarstellung, rotierender Richtungsring, Tischansicht & Karten-Animationen.
- **Web Audio API Synthesizer**: Interaktive Soundeffekte (Kartenlegen, Ziehen, UNO-Ruf, Gewinnsound) ohne externe Dateien.
- **Mobile First Responsive Design**: Optimierte Touch-Bedienung für Handys & Tablets (Hoch- & Querformat).
- **In-Memory Highscore Leaderboard**: Punkte- und Siegesstatistik pro Raum.

---

## 📁 Projektstruktur

```
UNO/
├── client/
│   ├── index.html          # HTML Layout (Lobby, Game HUD, Canvas, Modals)
│   ├── css/
│   │   └── style.css       # Responsive UI Design & Card Animations
│   └── js/
│       ├── app.js          # Haupt-Anwendungslogik & UI Controller
│       ├── gameEngine.js   # 2D Canvas Engine & Renderer
│       ├── socketClient.js # Socket.io Client (Dynamische Host-Erkennung)
│       └── sound.js        # Web Audio API Sound Synthesizer
├── server/
│   ├── server.js           # Express Web Server + Socket.io Server
│   ├── gameLogic/
│   │   ├── UnoGame.js      # Spielzustands-Maschine & Regelwerk
│   │   ├── Deck.js         # Kartendeck-Verwaltung (108 Karten) & Mischen
│   │   └── Highscore.js    # Punkte- & Ranglistenverwaltung
│   └── utils/
│       └── roomCodeGenerator.js # Raumcode-Generator (4-stellig)
├── package.json            # Start-Skripte & Dependencies
└── README.md               # Dokumentation & Deployment-Anleitung
```

---

## 🚀 Lokale Entwicklung (Localhost)

### Voraussetzungen
- **Node.js** (v18 oder neuer)
- **npm** (wird mit Node.js installiert)

### Schritt-für-Schritt Start

1. **Abhängigkeiten installieren**:
   ```bash
   npm install
   ```

2. **Server starten**:
   ```bash
   npm start
   ```

3. **Im Browser öffnen**:
   - Gehe auf `http://localhost:3000`
   - Öffne mehrere Browser-Tabs oder Incognito-Fenster, um mehrere Spieler auf `localhost` zu testen.

---

## ☁️ Deployment auf Render (Render.com)

Dieses Projekt ist bereits vollständig für die Bereitstellung auf **Render** (Node.js Web Service) vorkonfiguriert.

### Schritte für Render Deployment:

1. **Code auf GitHub / GitLab push** (öffentliches oder privates Repository).
2. Gehe auf [Render Dashboard](https://dashboard.render.com/) und wähle **New -> Web Service**.
3. Verbinde dein Git-Repository mit Render.
4. **Konfigurationseinstellungen auf Render**:
   - **Name**: `uno-multiplayer-game` (oder ein beliebiger Name)
   - **Environment**: `Node`
   - **Region**: Frankfurt / Europe (oder nähster Standort)
   - **Branch**: `main`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free
5. Klicke auf **Create Web Service**.

### 💡 Wichtige Render-Hinweise:

- **Dynamisches WebSocket Handling**: Der Client verbindet sich via `io(window.location.origin)`. Es muss keine URL manuell im Code angepasst werden; Socket.io erkennt automatisch die öffentliche HTTPS-URL von Render.
- **Port**: Render weist dem Prozess automatisch eine Umgebungsvariable `PORT` zu. Der Server greift mit `process.env.PORT || 3000` darauf zu.
- **Free Tier Inaktivität (Spin-down)**: Beim Render Free Tier geht die Instanz nach 15 Minuten Inaktivität in den Ruhezustand. Beim ersten Aufruf nach der Pause kann der Server-Start ca. 30 Sekunden dauern.
- **Highscore Persistenz**: Da Highscores aktuell in-memory gespeichert werden, setzen sich die Punkte zurück, wenn Render die Instanz nach einer inaktiven Phase neu startet. Für dauerhafte Persistenz kann in `server/gameLogic/Highscore.js` eine kostenlose Datenbank wie MongoDB Atlas oder Redis eingebunden werden.

---

## 🎮 Bedienung auf dem Smartphone (Handy)

- **Raum beitreten**: Erstelle einen Raum und teile den 4-stelligen Code (z. B. `K9X2`) mit deinen Freunden.
- **Karten scrollen**: Wische im unteren Kartenbereich nach links/rechts, um deine Handkarten zu durchsuchen.
- **Karten legen**: Tippe einfach auf die Karte, die du spielen möchtest.
- **Farbwahl**: Bei Farbwahlkarten (Wild / Wild +4) öffnet sich automatisch ein Touch-Farbwähler.
- **UNO rufen**: Wenn du deine vorletzte Karte legst, tippe sofort auf den großen **🔥 UNO! 🔥** Button!

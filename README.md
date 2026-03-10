[ai_studio_code.txt](https://github.com/user-attachments/files/25872483/ai_studio_code.txt)
# 📄 OneDrive PDF Editor PWA

Eine leichtgewichtige Progressive Web App (PWA) zum Importieren, Bearbeiten (Text hinzufügen), Umbenennen und Exportieren von PDF-Dateien mit direkter Integration in Microsoft OneDrive.

## ✨ Features

- **OneDrive Integration:** Sicherer Login über Microsoft MSAL und Zugriff auf deine Dateien.
- **Anpassbare Vorschau:** Ein responsives Interface mit einer Sidebar, die per Maus in der Breite verstellbar ist.
- **PDF-Bearbeitung:** Füge mit einem Klick vordefinierten Text in die PDF-Datei ein (Nutzt `pdf-lib`).
- **Datei-Management:** Benenne deine Dateien direkt in der App um.
- **Drag & Drop Export:** Ziehe die bearbeitete Datei direkt aus der App in einen lokalen Ordner (z. B. deinen synchronisierten OneDrive-Ordner unter Windows/macOS).
- **Cross-Platform:** Funktioniert auf Windows, macOS und iOS (als installierte PWA).

## 🚀 Installation & Setup

### 1. Voraussetzungen
Da dies eine PWA ist, muss sie über **HTTPS** serviert werden. Wir nutzen dafür GitHub Pages.

### 2. Microsoft Azure App Registrierung
Um die OneDrive-Funktionen zu nutzen, musst du die App bei Microsoft registrieren:
1. Gehe zum [Azure Portal](https://portal.azure.com/).
2. Erstelle eine neue **App-Registrierung**.
3. Wähle unter "Redirect URI" den Typ **SPA (Single Page Application)**.
4. Gib deine GitHub Pages URL ein (z. B. `https://dein-nutzername.github.io/dein-repo-name/`).
5. Kopiere die **Client ID** und füge sie in der `app.js` unter `msalConfig` ein.
6. Füge unter **API-Berechtigungen** die Berechtigung `Files.ReadWrite.All` (Microsoft Graph) hinzu.

### 3. Hosting auf GitHub Pages
1. Lade alle Dateien (`index.html`, `style.css`, `app.js`, `manifest.json`, `sw.js`) in dein GitHub-Repository hoch.
2. Gehe zu **Settings** -> **Pages**.
3. Wähle den `main` Branch als Quelle und klicke auf **Save**.
4. Deine App ist nun unter `https://dein-nutzername.github.io/dein-repo-name/` erreichbar.

## 📱 Nutzung auf verschiedenen Geräten

- **Windows / macOS (Chrome/Edge):** Klicke auf das Installations-Icon in der Adressleiste, um die App als Desktop-Anwendung zu nutzen.
- **iOS (Safari):** Tippe auf das "Teilen"-Symbol und wähle **"Zum Home-Bildschirm hinzufügen"**.

## 🛠 Technologien

- **HTML5 / CSS3:** Layout mit Flexbox und CSS Variables.
- **JavaScript (Vanilla):** App-Logik und DOM-Manipulation.
- **[pdf-lib](https://pdf-lib.js.org/):** Modifikation von PDF-Dokumenten im Browser.
- **[MSAL.js](https://github.com/AzureAD/microsoft-authentication-library-for-js):** Authentifizierung am Microsoft Konto.
- **Service Worker:** Ermöglicht Offline-Funktionalität und PWA-Installation.

## 📝 Lizenz
Dieses Projekt ist unter der MIT-Lizenz veröffentlicht.

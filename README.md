<p align="center">
  <img src="./social-preview.png" width="100%" alt="Die Fallkartei – persönlicher Hörspielbegleiter">
</p>

<p align="center">
  <img alt="Version 1.0.3" src="https://img.shields.io/badge/Version-1.0.3-f2f3f5?style=flat-square&labelColor=11141a&color=f2f3f5">
  <img alt="Progressive Web App" src="https://img.shields.io/badge/PWA-installierbar-2980ff?style=flat-square&labelColor=11141a">
  <img alt="Offline-first" src="https://img.shields.io/badge/Offline-first-38a169?style=flat-square&labelColor=11141a">
  <img alt="Kein Backend" src="https://img.shields.io/badge/Backend-keins-e53935?style=flat-square&labelColor=11141a">
</p>

<p align="center">
  <strong>Die Fallkartei</strong> ist ein persönlicher, offlinefähiger Hörspielbegleiter für <strong>Die drei ???</strong>.
</p>

<p align="center">
  <a href="https://letsmagic.github.io/fallkartei/"><strong>App öffnen</strong></a>
  ·
  <a href="./PRIVACY.md">Datenschutz</a>
  ·
  <a href="./ATTRIBUTIONS.md">Quellen & Rechte</a>
  ·
  <a href="./CHANGELOG.md">Änderungen</a>
</p>

## Überblick

Die Fallkartei verbindet einen klassischen Hörstatus-Tracker mit persönlicher Suche, nachvollziehbaren Empfehlungen, Playlists und lokalen Backups. Im Mittelpunkt steht nicht nur die Frage, welche Folgen bereits gehört wurden, sondern vor allem:

> **Welche Folge passt gerade – und warum?**

Aus den eigenen Bewertungen entsteht ausschließlich lokal auf dem Gerät ein Geschmacksprofil. Daraus leitet die App passende Vorschläge, ähnliche Folgen und Hörpläne ab. Ein Benutzerkonto oder eigener Server ist nicht erforderlich.

## Funktionen

### Verwalten und bewerten

- Hörstatus und vollständiger Hörverlauf
- vierstufige Bewertung: **Minus**, **Neutral**, **Plus** und **Super**
- persönliche Notizen zu einzelnen Folgen
- Schnellbewertung mit echter Rückgängig-Funktion
- angeheftete Folgen und „Als Nächstes“-Warteschlange

### Finden und entdecken

- persönliche Empfehlungen mit Gründen und Profilstärke
- Suche nach Titel, Nummer, Figuren, Handlung, Kapiteln, Themen und Autoren
- Community-Rangliste, eigene Bewertungen und persönliche Empfehlungsliste
- ähnliche Folgen und kuratierte Zusammenhänge
- drei Katalogansichten: **Kompakt**, **Details** und **Cover**

### Planen und teilen

- eigene und kuratierte Playlists
- Smart-Playlist-Vorschau vor dem Speichern
- Planung nach Hörzeit, Stimmung, Hörstatus und Autor
- teilbares Hörprofil als PNG-Grafik
- Playlist-Fortschritt und verbleibende Hörzeit

### Streaming und Offline-Nutzung

Unterstützte Links können unter anderem zu folgenden Diensten führen:

- Spotify
- Apple Music
- BookBeat
- Amazon Music
- YouTube Music
- Deezer
- Amazon

Der bevorzugte Anbieter erscheint als Hauptaktion. Weitere vorhandene Dienste bleiben platzsparend eingeklappt.

Die App ist als Progressive Web App installierbar. Oberfläche, Grundkatalog und persönliche Daten bleiben nach dem ersten Laden weitgehend offline verfügbar. Cover und aktualisierte Metadaten benötigen eine Internetverbindung.

## Installation

Die veröffentlichte App läuft direkt über GitHub Pages:

**https://letsmagic.github.io/fallkartei/**

### iPhone und iPad

1. Seite in Safari öffnen
2. **Teilen** auswählen
3. **Zum Home-Bildschirm** antippen

### Desktop und Android

Unterstützte Browser zeigen eine eigene Installationsoption in der Adressleiste oder im Browsermenü an.

## Daten und Datenschutz

Die Fallkartei verwendet:

- kein Benutzerkonto
- kein eigenes Backend
- keine Analyse- oder Werbetracker
- keine Cloud-Synchronisation

Bewertungen, Notizen, Playlists, Hörverlauf und Einstellungen werden lokal in IndexedDB gespeichert. Regelmäßige JSON-Backups werden empfohlen, insbesondere vor einem Gerätewechsel oder dem Löschen von Browserdaten.

Ausführliche Informationen stehen in [PRIVACY.md](./PRIVACY.md).

## Cover, Metadaten und Quellen

Coverdateien werden nicht als Teil des Katalogs im Repository gespeichert. Die App verwendet externe Bild- und Metadatenlinks und zeigt bei nicht erreichbaren Bildern einen neutralen Platzhalter.

Ergänzende Informationen wie Beschreibungen, Laufzeiten, Kapitel, Sprecherrollen sowie Cover- und Streaminglinks werden aus öffentlich verfügbaren Metadatenquellen ergänzt. Community-Wertungen stammen aus den im Projekt gepflegten Rocky-Beach-Daten.

Details und rechtliche Hinweise stehen in [ATTRIBUTIONS.md](./ATTRIBUTIONS.md).

## Technischer Aufbau

Die App ist bewusst ohne Framework und ohne Build-Schritt umgesetzt:

- Vanilla JavaScript mit ES-Modulen
- IndexedDB für persönliche Daten und Metadaten-Cache
- Service Worker für Offline-Nutzung und kontrollierte Updates
- vollständig statisches Hosting über GitHub Pages
- keine Laufzeitabhängigkeiten

```text
index.html             Oberfläche und Dialoge
style.css              Layout, Komponenten und mobile Anpassungen
app.js                  Einstiegspunkt
app-controller.js       Rendering und Interaktionen
core.js                 Zustand, Speicherung und Migration
catalog.js              Katalog, Metadaten und Suche
recommendations.js      Geschmacksprofil und Empfehlungen
playlists.js            Playlists und Smart-Planer
backup.js               Export, Import und Zusammenführung
sw.js                   Offline-Cache und Updates
manifest.json           PWA-Konfiguration
episodes-seed.js        eingebetteter Offline-Katalog
episodes.json           alternative Katalogquelle
```

## Projektstatus

**Version 1.0.3** ist der aktuelle stabile Release. **Version 1.0.0** war der erste konsolidierte Release unter dem Namen **Die Fallkartei**. Die App wird hauptsächlich für den privaten Gebrauch und einen kleinen Freundeskreis entwickelt. Das Repository ist öffentlich, damit GitHub Pages die App bereitstellen kann und der technische Aufbau nachvollziehbar bleibt.

Metadaten können unvollständig, veraltet oder fehlerhaft sein. Hinweise können über GitHub Issues gemeldet werden, sofern sie für das Repository aktiviert sind.

## Rechtlicher Hinweis

Dies ist ein **inoffizielles, nicht-kommerzielles Fanprojekt** und steht in keiner Verbindung zu Sony Music Entertainment, EUROPA, dem KOSMOS Verlag oder weiteren beteiligten Rechteinhabern.

„Die drei ???“, zugehörige Marken, Titel, Cover, Illustrationen und sonstige geschützte Inhalte gehören den jeweiligen Rechteinhabern. Die Fallkartei erhebt keinerlei Anspruch auf diese Inhalte.

## Lizenz

Für dieses Repository wird derzeit keine Open-Source-Lizenz erteilt. Der Quellcode wird öffentlich zur technischen Bereitstellung und Nachvollziehbarkeit der App gehostet. Alle Rechte an den selbst erstellten Projektbestandteilen bleiben vorbehalten.

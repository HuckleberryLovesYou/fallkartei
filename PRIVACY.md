# Datenschutz

Stand: 6. August 2026

## Grundprinzip

Die Fallkartei wurde als lokale Progressive Web App ohne Benutzerkonto und ohne eigenes Backend entwickelt. Persönliche Nutzungsdaten werden nicht an einen eigenen Server übertragen.

## Lokal gespeicherte Daten

Die App speichert im Browser unter anderem:

- Hörstatus und Bewertungen
- persönliche Notizen
- Playlists und Warteschlange
- Hörverlauf
- Empfehlungsfeedback
- Darstellungs- und Streamingeinstellungen
- Zeitpunkte lokaler Backups und Metadatenaktualisierungen

Die Speicherung erfolgt über IndexedDB und den Cache des Service Workers. Diese Daten bleiben grundsätzlich auf dem verwendeten Browserprofil und Gerät.

## Netzwerkzugriffe

Beim normalen Betrieb können Verbindungen zu folgenden Kategorien externer Dienste entstehen:

- GitHub Pages zum Laden der App-Dateien
- öffentliche Metadatenquellen zur Aktualisierung von Folgeninformationen
- externe Bildquellen für die optionale Coveransicht
- Streaminganbieter, wenn ein entsprechender Link geöffnet wird

Die jeweiligen externen Anbieter können dabei technisch notwendige Verbindungsdaten wie IP-Adresse, Browsertyp und Zeitpunkt des Abrufs erhalten. Für deren Verarbeitung gelten die Datenschutzhinweise des jeweiligen Anbieters.

## Keine Analyse und keine Werbung

Die Fallkartei enthält keine eigenen:

- Analysewerkzeuge
- Werbenetzwerke
- Tracking-Pixel
- Nutzerkonten
- Profilserver

Das persönliche Empfehlungsprofil wird ausschließlich lokal im Browser berechnet.

## Backups

JSON-Backups werden lokal erzeugt und nur dann geteilt oder gespeichert, wenn die entsprechende Funktion bewusst ausgelöst wird. Die Dateien können Bewertungen, Notizen, Playlists und Hörverlauf enthalten und sollten entsprechend privat behandelt werden.

Die teilbare Statistikgrafik enthält keine persönlichen Notizen und keine konkreten Hörzeitpunkte.

## Daten löschen

Persönliche Daten können innerhalb der App über **Einstellungen → Persönliche Daten zurücksetzen** gelöscht werden. Alternativ können die Website-Daten im Browser entfernt werden. Dadurch werden lokale Bewertungen, Notizen, Playlists und Backups im Browser nicht wiederherstellbar gelöscht.

## Kontakt und Verantwortung

Die Fallkartei ist ein privates, nicht-kommerzielles Fanprojekt. Es findet keine zentrale Verarbeitung persönlicher Nutzerkonten statt. Bei Fragen oder Fehlerhinweisen kann – sofern aktiviert – die Issue-Funktion des GitHub-Repositories verwendet werden.

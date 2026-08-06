# Änderungsverlauf

Alle wesentlichen Änderungen an Die Fallkartei werden in dieser Datei dokumentiert.

## 1.1.0 – 2026-08-07

### Neu

- freiwilliger Anzeigename für das persönliche Hörprofil
- automatisch erzeugte Initialen ohne Upload eines Profilbilds
- drei selbst wählbare Lieblingsfolgen in frei bestimmbarer Reihenfolge
- automatische Ergänzung freier Favoritenplätze aus den bestbewerteten Folgen
- personalisierter Profilbildexport mit Name, Initialen und eigener Top 3
- optionale Namenseinrichtung als erster Tutorialschritt
- einmaliger, überspringbarer Einrichtungshinweis beim ersten Öffnen des Profils

### Datenschutz

- Name und Favoriten bleiben lokal, werden in JSON-Backups übernommen und erscheinen nur auf bewusst erzeugten Statistikbildern.
- Die gesamte Personalisierung kann ohne Einschränkung übersprungen oder später wieder entfernt werden.

## 1.0.4 – 2026-08-07

### Behoben

- Die Fortschrittsleiste der Schnellbewertung verwendet jetzt die tatsächliche Anzahl der Folgen in der aktuellen Runde.
- Eine zusätzliche Anzeige „Folge X von Y“ erklärt eindeutig, wofür die Fortschrittsleiste steht.
- Nach der letzten Folge endet die Schnellbewertung mit einem klaren Abschlussbildschirm.
- „Meine Bewertungen“ im Hörprofil öffnet nun zuverlässig direkt die persönliche Bewertungsübersicht.

## 1.0.3 – 2026-08-07

### Verbessert

- Profilaktionen sind jetzt als eigener Abschnitt klar von den Geschmacksmerkmalen getrennt.
- Mehr Abstand nach den Profil-Chips und eine dezente Trennlinie sorgen für eine ruhigere visuelle Hierarchie.
- Die beiden Hauptaktionen bleiben auf normalen Smartphones nebeneinander und werden nur auf sehr schmalen Displays untereinander angeordnet.

## 1.0.1 – 2026-08-07

### Verbessert

- Sichtbarer Ladezustand beim Erstellen und Neuberechnen einer Smart Playlist.
- Deutlich schnellere Berechnung durch einmalig vorberechnete Empfehlungswerte.
- „Andere Vorschläge“ erzeugt jetzt eine tatsächlich andere Folgenkombination statt nur dieselben Folgen neu anzuordnen.
- Wenn die Filter keine sinnvolle Alternative zulassen, bleibt der bisherige Vorschlag erhalten und die App erklärt dies.

## 1.0.0 – 2026-08-06

Erster konsolidierter Release unter dem Namen **Die Fallkartei**.

### Enthalten

- vollständiges Rebranding mit neuem App-Icon
- installierbare und offlinefähige Progressive Web App
- lokaler Hörstatus, Bewertungen, Notizen und Hörverlauf
- persönliche Empfehlungen mit Begründung und Profilstärke
- Schnellbewertung mit Rückgängig-Funktion
- Suche nach Titel, Nummer, Figuren, Kapiteln, Handlung, Themen und Autoren
- Kompakt-, Detail- und Coveransicht
- Community-Ranking, eigene Bewertungen und persönliche Empfehlungsliste
- eigene, kuratierte und intelligente Playlists
- Smart-Playlist-Vorschau vor dem Speichern
- Hörwarteschlange „Als Nächstes“
- mehrere Streaminganbieter mit platzsparender Darstellung
- teilbares Hörprofil als PNG-Grafik
- JSON-Backups mit Vorschau, Zusammenführen und Ersetzen
- kontrollierte Service-Worker-Updates
- Diagnose- und Katalogprüfung
- Datenschutz-, Quellen- und Rechtehinweise

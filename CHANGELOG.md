# Änderungsverlauf

Alle wesentlichen Änderungen an Die Fallkartei werden in dieser Datei dokumentiert.

## 1.1.3 – 2026-08-07

### Feinschliff

- Beim Öffnen eines Profils, einer Folge oder eines anderen Fensters erhält nun das Fenster selbst den Fokus.
- Der weiße Fokusring erscheint deshalb nicht mehr automatisch um das Schließen-Symbol.
- Bei echter Tastaturbedienung bleibt der sichtbare Fokusring weiterhin erhalten.

## 1.1.2 – 2026-08-07

### Mobilbedienung

- Das Herunterziehen von Profil, Folgendetails und weiteren Bottom-Sheets funktioniert nun über native Touch-Events auf iPhone, iPad und Android.
- Die unsichtbare Trefferfläche des oberen Griffs wurde deutlich vergrößert, ohne den sichtbaren Balken größer wirken zu lassen.
- Die notwendige Zugstrecke wurde für Touchscreens natürlicher abgestimmt.
- Das Tippen auf den abgedunkelten Außenbereich besitzt nun zusätzlich einen Touch-Fallback.

## 1.1.1 – 2026-08-07

### Bedienung

- Profil, Folgendetails und weitere Bottom-Sheets lassen sich am oberen Griff nach unten ziehen und schließen.
- Ein Tipp in den abgedunkelten Bereich außerhalb eines Sheets schließt das Fenster ebenfalls.
- Kurze oder versehentliche Ziehbewegungen springen weich in die Ausgangsposition zurück.
- Das sichtbare `×` bleibt als eindeutige und barrierefreie Schließmöglichkeit erhalten.

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

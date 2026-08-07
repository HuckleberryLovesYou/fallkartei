# Änderungsverlauf

Alle wesentlichen Änderungen an Die Fallkartei werden in dieser Datei dokumentiert.

## 1.4.5 – 2026-08-07

### Smart Playlist

- der zusätzliche horizontale Trenner zwischen Zusammenfassung und Zusammenhangskarte wurde entfernt
- der vorhandene Abstand bleibt erhalten, sodass die Vorschau ruhiger und weniger technisch wirkt

## 1.4.4 – 2026-08-07

### Navigation

- die untere Tabbar ist jetzt Teil des festen App-Layouts statt ein überlagerndes `fixed`-Element
- die iPhone-Safe-Area wird dadurch nur noch an der tatsächlich benötigten Stelle berücksichtigt
- unnötiger Leerraum unter den Navigationselementen wurde deutlich reduziert
- die Tabbar ist kompakter, bleibt aber vollständig oberhalb des Home-Indikators bedienbar
- der Inhaltsbereich endet nun oberhalb der Tabbar und benötigt keinen künstlichen Navigationsabstand mehr
- die unabhängigen Scrollpositionen der fünf Haupttabs aus 1.4.3 bleiben unverändert erhalten

## 1.4.3 – 2026-08-07

### Navigation

- die fünf Haupttabs besitzen jetzt technisch voneinander unabhängige Scrollbereiche
- beim Tabwechsel wird die Fensterposition nicht mehr programmatisch nach oben oder unten verschoben
- jeder Tab bleibt unmittelbar an der Stelle stehen, an der er verlassen wurde
- dadurch entfällt die sichtbare Auf-/Abbewegung beim Wechsel zwischen unterschiedlich langen Seiten
- ein noch nicht benutzter Tab beginnt weiterhin oben
- erneutes Antippen des bereits aktiven unteren Tabs scrollt weiterhin bewusst weich zum Seitenanfang
- geöffnete Dialoge sperren auch die neuen internen Seiten-Scrollbereiche zuverlässig

## 1.4.2 – 2026-08-07

### Folgendetails

- das Cover einer Folge erscheint jetzt direkt im oberen Bereich der Folgendetails
- Titel, Folgentyp, Autor, Laufzeit und Veröffentlichungsdatum bleiben dort kompakt zusammen sichtbar
- ein Tipp auf ein vorhandenes Cover öffnet eine große, fokussierte Cover-Vorschau
- beim Schließen bleibt das Folgendetail geöffnet; die aktuelle Stelle in der App geht nicht verloren
- Folgen ohne verfügbares Cover behalten einen ruhigen Platzhalter ohne funktionslosen Vergrößerungsbutton
- die Cover-Vorschau funktioniert unabhängig davon, von welchem Bereich der App die Folgendetails geöffnet wurden

## 1.4.1 – 2026-08-07

### Fortschritt

- noch nicht veröffentlichte Folgen mit bestätigtem Zukunftsdatum zählen erst ab ihrem Veröffentlichungstag zum normalen 100%-Fortschritt
- reine Katalog-Platzhalter ohne Veröffentlichungsdatum bleiben sichtbar, zählen aber nicht zum Fortschritt
- ausdrücklich als Zusatzinhalt markierte Live-Fälle bleiben weiterhin außerhalb des normalen 100%-Zählers

### Folgenkatalog

- `Mehr laden` hängt nur noch die nächsten Folgen an die bestehende Liste an
- bereits sichtbare Cover werden dadurch nicht mehr entfernt und erneut aufgebaut
- der Abstand zwischen der letzten Folgenreihe und `Mehr laden` wurde vergrößert

### Navigation

- jeder Haupttab merkt sich seine zuletzt verlassene Scrollposition
- beim ersten Öffnen eines Tabs beginnt die Ansicht oben
- erneutes Antippen des bereits aktiven unteren Tabs scrollt weich zum Seitenanfang
- die Scrollanimation respektiert die Systemeinstellung für reduzierte Bewegung

## 1.4.0 – 2026-08-07

### Smart Playlist – Zusammenhänge

- die bisherige starre Blocklogik wurde durch ein gewichtetes Verbindungsnetz ersetzt
- starke Handlungsstränge werden bei aktivierter Option verpflichtend verwendet, sofern mindestens zwei passende Folgen in Filter und Zielzeit passen
- direkte Fortsetzungen, zentrale Gegenspieler, wiederkehrende Figuren und konkrete Rückbezüge besitzen unterschiedliche Gewichtungen
- überlappende Zusammenhänge sind möglich; eine Folge darf gleichzeitig zu mehreren Strängen gehören
- die letzten Vorschläge werden weiterhin gemieden, ohne erzählerische Zusammenhänge unnötig zu zerstören
- die Vorschau erklärt nun sichtbar, welcher Zusammenhang den Kern der Auswahl bildet
- hinterlegte Netze umfassen unter anderem Victor Hugenay, Brittany, Clarissa Franklin, Allie Jamison, Jelena Charkova, Dick Perry, Rubbish-George, Skinny Norris und konkrete Rückbezüge im dunklen Taipan
- die Hugenay-Chronik wurde korrigiert und um `Poltergeist` sowie `Der rote Büffel` ergänzt

### Live & Specials

- ergänzt wurden ausschließlich eigenständige Live-Geschichten: `Master of Chess`, `Phonophobia – Sinfonie der Angst` und `Der dunkle Taipan`
- Live-Versionen bereits vorhandener regulärer Geschichten werden nicht doppelt im Katalog geführt
- vorhandene Spotify- und Apple-Music-Ziele wurden hinterlegt; nicht belegte Anbieter werden nicht erfunden
- die drei Live-Originale erscheinen zusätzlich als kuratierte Liste
- Live-Originale können gehört, bewertet, gesucht, vorgemerkt und in Playlists verwendet werden
- sie verändern den normalen 100%-Fortschritt der Hauptsammlung nicht

### Cover

- fehlende Cover von Specials werden über die vorhandenen Apple-Music-Verweise ergänzt
- damit erhalten insbesondere die Weihnachtsfolgen und die neuen Live-Originale Cover
- Cover werden lokal zwischengespeichert und nach einem Katalog-Reload sofort erneut aufgelöst
- die App bleibt ohne Internet vollständig nutzbar; bei fehlender Verbindung greift weiterhin der vorhandene Platzhalter

## 1.3.8 – 2026-08-07

### Profilgrafik

- redundante Statuszeilen in kosmetischen Profilauszeichnungen wurden entfernt
- Badge-Titel und Beschreibungen nutzen den gewonnenen Platz ruhiger und ausgewogener
- die Darstellung bleibt in der App und auf teilbaren Profilbildern konsistent
- Debug-Vorschauen bleiben weiterhin eindeutig gekennzeichnet

## 1.3.7 – 2026-08-07

### Teilbares Hörprofil

- das frühere, ruhigere Profilkarten-Layout dient wieder stärker als gestalterische Grundlage
- Bewertungsbalken entfallen zugunsten einer klareren Hierarchie
- Geschmacksprofil und Favoriten wurden kompakter und persönlicher angeordnet
- Favoriten erscheinen wieder als gut lesbare Liste statt als große Einzelkarten
- kosmetische Profilauszeichnungen nutzen den verbleibenden Raum deutlich effizienter
- die Darstellung passt sich weiterhin dynamisch an vorhandene Auszeichnungen an

## 1.3.6 – 2026-08-07

### Teilbares Hörprofil

- die Profilgrafik wurde vollständig neu strukturiert
- Kernstatistiken und persönliche Favoriten besitzen nun klar getrennte Bereiche
- die Darstellung passt sich dynamisch an verfügbare Profilauszeichnungen an
- seltene kosmetische Auszeichnungen erhalten mehr Raum und eine deutlichere visuelle Hierarchie
- die Standardansicht bleibt auch ohne Auszeichnungen vollständig und ausgewogen
- überlappende Elemente der vorherigen Banneranordnung wurden entfernt

## 1.3.5 – 2026-08-07

### Profilgrafik

- die Darstellung einer seltenen kosmetischen Profilauszeichnung wurde auf teilbaren Bildern deutlich aufgewertet
- Hierarchie, Lesbarkeit und visuelle Gewichtung wurden verbessert
- überraschungsbezogene Einzelheiten bleiben bewusst undokumentiert

## 1.3.4 – 2026-08-07

### Feinschliff

- öffentliche Texte beim Teilen wurden weiter vereinfacht
- selten erreichbare Abschlusszustände und kosmetische Profildetails wurden technisch erweitert
- überraschungsbezogene Einzelheiten bleiben bewusst undokumentiert

## 1.3.3 – 2026-08-07

### Profil verbessern

- der Titel der aktuell vorgeschlagenen Folge kann nun direkt angetippt werden
- dadurch öffnet sich die vollständige Folgendetailansicht ohne Verlassen der Schnellbewertung
- aus den Folgendetails kann die Folge sofort zu „Als Nächstes“ oder einer eigenen Playlist hinzugefügt werden
- nach dem Schließen der Folgendetails bleibt die Schnellbewertung bei derselben Folge und demselben Fortschritt geöffnet
- es wurde bewusst kein zusätzlicher sichtbarer Aktionsbutton ergänzt

## 1.3.2 – 2026-08-07

### Abschlussmoment und Profil

- die Darstellung des dauerhaft erreichten 100%-Meilensteins wurde weiter verfeinert
- kosmetische Möglichkeiten für teilbare Profile wurden erweitert
- überraschungsbezogene Details bleiben bewusst undokumentiert

### Bedienung

- Pinch-Zoom und Doppeltipp-Zoom wurden appweit deaktiviert
- Browser-Zoom über Strg/Befehlstaste und Mausrad beziehungsweise Plus/Minus wird innerhalb der App unterdrückt
- interne Testoberflächen werden nach dem Beenden vollständig zurückgesetzt

## 1.3.1 – 2026-08-07

### Interne Tests

- interne Vorschauen laufen in einer vollständig nicht persistenten Sandbox
- während einer Vorschau werden keine Änderungen am regulären Datenstand gespeichert
- beim Beenden oder Neuladen wird der zuvor gespeicherte Zustand wiederhergestellt
- Testausgaben werden sichtbar als Vorschau gekennzeichnet

## 1.3.0 – 2026-08-07

### Startseitenempfehlung

- neuer Hörstatusfilter mit „Nur ungehörte“, „Nur gehörte“ und „Gehörte und ungehörte“
- keine unbemerkte Umschaltung von ungehörten auf gehörte Folgen mehr
- dieselbe Folge kann nicht zweimal direkt hintereinander vorgeschlagen werden, solange eine Alternative existiert
- bei genau zwei passenden Folgen wechseln sich beide zuverlässig ab
- die letzten Vorschläge werden innerhalb der aktuellen Filtersitzung nach Möglichkeit gemieden
- bei nur einer passenden Folge erscheint beim erneuten Suchen eine klare Meldung statt einer vorgetäuschten Neuauswahl
- gehörte Vorschläge bevorzugen länger nicht gehörte Folgen
- nach Filteränderungen beginnt die kurze Vorschlagshistorie neu
- Nutzer mit vollständig gehörtem Katalog können die Startseite als Wiederhören-Funktion weiterverwenden

### Vollständiges Archiv

- das erstmalige Erreichen von 100 Prozent wird dauerhaft als Meilenstein gespeichert
- später veröffentlichte Folgen nehmen einen bereits erreichten Abschluss nicht wieder weg
- der Abschluss erhielt einen besonderen Moment und zusätzliche kosmetische Details
- weitergehende Überraschungen werden im Änderungsverlauf bewusst nicht beschrieben

### Interne Tests

- für die Entwicklungsprüfung wurde ein nicht persistenter Vorschauweg ergänzt
- persönliche Daten und echte Freischaltungen bleiben dabei unverändert

## 1.2.4 – 2026-08-07

### Playlists

- jede eigene Playlist besitzt nun direkt eine Suche nach Folgen
- gesucht werden kann nach Folgennummer, Titel, Autor und Ära
- Suchergebnisse lassen sich über eine Plus-Taste sofort hinzufügen
- nach dem Erstellen einer Playlist öffnet sich unmittelbar deren Detailansicht
- auch nach dem Bearbeiten gelangt man zurück in die betreffende Playlist
- Playlistnamen in der Zuordnungsansicht einer Folge sind größer, weiß und deutlicher hervorgehoben

### Hörverlauf

- „1. Hören“ bezeichnet nun korrekt den ältesten Hörvorgang
- weitere Hörvorgänge werden chronologisch als 2., 3. usw. darunter einsortiert
- einzelne Hörvorgänge können durch Wischen nach links und Antippen des roten × gelöscht werden
- beim Löschen bleibt die Nummerierung automatisch korrekt
- wird der einzige Hörvorgang gelöscht, warnt die App vorher und setzt die Folge anschließend auf ungehört
- in diesem Sonderfall wird eine vorhandene Bewertung entfernt; Notiz und Playlistzuordnungen bleiben bestehen

## 1.2.3 – 2026-08-07

### Feinschliff

- im Playlist-Detailfenster wurde der Abstand unter „Alles als Nächstes“ und „Teilen“ vergrößert
- die Buttonzeile berührt die anschließende Trennlinie nicht mehr
- der vertikale Rhythmus entspricht nun dem bereits überarbeiteten Profilbereich

## 1.2.2 – 2026-08-07

### Empfehlungen

- die Verfeinerung auf der Startseite enthält nun zusätzlich Ära und Autor
- beide Auswahllisten werden dynamisch aus dem aktuellen Katalog erstellt
- Kombinationen wie „Crimebusters-Ära + ungehörte Folge“ sind damit direkt möglich
- beim Ändern eines Filters wird ein alter, nicht mehr passender Vorschlag ausgeblendet

### Katalog und Cover

- nach „Eingebauten Katalog neu laden“ werden Folgenwissen und Cover sofort erneut geladen
- ein Neustart der App ist für die Coverdarstellung nicht mehr erforderlich
- bei fehlender Internetverbindung bleibt der eingebaute Katalog nutzbar und die App zeigt einen ehrlichen Hinweis

### Als Nächstes

- als gehört markierte Folgen werden automatisch aus „Als Nächstes“ entfernt
- das gilt auch für Bewertungen, da eine Bewertung die Folge als gehört markiert
- weitere Hörvorgänge entfernen eventuell noch vorhandene alte Queue-Einträge ebenfalls
- die Folge bleibt weiterhin im Hörverlauf und in gespeicherten Playlists erhalten

## 1.2.1 – 2026-08-07

### Smart Playlists

- „Andere Vorschläge“ meidet nun vorübergehend die Folgen der letzten zwei verworfenen Vorschläge
- dieselbe Folgenmenge kann nicht mehr lediglich in anderer Reihenfolge erneut erscheinen
- aus mehreren ähnlich guten Kombinationen wird gewichtet eine abwechslungsreichere Auswahl getroffen
- bei engen Filtern wird der Cooldown schrittweise gelockert, statt sofort dieselbe Kombination zurückzugeben
- die Vorschlagshistorie gilt nur für die aktuelle Planung und wird nicht dauerhaft gespeichert
- jede Folge in der Vorschau lässt sich antippen und in der vollständigen Detailansicht prüfen
- nach dem Schließen der Folgendetails bleibt die ursprüngliche Playlist-Vorschau vollständig erhalten
- Speichern, „Als Nächstes übernehmen“, einzelne Folgen entfernen und neu generieren bleiben danach verfügbar

## 1.2.0 – 2026-08-07

### Installation

- neue geführte Installationshilfe beim Öffnen im normalen Browser
- automatische Unterscheidung zwischen iPhone/iPad, Android und Desktop
- Unterstützung der neuen kompakten Safari-Ansicht über „Drei Punkte → Teilen“
- alternativer Safari-Ablauf bei direkt sichtbarem Teilen-Symbol
- animierte Hinweise auf die ungefähre Position der benötigten Browserbedienelemente
- vereinfachte Safari-Darstellungen für „Teilen“, „Zu Home-Bildschirm hinzufügen“ und „Hinzufügen“
- direkter nativer Installationsbutton in unterstützten Android- und Chromium-Browsern
- verständlicher manueller Android-Ablauf als Fallback
- freiwillige Nutzung im Browser mit erneut aufrufbarer Installationshilfe

### Ersteinrichtung

- die Installationshilfe erscheint nur im normalen Browser
- beim Start über das installierte App-Symbol beginnt stattdessen die eigentliche App-Einführung
- bestehende lokale Bewertungen, Playlists und Einstellungen bleiben erhalten
- die bestehende PWA-Identität und der GitHub-Pages-Pfad bleiben unverändert

## 1.1.4 – 2026-08-07

### Feinschliff

- Das blaue `+` in den Bewertungs-Pills wurde optisch minimal nach oben ausgerichtet.
- Dadurch sitzt das Plus in der kompakten Folgenliste und ähnlichen Statusanzeigen sauberer mittig.

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

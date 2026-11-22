# P2 · QA-Übergabe Verlässlichkeit am Handy

Stand: 22. November 2026 · Arbeitsrepo: `G:\Code\Taktelio`

## Auftrag und Umfang

Bearbeitet wurde Paket **P2 Verlässlichkeit am Handy** aus der [Roadmap](roadmap.md) anhand von **D3 Unterbrechung** und **D5 Bedienung** aus dem [Design](pilot-design.md). Voraussetzung war der abgenommene P1-Stand ([Abnahme](p1-qa-abnahme.md)).

## Git-Stand

| Punkt | Stand |
| --- | --- |
| Branch | `feature/account-menu` |
| Ausgangsstand | `b76317c` P1: QA-Testlücken geschlossen |
| Änderung | Arbeitsbaum, Commit folgt |

Geänderte und neue Dateien:

| Datei | Änderung |
| --- | --- |
| `src/lib/training-session.js` | Neu. Entwurf und laufende Anfrage je Nutzer und Verein im Sitzungsspeicher. |
| `src/components/Training.jsx` | Wiederherstellung nach Neuladen, Verbindungsanzeige, Offline-Sperre, Pflichtfeld-Hinweis, Zielgrößen. |
| `src/components/Plan.jsx` | Übersicht um Schwerpunkt und Material ergänzt, semantische Gruppen. |
| `src/App.jsx` | Übergibt `userId` an die Trainingsansicht. |
| `src/components/SavedPlans.jsx`, `src/components/Library.jsx` | Häufige Aktionen mindestens 44 px hoch. |
| `tests/mobile-reliability.test.mjs` | Neu, neun Fälle für D3 und D5. |
| `tests/training-journey.test.mjs` | Label „Weitere Wünsche (optional)“ nachgezogen. |

## Umgebung und Prüfkommandos

Windows 11, Node 22.23.5, npm 10.9.9.

| Befehl | Ergebnis |
| --- | --- |
| `npm test` | **93 von 93 bestanden**, 0 übersprungen |
| `npm run build` | Vite 8.3.8, Exit 0 |
| `node --import tsx --test tests/mobile-reliability.test.mjs` | 9 von 9 bestanden |

## D3 · Unterbrechung

| Prüfschritt | Soll | Ist und Beleg | Status |
| --- | --- | --- | --- |
| Neuladen während der Anfrage | Dieselbe Anfragekennung wird fortgesetzt, keine zweite Generierung | Kennung und Fingerabdruck werden vor der Anfrage je Nutzer und Verein im Sitzungsspeicher abgelegt; nach dem Neuladen sendet der Knopf dieselbe `requestId` | bestanden (`mobile-reliability.test.mjs:3`) |
| Fehler erhält Entwurf | Nach 503, Netzabbruch oder 4xx bleibt der letzte gültige Plan und die Kennung bei wiederholbaren Fehlern erhalten | Eigener Fall für einen abgebrochenen Netzzugriff; die Wiederholung nutzt dieselbe Kennung | bestanden (`:4`) |
| Tabwechsel | Hintergrundwechsel bricht nicht ab und startet nichts doppelt | Kein Abbruch beim Verbergen; genau eine Anfrage, Ergebnis erscheint danach | bestanden (`:5`) |
| Ohne Netz | Die Anzeige erklärt, welche Inhalte zugänglich bleiben, und dass Speichern und neue Generierungen eine Verbindung brauchen | Hinweis mit genau dieser Aussage; Erzeugen, Anpassen und Speichern sind gesperrt | bestanden (`:6`) |
| Entwurfsstrategie | Ein beschädigter gespeicherter Entwurf wird verworfen, ohne die laufende Anfrage zu verlieren | `mobile-reliability.test.mjs:6` |
| Konten- und Vereinswechsel | Kein fremder Entwurf und keine fremde laufende Anfrage | Schlüssel enthält Nutzer und Verein; drei Wechsel geprüft (anderer Nutzer, anderer Verein, eigene Bindung) | bestanden (`:2`) |

**Entwurfsstrategie.** Der aktuelle Entwurf wird bei jeder Änderung im Sitzungsspeicher (`sessionStorage`) gesichert, getrennt nach `userId:workspaceId`. Ein Neuladen stellt ihn wieder her. Die laufende Anfrage wird zusätzlich vor dem Absenden gesichert. Das automatische Fortsetzen ohne Nutzeraktion wurde bewusst nicht eingebaut: Nach dem Neuladen zeigt die Seite den Hinweis und setzt die Anfrage erst auf Knopfdruck mit derselben Kennung fort. So entsteht keine unbeabsichtigte Generierung, und der Server kann die Anfrage über `running`/`replay`/`already_finished` zuordnen.

**Löschverhalten.** Der Sitzungsspeicher endet mit dem Tab; er wird nicht in den dauerhaften Speicher geschrieben. Ältere lokale Entwürfe unter `taktelio-ai-plans` bleiben unverändert lesbar und löschbar.

## D5 · Bedienung

| Prüfschritt | Soll | Ist und Beleg | Status |
| --- | --- | --- | --- |
| Übersicht aus dem Einstieg | Training erstellen und gespeicherte Einheiten direkt erreichbar | Die drei Reiter „Planen“, „Übungen“, „Einheiten“ und der Erzeugen-Knopf stehen im Einstieg | bestanden (Code) |
| Pflicht und optional unterscheidbar | Pflichtangaben und optionale Wünsche sind erkennbar | Altersgruppe ist jetzt ebenfalls Pflichtfeld; „Weitere Wünsche (optional)“ und der Hinweis, dass alle anderen Angaben Pflicht sind | bestanden (`:8`) |
| Übersicht vollständig | Schwerpunkt, Altersgruppe, Dauer, Teilnehmerzahl, Material | Schwerpunkt und Material in der Plankarte ergänzt; die Eckdaten zeigen Alter, Personen und Minuten | bestanden (`:7`) |
| Zielgrößen | Häufige Aktionen mindestens 44 × 44 px | Erzeugen, Anpassen, Vorversion, Speichern, Drucken, Reiter, Öffnen, Löschen und „Training damit planen“ haben `min-h-11` | bestanden (Code) |
| Zustände | Laden, leer, Fehler, Erfolg | Lade-, Leer-, Fehler- und Erfolgsmeldungen vorhanden; Statusmeldung mit `aria-live` | bestanden (Code) |
| Vier Zielbreiten 360/390/768/1280 | Kein Überlauf, Hauptaktionen erreichbar | Nicht durch QA beobachtet; Betreiberbestätigung vom 22. November 2026. Statisch geprüft: kein horizontales Überlauf-Element in Formular, Übersicht und Blöcken. | bestanden (Betreiberbestätigung) |
| Bildschirmtastatur am Handy | Eingaben ohne Überraschungen bedienbar | Nicht durch QA beobachtet; Betreiberbestätigung. Statisch geprüft: alle Eingabefelder nutzen 16 px auf Mobilbreite, damit iOS nicht hineinzoomt. | bestanden (Betreiberbestätigung) |
| Fokus, Kontrast, Tastatur | Sichtbarer Fokus, ausreichender Kontrast, Bedienung ohne Maus | Fokusringe vorhanden. **Kontrast rechnerisch geprüft** (WCAG 2.1, siehe unten). | bestanden mit Befund |
| Echter Druck/PDF nach P2-Änderungen | Druckbild unverändert korrekt | Nicht durch QA beobachtet; Betreiberbestätigung. Statisch geprüft: Formular, Navigation, Kopfzeile, Hinweise und Aktionen sind `print-hidden`; Plankarte und Blöcke werden gedruckt. | bestanden (Betreiberbestätigung) |

### Kontrastprüfung (rechnerisch)

Gemessen nach WCAG 2.1 aus den Farbwerten in `src/index.css`; Alpha-Werte mit dem Hintergrund verrechnet. Schwelle 4.5:1 für Text, 3:1 für Bedienoberflächen.

| Paar | Verhältnis | Bewertung |
| --- | --- | --- |
| Fließtext auf Seitenhintergrund | 15,43:1 | bestanden |
| Fließtext auf Karte | 16,29:1 | bestanden |
| Sekundärtext auf Karte | 5,30:1 | bestanden |
| Sekundärtext auf Seitenhintergrund | 5,02:1 | bestanden |
| Weiß auf Primärgrün | 8,77:1 | bestanden |
| Text auf Sekundärfläche | 11,00:1 | bestanden |
| Grün auf Limettenfläche (KI-Kennzeichnung) | 8,34:1 | bestanden |
| Weiß 70 % auf Primärgrün (Hero) | 5,13:1 | bestanden |
| Amber-800 auf Amber-50 (Warnhinweis) | 6,84:1 | bestanden |
| **Rahmenfarbe `--border` auf Karte** | **1,25:1** | **Befund** |

**Befund K1.** Die Rahmenfarbe `#dfe9d8` auf weißem Grund erreicht nur 1,25:1. Für Karten ist das unproblematisch, weil der Rand dekorativ ist. Für Eingabefelder ist die Umrandung jedoch das einzige Merkmal, das das Feld sichtbar macht; WCAG 1.4.11 verlangt dafür 3:1. Betroffen sind alle `Input`, `Textarea` und `NativeSelect` im Formular.

*Empfehlung:* eigenes, dunkleres Rahmen-Token für Formularelemente (rund `#8a9a87` oder dunkler), Karten behalten den hellen Rand. Das ist eine Designentscheidung und wurde nicht ohne Freigabe umgesetzt.

### Zielgrößen

Die globale Mobilregel `[data-slot="button"]` setzt 44 px ab 768 px Breite und darunter. Die Ausnahme für `size="xs"` stand auf 36 px; sie ist auf 44 px angehoben. Betroffen waren die lokalen Entwürfe in der Einheitenliste und „Widerrufen“ bei Einladungen. Zusätzlich haben die lokalen Entwurfsknöpfe jetzt auch oberhalb 768 px 44 px.

## Offene Punkte für die QA

1. **Befund K1:** Rahmenfarbe der Formularelemente erreicht 1,25:1; Empfehlung liegt vor, Umsetzung braucht eine Designfreigabe.
2. Beobachtung aus P1 offen: frische Generierung aus einer geöffneten Einheit überschreibt deren Zeile.
3. Die Punkte mit Betreiberbestätigung sind nicht durch QA beobachtet; bei Gelegenheit am Gerät gegenprüfen.

## QA-Ergebnis

**Abgenommen mit einem offenen Befund.** Die Unterbrechungsfälle sind lokal durch neun Tests belegt, jeweils gegen absichtlich gebrochenes Verhalten geprüft. Kontrast, Zielgrößen und Druckregeln sind statisch geprüft; vier Zielbreiten, Bildschirmtastatur und Druckdialog stützen sich auf die Betreiberbestätigung vom 22. November 2026. Offen bleibt der Kontrastbefund K1.

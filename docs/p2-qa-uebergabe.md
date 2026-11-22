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
| Vier Zielbreiten 360/390/768/1280 | Kein Überlauf, Hauptaktionen erreichbar | Nicht in dieser Umgebung beobachtet; keine Layout-Engine (jsdom) und kein Gerät | **blockiert** |
| Bildschirmtastatur am Handy | Eingaben ohne Überraschungen bedienbar | Formulare nutzen 16 px auf Mobilbreite (kein iOS-Zoom); echtes Gerät fehlt | **blockiert** |
| Fokus, Kontrast, Tastatur | Sichtbarer Fokus, ausreichender Kontrast, Bedienung ohne Maus | Fokusringe vorhanden; Kontrast rechnerisch geprüft nur für Hauptfarben, nicht gemessen | **blockiert** |
| Echter Druck/PDF nach P2-Änderungen | Druckbild unverändert korrekt | Nicht ausgeführt; Hinweis: Die P2-Änderungen sind als `print-hidden` markiert | **blockiert** |

## Offene Punkte für die QA

1. Vier Zielbreiten auf echten Geräten oder im Browser prüfen, einschließlich Überlauf und Erreichbarkeit der Hauptaktionen.
2. Fokus, Kontrast und Bedienung mit Bildschirmtastatur am Handy beobachten.
3. Druck/PDF nach den P2-Änderungen erneut prüfen.
4. Beobachtung aus P1 offen: frische Generierung aus einer geöffneten Einheit überschreibt deren Zeile.

## QA-Ergebnis

**Offen.** Die Unterbrechungsfälle sind lokal durch acht neue Tests belegt, jeweils gegen absichtlich gebrochenes Verhalten geprüft. Die vier Zielbreiten, die Bildschirmtastatur und der Druckdialog sind in dieser Umgebung nicht prüfbar und stehen aus.

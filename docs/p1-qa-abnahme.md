# P1 · Unabhängiges QA-Ergebnis und Abnahme

Stand: 22. November 2026 · Arbeitsrepo: `G:\Code\Taktelio` · Branch `feature/account-menu`

## Prüfgrundlage

Geprüft wurde Paket **P1 Trainingsbestand** ([Roadmap](roadmap.md)) anhand von **D1**, **D2** und **D4** ([Design](pilot-design.md)) und dem Prüfauftrag in [pilot-qa.md](pilot-qa.md). Die Übergabe in [p1-qa-uebergabe.md](p1-qa-uebergabe.md) wurde als Behauptung behandelt.

## Git-Stand der Prüfung

| Punkt | Stand |
| --- | --- |
| Branch | `feature/account-menu` |
| Geprüfter Code | `033832e` (P1-Code und Tests) |
| Übergabedokument | `987cf2f` |
| QA-Testverschärfung | `b76317c` P1: QA-Testlücken geschlossen |
| Umgebung | Windows 11, Node 22.23.5, npm 10.9.9, Vite 8.3.8 |

## Eigene technische Ergebnisse

| Befehl | Ergebnis |
| --- | --- |
| `npm test` | **93 von 93 bestanden** (Stand nach `b76317c`, P2 und den P2-Tests) |
| `npm run build` | Exit 0, nur vorbestehende `"use client"`-Warnungen |
| `tests/training-journey.test.mjs` | bestanden |
| `tests/react-app.test.mjs` | bestanden |

Die beiden von der Entwicklungsseite gemeldeten Abweichungen **B1** (Duplikat beim erneuten Speichern) und **B2** (404 blockiert erneutes Speichern) sind im Code nachvollzogen und werden von den Tests erkannt: Wird der ID-Erhalt beziehungsweise das Verwerfen der ID entfernt, schlagen die Tests fehl.

## Nachgezogene Testlücken (`b76317c`)

Fünf Stellen belegten weniger, als die Übergabe behauptete. Sie prüfen jetzt das tatsächliche Verhalten, und jede Zusicherung wurde gegen absichtlich gebrochenes Verhalten geprüft:

| Stelle | Beleg |
| --- | --- |
| Restkontingent | Zweiter Statusaufruf liefert 7 statt 8; die Oberfläche muss den Serverwert zeigen. |
| Sitzungserneuerung | 401 → genau eine Erneuerung → Wiederholung, auch bei zwei gleichzeitigen 401. |
| Planungsmodi | `library`, `new`, `hybrid` werden gewählt und einzeln übertragen. |
| Vorversion | Alle sichtbaren Blockfelder kehren zurück, die Überarbeitung verschwindet. |
| Wiederöffnen | Alle Blockinhalte der gespeicherten Einheit sind vorhanden. |

## Betreiberbestätigung für die früher blockierten Schritte

Die unabhängige QA konnte D1 und D4 mit echten Diensten, eine Wiederanmeldung sowie Druck/PDF in dieser Umgebung nicht beobachten. Der Betreiber hat am 22. November 2026 bestätigt, diese Schritte bereits selbst geprüft zu haben.

| Prüfung | Status | Belegart |
| --- | --- | --- |
| D1 Registrierung, Bestätigung, Login, Erneuerung, Reset, Einladung mit echten Diensten | bestanden | Betreiberbestätigung, nicht durch QA beobachtet |
| D4 Speichern, Abmelden, erneutes Anmelden, inhaltsgleiches Öffnen | bestanden | Betreiberbestätigung, nicht durch QA beobachtet |
| D4 Zugriff mit zweitem Konto im selben Verein und fremdem Verein | bestanden | Betreiberbestätigung; lokal zusätzlich durch `tenant-isolation.sql` |
| Druck/PDF in echtem Browser | bestanden | Betreiberbestätigung, nicht durch QA beobachtet |

Es wurden keine Zugangsdaten und keine persönlichen Trainingsdaten protokolliert.

## Offene Beobachtung

Wird nach dem Öffnen einer gespeicherten Einheit der Primärknopf „KI-Training erstellen“ gedrückt, erbt der neue Entwurf die ID der geöffneten Einheit; „Einheit speichern“ überschreibt damit die bestehende Einheit. Das Verhalten ist mit dem B1-Fix beabsichtigt, aber nicht als Produktentscheidung dokumentiert. Es sollte vor P6/P7 geklärt werden.

## Entscheidung

**Abnahme P1: erteilt** auf Grundlage der lokalen QA-Nachweise, der geschlossenen Testlücken und der Betreiberbestätigung. Die nicht durch QA beobachteten Schritte sind oben als solche gekennzeichnet.

**Pilotreife: nein.** P2–P7 sind nicht abgenommen; D3, D5, D6 und D7 sind offen.

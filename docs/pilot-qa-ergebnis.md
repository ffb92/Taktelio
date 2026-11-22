# QA-Befund zur Planungsübergabe · 22. November 2026

Archiv der früheren Planungsprüfung der Arbeitskopie C:\Users\Admin\Documents\ChatGPT\Taktelio\projekt. Die damaligen Zeilennummern, 50 Tests und die Planungsabnahme beziehen sich auf diese Kopie. Für G:\Code\Taktelio wurden bei der inhaltlichen Durchsicht am 22. November 2026 separat die lokalen Suites age-rules, training-plan, events und database mit Node 22.23.5 ausgeführt. Ergebnis: 27 von 27 bestanden. Dies ist ein technischer Teilnachweis. Die unabhängige Pilotabnahme im Zielrepository steht aus.

**Planung fachlich abgenommen.** Alle sieben Design-IDs haben eine Entwicklungsaufgabe und prüfbare Abnahmekriterien. Der Nachtest schließt die fünf Befunde der Erstprüfung. Die formale Anforderung an die Claude-Autorenschaft bleibt offen, weil der Anbieter laut Übergabe Sonnet ablehnt.

**Pilotfreigabe: blockiert.** Übergeben wurden Planungsunterlagen und ein QA-Auftrag. Alle Entwicklungspunkte sind offen. Für den Pilot fehlen der durchgehende Ablauf mit echten Testdiensten, die mobilen Unterbrechungsprüfungen, die fachliche Trainerabnahme und der beobachtete Kernablauf am Handy.

## Prüfstand und technische Basis

Arbeitsrepo `projekt`, Branch `main`, HEAD `f81b9073a99231362b3c23ccad258774f7adbab0`. Bei Prüfbeginn meldete `git status --short` eine geänderte `.gitignore` sowie sechs unversionierte Dateien: die drei Prüfdokumente und `scripts/planr-api-probe.mjs`, `scripts/planr-sample.mjs`, `scripts/prepare-private-exercises.mjs`. Die drei Skripte gehörten zu keinem übergebenen Pilotpaket.

| Prüfung | Umgebung und Befehl im Arbeitsrepo | Eigener Befund | Status |
| --- | --- | --- | --- |
| Tests einschließlich SQL | Windows, Node 22.23.5, npm 10.9.9, `npm.cmd test` | 50/50 bestanden, 0 übersprungen. Einschließlich PGlite-Prüfungen für Schema, Einladungen, KI-Limits und Mandantentrennung. Beim ersten Lauf scheiterte allein der HTTP-Adaptertest an der Loopback-Sperre (`connect EACCES 127.0.0.1`, `tests/dev-api.test.mjs:6`). Der Gesamtlauf mit erlaubtem Loopback bestand ohne Codeänderung. | bestanden |
| Build | Gleiche Umgebung, `npm.cmd run build` | Vite 8.3.8 verarbeitete 27 Module und erzeugte HTML, CSS und JavaScript in `dist/client`. Exitcode 0. | bestanden |

## Erstprüfung vor der Korrektur

Stand und Umgebung aller Zeilen sind der oben erfasste lokale Dokumentenstand. Der Status bewertet die **Planungsprüfung**. Zur Reproduktion die angegebene Stelle in [PROJEKT.md](../PROJEKT.md) mit den drei Zeilenangaben in dieser Reihenfolge vergleichen: [Design](pilot-design.md), [Checkliste](entwicklungsplan-entwurf.md), [QA-Auftrag](pilot-qa.md). Bei Lücken beschreibt die Spalte „Ist und Auswirkung“, welcher Ablauf trotz abgearbeiteter Checkliste ungeprüft bleiben könnte.

| ID | Soll aus PROJEKT.md | Ist und Auswirkung | Status | Beleg (Design / Checkliste / QA) |
| --- | --- | --- | --- | --- |
| D1 | §§ 3–4, 6: Kontozugang, Sitzung, Reset und Einladung bis in den richtigen Verein | Aufgabe und Prüfschritte decken den Ablauf ab. Zielverein und Rolle lassen sich mit anonymen Kontokennungen prüfen. | bestanden | 7 / 8 / 14 |
| D2 | §§ 3, 5: Plan erzeugen, anpassen, bei Fehler behalten und auf Wunsch die Vorversion wiederherstellen | Erhalt von Eingaben und Plan im Fehlerfall ist prüfbar. Der Vergleich nach einer erfolgreichen Änderung und anschließender Rückkehr zur Vorversion fehlt. Auch die Rückmeldung zum Restkontingent hat keinen Prüfschritt. | fehlgeschlagen | 8 / 9 / 15 |
| D3 | § 5 „Verlässliche Planung“: dieselbe Anfrage bei Unterbrechung, Entwurfsschutz und verständliche Auskunft bei fehlendem Netz | Kennung, Anzahl der Generierungen und Konten-/Vereinsgrenzen sind prüfbar. Die Strategieentscheidung ist zugewiesen. Ein eigener Tabwechsel sowie die Anzeige, was ohne Verbindung verfügbar ist, fehlen als explizite Prüfungen. | fehlgeschlagen | 9 / 10 / 16 |
| D4 | §§ 2–5: persönlicher Plan nach Anmeldung inhaltsgleich verfügbar, gültige Altentwürfe nutzbar | Inhaltsvergleich, Prüfung mit je einem fremden Konto im selben und im anderen Verein sowie Öffnen eines Altentwurfs sind zugeordnet. | bestanden | 10 / 11 / 17 |
| D5 | § 5 „Bedienung auf dem Handy“: Einstieg, gegliedertes Formular, vollständige Übersicht, lesbare Blöcke und bedienbare Aktionen | Vier Breiten, Überlauf, 44 × 44 Pixel, Fokus, Kontrast, Zustände und Bildschirmtastatur sind prüfbar. Es fehlen konkrete Kontrollen für die Hauptaktion „Training erstellen“, den Direktzugriff auf Einheiten, Pflicht-/Optionalfelder und die fünf Angaben der Planübersicht. | fehlgeschlagen | 11 / 12 / 18 |
| D6 | §§ 5–6: fester Trainingsfallsatz mit Trainern, exakte Dauer, alle Spieler je Block, passende Inhalte und KI-Kennzeichnung | Falltypen, Messgrößen und Trainerurteil sind vorgesehen. Konkrete wiederholbare Eingabesätze mit Sollwerten fehlen. Ohne sie können zwei Prüfer unterschiedliche Einheiten abnehmen. Für den Hinweis zu Spielernamen und Gesundheitsdaten fehlt ebenfalls ein Prüfpunkt. | fehlgeschlagen | 12 / 13 / 19 |
| D7 | §§ 5–6: P0 und mobiler Kernablauf belegt, Platztest und betriebliche Voraussetzungen dokumentiert | Freigabeschwelle und Platztest sind zugeordnet. D7 nennt unter anderem Budget, Rechte und Wiederherstellung. Der Rückverweis der Checkliste lässt die Prüfung datensparsamer Servermeldungen sowie Zuständigkeit und Nutzerinformation zur Kontolöschung vor öffentlichem Betrieb offen. | fehlgeschlagen | 13 / 14 / 20 |

## Nachtest der korrigierten Planungsunterlagen

Lokaler Dokumentenabgleich am 22. November 2026 auf demselben HEAD. Die Entwicklungscheckliste (Zeile 17) verpflichtet zur Detailabnahme, der QA-Auftrag (Zeile 26) zur unabhängigen Wiederholung. Beide verweisen auf denselben Abschnitt im Design. Die Belege unten nennen dessen Zeilen. Für den unveränderten Produktstand gelten die oben protokollierten Tests und der Build aus der Erstprüfung.

| ID | Soll aus der Erstprüfung | Ist im überarbeiteten Design | Planungsstatus |
| --- | --- | --- | --- |
| D2 | Rückkehr zur Vorversion und richtiges Restkontingent belegen | Nach erfolgreicher Änderung alle wiederhergestellten Blöcke vergleichen und das angezeigte Kontingent am Serverwert prüfen (Z. 19). | bestanden |
| D3 | Tabwechsel und Nutzerinformation bei Netzausfall getrennt prüfen | Tabwechsel während laufender Anfrage ergänzt. Die Offline-Anzeige muss zugängliche Inhalte benennen und auf die Verbindungspflicht für neue Generierungen hinweisen (Z. 9, 20). | bestanden |
| D5 | Einstieg, Pflichtangaben und vollständige Übersicht prüfen | Beide direkten Einstiegsaktionen, Unterscheidung von Pflichtangaben und Wünschen sowie Schwerpunkt, Altersgruppe, Dauer, Teilnehmerzahl und Material sind einzeln prüfbar (Z. 21). | bestanden |
| D6 | Feste Fälle mit Sollwerten und Datenschutzhinweis | A, B und C sind einzeln definiert (siehe unten). Der Formularhinweis umfasst Spielernamen und Gesundheitsdaten. Fachurteil und Text-Grafik-Abgleich sind zugeordnet (Z. 12, 22–28). | bestanden |
| D7 | Datensparsame Fehlerdiagnose und Verantwortung für Kontolöschung belegen | Ausgelöster Testfehler mit Kontrolle der Servermeldungen auf Passwörter, Tokens und unnötige Trainingsinhalte. Für die Kontolöschung sind zuständige Stelle, Ablauf und auffindbare Nutzerinformation nachzuweisen (Z. 30). | bestanden |

**D6 – Einzelprüfung der Fallvorgaben.** Die Trainerurteile und Messwerte aus der Durchführung stehen für alle drei Fälle aus.

| Fall | Geprüfte Eingabe | Prüffähiges Soll |
| --- | --- | --- |
| A (Z. 26) | U11, Dribbling, 20 × 15 m, 3 Bälle | Insgesamt 45 Minuten, alle 9 Spieler in jedem Block, Aufbau mit 3 Bällen durchführbar. |
| B (Z. 27) | U15, Passspiel, 30 × 20 m, 7 Bälle, 8 Hütchen | Insgesamt 60 Minuten, alle 14 Spieler in jedem Block, Fläche und Material eingehalten. |
| C (Z. 28) | Plan aus B mit „nur noch 5 Bälle“ überarbeiten | Weiterhin 60 Minuten, alle 14 Spieler in jedem Block, höchstens 5 Bälle, Vorversion abrufbar. |

## Offene Nachweise

Die Praxisprüfungen D1–D7 stehen aus. Für D1/D2/D4 fehlen in der Übergabe ein verifiziertes separates Testprojekt mit Testpostfach, Testmodellzugang und drei passend zugeordneten Testkonten. D3 braucht eine festgelegte Entwurfsstrategie und einen beobachteten Wiederholungsversuch je Unterbrechung. Für D5–D7 fehlen Messungen am echten Handy, Trainerurteile zu A, B und C, ein protokollierter Platztest und die einzelnen Betriebsnachweise.

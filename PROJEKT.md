# Taktelio – Projekt und Produktrichtung

Stand: 15. November 2026. Dieses Dokument beschreibt Produktziel, bestehenden Umfang und nächste Schritte. Es wird bei Produktentscheidungen und abgeschlossenen Arbeitspaketen aktualisiert. Technische Einrichtung steht im [README](README.md), Prüfnachweise im [technischen Bericht](docs/technical-readiness.md).

## 1. Ziel

Taktelio soll Fußballtrainern helfen, mit wenig Aufwand ein passendes Training vorzubereiten und auf dem Platz durchzuführen. Die App wird primär auf dem Handy genutzt und soll auch am PC gut funktionieren.

**Die erste Kernfunktion ist das Generieren von Trainingsplänen mit KI.** Trainer geben ihre Rahmenbedingungen ein, erhalten einen verständlichen Trainingsentwurf, passen ihn an und speichern ihn für die spätere Nutzung.

Erfolg bedeutet zunächst: Ein Trainer kann ohne Erklärung eine Einheit vorbereiten und sie später auf dem Handy am Platz wiederfinden und verwenden.

## 2. Produktentscheidungen und Arbeitsannahmen

| Thema | Richtung | Status |
|---|---|---|
| Zielgruppe | Fußballtrainer | Vom Nutzer vorgegeben |
| Hauptgerät | Handy; PC wird ebenfalls unterstützt | Vom Nutzer vorgegeben |
| Erste Kernfunktion | KI-Trainingsplanung | Vom Nutzer vorgegeben |
| Bereitstellung | Zunächst responsive Web-App im Browser | Arbeitsannahme auf Basis des vorhandenen Projekts |
| Installation | Später als PWA auf dem Startbildschirm möglich | Vorschlag, noch nicht umgesetzt |
| Vereinsbezug | Bestehende Konten und Vereinszuordnung weiterverwenden | Vorschlag auf Basis des Bestands |
| Planfreigabe | Pläne bleiben zunächst persönlich; eigene Übungen sind im Verein sichtbar | Bestehendes Verhalten, keine neue Freigabe beschlossen |
| Weitere Module | Erst Trainingsplanung fertigstellen; Social Media und Scouting zurückstellen | Vorschlag zur Priorisierung |

„App“ setzt für diese erste Version keine native iOS-/Android-App und keinen App-Store-Release voraus. Falls das gewünscht wird, ist es eine gesonderte Produktentscheidung.

## 3. Der wichtigste Nutzerablauf

1. **Einsteigen:** Konto erstellen oder anmelden; Verein anlegen oder einer Einladung folgen.
2. **Training beschreiben:** Altersgruppe, Anzahl der Teilnehmenden, Dauer, Schwerpunkt, Material und Platz angeben. Besondere Wünsche ergänzen.
3. **Plan erstellen:** Generierung starten und verständliche Rückmeldung zum Fortschritt, zu Fehlern oder zum verbleibenden Kontingent erhalten.
4. **Entwurf prüfen:** Übungen, Zeiten, Gruppen, Aufbau, Material, Ablauf und Coachingpunkte überblicken.
5. **Anpassen:** Zum Beispiel weniger Umbauten, einfachere Übungen oder ein anderes Trainingsziel anfordern. Vorherigen Entwurf bei Bedarf wiederherstellen.
6. **Speichern:** Die fertige Einheit im eigenen Konto innerhalb des Vereins ablegen.
7. **Am Platz nutzen:** Gespeicherte Einheit schnell öffnen, nächsten Übungsblock finden und Aufbau sowie Coachingpunkte lesen.

Für die erste Version ist dieser vollständige Ablauf wichtiger als zusätzliche Navigationspunkte oder Verwaltungsfunktionen.

## 4. Was bereits vorhanden ist

„Vorhanden“ bedeutet im lokalen Code umgesetzt. Es bedeutet nicht automatisch, dass die Änderung veröffentlicht oder der gesamte Ablauf mit echten Diensten geprüft ist.

| Bereich | Vorhandener Umfang | Grenze / noch offen |
|---|---|---|
| Konten | Registrierung, Anmeldung, E-Mail-Bestätigung, Session-Erneuerung, Abmeldung, Passwortänderung und Reset | Anmeldung und Passwort-Reset am 14. November 2026 mit echten Konten und Mails bestätigt; Registrierung mit Bestätigung, Session-Erneuerung, Abmeldung und Passwortänderung nicht vollständig nachgewiesen |
| Profil | Namen, Anzeigename, Mannschaft als Freitext und Qualifikation | Keine eigenständige Mannschaftsverwaltung |
| Vereine | Anlegen, Umbenennen, Vereinswechsel und Rollenprüfung | Keine vollständige Oberfläche für Rollenwechsel oder Mitgliedsentfernung |
| Einladungen | Link erstellen, Vorschau, Empfängerbindung, Annahme, Ablauf und Widerruf | Links werden manuell weitergegeben; kein automatischer Einladungsversand |
| KI-Planung | Altersgruppe, 6–24 Teilnehmende, 30–120 Minuten, Schwerpunkt, Material, Fläche und Wünsche | Grenzen des aktuellen Produkts, nicht zwingend endgültige Zielgrenzen |
| Altersregeln | Spielform, Ballgröße, Kopfball und Feldgröße je Altersgruppe als gemeinsame Tabelle (`shared/age-rules.mjs`), im Modellauftrag und in der Prüfung verbindlich; ein Verstoß löst eine Korrekturrunde aus und wird sonst verständlich abgelehnt | Grundlage sind die DFB-Wettbewerbsformen 2024/25 und DFB-Kopfballhinweise; Landesverbände können abweichen, fachliche Freigabe fehlt |
| Planungsmodi | Grundstock + neue Ideen, nur Grundstock, neue Übungen | Bedienung und verständliche Auswahl auf dem Handy noch zu verbessern |
| Trainingsplan | Phasen, Minuten, Gruppen, Aufbau, Material, Ablauf, Coachingpunkte, Varianten und schematische Feldgrafiken | Fachliche Qualität und Verständlichkeit müssen mit Trainern geprüft werden |
| Anpassung | Überarbeitung per Texteingabe und Rückkehr zur vorherigen Version | Kein vollständiger Versionsverlauf und keine manuelle Blockbearbeitung |
| Bibliothek | 40 gemeinsame Übungsentwürfe, Suche, Filter, Detailansicht und Übernahme eigener Entwürfe; Abdeckung für alle Altersgruppen und 6–24 Teilnehmende je Phase geprüft | Alle Übungen fachlich ungeprüft; kein redaktioneller Freigabeprozess |
| Gespeicherte Einheiten | Speichern, Liste, Öffnen, Löschen und eigene lokale Entwürfe; erneutes Speichern einer geöffneten Einheit aktualisiert die vorhandene Zeile statt eine Kopie anzulegen | Kein Kalender, keine Datumszuordnung, keine Suche und keine Duplizierfunktion; Prototyp-Entwürfe aus der SC27-Version unter dem alten Browserschlüssel werden nicht mehr übernommen |
| Ausgabe | Druckansicht über den Browser, dadurch PDF über den Druckdialog möglich | Kein eigener PDF-Export und kein Freigabelink |
| KI-Schutz | Serverprüfung, Kontingente, Budget, Begrenzung laufender Anfragen und idempotente Wiederholung | Pilotkonfiguration; noch kein beschlossenes Geschäftsmodell |
| Technik | React/Vite, Tailwind CSS und shadcn/ui, serverseitige API, Supabase, Vercel-Konfiguration und getrennt konfigurierbares Testprojekt | Deployment, Domain, API und Datenbankanbindung geprüft; Anmeldung, Passwort-Reset, Einladung und KI-Planung am 14. November 2026 manuell bestätigt |
| Qualität | Gemeinsamer Datenvertrag, 71 bestandene Tests, Datenbanktests, Node-22-Build und lokale Browserprüfung | CI läuft bei Push und Pull Request; kein Linter/Typecheck und kein vollständiger Browser-Abnahmetest |
| Weitere Module | Navigationsplatzhalter für Social Media und Scouting | Keine fertigen Funktionen |

## 5. Anforderungen an die erste nutzbare Version

### Bedienung auf dem Handy

- Planung, Anpassung, Speichern und Wiederöffnen müssen ohne PC möglich sein.
- Der Einstieg zeigt eine klare Hauptaktion: „Training erstellen“. Gespeicherte Einheiten sind direkt erreichbar.
- Das Formular wird in überschaubare Abschnitte gegliedert. Pflichtangaben und optionale Wünsche sind erkennbar.
- Ein Plan beginnt mit einer kompakten Übersicht: Schwerpunkt, Altersgruppe, Gesamtdauer, Teilnehmende und benötigtes Material.
- Einzelne Übungsblöcke sind schnell erfassbar. Aufbau, Ablauf und Coachingpunkte müssen am Platz gut lesbar sein.
- Als Abnahmekriterium gelten zunächst Ansichten mit 360, 390, 768 und 1280 Pixel Breite: keine abgeschnittenen Hauptaktionen und kein horizontales Scrollen im normalen Ablauf.
- Häufige Aktionen bekommen ausreichend große Berührungsflächen; als Produktziel mindestens 44 × 44 Pixel. Textkontrast, Tastaturbedienung, sichtbarer Fokus und beschriftete Eingaben werden mitgeprüft.
- Die Bildschirmtastatur darf die nächste notwendige Aktion nicht dauerhaft verdecken. Lade-, Leer-, Fehler- und Erfolgszustände werden bewusst gestaltet.

### Verlässliche Planung

- Rahmenbedingungen bleiben nach einem Fehler erhalten. Ein vorhandener Plan wird erst nach erfolgreicher Überarbeitung ersetzt.
- Wiederholen einer unklar ausgegangenen Anfrage darf keine zweite Generierung auslösen. Dafür muss die Anfragekennung auch bei den relevanten mobilen Unterbrechungen erhalten bleiben.
- Tabwechsel, Hintergrundbetrieb, Neuladen und kurze Verbindungsabbrüche werden ausdrücklich geprüft. Der aktuelle Schutz im laufenden Tab reicht dafür noch nicht als Nachweis.
- Ungespeicherte Entwürfe brauchen eine bewusste Sicherungsstrategie: wiederherstellbarer Entwurf oder klare Warnung vor Verlust. Die konkrete Umsetzung ist noch offen.
- Bei fehlendem Netz wird verständlich erklärt, welche Funktionen gerade verfügbar sind. Neue KI-Pläne benötigen eine Verbindung.
- Einheiten können nach erfolgreichem Speichern auch nach Abmelden und erneuter Anmeldung wieder geöffnet werden.

### Qualität der Trainingsinhalte

- Zeiten ergeben exakt die gewünschte Dauer; jeder Übungsblock berücksichtigt alle Teilnehmenden.
- Alter, Material, Platz und Schwerpunkt müssen sich nachvollziehbar im Inhalt widerspiegeln. Diese inhaltliche Passung ist durch die technischen Schema-Prüfungen allein nicht bewiesen.
- Spielform, Ballgröße, Kopfball und Feldgröße müssen zur Altersgruppe passen; ein erkannter Verstoß wird vor der Ausgabe abgelehnt.
- Aufbau und Ablauf sind konkret beschrieben. Grafik und Text dürfen sich nicht widersprechen; die Grafik bleibt eine schematische Hilfe.
- Neue oder angepasste Inhalte werden als KI-Entwurf gekennzeichnet. „Technisch geprüft“ bedeutet keine fachliche Freigabe.
- Für die Abnahme wird ein fester Satz typischer Trainingsfälle mit Trainern geprüft: unterschiedliche Altersgruppen, wenig Material, ungerade Spielerzahl, knapper Platz und Änderungswünsche.
- Spielernamen und Gesundheitsdaten werden für diese Funktion nicht benötigt und sollen nicht eingegeben werden.

### Technische Betriebsfähigkeit

- Ein kompletter Ablauf mit separaten Testkonten und gehosteter Testdatenbank wird nachgewiesen.
- Tests prüfen Vereinsgrenzen und die Privatsphäre persönlicher Pläne; die gehosteten Zugriffsregeln werden zusätzlich überprüft.
- Modellzugang und Budget bleiben serverseitig. Kosten, Kontingente und Fehlerfälle müssen nachvollziehbar sein.
- Vor Veröffentlichung werden Auth-Redirects, Mailzustellung, Projekteinstellungen, Datensicherung und ein Wiederherstellungsweg geprüft.
- Fehlerdiagnose braucht aussagekräftige, sparsame Servermeldungen ohne Passwörter, Tokens oder unnötige Trainingsinhalte.
- Verantwortlichkeiten und Nutzerinformationen zu Datenverarbeitung, Support und Kontolöschung müssen vor einem öffentlichen Betrieb geklärt sein.

## 6. Priorisierter Arbeitsplan

| Priorität | Arbeitspaket | Fertig, wenn … |
|---|---|---|
| P0 | Testumgebung und echter Kernablauf | Registrierung, Bestätigung, Login, Reset, Einladung, Generierung, Speichern und erneutes Öffnen mit echten Testdiensten funktionieren |
| P0 | Mobile Unterbrechungen und Entwurfsschutz | Hintergrundbetrieb, Neuladen und Verbindungsfehler führen weder zu unbemerktem Planverlust noch zu doppelter Generierung |
| P0 | Fachliche Abnahmefälle | Ein definierter Trainingsfall-Satz geprüft ist und erkannte Inhaltsfehler eingegrenzt oder behoben sind |
| P0 | Altersregeln im Plan | Spielform, Ballgröße, Kopfball und Feldgröße je Altersgruppe im Modellauftrag und in der Planprüfung verbindlich sind; umgesetzt am 15. November 2026, offen bleibt die fachliche Bestätigung der Tabelle |
| P1 | Nettospielzeit und Erholung | Jede Einheit mindestens einen Spielform-Block mit geplanter Nettospielzeit (Richtwert 48 Minuten pro Woche U8–U16, 32 Minuten ab U17) und geplante Erholung enthält |
| P1 | Lernziel und Progression | Jeder Block ein Lernziel mit überprüfbarem Erfolgskriterium nennt und die Blockreihenfolge methodisch vom Einfachen zum Schweren aufsteigt |
| P1 | Torwart und Zeitpuffer | Torwartrolle, Umbauzeiten und ein realistischer Zeitpuffer im Plan vorkommen, ohne die Gesamtdauer zu sprengen |
| P1 | Mobile Oberfläche für den Kernablauf | Formular, Planübersicht, Übungsblöcke und gespeicherte Einheiten auf den Zielgrößen gut bedienbar sind |
| P1 | Orientierung und Zustände | Training klar im Vordergrund steht und Lade-, Fehler-, Leer- und Erfolgszustände konsistent funktionieren |
| P1 | Nutzertest am Platz | Trainer eine Einheit selbstständig erstellen und später am Handy durchführen können; Probleme dokumentiert und priorisiert sind |
| P1 | Pilotbetrieb vorbereiten | Zugriff, Budget, Support, Nutzerinformationen, Datensicherung und Veröffentlichung bewusst festgelegt sind |
| P2 | Komfortfunktionen | Nach Pilotfeedback ausgewählte Verbesserungen umgesetzt sind, etwa Favoriten, Suche, Duplizieren oder bessere Druckausgabe |
| P2 | PWA und Lesen ohne Netz | Installierbarkeit und gezielt offline verfügbare Einheiten umgesetzt sind, falls der Pilot diesen Bedarf bestätigt |

Die UI-Konzeption kann parallel zu den offenen P0-Nachweisen beginnen. Eine Freigabe für den Pilot setzt die P0-Punkte und den nutzbaren mobilen Kernablauf voraus. Der technische Prüfbericht dokumentiert den jeweiligen Nachweis.

Grundlage der obigen Trainingspakete ist die Durchsicht des bestehenden Plans: Er ordnet Übungen, Zeiten, Gruppen und Material, enthält aber noch keine Trainingslehre. Nettospielzeit, Lernziele, methodische Progression, Torwartrolle und Zeitpuffer fehlen. Die Altersregeln sind der erste Schritt, weil ein Verstoß ein objektiver, prüfbarer Fehler ist. Wochenplanung, Trainingshistorie und Kader- oder Anwesenheitsdaten brauchen ein erweitertes Datenmodell und bleiben in Abschnitt 7.

## 7. Bewusst später entscheiden

- Native Apps und App-Store-Veröffentlichung.
- Mannschaftsvorlagen mit dauerhaft gespeicherten Rahmenbedingungen.
- Kalender, Wochenplanung und Trainingshistorie.
- Direktes Bearbeiten, Austauschen und Umordnen einzelner Übungsblöcke.
- Planfreigabe an Co-Trainer, gemeinsame Bearbeitung und Vereinsvorlagen.
- Installierbarkeit, Offline-Speicherung und Verhalten auf gemeinsam genutzten Geräten.
- Bezahlmodell, Pakete und endgültige KI-Kontingente.
- Spielerlisten, Anwesenheit, Leistungsdaten, Scouting und Social Media.

Diese Punkte sind mögliche Erweiterungen, keine bereits beauftragten Features. Neue Datenmodelle oder externe Dienste werden erst nach einer passenden Produktentscheidung ergänzt.

## 8. Offene Produktfragen mit vorläufiger Richtung

| Frage | Vorläufige Richtung bis zur Entscheidung |
|---|---|
| Wer testet zuerst? | Kleine Gruppe realer Fußballtrainer; konkrete Pilotgruppe noch festlegen |
| Welche Altersgruppe hat Vorrang? | Aktuelle Bereiche erhalten; Schwerpunkt für Abnahmetests und Ansprache noch festlegen |
| Muss jeder Trainer sofort einen Verein einrichten? | Bestehenden Ablauf vorerst erhalten; Reibung im Onboarding testen |
| Sind Pläne privat oder gemeinsam? | Bestehende persönliche Sichtbarkeit beibehalten; Teilen braucht eine ausdrückliche Freigabeentscheidung |
| Wie wichtig ist Lesen ohne Netz? | Am Platz testen; noch keine Offline-Funktion versprechen |
| Welche Daten bleiben bei Unterbrechungen erhalten? | Nur die für Wiederherstellung erforderlichen Entwürfe und Anfragekennungen; genaue Speicher- und Löschregeln noch festlegen |
| Wann ist die erste Version fertig? | Nach den Abnahmekriterien des Kernablaufs; kein Termin oder App-Store-Release beschlossen |

## 9. Arbeitsweise

Vorhandene Architektur weiterverwenden, Aufgaben klein halten und UI-Änderungen am echten Trainerablauf messen. Technische Prüfungen ersetzen keine Nutzung auf einem echten Handy und keine fachliche Trainingsbewertung. Nicht jede spätere Idee gehört in die erste Version.

Dieses Dokument beschreibt den gewünschten Produktumfang. Das [README](README.md) erklärt die Entwicklung, die [Datenbankanleitung](docs/database-development.md) den Schemaaufbau und die Tests, der [technische Prüfbericht](docs/technical-readiness.md) den zuletzt belegten Zustand.

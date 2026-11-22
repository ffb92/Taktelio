# P7 · Vorbereitung Vereinsabnahme

Stand: 22. November 2026 · Arbeitsrepo: `G:\Code\Taktelio` · Branch `feature/account-menu`

## Zweck

Dieses Dokument bereitet die Abnahme nach [pilot-qa.md](pilot-qa.md) vor. Es enthält die Voraussetzungen, das Prüfskript und die Protokollvorlagen. Die eigentliche Durchführung braucht echte Geräte, echte Konten und das Praxisteam.

**Status: vorbereitet, nicht durchgeführt.** Die Voraussetzungen unten sind noch nicht erfüllt.

## 1. Voraussetzungen vor dem Test

### Technisch

| Punkt | Stand | Verantwortlich |
| --- | --- | --- |
| Drei neue Migrationen | **erledigt am 22. November 2026** auf dem Produktionsprojekt; es gibt keine getrennte Testdatenbank. Einzelheiten und Risiken: [Migrationsprotokoll](migration-2026-11-22.md) | — |
| Code zum Migrationsstand deployen | **offen.** Produktion läuft auf `de0877a`; der Branch `feature/account-menu` enthält die passende Oberfläche und API. Ohne Deploy passen Oberfläche und Datenbank nicht zusammen. | Betreiber |
| Trainer den Mannschaften zuordnen | **offen.** Ohne Zuordnung können Trainer keine Termine mehr verwalten. Prüfabfrage im [Migrationsprotokoll](migration-2026-11-22.md) | Administrator |
| App auf der Testadresse erreichbar | offen | Betreiber |
| E-Mail-Versand (Bestätigung, Reset) | laut Betreiber eingerichtet; im Test erneut prüfen | Betreiber |
| Ein separater Testverein, nicht der Pilotverein | offen. Empfohlen, solange keine eigene Testdatenbank existiert: ein zweiter Verein in der Produktionsdatenbank, damit die Pilotdaten unberührt bleiben. | Betreiber |

**Wichtig:** Auf der Testdatenbank sind diese drei Migrationen Pflicht. Ohne sie fehlen Mannschaftsgrenze, Idempotenz und Planbezug, und der Pflichtfall unten schlägt zwangsläufig fehl.

### Testpersonen und Konten

Anonyme Kennungen eintragen, keine echten Namen ins Protokoll.

| Rolle | Zweck | Kennung |
| --- | --- | --- |
| Trainer A | Betreut Mannschaft U13, legt Spiele an | T-A |
| Trainer B | Zweite Mannschaft U15 desselben Vereins | T-B |
| Spieler 1–3 | Annehmen der Mannschaftseinladung U13, Rückmeldungen | S-1, S-2, S-3 |
| Spieler 4 | Mannschaft U15, unbeteiligt | S-4 |
| Fremdverein | Verein ohne Bezug | F-1 |

Zusätzlich: ein Administratorkonto des Testvereins, um Trainer A und B den Mannschaften zuzuordnen. **Ohne Zuordnung kann ein Trainer nach P3 keine Termine anlegen.**

### Geräte

| Gerät | Zweck |
| --- | --- |
| Handy (iOS oder Android), echter Browser | Mobiler Kernablauf, Bildschirmtastatur |
| Zweites Handy oder Desktop | Gleichzeitige Sitzungen für Rückmeldungen |
| Desktop mit Druckdialog | Druck/PDF |

## 2. Ablauf vor dem Test (Einrichtung, etwa 30 Minuten)

1. Testverein anlegen. Zwei Mannschaften: `U13` und `U15`.
2. Trainer A und B als Trainer einladen; beide Einladungen annehmen.
3. Als Administrator: Trainer A der `U13` zuordnen, Trainer B der `U15`.
   *Beleg:* Mannschaftsverwaltung, Rolle „Trainer" beim Hinzufügen.
4. Spieler 1–3 per Mannschaftseinladung der `U13` einladen, Spieler 4 der `U15`.
   Jeder nimmt **einmal** an.
5. Trainer A legt ein erstes Spiel an: Datum, Uhrzeit, Ort.
6. Trainer A speichert eine Trainingsplan-Einheit und verknüpft sie mit einem Termin.
7. Prüfen: Alle drei Spieler sehen das Spiel nach der Annahme, ohne weitere Einladung.

## 3. Pflichtfall Mannschaftsspiel

Jede Zeile ergibt eine Protokollzeile. Soll/Ist mit Beleg notieren.

| Nr. | Schritt | Erwartung | Status | Beleg |
| --- | --- | --- | --- | --- |
| M1 | Trainer A legt Spiel mit Datum, Uhrzeit, Ort an | Spiel sichtbar, Zeit und Ort stimmen in Ortszeit | | |
| M2 | S-1, S-2, S-3 nehmen Einladung je einmal an | Alle sehen das bestehende Spiel | | |
| M3 | Trainer A legt danach einen zweiten Termin an | Alle drei sehen ihn ohne weitere Einladung | | |
| M4 | Erstes Spiel: S-1 zu, S-2 ab, S-3 antwortet nicht | Trainer sieht 1 zu / 1 ab / 1 offen | | |
| M5 | Zweiter Termin: keine Antworten | Alle drei gelten als offen | | |
| M6 | Trainer lädt die Seite neu | Die drei Zustände bleiben richtig zugeordnet | | |
| M7 | S-1 gibt dieselbe Antwort erneut ab | Keine Doppelzählung; weiterhin 1 zu | | |
| M8 | S-1 ändert die Antwort auf vielleicht | Trainer sieht die Änderung, weiterhin eine Antwort von S-1 | | |
| M9 | S-1 widerruft die Rückmeldung | S-1 erscheint wieder als offen, nicht als doppelt | | |
| M10 | S-1 versucht, den Termin zu bearbeiten | Keine Bearbeitungsmöglichkeit; Server lehnt ab | | |
| M11 | S-1 versucht, für S-2 zu antworten | Nicht möglich; Server lehnt ab | | |
| M12 | S-4 (andere Mannschaft, gleicher Verein) öffnet die Terminansicht | Sieht das U13-Spiel nicht | | |
| M13 | F-1 (fremder Verein) öffnet die Terminansicht | Kein Zugriff auf den Testverein | | |
| M14 | Trainer B (U15) öffnet das U13-Spiel | Sieht es nicht | | |
| M15 | Trainer A öffnet das verknüpfte Spiel | „Deine Einheit" mit „Plan öffnen" | | |
| M16 | S-1 öffnet dasselbe Spiel | Kein Hinweis auf einen Plan | | |
| M17 | Trainer A löscht die Einheit, öffnet den Termin erneut | Termin besteht, kein Planbezug mehr | | |
| M18 | Angemeldeter Trainer beobachtet einen fremden persönlichen Trainingsplan | Nicht sichtbar | | |

## 4. Praxistest am Platz (D7)

| Nr. | Schritt | Erwartung | Status |
| --- | --- | --- | --- |
| D7-1 | Trainer A findet die gespeicherte Einheit am Handy | Erreichbar in zwei Schritten | |
| D7-2 | Trainer A öffnet sie aus dem Termin heraus | Inhalt stimmt mit dem Desktop überein | |
| D7-3 | Druck/PDF am Handy und Desktop | Plan enthält Inhalte, keine Bedienknöpfe | |
| D7-4 | Spieler öffnet nach dem Beitritt ein bestehendes Spiel | Sieht Termin und eigene Antwort | |
| D7-5 | Spieler öffnet ein danach angelegtes Spiel | Sieht es ohne weitere Einladung | |

## 5. Fachliche Bewertung der Trainingsfälle (D6)

Die drei festen Eingaben stammen aus dem [Design](pilot-design.md). Jeden Fall einzeln protokollieren. Urteile von Trainern, nicht von der Entwicklung.

### Fall A

| Vorgabe | Wert |
| --- | --- |
| Altersgruppe | U11 |
| Spieler | 9 |
| Dauer | 45 Minuten |
| Fläche | 20 × 15 m |
| Material | 3 Bälle |
| Schwerpunkt | Dribbling |

| Soll | Urteil | Anmerkung |
| --- | --- | --- |
| Blockzeiten ergeben 45 Minuten | | |
| Alle 9 Spieler je Block beteiligt | | |
| Aufbau mit 3 Bällen umsetzbar | | |
| Text und Grafik stimmen überein | | |
| KI-Entwurf ist gekennzeichnet | | |
| Lernziel und Erfolgskriterium erkennbar | | |
| Progression sinnvoll | | |
| Torwartrolle angemessen (soweit relevant) | | |
| Umbauzeiten und Puffer realistisch | | |

### Fall B

| Vorgabe | Wert |
| --- | --- |
| Altersgruppe | U15 |
| Spieler | 14 |
| Dauer | 60 Minuten |
| Fläche | 30 × 20 m |
| Material | 7 Bälle, 8 Hütchen |
| Schwerpunkt | Passspiel |

| Soll | Urteil | Anmerkung |
| --- | --- | --- |
| 60 Minuten eingehalten | | |
| 14 Spieler je Block beteiligt | | |
| Material- und Flächengrenze eingehalten | | |
| Text und Grafik stimmen überein | | |
| Weitere Punkte wie Fall A | | |

### Fall C — Fall B überarbeiten mit „nur noch 5 Bälle"

| Soll | Urteil | Anmerkung |
| --- | --- | --- |
| Weiterhin 60 Minuten | | |
| Weiterhin 14 Spieler je Block | | |
| Höchstens 5 Bälle | | |
| Vorversion abrufbar | | |
| Restkontingent nach der Anfrage aktuell | | |

## 6. Betriebliche Nachweise (D7)

Jeder Punkt braucht einen Beleg oder einen ausdrücklich offenen Befund.

| Punkt | Nachweis | Status |
| --- | --- | --- |
| Vercel-Deployment der getesteten Version | Commit-ID und Deployment-Adresse | |
| E-Mail-Versand Bestätigung | Testmail zugestellt | |
| E-Mail-Versand Passwort-Reset | Testmail zugestellt, Link führt zur Reset-Seite | |
| Einladungslinks | Link gilt sieben Tage, richtiger Verein | |
| Datensicherung | Backup-Strategie und letzter gesicherter Stand | |
| Wiederherstellung | Einmal probeweise wiederhergestellt | |
| Supportweg | Wer nimmt Anfragen an, welche Adresse | |
| Nutzerinformationen | Wo erklärt die App Datenschutz, Kontolöschung, Datenaufbewahrung | |
| Fehlermeldungen ohne Geheimnisse | Testfehler erzeugen, Meldung auf Passwörter und Tokens prüfen | |
| Kontolöschung | Zuständige Stelle, Ablauf und auffindbare Information | |

## 7. Protokollvorlage je Prüfung

Nach dem Muster aus [pilot-qa.md](pilot-qa.md):

| Prüfung | Stand | Umgebung | Soll | Ist | Status | Beleg |
| --- | --- | --- | --- | --- | --- | --- |
| M1 | Commit … | Gerät, Browser, Ortszeit | … | … | bestanden / fehlgeschlagen / blockiert / ausstehend | … |

Status nur „bestanden“ nennen, wenn der Schritt selbst beobachtet wurde. Betreiberbestätigungen als solche kennzeichnen.

## 8. Zwei getrennte Entscheidungen am Ende

### Abnahme der Pakete P1–P6

| Paket | Stand |
| --- | --- |
| P1 | abgenommen ([Nachweis](p1-qa-abnahme.md)) |
| P2 | abgenommen mit Befund K1 ([Nachweis](p2-qa-uebergabe.md)) |
| P3 | entschieden und umgesetzt ([Nachweis](p3-rollenabgleich.md)) |
| P4 | abgenommen nach Korrektur ([Nachweis](p4-qa-uebergabe.md)) |
| P5 | abgenommen nach Korrektur ([Nachweis](p5-qa-uebergabe.md)) |
| P6 | abgenommen ([Nachweis](p6-qa-uebergabe.md)) |

### Pilotreife

Die Entscheidung braucht:

1. den vollständigen Pflichtfall oben ohne offene P0-Punkte,
2. die Trainerurteile zu A–C,
3. die Betriebsnachweise inklusive Datensicherung und Support,
4. den mobilen Kernablauf auf einem echten Gerät,
5. eine Antwort auf den Kontrastbefund K1.

Bleibt einer dieser Punkte offen, ist die Pilotentscheidung negativ oder aufschiebend — nicht positiv.

## 9. Was vor dem Test noch zu tun ist

| Punkt | Art |
| --- | --- |
| Branch deployen, damit Oberfläche und Datenbank zusammenpassen | Betreiber, **vor allem anderen** |
| Trainer den Mannschaften zuordnen | Administrator im Testverein |
| Testverein und Konten anlegen | Betreiber |
| Kontrastbefund K1 entscheiden (Rahmenfarbe Formularfelder) | Design |

## Gesamtstatus

**P7 vorbereitet, Durchführung offen.** Die Prüfschritte sind so gefasst, dass sie ohne Nachfragen ausführbar sind. Die technischen Voraussetzungen und die Testkonten fehlen noch; sie sind Aufgabe des Betreibers, nicht der Entwicklung.

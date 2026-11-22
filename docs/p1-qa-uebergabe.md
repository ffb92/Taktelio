# P1 · QA-Übergabe Trainingsbestand

Stand: 22. November 2026 · Arbeitsrepo: `G:\Code\Taktelio`

## Auftrag und Umfang

Geprüft wurde Paket **P1 Trainingsbestand** aus der [Roadmap](roadmap.md) anhand von **D1 Zugang**, **D2 Planung** und **D4 Speichern** aus dem [Design](pilot-design.md). Einbezogen sind Bibliothek, die drei Planungsmodi, Speichern, Wiederöffnen, Löschen und Drucken. Belegt ist der Ablauf vom Login über Erzeugung, Änderung und Rückkehr zur Vorversion bis zur wieder geöffneten Einheit.

Es wurden nur Abweichungen geändert, die durch einen Test reproduzierbar waren. Es gab keine Commits, Deployments oder Produktionsänderungen.

## Git-Stand

| Punkt | Stand |
| --- | --- |
| Branch | `feature/account-menu` |
| HEAD | `e72c56f` (Konto-Menü mit getrennten Seiten für Profil, Verein und Mannschaft) |
| Geändert | `src/components/Training.jsx` (+4/−2) |
| Geändert | `tests/react-app.test.mjs` (+30) |
| Neu | `tests/training-journey.test.mjs` |
| Unversioniert, unverändert | Planungsdokumente von Astra: `docs/entwicklungsplan-entwurf.md`, `docs/pilot-design.md`, `docs/pilot-qa.md`, `docs/pilot-qa-ergebnis.md`, `docs/produktfragen.md`, `docs/roadmap.md` |

## Umgebung und Prüfkommandos

Windows 11, Node 22.23.5, npm 10.9.9. Am 22. November 2026 ausgeführt:

| Befehl | Ergebnis |
| --- | --- |
| `npm test` | **82 von 82 bestanden**, 0 übersprungen. Mehrfach wiederholt, stabil. Enthält die PGlite-SQL-Fälle inklusive `tests/tenant-isolation.sql`. |
| `npm run build` | Vite 8.3.8, **erfolgreich** (Exit 0). Hinweis auf die Modul-Direktive `use client` in `lucide-react` ist vorbestehend und blockiert nicht. |
| `node --import tsx --test tests/training-journey.test.mjs` | **5 von 5 bestanden** (neue P1-Belege). |
| `node --import tsx --test tests/react-app.test.mjs` | **8 von 8 bestanden**, inklusive neuem Einladungsfall. |

Vor der Änderung lag der Gesamtstand bei 76 von 76 bestandenen Tests.

## Belegte Abweichungen und Korrekturen

| Nr. | Ablauf | Ist vor der Korrektur | Ursache | Korrektur | Beleg |
| --- | --- | --- | --- | --- | --- |
| B1 | Gespeicherte Einheit öffnen → Anpassung vorschlagen → Einheit speichern | Beim Speichern entstand eine zweite Zeile statt einer Aktualisierung. | `Training.jsx` übernahm bei der Überarbeitung die Zeilen-ID der geöffneten Einheit nicht. | Die ID der geöffneten Einheit bleibt an der überarbeiteten Fassung erhalten. | `tests/training-journey.test.mjs:107` |
| B2 | Gespeicherte Einheit öffnen → unter „Einheiten“ löschen → zurück zu „Planen“ → Einheit speichern | Servermeldung 404 „Bitte erneut speichern“, jeder weitere Versuch scheiterte mit derselben 404. | Nach dem 404 blieb die veraltete ID im Formularzustand. | Bei 404 wird die ID verworfen; die Meldung erklärt, dass erneutes Speichern eine neue Einheit anlegt. Der zweite Versuch fügt ein. | `tests/training-journey.test.mjs:128` |

Fundstellen im Code: `src/components/Training.jsx:49` (ID-Erhalt) und `src/components/Training.jsx:53` (404-Behandlung).

## Soll/Ist je Design-ID

### D1 · Zugang

| Prüfschritt | Soll | Ist und Beleg | Status |
| --- | --- | --- | --- |
| Anmeldung und Sitzungserneuerung | Login führt in die App; eine abgelaufene Sitzung wird einmal erneuert, sonst zur Anmeldung zurückgeführt. | `apiFetch` erneuert bei 401 genau einmal über `/api/auth/refresh`; bestehender React-Test „club switching scopes requests and logout clears all club UI“. | bestanden (lokal) |
| Passwort-Reset | Reset-Link führt ausschließlich in den Reset, nicht in die App; Fehler erhalten die Korrekturmöglichkeit. | `tests/auth-flows.test.mjs` (Recovery-Callback, Reset-Cookie, Fehlerfall). | bestanden (lokal) |
| Einladung und richtiger Verein | Nach Annahme der Einladung ist der eingeladene Verein aktiv, nicht der zuvor gewählte. | Neuer Test `tests/react-app.test.mjs:156`: Einladung zu Verein B bei zwei Vereinen; die Trainingsanfragen tragen danach `x-workspace-id` von Verein B, das Einladungsmerkmal ist gelöscht. | bestanden (lokal) |
| Registrierung mit Bestätigung, echtes Testpostfach | Konto, Vereinsrolle und Zielverein mit getrennten Testkonten belegen. | **Nicht in dieser Umgebung möglich.** Es fehlen laut Design ein separates verifiziertes Testprojekt, ein Testpostfach und drei passend zugeordnete Testkonten. | offen (QA) |

### D2 · Planung

| Prüfschritt | Soll | Ist und Beleg | Status |
| --- | --- | --- | --- |
| Rahmenbedingungen erfassen | Alter, Teilnehmende, Dauer, Schwerpunkt, Material, Fläche und Wünsche werden an den gemeinsamen Vertrag übergeben. | Formular sendet `criteria` an `/api/plan`; Server prüft mit `shared/training-plan.mjs`. Beleg: `tests/training-journey.test.mjs:48` (Minuten 60 und Modus im Anfragekörper). | bestanden |
| Drei Planungsmodi | Grundstock + neue Ideen, nur Grundstock, neue Übungen sind wählbar und werden übertragen. | Alle drei Optionen vorhanden; neuer Bibliotheksfall `tests/training-journey.test.mjs:177` prüft Auswahl und Übertragung. Servervalidierung in `tests/api.test.mjs`. | bestanden |
| Fehler erhält Eingaben und letzten Plan | Nach einem Fehler bleiben Vorgaben, Änderungstext und der bisherige Plan bestehen; die Wiederholung nutzt dieselbe Anfragekennung. | Neuer Test `tests/training-journey.test.mjs:150` mit 503: Plan A, Minuten 60, Teilnehmende 12 und Änderungstext bleiben; Wiederholung sendet dieselbe `requestId` und denselben `previous`-Plan. | bestanden |
| Rückkehr zur Vorversion | Nach erfolgreicher Änderung stellt „Vorherige Version“ alle Blöcke und die zugehörigen Vorgaben wieder her. | `tests/training-journey.test.mjs:48` prüft beide Blöcke (A-Einstieg, A-Spiel) und die Formularwerte nach der Rückkehr. | bestanden |
| Restkontingent | Nach erfolgreicher Anfrage wird der Serverwert erneut angezeigt. | Test zählt den zweiten `/api/status`-Aufruf und die angezeigte Meldung nach der Generierung. | bestanden |
| Bibliothek | „Training damit planen“ übernimmt Schwerpunkt und Übungshinweis in die Planung. | `tests/training-journey.test.mjs:177` prüft Schwerpunkt „Passspiel“ und den Übungshinweis in den Wünschen. | bestanden |
| Drucken | Browserdruck enthält den Plan, keine Bedienaktionen. | Druckknopf und Druckregeln (`.print-hidden`, `#ai` in `src/index.css:124`) sind vorhanden. **Ein echter Druck/PDF-Lauf wurde nicht ausgeführt.** | offen (Browser/QA) |

### D4 · Speichern

| Prüfschritt | Soll | Ist und Beleg | Status |
| --- | --- | --- | --- |
| Speichern und Wiederöffnen | Nach dem Speichern ist die Einheit mit identischen Inhalten wieder zu öffnen. | `tests/training-journey.test.mjs:48`: Speichern, Wechsel zu „Einheiten“, Öffnen; Minuten, Teilnehmende und beide Blöcke stimmen. | bestanden |
| Erneutes Speichern | Eine geöffnete Einheit wird aktualisiert, nicht dupliziert. | B1 behoben; `tests/training-journey.test.mjs:107` erwartet `id` der Zeile und genau einen Schreibvorgang. Serverfall in `tests/storage.test.mjs`. | bestanden |
| Löschen | Eine Einheit lässt sich löschen und verschwindet aus der Liste. | `tests/training-journey.test.mjs:48` prüft DELETE und den Leerzustand. | bestanden |
| Löschen während des Öffnens | Nach dem Löschen ist ein erneutes Speichern möglich. | B2 behoben; `tests/training-journey.test.mjs:128`. | bestanden |
| Privatsphäre persönlicher Pläne | Ein zweites Konto im selben Verein und ein fremder Verein dürfen den Plan nicht lesen, ändern oder löschen. | Datenbankregeln `plan_read`, `plan_update`, `plan_delete` in `supabase/migrations/20261112211629_add_workspace_foundation.sql` und `20261115120000_training_plan_updates.sql`; unabhängig geprüft durch `tests/tenant-isolation.sql` (anderer Trainer im selben Verein und fremder Verein). | bestanden (lokal, PGlite) |
| Gültige Altentwürfe | Vollständige ältere Einheiten bleiben lesbar; unvollständige werden abgewiesen, ohne Daten zu löschen. | `tests/training-plan.test.mjs`, `tests/react-app.test.mjs:133` (vollständiger Altbestand), `tests/local-drafts.test.mjs` und `tests/react-app.test.mjs:116` (defekte Entwürfe bleiben löschbar). | bestanden |
| Wiederöffnen nach erneuter Anmeldung | Nach Ab- und Anmeldung ist die Einheit wieder erreichbar. | Die Einheit wird serverseitig gespeichert; die Komponente wird beim Konto-/Vereinswechsel neu aufgebaut (`App.jsx` Schlüssel `user.id:workspaceId`). **Mit echten Konten nicht durchgeführt.** | offen (QA) |

## Offene Punkte für die unabhängige QA

1. **D1 mit echten Testdiensten:** Registrierung, E-Mail-Bestätigung, Anmeldung, Sitzungserneuerung, Reset und Einladung mit getrenntem Testprojekt, Testpostfach und drei Testkonten. Erwartet: richtiger Verein und richtige Rolle, anonyme Testkennungen im Protokoll, keine Zugangsdaten.
2. **D4 mit echten Konten:** Speichern, abmelden, erneut anmelden und inhaltsgleich öffnen; Zugriff mit einem zweiten Konto desselben Vereins und einem Konto eines anderen Vereins.
3. **Druck/PDF:** Druckdialog auf einem echten Browser prüfen (Handy und Desktop). Die Druckregeln sind vorhanden, aber nicht ausgeführt.
4. **Mobile Prüfung (D5, Paket P2):** vier Zielbreiten, Zielgrößen, Fokus, Kontrast und Bildschirmtastatur. Nicht Teil dieser P1-Übergabe.
5. **Fachliche Abnahme (D6, P7):** Trainerurteile zu den Fällen A–C. Nicht Teil dieser P1-Übergabe.
6. **Beobachtung ohne Änderung:** Beim ersten Aufbau der Einladungsansicht kann die Vorschau zweimal angefragt werden, weil der Verein kurz nachgeladen wird. Die zweite Anfrage ist erfolgreich; es gibt keinen sichtbaren Fehler. Für P1 nicht geändert.

## QA-Ergebnis

**Offen.** Die Entwicklungsseite ist mit 82 von 82 bestandenen Tests und erfolgreichem Build übergeben. Zwei belegte Abweichungen (B1, B2) sind behoben. Die unabhängige Abnahme nach [pilot-qa.md](pilot-qa.md) steht aus; P1 ist noch nicht als abgenommen zu markieren.

# Taktelio: Domain und Auth-Mails einrichten

Kanonische Adresse ist `https://www.taktelio.app`; `https://taktelio.app` leitet per 308 dorthin weiter. Der Versand über Resend ist eingerichtet. Am 14. November 2026 wurde die Live-Konfiguration per `supabase config diff` gelesen: Site URL `https://www.taktelio.app`, Redirect-Allowlist enthält `www`, Apex und `taktelio.vercel.app`, SMTP `smtp.resend.com:465` mit `noreply@taktelio.app`. Ein vollständiger E-Mail-Test nach den Auth-Änderungen steht noch aus.

## Zielkonfiguration

| Zweck | Geplanter Wert |
|---|---|
| App (kanonisch) | https://www.taktelio.app |
| Alternative Webadresse | taktelio.app → www.taktelio.app (308) |
| Versanddomain in Resend | taktelio.app (eingerichtet) |
| Absender | Den bereits in Supabase/Resend verifizierten Absender beibehalten |
| SMTP-Host | smtp.resend.com |
| SMTP-Port | 465 |
| SMTP-Benutzer | resend |
| SMTP-Passwort | Resend API-Key, ausschließlich im Supabase-Dashboard speichern |

Der Versand über Resend richtet kein Postfach für eingehende Antworten ein. Die Absenderadresse ist keine Supportadresse.

## Einrichtung / Referenz

1. Domain kaufen. In Vercel beim bestehenden Projekt `taktelio` die Domain `taktelio.app` hinzufügen; `www.taktelio.app` als Weiterleitung zur Hauptdomain konfigurieren.
2. Beim Domainanbieter exakt die von Vercel angezeigten DNS-Einträge übernehmen. Keine pauschalen IP- oder CNAME-Werte verwenden. Warten, bis Domain und HTTPS in Vercel bereit sind.
3. In Resend die Versanddomain `taktelio.app` verwenden. Die dort angezeigten DNS-Einträge einschließlich SPF und DKIM übernehmen und verifizieren. Bestehende Mail-Einträge der Hauptdomain erhalten. Keine erfundenen DNS-Werte verwenden.
4. Resend API-Key für den Mailversand erstellen. In Supabase unter Authentication → Email → SMTP Settings die obigen SMTP-Werte und den Absender eintragen. Klick-Tracking für Auth-Mails deaktiviert lassen.
5. In Supabase die folgenden Vorlagen eintragen. Der Upload dieser Dateien zu GitHub aktiviert sie nicht automatisch.
6. Erst nach erfolgreicher HTTPS-Prüfung die Supabase Site URL auf `https://www.taktelio.app` setzen und diese Adresse als Redirect erlauben. `https://taktelio.app` (leitet weiter) und `https://taktelio.vercel.app` während der Übergangsphase ebenfalls zulassen.
7. Auth-Flows von der neuen Domain testen. Für den Domainwechsel ist eine erneute Anmeldung normal: Sitzungscookies sind an den jeweiligen Host gebunden.

## Vorlagen

| Supabase-Vorlage | Betreff | HTML-Datei |
|---|---|---|
| Confirm sign up | Bestätige deine E-Mail-Adresse für Taktelio | [confirm-signup.html](../emails/confirm-signup.html) |
| Reset password | Dein neues Passwort für Taktelio | [reset-password.html](../emails/reset-password.html) |

`{{ .ConfirmationURL }}` unverändert lassen: Supabase erzeugt den passenden Bestätigungslink. Keine echten Tokens in diese Dateien eintragen. Die Anwendung verarbeitet den Link. `type=recovery` öffnet ausschließlich die Reset-Seite; der Server setzt nur ein kurzlebiges HttpOnly-Recovery-Cookie und löscht normale App-Cookies. Nach Passwortänderung wird die Sitzung abgemeldet und die Anmeldung angezeigt. Ein Neuladen der Reset-Seite bleibt über `?flow=reset` im Reset-Ablauf.

Vereinseinladungen in Taktelio werden derzeit als Link zum Weitergeben erzeugt. Die Supabase-Vorlage „Invite user“ ist ein anderer Ablauf und aktiviert keinen automatischen Versand dieser Vereinslinks.

## Einladungsablauf und Redirect-Allowlist

Ein gültiger Einladungslink zeigt bereits vor der Anmeldung den Vereinsnamen und Anzeigenamen der einladenden Person. Die öffentliche Vorschau liefert ausschließlich diese beiden Felder und benötigt den vollständigen zufälligen Einladungstoken. E-Mail-Adressen und sonstige Profildaten werden nicht öffentlich ausgegeben. Nach Anmeldung mit der bestätigten Empfängeradresse wird zusätzlich die Empfängeradresse angezeigt. Erst „Einladung annehmen“ erstellt die Mitgliedschaft. Abgelaufene, widerrufene, bereits verwendete oder für eine andere Adresse bestimmte Links sind nicht annehmbar.

Für die Registrierung wird die Einladung im Bestätigungs-Redirect `https://www.taktelio.app/?invite=<token>` weitergegeben. In Supabase muss zusätzlich zum Stammziel `https://www.taktelio.app` das eng begrenzte Muster `https://www.taktelio.app/?invite=*` zugelassen sein. Die Live-Allowlist wurde am 14. November 2026 gelesen: Sie enthält `https://www.taktelio.app`, `https://taktelio.app` und `https://taktelio.vercel.app`, aber noch kein `?invite=*`-Muster. Ohne das Muster kann die Bestätigung in einem anderen Browser die Einladung verlieren; im ursprünglichen Tab bleibt sie gespeichert.

## Abschließender Funktionstest

- Neues Konto: Bestätigungsmail kommt an; Link öffnet Taktelio; Vereinseinrichtung funktioniert.
- Passwort zurücksetzen: Mail kommt an; neues Passwort setzen; Anmeldung mit neuem Passwort funktioniert.
- Einladung: Mit der eingeladenen Adresse beitreten; andere Adresse und widerrufener Link werden abgewiesen.
- Zwei Vereine: Konto A kann Daten von Verein B weder lesen noch ändern. Persönliche Trainingspläne bleiben auch für andere Vereinsmitglieder privat.
- Resend-Versandstatus und Supabase-Fehler bei Problemen prüfen. Keine Passwörter, Mail-Tokens oder API-Keys in Fehlerberichte kopieren.

## Offizielle Anleitungen

- https://resend.com/docs/send-with-supabase-smtp
- https://supabase.com/docs/guides/auth/auth-email-templates
- https://supabase.com/docs/guides/auth/redirect-urls

## Persönliches Profil

Vorname und Nachname werden beim Speichern des Profils benötigt. Anzeigename, betreute Mannschaft(en) und Trainerqualifikation sind optional. Gespeichert wird nur die validierte Feldliste in Supabase Auth unter `user_metadata.taktelio_profile`. Diese Angaben werden niemals für Berechtigungen oder Vereinsrollen ausgewertet. Die eigene E-Mail und Vereinsrolle werden weiterhin aus den bestehenden Auth-/Mitgliedschaftsdaten gelesen.

Einladungen verwenden den Anzeigenamen, ersatzweise Vor- und Nachname. Neue Einladungen setzen einen gespeicherten Namen voraus. Bestehende Einladungen ohne Namen zeigen vorübergehend „Ein Vereinsadministrator“; nach dem Speichern des Namens zeigen dieselben gültigen Links automatisch den Namen.

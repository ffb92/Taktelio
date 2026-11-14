# Taktelio: Domain und Auth-Mails einrichten

Domain `https://taktelio.app` und Versand über Resend sind laut Einrichtung und Nutzertest aktiv. Die Zustellung wurde vom Nutzer bestätigt; ein erneuter vollständiger E-Mail-Test nach den Auth-Änderungen steht noch aus.

## Zielkonfiguration

| Zweck | Geplanter Wert |
|---|---|
| App | https://taktelio.app |
| Alternative Webadresse | www.taktelio.app → taktelio.app |
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
6. Erst nach erfolgreicher HTTPS-Prüfung die Supabase Site URL auf `https://taktelio.app` setzen und diese Adresse als Redirect erlauben. `https://taktelio.vercel.app` während der Übergangsphase ebenfalls zulassen.
7. Auth-Flows von der neuen Domain testen. Für den Domainwechsel ist eine erneute Anmeldung normal: Sitzungscookies sind an den jeweiligen Host gebunden.

## Vorlagen

| Supabase-Vorlage | Betreff | HTML-Datei |
|---|---|---|
| Confirm sign up | Bestätige deine E-Mail-Adresse für Taktelio | [confirm-signup.html](../emails/confirm-signup.html) |
| Reset password | Dein neues Passwort für Taktelio | [reset-password.html](../emails/reset-password.html) |

`{{ .ConfirmationURL }}` unverändert lassen: Supabase erzeugt den passenden Bestätigungslink. Keine echten Tokens in diese Dateien eintragen. Die Anwendung verarbeitet den Link. `type=recovery` öffnet ausschließlich die Reset-Seite; der Server setzt nur ein kurzlebiges HttpOnly-Recovery-Cookie und löscht normale App-Cookies. Nach Passwortänderung wird die Sitzung abgemeldet und die Anmeldung angezeigt. Ein Neuladen der Reset-Seite bleibt über `?flow=reset` im Reset-Ablauf.

Vereinseinladungen in Taktelio werden derzeit als Link zum Weitergeben erzeugt. Die Supabase-Vorlage „Invite user“ ist ein anderer Ablauf und aktiviert keinen automatischen Versand dieser Vereinslinks.

## Einladungsablauf und Redirect-Allowlist

Vor der Anmeldung erscheint ein Hinweis auf die Vereinseinladung. Nach Anmeldung mit der bestätigten Empfängeradresse werden Vereinsname, einladende E-Mail-Adresse und Empfängeradresse aus der Datenbank angezeigt. Erst „Einladung annehmen“ erstellt die Mitgliedschaft. Details werden nicht anonym freigegeben. Abgelaufene, widerrufene, bereits verwendete oder für eine andere Adresse bestimmte Links sind nicht annehmbar.

Für die Registrierung wird die Einladung im Bestätigungs-Redirect `https://taktelio.app/?invite=<token>` weitergegeben. In Supabase muss zusätzlich zum Stammziel `https://taktelio.app` das eng begrenzte Muster `https://taktelio.app/?invite=*` zugelassen sein. Die Live-Allowlist konnte in dieser Sitzung mangels Dashboard-Anmeldung nicht geprüft werden. Ohne das Muster kann die Bestätigung in einem anderen Browser die Einladung verlieren; im ursprünglichen Tab bleibt sie gespeichert.

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

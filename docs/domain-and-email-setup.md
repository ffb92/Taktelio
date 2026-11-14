# Taktelio: Domain und Auth-Mails einrichten

Vorbereitet, noch nicht aktiviert. Bis zur erfolgreichen Einrichtung bleibt die bestehende Vercel-Adresse aktiv.

## Zielkonfiguration

| Zweck | Geplanter Wert |
|---|---|
| App | https://taktelio.app |
| Alternative Webadresse | www.taktelio.app → taktelio.app |
| Versanddomain in Resend | auth.taktelio.app |
| Absender | Taktelio <noreply@auth.taktelio.app> |
| SMTP-Host | smtp.resend.com |
| SMTP-Port | 465 |
| SMTP-Benutzer | resend |
| SMTP-Passwort | Resend API-Key, ausschließlich im Supabase-Dashboard speichern |

Der Versand über Resend richtet kein Postfach für eingehende Antworten ein. Die Absenderadresse ist keine Supportadresse.

## Reihenfolge

1. Domain kaufen. In Vercel beim bestehenden Projekt `taktelio` die Domain `taktelio.app` hinzufügen; `www.taktelio.app` als Weiterleitung zur Hauptdomain konfigurieren.
2. Beim Domainanbieter exakt die von Vercel angezeigten DNS-Einträge übernehmen. Keine pauschalen IP- oder CNAME-Werte verwenden. Warten, bis Domain und HTTPS in Vercel bereit sind.
3. In Resend `auth.taktelio.app` hinzufügen. Die dort angezeigten DNS-Einträge einschließlich SPF und DKIM übernehmen und verifizieren. Bestehende Mail-Einträge der Hauptdomain erhalten. Keine erfundenen DNS-Werte verwenden.
4. Resend API-Key für den Mailversand erstellen. In Supabase unter Authentication → Email → SMTP Settings die obigen SMTP-Werte und den Absender eintragen. Klick-Tracking für Auth-Mails deaktiviert lassen.
5. In Supabase die folgenden Vorlagen eintragen. Der Upload dieser Dateien zu GitHub aktiviert sie nicht automatisch.
6. Erst nach erfolgreicher HTTPS-Prüfung die Supabase Site URL auf `https://taktelio.app` setzen und diese Adresse als Redirect erlauben. `https://taktelio.vercel.app` während der Übergangsphase ebenfalls zulassen.
7. Auth-Flows von der neuen Domain testen. Für den Domainwechsel ist eine erneute Anmeldung normal: Sitzungscookies sind an den jeweiligen Host gebunden.

## Vorlagen

| Supabase-Vorlage | Betreff | HTML-Datei |
|---|---|---|
| Confirm sign up | Bestätige deine E-Mail-Adresse für Taktelio | [confirm-signup.html](../emails/confirm-signup.html) |
| Reset password | Dein neues Passwort für Taktelio | [reset-password.html](../emails/reset-password.html) |

`{{ .ConfirmationURL }}` unverändert lassen: Supabase erzeugt den passenden Bestätigungslink. Keine echten Tokens in diese Dateien eintragen. Die Anwendung verarbeitet die anschließende Sitzung bereits.

Vereinseinladungen in Taktelio werden derzeit als Link zum Weitergeben erzeugt. Die Supabase-Vorlage „Invite user“ ist ein anderer Ablauf und aktiviert keinen automatischen Versand dieser Vereinslinks.

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

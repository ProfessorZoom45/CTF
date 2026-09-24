# Oracle card-submission email service

This service runs beside the existing Discord bot on the Oracle VM. It does not
import the bot, read its Discord token, or share its process. It accepts only the
CTF GitHub Pages origin, verifies Cloudflare Turnstile, rate-limits callers, and
sends exactly two emails through the dedicated `CTF.OTCG@outlook.com` mailbox
using Microsoft Graph delegated `Mail.Send` authorization:

1. `{Submitter Name}'s FORGE Cards` to `changethewrld@outlook.com`, with the
   submitted JSON and each artwork image attached separately, and the
   submitter set as Reply-To. The JSON contains image metadata only.
2. A thank-you/review notice to the submitter, with the official CTF logo PNG
   attached as `Carry-The-Flame-Logo.png`.

SQLite delivery flags make retries idempotent. If the first email succeeds and
the second fails, a retry sends only the second email.
The browser sends image data in a separate `images` array to `/submit-card`;
the service decodes each image into a MIME attachment. Text messages use 7bit
or base64 transfer encoding to avoid visible quoted-printable `=` line breaks.

Run the local delivery checks before deployment with `python -m unittest
test_app.py`. The test sends one image through a fake mailer, checks both
emails, and verifies that the JSON does not contain image data.

## Required one-time setup

1. Register a Microsoft Entra public-client application that supports personal
   Microsoft accounts and copy its client ID.
2. Create a Turnstile widget for `professorzoom45.github.io`.
3. Give the Oracle VM a stable HTTPS hostname. Point DNS at the VM, allow TCP
   80/443 in the OCI VCN and the VM firewall, and install Caddy.
4. Copy this directory to `/opt/ctf-card-email/app`, copy
   `assets/img/ctf-logo-v2.png` there, create a virtual environment, and install
   `requirements.txt`.
5. Create `/opt/ctf-card-email/secrets/ctf-card-email.env` from the example and
   set mode `600`.
6. Run `bootstrap_outlook.py` once and authorize
   `CTF.OTCG@outlook.com` using Microsoft's device page.
7. Install `ctf-card-email.service`, start it, and proxy the public hostname to
   `127.0.0.1:8787` with Caddy.
8. Put the HTTPS `/submit-card` URL and public Turnstile site key in
   `assets/js/submission-delivery-config.js`.

Do not commit the Microsoft token cache, Turnstile secret, or populated env file.

## Health check

```sh
curl -fsS http://127.0.0.1:8787/health
```

The service deliberately binds only to loopback. Caddy is the sole public entry
point and handles TLS.

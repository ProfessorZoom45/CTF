# Oracle card-submission email service

This service runs beside the existing Discord bot on the Oracle VM. It does not
import the bot, read its Discord token, or share its process. It accepts only the
CTF GitHub Pages origin, verifies Cloudflare Turnstile, rate-limits callers, and
sends exactly two emails through the `changethewrld@outlook.com` mailbox:

1. `{Submitter Name}'s Custom Cards` to `changethewrld@outlook.com`, with the
   submitted JSON attached and the submitter set as Reply-To.
2. A thank-you/review notice to the submitter, without the attachment.

SQLite delivery flags make retries idempotent. If the first email succeeds and
the second fails, a retry sends only the second email.

## Required one-time setup

1. Register a Microsoft Entra public-client application that supports personal
   Microsoft accounts and copy its client ID.
2. Create a Turnstile widget for `professorzoom45.github.io`.
3. Give the Oracle VM a stable HTTPS hostname. Point DNS at the VM, allow TCP
   80/443 in the OCI VCN and the VM firewall, and install Caddy.
4. Copy this directory to `/opt/ctf-card-email/app`, create a virtual environment,
   and install `requirements.txt`.
5. Create `/opt/ctf-card-email/secrets/ctf-card-email.env` from the example and
   set mode `600`.
6. Run `bootstrap_outlook.py` once and authorize
   `changethewrld@outlook.com` using Microsoft's device page.
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

# CTF card-submission email worker

This Cloudflare Worker accepts the full card-submission JSON after the browser
successfully writes metadata to OperatorStack. It validates Cloudflare
Turnstile, rate-limits by client IP, and sends the exact JSON as an attachment
to `changethewrld@outlook.com` through Resend.

## Required setup

1. Create a Cloudflare Turnstile widget for `professorzoom45.github.io` with the
   action `card_submission`.
2. Create a Resend account, verify a sending domain, and replace
   `EMAIL_FROM` in `wrangler.jsonc` with an address on that domain.
3. If namespace `1001` is already used in the Cloudflare account, replace it
   with another positive integer unique to this rate limiter.
4. Install and authenticate Wrangler, then store both secrets without putting
   them in this repository:

   ```text
   npx wrangler secret put TURNSTILE_SECRET
   npx wrangler secret put RESEND_API_KEY
   ```

5. Run `npm install`, `npm run check`, and `npm run deploy` in this directory.
6. Put the deployed `/submit-card` URL and public Turnstile site key in
   `assets/js/submission-delivery-config.js`.

Do not commit either secret. The endpoint refuses requests from origins other
than `https://professorzoom45.github.io`, accepts no recipient from the browser,
limits requests to three per IP per minute, and rejects JSON attachments over
20 MiB.

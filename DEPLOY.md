# Deploying Luton MOT Centre to Hostinger

Follow these steps in order. **Do not send Google Ads traffic until step 6 passes.**

## 1. Upload the files

Upload everything in this folder to `public_html` on Hostinger, using either:

- **hPanel → File Manager** — drag the files in (or upload a zip and extract), or
- **FTP** — credentials are in hPanel → Files → FTP Accounts.

You should end up with `index.html`, `styles.css`, `script.js`, `hero-bg.png`,
`book.php` and `config.example.php` directly inside `public_html`.

## 2. Upload PHPMailer

`book.php` sends email through the PHPMailer library, which you upload once:

1. Download the latest release zip from https://github.com/PHPMailer/PHPMailer/releases
2. Extract it and upload the `src` folder to `public_html/PHPMailer/src`.
   Only three files are actually needed: `PHPMailer.php`, `SMTP.php`, `Exception.php`.

## 3. Create the mailbox

In hPanel → **Emails** → your domain → **Create email account**:

- Address: `bookings@THE-DOMAIN` (any name is fine, but keep it on the site's domain)
- Choose a strong password and note it down — you need it in the next step.

## 4. Create config.php

In File Manager, **copy** `config.example.php` to a new file named `config.php`
(same folder), then edit `config.php` and fill in:

- `smtp_username` / `from_email` — the mailbox you just created
- `smtp_password` — its password
- `to_email` — the garage owner's email address (where booking leads arrive)

`config.php` stays only on the server. It is gitignored and must never be
committed or shared.

## 5. Replace the remaining placeholders in index.html and script.js

- `REPLACE-WITH-DOMAIN.co.uk` → the real domain (canonical, og:url, og:image, JSON-LD)
- `AW-REPLACE_ME` → your Google Ads tag ID (in `index.html` **and** `script.js`)
- `FORM_SUBMIT_LABEL` / `PHONE_CALL_LABEL` in `script.js` → the conversion labels
  from Google Ads → Tools → Conversions

## 6. Send a test booking (required)

1. Open the live site on your phone, fill in the booking form with your own
   details and submit.
2. Confirm you see the green "Booking Request Sent!" panel.
3. **Confirm the email actually arrives** at the `to_email` address (check spam
   the first time, and mark it Not Spam if needed).
4. Also test a failure: temporarily rename `config.php`, submit again, and
   confirm you get the red error message with the phone number (then rename it
   back).

If the email doesn't arrive, check `smtp_username`/`smtp_password` in
`config.php` first — that's almost always the cause.

## 7. Go live

Only start the Google Ads campaign after step 6 passes and the placeholder
testimonials have been replaced with real reviews (see the comment above the
reviews section in `index.html`).

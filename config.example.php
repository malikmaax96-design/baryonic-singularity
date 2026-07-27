<?php
/**
 * config.example.php — TEMPLATE ONLY. Do not put real credentials in this file.
 *
 * TODO (before go-live):
 *   1. In Hostinger hPanel → Emails, create a mailbox for the site's domain,
 *      e.g. bookings@THE-DOMAIN (this is the account book.php sends FROM).
 *   2. Copy this file to config.php (same folder).
 *   3. Fill in the real values in config.php.
 *   4. NEVER commit config.php — it is listed in .gitignore.
 */

return [
    // Hostinger SMTP (defaults are correct for Hostinger shared hosting)
    'smtp_host'     => 'smtp.hostinger.com',
    'smtp_port'     => 465, // SSL

    // TODO: the mailbox you created in Hostinger, e.g. bookings@THE-DOMAIN
    'smtp_username' => 'bookings@REPLACE-WITH-DOMAIN.co.uk',
    // TODO: that mailbox's password
    'smtp_password' => 'REPLACE_ME',

    // Sender shown on the email — normally the same mailbox as smtp_username
    'from_email'    => 'bookings@REPLACE-WITH-DOMAIN.co.uk',

    // TODO: where booking emails should arrive — the garage owner's email address
    'to_email'      => 'REPLACE-WITH-OWNER-EMAIL@example.com',
];

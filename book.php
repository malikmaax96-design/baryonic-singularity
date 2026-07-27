<?php
/**
 * book.php — booking form endpoint for Luton MOT Centre
 *
 * Accepts POST from the booking form, validates & sanitises everything server-side,
 * emails the booking to the garage via PHPMailer over Hostinger SMTP, and returns JSON.
 *
 * Setup (see DEPLOY.md):
 *   1. Upload the PHPMailer library to a PHPMailer/ folder next to this file
 *      (only PHPMailer/src/PHPMailer.php, SMTP.php and Exception.php are needed).
 *   2. Copy config.example.php to config.php and fill in the real SMTP credentials.
 *   3. config.php is gitignored — it must never be committed.
 */

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

/** Send a JSON response and stop. */
function respond(int $status, bool $ok, string $error = ''): void
{
    http_response_code($status);
    echo json_encode($ok ? ['ok' => true] : ['ok' => false, 'error' => $error]);
    exit;
}

/* ── 1. POST only ─────────────────────────────────── */
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(405, false, 'Method not allowed.');
}

/* ── 2. Honeypot ──────────────────────────────────
   Hidden field humans never see. If it's filled, this is a bot — pretend
   success so the bot doesn't learn it was caught, but send nothing. */
if (trim((string)($_POST['website'] ?? '')) !== '') {
    respond(200, true);
}

/* ── 3. Sanitise ──────────────────────────────────
   Every value is trimmed, stripped of control characters and newlines
   (prevents email header injection), and length-capped. */
function clean(string $value, int $maxLen): string
{
    $value = trim($value);
    // Strip CR/LF and their encodings, plus NULs — header-injection guard
    $value = str_ireplace(["\r", "\n", '%0a', '%0d', "\0"], ' ', $value);
    // Strip remaining control characters
    $value = preg_replace('/[\x00-\x1F\x7F]/u', '', $value) ?? '';
    return mb_substr($value, 0, $maxLen);
}

$service    = clean((string)($_POST['service']    ?? ''), 40);
$name       = clean((string)($_POST['fullName']   ?? ''), 100);
$phone      = clean((string)($_POST['phone']      ?? ''), 20);
$reg        = strtoupper(str_replace(' ', '', clean((string)($_POST['vehicleReg'] ?? ''), 12)));
$makeModel  = clean((string)($_POST['vehicleMake'] ?? ''), 80);
$date       = clean((string)($_POST['prefDate']   ?? ''), 10);
$time       = clean((string)($_POST['prefTime']   ?? ''), 10);
// Notes may be multi-line: cap length and strip control chars except newlines.
// Only ever used in the plain-text email BODY (never near headers).
$notes = trim((string)($_POST['notes'] ?? ''));
$notes = preg_replace('/[^\P{C}\n]/u', '', $notes) ?? '';
$notes = mb_substr($notes, 0, 1000);

/* ── 4. Validate (never trust the client) ─────────── */
$allowedServices = ['MOT Test', 'Same Day MOT', 'Air Con Re-gas', 'Repairs'];
if (!in_array($service, $allowedServices, true)) {
    respond(400, false, 'Please choose a service.');
}

if ($name === '' || mb_strlen($name) < 2) {
    respond(400, false, 'Please enter your name.');
}

$phoneNormalised = preg_replace('/[\s\-().]/', '', $phone) ?? '';
if (!preg_match('/^(?:\+44[1-9]\d{8,9}|0[1-9]\d{8,9})$/', $phoneNormalised)) {
    respond(400, false, 'Please enter a valid UK phone number.');
}

// UK plates: current (AB12CDE), prefix (A123BCD), suffix (ABC123D), dateless (ABC1234 / 1234ABC)
if (!preg_match('/^(?:[A-Z]{2}\d{2}[A-Z]{3}|[A-Z]\d{1,3}[A-Z]{3}|[A-Z]{3}\d{1,3}[A-Z]|[A-Z]{1,3}\d{1,4}|\d{1,4}[A-Z]{1,3})$/', $reg)) {
    respond(400, false, 'Please enter a valid UK vehicle registration.');
}

$tz = new DateTimeZone('Europe/London');
$chosenDate = DateTimeImmutable::createFromFormat('Y-m-d', $date, $tz);
if (!$chosenDate || $chosenDate->format('Y-m-d') !== $date) {
    respond(400, false, 'Please choose a valid date.');
}
$today = new DateTimeImmutable('today', $tz);
if ($chosenDate < $today) {
    respond(400, false, 'Please choose today or a future date.');
}
if ($chosenDate->format('w') === '0') {
    respond(400, false, "We're closed on Sundays — please pick another day.");
}

$allowedTimes = ['', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
                 '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'];
if (!in_array($time, $allowedTimes, true)) {
    $time = ''; // unknown value — treat as "any time" rather than reject
}

/* ── 5. Load config ───────────────────────────────── */
$configFile = __DIR__ . '/config.php';
if (!is_file($configFile)) {
    respond(500, false, 'The booking system is not set up yet — please call us instead.');
}
$config = require $configFile;

/* ── 6. Build the email (plain text — nothing user-supplied goes near headers) ── */
$subject = sprintf('New booking: %s — %s (%s)', $service, $name, $reg);

$body = "NEW BOOKING REQUEST — Luton MOT Centre\n"
      . "══════════════════════════════════════\n\n"
      . "Service:        {$service}\n"
      . "Name:           {$name}\n"
      . "Phone:          {$phone}\n"
      . "Vehicle reg:    {$reg}\n"
      . "Make & model:   " . ($makeModel !== '' ? $makeModel : '—') . "\n"
      . "Preferred date: " . $chosenDate->format('l j F Y') . "\n"
      . "Preferred time: " . ($time !== '' ? $time : 'Any time') . "\n\n"
      . "Notes:\n" . ($notes !== '' ? $notes : '—') . "\n\n"
      . "──────────────────────────────────────\n"
      . "Reply by phone within the hour — that's what the site promises.\n"
      . "Sent from the website booking form on " . (new DateTimeImmutable('now', $tz))->format('d/m/Y H:i') . "\n";

/* ── 7. Send via PHPMailer over Hostinger SMTP ────── */
$phpmailerSrc = __DIR__ . '/PHPMailer/src';
if (!is_file($phpmailerSrc . '/PHPMailer.php')) {
    // PHPMailer not uploaded yet. Either upload it (see DEPLOY.md) or, as a stop-gap,
    // uncomment the plain mail() fallback at the bottom of this file.
    respond(500, false, 'The booking system is not set up yet — please call us instead.');
}
require $phpmailerSrc . '/Exception.php';
require $phpmailerSrc . '/PHPMailer.php';
require $phpmailerSrc . '/SMTP.php';

try {
    $mail = new PHPMailer\PHPMailer\PHPMailer(true);
    $mail->isSMTP();
    $mail->Host       = $config['smtp_host'];      // smtp.hostinger.com
    $mail->Port       = $config['smtp_port'];      // 465
    $mail->SMTPSecure = PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_SMTPS; // SSL
    $mail->SMTPAuth   = true;
    $mail->Username   = $config['smtp_username'];
    $mail->Password   = $config['smtp_password'];
    $mail->CharSet    = 'UTF-8';
    $mail->Timeout    = 10;

    $mail->setFrom($config['from_email'], 'Luton MOT Centre Website');
    $mail->addAddress($config['to_email']);
    // Reply-to is NOT set to user input on purpose: the customer gave a phone
    // number, not an email, and user data must stay out of the headers.

    $mail->Subject = $subject;
    $mail->Body    = $body;

    $mail->send();
    respond(200, true);
} catch (Throwable $e) {
    error_log('book.php mail send failed: ' . $e->getMessage());
    respond(500, false, "Sorry, we couldn't send your booking just now — please call us.");
}

/* ── FALLBACK: plain PHP mail() ───────────────────────────────────────────────
   If SMTP isn't set up yet, comment out section 7 above and uncomment this.
   On Hostinger, mail() usually works but is more likely to land in spam —
   set up the SMTP mailbox as soon as you can.

$headers = 'From: ' . $config['from_email'] . "\r\n"
         . 'X-Mailer: PHP/' . phpversion();
if (mail($config['to_email'], $subject, $body, $headers)) {
    respond(200, true);
}
error_log('book.php mail() fallback failed');
respond(500, false, "Sorry, we couldn't send your booking just now — please call us.");
─────────────────────────────────────────────────────────────────────────────── */

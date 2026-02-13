

# Switch Email Delivery from SMTP to Resend

## Overview
Replace the custom SMTP implementation with Resend's simple REST API for all outgoing emails. This eliminates the SMTP authentication issues you've been experiencing and provides reliable email delivery with a single API call.

## What Changes

### 1. Store Your Resend API Key
- You'll provide your Resend API key and it will be securely stored as a backend secret (`RESEND_API_KEY`)

### 2. Rewrite the Email Sending Logic
- Remove the entire raw SMTP/TCP connection code (~130 lines) from the `send-notification` backend function
- Replace it with a simple Resend API call (`POST https://api.resend.com/emails`)
- All existing email types continue working: **Contact form submissions**, **Speaker request notifications**, and **SMTP test emails**

### 3. Simplify the Admin Settings Page
- Remove the SMTP configuration section (host, port, username, password, encryption fields)
- Replace with a simple "Resend" integration card showing status (configured / not configured)
- Keep the existing "From Name", "From Email", and "Reply-To" fields so you can still customize sender identity
- Remove the "Test SMTP" button and replace with a "Send Test Email" button that uses Resend

### 4. Update the Database
- The `smtp_settings` table will still be used to store `from_name`, `from_email`, and `reply_to` preferences, but the SMTP-specific fields (host, port, username, encrypted_password, encryption) become unused

## Email Flow After Changes

1. Visitor submits Contact or Speaker Request form
2. Backend function validates and saves to database
3. Backend function calls Resend API to send the formatted HTML email to `support@buzzweave.com`
4. In-app notification is created

## Technical Details

**Edge Function (`send-notification/index.ts`):**
- Remove `sendSmtpEmail()`, `encryptPassword()`, `decryptPassword()` functions
- Add `sendResendEmail()` function that calls `https://api.resend.com/emails` with the `RESEND_API_KEY` secret
- Update `save_smtp` action to only save from_name, from_email, reply_to
- Update `test_smtp` action to send a test email via Resend instead
- Update the contact/speaker_request handlers to use Resend

**Admin Settings (`AdminSettings.tsx`):**
- Remove SMTP host/port/username/password/encryption fields
- Show a simple "Email (Resend)" card with from_name, from_email, reply_to inputs and a Test button
- Remove SMTP verified/unverified status indicators

**Important:** You will need to verify your sending domain (`buzzweave.com` or whichever domain you use for `from_email`) in the Resend dashboard for emails to deliver reliably. Until then, you can use Resend's default `onboarding@resend.dev` as the from address for testing.


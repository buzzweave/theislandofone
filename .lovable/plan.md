

# Fix SMTP for Office365 (smtp.office365.com)

## Root Cause

The current raw TCP SMTP implementation has several issues that cause failures with Office365:

1. **Multi-line response handling**: Office365 sends multi-line EHLO responses (e.g., `250-SIZE 157286400\r\n250-STARTTLS\r\n250 OK`). The current `read()` function does a single buffer read and may get partial data, causing missed STARTTLS capability detection or garbled responses.

2. **STARTTLS response not validated**: After sending `STARTTLS`, the code doesn't verify it got a `220` response before upgrading the connection.

3. **Read timing**: No delay between write and read, so the server may not have responded yet, causing empty reads.

4. **Connection not properly closed on TLS upgrade**: The original plain connection remains referenced in the catch block even after TLS upgrade.

## Solution

Rewrite the `sendSmtpEmail` function in `supabase/functions/send-notification/index.ts` with:

### 1. Proper multi-line SMTP response reader
Read in a loop until we get a complete SMTP response (lines ending with `XXX ` pattern indicating final line, vs `XXX-` indicating continuation).

### 2. Add small delays for read reliability
Use a brief delay before reads to ensure the server has time to respond.

### 3. Validate STARTTLS response
Check for `220` response before calling `Deno.startTls`.

### 4. Better error propagation
Include the actual SMTP response text in error messages so failures are debuggable.

### 5. Proper connection lifecycle
Track whether we've upgraded to TLS and close the correct connection in the catch block.

## Technical Details

The rewritten `sendSmtpEmail` function will:

```text
1. Connect via plain TCP to smtp.office365.com:587
2. Read greeting (wait for 220)
3. Send EHLO, read full multi-line response
4. Send STARTTLS, verify 220 response
5. Upgrade to TLS via Deno.startTls
6. Send EHLO again over TLS, read response
7. AUTH LOGIN with base64-encoded credentials
8. MAIL FROM, RCPT TO, DATA, send email body
9. QUIT and close
```

Key helper: `readFullResponse()` that accumulates data until a complete SMTP response is received (final line matches `/^\d{3} /` pattern).

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/send-notification/index.ts` | Rewrite `sendSmtpEmail` with robust multi-line response handling, STARTTLS validation, and proper error messages |


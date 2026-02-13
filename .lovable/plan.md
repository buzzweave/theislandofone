

# Update Speaker Request Form

## Changes

### 1. `src/pages/Speaking.tsx`

**Remove from Zod schema:**
- `expected_attendance`
- `budget`

**Remove from form UI:**
- "Expected Attendance" input
- "Budget / Honorarium" input

**Keep all other fields** -- Name, Email, Organization, Phone, Event Type, Event Date, Event Location, and Message ("Tell us about your event").

**Update handleSubmit** to stop sending `expected_attendance` and `budget`.

### 2. `supabase/functions/send-notification/index.ts`

**Remove from `formatSpeakerEmail`:**
- "Expected Attendance" row
- "Budget/Honorarium" row

**Remove from insert logic (around line 168):**
- Stop inserting `expected_attendance` and `budget` into `speaking_requests` table

**Verify all remaining fields transmit correctly in the notification email:**
- Name
- Organization
- Email
- Phone
- Event Type
- Event Date
- Event Location
- Message

The Reply-To header is already set to the submitter's email, so the admin can reply directly.

### 3. Test

After changes, navigate to the Speaking page and submit a test request to confirm the form sends and notification is created with all fields present.

### No Database Migration Needed

The `expected_attendance` and `budget` columns are nullable with defaults -- they remain in the table but will simply be empty for new submissions.


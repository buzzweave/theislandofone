

# Remove Budget/Attendance Fields & Add Reply Email to Speaker Request Form

## Changes

### 1. `src/pages/Speaking.tsx`

**Schema (lines 8-19):**
- Remove `expected_attendance` and `budget` from the Zod schema

**handleSubmit (around lines 48-55):**
- Stop sending `expected_attendance` and `budget` values

**Form UI:**
- Remove the "Expected Attendance" input field
- Remove the "Budget / Honorarium" input field
- The form grid will naturally reflow with the remaining fields

### 2. `supabase/functions/send-notification/index.ts`

**formatSpeakerEmail function:**
- Remove the "Expected Attendance" row from the HTML email table
- Remove the "Budget/Honorarium" row from the HTML email table

**Insert logic (around line 168):**
- Stop inserting `expected_attendance` and `budget` into the `speaking_requests` table (columns stay in DB, they'll just be empty)

### 3. Add Admin Reply Email

No additional "reply email" field is needed on the form -- the user already provides their email address. The `send-notification` edge function already sets the submitter's email as the `Reply-To` header on the outgoing notification email, so when the admin receives the email and hits "Reply", it goes directly to the person who submitted the form. This is already working.

### 4. Test the Form

After implementing, I will navigate to the Speaking page and submit a test request to verify the form sends successfully and the edge function processes it without errors.

## No Database Migration Needed

The `expected_attendance` and `budget` columns are nullable with defaults -- they can safely remain in the table. New submissions will simply have empty values for those fields.


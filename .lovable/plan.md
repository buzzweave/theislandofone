

# Stripe Payments + User Authentication Integration

## What We're Building

A complete payment system that allows visitors to:
- **Create an account** and log in
- **Buy individual books and sermons** as one-time purchases via Stripe Checkout
- **Subscribe to a membership plan** (Reader, Pastor, or Inner Circle) for unlimited access
- **Manage their subscription** through the Stripe Customer Portal

---

## Architecture Overview

The payment flow works like this:

1. User signs up / logs in (Lovable Cloud authentication)
2. User clicks "Purchase" on a book/sermon, or "Subscribe" on a membership plan
3. A backend function creates a Stripe Checkout session and returns a URL
4. User completes payment on Stripe's hosted checkout page
5. After payment, user is redirected back to a success page
6. A verification function checks Stripe for active purchases/subscriptions

---

## Step-by-Step Plan

### 1. User Authentication (Sign Up / Login)

Create a simple auth system for public visitors using Lovable Cloud auth:

- **New page**: `/auth` with sign-up and login forms (email + password)
- **New database table**: `profiles` to store basic user info (linked to auth)
- **Auth context**: Track logged-in state across the app
- **Protected actions**: "Purchase" and "Subscribe" buttons redirect to `/auth` if not logged in

### 2. Create Stripe Products and Prices

Create the following in Stripe to match your content:

**Membership Subscriptions (recurring monthly):**
- Reader Plan -- $9.99/month
- Pastor Plan -- $19.99/month
- Inner Circle Plan -- $39.99/month

**One-time purchases** will use dynamic pricing based on each book/sermon's price from your VPS database, so we'll pass price data at checkout time.

### 3. Backend Functions (Edge Functions)

**`create-checkout`** -- Creates a Stripe Checkout session for:
- One-time book/sermon purchases (mode: "payment")
- Subscription plans (mode: "subscription")
- Accepts item type, item ID, and price from the frontend
- Returns a Stripe Checkout URL

**`check-subscription`** -- Verifies a user's subscription status:
- Queries Stripe for active subscriptions by email
- Returns subscription tier and expiration date
- Called on login and page load

**`check-purchase`** -- Verifies one-time purchases:
- Queries Stripe for completed payments by email and metadata
- Returns whether a specific book/sermon has been purchased
- Called when viewing a book/sermon detail page

**`customer-portal`** -- Opens the Stripe billing portal:
- Lets users manage subscriptions, cancel, or change payment method

### 4. Database Changes

**New table: `profiles`**
- `id` (uuid, references auth.users)
- `email` (text)
- `full_name` (text, optional)
- `created_at` (timestamp)

With RLS policies so users can only read/update their own profile.

**New table: `purchases`**
- `id` (uuid)
- `user_id` (uuid, references auth.users)
- `item_type` (text: "book" or "sermon")
- `item_id` (text, the VPS book/sermon ID)
- `stripe_session_id` (text)
- `amount` (numeric)
- `created_at` (timestamp)

With RLS policies so users can only see their own purchases.

### 5. Frontend Changes

**New files:**
- `src/pages/Auth.tsx` -- Login/signup page
- `src/pages/PaymentSuccess.tsx` -- Post-payment confirmation page
- `src/contexts/AuthContext.tsx` -- Public user auth state (separate from admin auth)
- `src/hooks/useSubscription.ts` -- Check subscription status
- `src/hooks/usePurchases.ts` -- Check individual purchases

**Modified files:**
- `src/pages/BookDetail.tsx` -- Replace mock purchase with real Stripe checkout
- `src/pages/SermonDetail.tsx` -- Replace mock purchase with real Stripe checkout
- `src/pages/Membership.tsx` -- "Get Started" buttons trigger Stripe subscription checkout
- `src/App.tsx` -- Add auth routes and AuthContext provider
- `src/components/Layout.tsx` -- Add Login/Account link to navigation

### 6. Purchase Verification Flow

When a user views a paid book or sermon:
1. Check if user is logged in
2. If logged in, check if they have an active subscription (any tier unlocks all content)
3. If no subscription, check if they purchased this specific item
4. If neither, show the paywall with "Buy" and "Subscribe" options

---

## Technical Details

### Edge Function: `create-checkout`
- Accepts POST with `{ type: "book"|"sermon"|"subscription", itemId?, priceAmount?, planSlug? }`
- For subscriptions: uses pre-created Stripe price IDs
- For one-time purchases: creates a checkout session with `price_data` containing the item's price
- Stores `item_type` and `item_id` in session metadata for later verification
- Redirects to `/payment-success?session_id={CHECKOUT_SESSION_ID}` on success

### Edge Function: `check-purchase`
- Accepts POST with `{ itemType: "book"|"sermon", itemId: "uuid" }`
- Looks up Stripe customer by user email
- Searches completed checkout sessions with matching metadata
- Also checks the local `purchases` table for cached results

### Auth Page
- Tab-based UI: Sign In / Sign Up
- Email + password fields
- After login, redirects back to previous page
- Email confirmation required before first login

### Payment Success Page
- Receives `session_id` from URL
- Calls `check-purchase` or `check-subscription` to verify
- Records purchase in the `purchases` table
- Shows confirmation and link back to the content

### Membership Page Updates
- Each plan's "Get Started" button triggers Stripe subscription checkout
- If user is already subscribed, show their current plan with a "Manage" button
- "Manage" button opens Stripe Customer Portal


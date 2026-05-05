# Authentication Flow Documentation

## Overview

This document describes the authentication flow in the Elearn Mobile application, including phone registration, login, password reset, and the Supabase account mirror used by the mobile app.

## Authentication Flow

### Phone Registration Process

1. **User Registration (Step 1)**
   - User enters phone number with country indicator, password, and accepts terms.
   - App validates inputs with the selected country rules.
   - App calls Firebase Phone Auth via `sendPhoneOtp(phoneE164)`.
   - Platform-specific implementation is handled by:
     - `lib/firebasePhoneAuth.native.ts` for Android/iOS.
     - `lib/firebasePhoneAuth.web.ts` for web with invisible reCAPTCHA.

2. **OTP Verification (Step 2)**
   - User receives an SMS code.
   - User enters the OTP in the app.
   - Firebase validates the OTP and returns an `idToken`.
   - App calls `verifyFirebasePhone(idToken, phoneE164, password)`.
   - Backend route `/api/mobile/auth/verify-firebase` verifies the Firebase token, cross-checks the phone, creates the Supabase Auth user, then signs in with password to return a Supabase session.
   - Supabase Auth metadata stores `firebase_uid`.
   - User is redirected to onboarding.

### Login Process

1. **User Login**
   - User enters phone number and password.
   - App normalizes phone for Supabase Auth.
   - App calls `signIn`.
   - Supabase authenticates the user.
   - After session creation, `syncAccountAfterAuth` calls `/api/mobile/auth/createAccount` to ensure the `accounts` row exists and is synchronized.

### Password Reset Process

1. **Phone Entry**
   - User enters phone number with country indicator on `app/(auth)/forgot_password.tsx`.
   - The old email reset flow is no longer used on mobile.
   - App calls `sendPhoneOtp(phoneE164)`.

2. **OTP Verification**
   - User enters the Firebase SMS code.
   - Firebase validates the code and returns a fresh `idToken`.

3. **Password Update**
   - App sends `{ idToken, phone, newPassword }` to `/api/mobile/auth/reset-password`.
   - Backend verifies the Firebase token and checks that the submitted phone matches `payload.phone_number`.
   - Backend finds the Supabase user via `accounts.phone`.
   - Backend updates the password with `supabase.auth.admin.updateUserById(authId, { password })`.

This works for old Supabase-only users as long as their verified phone matches `accounts.phone`. The reset route supports local Cameroon storage (`694...`) and E.164-derived storage (`237694...`) when searching accounts.

### Post-Authentication Flow

1. **Session Validation**
   - App checks if the user has a valid session
   - If no session, redirect to auth screens
   - If session exists but onboarding is not complete, redirect to onboarding

2. **User Data Loading**
   - App fetches user data from the database
   - During this process, the "Chargement de votre expérience..." loading screen is displayed
   - Once user data is loaded, the app displays the main interface

## Account Mirror Rules

The `public.accounts` table mirrors Supabase Auth users for application data. Current rule:

- `accounts.id` must match `auth.users.id`.
- `accounts."authId"` also stores `auth.users.id` for backward compatibility.
- `accounts.firebase_uid` stores Firebase UID from Supabase Auth metadata when available.
- Phone auth users may not have an email, so backend/schema uses a fallback email like `{authUserId}@phone.elearnprepa.local`.

### Database Trigger

`public.create_account_on_auth_insert()` in `supabase/schemas/0_prod.sql` creates or updates the account row after `auth.users` insert.

It:

- normalizes phone numbers,
- inserts `id = NEW.id` and `"authId" = NEW.id`,
- copies `firebase_uid` from `raw_user_meta_data` or `raw_app_meta_data`,
- stores raw user metadata in `accounts.metadata`,
- updates existing rows on `"authId"` conflict.

### Existing Account Backfill

Migration `supabase/migrations/20260504231913_fix user auth .sql` aligns old records:

- updates FK constraints that did not have `ON UPDATE CASCADE`,
- updates `news_views` and `news_interactions`, which store account ids without FK,
- updates `accounts.id = accounts."authId"`,
- backfills `accounts.firebase_uid` from `auth.users` metadata.

The migration also fixes `check_account_unique_contacts()` so an update that changes the account id excludes `OLD.id`; otherwise the row can falsely detect its own phone as a duplicate.

### API Account Sync

`/api/mobile/auth/createAccount` must also enforce the mirror rule because the mobile app calls it after login/session recovery.

The payload must include:

- `id: user.id`,
- `authId: user.id`,
- fallback email when missing,
- normalized phone,
- `firebase_uid` from `user.user_metadata.firebase_uid` when present.

Important deployment note: `supabase db push` applies DB migrations only. Changes to `/api/mobile/auth/createAccount`, `/api/mobile/auth/verify-firebase`, and `/api/mobile/auth/reset-password` require redeploying the backoffice/API.

## Known Issue: Loading Screen Delay

### Issue Description

The "Chargement de votre expérience..." loading screen can take time during account creation or confirmation if the `accounts` row is not immediately available.

### Causes

1. **Account Creation Delay**
   - Auth session may be created before `accounts` is fully synced.

2. **API Call Latency**
   - The account sync API call uses the configured API base URL from `useAppConfig`.

3. **Loading State Management**
   - `isAccountCreating` keeps the loading state active while signup/account sync is in progress.

### Potential Improvements

1. **Optimize Account Creation Process**
   - Keep `/api/mobile/auth/createAccount` fast and idempotent.

2. **Improve Loading State Management**
   - Ensure `setIsAccountCreating(false)` happens on success and error paths.

3. **Enhance User Experience**
   - Keep onboarding reachable while account sync completes.

## Implementation Details

### Key Files

- `contexts/auth.tsx`: Contains the auth context and provider with authentication logic
- `app/(auth)/register.tsx`: Registration screen implementation
- `app/(auth)/login.tsx`: Login screen implementation
- `app/(auth)/forgot_password.tsx`: Phone OTP password reset implementation
- `lib/firebasePhoneAuth.native.ts`: Native Firebase Phone Auth implementation
- `lib/firebasePhoneAuth.web.ts`: Web Firebase Phone Auth implementation
- `app/(app)/_layout.tsx`: App layout with authentication checks and loading screen
- `components/shared/LoadingAnimation1.tsx`: Loading animation component
- Backoffice `/api/mobile/auth/verify-firebase`: Firebase token verification and Supabase user creation
- Backoffice `/api/mobile/auth/reset-password`: Firebase-verified password reset
- Backoffice `/api/mobile/auth/createAccount`: Account row sync after session creation
- Backoffice `supabase/schemas/0_prod.sql`: declarative schema for account trigger and constraints
- Backoffice `supabase/migrations/20260504231913_fix user auth .sql`: migration for account id alignment

### Authentication Context

The `AuthProvider` in `contexts/auth.tsx` manages the authentication state and provides functions for sign-in, sign-up, and OTP verification. It also handles user data fetching and real-time updates.

### Loading Screen

The loading screen is displayed in the app layout (`app/(app)/_layout.tsx`) when:
- The `isLoading` state in the auth context is true, or
- There's a session but no user data yet (`session && !user`)

The loading screen uses the `LoadingAnimation` component, which displays a rotating and pulsing circle with the text "Chargement de votre expérience...".

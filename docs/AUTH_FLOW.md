# Authentication Flow Documentation

## Overview

This document describes the authentication flow in the Elearn Mobile application, including the registration, login, and account confirmation processes. It also highlights a known issue with the loading screen during account creation and confirmation.

## Authentication Flow

### Registration Process

1. **User Registration (Step 1)**
   - User enters phone number, password, and accepts terms
   - App validates inputs
   - App calls `signUp` function from auth context
   - Supabase creates a new user account
   - App sends an API request to create the user account in the database
   - App transitions to OTP verification step

2. **OTP Verification (Step 2)**
   - User receives an SMS with a verification code
   - User enters the code in the app
   - App calls `verifyOtp` function from auth context
   - Supabase verifies the OTP
   - App completes the account creation process
   - User is redirected to the app or onboarding flow

### Login Process

1. **User Login**
   - User enters phone number and password
   - App validates inputs
   - App calls `signIn` function from auth context
   - Supabase authenticates the user
   - User is redirected to the app

### Post-Authentication Flow

1. **Session Validation**
   - App checks if the user has a valid session
   - If no session, redirect to auth screens
   - If session exists but onboarding is not complete, redirect to onboarding

2. **User Data Loading**
   - App fetches user data from the database
   - During this process, the "Chargement de votre expérience..." loading screen is displayed
   - Once user data is loaded, the app displays the main interface

## Known Issue: Loading Screen Delay

### Issue Description

The "Chargement de votre expérience..." loading screen often takes a long time to complete, especially during account creation or confirmation. This can lead to a poor user experience as users wait for the app to load.

### Causes

1. **Account Creation Delay**
   - The `waitForAccountData` function in the auth context polls the database with a delay between retries
   - It can make up to 5 retries with 1-second delays between each retry
   - This can cause a delay of up to 5 seconds

2. **API Call Latency**
   - The account creation API call to `https://elearn.ezadrive.com/api/mobile/auth/createAccount` might be slow
   - Network latency can further increase the delay

3. **Loading State Management**
   - The `isAccountCreating` state keeps the loading state active during account creation
   - Complex loading state management across multiple useEffect hooks can lead to edge cases

### Potential Improvements

1. **Optimize Account Creation Process**
   - Reduce the delay between retries in the `waitForAccountData` function
   - Consider using a more efficient approach than polling, such as WebSockets or real-time database listeners

2. **Improve Loading State Management**
   - Simplify the loading state management to avoid edge cases
   - Add timeout handling to prevent indefinite loading states

3. **Enhance User Experience**
   - Add progress indicators or step indicators to show users where they are in the process
   - Display helpful messages during the loading process
   - Consider adding a timeout with a retry option if the loading takes too long

4. **Backend Optimizations**
   - Optimize the account creation API endpoint for faster response times
   - Consider moving some operations to background processes

## Implementation Details

### Key Files

- `contexts/auth.tsx`: Contains the auth context and provider with authentication logic
- `app/(auth)/register.tsx`: Registration screen implementation
- `app/(auth)/login.tsx`: Login screen implementation
- `app/(app)/_layout.tsx`: App layout with authentication checks and loading screen
- `components/shared/LoadingAnimation1.tsx`: Loading animation component

### Authentication Context

The `AuthProvider` in `contexts/auth.tsx` manages the authentication state and provides functions for sign-in, sign-up, and OTP verification. It also handles user data fetching and real-time updates.

### Loading Screen

The loading screen is displayed in the app layout (`app/(app)/_layout.tsx`) when:
- The `isLoading` state in the auth context is true, or
- There's a session but no user data yet (`session && !user`)

The loading screen uses the `LoadingAnimation` component, which displays a rotating and pulsing circle with the text "Chargement de votre expérience...".
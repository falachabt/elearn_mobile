# Push Notification System for Elearn Mobile

This document provides an overview of the push notification system implemented for the Elearn Mobile application.

## Components

The push notification system consists of the following components:

1. **Client-side registration**: The mobile app registers for push notifications and stores the Expo push token in the user's metadata.
2. **Server-side sending**: A GitHub Actions workflow that runs on a schedule to send push notifications to all users who have registered.

## Client-side Implementation

The client-side implementation is handled by the following files:

- `utils/pushNotifications.ts`: Contains functions to register for push notifications and store the token in the user's metadata.
- `contexts/auth.tsx`: Integrates push notification registration into the authentication flow.
- `types/type.ts`: Defines the structure of the user metadata, including the Expo push token.

## Server-side Implementation

The server-side implementation is handled by the following files:

- `.github/workflows/send-push-notifications.yml`: GitHub Actions workflow that runs on a schedule to send push notifications.
- `scripts/sendPushNotifications.js`: Script that fetches users with push tokens and sends them notifications.

## GitHub Secrets

To run the GitHub Actions workflow, you need to set up the following secrets in your GitHub repository:

1. `SUPABASE_URL`: The URL of your Supabase project
2. `SUPABASE_SERVICE_KEY`: The service role API key for your Supabase project

See the README files in the respective directories for more detailed information.

## Testing Locally

You can test the push notification script locally by following the instructions in the `scripts/README.md` file.

## Customizing Notifications

To customize the notification message, edit the `scripts/sendPushNotifications.js` file and modify the `title` and `body` properties in the message object.

## Future Improvements

Potential future improvements to the push notification system:

1. Add support for targeted notifications to specific user segments
2. Implement notification templates for different types of messages
3. Add tracking of notification delivery and open rates
4. Implement a notification preferences system for users to control what notifications they receive
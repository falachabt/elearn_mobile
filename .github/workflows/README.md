# Push Notification Workflow

This directory contains GitHub Actions workflows for the Elearn Mobile application.

## Send Push Notifications Workflow

The `send-push-notifications.yml` workflow is designed to send push notifications to all users who have registered for push notifications in the app.

### How it works

1. The workflow runs on a daily schedule (12:00 UTC) and can also be triggered manually
2. It sets up a Node.js environment and installs the required dependencies
3. It runs the `scripts/sendPushNotifications.js` script which:
   - Connects to the Supabase database
   - Fetches all users who have an Expo push token stored in their metadata
   - Sends a push notification to these users using the Expo Server SDK

### Required GitHub Secrets

To run this workflow, you need to set up the following secrets in your GitHub repository:

1. `SUPABASE_URL`: The URL of your Supabase project
   - This can be found in your Supabase dashboard under Project Settings > API
   - Example: `https://yourprojectid.supabase.co`

2. `SUPABASE_SERVICE_KEY`: The service role API key for your Supabase project
   - This can be found in your Supabase dashboard under Project Settings > API > Project API keys > `service_role` key
   - **IMPORTANT**: This is a powerful key that bypasses Row Level Security. Keep it secure!

### Setting up the secrets

1. Go to your GitHub repository
2. Click on "Settings" > "Secrets and variables" > "Actions"
3. Click on "New repository secret"
4. Add each of the secrets mentioned above

### Testing the workflow

You can manually trigger the workflow from the "Actions" tab in your GitHub repository to test it without waiting for the scheduled run.
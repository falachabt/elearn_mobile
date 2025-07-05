# Push Notification Scripts

This directory contains scripts for sending push notifications to Elearn Mobile users.

## sendPushNotifications.js

This script fetches all users who have an Expo push token stored in their metadata and sends them a push notification.

### Prerequisites

- Node.js installed on your machine
- Access to the Supabase project

### Installation

1. Navigate to this directory:
   ```
   cd scripts
   ```

2. Install dependencies:
   ```
   npm install
   ```

### Usage

To run the script, you need to set the following environment variables:

- `SUPABASE_URL`: The URL of your Supabase project
- `SUPABASE_SERVICE_KEY`: The service role API key for your Supabase project

#### Running locally

On Windows:
```
set SUPABASE_URL=https://yourprojectid.supabase.co
set SUPABASE_SERVICE_KEY=your-service-key
npm run send
```

On macOS/Linux:
```
SUPABASE_URL=https://yourprojectid.supabase.co SUPABASE_SERVICE_KEY=your-service-key npm run send
```

### What the script does

1. Connects to the Supabase database using the provided credentials
2. Fetches all users who have metadata
3. Filters users who have an Expo push token in their metadata
4. Sends a push notification to these users with the message "Happy to have you in notifications test"
5. Logs the results to the console

### Customizing the notification

To change the notification message, edit the `sendPushNotifications.js` file and modify the `title` and `body` properties in the message object.
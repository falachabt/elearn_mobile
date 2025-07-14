const { createClient } = require('@supabase/supabase-js');
const { Expo } = require('expo-server-sdk');

// Initialize Expo SDK
const expo = new Expo();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing required environment variables: SUPABASE_URL and/or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Array of varied inactivity reminder messages
const inactivityMessages = [
  "Humm, ce n'est pas comme ça qu'on prépare son concours, les autres se connectent tous les jours, ça fait {days} jours que nous ne vous avons pas vu.",
  "Attention! Votre préparation est en danger. Ça fait {days} jours sans activité. Revenez vite!",
  "Vos concurrents progressent pendant que vous êtes absent. {days} jours sans étudier, c'est trop!",
  "Vous manquez à ElearnPrepa! Ça fait {days} jours que vous n'êtes pas revenu. Continuez votre préparation!",
  "Un champion ne s'arrête jamais! Reprenez votre préparation après {days} jours d'absence.",
  "Votre réussite dépend de votre constance. Revenez après {days} jours d'absence!"
];

async function sendInactivityReminders() {
  try {
    console.log('Starting inactivity reminder process...');

    // Get current time
    const now = new Date();

    // Calculate the date 2 days ago
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

    console.log(`Current time: ${now.toISOString()}`);
    console.log(`Looking for users inactive since: ${twoDaysAgo.toISOString()}`);

    // Query users whose last_updated is more than 2 days ago
    const { data: inactiveUsers, error: inactivityError } = await supabase
      .from('user_streaks')
      .select('user_id, last_updated')
      .lt('last_updated', twoDaysAgo.toISOString());

    if (inactivityError) {
      throw inactivityError;
    }

    console.log(`Found ${inactiveUsers.length} inactive users`);

    if (inactiveUsers.length === 0) {
      console.log('No inactive users found. Exiting.');
      return;
    }

    // Get the user IDs of inactive users
    const userIds = inactiveUsers.map(user => user.user_id);

    // Query the accounts table to get users with Expo push tokens
    // Process users in batches to avoid URL length limitations
    const BATCH_SIZE = 100; // Adjust this number based on your needs
    let allUsers = [];

    // Process users in batches
    for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
      const batchUserIds = userIds.slice(i, i + BATCH_SIZE);
      console.log(`Processing batch ${Math.floor(i/BATCH_SIZE) + 1} of ${Math.ceil(userIds.length/BATCH_SIZE)} (${batchUserIds.length} users)`);

      const { data: batchUsers, error: userError } = await supabase
        .from('accounts')
        .select('id, email, firstname, lastname, metadata')
        .in('id', batchUserIds)
        .not('metadata', 'is', null);

      if (userError) {
        throw userError;
      }

      allUsers = allUsers.concat(batchUsers);
    }

    const users = allUsers;

    // Filter users who have an Expo push token in their metadata
    const usersWithTokens = users.filter(user =>
      user.metadata &&
      typeof user.metadata === 'object' &&
      user.metadata.expoPushToken
    );

    console.log(`Found ${usersWithTokens.length} inactive users with Expo push tokens`);

    if (usersWithTokens.length === 0) {
      console.log('No inactive users with push tokens found. Exiting.');
      return;
    }

    // Create messages for each user
    const messages = usersWithTokens.map(user => {
      const token = user.metadata.expoPushToken;

      // Find the user's inactivity data
      const inactivityData = inactiveUsers.find(inactiveUser => inactiveUser.user_id === user.id);
      if (!inactivityData) return null;

      // Calculate days of inactivity
      const lastUpdated = new Date(inactivityData.last_updated);
      const daysInactive = Math.floor((now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24));

      // Validate the token
      if (!Expo.isExpoPushToken(token)) {
        console.warn(`Invalid Expo push token ${token} for user ${user.id}`);
        return null;
      }

      // Select a random message from the array
      const randomIndex = Math.floor(Math.random() * inactivityMessages.length);
      let messageTemplate = inactivityMessages[randomIndex];

      // Replace {days} placeholder with actual days of inactivity
      const personalizedMessage = messageTemplate.replace('{days}', daysInactive);

      // Create a message with image support
      return {
        to: token,
        sound: 'default',
        title: "Vous nous manquez! 📚",
        body: personalizedMessage,
        data: {
          type: "inactivity_reminder",
          userId: user.id,
          action: "open_app",
          daysInactive: daysInactive
        },
        // Android specific configuration
        channelId: 'inactivity_reminders',
        priority: 'high'
      };
    }).filter(Boolean); // Remove null entries

    console.log(`Sending inactivity reminders to ${messages.length} users`);

    // Chunk the messages to avoid hitting Expo's limit
    const chunks = expo.chunkPushNotifications(messages);

    // Send the chunks and handle receipts
    const tickets = [];
    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        console.log('Push notification tickets:', ticketChunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error('Error sending push notification chunk:', error);
      }
    }

    // Optional: Check receipt status after some delay
    setTimeout(async () => {
      try {
        const receiptIds = tickets
          .filter(ticket => ticket.status === 'ok')
          .map(ticket => ticket.id);

        if (receiptIds.length > 0) {
          const receiptChunks = expo.chunkPushNotificationReceiptIds(receiptIds);

          for (const chunk of receiptChunks) {
            const receipts = await expo.getPushNotificationReceiptsAsync(chunk);
            console.log('Receipt status:', receipts);

            // Handle errors in receipts
            for (const receiptId in receipts) {
              const receipt = receipts[receiptId];
              if (receipt.status === 'error') {
                console.error(`Error in receipt ${receiptId}:`, receipt.message);
                if (receipt.details && receipt.details.error) {
                  console.error('Error details:', receipt.details.error);
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('Error checking receipts:', error);
      }
    }, 5000); // Check receipts after 5 seconds

    console.log('Inactivity reminder notifications sent successfully');
  } catch (error) {
    console.error('Error sending inactivity reminder notifications:', error);
    process.exit(1);
  }
}

// Execute the function
sendInactivityReminders();

// This script should be scheduled to run daily at 19:00 Cameroon time (UTC+1)
// You can use GitHub Actions, cron jobs, or a service like Heroku Scheduler
// Example GitHub Actions workflow:
/*
name: Send Inactivity Reminders

on:
  schedule:
    # Run at 19:00 Cameroon time (18:00 UTC) every day
    - cron: '0 18 * * *'
  workflow_dispatch:  # Allow manual triggering

jobs:
  send-reminders:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '16'
      - name: Install dependencies
        run: npm install
      - name: Send inactivity reminders
        run: node scripts/sendInactivityReminders.js
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
*/

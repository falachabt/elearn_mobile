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

// Streak reminder message template
const streakReminderMessage = {
  title: "⚠️ Attention! Votre série est en danger!",
  body: "Votre série de jours consécutifs va expirer dans moins de 12 heures. Connectez-vous maintenant pour la maintenir!",
  image: "https://yhznbitjlzeslvudbsil.supabase.co/storage/v1/object/public/elearn/notifications/Streak.jpg"
};

async function sendStreakReminders() {
  try {
    console.log('Starting streak reminder process...');

    // Get current time
    const now = new Date();
    
    // Calculate the time 12 hours from now
    const twelveHoursFromNow = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    
    console.log(`Current time: ${now.toISOString()}`);
    console.log(`Looking for streaks expiring before: ${twelveHoursFromNow.toISOString()}`);

    // Query users with streaks that will expire in less than 12 hours
    const { data: usersWithExpiringStreaks, error: streakError } = await supabase
      .from('user_streaks')
      .select('user_id, next_deadline, current_streak')
      .lt('next_deadline', twelveHoursFromNow.toISOString())
      .gt('next_deadline', now.toISOString())
      .gt('current_streak', 0);

    if (streakError) {
      throw streakError;
    }

    console.log(`Found ${usersWithExpiringStreaks.length} users with expiring streaks`);

    if (usersWithExpiringStreaks.length === 0) {
      console.log('No users with expiring streaks found. Exiting.');
      return;
    }

    // Get the user IDs of users with expiring streaks
    const userIds = usersWithExpiringStreaks.map(streak => streak.user_id);

    // Query the accounts table to get users with Expo push tokens
    const { data: users, error: userError } = await supabase
      .from('accounts')
      .select('id, email, firstname, lastname, metadata')
      .in('id', userIds)
      .not('metadata', 'is', null);

    if (userError) {
      throw userError;
    }

    // Filter users who have an Expo push token in their metadata
    const usersWithTokens = users.filter(user =>
       user.id  === "cb5400a3-6dfe-49bf-9bb8-d02d81c204a1" &&
        user.metadata &&
      typeof user.metadata === 'object' &&
      user.metadata.expoPushToken
    );

    console.log(`Found ${usersWithTokens.length} users with expiring streaks and Expo push tokens`);

    if (usersWithTokens.length === 0) {
      console.log('No users with push tokens and expiring streaks found. Exiting.');
      return;
    }

    // Create messages for each user
    const messages = usersWithTokens.map(user => {
      const token = user.metadata.expoPushToken;

      // Find the user's streak data
      const streakData = usersWithExpiringStreaks.find(streak => streak.user_id === user.id);
      if (!streakData) return null;

      // Calculate hours remaining until streak expires
      const expiryTime = new Date(streakData.next_deadline);
      const hoursRemaining = Math.round((expiryTime.getTime() - now.getTime()) / (1000 * 60 * 60));

      // Validate the token
      if (!Expo.isExpoPushToken(token)) {
        console.warn(`Invalid Expo push token ${token} for user ${user.id}`);
        return null;
      }

      // Personalize message if user has a firstname
      const personalizedBody = user.firstname 
        ? `${user.firstname}, votre série de ${streakData.current_streak} jours consécutifs va expirer dans moins de ${hoursRemaining} heures. Connectez-vous maintenant pour la maintenir!`
        : streakReminderMessage.body;

      // Create a message with image support
      return {
        to: token,
        sound: 'default',
        title: streakReminderMessage.title,
        body: personalizedBody,
        data: {
          type: "streak_reminder",
          userId: user.id,
          imageUrl: streakReminderMessage.image,
          action: "open_app",
          hoursRemaining: hoursRemaining
        },
        // Use richContent for image (compatible with iOS and Android)
        richContent: {
          image: streakReminderMessage.image
        },
        // Android specific configuration
        channelId: 'streak_reminders',
        priority: 'high'
      };
    }).filter(Boolean); // Remove null entries

    console.log(`Sending streak reminders to ${messages.length} users`);

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

    console.log('Streak reminder notifications sent successfully');
  } catch (error) {
    console.error('Error sending streak reminder notifications:', error);
    process.exit(1);
  }
}

// Execute the function
sendStreakReminders();
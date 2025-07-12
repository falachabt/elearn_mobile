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

// Message de motivation unique
const promotionalMessage = {
  title: "🚀 SEMAINE DÉCOUVERTE!",
  body: "Prépare ton concours à 7900 FCFA! Économise 47% sur ElearnPrépa 📚",
  image: "https://yhznbitjlzeslvudbsil.supabase.co/storage/v1/object/public/elearn/notifications/Promotion.jpg"
};

async function sendPushNotifications() {
  try {
    console.log('Fetching users with Expo push tokens...');

    // Query the database for users with Expo push tokens
    const { data: users, error } = await supabase
        .from('accounts')
        .select('id, email, firstname, lastname, metadata')
        .not('metadata', 'is', null);

    if (error) {
      throw error;
    }

    console.log(`Found ${users.length} users with metadata`);

    // Filter users who have an Expo push token in their metadata
    const usersWithTokens = users.filter(user =>
        user.metadata &&
        typeof user.metadata === 'object' &&
        user.metadata.expoPushToken
    );

    console.log(`Found ${usersWithTokens.length} users with Expo push tokens`);

    if (usersWithTokens.length === 0) {
      console.log('No users with push tokens found. Exiting.');
      return;
    }

    // Create messages for each user
    const messages = usersWithTokens.map(user => {
      const token = user.metadata.expoPushToken;

      // Validate the token
      if (!Expo.isExpoPushToken(token)) {
        console.warn(`Invalid Expo push token ${token} for user ${user.id}`);
        return null;
      }

      // Create a message with image support using richContent
      return {
        to: token,
        sound: 'default',
        title: promotionalMessage.title,
        body: promotionalMessage.body,
        data: {
          type: "promotion",
          userId: user.id,
          imageUrl: promotionalMessage.image,
          action: "open_app"
        },
        // Utilisation du champ richContent pour l'image (compatible iOS et Android)
        richContent: {
          image: promotionalMessage.image
        },
        // Configuration spécifique Android
        channelId: 'promotion',
        priority: 'high'
      };
    }).filter(Boolean); // Remove null entries

    console.log(`Sending notifications to ${messages.length} users`);

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

    console.log('Push notifications sent successfully');
  } catch (error) {
    console.error('Error sending push notifications:', error);
    process.exit(1);
  }
}

// Execute the function
sendPushNotifications();
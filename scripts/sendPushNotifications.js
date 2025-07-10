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
      
      // Create a message
      return {
  "to": token,
  "notification": {
    "sound": "default",
    "title": "🔥 Garde le cap !",
    "body": "Chaque petit pas compte. Continue comme ça, tu es sur la bonne voie 💯",
  },
  "data": {
    "type": "motivation"
  }
}
;

    }).filter(Boolean); // Remove null entries
    
    console.log(`Sending notifications to ${messages.length} users`);
    
    // Chunk the messages to avoid hitting Expo's limit
    const chunks = expo.chunkPushNotifications(messages);
    
    // Send the chunks
    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        console.log('Push notification tickets:', ticketChunk);
      } catch (error) {
        console.error('Error sending push notification chunk:', error);
      }
    }
    
    console.log('Push notifications sent successfully');
  } catch (error) {
    console.error('Error sending push notifications:', error);
    process.exit(1);
  }
}

// Execute the function
sendPushNotifications();

// Annonce hebdomadaire : chaque dimanche à 14h (heure du Cameroun, UTC+1),
// notifie tous les utilisateurs ayant un push token que le classement hebdo
// est disponible. Le tap ouvre le classement en scope "hebdo".

const { createClient } = require('@supabase/supabase-js');
const { Expo } = require('expo-server-sdk');

const expo = new Expo();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing required environment variables: SUPABASE_URL and/or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function sendWeeklyLeaderboardNotification() {
  console.log('Fetching users with Expo push tokens...');

  const { data: users, error } = await supabase
    .from('accounts')
    .select('id, metadata')
    .not('metadata', 'is', null);

  if (error) throw error;

  const usersWithTokens = users.filter(
    (u) => u.metadata && typeof u.metadata === 'object' && u.metadata.expoPushToken
  );

  console.log(`Found ${usersWithTokens.length} users with push tokens.`);

  if (usersWithTokens.length === 0) {
    console.log('No users with push tokens. Exiting.');
    return;
  }

  const messages = usersWithTokens
    .filter((u) => Expo.isExpoPushToken(u.metadata.expoPushToken))
    .map((u) => ({
      to: u.metadata.expoPushToken,
      sound: 'default',
      title: 'Classement hebdo disponible !',
      body: 'Découvre ton classement de la semaine et vise le top.',
      data: { type: 'weekly_leaderboard', screen: '/leaderboard?scope=weekly' },
      priority: 'high',
    }));

  console.log(`Sending ${messages.length} notification(s)...`);

  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    try {
      const tickets = await expo.sendPushNotificationsAsync(chunk);
      console.log('Tickets:', tickets);
    } catch (err) {
      console.error('Error sending chunk:', err);
    }
  }

  console.log('Weekly leaderboard notification run complete.');
}

sendWeeklyLeaderboardNotification().catch((err) => {
  console.error('Fatal error in weekly leaderboard notification run:', err);
  process.exit(1);
});

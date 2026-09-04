// Rattrapage push pour le fil d'actualité : les commentaires/réponses/likes/
// mentions déclenchent déjà un push immédiat via un trigger Postgres
// (enqueue_feed_notification_push -> pg_net -> edge function feed-notification-push).
// Ce script ne remplace PAS ce flux — il tourne en catch-up périodique (GitHub
// Action) et regroupe en UN SEUL push par utilisateur toute notification
// restée sent_push=false (échec transitoire de l'edge function/webhook,
// aucun autre mécanisme de retry n'existe aujourd'hui).

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

const TYPE_LABELS = {
  post_comment: 'commentaire',
  post_reply: 'réponse',
  post_like: 'like',
  mention: 'mention',
  admin_message: 'message',
};

function buildDigestMessage(userNotifications) {
  if (userNotifications.length === 1) {
    const n = userNotifications[0];
    return { title: n.title, body: n.body, data: n.data || {} };
  }

  const counts = {};
  for (const n of userNotifications) {
    counts[n.type] = (counts[n.type] || 0) + 1;
  }
  const parts = Object.entries(counts).map(
    ([type, count]) => `${count} ${TYPE_LABELS[type] || type}${count > 1 ? 's' : ''}`
  );

  // Ouvre le dernier post concerné (le plus pertinent) au tap.
  const latest = userNotifications[userNotifications.length - 1];

  return {
    title: `${userNotifications.length} nouvelles notifications`,
    body: parts.join(', '),
    data: latest.data || {},
  };
}

async function sendDigestPushNotifications() {
  console.log('Fetching pending (sent_push=false) feed notifications...');

  const { data: pending, error } = await supabase
    .from('notifications')
    .select('id, user_id, type, title, body, data, created_at')
    .eq('sent_push', false)
    .order('created_at', { ascending: true });

  if (error) throw error;

  if (!pending || pending.length === 0) {
    console.log('No pending notifications. Exiting.');
    return;
  }

  console.log(`Found ${pending.length} pending notifications.`);

  const byUser = new Map();
  for (const n of pending) {
    if (!byUser.has(n.user_id)) byUser.set(n.user_id, []);
    byUser.get(n.user_id).push(n);
  }

  console.log(`Grouped into ${byUser.size} users.`);

  const { data: accounts, error: accountsError } = await supabase
    .from('accounts')
    .select('id, metadata')
    .in('id', [...byUser.keys()]);

  if (accountsError) throw accountsError;

  const tokenByUser = new Map(
    accounts
      .filter((a) => a.metadata && typeof a.metadata === 'object' && a.metadata.expoPushToken)
      .map((a) => [a.id, a.metadata.expoPushToken])
  );

  const messages = [];
  const notificationIdsByToken = new Map();

  for (const [userId, userNotifications] of byUser) {
    const token = tokenByUser.get(userId);
    if (!token || !Expo.isExpoPushToken(token)) {
      console.warn(`No valid push token for user ${userId}, skipping ${userNotifications.length} notification(s).`);
      continue;
    }

    const digest = buildDigestMessage(userNotifications);
    messages.push({
      to: token,
      sound: 'default',
      title: digest.title,
      body: digest.body,
      data: digest.data,
      priority: 'high',
    });
    notificationIdsByToken.set(token, userNotifications.map((n) => n.id));
  }

  if (messages.length === 0) {
    console.log('No sendable messages (no valid tokens). Exiting.');
    return;
  }

  console.log(`Sending ${messages.length} digest push(es)...`);

  const chunks = expo.chunkPushNotifications(messages);
  const sentNotificationIds = [];

  for (const chunk of chunks) {
    try {
      const tickets = await expo.sendPushNotificationsAsync(chunk);
      tickets.forEach((ticket, i) => {
        const msg = chunk[i];
        if (ticket.status === 'ok') {
          sentNotificationIds.push(...(notificationIdsByToken.get(msg.to) || []));
        } else {
          console.error(`Ticket error for ${msg.to}:`, ticket.message);
        }
      });
    } catch (err) {
      console.error('Error sending push chunk:', err);
    }
  }

  if (sentNotificationIds.length > 0) {
    const { error: updateError } = await supabase
      .from('notifications')
      .update({ sent_push: true })
      .in('id', sentNotificationIds);

    if (updateError) {
      console.error('Error marking notifications as sent:', updateError);
    } else {
      console.log(`Marked ${sentNotificationIds.length} notifications as sent_push=true.`);
    }
  }

  console.log('Digest push run complete.');
}

sendDigestPushNotifications().catch((err) => {
  console.error('Fatal error in digest push run:', err);
  process.exit(1);
});

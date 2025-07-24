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

// Configuration des runs quotidiens (en heures UTC)
const DAILY_RUNS = [7, 12, 18]; // 7h, 12h, 18h UTC
const HOURS_BETWEEN_RUNS = 8; // Maximum entre deux runs

// MÉGA POOL DE MESSAGES GÉNÉRIQUES - 120+ templates
const MEGA_MESSAGE_POOL = [

  { title: "Attention à votre série !", body: "Il vous reste {hours}h pour continuer votre série de {streak} jours.", tone: "critical" },
  { title: "Rappel important", body: "Vous risquez de perdre votre série de {streak} jours dans {hours}h.", tone: "critical" },
  { title: "Ne perdez pas votre progression", body: "Encore {hours}h pour valider vos {streak} jours d'efforts.", tone: "critical" },
  { title: "Votre régularité compte", body: "Il vous reste {hours}h pour ne pas rompre votre série de {streak} jours.", tone: "critical" },
  { title: "Gardez le cap !", body: "Encore {hours}h pour maintenir votre progression de {streak} jours.", tone: "critical" },
  { title: "Continuez sur votre lancée", body: "Seulement {hours}h pour poursuivre vos {streak} jours consécutifs.", tone: "critical" },
  { title: "N'oubliez pas votre routine", body: "Il vous reste {hours}h pour garder votre série de {streak} jours.", tone: "critical" },
  { title: "Un petit effort aujourd'hui", body: "Encore {hours}h pour ne pas perdre vos {streak} jours de suite.", tone: "critical" },
  { title: "Votre série est précieuse", body: "Protégez vos {streak} jours, il reste {hours}h.", tone: "critical" },
  { title: "Restez motivé·e !", body: "{hours}h pour valider votre série de {streak} jours.", tone: "critical" },
  { title: "Votre progression continue", body: "Il reste {hours}h pour garder votre série active.", tone: "critical" },
  { title: "Gardez votre habitude", body: "{hours}h pour continuer vos {streak} jours de réussite.", tone: "critical" },
  { title: "Un jour de plus, une victoire de plus", body: "Encore {hours}h pour continuer votre série.", tone: "critical" },
  { title: "Votre objectif est proche", body: "Restez sur la bonne voie, il vous reste {hours}h.", tone: "critical" },
  { title: "Continuez votre belle série", body: "Encore {hours}h pour valider cette journée.", tone: "critical" },
  { title: "N'abandonnez pas maintenant", body: "Votre série de {streak} jours peut continuer, il reste {hours}h.", tone: "critical" },
  { title: "Pensez à votre progression", body: "Il vous reste {hours}h pour garder votre série de {streak} jours.", tone: "critical" },
  { title: "Chaque jour compte", body: "Encore {hours}h pour poursuivre votre série.", tone: "critical" },
  { title: "Votre constance paie", body: "{hours}h pour valider votre habitude d'apprentissage.", tone: "critical" },
  { title: "Ne brisez pas votre série", body: "Encore un petit effort aujourd'hui : {hours}h restantes.", tone: "critical" }

];

// Images selon le contexte
const CONTEXT_IMAGES = {
  encouraging: "https://yhznbitjlzeslvudbsil.supabase.co/storage/v1/object/public/elearn/notifications/encouraging.jpg",
  urgent: "https://yhznbitjlzeslvudbsil.supabase.co/storage/v1/object/public/elearn/notifications/urgent.jpg",
  critical: "https://yhznbitjlzeslvudbsil.supabase.co/storage/v1/object/public/elearn/notifications/critical.jpg",
  legendary: "https://yhznbitjlzeslvudbsil.supabase.co/storage/v1/object/public/elearn/notifications/legendary.jpg"
};

// Fonction pour calculer le prochain run
function getNextRunTime() {
  const now = new Date();
  const currentHour = now.getUTCHours();

  // Trouver le prochain run aujourd'hui
  const nextRunToday = DAILY_RUNS.find(hour => hour > currentHour);

  if (nextRunToday) {
    const nextRun = new Date(now);
    nextRun.setUTCHours(nextRunToday, 0, 0, 0);
    return nextRun;
  } else {
    // Prochain run demain
    const nextRun = new Date(now);
    nextRun.setUTCDate(nextRun.getUTCDate() + 1);
    nextRun.setUTCHours(DAILY_RUNS[0], 0, 0, 0);
    return nextRun;
  }
}

// Fonction pour déterminer le ton selon l'urgence
function getToneByUrgency(hoursRemaining, streakCount) {
  if (streakCount >= 30) return 'legendary';
  if (hoursRemaining <= 2) return 'critical';
  if (hoursRemaining <= 6) return 'urgent';
  return 'encouraging';
}

// Fonction pour obtenir un message unique
async function getUniqueMessage(userId, hoursRemaining, streakCount) {
  try {
    // Récupérer les derniers messages pour éviter les répétitions
    const { data: recentMessages } = await supabase
        .from('user_notification_history')
        .select('message_hash')
        .eq('user_id', userId)
        .gte('sent_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // 7 derniers jours
        .order('sent_at', { ascending: false });

    const usedHashes = recentMessages ? recentMessages.map(m => m.message_hash) : [];

    // Déterminer le ton approprié
    const tone = getToneByUrgency(hoursRemaining, streakCount);

    // Filtrer les messages par ton
    const toneMessages = MEGA_MESSAGE_POOL.filter(msg => msg.tone === tone);

    // Exclure les messages récemment utilisés
    const availableMessages = toneMessages.filter(msg => {
      const msgHash = hashMessage(msg.title + msg.body);
      return !usedHashes.includes(msgHash);
    });

    // Si tous les messages du ton ont été utilisés, prendre n'importe quel message du ton
    const finalPool = availableMessages.length > 0 ? availableMessages : toneMessages;

    // Sélection aléatoire
    const selectedMessage = finalPool[Math.floor(Math.random() * finalPool.length)];

    // Personnalisation
    const personalizedMessage = {
      title: selectedMessage.title.replace('{streak}', streakCount).replace('{hours}', Math.round(hoursRemaining)),
      body: selectedMessage.body.replace('{streak}', streakCount).replace('{hours}', Math.round(hoursRemaining)),
      tone: selectedMessage.tone,
      hash: hashMessage(selectedMessage.title + selectedMessage.body)
    };

    return personalizedMessage;
  } catch (error) {
    console.error('Error getting unique message:', error);
    // Fallback
    const fallbackMsg = MEGA_MESSAGE_POOL[Math.floor(Math.random() * MEGA_MESSAGE_POOL.length)];
    return {
      title: fallbackMsg.title.replace('{streak}', streakCount).replace('{hours}', Math.round(hoursRemaining)),
      body: fallbackMsg.body.replace('{streak}', streakCount).replace('{hours}', Math.round(hoursRemaining)),
      tone: fallbackMsg.tone,
      hash: hashMessage(fallbackMsg.title + fallbackMsg.body)
    };
  }
}

// Fonction pour vérifier si l'utilisateur a déjà reçu une notification récemment
async function hasRecentNotification(userId, hoursBack = 6) {
  try {
    const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

    const { data: recent } = await supabase
        .from('user_notification_history')
        .select('id')
        .eq('user_id', userId)
        .gte('sent_at', since.toISOString())
        .limit(1);

    return recent && recent.length > 0;
  } catch (error) {
    console.error('Error checking recent notifications:', error);
    return false; // En cas d'erreur, on permet l'envoi
  }
}

// Fonction pour sauvegarder l'historique
async function saveNotificationHistory(userId, messageHash, hoursRemaining) {
  try {
    await supabase
        .from('user_notification_history')
        .insert({
          user_id: userId,
          message_hash: messageHash,
          hours_remaining: hoursRemaining,
          sent_at: new Date().toISOString()
        });
  } catch (error) {
    console.error('Error saving notification history:', error);
  }
}

// Fonction pour créer un hash
function hashMessage(message) {
  let hash = 0;
  for (let i = 0; i < message.length; i++) {
    const char = message.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString();
}

// FONCTION PRINCIPALE INTELLIGENTE
async function sendIntelligentStreakReminders() {
  try {
    console.log('🧠 SYSTÈME INTELLIGENT DE NOTIFICATIONS ACTIVÉ');

    const now = new Date();



    const nextRun = getNextRunTime();
    const hoursUntilNextRun = (nextRun.getTime() - now.getTime()) / (1000 * 60 * 60);




    console.log(`⏰ Prochain run: ${nextRun.toISOString()}`);
    console.log(`📊 Recherche des streaks expirant dans les ${Math.round(hoursUntilNextRun)}h prochaines...`);

    // Récupérer tous les streaks qui expirent avant le prochain run
    const { data: expiringStreaks, error: streakError } = await supabase
        .from('user_streaks')
        .select('user_id, next_deadline, current_streak')
        .lt('next_deadline', nextRun.toISOString())
        .gt('next_deadline', now.toISOString())
        .gt('current_streak', 0);

    if (streakError) throw streakError;


    console.log(`🎯 Trouvé ${expiringStreaks.length} streaks qui expirent avant le prochain run`);

    if (expiringStreaks.length === 0) {
      console.log('✅ Aucun streak en danger. Mission accomplie !');
      return { success: 0, failed: 0, skipped: 0 };
    }

    // Récupérer les comptes utilisateur
    const userIds = expiringStreaks.map(s => s.user_id);
    const { data: users, error: userError } = await supabase
        .from('accounts')
        .select('id, email, firstname, lastname, metadata')
        .in('id', userIds)
        .not('metadata', 'is', null);

    if (userError) throw userError;

    // Filtrer les utilisateurs avec tokens valides

    const usersWithTokens = users.filter(user =>
        user.metadata?.expoPushToken &&
        Expo.isExpoPushToken(user.metadata.expoPushToken)
    );

    console.log(`📱 ${usersWithTokens.length} utilisateurs avec tokens valides`);

    let sentCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    // Traiter chaque utilisateur individuellement
    for (const user of usersWithTokens) {
      try {
        const streakData = expiringStreaks.find(s => s.user_id === user.id);
        if (!streakData) continue;

        // Vérifier si l'utilisateur a déjà reçu une notification récemment
        const hasRecent = await hasRecentNotification(user.id, 4); // 4h minimum entre notifications
        if (hasRecent) {
          console.log(`⏭️ Utilisateur ${user.id} déjà notifié récemment, skip`);
          skippedCount++;
          continue;
        }

        // Calculer les heures restantes
        const expiryTime = new Date(streakData.next_deadline);
        const hoursRemaining = (expiryTime.getTime() - now.getTime()) / (1000 * 60 * 60);

        // Obtenir un message unique
        const uniqueMessage = await getUniqueMessage(user.id, hoursRemaining, streakData.current_streak);

        // Personnalisation avec prénom (occasionnellement)
        let finalBody = uniqueMessage.body;
        if (user.firstname && Math.random() > 0.8) { // 20% de chance
          finalBody = `${user.firstname}, ${finalBody.toLowerCase()}`;
        }

        // Créer la notification
        const notification = {
          to: user.metadata.expoPushToken,
          sound: 'default',
          title: uniqueMessage.title,
          body: finalBody,
          data: {
            type: "streak_reminder",
            userId: user.id,
            imageUrl: CONTEXT_IMAGES[uniqueMessage.tone],
            action: "open_app",
            hoursRemaining: Math.round(hoursRemaining),
            streakCount: streakData.current_streak,
            urgencyLevel: uniqueMessage.tone,
            messageHash: uniqueMessage.hash
          },
          richContent: {
            image: CONTEXT_IMAGES[uniqueMessage.tone]
          },
          channelId: 'streak_reminders',
          priority: uniqueMessage.tone === 'critical' ? 'high' :
              uniqueMessage.tone === 'urgent' ? 'high' : 'default',
          vibrationPattern: uniqueMessage.tone === 'critical' ? [0, 300, 200, 300, 200, 300] :
              uniqueMessage.tone === 'urgent' ? [0, 250, 150, 250] : [0, 200, 100, 200]
        };

        // Envoyer la notification
        const ticket = await expo.sendPushNotificationsAsync([notification]);

        if (ticket[0].status === 'ok') {
          sentCount++;
          console.log(`✅ Notification envoyée à ${user.id} (${streakData.current_streak} jours, ${Math.round(hoursRemaining)}h restantes)`);

          // Sauvegarder l'historique
          await saveNotificationHistory(user.id, uniqueMessage.hash, Math.round(hoursRemaining));
        } else {
          failedCount++;
          console.log(`❌ Échec envoi à ${user.id}: ${ticket[0].message}`);
        }

        // Petit délai entre les envois
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`💥 Erreur pour utilisateur ${user.id}:`, error);
        failedCount++;
      }
    }

    console.log('\n📊 RAPPORT DE MISSION:');
    console.log('=====================');
    console.log(`✅ Notifications envoyées: ${sentCount}`);
    console.log(`❌ Échecs: ${failedCount}`);
    console.log(`⏭️ Ignorées (déjà notifiés): ${skippedCount}`);
    console.log(`🎯 Efficacité: ${sentCount + skippedCount}/${usersWithTokens.length} utilisateurs traités`);

    return { success: sentCount, failed: failedCount, skipped: skippedCount };

  } catch (error) {
    console.error('💥 ERREUR SYSTÈME:', error);
    throw error;
  }
}

// Nettoyage de l'historique ancien
async function cleanupHistory() {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await supabase
        .from('user_notification_history')
        .delete()
        .lt('sent_at', thirtyDaysAgo.toISOString());
    console.log('🧹 Historique ancien nettoyé');
  } catch (error) {
    console.error('Erreur nettoyage:', error);
  }
}


// POINT D'ENTRÉE PRINCIPAL
async function main() {
  console.log('🚀 LANCEMENT DU SYSTÈME INTELLIGENT DE NOTIFICATIONS');
  console.log(`📅 Run configurés: ${DAILY_RUNS.join('h, ')}h UTC`);
  console.log(`📚 Pool de messages: ${MEGA_MESSAGE_POOL.length} templates uniques`);

  try {
    // Nettoyage optionnel
    await cleanupHistory();

    // Exécution principale
    const results = await sendIntelligentStreakReminders();

    console.log('\n🎉 MISSION ACCOMPLIE !');
    console.log('===================');
    console.log('Système prêt pour le prochain run automatique.');

    return results;
  } catch (error) {
    console.error('💥 MISSION ÉCHOUÉE:', error);
    throw error;
  }
}

// Exécution
if (require.main === module) {
  main()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
}

module.exports = {
  sendIntelligentStreakReminders,
  getUniqueMessage,
  getNextRunTime,
  DAILY_RUNS,
  MEGA_MESSAGE_POOL
};

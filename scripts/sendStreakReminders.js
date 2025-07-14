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
  // Messages encourageants (30 messages)
  { title: "🔥 Votre série brûle encore !", body: "Plus que {hours}h pour alimenter votre flamme de {streak} jours !", tone: "encouraging" },
  { title: "⏰ Le temps file...", body: "{hours}h sur le chrono ! Votre série de {streak} jours compte sur vous.", tone: "encouraging" },
  { title: "🌟 Brillez encore !", body: "Votre étoile de {streak} jours ne doit pas s'éteindre ! {hours}h pour la rallumer.", tone: "encouraging" },
  { title: "🚂 Votre train continue !", body: "Direction succès ! Votre voyage de {streak} jours continue, plus que {hours}h pour le prochain arrêt.", tone: "encouraging" },
  { title: "🎯 Dans le mille !", body: "{hours}h pour viser juste et maintenir vos {streak} jours de réussite !", tone: "encouraging" },
  { title: "🏃 La course continue !", body: "Vous avez couru {streak} jours, plus que {hours}h pour le prochain relais !", tone: "encouraging" },
  { title: "🌱 Votre plante grandit !", body: "Arrosez votre série de {streak} jours ! {hours}h avant qu'elle ne se dessèche.", tone: "encouraging" },
  { title: "🏰 Défendez votre château !", body: "Votre forteresse de {streak} jours résiste ! {hours}h pour la protéger.", tone: "encouraging" },
  { title: "🎨 Votre chef-d'œuvre...", body: "...de {streak} jours mérite une nouvelle touche ! {hours}h pour peindre la suite.", tone: "encouraging" },
  { title: "🚀 Mission en cours !", body: "Astronaute, votre mission de {streak} jours continue ! {hours}h avant le prochain décollage.", tone: "encouraging" },
  { title: "📚 Votre histoire s'écrit !", body: "Chapitre {streak} de votre épopée ! {hours}h pour écrire la suite.", tone: "encouraging" },
  { title: "🎵 La musique joue encore !", body: "Votre symphonie de {streak} jours continue ! Ne cassez pas le rythme ({hours}h restantes).", tone: "encouraging" },
  { title: "🌊 Surfez sur la vague !", body: "Votre vague de {streak} jours est parfaite ! {hours}h pour continuer à surfer.", tone: "encouraging" },
  { title: "🔮 La magie opère !", body: "Votre sort de {streak} jours est puissant ! {hours}h pour recharger vos pouvoirs.", tone: "encouraging" },
  { title: "🎪 Le spectacle continue !", body: "Votre cirque de {streak} jours émerveille ! {hours}h avant le prochain numéro.", tone: "encouraging" },
  { title: "🌈 Après la pluie...", body: "Votre arc-en-ciel de {streak} jours illumine tout ! {hours}h pour le maintenir.", tone: "encouraging" },
  { title: "⚡ L'énergie circule !", body: "Votre centrale de {streak} jours produit de l'excellence ! {hours}h pour recharger.", tone: "encouraging" },
  { title: "🗝️ La clé du succès !", body: "C'est votre constance de {streak} jours ! {hours}h pour ouvrir la prochaine porte.", tone: "encouraging" },
  { title: "🎭 Votre performance !", body: "Vos {streak} jours méritent une standing ovation ! {hours}h avant le rappel.", tone: "encouraging" },
  { title: "🏔️ Sommet en vue !", body: "Votre ascension de {streak} jours vous mène vers les sommets ! {hours}h pour continuer.", tone: "encouraging" },
  { title: "🌺 Votre jardin fleurit !", body: "Cultivez encore votre beauté de {streak} jours ! {hours}h pour l'entretenir.", tone: "encouraging" },
  { title: "🦅 Volez toujours plus haut !", body: "Votre envol de {streak} jours inspire ! {hours}h pour déployer vos ailes.", tone: "encouraging" },
  { title: "💎 Votre diamant brille !", body: "Votre éclat de {streak} jours est éblouissant ! {hours}h pour le polir encore.", tone: "encouraging" },
  { title: "🎨 Artiste de la régularité !", body: "Votre toile de {streak} jours prend forme ! {hours}h pour le prochain coup de pinceau.", tone: "encouraging" },
  { title: "🌟 Constellation personnelle !", body: "Votre étoile de {streak} jours guide les autres ! {hours}h pour continuer à briller.", tone: "encouraging" },
  { title: "🎪 Dresseur de habitudes !", body: "Vos {streak} jours ont dompté la routine ! {hours}h pour le prochain tour.", tone: "encouraging" },
  { title: "🌊 Capitaine du navire !", body: "Votre traversée de {streak} jours affronte toutes les mers ! {hours}h pour maintenir le cap.", tone: "encouraging" },
  { title: "🔥 Forgeron du succès !", body: "Vous forgez votre réussite depuis {streak} jours ! {hours}h pour raviver la flamme.", tone: "encouraging" },
  { title: "🎵 Chef d'orchestre !", body: "Votre symphonie de {streak} jours résonne ! {hours}h pour la prochaine mesure.", tone: "encouraging" },
  { title: "🏃 Marathonien mental !", body: "Votre endurance de {streak} jours impressionne ! {hours}h pour le prochain kilomètre.", tone: "encouraging" },

  // Messages urgents (30 messages)
  { title: "🚨 Attention requise !", body: "Votre série de {streak} jours a besoin de vous ! Plus que {hours}h !", tone: "urgent" },
  { title: "⚡ Action nécessaire !", body: "{hours}h pour sauver vos {streak} jours d'efforts !", tone: "urgent" },
  { title: "🔥 Flamme vacillante !", body: "Votre feu de {streak} jours faiblit ! {hours}h pour le raviver !", tone: "urgent" },
  { title: "⏰ Temps limité !", body: "Chrono activé ! {hours}h pour vos {streak} jours !", tone: "urgent" },
  { title: "🎯 Cible en vue !", body: "{hours}h pour viser juste et sauver vos {streak} jours !", tone: "urgent" },
  { title: "🌊 Marée montante !", body: "{hours}h avant que vos {streak} jours ne soient submergés !", tone: "urgent" },
  { title: "⚡ Batterie faible !", body: "Rechargement nécessaire ! {hours}h pour vos {streak} jours !", tone: "urgent" },
  { title: "🔮 Magie en péril !", body: "{hours}h pour relancer le sort de vos {streak} jours !", tone: "urgent" },
  { title: "🏃 Sprint nécessaire !", body: "{hours}h de course ! Votre série de {streak} jours vous attend !", tone: "urgent" },
  { title: "🌟 Étoile en danger !", body: "{hours}h avant l'extinction ! Sauvez votre étoile de {streak} jours !", tone: "urgent" },
  { title: "🎵 Crescendo final !", body: "{hours}h pour le final de votre symphonie de {streak} jours !", tone: "urgent" },
  { title: "🏰 Château assiégé !", body: "{hours}h pour défendre votre forteresse de {streak} jours !", tone: "urgent" },
  { title: "🌱 Plante assoiffée !", body: "{hours}h pour arroser votre croissance de {streak} jours !", tone: "urgent" },
  { title: "🎲 Dernière chance !", body: "{hours}h pour relancer les dés de vos {streak} jours !", tone: "urgent" },
  { title: "🚂 Train en retard !", body: "{hours}h pour rattraper votre train de {streak} jours !", tone: "urgent" },
  { title: "🌈 Arc-en-ciel fragile !", body: "{hours}h avant que vos {streak} jours ne s'effacent !", tone: "urgent" },
  { title: "⚡ Orage approche !", body: "{hours}h pour éviter que vos {streak} jours soient foudroyés !", tone: "urgent" },
  { title: "🎪 Équilibriste !", body: "{hours}h sur le fil ! Vos {streak} jours vacillent !", tone: "urgent" },
  { title: "🌙 Eclipse partielle !", body: "{hours}h avant que vos {streak} jours soient dans l'ombre !", tone: "urgent" },
  { title: "🔥 Dernières flammes !", body: "{hours}h pour raviver le brasier de vos {streak} jours !", tone: "urgent" },
  { title: "🎯 Flèche tendue !", body: "{hours}h pour décocher vers vos {streak} jours !", tone: "urgent" },
  { title: "⚓ Ancre qui dérape !", body: "{hours}h pour solidifier vos {streak} jours !", tone: "urgent" },
  { title: "🌊 Vague scélérate !", body: "{hours}h pour surfer encore sur vos {streak} jours !", tone: "urgent" },
  { title: "🎭 Rideau qui tombe !", body: "{hours}h avant la fin de votre spectacle de {streak} jours !", tone: "urgent" },
  { title: "⚡ Court-circuit !", body: "{hours}h pour réparer le circuit de vos {streak} jours !", tone: "urgent" },
  { title: "🚁 Atterrissage d'urgence !", body: "{hours}h pour poser en douceur vos {streak} jours !", tone: "urgent" },
  { title: "🌟 Étoile filante !", body: "{hours}h pour rattraper votre étoile de {streak} jours !", tone: "urgent" },
  { title: "🔮 Cristal fissuré !", body: "{hours}h pour réparer votre boule de {streak} jours !", tone: "urgent" },
  { title: "🌱 Dernière rosée !", body: "{hours}h pour hydrater vos {streak} jours !", tone: "urgent" },
  { title: "🎵 Note finale !", body: "{hours}h pour jouer la dernière note de vos {streak} jours !", tone: "urgent" },

  // Messages critiques (30 messages)
  { title: "🚨 ALERTE MAXIMALE !", body: "CRITIQUE ! {hours}h pour sauver {streak} jours d'excellence !", tone: "critical" },
  { title: "⚡ CODE ROUGE !", body: "{hours}h CHRONO ! Votre série de {streak} jours est en DANGER !", tone: "critical" },
  { title: "🔥 URGENCE ABSOLUE !", body: "FLAMME S'ÉTEINT ! {hours}h pour vos {streak} jours !", tone: "critical" },
  { title: "💥 DÉFCON 1 !", body: "{hours}h avant l'explosion de vos {streak} jours !", tone: "critical" },
  { title: "🚀 MISSION CRITIQUE !", body: "{hours}h pour accomplir la mission {streak} jours !", tone: "critical" },
  { title: "💣 DÉSAMORÇAGE !", body: "{hours}h pour désamorcer la fin de vos {streak} jours !", tone: "critical" },
  { title: "⚡ DÉFIBRILLATION !", body: "{hours}h pour faire repartir le cœur de vos {streak} jours !", tone: "critical" },
  { title: "🆘 MAYDAY !", body: "SOS ! {hours}h pour secourir vos {streak} jours !", tone: "critical" },
  { title: "🔥 BRASIER FINAL !", body: "{hours}h pour ranimer les braises de vos {streak} jours !", tone: "critical" },
  { title: "⚡ FOUDRE IMMINENTE !", body: "{hours}h avant que vos {streak} jours soient foudroyés !", tone: "critical" },
  { title: "🎯 TIR DE PRÉCISION !", body: "{hours}h pour viser le mille de vos {streak} jours !", tone: "critical" },
  { title: "🌊 TSUNAMI !", body: "{hours}h avant que la vague emporte vos {streak} jours !", tone: "critical" },
  { title: "🔴 BOUTON ROUGE !", body: "{hours}h pour appuyer sur STOP et sauver vos {streak} jours !", tone: "critical" },
  { title: "💥 EXPLOSION IMMINENTE !", body: "{hours}h pour éviter l'explosion de vos {streak} jours !", tone: "critical" },
  { title: "🌟 SUPERNOVA !", body: "{hours}h avant que votre étoile de {streak} jours explose !", tone: "critical" },
  { title: "⚓ ANCRE LÂCHE !", body: "{hours}h pour resserrer l'ancre de vos {streak} jours !", tone: "critical" },
  { title: "🔥 EXTINCTION TOTALE !", body: "{hours}h avant que vos {streak} jours s'éteignent !", tone: "critical" },
  { title: "⚡ BATTERIE 1% !", body: "CRITIQUE ! {hours}h pour recharger vos {streak} jours !", tone: "critical" },
  { title: "🎲 DERNIER LANCER !", body: "{hours}h pour votre dernier jet de {streak} jours !", tone: "critical" },
  { title: "🌪️ TORNADE !", body: "{hours}h avant que vos {streak} jours soient emportés !", tone: "critical" },
  { title: "🔥 PHÉNIX EN DANGER !", body: "{hours}h pour que vos {streak} jours renaissent !", tone: "critical" },
  { title: "🎯 BULLSEYE FINAL !", body: "{hours}h pour mettre dans le mille vos {streak} jours !", tone: "critical" },
  { title: "⏰ CHRONO INFERNAL !", body: "{hours}h de pure adrénaline pour vos {streak} jours !", tone: "critical" },
  { title: "🚨 SIRÈNES !", body: "{hours}h ! Services d'urgence pour vos {streak} jours !", tone: "critical" },
  { title: "💣 BOMBE À RETARDEMENT !", body: "{hours}h pour désamorcer vos {streak} jours !", tone: "critical" },
  { title: "🌋 ÉRUPTION !", body: "{hours}h avant que vos {streak} jours soient engloutis !", tone: "critical" },
  { title: "🎪 FUNAMBULE ULTIME !", body: "{hours}h sur le fil de vos {streak} jours !", tone: "critical" },
  { title: "⚓ NAUFRAGE !", body: "{hours}h pour éviter le naufrage de vos {streak} jours !", tone: "critical" },
  { title: "🌟 TROU NOIR !", body: "{hours}h avant que vos {streak} jours soient aspirés !", tone: "critical" },
  { title: "🚀 VITESSE LUMIÈRE !", body: "{hours}h à l'éclair pour vos {streak} jours !", tone: "critical" },

  // Messages motivants pour hauts streaks (30 messages)
  { title: "👑 LÉGENDE EN ACTION !", body: "{streak} jours de légende ! {hours}h pour continuer l'histoire !", tone: "legendary" },
  { title: "🏆 CHAMPION CONFIRMÉ !", body: "Vos {streak} jours font de vous un champion ! {hours}h pour le titre !", tone: "legendary" },
  { title: "🌟 ÉTOILE MONTANTE !", body: "{streak} jours de brillance ! {hours}h pour illuminer encore !", tone: "legendary" },
  { title: "🚀 EXPLORATEUR SPATIAL !", body: "{streak} jours d'exploration ! {hours}h avant la prochaine galaxie !", tone: "legendary" },
  { title: "💎 DIAMANT RARE !", body: "Vos {streak} jours valent tous les diamants ! {hours}h pour briller !", tone: "legendary" },
  { title: "⚡ FORCE DE LA NATURE !", body: "{streak} jours de puissance ! {hours}h pour l'énergie suivante !", tone: "legendary" },
  { title: "🎭 MAÎTRE ARTISTE !", body: "Votre œuvre de {streak} jours inspire ! {hours}h pour le chef-d'œuvre !", tone: "legendary" },
  { title: "🌊 MAÎTRE DES OCÉANS !", body: "{streak} jours à gouverner les flots ! {hours}h pour la prochaine vague !", tone: "legendary" },
  { title: "🔥 GARDIEN DE LA FLAMME !", body: "{streak} jours de feu sacré ! {hours}h pour l'éternité !", tone: "legendary" },
  { title: "🏔️ CONQUÉRANT SOMMETS !", body: "{streak} jours d'ascension ! {hours}h vers l'Everest !", tone: "legendary" },
  { title: "🎪 MAÎTRE DE PISTE !", body: "Votre spectacle de {streak} jours fascine ! {hours}h pour l'apothéose !", tone: "legendary" },
  { title: "🌟 CONSTELLATION VIVANTE !", body: "{streak} jours d'éclat cosmique ! {hours}h pour l'univers !", tone: "legendary" },
  { title: "⚔️ GUERRIER LÉGENDAIRE !", body: "{streak} batailles gagnées ! {hours}h pour la victoire finale !", tone: "legendary" },
  { title: "🎵 VIRTUOSE ACCOMPLI !", body: "Votre mélodie de {streak} jours enchante ! {hours}h pour la symphonie !", tone: "legendary" },
  { title: "🔮 MAGE SUPRÊME !", body: "{streak} jours de magie ! {hours}h pour le sort ultime !", tone: "legendary" },
  { title: "🏃 USAIN BOLT MENTAL !", body: "{streak} jours de records ! {hours}h pour l'olympe !", tone: "legendary" },
  { title: "🌱 JARDINIER PRODIGE !", body: "Votre forêt de {streak} jours grandit ! {hours}h pour l'Eden !", tone: "legendary" },
  { title: "🎨 PICASSO MODERNE !", body: "Votre toile de {streak} jours est géniale ! {hours}h pour le Louvre !", tone: "legendary" },
  { title: "🚁 PILOTE D'ÉLITE !", body: "{streak} jours de vol parfait ! {hours}h pour l'espace !", tone: "legendary" },
  { title: "💫 COMÈTE BRILLANTE !", body: "Votre trajectoire de {streak} jours éblouit ! {hours}h pour l'infini !", tone: "legendary" },
  { title: "🏰 ROI DU CHÂTEAU !", body: "{streak} jours de règne ! {hours}h pour l'empire !", tone: "legendary" },
  { title: "🌈 CRÉATEUR D'ARCS-EN-CIEL !", body: "{streak} jours de couleurs ! {hours}h pour le spectre complet !", tone: "legendary" },
  { title: "⚡ ZEUS DES HABITUDES !", body: "{streak} jours de pouvoir divin ! {hours}h pour l'olympe !", tone: "legendary" },
  { title: "🎯 ROBIN DES BOIS 2.0 !", body: "{streak} jours dans le mille ! {hours}h pour la légende !", tone: "legendary" },
  { title: "🌊 POSÉIDON PERSONNEL !", body: "{streak} jours à dompter les mers ! {hours}h pour l'océan !", tone: "legendary" },
  { title: "🔥 PROMÉTHÉE MODERNE !", body: "{streak} jours de feu sacré ! {hours}h pour l'humanité !", tone: "legendary" },
  { title: "🚀 ELON MUSK HABITS !", body: "{streak} jours d'innovation ! {hours}h pour Mars !", tone: "legendary" },
  { title: "🎪 CIRQUE DU SOLEIL !", body: "Votre show de {streak} jours éblouit ! {hours}h pour Vegas !", tone: "legendary" },
  { title: "💎 TIFFANY & CO STREAK !", body: "{streak} jours de luxe ! {hours}h pour l'éternité !", tone: "legendary" },
  { title: "🏆 HALL OF FAME !", body: "{streak} jours légendaires ! {hours}h pour l'immortalité !", tone: "legendary" }
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
          priority: uniqueMessage.tone === 'critical' ? 'max' :
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

/**
 * Daily challenges and tips for Cameroonian students
 * Covers BAC, ENS, ENSET, Polytechnique, FASA, ENAM concours prep
 * Each day of the week has 4 rotating challenges (cycling by week number)
 */

export interface DailyChallenge {
  title: string;
  description: string;
  action: string;
  subject: string;
  xpReward: number;
}

// 7 days × 4 weeks = 28 challenges, each cycling weekly
export const dailyChallenges: DailyChallenge[][] = [
  // Dimanche
  [
    {
      title: "Révision Mathématiques",
      description: "Entraîne-toi sur les suites numériques et les limites. 5 questions pour réchauffer le cerveau.",
      action: "Faire le quiz",
      subject: "Mathématiques",
      xpReward: 50,
    },
    {
      title: "Culture Générale",
      description: "Teste tes connaissances sur l'histoire du Cameroun et de l'Afrique subsaharienne.",
      action: "Répondre",
      subject: "Culture Générale",
      xpReward: 50,
    },
    {
      title: "Physique-Chimie",
      description: "Les lois de Newton appliquées. Révise les fondamentaux en 10 min.",
      action: "Commencer",
      subject: "Physique",
      xpReward: 50,
    },
    {
      title: "Français & Expression",
      description: "Améliore ta rédaction et ton vocabulaire avec les exercices du jour.",
      action: "S'entraîner",
      subject: "Français",
      xpReward: 50,
    },
  ],
  // Lundi
  [
    {
      title: "Défi Algèbre",
      description: "Polynômes et équations du 2nd degré — les bases indispensables pour le concours.",
      action: "Faire le défi",
      subject: "Algèbre",
      xpReward: 60,
    },
    {
      title: "Chimie Organique",
      description: "Les réactions d'estérification et de saponification. Un classique au BAC série C.",
      action: "Réviser",
      subject: "Chimie",
      xpReward: 60,
    },
    {
      title: "Géographie",
      description: "Les ressources naturelles du Cameroun et leur exploitation. Sujet récurrent aux concours.",
      action: "Apprendre",
      subject: "Géographie",
      xpReward: 60,
    },
    {
      title: "Probabilités",
      description: "Variables aléatoires et lois de probabilités. 5 exercices progressifs pour bien démarrer la semaine.",
      action: "Commencer",
      subject: "Mathématiques",
      xpReward: 60,
    },
  ],
  // Mardi
  [
    {
      title: "Mécanique des Fluides",
      description: "Hydrostatique et théorème de Bernoulli. Souvent au programme des concours d'ingénieurs.",
      action: "Étudier",
      subject: "Physique",
      xpReward: 55,
    },
    {
      title: "Analyse Fonctionnelle",
      description: "Dérivées, primitives et intégrales — le cœur des épreuves de Maths.",
      action: "S'entraîner",
      subject: "Mathématiques",
      xpReward: 55,
    },
    {
      title: "Institutions Camerounaises",
      description: "Constitution et organisation politique du Cameroun. Obligatoire pour l'ENAM et la fonction publique.",
      action: "Réviser",
      subject: "Droit",
      xpReward: 55,
    },
    {
      title: "Thermodynamique",
      description: "Les 4 lois de la thermodynamique et leurs applications pratiques.",
      action: "Commencer",
      subject: "Physique",
      xpReward: 55,
    },
  ],
  // Mercredi
  [
    {
      title: "Vocabulaire Anglais",
      description: "L'anglais est noté aux concours ! Révise 20 mots essentiels en 5 minutes.",
      action: "Pratiquer",
      subject: "Anglais",
      xpReward: 45,
    },
    {
      title: "Géométrie dans l'Espace",
      description: "Vecteurs, plans et droites dans l'espace. Crucial pour les filières scientifiques.",
      action: "Faire le quiz",
      subject: "Mathématiques",
      xpReward: 65,
    },
    {
      title: "Biologie Cellulaire",
      description: "Structure et fonctions de la cellule eucaryote. Fondamental pour les concours de médecine.",
      action: "Apprendre",
      subject: "Biologie",
      xpReward: 55,
    },
    {
      title: "Histoire Contemporaine",
      description: "L'Afrique depuis les indépendances — un incontournable de la culture générale.",
      action: "Étudier",
      subject: "Histoire",
      xpReward: 50,
    },
  ],
  // Jeudi
  [
    {
      title: "Électricité & Circuits",
      description: "Lois de Kirchhoff et résistances. Applications pratiques pour Polytechnique et ENSET.",
      action: "Réviser",
      subject: "Physique",
      xpReward: 60,
    },
    {
      title: "Statistiques",
      description: "Moyenne, médiane, variance et écart-type. Exercices sur données réelles.",
      action: "S'entraîner",
      subject: "Mathématiques",
      xpReward: 55,
    },
    {
      title: "Économie Générale",
      description: "Mécanismes macroéconomiques et politique budgétaire. Essentiel pour les concours de gestion.",
      action: "Apprendre",
      subject: "Économie",
      xpReward: 50,
    },
    {
      title: "Optique Physique",
      description: "Diffraction, interférences et polarisation. Souvent en queue de copie mais différenciateur.",
      action: "Commencer",
      subject: "Physique",
      xpReward: 65,
    },
  ],
  // Vendredi
  [
    {
      title: "Révision de la Semaine",
      description: "Récapitulatif des sujets vus cette semaine. Consolide tes acquis avant le week-end.",
      action: "Réviser",
      subject: "Révision",
      xpReward: 80,
    },
    {
      title: "Ancien Sujet ENS",
      description: "Plonge dans les épreuves des années précédentes. La meilleure façon de préparer le concours.",
      action: "Voir les sujets",
      subject: "Concours",
      xpReward: 80,
    },
    {
      title: "Logique & Raisonnement",
      description: "Tests de logique formelle — souvent présents dans les épreuves de culture générale.",
      action: "Tester",
      subject: "Logique",
      xpReward: 60,
    },
    {
      title: "Chimie des Solutions",
      description: "pH, acides, bases et titrages. Un grand classique des épreuves de Terminale C et D.",
      action: "Faire le quiz",
      subject: "Chimie",
      xpReward: 60,
    },
  ],
  // Samedi
  [
    {
      title: "Entraînement Intensif",
      description: "Le week-end c'est pour avancer ! Complète 2 leçons aujourd'hui et double tes XP.",
      action: "Démarrer",
      subject: "Bonus",
      xpReward: 100,
    },
    {
      title: "Géologie & SVT",
      description: "Les roches, les séismes et la tectonique des plaques. Sujet récurrent au BAC série D.",
      action: "Apprendre",
      subject: "SVT",
      xpReward: 55,
    },
    {
      title: "Mathématiques Financières",
      description: "Annuités, emprunts et amortissements. Incontournable pour les concours de commerce et gestion.",
      action: "Étudier",
      subject: "Mathématiques",
      xpReward: 60,
    },
    {
      title: "Dissertation Française",
      description: "Méthodologie de la dissertation en 3 parties. Une heure d'entraînement peut tout changer.",
      action: "S'entraîner",
      subject: "Français",
      xpReward: 70,
    },
  ],
];

/**
 * Get today's challenge based on day of week and week number of year
 */
export const getTodayChallenge = (): DailyChallenge => {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday

  // Week number of year (approximate)
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const weekNumber = Math.floor(
    (now.getTime() - startOfYear.getTime()) / (7 * 24 * 60 * 60 * 1000)
  );

  const challengeIndex = weekNumber % 4;
  return dailyChallenges[dayOfWeek][challengeIndex];
};

/**
 * Motivational streak messages based on streak count
 */
export const getStreakMessage = (streak: number): string => {
  if (streak === 0) return "Commence ta série aujourd'hui ! 🚀";
  if (streak === 1) return "1er jour ! Continue sur cette lancée 💪";
  if (streak < 5) return `${streak} jours de suite ! Tu prends de bonnes habitudes 🌱`;
  if (streak < 10) return `${streak} jours consécutifs ! Tu es sur la bonne voie 🔥`;
  if (streak < 20) return `${streak} jours ! Tu es une machine à apprendre ! 🏆`;
  if (streak < 30) return `${streak} jours ! Le concours n'a qu'à bien se tenir 🎯`;
  return `${streak} jours consécutifs ! Tu es une légende ! 🌟`;
};

/**
 * Check if streak is at risk (deadline within 4 hours)
 */
export const isStreakAtRisk = (nextDeadline: string | null | undefined): boolean => {
  if (!nextDeadline) return false;
  const deadline = new Date(nextDeadline);
  const now = new Date();
  const hoursLeft = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
  return hoursLeft > 0 && hoursLeft < 4;
};

/**
 * Get hours remaining before streak is lost
 */
export const getStreakHoursLeft = (nextDeadline: string | null | undefined): number => {
  if (!nextDeadline) return 24;
  const deadline = new Date(nextDeadline);
  const now = new Date();
  const hoursLeft = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
  return Math.max(0, hoursLeft);
};

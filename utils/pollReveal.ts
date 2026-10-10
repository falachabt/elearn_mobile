// utils/pollReveal.ts
// Affichage de la date à laquelle la correction d'un sondage est révélée :
// « le sam. 11 oct. à 13:00 », « dans 3 h 20 », « Révélée ».
// Un sondage corrigé (sondages du bot) porte feed_posts.poll_reveal_at ; un
// sondage d'opinion n'en a pas et n'affiche donc aucune date.

const DAY_MS = 24 * 60 * 60 * 1000;

/** La date de révélation est-elle valide et déjà passée ? */
export function isPollRevealed(
  revealAt?: string | null,
  now: Date = new Date()
): boolean {
  if (!revealAt) return false;
  const date = new Date(revealAt);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() <= now.getTime();
}

/** Date exacte de la révélation, en heure locale : « sam. 11 oct. à 13:00 ». */
export function formatPollRevealDate(revealAt?: string | null): string | null {
  if (!revealAt) return null;
  const date = new Date(revealAt);
  if (Number.isNaN(date.getTime())) return null;

  const jour = date.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  const heure = `${String(date.getHours()).padStart(2, '0')}:${String(
    date.getMinutes()
  ).padStart(2, '0')}`;

  return `${jour} à ${heure}`;
}

/** Délai restant avant la révélation : « 3 h 20 », « 45 min », « moins d'1 min ». */
export function formatPollRevealCountdown(
  revealAt?: string | null,
  now: Date = new Date()
): string | null {
  if (!revealAt) return null;
  const date = new Date(revealAt);
  if (Number.isNaN(date.getTime())) return null;

  const diff = date.getTime() - now.getTime();
  if (diff <= 0) return null;
  if (diff < 60 * 1000) return "moins d'1 min";

  const totalMinutes = Math.floor(diff / (60 * 1000));
  const jours = Math.floor(totalMinutes / (60 * 24));
  const heures = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (jours > 0) return heures > 0 ? `${jours} j ${heures} h` : `${jours} j`;
  if (heures > 0) return minutes > 0 ? `${heures} h ${minutes}` : `${heures} h`;
  return `${minutes} min`;
}

/**
 * Phrase affichée dans le sondage : la correction est à venir, ou elle vient
 * d'être révélée. `null` pour un sondage sans correction.
 */
export function describePollReveal(
  revealAt?: string | null,
  now: Date = new Date()
): string | null {
  if (!revealAt) return null;

  const date = new Date(revealAt);
  if (Number.isNaN(date.getTime())) return null;

  if (isPollRevealed(revealAt, now)) {
    return "La correction vient d'être révélée";
  }

  const jour = formatPollRevealDate(revealAt);
  const delai = formatPollRevealCountdown(revealAt, now);

  // Même jour : on donne l'heure et le délai restant, plus utile qu'une date.
  if (date.getTime() - now.getTime() < DAY_MS && delai) {
    const heure = `${String(date.getHours()).padStart(2, '0')}:${String(
      date.getMinutes()
    ).padStart(2, '0')}`;
    return `Correction révélée aujourd'hui à ${heure} · dans ${delai}`;
  }

  return delai
    ? `Correction révélée le ${jour} · dans ${delai}`
    : `Correction révélée le ${jour}`;
}

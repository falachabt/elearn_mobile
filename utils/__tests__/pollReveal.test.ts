// utils/__tests__/pollReveal.test.ts
// Affichage de la date de révélation de la correction d'un sondage.
import {
  describePollReveal,
  formatPollRevealCountdown,
  formatPollRevealDate,
  isPollRevealed,
} from '../pollReveal';

describe('isPollRevealed', () => {
  const now = new Date('2026-10-10T10:00:00.000Z');

  it('reste faux sans date de révélation (sondage d\'opinion)', () => {
    expect(isPollRevealed(null, now)).toBe(false);
    expect(isPollRevealed(undefined, now)).toBe(false);
  });

  it('reste faux avant la date', () => {
    expect(isPollRevealed('2026-10-11T12:00:00.000Z', now)).toBe(false);
  });

  it('devient vrai une fois la date atteinte', () => {
    expect(isPollRevealed('2026-10-09T12:00:00.000Z', now)).toBe(true);
    expect(isPollRevealed('2026-10-10T10:00:00.000Z', now)).toBe(true);
  });

  it('ignore une date invalide', () => {
    expect(isPollRevealed('pas une date', now)).toBe(false);
  });
});

describe('formatPollRevealDate', () => {
  it('donne le jour et l\'heure locales', () => {
    const label = formatPollRevealDate('2026-10-11T12:00:00.000Z');
    expect(label).not.toBeNull();
    expect(label).toMatch(/^[a-zéû]+\. \d{1,2} [a-zéû]+\. à \d{2}:\d{2}$/);
  });

  it('ne renvoie rien sans date', () => {
    expect(formatPollRevealDate(null)).toBeNull();
    expect(formatPollRevealDate('')).toBeNull();
    expect(formatPollRevealDate('nope')).toBeNull();
  });
});

describe('formatPollRevealCountdown', () => {
  const now = new Date('2026-10-10T10:00:00.000Z');

  it('compte en heures et minutes', () => {
    expect(formatPollRevealCountdown('2026-10-10T13:20:00.000Z', now)).toBe('3 h 20');
  });

  it('compte en minutes sous une heure', () => {
    expect(formatPollRevealCountdown('2026-10-10T10:45:00.000Z', now)).toBe('45 min');
  });

  it('compte en jours au-delà', () => {
    expect(formatPollRevealCountdown('2026-10-12T12:00:00.000Z', now)).toBe('2 j 2 h');
  });

  it('ne compte plus une fois la date passée', () => {
    expect(formatPollRevealCountdown('2026-10-09T10:00:00.000Z', now)).toBeNull();
  });
});

describe('describePollReveal', () => {
  const now = new Date('2026-10-10T10:00:00.000Z');

  it('annonce la correction à venir avec sa date', () => {
    const label = describePollReveal('2026-10-12T12:00:00.000Z', now);
    expect(label).toContain('Correction révélée le');
    expect(label).toContain('dans 2 j 2 h');
  });

  it('annonce la correction du jour avec l\'heure', () => {
    const label = describePollReveal('2026-10-10T13:00:00.000Z', now);
    expect(label).toContain("Correction révélée aujourd'hui à");
    expect(label).toContain('dans 3 h');
  });

  it('signale une correction déjà révélée', () => {
    expect(describePollReveal('2026-10-09T12:00:00.000Z', now)).toBe(
      "La correction vient d'être révélée"
    );
  });

  it('ne dit rien pour un sondage sans correction', () => {
    expect(describePollReveal(null, now)).toBeNull();
  });
});

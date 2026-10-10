// components/shared/feed/PollBlock.tsx
// Sondage du fil : vote, résultats, et — pour les sondages corrigés publiés par
// l'agent — date de révélation de la correction, bonne réponse mise en évidence
// et explication. Les règles de visibilité (résultats après vote, correction
// après poll_reveal_at) sont appliquées par le serveur (RPC poll_state) ; ici on
// ne fait que les rendre.
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { theme } from '@/constants/theme';
import { PollOption } from '@/services/feed.service';
import {
  describePollReveal,
  formatPollRevealDate,
  isPollRevealed,
} from '@/utils/pollReveal';

interface PollBlockProps {
  options: PollOption[];
  totalVotes: number;
  votedOptionId: string | null | undefined;
  onVote: (optionId: string) => void;
  disabled?: boolean;
  isDarkMode?: boolean;
  /** Date de révélation de la correction ; absent = sondage d'opinion */
  revealAt?: string | null;
  /** La correction est déjà révélée (calculé par le service ou par l'horloge) */
  revealed?: boolean;
  /** Les résultats sont affichables (a voté, ou correction révélée) */
  resultsVisible?: boolean;
  /** Explication de la bonne réponse, fournie après la révélation */
  explanation?: string | null;
  /** Relit l'état du sondage quand la date de révélation vient d'être atteinte */
  onRevealDue?: () => void;
}

export const PollBlock: React.FC<PollBlockProps> = ({
  options,
  totalVotes,
  votedOptionId,
  onVote,
  disabled = false,
  isDarkMode = false,
  revealAt = null,
  revealed,
  resultsVisible,
  explanation = null,
  onRevealDue,
}) => {
  const [now, setNow] = useState(() => new Date());

  const target = revealAt ? new Date(revealAt) : null;
  const targetValid = !!target && !Number.isNaN(target.getTime());
  const serverRevealed = revealed ?? (targetValid ? isPollRevealed(revealAt, now) : false);

  // L'écran n'est pas forcément rechargé au moment exact de la révélation : on
  // fait avancer l'horloge locale tant que la date n'est pas atteinte, pour
  // basculer l'affichage (et demander la correction au serveur) sans action.
  useEffect(() => {
    if (!targetValid || serverRevealed) return;
    const interval = setInterval(() => setNow(new Date()), 30 * 1000);
    return () => clearInterval(interval);
  }, [targetValid, serverRevealed, revealAt]);

  const clockRevealed = targetValid && isPollRevealed(revealAt, now);
  const correctionRevealed = serverRevealed || clockRevealed;
  const hasCorrectOption = options.some((o) => o.is_correct === true);
  const showResults = resultsVisible ?? (!!votedOptionId || correctionRevealed);
  const revealLabel = describePollReveal(revealAt, now);
  const revealDateLabel = formatPollRevealDate(revealAt);
  // La correction est due mais l'écran affiche encore l'état d'avant : on
  // redemande l'état au serveur (une seule fois par bascule).
  const shouldRefresh = clockRevealed && !serverRevealed;
  const refreshAskedRef = useRef(false);

  useEffect(() => {
    if (!shouldRefresh) {
      refreshAskedRef.current = false;
      return;
    }
    if (refreshAskedRef.current) return;
    refreshAskedRef.current = true;
    onRevealDue?.();
  }, [shouldRefresh]);

  const totalForPct = (() => {
    const sum = options.reduce((acc, o) => acc + (o.votes_count ?? 0), 0);
    return sum > 0 ? sum : totalVotes;
  })();

  return (
    <View style={styles.container}>
      {options.map((option) => {
        const pct =
          totalForPct > 0 ? Math.round(((option.votes_count ?? 0) / totalForPct) * 100) : 0;
        const isMine = !!option.is_mine || option.id === votedOptionId;
        const isCorrect = correctionRevealed && option.is_correct === true;
        // Après la correction, l'option juste est mise en évidence, et le choix
        // de l'élève reste repérable même s'il s'est trompé.
        const highlightCorrect = isCorrect;
        const highlightMyWrong = correctionRevealed && isMine && !isCorrect;

        return (
          <TouchableOpacity
            key={option.id}
            activeOpacity={showResults ? 1 : 0.75}
            disabled={showResults || disabled}
            onPress={(e) => {
              e.stopPropagation();
              onVote(option.id);
            }}
            accessibilityRole="button"
            accessibilityLabel={
              correctionRevealed && hasCorrectOption
                ? `${option.label}${isCorrect ? ' — bonne réponse' : ''}${
                    isMine ? ' — ton choix' : ''
                  }`
                : option.label
            }
            style={[
              styles.option,
              isDarkMode && styles.optionDark,
              isMine && !correctionRevealed && styles.optionMine,
              isMine && !correctionRevealed && isDarkMode && styles.optionMineDark,
              highlightCorrect && styles.optionCorrect,
              highlightMyWrong && styles.optionMyWrong,
            ]}
          >
            {showResults && (
              <View
                style={[
                  styles.overlay,
                  { width: `${pct}%` },
                  isDarkMode && styles.overlayDark,
                  highlightCorrect && styles.overlayCorrect,
                ]}
              />
            )}

            <View style={styles.optionContent}>
              {isMine && (
                <MaterialCommunityIcons
                  name={correctionRevealed ? 'account-check-outline' : 'check-circle'}
                  size={15}
                  color={
                    highlightCorrect
                      ? '#047857'
                      : highlightMyWrong
                        ? '#B91C1C'
                        : theme.color.primary[500]
                  }
                  style={styles.optionIcon}
                />
              )}

              <Text
                style={[
                  styles.optionLabel,
                  isDarkMode && styles.textDark,
                  highlightCorrect && styles.optionLabelCorrect,
                ]}
              >
                {option.label}
              </Text>

              {highlightCorrect && (
                <View style={styles.correctBadge}>
                  <MaterialCommunityIcons name="check-bold" size={11} color="#FFFFFF" />
                  <Text style={styles.correctBadgeText}>Bonne réponse</Text>
                </View>
              )}

              {showResults && (
                <Text
                  style={[
                    styles.optionPct,
                    isDarkMode && styles.subTextDark,
                    highlightCorrect && styles.optionPctCorrect,
                  ]}
                >
                  {pct}%
                </Text>
              )}
            </View>
          </TouchableOpacity>
        );
      })}

      <Text style={[styles.totalVotes, isDarkMode && styles.subTextDark]}>
        {showResults
          ? `${totalForPct} vote${totalForPct > 1 ? 's' : ''}`
          : correctionRevealed
            ? 'Seuls ceux qui ont voté voient les résultats'
            : 'Vote pour voir les résultats'}
      </Text>

      {/* Sans vote, la bonne réponse est visible mais pas les résultats */}
      {correctionRevealed && !showResults && hasCorrectOption && (
        <Text style={[styles.noVoteNote, isDarkMode && styles.subTextDark]}>
          La bonne réponse est mise en évidence ci-dessus.
        </Text>
      )}

      {/* Date de révélation de la correction — visible avant comme après */}
      {revealAt && revealLabel && (
        <View
          style={[
            styles.revealBox,
            correctionRevealed && styles.revealBoxDone,
            isDarkMode && styles.revealBoxDark,
          ]}
        >
          <MaterialCommunityIcons
            name={correctionRevealed ? 'lightbulb-on-outline' : 'calendar-clock'}
            size={15}
            color={correctionRevealed ? '#047857' : theme.color.primary[500]}
          />
          <View style={styles.revealTextCol}>
            <Text
              style={[
                styles.revealText,
                correctionRevealed && styles.revealTextDone,
                isDarkMode && styles.subTextDark,
              ]}
            >
              {revealLabel}
            </Text>
            <Text style={[styles.revealDate, isDarkMode && styles.subTextDark]}>
              {correctionRevealed
                ? `Révélée le ${revealDateLabel}`
                : `Le ${revealDateLabel}`}
            </Text>
          </View>
        </View>
      )}

      {/* Explication de la bonne réponse (fournie uniquement après révélation) */}
      {correctionRevealed && !!explanation && (
        <View style={[styles.explanationBox, isDarkMode && styles.explanationBoxDark]}>
          <MaterialCommunityIcons name="information-outline" size={15} color="#047857" />
          <Text style={[styles.explanationText, isDarkMode && styles.textDark]}>
            {explanation}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 10,
    gap: 8,
  },
  option: {
    borderRadius: theme.border.radius.small,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  optionDark: {
    backgroundColor: '#1E293B',
  },
  optionMine: {
    borderColor: theme.color.primary[500],
  },
  optionMineDark: {
    borderColor: theme.color.primary[400],
  },
  optionCorrect: {
    borderColor: '#10B981',
    borderWidth: 2,
  },
  optionMyWrong: {
    borderColor: '#FCA5A5',
    borderWidth: 2,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: '#CBD5E1',
  },
  overlayDark: {
    backgroundColor: '#475569',
  },
  overlayCorrect: {
    backgroundColor: '#A7F3D0',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 8,
  },
  optionIcon: {
    marginRight: -2,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    flexShrink: 1,
    flexGrow: 1,
  },
  optionLabelCorrect: {
    color: '#065F46',
  },
  correctBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#059669',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
  },
  correctBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  optionPct: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginLeft: 4,
  },
  optionPctCorrect: {
    color: '#065F46',
  },
  totalVotes: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  noVoteNote: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: -2,
  },
  revealBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EEF2FF',
    borderRadius: theme.border.radius.small,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginTop: 2,
  },
  revealBoxDark: {
    backgroundColor: '#1E293B',
  },
  revealBoxDone: {
    backgroundColor: '#ECFDF5',
  },
  revealTextCol: {
    flex: 1,
  },
  revealText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.color.primary[600],
  },
  revealTextDone: {
    color: '#047857',
  },
  revealDate: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  explanationBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: '#F0FDF4',
    borderRadius: theme.border.radius.small,
    padding: 10,
  },
  explanationBoxDark: {
    backgroundColor: '#0F2A22',
  },
  explanationText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: '#065F46',
  },
  textDark: {
    color: '#F8FAFC',
  },
  subTextDark: {
    color: '#CBD5E1',
  },
});

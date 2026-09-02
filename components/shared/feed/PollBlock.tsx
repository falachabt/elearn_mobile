// components/shared/feed/PollBlock.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

import { theme } from '@/constants/theme';
import { PollOption } from '@/services/feed.service';

interface PollBlockProps {
  options: PollOption[];
  totalVotes: number;
  votedOptionId: string | null | undefined;
  onVote: (optionId: string) => void;
  disabled?: boolean;
  isDarkMode?: boolean;
}

export const PollBlock: React.FC<PollBlockProps> = ({
  options,
  totalVotes,
  votedOptionId,
  onVote,
  disabled = false,
  isDarkMode = false,
}) => {
  const hasVoted = !!votedOptionId;

  return (
    <View style={styles.container}>
      {options.map((option) => {
        const pct = totalVotes > 0 ? Math.round((option.votes_count / totalVotes) * 100) : 0;

        return (
          <TouchableOpacity
            key={option.id}
            activeOpacity={hasVoted ? 1 : 0.75}
            disabled={hasVoted || disabled}
            onPress={(e) => {
              e.stopPropagation();
              onVote(option.id);
            }}
            style={[styles.option, isDarkMode && styles.optionDark]}
          >
            {hasVoted && (
              <View
                style={[
                  styles.overlay,
                  { width: `${pct}%` },
                  isDarkMode && styles.overlayDark,
                ]}
              />
            )}

            <View style={styles.optionContent}>
              <Text style={[styles.optionLabel, isDarkMode && styles.textDark]}>
                {option.label}
              </Text>

              {hasVoted && (
                <Text style={[styles.optionPct, isDarkMode && styles.subTextDark]}>
                  {pct}%
                </Text>
              )}
            </View>
          </TouchableOpacity>
        );
      })}

      <Text style={[styles.totalVotes, isDarkMode && styles.subTextDark]}>
        {hasVoted
          ? `${totalVotes} vote${totalVotes > 1 ? 's' : ''}`
          : 'Vote pour voir les résultats'}
      </Text>
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
  },
  optionDark: {
    backgroundColor: '#1E293B',
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
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    flexShrink: 1,
  },
  optionPct: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginLeft: 10,
  },
  totalVotes: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  textDark: {
    color: '#F8FAFC',
  },
  subTextDark: {
    color: '#CBD5E1',
  },
});

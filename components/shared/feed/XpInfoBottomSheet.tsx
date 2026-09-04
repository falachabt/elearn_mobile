import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useColorScheme, Dimensions } from 'react-native';
import Modal from 'react-native-modal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';

const XP_WAYS: { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; xp: string }[] = [
  { icon: 'note-plus-outline', label: 'Créer une publication', xp: '+5 XP' },
  { icon: 'comment-text-outline', label: 'Écrire un commentaire', xp: '+2 XP' },
  { icon: 'heart', label: 'Recevoir un like sur ta publication', xp: '+1 XP' },
  { icon: 'medal-outline', label: 'Ta réponse marquée "meilleure réponse"', xp: '+5 XP' },
  { icon: 'clipboard-check-outline', label: 'Terminer un quiz de cours ou d\'exercice', xp: 'Variable' },
  { icon: 'school-outline', label: 'Terminer un examen blanc', xp: 'Variable' },
];

interface XpInfoBottomSheetProps {
  visible: boolean;
  onClose: () => void;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function XpInfoBottomSheet({ visible, onClose }: XpInfoBottomSheetProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();

  const bg = isDark ? theme.color.dark.background.primary : '#FFFFFF';
  const textColor = isDark ? '#FFFFFF' : '#1A1A1A';
  const subColor = isDark ? '#AAAAAA' : '#666666';
  const borderColor = isDark ? '#333333' : '#E5E5E5';

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      style={styles.modal}
      backdropOpacity={0.5}
      propagateSwipe
      swipeDirection="down"
      onSwipeComplete={onClose}
      useNativeDriver
    >
      <View style={[styles.sheet, { backgroundColor: bg, maxHeight: SCREEN_HEIGHT * 0.7, paddingBottom: 28 + insets.bottom }]}>
        <View style={[styles.handle, { backgroundColor: borderColor }]} />

        <View style={styles.header}>
          <Text style={[styles.title, { color: textColor }]}>Comment gagner des XP ?</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <MaterialCommunityIcons name="close" size={22} color={subColor} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.intro, { color: subColor }]}>
          Chaque action utile sur le fil d'actualité te rapporte de l'XP. Cumule-les pour grimper dans le classement !
        </Text>

        {XP_WAYS.map((way) => (
          <View key={way.label} style={[styles.row, { borderBottomColor: borderColor }]}>
            <View style={styles.iconWrap}>
              <MaterialCommunityIcons name={way.icon} size={20} color={theme.color.primary[500]} />
            </View>
            <Text style={[styles.rowLabel, { color: textColor }]}>{way.label}</Text>
            <Text style={styles.xpText}>{way.xp}</Text>
          </View>
        ))}

        <View style={styles.footerNote}>
          <MaterialCommunityIcons name="information-outline" size={14} color={subColor} />
          <Text style={[styles.footerNoteText, { color: subColor }]}>
            Un like ne compte qu'une seule fois par personne et par publication.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: { justifyContent: 'flex-end', margin: 0 },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingBottom: 28,
    paddingHorizontal: 20,
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: { fontSize: 17, fontWeight: '700' },
  intro: { fontSize: 13, lineHeight: 19, marginBottom: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { flex: 1, fontSize: 14, fontWeight: '500' },
  xpText: { fontSize: 13, fontWeight: '800', color: theme.color.primary[500] },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 16,
  },
  footerNoteText: { flex: 1, fontSize: 12, lineHeight: 17 },
});

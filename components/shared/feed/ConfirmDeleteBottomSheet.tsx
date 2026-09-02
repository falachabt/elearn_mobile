// components/shared/feed/ConfirmDeleteBottomSheet.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import Modal from 'react-native-modal';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { theme } from '@/constants/theme';

interface ConfirmDeleteBottomSheetProps {
  visible: boolean;
  title?: string;
  message?: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  isDarkMode?: boolean;
}

export const ConfirmDeleteBottomSheet: React.FC<ConfirmDeleteBottomSheetProps> = ({
  visible,
  title = 'Supprimer la publication',
  message = 'Es-tu sûr de vouloir supprimer cette publication ? Cette action est irréversible.',
  loading = false,
  onCancel,
  onConfirm,
  isDarkMode = false,
}) => {
  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onCancel}
      onSwipeComplete={onCancel}
      swipeDirection={['down']}
      style={styles.modal}
      propagateSwipe
    >
      <View style={[styles.sheet, isDarkMode && styles.sheetDark]}>
        <View style={styles.handle} />

        <View style={[styles.iconWrap, isDarkMode && styles.iconWrapDark]}>
          <MaterialCommunityIcons name="trash-can-outline" size={26} color="#EF4444" />
        </View>

        <Text style={[styles.title, isDarkMode && styles.textDark]}>{title}</Text>
        <Text style={[styles.message, isDarkMode && styles.subTextDark]}>{message}</Text>

        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={onConfirm}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.deleteBtnText}>Supprimer</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.cancelBtn, isDarkMode && styles.cancelBtnDark]}
          onPress={onCancel}
          disabled={loading}
          activeOpacity={0.85}
        >
          <Text style={[styles.cancelBtnText, isDarkMode && styles.textDark]}>Annuler</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: theme.border.radius.large,
    borderTopRightRadius: theme.border.radius.large,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 36,
    alignItems: 'center',
  },
  sheetDark: {
    backgroundColor: theme.color.dark.background.primary,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    marginBottom: 20,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconWrapDark: {
    backgroundColor: '#3F1D1D',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
    lineHeight: 20,
  },
  textDark: {
    color: '#F8FAFC',
  },
  subTextDark: {
    color: '#94A3B8',
  },
  deleteBtn: {
    width: '100%',
    backgroundColor: '#EF4444',
    borderRadius: theme.border.radius.small,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  deleteBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  cancelBtn: {
    width: '100%',
    backgroundColor: '#F1F5F9',
    borderRadius: theme.border.radius.small,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelBtnDark: {
    backgroundColor: '#1E293B',
  },
  cancelBtnText: {
    color: '#0F172A',
    fontWeight: '700',
    fontSize: 15,
  },
});

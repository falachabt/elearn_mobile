import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import Modal from 'react-native-modal';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useUpdates } from '@/contexts/UpdatesContext';

interface UpdateModalProps {
  isVisible: boolean;
  onClose: () => void;
}

export default function UpdateModal({ isVisible, onClose }: UpdateModalProps) {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const { downloadAndApplyUpdate, dismissUpdate, isUpdating, updateError } = useUpdates();

  const backgroundColor = isDarkMode 
    ? theme.color.dark.background.primary 
    : theme.color.light.background.primary;
  
  const textColor = isDarkMode 
    ? theme.color.dark.text.primary 
    : theme.color.light.text.primary;
  
  const secondaryTextColor = isDarkMode 
    ? theme.color.dark.text.secondary 
    : theme.color.light.text.secondary;

  const handleApplyUpdate = async () => {
    try {
      await downloadAndApplyUpdate();
    } catch (error) {
      console.error('Error applying update:', error);
    }
  };

  const handleDismiss = () => {
    dismissUpdate();
    onClose();
  };

  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={handleDismiss}
      onBackButtonPress={handleDismiss}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      backdropTransitionOutTiming={0}
      style={{ margin: 0, justifyContent: 'flex-end' }}
    >
      <View
        style={{
          backgroundColor,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          padding: 24,
          minHeight: 200,
        }}
      >
        {/* Header */}
        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          <View
            style={{
              width: 60,
              height: 60,
              borderRadius: 30,
              backgroundColor: theme.color.primary[500],
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
            }}
          >
            <MaterialCommunityIcons
              name="download"
              size={28}
              color="#FFFFFF"
            />
          </View>
          
          <Text
            style={{
              fontSize: 20,
              fontWeight: 'bold',
              color: textColor,
              fontFamily: theme.typography.fontFamily,
              textAlign: 'center',
            }}
          >
            Mise à jour disponible
          </Text>
        </View>

        {/* Content */}
        <Text
          style={{
            fontSize: 16,
            color: secondaryTextColor,
            fontFamily: theme.typography.fontFamily,
            textAlign: 'center',
            marginBottom: 24,
            lineHeight: 24,
          }}
        >
          Une nouvelle version de l'application est disponible. Redémarrez l'application pour bénéficier des dernières améliorations et corrections.
        </Text>

        {/* Error message */}
        {updateError && (
          <View
            style={{
              backgroundColor: '#ffebee',
              borderRadius: 8,
              padding: 12,
              marginBottom: 20,
            }}
          >
            <Text
              style={{
                color: theme.color.danger,
                fontSize: 14,
                fontFamily: theme.typography.fontFamily,
                textAlign: 'center',
              }}
            >
              {updateError}
            </Text>
          </View>
        )}

        {/* Actions */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {/* Dismiss button */}
          <TouchableOpacity
            onPress={handleDismiss}
            disabled={isUpdating}
            style={{
              flex: 1,
              paddingVertical: 14,
              paddingHorizontal: 20,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: isDarkMode 
                ? theme.color.dark.border 
                : theme.color.light.border,
              backgroundColor: 'transparent',
              alignItems: 'center',
              opacity: isUpdating ? 0.6 : 1,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: '600',
                color: textColor,
                fontFamily: theme.typography.fontFamily,
              }}
            >
              Plus tard
            </Text>
          </TouchableOpacity>

          {/* Apply update button */}
          <TouchableOpacity
            onPress={handleApplyUpdate}
            disabled={isUpdating}
            style={{
              flex: 1,
              paddingVertical: 14,
              paddingHorizontal: 20,
              borderRadius: 12,
              backgroundColor: theme.color.primary[500],
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 8,
              opacity: isUpdating ? 0.8 : 1,
            }}
          >
            {isUpdating ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <MaterialCommunityIcons
                name="restart"
                size={20}
                color="#FFFFFF"
              />
            )}
            <Text
              style={{
                fontSize: 16,
                fontWeight: '600',
                color: '#FFFFFF',
                fontFamily: theme.typography.fontFamily,
              }}
            >
              {isUpdating ? 'Redémarrage...' : 'Redémarrer'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Additional info */}
        <Text
          style={{
            fontSize: 12,
            color: secondaryTextColor,
            fontFamily: theme.typography.fontFamily,
            textAlign: 'center',
            marginTop: 16,
            opacity: 0.8,
          }}
        >
          Le redémarrage prendra quelques secondes
        </Text>
      </View>
    </Modal>
  );
}
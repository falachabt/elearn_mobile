// components/shared/feed/CreatePostModal.tsx
import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '@/constants/theme';
import { createFeedPost, uploadPostImage } from '@/services/feed.service';

interface CreatePostModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userId: string;
  isDarkMode?: boolean;
}

// Couleurs de fond disponibles pour un post "statut" (texte court, sans image)
const BG_COLORS = [
  '#E53935', '#D81B60', '#8E24AA', '#5E35B1', '#3949AB',
  '#1E88E5', '#039BE5', '#00ACC1', '#00897B', '#43A047',
  '#7CB342', '#F4511E', '#6D4C41', '#546E7A', '#1E293B',
];
const BG_COLOR_MAX_CHARS = 130;

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  visible,
  onClose,
  onSuccess,
  userId,
  isDarkMode = false,
}) => {
  const insets = useSafeAreaInsets();
  const [content, setContent] = useState('');
  const [selectedImages, setSelectedImages] = useState<{ uri: string; mimeType?: string }[]>([]);
  const [bgColor, setBgColor] = useState<string | null>(null);
  const [pollMode, setPollMode] = useState(false);
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);

  const [loading, setLoading] = useState(false);

  const canUseBgColor = selectedImages.length === 0 && content.trim().length <= BG_COLOR_MAX_CHARS;

  React.useEffect(() => {
    if (!canUseBgColor && bgColor) {
      setBgColor(null);
    }
  }, [canUseBgColor, bgColor]);

  const handlePickImages = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*'],
        multiple: true,
      });

      if (!result.canceled && result.assets) {
        const newImages = result.assets.map((asset) => ({ uri: asset.uri, mimeType: asset.mimeType }));
        setSelectedImages((prev) => [...prev, ...newImages]);
      }
    } catch (err) {
      Alert.alert('Erreur', "Impossible de sélectionner l'image.");
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setSelectedImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const togglePollMode = () => {
    setPollMode((prev) => {
      const next = !prev;
      if (next) {
        setSelectedImages([]);
      }
      return next;
    });
  };

  const handlePollOptionChange = (index: number, value: string) => {
    setPollOptions((prev) => prev.map((o, i) => (i === index ? value : o)));
  };

  const handleAddPollOption = () => {
    setPollOptions((prev) => (prev.length >= 6 ? prev : [...prev, '']));
  };

  const handleRemovePollOption = (index: number) => {
    setPollOptions((prev) => (prev.length <= 2 ? prev : prev.filter((_, i) => i !== index)));
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      Alert.alert('Attention', 'Veuillez saisir un texte pour votre publication.');
      return;
    }

    const cleanPollOptions = pollOptions.map((o) => o.trim()).filter(Boolean);
    if (pollMode && cleanPollOptions.length < 2) {
      Alert.alert('Attention', 'Ajoute au moins 2 options pour ton sondage.');
      return;
    }

    setLoading(true);

    try {
      // 1. Upload des médias vers Supabase Storage si nécessaire
      const mediaUrls: string[] = [];
      let failedUploads = 0;

      for (const img of selectedImages) {
        const uploadedUrl = await uploadPostImage(img.uri, userId, img.mimeType);
        if (uploadedUrl) {
          mediaUrls.push(uploadedUrl);
        } else {
          failedUploads += 1;
        }
      }

      if (failedUploads > 0) {
        Alert.alert(
          'Attention',
          `${failedUploads} image${failedUploads > 1 ? 's' : ''} sur ${selectedImages.length} n'${failedUploads > 1 ? 'ont' : 'a'} pas pu être envoyée${failedUploads > 1 ? 's' : ''}.`
        );
      }

      // 2. Création du post dans la table feed_posts
      const newPost = await createFeedPost(
        content.trim(),
        mediaUrls,
        userId,
        mediaUrls.length === 0 ? bgColor : null,
        pollMode ? cleanPollOptions : undefined
      );

      if (newPost) {
        setContent('');
        setSelectedImages([]);
        setBgColor(null);
        setPollMode(false);
        setPollOptions(['', '']);
        onSuccess();
        onClose();
      } else {
        Alert.alert('Erreur', 'Impossible de publier votre message.');
      }
    } catch (err) {
      Alert.alert('Erreur', 'Une erreur est survenue lors de la publication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.container, isDarkMode && styles.containerDark]}
      >
        {/* Header */}
        <View style={[styles.header, isDarkMode && styles.headerDark, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={onClose} disabled={loading} style={styles.closeBtn}>
            <MaterialCommunityIcons
              name="close"
              size={24}
              color={isDarkMode ? '#FFFFFF' : '#0F172A'}
            />
          </TouchableOpacity>
          <Text style={[styles.title, isDarkMode && styles.textDark]}>
            Nouvelle publication
          </Text>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading || !content.trim()}
            style={[
              styles.submitBtn,
              (!content.trim() || loading) && styles.submitBtnDisabled,
            ]}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.submitBtnText}>Publier</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
          {/* Zone de texte — fond coloré en aperçu si une couleur est choisie */}
          {bgColor ? (
            <View style={[styles.bgColorPreview, { backgroundColor: bgColor }]}>
              <TextInput
                multiline
                placeholder="Pose une question, partage un exercice ou un brouillon..."
                placeholderTextColor="rgba(255,255,255,0.7)"
                value={content}
                onChangeText={setContent}
                style={styles.bgColorInput}
                autoFocus
              />
            </View>
          ) : (
            <TextInput
              multiline
              placeholder="Pose une question, partage un exercice ou un brouillon..."
              placeholderTextColor={isDarkMode ? '#64748B' : '#94A3B8'}
              value={content}
              onChangeText={setContent}
              style={[styles.input, isDarkMode && styles.inputDark]}
              autoFocus
            />
          )}

          {/* Prévisualisation des images sélectionnées */}
          {selectedImages.length > 0 && (
            <View style={styles.imagesGrid}>
              {selectedImages.map((img, idx) => (
                <View key={idx} style={styles.imageWrapper}>
                  <Image source={{ uri: img.uri }} style={styles.previewImage} />
                  <TouchableOpacity
                    style={styles.removeImageBtn}
                    onPress={() => handleRemoveImage(idx)}
                  >
                    <MaterialCommunityIcons name="close" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Constructeur de sondage : liste d'options de vote */}
          {pollMode && (
            <View style={styles.pollSection}>
              <Text style={[styles.bgColorLabel, isDarkMode && styles.textDark]}>
                Options du sondage
              </Text>
              {pollOptions.map((option, index) => (
                <View key={index} style={styles.pollOptionRow}>
                  <TextInput
                    value={option}
                    onChangeText={(value) => handlePollOptionChange(index, value)}
                    placeholder={`Option ${index + 1}`}
                    placeholderTextColor={isDarkMode ? '#64748B' : '#94A3B8'}
                    style={[styles.pollOptionInput, isDarkMode && styles.pollOptionInputDark]}
                  />
                  {pollOptions.length > 2 && (
                    <TouchableOpacity
                      onPress={() => handleRemovePollOption(index)}
                      style={styles.pollOptionRemoveBtn}
                    >
                      <MaterialCommunityIcons name="close" size={18} color="#94A3B8" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              {pollOptions.length < 6 && (
                <TouchableOpacity onPress={handleAddPollOption} style={styles.pollAddBtn}>
                  <MaterialCommunityIcons name="plus" size={18} color={theme.color.primary[500]} />
                  <Text style={styles.pollAddBtnText}>Ajouter une option</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Sélecteur de couleur de fond (texte court, sans image uniquement) */}
          {canUseBgColor && (
            <View style={styles.bgColorSection}>
              <Text style={[styles.bgColorLabel, isDarkMode && styles.textDark]}>
                Couleur de fond
              </Text>
              <View style={styles.bgColorRow}>
                <TouchableOpacity
                  onPress={() => setBgColor(null)}
                  style={[
                    styles.bgColorSwatch,
                    styles.bgColorNone,
                    isDarkMode && styles.bgColorNoneDark,
                    !bgColor && styles.bgColorSwatchActive,
                  ]}
                >
                  <MaterialCommunityIcons
                    name="close"
                    size={16}
                    color={isDarkMode ? '#94A3B8' : '#64748B'}
                  />
                </TouchableOpacity>
                {BG_COLORS.map((color) => (
                  <TouchableOpacity
                    key={color}
                    onPress={() => setBgColor(color)}
                    style={[
                      styles.bgColorSwatch,
                      { backgroundColor: color },
                      bgColor === color && styles.bgColorSwatchActive,
                    ]}
                  />
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Barre d'outils en bas */}
        <View style={[styles.toolbar, isDarkMode && styles.toolbarDark, { paddingBottom: 12 + insets.bottom }]}>
          {!pollMode && (
            <TouchableOpacity
              style={styles.toolBtn}
              onPress={handlePickImages}
              disabled={loading}
            >
              <MaterialCommunityIcons
                name="camera-outline"
                size={24}
                color={theme.color.primary[500]}
              />
              <Text style={styles.toolBtnText}>Ajouter photo / brouillon</Text>
            </TouchableOpacity>
          )}
          {selectedImages.length === 0 && (
            <TouchableOpacity
              style={styles.toolBtn}
              onPress={togglePollMode}
              disabled={loading}
            >
              <MaterialCommunityIcons
                name="poll"
                size={24}
                color={pollMode ? '#EF4444' : theme.color.primary[500]}
              />
              <Text style={[styles.toolBtnText, pollMode && { color: '#EF4444' }]}>
                {pollMode ? 'Annuler le sondage' : 'Créer un sondage'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  containerDark: {
    backgroundColor: theme.color.dark.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerDark: {
    borderBottomColor: '#1E293B',
  },
  closeBtn: {
    padding: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  textDark: {
    color: '#FFFFFF',
  },
  submitBtn: {
    backgroundColor: theme.color.primary[500],
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: 16,
  },
  input: {
    fontSize: 16,
    lineHeight: 24,
    color: '#0F172A',
    minHeight: 150,
    textAlignVertical: 'top',
  },
  inputDark: {
    color: '#FFFFFF',
  },
  imagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
  },
  imageWrapper: {
    position: 'relative',
    width: 100,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolbar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  toolbarDark: {
    borderTopColor: '#1E293B',
  },
  toolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toolBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.color.primary[500],
  },
  bgColorPreview: {
    borderRadius: theme.border.radius.medium,
    minHeight: 150,
    padding: 16,
    justifyContent: 'center',
  },
  bgColorInput: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 28,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  pollSection: {
    marginTop: 20,
  },
  pollOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  pollOptionInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#F1F5F9',
    borderRadius: theme.border.radius.small,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  pollOptionInputDark: {
    backgroundColor: '#1E293B',
    color: '#F8FAFC',
  },
  pollOptionRemoveBtn: {
    padding: 6,
  },
  pollAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  pollAddBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.color.primary[500],
  },
  bgColorSection: {
    marginTop: 20,
  },
  bgColorLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 10,
  },
  bgColorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingVertical: 4,
    paddingLeft: 2,
  },
  bgColorSwatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  bgColorSwatchActive: {
    borderWidth: 2,
    borderColor: '#0F172A',
    transform: [{ scale: 1.1 }],
  },
  bgColorNone: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bgColorNoneDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
});

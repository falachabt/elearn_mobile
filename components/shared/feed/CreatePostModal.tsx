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

import { theme } from '@/constants/theme';
import { createFeedPost, uploadPostImage } from '@/services/feed.service';

interface CreatePostModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userId: string;
  isDarkMode?: boolean;
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  visible,
  onClose,
  onSuccess,
  userId,
  isDarkMode = false,
}) => {
  const [content, setContent] = useState('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(false);

  const handlePickImages = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*'],
        multiple: true,
      });

      if (!result.canceled && result.assets) {
        const newUris = result.assets.map((asset) => asset.uri);
        setSelectedImages((prev) => [...prev, ...newUris]);
      }
    } catch (err) {
      Alert.alert('Erreur', "Impossible de sélectionner l'image.");
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setSelectedImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      Alert.alert('Attention', 'Veuillez saisir un texte pour votre publication.');
      return;
    }

    setLoading(true);

    try {
      // 1. Upload des médias vers Supabase Storage si nécessaire
      const mediaUrls: string[] = [];

      for (const uri of selectedImages) {
        const uploadedUrl = await uploadPostImage(uri, userId);
        if (uploadedUrl) {
          mediaUrls.push(uploadedUrl);
        }
      }

      

      // 2. Création du post dans la table feed_posts
      const newPost = await createFeedPost(content.trim(), mediaUrls, userId);

      if (newPost) {
        setContent('');
        setSelectedImages([]);
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
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.container, isDarkMode && styles.containerDark]}
      >
        {/* Header */}
        <View style={[styles.header, isDarkMode && styles.headerDark]}>
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
          {/* Zone de texte */}
          <TextInput
            multiline
            placeholder="Pose une question, partage un exercice ou un brouillon..."
            placeholderTextColor={isDarkMode ? '#64748B' : '#94A3B8'}
            value={content}
            onChangeText={setContent}
            style={[styles.input, isDarkMode && styles.inputDark]}
            autoFocus
          />

          {/* Prévisualisation des images sélectionnées */}
          {selectedImages.length > 0 && (
            <View style={styles.imagesGrid}>
              {selectedImages.map((uri, idx) => (
                <View key={idx} style={styles.imageWrapper}>
                  <Image source={{ uri }} style={styles.previewImage} />
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
          
        </ScrollView>

        {/* Barre d'outils en bas */}
        <View style={[styles.toolbar, isDarkMode && styles.toolbarDark]}>
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
    paddingTop: 50,
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
});

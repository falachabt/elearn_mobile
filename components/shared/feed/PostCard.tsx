// components/shared/feed/PostCard.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Share,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';
import type { FeedPost } from '@/services/feed.service';

const { width } = Dimensions.get('window');

interface PostCardProps {
  post: FeedPost;
  isDarkMode?: boolean;
  currentUserId?: string;
  onPressPost?: (post: FeedPost) => void;
  onPressDelete?: (post: FeedPost) => void;
  onPressImage?: (imageUrl: string) => void;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  isDarkMode = false,
  currentUserId,
  onPressPost,
  onPressDelete,
  onPressImage,
}) => {
  const isOwner = currentUserId && post.author_id === currentUserId;

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return "À l'instant";
      if (diffMins < 60) return `Il y a ${diffMins} min`;
      if (diffHours < 24) return `Il y a ${diffHours} h`;
      if (diffDays < 7) return `Il y a ${diffDays} j`;

      return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
      });
    } catch {
      return dateString;
    }
  };

  const authorName = post.author?.full_name || 'Élève';
  const avatarUrl = post.author?.avatar_url;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => onPressPost?.(post)}
      style={[
        styles.card,
        isDarkMode && styles.cardDark,
      ]}
    >
      {/* Header : Avatar + Info Auteur + Badge + Date */}
      <View style={styles.header}>
        <View style={styles.authorContainer}>
          <View style={styles.avatarWrapper}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarInitial}>
                  {authorName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.onlineBadge} />
          </View>

          <View style={styles.authorInfo}>
            <View style={styles.nameRow}>
              <Text style={[styles.authorName, isDarkMode && styles.textDark]}>
                {authorName}
              </Text>
              <View style={styles.verifiedBadge}>
                <MaterialCommunityIcons name="check-decagram" size={14} color="#059669" />
              </View>
            </View>
            <View style={styles.subMetaRow}>
              <Text style={[styles.dateText, isDarkMode && styles.subTextDark]}>
                {formatDate(post.created_at)}
              </Text>
              <Text style={styles.metaDot}>•</Text>
              <Text style={styles.categoryTag}>Question / Exo</Text>
            </View>
          </View>
        </View>

        {isOwner && onPressDelete && (
          <TouchableOpacity
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={() => onPressDelete(post)}
            style={styles.deleteBtn}
          >
            <MaterialCommunityIcons
              name="trash-can-outline"
              size={20}
              color={theme.color.error || '#EF4444'}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Contenu Texte */}
      <Text style={[styles.content, isDarkMode && styles.textDark]}>
        {post.content}
      </Text>

      {/* Galerie Médias / Photos de brouillon avec badge HD */}
      {post.media_urls && post.media_urls.length > 0 && (
        <View style={styles.mediaContainer}>
          {post.media_urls.map((url, idx) => (
            <TouchableOpacity
              key={idx}
              activeOpacity={0.9}
              onPress={() => onPressImage?.(url)}
              style={styles.imageWrapper}
            >
              <Image
                source={{ uri: url }}
                style={styles.postImage}
                resizeMode="cover"
              />
              <View style={styles.imageOverlayBadge}>
                <MaterialCommunityIcons name="attachment" size={12} color="#FFF" />
                <Text style={styles.imageBadgeText}>Brouillon / Exercice (Agrandir 🔍)</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Système d'Interaction & Commentaires Réels */}
      <View style={[styles.voteApprovalBar, isDarkMode && styles.voteApprovalBarDark]}>
        {/* Bouton Accès Réponses / Commentaires */}
        <TouchableOpacity
          style={styles.commentActionBtn}
          onPress={() => onPressPost?.(post)}
        >
          <MaterialCommunityIcons
            name="comment-text-multiple-outline"
            size={18}
            color={theme.color.primary[500]}
          />
          <Text style={styles.commentActionText}>
            {post.comments_count || 0} réponse{(post.comments_count || 0) > 1 ? 's' : ''}
          </Text>
        </TouchableOpacity>

        {/* Bouton Partager Réel */}
        <TouchableOpacity
          style={styles.commentActionBtn}
          onPress={async (e) => {
            e.stopPropagation();
            try {
              await Share.share({
                message: `Question sur Elearn Prepa :\n\n${post.content}`,
              });
            } catch (error) {
              console.log(error);
            }
          }}
        >
          <MaterialCommunityIcons
            name="share-variant-outline"
            size={18}
            color={isDarkMode ? '#94A3B8' : '#64748B'}
          />
          <Text style={[styles.commentActionText, { color: isDarkMode ? '#94A3B8' : '#64748B', fontWeight: '500' }]}>
            Partager
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOpacity: 0.3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  authorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPlaceholder: {
    backgroundColor: theme.color.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  authorInfo: {
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  authorName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  verifiedBadge: {
    marginLeft: 2,
  },
  subMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 6,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
  metaDot: {
    fontSize: 12,
    color: '#94A3B8',
  },
  categoryTag: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  textDark: {
    color: '#F8FAFC',
  },
  subTextDark: {
    color: '#94A3B8',
  },
  deleteBtn: {
    padding: 6,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
  },
  content: {
    fontSize: 15,
    lineHeight: 23,
    color: '#334155',
    marginBottom: 14,
    fontWeight: '400',
  },
  mediaContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 14,
  },
  imageWrapper: {
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
  },
  postImage: {
    width: '100%',
    height: 230,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
  },
  imageOverlayBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  imageBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  voteApprovalBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
    marginTop: 4,
  },
  voteApprovalBarDark: {
    borderTopColor: '#334155',
  },
  commentActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  commentActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.color.primary[500],
  },
});

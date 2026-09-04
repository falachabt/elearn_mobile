// components/shared/feed/PostCard.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Share,
  ScrollView,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';
import type { FeedPost, PostComment } from '@/services/feed.service';
import { voteOnComment } from '@/services/feed.service';
import { PollBlock } from './PollBlock';
import { RichText } from './RichText';

const { width } = Dimensions.get('window');

const PREVIEW_MAX_CHARS = 110;
const CONTENT_MAX_CHARS = 220;

interface PostCardProps {
  post: FeedPost;
  isDarkMode?: boolean;
  currentUserId?: string;
  onPressPost?: (post: FeedPost) => void;
  onPressDelete?: (post: FeedPost) => void;
  onPressImage?: (images: string[], index: number) => void;
  onPressAuthor?: (authorId: string) => void;
  onToggleLike?: (post: FeedPost) => void;
  onVotePoll?: (post: FeedPost, optionId: string) => void;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  isDarkMode = false,
  currentUserId,
  onPressPost,
  onPressDelete,
  onPressImage,
  onPressAuthor,
  onToggleLike,
  onVotePoll,
}) => {
  const isOwner = currentUserId && post.author_id === currentUserId;
  const [previewComments, setPreviewComments] = useState<PostComment[]>(
    post.preview_comments ?? []
  );
  const [galleryWidth, setGalleryWidth] = useState(Dimensions.get('window').width - 36);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [contentExpanded, setContentExpanded] = useState(false);

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
  const hasBgColor = !!post.bg_color && (!post.media_urls || post.media_urls.length === 0);

  const handlePreviewVote = (comment: PostComment, delta: 1 | -1) => {
    if (!currentUserId) return;

    setPreviewComments((prev) =>
      prev.map((c) => {
        if (c.id !== comment.id) return c;
        const currentVote = c.user_vote || 0;
        let newVote: -1 | 0 | 1 = 0;
        let scoreDiff = 0;
        if (currentVote === delta) {
          newVote = 0;
          scoreDiff = -delta;
        } else if (currentVote === 0) {
          newVote = delta;
          scoreDiff = delta;
        } else {
          newVote = delta;
          scoreDiff = delta * 2;
        }
        return { ...c, user_vote: newVote, score: c.score + scoreDiff };
      })
    );

    void voteOnComment(comment.id, currentUserId, delta);
  };

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
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              onPressAuthor?.(post.author_id);
            }}
          >
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
              {post.author?.is_online && <View style={styles.onlineBadge} />}
            </View>
          </TouchableOpacity>

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

      {/* Contenu Texte — fond coloré style "statut" pour un texte court sans média */}
      {hasBgColor ? (
        <View style={[styles.bgColorBox, { backgroundColor: post.bg_color! }]}>
          <Text style={styles.bgColorText}>{post.content}</Text>
        </View>
      ) : (
        <View style={styles.contentWrapper}>
          <RichText
            style={[styles.content, isDarkMode && styles.textDark]}
            content={
              post.content.length > CONTENT_MAX_CHARS && !contentExpanded
                ? `${post.content.slice(0, CONTENT_MAX_CHARS).trim()}…`
                : post.content
            }
          />
          {post.content.length > CONTENT_MAX_CHARS && (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                setContentExpanded((prev) => !prev);
              }}
            >
              <Text style={styles.seeMoreText}>
                {contentExpanded ? 'Voir moins' : 'Voir plus'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Galerie Médias / Photos de brouillon avec badge HD */}
      {post.media_urls && post.media_urls.length > 0 && (
        <View
          style={styles.mediaContainer}
          onLayout={(e) => setGalleryWidth(e.nativeEvent.layout.width)}
        >
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / galleryWidth);
              setActiveImageIndex(idx);
            }}
          >
            {post.media_urls.map((url, idx) => (
              <TouchableOpacity
                key={idx}
                activeOpacity={0.9}
                onPress={(e) => {
                  e.stopPropagation();
                  onPressImage?.(post.media_urls!, idx);
                }}
                style={[styles.imageWrapper, { width: galleryWidth }]}
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
          </ScrollView>
          {post.media_urls.length > 1 && (
            <View style={styles.galleryDots}>
              {post.media_urls.map((_, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.galleryDot,
                    idx === activeImageIndex && styles.galleryDotActive,
                  ]}
                />
              ))}
            </View>
          )}
        </View>
      )}

      {/* Sondage : options de vote en bas du post */}
      {post.poll_options && post.poll_options.length > 0 && (
        <PollBlock
          options={post.poll_options}
          totalVotes={post.poll_total_votes ?? 0}
          votedOptionId={post.poll_voted_option_id}
          isDarkMode={isDarkMode}
          onVote={(optionId) => onVotePoll?.(post, optionId)}
        />
      )}

      {/* Aperçu des 2-3 premières réponses */}
      {previewComments.length > 0 && (
        <View style={[styles.previewContainer, isDarkMode && styles.previewContainerDark]}>
          {previewComments.map((comment) => {
            const isLong = comment.content.length > PREVIEW_MAX_CHARS;
            const previewText = isLong
              ? `${comment.content.slice(0, PREVIEW_MAX_CHARS).trim()}…`
              : comment.content;
            const commentAuthorName = comment.author?.full_name || 'Élève';

            return (
              <View key={comment.id} style={styles.previewRow}>
                <View style={styles.previewAvatarPlaceholder}>
                  <Text style={styles.previewAvatarText}>
                    {commentAuthorName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.previewTextCol}>
                  <View style={styles.previewAuthorRow}>
                    <Text style={[styles.previewAuthorName, isDarkMode && styles.textDark]}>
                      {commentAuthorName}
                    </Text>
                    {post.best_comment_id === comment.id && (
                      <View style={styles.previewBestBadge}>
                        <MaterialCommunityIcons name="check-decagram" size={11} color="#059669" />
                        <Text style={styles.previewBestBadgeText}>Meilleure réponse</Text>
                      </View>
                    )}
                  </View>
                  <RichText
                    style={[styles.previewContent, isDarkMode && styles.subTextDark]}
                    content={previewText}
                  >
                    {isLong && (
                      <Text
                        style={styles.previewSeeMore}
                        onPress={(e: any) => {
                          e.stopPropagation();
                          onPressPost?.(post);
                        }}
                      >
                        {'  '}Voir plus
                      </Text>
                    )}
                  </RichText>
                </View>
                <View style={styles.previewVoteCol}>
                  <TouchableOpacity
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    onPress={(e) => {
                      e.stopPropagation();
                      handlePreviewVote(comment, 1);
                    }}
                  >
                    <MaterialCommunityIcons
                      name="thumb-up"
                      size={16}
                      color={comment.user_vote === 1 ? '#059669' : '#94A3B8'}
                    />
                  </TouchableOpacity>
                  <Text
                    style={[
                      styles.previewScore,
                      comment.user_vote === 1 && { color: '#059669' },
                      comment.user_vote === -1 && { color: '#EF4444' },
                    ]}
                  >
                    {comment.score}
                  </Text>
                  <TouchableOpacity
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    onPress={(e) => {
                      e.stopPropagation();
                      handlePreviewVote(comment, -1);
                    }}
                  >
                    <MaterialCommunityIcons
                      name="thumb-down"
                      size={16}
                      color={comment.user_vote === -1 ? '#EF4444' : '#94A3B8'}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Système d'Interaction : Like, Commentaires, Partage */}
      <View style={[styles.voteApprovalBar, isDarkMode && styles.voteApprovalBarDark]}>
        <TouchableOpacity
          style={styles.commentActionBtn}
          onPress={(e) => {
            e.stopPropagation();
            onToggleLike?.(post);
          }}
        >
          <MaterialCommunityIcons
            name={post.liked_by_me ? 'heart' : 'heart-outline'}
            size={18}
            color={post.liked_by_me ? '#EF4444' : (isDarkMode ? '#94A3B8' : '#64748B')}
          />
          <Text
            style={[
              styles.commentActionText,
              { color: post.liked_by_me ? '#EF4444' : (isDarkMode ? '#94A3B8' : '#64748B'), fontWeight: '500' },
            ]}
          >
            {post.likes_count || 0}
          </Text>
        </TouchableOpacity>

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

        <TouchableOpacity
          style={styles.commentActionBtn}
          onPress={async (e) => {
            e.stopPropagation();
            try {
              const postUrl = `https://app.elearnprepa.com/post/${post.id}`;
              await Share.share({
                message: `Question sur Elearn Prepa :\n\n${post.content}\n\n${postUrl}`,
                url: postUrl,
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
    borderRadius: theme.border.radius.small,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
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
  textDark: {
    color: '#F8FAFC',
  },
  subTextDark: {
    color: '#94A3B8',
  },
  deleteBtn: {
    padding: 6,
    backgroundColor: '#FEF2F2',
    borderRadius: theme.border.radius.small,
  },
  contentWrapper: {
    marginBottom: 14,
  },
  content: {
    fontSize: 15,
    lineHeight: 23,
    color: '#334155',
    fontWeight: '400',
  },
  seeMoreText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.color.primary[500],
    marginTop: 4,
  },
  bgColorBox: {
    borderRadius: theme.border.radius.small,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 160,
    marginBottom: 14,
  },
  bgColorText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 28,
  },
  mediaContainer: {
    position: 'relative',
    borderRadius: theme.border.radius.small,
    overflow: 'hidden',
    marginBottom: 14,
  },
  imageWrapper: {
    position: 'relative',
    borderRadius: theme.border.radius.small,
    overflow: 'hidden',
  },
  postImage: {
    width: '100%',
    height: 230,
    borderRadius: theme.border.radius.small,
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
  galleryDots: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  galleryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  galleryDotActive: {
    backgroundColor: '#FFFFFF',
    width: 16,
  },
  previewContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: theme.border.radius.small,
    padding: 10,
    marginBottom: 12,
    gap: 10,
  },
  previewContainerDark: {
    backgroundColor: '#0F172A',
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  previewAvatarPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#94A3B8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewAvatarText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  previewTextCol: {
    flex: 1,
  },
  previewAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  previewAuthorName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  previewBestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  previewBestBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  previewContent: {
    fontSize: 12,
    lineHeight: 17,
    color: '#475569',
    marginTop: 1,
  },
  previewSeeMore: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.color.primary[500],
  },
  previewVoteCol: {
    alignItems: 'center',
    gap: 2,
  },
  previewScore: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
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

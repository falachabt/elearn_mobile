// app/(app)/post/[id].tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  useColorScheme,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';
import {
  getPost,
  getPostComments,
  addComment,
  voteOnComment,
  toggleLikePost,
  votePollOption,
  PostComment,
  FeedPost,
} from '@/services/feed.service';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth';
import { ImageViewerModal } from '@/components/shared/feed/ImageViewerModal';
import { UserProfileBottomSheet } from '@/components/shared/feed/UserProfileBottomSheet';
import { PollBlock } from '@/components/shared/feed/PollBlock';
import { RichText } from '@/components/shared/feed/RichText';

const TAB_BAR_HEIGHT = 65;
const STICKY_HEADER_THRESHOLD = 160;

type ReplyingTo = { id: string; authorName: string } | null;

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const { user: authUser } = useAuth();

  const [post, setPost] = useState<FeedPost | null>(null);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCommentText, setNewCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [imageViewerVisible, setImageViewerVisible] = useState<boolean>(false);
  const [replyingTo, setReplyingTo] = useState<ReplyingTo>(null);
  const [profileSheetUserId, setProfileSheetUserId] = useState<string | null>(null);
  const [showStickyHeader, setShowStickyHeader] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    fetchInitialData();
  }, [id]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id || '';
      setCurrentUserId(userId);

      if (!id) return;

      const [postData, commentList] = await Promise.all([
        getPost(id, userId),
        getPostComments(id, userId),
      ]);

      if (postData) setPost(postData);
      setComments(commentList);
    } catch (err) {
      Alert.alert('Erreur', 'Impossible de charger la publication.');
    } finally {
      setLoading(false);
    }
  };

  const refreshComments = async () => {
    if (!id || !currentUserId) return;
    const commentList = await getPostComments(id, currentUserId);
    setComments(commentList);
  };

  const handleSendComment = async () => {
    if (!newCommentText.trim() || !id || !currentUserId) return;

    setSubmittingComment(true);
    try {
      const added = await addComment(
        id,
        newCommentText.trim(),
        currentUserId,
        replyingTo?.id ?? null
      );
      if (added) {
        setNewCommentText('');
        setReplyingTo(null);
        await refreshComments();
      } else {
        Alert.alert('Erreur', "Impossible d'ajouter le commentaire.");
      }
    } catch (err) {
      Alert.alert('Erreur', 'Une erreur est survenue.');
    } finally {
      setSubmittingComment(false);
    }
  };

  // Applique une mise à jour de vote sur un commentaire, quel que soit son
  // niveau (racine ou réponse imbriquée).
  const applyVoteUpdate = (
    list: PostComment[],
    commentId: string,
    delta: 1 | -1
  ): PostComment[] =>
    list.map((c) => {
      if (c.id === commentId) {
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
      }
      if (c.replies && c.replies.length > 0) {
        return { ...c, replies: applyVoteUpdate(c.replies, commentId, delta) };
      }
      return c;
    });

  const handleVote = async (commentId: string, delta: 1 | -1) => {
    if (!currentUserId) return;

    setComments((prev) => {
      const updated = applyVoteUpdate(prev, commentId, delta);
      return [...updated].sort((a, b) => b.score - a.score);
    });

    await voteOnComment(commentId, currentUserId, delta);
  };

  const handleToggleLike = async () => {
    if (!post || !currentUserId) return;
    const wasLiked = !!post.liked_by_me;

    setPost((prev) =>
      prev
        ? {
            ...prev,
            liked_by_me: !wasLiked,
            likes_count: (prev.likes_count || 0) + (wasLiked ? -1 : 1),
          }
        : prev
    );

    await toggleLikePost(post.id, currentUserId, wasLiked);
  };

  const handleVotePoll = async (optionId: string) => {
    if (!post || !currentUserId || post.poll_voted_option_id) return;

    setPost((prev) =>
      prev
        ? {
            ...prev,
            poll_voted_option_id: optionId,
            poll_total_votes: (prev.poll_total_votes ?? 0) + 1,
            poll_options: prev.poll_options?.map((o) =>
              o.id === optionId ? { ...o, votes_count: o.votes_count + 1 } : o
            ),
          }
        : prev
    );

    await votePollOption(post.id, optionId, currentUserId);
  };

  const startReply = (comment: PostComment) => {
    setReplyingTo({ id: comment.id, authorName: comment.author?.full_name || 'Élève' });
    inputRef.current?.focus();
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const countAllComments = (list: PostComment[]): number =>
    list.reduce((sum, c) => sum + 1 + countAllComments(c.replies ?? []), 0);

  const totalCommentCount = countAllComments(comments);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, isDarkMode && styles.containerDark]}>
        <ActivityIndicator size="large" color={theme.color.primary[500]} />
      </View>
    );
  }

  const postAuthorName = post?.author?.full_name || 'Élève';
  const postAvatarUrl = post?.author?.avatar_url;
  const hasBgColor = !!post?.bg_color && (!post.media_urls || post.media_urls.length === 0);

  const renderComment = (comment: PostComment, isReply = false) => {
    const isTopAnswer = !isReply && comments[0]?.id === comment.id && comment.score > 0;
    const commentAuthorName = comment.author?.full_name || 'Élève';
    const commentAvatarUrl = comment.author?.avatar_url;

    return (
      <View key={comment.id}>
        <View
          style={[
            styles.commentCard,
            isDarkMode && styles.commentCardDark,
            isReply && styles.replyCard,
            isTopAnswer && (isDarkMode ? styles.topAnswerCardDark : styles.topAnswerCard),
          ]}
        >
          {isTopAnswer && (
            <View style={styles.topAnswerBadge}>
              <MaterialCommunityIcons name="check-decagram" size={14} color="#059669" />
              <Text style={styles.topAnswerBadgeText}>Meilleure réponse approuvée</Text>
            </View>
          )}

          <View style={styles.commentInnerRow}>
            <View style={styles.commentMain}>
              <View style={styles.commentAuthorRow}>
                <TouchableOpacity onPress={() => setProfileSheetUserId(comment.author_id)}>
                  {commentAvatarUrl ? (
                    <Image source={{ uri: commentAvatarUrl }} style={styles.commentAvatar} />
                  ) : (
                    <View style={styles.commentAvatarPlaceholder}>
                      <Text style={styles.commentAvatarText}>
                        {commentAuthorName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
                <View style={styles.commentMetaCol}>
                  <Text style={[styles.commentAuthorName, isDarkMode && styles.textDark]}>
                    {commentAuthorName}
                  </Text>
                  <Text style={styles.commentDate}>{formatDate(comment.created_at)}</Text>
                </View>
              </View>
              <RichText
                style={[styles.commentText, isDarkMode && styles.subTextDark]}
                content={comment.content}
              />
              <TouchableOpacity onPress={() => startReply(comment)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <Text style={styles.replyLink}>Répondre</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.voteContainer, isDarkMode && styles.voteContainerDark]}>
              <TouchableOpacity
                onPress={() => handleVote(comment.id, 1)}
                style={[styles.voteBtn, comment.user_vote === 1 && styles.voteBtnUpActive]}
              >
                <MaterialCommunityIcons
                  name="thumb-up"
                  size={20}
                  color={comment.user_vote === 1 ? '#059669' : '#94A3B8'}
                />
              </TouchableOpacity>

              <Text
                style={[
                  styles.scoreText,
                  comment.user_vote === 1 && styles.scoreActiveUp,
                  comment.user_vote === -1 && styles.scoreActiveDown,
                ]}
              >
                {comment.score > 0 ? `+${comment.score}` : comment.score}
              </Text>

              <TouchableOpacity
                onPress={() => handleVote(comment.id, -1)}
                style={[styles.voteBtn, comment.user_vote === -1 && styles.voteBtnDownActive]}
              >
                <MaterialCommunityIcons
                  name="thumb-down"
                  size={20}
                  color={comment.user_vote === -1 ? '#EF4444' : '#94A3B8'}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {comment.replies && comment.replies.length > 0 && (
          <View style={styles.repliesContainer}>
            {comment.replies.map((reply) => renderComment(reply, true))}
          </View>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, isDarkMode && styles.containerDark]}
    >
      <Stack.Screen
        options={{
          headerTitle: 'Publication',
          headerBackTitle: 'Retour',
        }}
      />

      <View style={[styles.topHeader, isDarkMode && styles.topHeaderDark, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, isDarkMode && styles.backButtonDark]}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={isDarkMode ? '#F9FAFB' : '#111827'} />
        </TouchableOpacity>
        <Text style={[styles.topHeaderTitle, isDarkMode && styles.textDark]}>Publication</Text>
      </View>

      {/* Barre condensée "revoir la question" affichée en scrollant vers les réponses */}
      {showStickyHeader && post && (
        <TouchableOpacity
          style={[styles.stickyHeader, isDarkMode && styles.stickyHeaderDark, { top: insets.top + 58 }]}
          activeOpacity={0.8}
          onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
        >
          {postAvatarUrl ? (
            <Image source={{ uri: postAvatarUrl }} style={styles.stickyAvatar} />
          ) : (
            <View style={styles.stickyAvatarPlaceholder}>
              <Text style={styles.stickyAvatarText}>
                {postAuthorName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <Text
            style={[styles.stickyHeaderText, isDarkMode && styles.textDark]}
            numberOfLines={1}
          >
            {post.content}
          </Text>
          <MaterialCommunityIcons
            name="chevron-up"
            size={18}
            color={isDarkMode ? '#94A3B8' : '#64748B'}
          />
        </TouchableOpacity>
      )}

      <ScrollView
        ref={scrollRef}
        style={styles.scrollContent}
        onScroll={(e) => {
          const y = e.nativeEvent.contentOffset.y;
          setShowStickyHeader(y > STICKY_HEADER_THRESHOLD);
        }}
        scrollEventThrottle={32}
        contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT + insets.bottom + 80 }}
      >
        {/* Post original */}
        {post && (
          <View style={[styles.postSection, isDarkMode && styles.postSectionDark]}>
            <View style={styles.authorHeader}>
              <TouchableOpacity onPress={() => setProfileSheetUserId(post.author_id)}>
                {postAvatarUrl ? (
                  <Image source={{ uri: postAvatarUrl }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <Text style={styles.avatarText}>
                      {postAuthorName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              <View style={styles.authorMeta}>
                <Text style={[styles.authorName, isDarkMode && styles.textDark]}>
                  {postAuthorName}
                </Text>
                <Text style={styles.dateText}>{formatDate(post.created_at)}</Text>
              </View>
            </View>

            {hasBgColor ? (
              <View style={[styles.bgColorBox, { backgroundColor: post.bg_color! }]}>
                <Text style={styles.bgColorText}>{post.content}</Text>
              </View>
            ) : (
              <RichText
                style={[styles.postContent, isDarkMode && styles.textDark]}
                content={post.content}
              />
            )}

            {post.media_urls && post.media_urls.length > 0 && (
              <View style={styles.mediaContainer}>
                {post.media_urls.map((url, idx) => (
                  <TouchableOpacity
                    key={idx}
                    activeOpacity={0.9}
                    onPress={() => {
                      setSelectedImageUrl(url);
                      setImageViewerVisible(true);
                    }}
                  >
                    <Image
                      source={{ uri: url }}
                      style={styles.postImage}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {post.poll_options && post.poll_options.length > 0 && (
              <PollBlock
                options={post.poll_options}
                totalVotes={post.poll_total_votes ?? 0}
                votedOptionId={post.poll_voted_option_id}
                isDarkMode={isDarkMode}
                onVote={handleVotePoll}
              />
            )}
          </View>
        )}

        {/* Barre d'interaction du post original : Like + Compteurs */}
        {post && (
          <View style={[styles.postInteractionBar, isDarkMode && styles.postInteractionBarDark]}>
            <TouchableOpacity style={styles.postStatItem} onPress={handleToggleLike}>
              <MaterialCommunityIcons
                name={post.liked_by_me ? 'heart' : 'heart-outline'}
                size={18}
                color={post.liked_by_me ? '#EF4444' : '#64748B'}
              />
              <Text style={[styles.postStatText, post.liked_by_me && { color: '#EF4444' }]}>
                {post.likes_count || 0}
              </Text>
            </TouchableOpacity>
            <View style={styles.postStatItem}>
              <MaterialCommunityIcons name="comment-text-multiple-outline" size={18} color="#64748B" />
              <Text style={styles.postStatText}>
                {totalCommentCount} réponse{totalCommentCount > 1 ? 's' : ''}
              </Text>
            </View>
            <View style={styles.postStatItem}>
              <MaterialCommunityIcons name="arrow-up-bold-circle-outline" size={18} color="#059669" />
              <Text style={styles.postStatText}>
                {comments.reduce((sum, c) => sum + c.score, 0)} votes
              </Text>
            </View>
          </View>
        )}

        {/* Section Commentaires */}
        <View style={styles.commentsHeader}>
          <Text style={[styles.commentsTitle, isDarkMode && styles.textDark]}>
            Réponses & Explications ({totalCommentCount})
          </Text>
          <Text style={styles.commentsSubtitle}>
            Triées par pertinence & votes des étudiants
          </Text>
        </View>

        {comments.map((comment) => renderComment(comment))}

        {/* État vide : aucun commentaire */}
        {comments.length === 0 && (
          <View style={styles.emptyCommentsContainer}>
            <MaterialCommunityIcons name="comment-question-outline" size={48} color="#CBD5E1" />
            <Text style={styles.emptyCommentsTitle}>Aucune réponse pour le moment</Text>
            <Text style={styles.emptyCommentsSubtitle}>
              Soyez le premier à répondre et aider vos camarades !
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Bandeau "réponse à ..." */}
      {replyingTo && (
        <View style={[styles.replyingBanner, isDarkMode && styles.replyingBannerDark]}>
          <Text style={styles.replyingBannerText}>
            Réponse à {replyingTo.authorName}
          </Text>
          <TouchableOpacity onPress={() => setReplyingTo(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialCommunityIcons name="close" size={16} color="#64748B" />
          </TouchableOpacity>
        </View>
      )}

      {/* Barre de Saisie du Commentaire */}
      <View
        style={[
          styles.inputBar,
          isDarkMode && styles.inputBarDark,
          { paddingBottom: 12 + insets.bottom + TAB_BAR_HEIGHT },
        ]}
      >
        {authUser?.image?.url ? (
          <Image source={{ uri: authUser.image.url }} style={styles.inputAvatarImage} />
        ) : (
          <View style={styles.inputAvatarPlaceholder}>
            <Text style={styles.inputAvatarText}>
              {(authUser?.firstname?.charAt(0) || '?').toUpperCase()}
            </Text>
          </View>
        )}
        <TextInput
          ref={inputRef}
          placeholder={
            replyingTo ? `Répondre à ${replyingTo.authorName}...` : 'Proposer votre explication ou réponse...'
          }
          placeholderTextColor="#94A3B8"
          value={newCommentText}
          onChangeText={setNewCommentText}
          style={[styles.commentInput, isDarkMode && styles.commentInputDark]}
          multiline
        />
        <TouchableOpacity
          onPress={handleSendComment}
          disabled={submittingComment || !newCommentText.trim()}
          style={[
            styles.sendBtn,
            (!newCommentText.trim() || submittingComment) && styles.sendBtnDisabled,
          ]}
        >
          {submittingComment ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <MaterialCommunityIcons name="send" size={20} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>

      {/* Modal de zoom/visualisation d'image */}
      <ImageViewerModal
        visible={imageViewerVisible}
        imageUrl={selectedImageUrl}
        onClose={() => setImageViewerVisible(false)}
      />

      {/* Profil public au clic sur un avatar */}
      <UserProfileBottomSheet
        visible={!!profileSheetUserId}
        userId={profileSheetUserId}
        onClose={() => setProfileSheetUserId(null)}
        isDarkMode={isDarkMode}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  containerDark: {
    backgroundColor: theme.color.dark.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  topHeaderDark: {
    backgroundColor: theme.color.dark.background.secondary,
    borderBottomColor: theme.color.dark.border,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  backButtonDark: {
    backgroundColor: '#374151',
  },
  topHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  scrollContent: {
    flex: 1,
  },
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  stickyHeaderDark: {
    backgroundColor: '#1E293B',
    borderBottomColor: '#334155',
  },
  stickyAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  stickyAvatarPlaceholder: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: theme.color.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  stickyAvatarText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  stickyHeaderText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  postSection: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  postSectionDark: {
    backgroundColor: '#1E293B',
    borderBottomColor: '#334155',
  },
  authorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
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
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  authorMeta: {
    marginLeft: 12,
  },
  authorName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  dateText: {
    fontSize: 12,
    color: '#64748B',
  },
  postContent: {
    fontSize: 16,
    lineHeight: 24,
    color: '#1E293B',
    marginBottom: 12,
  },
  textDark: {
    color: '#F8FAFC',
  },
  subTextDark: {
    color: '#CBD5E1',
  },
  bgColorBox: {
    borderRadius: theme.border.radius.medium,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 180,
    marginBottom: 12,
  },
  bgColorText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 30,
  },
  mediaContainer: {
    gap: 10,
    marginTop: 8,
  },
  postImage: {
    width: '100%',
    height: 240,
    borderRadius: theme.border.radius.medium,
  },
  commentsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  commentsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  commentsSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  commentCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderRadius: theme.border.radius.medium,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  commentCardDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  replyCard: {
    marginLeft: 32,
    marginRight: 16,
    borderLeftWidth: 2,
    borderLeftColor: theme.color.primary[200],
  },
  repliesContainer: {
    marginTop: -4,
  },
  topAnswerCard: {
    borderColor: '#A7F3D0',
    backgroundColor: '#F0FDF4',
  },
  topAnswerCardDark: {
    borderColor: '#065F46',
    backgroundColor: '#052e22',
  },
  topAnswerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.border.radius.small,
    alignSelf: 'flex-start',
    marginBottom: 10,
    gap: 4,
  },
  topAnswerBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
  },
  commentInnerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  commentMain: {
    flex: 1,
    paddingRight: 10,
  },
  commentAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  commentAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentAvatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  commentMetaCol: {
    marginLeft: 10,
  },
  commentAuthorName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  commentDate: {
    fontSize: 11,
    color: '#94A3B8',
  },
  commentText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#334155',
  },
  replyLink: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.color.primary[500],
    marginTop: 6,
  },
  voteContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: theme.border.radius.small,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignSelf: 'flex-start',
  },
  voteContainerDark: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
  },
  voteBtn: {
    padding: 4,
    borderRadius: theme.border.radius.small,
  },
  voteBtnUpActive: {
    backgroundColor: '#ECFDF5',
  },
  voteBtnDownActive: {
    backgroundColor: '#FEF2F2',
  },
  scoreText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    marginVertical: 2,
  },
  scoreActiveUp: {
    color: '#059669',
  },
  scoreActiveDown: {
    color: '#EF4444',
  },
  replyingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  replyingBannerDark: {
    backgroundColor: '#1E293B',
  },
  replyingBannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 10,
  },
  inputBarDark: {
    backgroundColor: '#1E293B',
    borderTopColor: '#334155',
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: theme.border.radius.small,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 40,
    maxHeight: 130,
    color: '#0F172A',
  },
  commentInputDark: {
    backgroundColor: '#0F172A',
    color: '#F8FAFC',
  },
  sendBtn: {
    backgroundColor: theme.color.primary[500],
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  postInteractionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 24,
  },
  postInteractionBarDark: {
    backgroundColor: '#1E293B',
    borderBottomColor: '#334155',
  },
  postStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  postStatText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  emptyCommentsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 32,
  },
  emptyCommentsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#94A3B8',
    marginTop: 12,
  },
  emptyCommentsSubtitle: {
    fontSize: 13,
    color: '#CBD5E1',
    textAlign: 'center',
    marginTop: 4,
  },
  inputAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputAvatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  inputAvatarText: {
    fontSize: 18,
  },
});

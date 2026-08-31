// app/(app)/post/[id].tsx
import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';
import {
  getPostComments,
  addComment,
  voteOnComment,
  PostComment,
  FeedPost,
} from '@/services/feed.service';
import { supabase } from '@/lib/supabase';
import { ImageViewerModal } from '@/components/shared/feed/ImageViewerModal';

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [post, setPost] = useState<FeedPost | null>(null);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCommentText, setNewCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [imageViewerVisible, setImageViewerVisible] = useState<boolean>(false);

  useEffect(() => {
    fetchInitialData();
  }, [id]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      // Récupérer l'utilisateur connecté
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id || '';
      setCurrentUserId(userId);

      if (!id) return;

      // Récupérer les détails du post
      const { data: postData } = await (supabase as any)
        .from('feed_posts')
        .select(`
          *,
          author:users(id, full_name, avatar_url)
        `)
        .eq('id', id)
        .single();

      if (postData) {
        setPost(postData as FeedPost);
      }

      // Récupérer les commentaires
      const commentList = await getPostComments(id, userId);
      setComments(commentList);
    } catch (err) {
      Alert.alert('Erreur', 'Impossible de charger la publication.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendComment = async () => {
    if (!newCommentText.trim() || !id || !currentUserId) return;

    setSubmittingComment(true);
    try {
      const added = await addComment(id, newCommentText.trim(), currentUserId);
      if (added) {
        setNewCommentText('');
        setComments((prev) => [added, ...prev]);
      } else {
        Alert.alert('Erreur', "Impossible d'ajouter le commentaire.");
      }
    } catch (err) {
      Alert.alert('Erreur', 'Une erreur est survenue.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleVote = async (commentId: string, delta: 1 | -1) => {
    if (!currentUserId) return;

    // Mise à jour optimiste dans l'UI + re-tri par score décroissant
    setComments((prev) => {
      const updated = prev.map((c) => {
        if (c.id !== commentId) return c;

        const currentVote = c.user_vote || 0;
        let newVote: -1 | 0 | 1 = 0;
        let scoreDiff = 0;

        if (currentVote === delta) {
          // Annuler le vote
          newVote = 0;
          scoreDiff = -delta;
        } else if (currentVote === 0) {
          // Nouveau vote
          newVote = delta;
          scoreDiff = delta;
        } else {
          // Inverser le vote
          newVote = delta;
          scoreDiff = delta * 2;
        }

        return {
          ...c,
          user_vote: newVote,
          score: c.score + scoreDiff,
        };
      });

      // Re-tri : meilleure réponse en premier (cahier des charges)
      return updated.sort((a, b) => b.score - a.score);
    });

    // Envoi à Supabase
    await voteOnComment(commentId, currentUserId, delta);
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.color.primary[500]} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <Stack.Screen
        options={{
          headerTitle: 'Publication',
          headerBackTitle: 'Retour',
        }}
      />

      <ScrollView style={styles.scrollContent}>
        {/* Post original */}
        {post && (
          <View style={styles.postSection}>
            <View style={styles.authorHeader}>
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>
                  {(post.author?.full_name || 'E').charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.authorMeta}>
                <Text style={styles.authorName}>
                  {post.author?.full_name || 'Élève'}
                </Text>
                <Text style={styles.dateText}>{formatDate(post.created_at)}</Text>
              </View>
            </View>

            <Text style={styles.postContent}>{post.content}</Text>

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
          </View>
        )}

        {/* Barre d'interaction du post original : Vote + Compteurs */}
        {post && (
          <View style={styles.postInteractionBar}>
            <View style={styles.postStatItem}>
              <MaterialCommunityIcons name="comment-text-multiple-outline" size={18} color="#64748B" />
              <Text style={styles.postStatText}>
                {comments.length} réponse{comments.length > 1 ? 's' : ''}
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
          <Text style={styles.commentsTitle}>
            Réponses & Explications ({comments.length})
          </Text>
          <Text style={styles.commentsSubtitle}>
            Triées par pertinence & votes des étudiants
          </Text>
        </View>

        {comments.map((comment, index) => {
          const isTopAnswer = index === 0 && comment.score > 0;

          return (
            <View
              key={comment.id}
              style={[
                styles.commentCard,
                isTopAnswer && styles.topAnswerCard,
              ]}
            >
              {/* Badge Meilleure Réponse / Approuvée si premier du classement */}
              {isTopAnswer && (
                <View style={styles.topAnswerBadge}>
                  <MaterialCommunityIcons name="check-decagram" size={14} color="#059669" />
                  <Text style={styles.topAnswerBadgeText}>Meilleure réponse approuvée</Text>
                </View>
              )}

              <View style={styles.commentInnerRow}>
                <View style={styles.commentMain}>
                  <View style={styles.commentAuthorRow}>
                    <View style={styles.commentAvatarPlaceholder}>
                      <Text style={styles.commentAvatarText}>
                        {(comment.author?.full_name || 'E').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.commentMetaCol}>
                      <Text style={styles.commentAuthorName}>
                        {comment.author?.full_name || 'Élève'}
                      </Text>
                      <Text style={styles.commentDate}>
                        {formatDate(comment.created_at)}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.commentText}>{comment.content}</Text>
                </View>

                {/* Système de Vote Interactif (+1 / -1) */}
                <View style={styles.voteContainer}>
                  <TouchableOpacity
                    onPress={() => handleVote(comment.id, 1)}
                    style={[
                      styles.voteBtn,
                      comment.user_vote === 1 && styles.voteBtnUpActive,
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="arrow-up-bold"
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
                    style={[
                      styles.voteBtn,
                      comment.user_vote === -1 && styles.voteBtnDownActive,
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="arrow-down-bold"
                      size={20}
                      color={comment.user_vote === -1 ? '#EF4444' : '#94A3B8'}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })}

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

      {/* Barre de Saisie du Commentaire avec avatar */}
      <View style={styles.inputBar}>
        <View style={styles.inputAvatarPlaceholder}>
          <Text style={styles.inputAvatarText}>👤</Text>
        </View>
        <TextInput
          placeholder="Proposer votre explication ou réponse..."
          placeholderTextColor="#94A3B8"
          value={newCommentText}
          onChangeText={setNewCommentText}
          style={styles.commentInput}
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flex: 1,
  },
  postSection: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
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
  mediaContainer: {
    gap: 10,
    marginTop: 8,
  },
  postImage: {
    width: '100%',
    height: 240,
    borderRadius: 12,
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
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  topAnswerCard: {
    borderColor: '#A7F3D0',
    backgroundColor: '#F0FDF4',
  },
  topAnswerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
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
  voteContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignSelf: 'flex-start',
  },
  voteBtn: {
    padding: 4,
    borderRadius: 8,
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
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 10,
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 100,
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
  inputAvatarText: {
    fontSize: 18,
  },
});

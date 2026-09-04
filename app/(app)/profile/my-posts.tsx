// app/(app)/profile/my-posts.tsx
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { theme } from '@/constants/theme';
import { useAuth } from '@/contexts/auth';
import { getUserPosts, deleteFeedPost, toggleLikePost, votePollOption, FeedPost } from '@/services/feed.service';
import { PostCard } from '@/components/shared/feed/PostCard';
import { ImageViewerModal } from '@/components/shared/feed/ImageViewerModal';
import { UserProfileBottomSheet } from '@/components/shared/feed/UserProfileBottomSheet';
import { ConfirmDeleteBottomSheet } from '@/components/shared/feed/ConfirmDeleteBottomSheet';

export default function MyPostsScreen() {
  const { user: authUser } = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'recent' | 'popular'>('recent');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [profileSheetUserId, setProfileSheetUserId] = useState<string | null>(null);
  const [postPendingDelete, setPostPendingDelete] = useState<FeedPost | null>(null);
  const [deletingPost, setDeletingPost] = useState<boolean>(false);

  const loadPosts = useCallback(() => {
    if (!authUser?.authId) return;
    getUserPosts(authUser.authId).then((data) => {
      setPosts(data);
      setLoading(false);
    });
  }, [authUser?.authId]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  useFocusEffect(loadPosts);

  const handleDeletePost = (post: FeedPost) => {
    setPostPendingDelete(post);
  };

  const confirmDeletePost = async () => {
    if (!postPendingDelete) return;
    setDeletingPost(true);
    const success = await deleteFeedPost(postPendingDelete.id);
    if (success) {
      setPosts((prev) => prev.filter((p) => p.id !== postPendingDelete.id));
    }
    setDeletingPost(false);
    setPostPendingDelete(null);
  };

  const handleToggleLike = async (post: FeedPost) => {
    if (!authUser?.authId) return;
    const wasLiked = !!post.liked_by_me;
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? { ...p, liked_by_me: !wasLiked, likes_count: (p.likes_count || 0) + (wasLiked ? -1 : 1) }
          : p
      )
    );
    await toggleLikePost(post.id, authUser.authId, wasLiked);
  };

  const handleVotePoll = async (post: FeedPost, optionId: string) => {
    if (!authUser?.authId || post.poll_voted_option_id) return;
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? {
              ...p,
              poll_voted_option_id: optionId,
              poll_total_votes: (p.poll_total_votes ?? 0) + 1,
              poll_options: p.poll_options?.map((o) =>
                o.id === optionId ? { ...o, votes_count: o.votes_count + 1 } : o
              ),
            }
          : p
      )
    );
    await votePollOption(post.id, optionId, authUser.authId);
  };

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <Stack.Screen options={{ headerTitle: 'Mes posts', headerBackTitle: 'Retour' }} />

      <View style={[styles.topHeader, isDarkMode && styles.topHeaderDark]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, isDarkMode && styles.backButtonDark]}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={isDarkMode ? '#F9FAFB' : '#111827'} />
        </TouchableOpacity>
        <Text style={[styles.topHeaderTitle, isDarkMode && styles.textDark]}>Mes posts</Text>
      </View>

      <View style={styles.sortRow}>
        <TouchableOpacity
          style={[styles.sortTag, sortBy === 'recent' && styles.sortTagActive]}
          onPress={() => setSortBy('recent')}
        >
          <Text style={[styles.sortTagText, sortBy === 'recent' && styles.sortTagTextActive]}>Récent</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sortTag, sortBy === 'popular' && styles.sortTagActive]}
          onPress={() => setSortBy('popular')}
        >
          <Text style={[styles.sortTagText, sortBy === 'popular' && styles.sortTagTextActive]}>Populaire</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={theme.color.primary[500]} />
          </View>
        ) : posts.length > 0 ? (
          [...posts]
            .sort((a, b) =>
              sortBy === 'popular'
                ? ((b.likes_count || 0) + (b.comments_count || 0)) - ((a.likes_count || 0) + (a.comments_count || 0))
                : new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )
            .map((post) => (
            <PostCard
              key={post.id}
              post={post}
              isDarkMode={isDarkMode}
              currentUserId={authUser?.authId}
              onPressPost={(p) => router.push(`/post/${p.id}`)}
              onPressDelete={handleDeletePost}
              onPressImage={(images, index) => {
                setSelectedImages(images);
                setSelectedImageIndex(index);
                setImageViewerVisible(true);
              }}
              onPressAuthor={(authorId) => setProfileSheetUserId(authorId)}
              onToggleLike={handleToggleLike}
              onVotePoll={handleVotePoll}
            />
          ))
        ) : (
          <View style={styles.emptyBox}>
            <MaterialCommunityIcons name="forum-outline" size={56} color="#CBD5E1" />
            <Text style={[styles.emptyTitle, isDarkMode && styles.textDark]}>
              Aucun post pour l'instant
            </Text>
            <Text style={styles.emptySubtitle}>
              Tes questions et exercices partagés apparaîtront ici.
            </Text>
          </View>
        )}
      </ScrollView>

      <ImageViewerModal
        visible={imageViewerVisible}
        images={selectedImages}
        initialIndex={selectedImageIndex}
        onClose={() => setImageViewerVisible(false)}
      />
      <UserProfileBottomSheet
        visible={!!profileSheetUserId}
        userId={profileSheetUserId}
        onClose={() => setProfileSheetUserId(null)}
        isDarkMode={isDarkMode}
      />

      <ConfirmDeleteBottomSheet
        visible={!!postPendingDelete}
        loading={deletingPost}
        onCancel={() => setPostPendingDelete(null)}
        onConfirm={confirmDeletePost}
        isDarkMode={isDarkMode}
      />
    </View>
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
  content: {
    padding: 16,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingTop: 12,
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
  sortRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  sortTag: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: theme.border.radius.small,
    backgroundColor: '#F1F5F9',
  },
  sortTagActive: {
    backgroundColor: theme.color.primary[500],
  },
  sortTagText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  sortTagTextActive: {
    color: '#FFFFFF',
  },
  loadingBox: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#94A3B8',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#CBD5E1',
    textAlign: 'center',
    marginTop: 4,
  },
  textDark: {
    color: '#F8FAFC',
  },
});

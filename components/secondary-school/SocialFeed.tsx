import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';
import { useColorScheme } from '@/hooks/useColorScheme';
import { SSPostWithAuthor, PostType } from '@/types/secondary-school';

// Mock data for now - will be replaced with real API calls
const mockPosts: SSPostWithAuthor[] = [
  {
    id: '1',
    author_id: 'user1',
    post_type: 'question',
    title: 'Aide en mathématiques',
    content: 'Bonjour, j\'ai du mal à comprendre les équations du second degré. Quelqu\'un peut-il m\'expliquer la méthode du discriminant ?',
    subject: 'Mathématiques',
    class_level: '1ère C',
    difficulty_level: 'medium',
    tags: ['algèbre', 'équations'],
    likes_count: 12,
    comments_count: 8,
    shares_count: 3,
    views_count: 45,
    is_validated: false,
    is_pinned: false,
    is_hidden: false,
    moderation_status: 'approved',
    created_at: new Date('2024-01-15T10:30:00Z'),
    updated_at: new Date('2024-01-15T10:30:00Z'),
    author: {
      id: 'user1',
      account_id: 'acc1',
      user_type: 'student',
      class_level: '1ère C',
      school_name: 'Lycée de Yaoundé',
      school_region: 'Centre',
      xp_points: 150,
      level: 2,
      streak_days: 5,
      last_activity_date: new Date(),
      is_verified: false,
      parental_control_enabled: false,
      content_filter_level: 'moderate',
      created_at: new Date(),
      updated_at: new Date(),
    }
  },
  {
    id: '2',
    author_id: 'user2',
    post_type: 'visual_tip',
    title: 'Schéma de la photosynthèse',
    content: 'Voici un schéma simple pour comprendre la photosynthèse. J\'espère que ça aidera !',
    subject: 'SVT',
    class_level: '3ème',
    difficulty_level: 'easy',
    tags: ['photosynthèse', 'biologie'],
    likes_count: 28,
    comments_count: 15,
    shares_count: 12,
    views_count: 120,
    is_validated: true,
    is_pinned: false,
    is_hidden: false,
    moderation_status: 'approved',
    created_at: new Date('2024-01-15T08:15:00Z'),
    updated_at: new Date('2024-01-15T08:15:00Z'),
    author: {
      id: 'user2',
      account_id: 'acc2',
      user_type: 'teacher',
      subjects: ['SVT', 'Chimie'],
      years_experience: 8,
      establishment: 'Collège de Douala',
      xp_points: 850,
      level: 8,
      streak_days: 12,
      last_activity_date: new Date(),
      is_verified: true,
      parental_control_enabled: false,
      content_filter_level: 'light',
      created_at: new Date(),
      updated_at: new Date(),
    }
  }
];

const POST_TYPE_CONFIGS: Record<PostType, { icon: string; color: string; label: string }> = {
  question: { icon: 'help-circle', color: '#3B82F6', label: 'Question' },
  answer: { icon: 'check-circle', color: '#10B981', label: 'Réponse' },
  visual_tip: { icon: 'image', color: '#F59E0B', label: 'Astuce visuelle' },
  summary: { icon: 'file-document', color: '#8B5CF6', label: 'Résumé' },
  video: { icon: 'play-box', color: '#EF4444', label: 'Vidéo' },
  challenge: { icon: 'trophy', color: '#F97316', label: 'Défi' },
  discussion: { icon: 'chat-outline', color: '#06B6D4', label: 'Discussion' },
  announcement: { icon: 'bullhorn', color: '#DC2626', label: 'Annonce' },
};

interface PostCardProps {
  post: SSPostWithAuthor;
  isDarkMode: boolean;
  onLike: (postId: string) => void;
  onComment: (postId: string) => void;
  onShare: (postId: string) => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, isDarkMode, onLike, onComment, onShare }) => {
  const config = POST_TYPE_CONFIGS[post.post_type];
  
  return (
    <View style={[styles.postCard, isDarkMode && styles.postCardDark]}>
      {/* Header */}
      <View style={styles.postHeader}>
        <View style={styles.authorInfo}>
          <View style={[styles.avatar, { backgroundColor: config.color }]}>
            <Text style={styles.avatarText}>
              {post.author.user_type === 'teacher' ? '👨‍🏫' : '👤'}
            </Text>
          </View>
          <View style={styles.authorDetails}>
            <View style={styles.authorNameRow}>
              <Text style={[styles.authorName, isDarkMode && styles.authorNameDark]}>
                {post.author.user_type === 'teacher' ? 'Enseignant' : 'Élève'}
              </Text>
              {post.author.is_verified && (
                <MaterialCommunityIcons name="check-decagram" size={16} color={theme.color.primary[500]} />
              )}
            </View>
            <Text style={[styles.classInfo, isDarkMode && styles.classInfoDark]}>
              {post.class_level} • {post.subject}
            </Text>
          </View>
        </View>
        
        <View style={[styles.postTypeBadge, { backgroundColor: `${config.color}20` }]}>
          <MaterialCommunityIcons name={config.icon as any} size={16} color={config.color} />
          <Text style={[styles.postTypeText, { color: config.color }]}>
            {config.label}
          </Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.postContent}>
        {post.title && (
          <Text style={[styles.postTitle, isDarkMode && styles.postTitleDark]}>
            {post.title}
          </Text>
        )}
        <Text style={[styles.postText, isDarkMode && styles.postTextDark]}>
          {post.content}
        </Text>
        
        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {post.tags.map((tag, index) => (
              <View key={index} style={[styles.tag, isDarkMode && styles.tagDark]}>
                <Text style={[styles.tagText, isDarkMode && styles.tagTextDark]}>
                  #{tag}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={styles.postActions}>
        <TouchableOpacity style={styles.actionButton} onPress={() => onLike(post.id)}>
          <MaterialCommunityIcons name="heart-outline" size={20} color="#666" />
          <Text style={[styles.actionText, isDarkMode && styles.actionTextDark]}>
            {post.likes_count}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton} onPress={() => onComment(post.id)}>
          <MaterialCommunityIcons name="comment-outline" size={20} color="#666" />
          <Text style={[styles.actionText, isDarkMode && styles.actionTextDark]}>
            {post.comments_count}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton} onPress={() => onShare(post.id)}>
          <MaterialCommunityIcons name="share-outline" size={20} color="#666" />
          <Text style={[styles.actionText, isDarkMode && styles.actionTextDark]}>
            {post.shares_count}
          </Text>
        </TouchableOpacity>
        
        <View style={styles.viewsContainer}>
          <MaterialCommunityIcons name="eye-outline" size={16} color="#999" />
          <Text style={styles.viewsText}>{post.views_count}</Text>
        </View>
      </View>
    </View>
  );
};

export default function SocialFeed() {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme !== 'light';
  const [posts, setPosts] = useState<SSPostWithAuthor[]>(mockPosts);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Simulate API call
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  const handleLike = (postId: string) => {
    setPosts(currentPosts => 
      currentPosts.map(post => 
        post.id === postId 
          ? { ...post, likes_count: post.likes_count + 1 }
          : post
      )
    );
  };

  const handleComment = (postId: string) => {
    Alert.alert('Commentaires', 'Fonctionnalité en développement');
  };

  const handleShare = (postId: string) => {
    Alert.alert('Partager', 'Fonctionnalité en développement');
  };

  const handleCreatePost = () => {
    Alert.alert('Créer une publication', 'Fonctionnalité en développement');
  };

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
      {/* Header */}
      <View style={[styles.header, isDarkMode && styles.headerDark]}>
        <Text style={[styles.title, isDarkMode && styles.titleDark]}>
          Fil d'actualité
        </Text>
        <TouchableOpacity style={styles.createButton} onPress={handleCreatePost}>
          <MaterialCommunityIcons name="plus" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Feed */}
      <ScrollView
        style={styles.feed}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            isDarkMode={isDarkMode}
            onLike={handleLike}
            onComment={handleComment}
            onShare={handleShare}
          />
        ))}
        
        {/* Load more placeholder */}
        <View style={styles.loadMoreContainer}>
          <TouchableOpacity style={[styles.loadMoreButton, isDarkMode && styles.loadMoreButtonDark]}>
            <Text style={[styles.loadMoreText, isDarkMode && styles.loadMoreTextDark]}>
              Charger plus de publications
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.color.light.background.primary,
  },
  containerDark: {
    backgroundColor: theme.color.dark.background.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: theme.color.light.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: '#E1E1E1',
  },
  headerDark: {
    backgroundColor: theme.color.dark.background.primary,
    borderBottomColor: theme.color.gray[800],
  },
  title: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  titleDark: {
    color: theme.color.gray[50],
  },
  createButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.color.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  feed: {
    flex: 1,
  },
  postCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: theme.border.radius.medium,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E1E1E1',
  },
  postCardDark: {
    backgroundColor: theme.color.dark.background.secondary,
    borderColor: theme.color.gray[800],
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
  },
  authorDetails: {
    flex: 1,
  },
  authorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  authorName: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginRight: 4,
  },
  authorNameDark: {
    color: theme.color.gray[50],
  },
  classInfo: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 12,
    color: '#666666',
  },
  classInfoDark: {
    color: theme.color.gray[400],
  },
  postTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  postTypeText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 11,
    fontWeight: '500',
    marginLeft: 4,
  },
  postContent: {
    marginBottom: 12,
  },
  postTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  postTitleDark: {
    color: theme.color.gray[50],
  },
  postText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    color: '#333333',
    lineHeight: 20,
  },
  postTextDark: {
    color: theme.color.gray[300],
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  tag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 4,
  },
  tagDark: {
    backgroundColor: theme.color.gray[800],
  },
  tagText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 11,
    color: '#666666',
  },
  tagTextDark: {
    color: theme.color.gray[400],
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E1E1E1',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  actionText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 13,
    color: '#666666',
    marginLeft: 4,
  },
  actionTextDark: {
    color: theme.color.gray[400],
  },
  viewsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  viewsText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 12,
    color: '#999999',
    marginLeft: 4,
  },
  loadMoreContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadMoreButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: theme.border.radius.medium,
    borderWidth: 1,
    borderColor: '#E1E1E1',
  },
  loadMoreButtonDark: {
    borderColor: theme.color.gray[800],
  },
  loadMoreText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    color: '#666666',
  },
  loadMoreTextDark: {
    color: theme.color.gray[400],
  },
});
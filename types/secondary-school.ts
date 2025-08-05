// Secondary School Database Types
// Auto-generated from sschool PostgreSQL schema

export type Json = any;

// Enums
export type UserType = 'student' | 'teacher' | 'parent';

export type PostType = 
  | 'question'
  | 'answer'
  | 'visual_tip'
  | 'summary'
  | 'video'
  | 'challenge'
  | 'discussion'
  | 'announcement';

export type DifficultyLevel = 'easy' | 'medium' | 'hard';
export type ModerationStatus = 'pending' | 'approved' | 'rejected';
export type ContentFilterLevel = 'strict' | 'moderate' | 'light';
export type InteractionType = 'like' | 'share' | 'report';
export type TargetType = 'post' | 'comment';
export type GroupType = 'class' | 'subject' | 'school' | 'region' | 'custom';
export type MaterialType = 'summary' | 'video' | 'exercise' | 'exam_paper' | 'course_note';
export type GroupRole = 'admin' | 'moderator' | 'member';
export type GroupPostType = 'message' | 'question' | 'announcement' | 'media' | 'file';

// Table Interfaces
export interface SSUser {
  id: string;
  account_id: string;
  user_type: UserType;
  
  // Student-specific fields
  class_level?: string;
  school_name?: string;
  school_region?: string;
  academic_year?: string;
  
  // Teacher-specific fields
  subjects?: string[];
  years_experience?: number;
  establishment?: string;
  
  // Parent-specific fields
  children_ids?: string[];
  
  // Gamification
  xp_points: number;
  level: number;
  streak_days: number;
  last_activity_date: Date;
  
  // Privacy and moderation
  is_verified: boolean;
  parental_control_enabled: boolean;
  content_filter_level: ContentFilterLevel;
  
  created_at: Date;
  updated_at: Date;
}

export interface SSBadge {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  category?: string;
  requirement_type?: string;
  requirement_value?: number;
  xp_reward: number;
  is_active: boolean;
  created_at: Date;
}

export interface SSUserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: Date;
}

export interface SSPost {
  id: string;
  author_id: string;
  post_type: PostType;
  
  // Content
  title?: string;
  content?: string;
  media_urls?: string[];
  attachments?: Json;
  
  // Academic context
  subject?: string;
  class_level?: string;
  difficulty_level?: DifficultyLevel;
  tags?: string[];
  
  // Interaction counters
  likes_count: number;
  comments_count: number;
  shares_count: number;
  views_count: number;
  
  // Status and moderation
  is_validated: boolean;
  is_pinned: boolean;
  is_hidden: boolean;
  moderation_status: ModerationStatus;
  
  // References
  parent_post_id?: string;
  
  created_at: Date;
  updated_at: Date;
}

export interface SSComment {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  parent_comment_id?: string;
  likes_count: number;
  is_hidden: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface SSInteraction {
  id: string;
  user_id: string;
  target_type: TargetType;
  target_id: string;
  interaction_type: InteractionType;
  share_context?: string;
  share_message?: string;
  created_at: Date;
}

export interface SSGroup {
  id: string;
  name: string;
  description?: string;
  group_type: GroupType;
  
  // Group context
  class_level?: string;
  subject?: string;
  school_name?: string;
  region?: string;
  
  // Settings
  is_public: boolean;
  is_auto_join: boolean;
  max_members: number;
  
  // Media
  avatar_url?: string;
  cover_url?: string;
  
  // Stats
  members_count: number;
  posts_count: number;
  
  created_by?: string;
  created_at: Date;
  updated_at: Date;
}

export interface SSGroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: GroupRole;
  joined_at: Date;
}

export interface SSGroupPost {
  id: string;
  group_id: string;
  author_id: string;
  content: string;
  media_urls?: string[];
  attachments?: Json;
  post_type: GroupPostType;
  reactions?: Json;
  is_pinned: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface SSStudyMaterial {
  id: string;
  title: string;
  description?: string;
  material_type: MaterialType;
  
  // Academic context
  subject: string;
  class_level: string;
  chapter?: string;
  topic?: string;
  
  // Content
  content_url?: string;
  content_text?: string;
  duration_minutes?: number;
  
  // Metadata
  author_id?: string;
  is_free: boolean;
  price_fcfa: number;
  difficulty_level?: DifficultyLevel;
  
  // Stats
  views_count: number;
  downloads_count: number;
  rating_average: number;
  rating_count: number;
  
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface SSChallenge {
  id: string;
  title: string;
  description?: string;
  subject: string;
  class_level: string;
  
  // Challenge content
  questions: Json;
  total_questions: number;
  time_limit_minutes: number;
  
  // Rewards
  xp_reward: number;
  badge_reward_id?: string;
  
  // Schedule
  start_date: Date;
  end_date: Date;
  
  // Stats
  participants_count: number;
  completion_rate: number;
  
  is_active: boolean;
  created_by?: string;
  created_at: Date;
}

export interface SSChallengeAttempt {
  id: string;
  challenge_id: string;
  user_id: string;
  
  // Attempt data
  answers: Json;
  score: number;
  max_score: number;
  percentage: number;
  time_taken_seconds?: number;
  
  // Results
  is_completed: boolean;
  xp_earned: number;
  badge_earned_id?: string;
  
  attempted_at: Date;
}

// Input types for creating records
export interface SSUserInput {
  account_id: string;
  user_type: UserType;
  class_level?: string;
  school_name?: string;
  school_region?: string;
  academic_year?: string;
  subjects?: string[];
  years_experience?: number;
  establishment?: string;
  children_ids?: string[];
  parental_control_enabled?: boolean;
  content_filter_level?: ContentFilterLevel;
}

export interface SSPostInput {
  author_id: string;
  post_type: PostType;
  title?: string;
  content?: string;
  media_urls?: string[];
  attachments?: Json;
  subject?: string;
  class_level?: string;
  difficulty_level?: DifficultyLevel;
  tags?: string[];
  parent_post_id?: string;
}

export interface SSGroupInput {
  name: string;
  description?: string;
  group_type: GroupType;
  class_level?: string;
  subject?: string;
  school_name?: string;
  region?: string;
  is_public?: boolean;
  max_members?: number;
  created_by?: string;
}

export interface SSStudyMaterialInput {
  title: string;
  description?: string;
  material_type: MaterialType;
  subject: string;
  class_level: string;
  chapter?: string;
  topic?: string;
  content_url?: string;
  content_text?: string;
  duration_minutes?: number;
  author_id?: string;
  is_free?: boolean;
  price_fcfa?: number;
  difficulty_level?: DifficultyLevel;
}

// Extended types with relations
export interface SSPostWithAuthor extends SSPost {
  author: SSUser;
  comments?: SSComment[];
}

export interface SSCommentWithAuthor extends SSComment {
  author: SSUser;
}

export interface SSGroupWithMembers extends SSGroup {
  members?: SSGroupMember[];
  recent_posts?: SSGroupPost[];
}

export interface SSUserWithBadges extends SSUser {
  badges?: (SSUserBadge & { badge: SSBadge })[];
}

// API Response types
export interface FeedResponse {
  posts: SSPostWithAuthor[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    has_more: boolean;
  };
}

export interface GroupsResponse {
  groups: SSGroupWithMembers[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    has_more: boolean;
  };
}

export interface StudyMaterialsResponse {
  materials: SSStudyMaterial[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    has_more: boolean;
  };
}

// Utility types
export type ClassLevel = 
  | '3ème'
  | '2nde'
  | '1ère A'
  | '1ère C'
  | '1ère D'
  | 'Tle A'
  | 'Tle C'
  | 'Tle D';

export type Subject = 
  | 'Mathématiques'
  | 'Physique'
  | 'Chimie'
  | 'SVT'
  | 'Français'
  | 'Anglais'
  | 'Histoire'
  | 'Géographie'
  | 'Philosophie'
  | 'Économie'
  | 'Allemand'
  | 'Espagnol'
  | 'Informatique';

export type CamerounRegion = 
  | 'Adamaoua'
  | 'Centre'
  | 'Est'
  | 'Extrême-Nord'
  | 'Littoral'
  | 'Nord'
  | 'Nord-Ouest'
  | 'Ouest'
  | 'Sud'
  | 'Sud-Ouest';
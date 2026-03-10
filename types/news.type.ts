// Types pour le système d'actualités

export type NewsMediaType = 'image' | 'video' | 'none';
export type NewsStatus = 'draft' | 'scheduled' | 'published' | 'archived';
export type NewsActionType = 'none' | 'internal_page' | 'external_link' | 'detail_page' | 'deep_link';
export type NewsTargetAudience = 'all' | 'concours' | 'secondary' | 'specific';
export type NewsCardStyle = 'default' | 'minimal' | 'full' | 'banner';
export type NewsInteractionType = 'click' | 'share' | 'dismiss' | 'like' | 'bookmark';

export interface NewsActionData {
  route?: string;
  params?: Record<string, any>;
  url?: string;
  deepLink?: string;
  label?: string; // Texte du bouton d'action
}

export interface News {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  content?: string;
  
  // Média
  media_type: NewsMediaType;
  media_url?: string;
  thumbnail_url?: string;
  media_alt_text?: string;
  video_duration?: number;
  
  // Dates
  start_date: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
  published_at?: string;
  
  // Priorité et ordre
  priority: number;
  display_order: number;
  
  // Statut
  status: NewsStatus;
  
  // Action au clic
  action_type: NewsActionType;
  action_data?: NewsActionData;
  
  // Ciblage
  target_audience: NewsTargetAudience;
  target_programs?: string[];
  target_user_types?: string[];
  
  // Affichage
  is_featured: boolean;
  show_badge: boolean;
  badge_text?: string;
  badge_color?: string;
  
  // Style
  background_color?: string;
  text_color?: string;
  card_style: NewsCardStyle;
  
  // Métadonnées
  author_id?: string;
  category?: string;
  tags?: string[];
  
  // Statistiques
  view_count: number;
  click_count: number;
  share_count: number;
  
  // Options avancées
  require_authentication: boolean;
  show_for_new_users_only: boolean;
  max_display_count?: number;
  
  // Données utilisateur (retournées par la fonction get_active_news_for_user)
  has_viewed?: boolean;
  user_view_count?: number;
  has_clicked?: boolean;
}

export interface NewsView {
  id: string;
  news_id: string;
  user_id: string;
  viewed_at: string;
  session_id?: string;
  device_info?: Record<string, any>;
}

export interface NewsInteraction {
  id: string;
  news_id: string;
  user_id: string;
  interaction_type: NewsInteractionType;
  interacted_at: string;
  metadata?: Record<string, any>;
}

export interface NewsStatistics {
  news_id: string;
  title: string;
  total_views: number;
  total_clicks: number;
  total_shares: number;
  unique_viewers: number;
  unique_clickers: number;
  likes_count: number;
  bookmarks_count: number;
  click_rate_percentage: number;
  last_interaction_at?: string;
}

export interface GetActiveNewsParams {
  userId: string;
  userType?: 'all' | 'concours' | 'secondary';
  userPrograms?: string[];
  isNewUser?: boolean;
  limit?: number;
}

export interface RecordNewsViewParams {
  newsId: string;
  userId: string;
  sessionId?: string;
  deviceInfo?: Record<string, any>;
}

export interface RecordNewsInteractionParams {
  newsId: string;
  userId: string;
  interactionType: NewsInteractionType;
  metadata?: Record<string, any>;
}

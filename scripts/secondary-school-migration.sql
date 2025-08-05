-- Secondary School Database Schema Migration
-- This creates the sschool schema and all related tables

-- Create the schema
CREATE SCHEMA IF NOT EXISTS sschool;

-- Set search path to include the new schema
SET search_path TO sschool, public;

-- 1. Secondary School Users
CREATE TABLE sschool.ss_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('student', 'teacher', 'parent')),
  
  -- Student-specific fields
  class_level VARCHAR(50), -- e.g., "3ème", "2nde", "1ère S", "Terminale C"
  school_name VARCHAR(255),
  school_region VARCHAR(100),
  academic_year VARCHAR(20), -- e.g., "2024-2025"
  
  -- Teacher-specific fields
  subjects TEXT[], -- Array of teaching subjects
  years_experience INTEGER,
  establishment VARCHAR(255),
  
  -- Parent-specific fields
  children_ids UUID[], -- Array of student user IDs
  
  -- Gamification
  xp_points INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  streak_days INTEGER DEFAULT 0,
  last_activity_date DATE DEFAULT CURRENT_DATE,
  
  -- Privacy and moderation
  is_verified BOOLEAN DEFAULT FALSE,
  parental_control_enabled BOOLEAN DEFAULT FALSE,
  content_filter_level VARCHAR(20) DEFAULT 'moderate' CHECK (content_filter_level IN ('strict', 'moderate', 'light')),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Achievement Badges
CREATE TABLE sschool.ss_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(100), -- Icon name or URL
  category VARCHAR(50), -- 'participation', 'academic', 'social', 'streak'
  requirement_type VARCHAR(50), -- 'time_spent', 'posts_created', 'answers_given', etc.
  requirement_value INTEGER, -- Threshold value
  xp_reward INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. User Badge Achievements
CREATE TABLE sschool.ss_user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES sschool.ss_users(id) ON DELETE CASCADE,
  badge_id UUID REFERENCES sschool.ss_badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

-- 4. Social Network Posts
CREATE TABLE sschool.ss_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES sschool.ss_users(id) ON DELETE CASCADE,
  post_type VARCHAR(30) NOT NULL CHECK (post_type IN (
    'question', 'answer', 'visual_tip', 'summary', 'video', 
    'challenge', 'discussion', 'announcement'
  )),
  
  -- Content
  title VARCHAR(255),
  content TEXT,
  media_urls TEXT[], -- Array of image/video URLs
  attachments JSONB, -- File attachments metadata
  
  -- Academic context
  subject VARCHAR(100), -- Math, Physics, etc.
  class_level VARCHAR(50), -- Target class level
  difficulty_level VARCHAR(20) CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
  tags TEXT[], -- Additional tags
  
  -- Interaction counters
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  
  -- Status and moderation
  is_validated BOOLEAN DEFAULT FALSE, -- For answers validated by mentors
  is_pinned BOOLEAN DEFAULT FALSE,
  is_hidden BOOLEAN DEFAULT FALSE,
  moderation_status VARCHAR(20) DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
  
  -- References (for answers)
  parent_post_id UUID REFERENCES sschool.ss_posts(id) ON DELETE CASCADE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Post Comments
CREATE TABLE sschool.ss_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES sschool.ss_posts(id) ON DELETE CASCADE,
  author_id UUID REFERENCES sschool.ss_users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_comment_id UUID REFERENCES sschool.ss_comments(id) ON DELETE CASCADE, -- For nested comments
  
  likes_count INTEGER DEFAULT 0,
  is_hidden BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. User Interactions
CREATE TABLE sschool.ss_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES sschool.ss_users(id) ON DELETE CASCADE,
  target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('post', 'comment')),
  target_id UUID NOT NULL, -- post_id or comment_id
  interaction_type VARCHAR(20) NOT NULL CHECK (interaction_type IN ('like', 'share', 'report')),
  
  -- Share specific data
  share_context VARCHAR(50), -- 'personal', 'group', 'friends'
  share_message TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, target_type, target_id, interaction_type)
);

-- 7. Study Groups
CREATE TABLE sschool.ss_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  group_type VARCHAR(30) NOT NULL CHECK (group_type IN (
    'class', 'subject', 'school', 'region', 'custom'
  )),
  
  -- Group context
  class_level VARCHAR(50),
  subject VARCHAR(100),
  school_name VARCHAR(255),
  region VARCHAR(100),
  
  -- Settings
  is_public BOOLEAN DEFAULT FALSE,
  is_auto_join BOOLEAN DEFAULT FALSE, -- For national class groups
  max_members INTEGER DEFAULT 500,
  
  -- Media and appearance
  avatar_url VARCHAR(500),
  cover_url VARCHAR(500),
  
  -- Stats
  members_count INTEGER DEFAULT 0,
  posts_count INTEGER DEFAULT 0,
  
  created_by UUID REFERENCES sschool.ss_users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Group Membership
CREATE TABLE sschool.ss_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES sschool.ss_groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES sschool.ss_users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
  
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- 9. Group Posts
CREATE TABLE sschool.ss_group_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES sschool.ss_groups(id) ON DELETE CASCADE,
  author_id UUID REFERENCES sschool.ss_users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  media_urls TEXT[],
  attachments JSONB,
  
  post_type VARCHAR(30) DEFAULT 'message' CHECK (post_type IN (
    'message', 'question', 'announcement', 'media', 'file'
  )),
  
  reactions JSONB, -- Store emoji reactions
  is_pinned BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Study Materials
CREATE TABLE sschool.ss_study_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  material_type VARCHAR(30) NOT NULL CHECK (material_type IN (
    'summary', 'video', 'exercise', 'exam_paper', 'course_note'
  )),
  
  -- Academic context
  subject VARCHAR(100) NOT NULL,
  class_level VARCHAR(50) NOT NULL,
  chapter VARCHAR(255),
  topic VARCHAR(255),
  
  -- Content
  content_url VARCHAR(500), -- URL to PDF, video, etc.
  content_text TEXT, -- Text content for summaries
  duration_minutes INTEGER, -- For videos
  
  -- Metadata
  author_id UUID REFERENCES sschool.ss_users(id) ON DELETE SET NULL,
  is_free BOOLEAN DEFAULT TRUE,
  price_fcfa INTEGER DEFAULT 0,
  difficulty_level VARCHAR(20) CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
  
  -- Stats
  views_count INTEGER DEFAULT 0,
  downloads_count INTEGER DEFAULT 0,
  rating_average DECIMAL(3,2) DEFAULT 0.00,
  rating_count INTEGER DEFAULT 0,
  
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. Weekly Challenges
CREATE TABLE sschool.ss_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  subject VARCHAR(100) NOT NULL,
  class_level VARCHAR(50) NOT NULL,
  
  -- Challenge content
  questions JSONB NOT NULL, -- Array of questions with options and correct answers
  total_questions INTEGER NOT NULL,
  time_limit_minutes INTEGER DEFAULT 30,
  
  -- Rewards
  xp_reward INTEGER DEFAULT 50,
  badge_reward_id UUID REFERENCES sschool.ss_badges(id),
  
  -- Schedule
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  -- Stats
  participants_count INTEGER DEFAULT 0,
  completion_rate DECIMAL(5,2) DEFAULT 0.00,
  
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES sschool.ss_users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. Challenge Attempts
CREATE TABLE sschool.ss_challenge_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID REFERENCES sschool.ss_challenges(id) ON DELETE CASCADE,
  user_id UUID REFERENCES sschool.ss_users(id) ON DELETE CASCADE,
  
  -- Attempt data
  answers JSONB NOT NULL, -- User's answers
  score INTEGER NOT NULL,
  max_score INTEGER NOT NULL,
  percentage DECIMAL(5,2) NOT NULL,
  time_taken_seconds INTEGER,
  
  -- Results
  is_completed BOOLEAN DEFAULT TRUE,
  xp_earned INTEGER DEFAULT 0,
  badge_earned_id UUID REFERENCES sschool.ss_badges(id),
  
  attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(challenge_id, user_id) -- One attempt per user per challenge
);

-- Create Indexes for Performance
-- User lookups
CREATE INDEX idx_ss_users_account_id ON sschool.ss_users(account_id);
CREATE INDEX idx_ss_users_class_level ON sschool.ss_users(class_level);
CREATE INDEX idx_ss_users_user_type ON sschool.ss_users(user_type);

-- Post lookups and feeds
CREATE INDEX idx_ss_posts_author_id ON sschool.ss_posts(author_id);
CREATE INDEX idx_ss_posts_created_at ON sschool.ss_posts(created_at DESC);
CREATE INDEX idx_ss_posts_subject_class ON sschool.ss_posts(subject, class_level);
CREATE INDEX idx_ss_posts_type_status ON sschool.ss_posts(post_type, moderation_status);

-- Comments
CREATE INDEX idx_ss_comments_post_id ON sschool.ss_comments(post_id);
CREATE INDEX idx_ss_comments_author_id ON sschool.ss_comments(author_id);

-- Groups
CREATE INDEX idx_ss_groups_type_class ON sschool.ss_groups(group_type, class_level);
CREATE INDEX idx_ss_group_members_user_id ON sschool.ss_group_members(user_id);
CREATE INDEX idx_ss_group_posts_group_id ON sschool.ss_group_posts(group_id);

-- Study materials
CREATE INDEX idx_ss_study_materials_subject_class ON sschool.ss_study_materials(subject, class_level);
CREATE INDEX idx_ss_study_materials_type ON sschool.ss_study_materials(material_type);

-- Challenges
CREATE INDEX idx_ss_challenges_dates ON sschool.ss_challenges(start_date, end_date);
CREATE INDEX idx_ss_challenge_attempts_user_id ON sschool.ss_challenge_attempts(user_id);

-- Insert Initial Badge Data
INSERT INTO sschool.ss_badges (name, description, icon, category, requirement_type, requirement_value, xp_reward) VALUES
('Nouveau membre', 'Bienvenue dans la communauté!', 'welcome', 'participation', 'account_created', 1, 10),
('Premier pas', 'Première publication créée', 'first-post', 'participation', 'posts_created', 1, 20),
('Curieux', 'Plus de 10 heures dans l''app', 'time-spent', 'participation', 'time_spent_hours', 10, 50),
('Assidu', 'Plus de 50 heures dans l''app', 'dedication', 'participation', 'time_spent_hours', 50, 100),
('Expert', 'Plus de 100 heures dans l''app', 'expert', 'participation', 'time_spent_hours', 100, 200),
('Entraideur', '10 réponses données', 'helper', 'social', 'answers_given', 10, 75),
('Mentor', '50 réponses données', 'mentor', 'social', 'answers_given', 50, 150),
('Populaire', 'Plus de 100 likes reçus', 'popular', 'social', 'likes_received', 100, 100),
('Streak 7', '7 jours consécutifs d''activité', 'streak-7', 'streak', 'consecutive_days', 7, 50),
('Streak 30', '30 jours consécutifs d''activité', 'streak-30', 'streak', 'consecutive_days', 30, 200),
('Mathématicien', '20 publications en mathématiques', 'math', 'academic', 'subject_posts_math', 20, 100),
('Scientifique', '20 publications en sciences', 'science', 'academic', 'subject_posts_science', 20, 100),
('Littéraire', '20 publications en français/langues', 'literature', 'academic', 'subject_posts_literature', 20, 100),
('Champion Quiz', '10 défis terminés avec plus de 80%', 'quiz-champion', 'academic', 'quiz_high_score', 10, 150);

-- Insert Sample National Class Groups (auto-join groups)
INSERT INTO sschool.ss_groups (name, description, group_type, class_level, is_public, is_auto_join, max_members) VALUES
('3ème CAMEROUN', 'Groupe national pour tous les élèves de 3ème au Cameroun', 'class', '3ème', true, true, 10000),
('2nde CAMEROUN', 'Groupe national pour tous les élèves de 2nde au Cameroun', 'class', '2nde', true, true, 10000),
('1ère A CAMEROUN', 'Groupe national pour tous les élèves de 1ère A au Cameroun', 'class', '1ère A', true, true, 10000),
('1ère C CAMEROUN', 'Groupe national pour tous les élèves de 1ère C au Cameroun', 'class', '1ère C', true, true, 10000),
('1ère D CAMEROUN', 'Groupe national pour tous les élèves de 1ère D au Cameroun', 'class', '1ère D', true, true, 10000),
('Tle A CAMEROUN', 'Groupe national pour tous les élèves de Terminale A au Cameroun', 'class', 'Tle A', true, true, 10000),
('Tle C CAMEROUN', 'Groupe national pour tous les élèves de Terminale C au Cameroun', 'class', 'Tle C', true, true, 10000),
('Tle D CAMEROUN', 'Groupe national pour tous les élèves de Terminale D au Cameroun', 'class', 'Tle D', true, true, 10000);

-- Reset search path
SET search_path TO public;
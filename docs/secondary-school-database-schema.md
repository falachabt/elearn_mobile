# Secondary School Database Schema Design

## Overview
This document outlines the database schema design for the secondary school educational social network space. The schema will be created in a separate PostgreSQL schema called `sschool` to isolate it from the existing prepa concours data.

## Schema: `sschool`

### Core Tables

#### 1. `ss_users` - Secondary School Users
Extended user profiles specific to secondary school context.

```sql
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
  content_filter_level VARCHAR(20) DEFAULT 'moderate', -- 'strict', 'moderate', 'light'
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 2. `ss_badges` - Achievement Badges
System for gamification badges.

```sql
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
```

#### 3. `ss_user_badges` - User Badge Achievements
Junction table for user badge achievements.

```sql
CREATE TABLE sschool.ss_user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES sschool.ss_users(id) ON DELETE CASCADE,
  badge_id UUID REFERENCES sschool.ss_badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);
```

#### 4. `ss_posts` - Social Network Posts
Main content posts in the social feed.

```sql
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
```

#### 5. `ss_comments` - Post Comments
Comments on posts.

```sql
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
```

#### 6. `ss_interactions` - User Interactions
Likes, shares, and other interactions.

```sql
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
```

#### 7. `ss_groups` - Study Groups
WhatsApp-like groups for collaboration.

```sql
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
```

#### 8. `ss_group_members` - Group Membership
Junction table for group membership.

```sql
CREATE TABLE sschool.ss_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES sschool.ss_groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES sschool.ss_users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
  
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);
```

#### 9. `ss_group_posts` - Group Posts
Posts within groups.

```sql
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
```

#### 10. `ss_study_materials` - Educational Resources
Study materials organized by class and subject.

```sql
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
```

#### 11. `ss_challenges` - Weekly Challenges
Gamified learning challenges.

```sql
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
```

#### 12. `ss_challenge_attempts` - User Challenge Attempts
Track user attempts at challenges.

```sql
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
```

### Indexes and Performance

```sql
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
```

### Triggers and Functions

```sql
-- Update counters when posts are added/removed
CREATE OR REPLACE FUNCTION update_post_counts() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment counters based on post type
    -- Implementation details...
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement counters
    -- Implementation details...
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Auto-update XP and levels
CREATE OR REPLACE FUNCTION update_user_xp() RETURNS TRIGGER AS $$
BEGIN
  -- Calculate and update user XP and level
  -- Implementation details...
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## Implementation Notes

1. **Schema Isolation**: All secondary school tables are in the `sschool` schema to avoid conflicts with existing data.

2. **User Integration**: The `ss_users` table references the existing `public.accounts` table for authentication integration.

3. **Flexible Content**: JSONB columns allow for flexible content storage and future expansion.

4. **Moderation Ready**: Built-in moderation status and content filtering capabilities.

5. **Gamification**: XP, badges, and challenges system integrated throughout.

6. **Performance**: Appropriate indexes for common queries and feed generation.

7. **Scalability**: Designed to handle thousands of users and posts efficiently.

## Next Steps

1. Create the schema and tables in PostgreSQL
2. Set up initial seed data (badges, challenge templates)
3. Create TypeScript types for the new schema
4. Implement API endpoints for secondary school features
5. Build the frontend components to consume the new APIs
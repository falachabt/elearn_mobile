-- Discussion Groups System for Concours and Secondary Programs
-- Supports multiple salons per concours/program with capacity limits
-- Auto-creates groups and assigns members on enrollment

-- Create discussion_groups table
CREATE TABLE IF NOT EXISTS public.discussion_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    concours_id UUID REFERENCES public.concours(id) ON DELETE CASCADE,
    secondary_program_id UUID REFERENCES public.secondary_programs(id) ON DELETE CASCADE,
    group_number INTEGER DEFAULT 1,  -- 1st group, 2nd group, etc.
    capacity INTEGER DEFAULT 30,
    current_member_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT either_concours_or_program CHECK (
        (concours_id IS NOT NULL AND secondary_program_id IS NULL) OR 
        (concours_id IS NULL AND secondary_program_id IS NOT NULL)
    ),
    CONSTRAINT unique_group_per_context UNIQUE NULLS NOT DISTINCT (concours_id, group_number)
);

CREATE INDEX idx_discussion_groups_concours ON public.discussion_groups(concours_id);
CREATE INDEX idx_discussion_groups_program ON public.discussion_groups(secondary_program_id);

-- Create discussion_group_members table
CREATE TABLE IF NOT EXISTS public.discussion_group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.discussion_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_member_per_group UNIQUE (group_id, user_id)
);

CREATE INDEX idx_discussion_group_members_group ON public.discussion_group_members(group_id);
CREATE INDEX idx_discussion_group_members_user ON public.discussion_group_members(user_id);

-- Create discussion_messages table
CREATE TABLE IF NOT EXISTS public.discussion_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.discussion_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    text_content TEXT,
    image_url TEXT,
    tagged_content_type TEXT CHECK (tagged_content_type IN ('course', 'quiz', 'exercise', NULL)),
    tagged_content_id UUID,  -- Can be course_id, quiz_id, or exercise_id
    parent_message_id UUID REFERENCES public.discussion_messages(id) ON DELETE CASCADE,  -- For threads/replies
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_discussion_messages_group ON public.discussion_messages(group_id);
CREATE INDEX idx_discussion_messages_user ON public.discussion_messages(user_id);
CREATE INDEX idx_discussion_messages_parent ON public.discussion_messages(parent_message_id);
CREATE INDEX idx_discussion_messages_tagged_content ON public.discussion_messages(tagged_content_type, tagged_content_id);

-- Create discussion_message_attachments table for multiple file attachments
CREATE TABLE IF NOT EXISTS public.discussion_message_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES public.discussion_messages(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_name TEXT,
    file_type TEXT,  -- MIME type
    file_size INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_discussion_message_attachments_message ON public.discussion_message_attachments(message_id);

-- Permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.discussion_groups TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.discussion_group_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.discussion_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.discussion_message_attachments TO authenticated;

-- Trigger function to auto-create a discussion group when a concours is created
CREATE OR REPLACE FUNCTION public.create_discussion_group_for_concours()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.discussion_groups (concours_id, group_number)
    VALUES (NEW.id, 1);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on concours creation
CREATE TRIGGER trigger_create_discussion_group_for_concours
AFTER INSERT ON public.concours
FOR EACH ROW
EXECUTE FUNCTION public.create_discussion_group_for_concours();

-- Trigger function to auto-create a discussion group when a secondary_program is created
CREATE OR REPLACE FUNCTION public.create_discussion_group_for_program()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.discussion_groups (secondary_program_id, group_number)
    VALUES (NEW.id, 1);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on secondary_program creation
CREATE TRIGGER trigger_create_discussion_group_for_program
AFTER INSERT ON public.secondary_programs
FOR EACH ROW
EXECUTE FUNCTION public.create_discussion_group_for_program();

-- Trigger function to auto-add user to discussion group when they enroll in a program (user_program_enrollments)
CREATE OR REPLACE FUNCTION public.add_user_to_discussion_group_on_program_enrollment()
RETURNS TRIGGER AS $$
DECLARE
    v_concours_id UUID;
    v_group_id UUID;
    v_group_count INTEGER;
    v_latest_group_id UUID;
BEGIN
    -- Find all discussion groups for any concours associated with this program
    -- For now, we'll get the group associated with the program being enrolled to
    -- If user_program_enrollments links to a program, we need to find its discussion group
    
    -- Try to find a discussion group for this context
    -- First check if there's a concours associated
    SELECT g.id INTO v_group_id
    FROM public.discussion_groups g
    WHERE g.secondary_program_id = NEW.program_id
    ORDER BY g.group_number DESC
    LIMIT 1;
    
    IF v_group_id IS NULL THEN
        RETURN NEW;  -- No group found, exit
    END IF;
    
    -- Check if user is already in this group
    IF EXISTS (
        SELECT 1 FROM public.discussion_group_members
        WHERE group_id = v_group_id AND user_id = NEW.user_id
    ) THEN
        RETURN NEW;  -- User already in group
    END IF;
    
    -- Check current capacity of the latest group
    SELECT current_member_count INTO v_group_count
    FROM public.discussion_groups
    WHERE id = v_group_id;
    
    -- If group is at capacity, create a new group
    IF v_group_count >= 30 THEN
        SELECT g.group_number INTO v_group_count
        FROM public.discussion_groups g
        WHERE g.secondary_program_id = NEW.program_id
        ORDER BY g.group_number DESC
        LIMIT 1;
        
        INSERT INTO public.discussion_groups (secondary_program_id, group_number)
        VALUES (NEW.program_id, v_group_count + 1)
        RETURNING id INTO v_latest_group_id;
        
        v_group_id := v_latest_group_id;
    END IF;
    
    -- Add user to the discussion group
    INSERT INTO public.discussion_group_members (group_id, user_id)
    VALUES (v_group_id, NEW.user_id)
    ON CONFLICT (group_id, user_id) DO NOTHING;
    
    -- Update member count
    UPDATE public.discussion_groups
    SET current_member_count = current_member_count + 1
    WHERE id = v_group_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on user_program_enrollments
CREATE TRIGGER trigger_add_user_to_discussion_group_on_enrollment
AFTER INSERT ON public.user_program_enrollments
FOR EACH ROW
EXECUTE FUNCTION public.add_user_to_discussion_group_on_program_enrollment();

-- Trigger function to auto-add user to discussion group when they enroll in secondary program
CREATE OR REPLACE FUNCTION public.add_user_to_discussion_group_on_secondary_enrollment()
RETURNS TRIGGER AS $$
DECLARE
    v_group_id UUID;
    v_group_count INTEGER;
    v_latest_group_id UUID;
    v_program_number INTEGER;
BEGIN
    -- Find the discussion group for the secondary program being enrolled to
    SELECT g.id INTO v_group_id
    FROM public.discussion_groups g
    WHERE g.secondary_program_id = NEW.program_id
    ORDER BY g.group_number DESC
    LIMIT 1;
    
    IF v_group_id IS NULL THEN
        RETURN NEW;  -- No group found, exit
    END IF;
    
    -- Check if user is already in this group
    IF EXISTS (
        SELECT 1 FROM public.discussion_group_members
        WHERE group_id = v_group_id AND user_id = NEW.user_id
    ) THEN
        RETURN NEW;  -- User already in group
    END IF;
    
    -- Check current capacity of the latest group
    SELECT current_member_count INTO v_group_count
    FROM public.discussion_groups
    WHERE id = v_group_id;
    
    -- If group is at capacity, create a new group
    IF v_group_count >= 30 THEN
        SELECT g.group_number INTO v_program_number
        FROM public.discussion_groups g
        WHERE g.secondary_program_id = NEW.program_id
        ORDER BY g.group_number DESC
        LIMIT 1;
        
        INSERT INTO public.discussion_groups (secondary_program_id, group_number)
        VALUES (NEW.program_id, v_program_number + 1)
        RETURNING id INTO v_latest_group_id;
        
        v_group_id := v_latest_group_id;
    END IF;
    
    -- Add user to the discussion group
    INSERT INTO public.discussion_group_members (group_id, user_id)
    VALUES (v_group_id, NEW.user_id)
    ON CONFLICT (group_id, user_id) DO NOTHING;
    
    -- Update member count
    UPDATE public.discussion_groups
    SET current_member_count = current_member_count + 1
    WHERE id = v_group_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on user_secondary_enrollments
CREATE TRIGGER trigger_add_user_to_discussion_group_on_secondary_enrollment
AFTER INSERT ON public.user_secondary_enrollments
FOR EACH ROW
EXECUTE FUNCTION public.add_user_to_discussion_group_on_secondary_enrollment();

-- Trigger function to update member count when user is removed from group
CREATE OR REPLACE FUNCTION public.update_group_member_count_on_removal()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        UPDATE public.discussion_groups
        SET current_member_count = current_member_count - 1
        WHERE id = OLD.group_id AND current_member_count > 0;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger on member removal
CREATE TRIGGER trigger_update_group_member_count_on_removal
AFTER DELETE ON public.discussion_group_members
FOR EACH ROW
EXECUTE FUNCTION public.update_group_member_count_on_removal();

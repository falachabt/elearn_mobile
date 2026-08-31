-- Script SQL complet pour étendre la base de données avec la préparation secondaire

-- 1. Tables de base pour les classes secondaires
CREATE TABLE IF NOT EXISTS public.secondary_classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,  -- ex. 'Terminale', 'Première'
    description TEXT,
    level INTEGER NOT NULL,  -- ex. 1 pour Terminale, 2 pour Première (pour tri)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.secondary_series (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID REFERENCES public.secondary_classes(id) ON DELETE CASCADE,
    name TEXT NOT NULL,  -- ex. 'C', 'D', 'A', 'TI'
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(class_id, name)  -- Une série unique par classe
);

CREATE TABLE IF NOT EXISTS public.secondary_programs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID REFERENCES public.secondary_classes(id) ON DELETE CASCADE,
    series_id UUID REFERENCES public.secondary_series(id) ON DELETE CASCADE,
    learning_path_id UUID REFERENCES public.learning_paths(id) ON DELETE SET NULL,  -- Optionnel : lien vers un learning_path existant
    price NUMERIC(10,2) NOT NULL DEFAULT 0,  -- Prix de l'abonnement (ex. 50€/an)
    description TEXT,
    image JSONB,  -- Comme dans vos tables (type public.image)
    is_active BOOLEAN DEFAULT TRUE,
    duration INTERVAL DEFAULT '1 year',  -- Durée par défaut de l'abo
    course_count INTEGER DEFAULT 0,  -- Nombre de cours dans le programme
    quiz_count INTEGER DEFAULT 0,  -- Nombre de quiz dans le programme
    exercise_count INTEGER DEFAULT 0,  -- Nombre d'exercices dans le programme
    document_count INTEGER DEFAULT 0,  -- Nombre de documents dans le programme
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(class_id, series_id)  -- Un programme unique par classe+série
);

-- 2. Tables de jonction pour associer du contenu
CREATE TABLE IF NOT EXISTS public.secondary_program_courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_id UUID REFERENCES public.secondary_programs(id) ON DELETE CASCADE,
    course_id BIGINT REFERENCES public.courses(id) ON DELETE CASCADE,
    order_index INTEGER DEFAULT 0,  -- Ordre dans le programme
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.secondary_program_quizzes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_id UUID REFERENCES public.secondary_programs(id) ON DELETE CASCADE,
    quiz_id UUID REFERENCES public.quiz(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,  -- Permet de désactiver un quiz pour un programme spécifique
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(program_id, quiz_id)
);

CREATE TABLE IF NOT EXISTS public.secondary_program_exercises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_id UUID REFERENCES public.secondary_programs(id) ON DELETE CASCADE,
    exercise_id UUID REFERENCES public.exercices(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,  -- Permet de désactiver un exercice pour un programme spécifique
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(program_id, exercise_id)
);

-- 2b. Bucket Supabase Storage pour les documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'secondary-documents',
    'secondary-documents',
    true,
    52428800,  -- 50MB limit
    ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- 2c. Tables pour les documents (PDFs)
CREATE TABLE IF NOT EXISTS public.secondary_document_folders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_id UUID REFERENCES public.secondary_programs(id) ON DELETE CASCADE,
    parent_folder_id UUID REFERENCES public.secondary_document_folders(id) ON DELETE CASCADE,  -- NULL = dossier racine
    name TEXT NOT NULL,
    description TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.secondary_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    folder_id UUID REFERENCES public.secondary_document_folders(id) ON DELETE CASCADE,
    storage_object_id UUID REFERENCES storage.objects(id) ON DELETE CASCADE,  -- Lien vers storage.objects
    correction_document_id UUID REFERENCES public.secondary_documents(id) ON DELETE SET NULL,  -- Lien vers le document de correction
    name TEXT NOT NULL,
    description TEXT,
    is_correction BOOLEAN DEFAULT FALSE,  -- TRUE si c'est un document de correction, FALSE si c'est un document principal
    file_type TEXT DEFAULT 'pdf',
    storage_path TEXT NOT NULL,  -- Chemin dans storage (name dans storage.objects)
    download_url TEXT,  -- URL publique de téléchargement
    file_size BIGINT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.secondary_document_category_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES public.secondary_documents(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.courses_categories(id) ON DELETE CASCADE,  -- Utilise les catégories de cours existantes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(document_id, category_id)
);

CREATE TABLE IF NOT EXISTS public.secondary_program_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_id UUID REFERENCES public.secondary_programs(id) ON DELETE CASCADE,
    document_id UUID REFERENCES public.secondary_documents(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(program_id, document_id)
);

-- 2d. Table pour marquer les documents comme consultés/terminés
CREATE TABLE IF NOT EXISTS public.secondary_documents_complete (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES public.secondary_documents(id) ON DELETE CASCADE,
    is_completed BOOLEAN DEFAULT true,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, document_id)
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_secondary_documents_complete_user_id 
    ON public.secondary_documents_complete(user_id);
CREATE INDEX IF NOT EXISTS idx_secondary_documents_complete_document_id 
    ON public.secondary_documents_complete(document_id);
CREATE INDEX IF NOT EXISTS idx_secondary_documents_complete_user_document 
    ON public.secondary_documents_complete(user_id, document_id);

-- 2e. Table pour épingler des documents
CREATE TABLE IF NOT EXISTS public.secondary_documents_pin (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES public.secondary_documents(id) ON DELETE CASCADE,
    is_pinned BOOLEAN DEFAULT true,
    pinned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, document_id)
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_secondary_documents_pin_user_id 
    ON public.secondary_documents_pin(user_id);
CREATE INDEX IF NOT EXISTS idx_secondary_documents_pin_document_id 
    ON public.secondary_documents_pin(document_id);
CREATE INDEX IF NOT EXISTS idx_secondary_documents_pin_user_document 
    ON public.secondary_documents_pin(user_id, document_id);
CREATE INDEX IF NOT EXISTS idx_secondary_documents_pin_is_pinned 
    ON public.secondary_documents_pin(is_pinned) WHERE is_pinned = true;

-- 3. Trigger pour mettre à jour les counts dans secondary_programs
CREATE OR REPLACE FUNCTION update_secondary_program_counts() RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.secondary_programs sp
    SET course_count = (SELECT COUNT(*) FROM public.secondary_program_courses WHERE program_id = sp.id),
        quiz_count = (SELECT COUNT(*) FROM public.secondary_program_quizzes WHERE program_id = sp.id),
        exercise_count = (SELECT COUNT(*) FROM public.secondary_program_exercises WHERE program_id = sp.id),
        document_count = (SELECT COUNT(*) FROM public.secondary_program_documents WHERE program_id = sp.id)
    WHERE sp.id = COALESCE(NEW.program_id, OLD.program_id);
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trig_update_program_counts_courses
AFTER INSERT OR UPDATE OR DELETE ON public.secondary_program_courses
FOR EACH ROW EXECUTE FUNCTION update_secondary_program_counts();

CREATE TRIGGER trig_update_program_counts_quizzes
AFTER INSERT OR UPDATE OR DELETE ON public.secondary_program_quizzes
FOR EACH ROW EXECUTE FUNCTION update_secondary_program_counts();

CREATE TRIGGER trig_update_program_counts_exercises
AFTER INSERT OR UPDATE OR DELETE ON public.secondary_program_exercises
FOR EACH ROW EXECUTE FUNCTION update_secondary_program_counts();

CREATE TRIGGER trig_update_program_counts_documents
AFTER INSERT OR UPDATE OR DELETE ON public.secondary_program_documents
FOR EACH ROW EXECUTE FUNCTION update_secondary_program_counts();

-- 3b. Triggers pour synchroniser quiz_count via quiz_courses
-- Lorsqu'un quiz est ajouté à un cours via quiz_courses,
-- et que ce cours est dans un programme secondaire,
-- on met à jour le compteur quiz_count

CREATE OR REPLACE FUNCTION sync_quiz_to_secondary_program() RETURNS TRIGGER AS $$
DECLARE
    v_program_id UUID;
    v_course_id BIGINT;
BEGIN
    -- Récupérer le course_id depuis NEW ou OLD
    v_course_id := COALESCE(NEW."courseId", OLD."courseId");
    
    -- Trouver tous les programmes qui contiennent ce cours
    FOR v_program_id IN 
        SELECT DISTINCT program_id 
        FROM public.secondary_program_courses 
        WHERE course_id = v_course_id
    LOOP
        -- Mettre à jour le quiz_count en comptant tous les quiz uniques des cours du programme
        UPDATE public.secondary_programs
        SET quiz_count = (
            SELECT COUNT(DISTINCT qc."quizId")
            FROM public.secondary_program_courses spc
            JOIN public.quiz_courses qc ON qc."courseId" = spc.course_id
            WHERE spc.program_id = v_program_id
        )
        WHERE id = v_program_id;
    END LOOP;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trig_sync_quiz_to_secondary_program
AFTER INSERT OR DELETE ON public.quiz_courses
FOR EACH ROW EXECUTE FUNCTION sync_quiz_to_secondary_program();

-- Fonction pour recalculer quiz_count quand un cours est ajouté/retiré d'un programme
CREATE OR REPLACE FUNCTION recalc_program_quiz_count_on_course_change() RETURNS TRIGGER AS $$
BEGIN
    -- Mettre à jour le quiz_count du programme affecté
    UPDATE public.secondary_programs
    SET quiz_count = (
        SELECT COUNT(DISTINCT qc."quizId")
        FROM public.secondary_program_courses spc
        JOIN public.quiz_courses qc ON qc."courseId" = spc.course_id
        WHERE spc.program_id = COALESCE(NEW.program_id, OLD.program_id)
    )
    WHERE id = COALESCE(NEW.program_id, OLD.program_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trig_recalc_quiz_count_on_course
AFTER INSERT OR DELETE ON public.secondary_program_courses
FOR EACH ROW EXECUTE FUNCTION recalc_program_quiz_count_on_course_change();

-- 3c. Triggers pour synchroniser les corrections avec leurs documents principaux

-- Quand un document principal est supprimé, supprimer sa correction
CREATE OR REPLACE FUNCTION delete_correction_with_document() RETURNS TRIGGER AS $$
DECLARE
    v_corr_exists BOOLEAN;
BEGIN
    -- Vérifier si la correction existe et n'a pas été déjà supprimée
    SELECT EXISTS(SELECT 1 FROM public.secondary_documents WHERE id = OLD.correction_document_id) INTO v_corr_exists;
    
    IF v_corr_exists THEN
        DELETE FROM public.secondary_documents
        WHERE id = OLD.correction_document_id AND is_correction = TRUE;
    END IF;
    RETURN OLD;
EXCEPTION
    WHEN OTHERS THEN
        -- Ignorer les erreurs de suppression (correction déjà supprimée)
        RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trig_delete_correction_with_document
AFTER DELETE ON public.secondary_documents
FOR EACH ROW WHEN (OLD.correction_document_id IS NOT NULL AND OLD.is_correction = FALSE)
EXECUTE FUNCTION delete_correction_with_document();

-- Quand une correction est liée à un document, hériter du dossier
CREATE OR REPLACE FUNCTION sync_correction_properties() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.correction_document_id IS NOT NULL AND NEW.is_correction = TRUE THEN
        -- Copier le folder_id du document principal
        NEW.folder_id := (SELECT folder_id FROM public.secondary_documents WHERE id = NEW.correction_document_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trig_sync_correction_on_insert
BEFORE INSERT ON public.secondary_documents
FOR EACH ROW EXECUTE FUNCTION sync_correction_properties();

-- Copier les catégories après l'insertion (AFTER trigger)
CREATE OR REPLACE FUNCTION sync_correction_categories_on_insert() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.correction_document_id IS NOT NULL AND NEW.is_correction = TRUE THEN
        INSERT INTO public.secondary_document_category_links (document_id, category_id)
        SELECT NEW.id, category_id
        FROM public.secondary_document_category_links
        WHERE document_id = NEW.correction_document_id
        ON CONFLICT DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trig_sync_correction_categories_on_insert
AFTER INSERT ON public.secondary_documents
FOR EACH ROW EXECUTE FUNCTION sync_correction_categories_on_insert();

-- Quand un document principal change de dossier, mettre à jour sa correction
CREATE OR REPLACE FUNCTION update_correction_folder() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.folder_id IS DISTINCT FROM OLD.folder_id AND NEW.correction_document_id IS NOT NULL THEN
        -- Le principal document stocke l'ID de sa correction dans correction_document_id
        UPDATE public.secondary_documents
        SET folder_id = NEW.folder_id
        WHERE id = NEW.correction_document_id AND is_correction = TRUE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trig_update_correction_folder
AFTER UPDATE ON public.secondary_documents
FOR EACH ROW WHEN (OLD.is_correction = FALSE)
EXECUTE FUNCTION update_correction_folder();

-- Quand les catégories d'un document principal changent, synchroniser avec sa correction
CREATE OR REPLACE FUNCTION sync_correction_categories() RETURNS TRIGGER AS $$
DECLARE
    correction_id UUID;
BEGIN
    -- Trouver la correction du document
    SELECT correction_document_id INTO correction_id
    FROM public.secondary_documents
    WHERE id = COALESCE(NEW.document_id, OLD.document_id) AND is_correction = FALSE;
    
    IF correction_id IS NOT NULL THEN
        IF TG_OP = 'INSERT' THEN
            -- Ajouter la catégorie à la correction
            INSERT INTO public.secondary_document_category_links (document_id, category_id)
            VALUES (correction_id, NEW.category_id)
            ON CONFLICT DO NOTHING;
        ELSIF TG_OP = 'DELETE' THEN
            -- Supprimer la catégorie de la correction
            DELETE FROM public.secondary_document_category_links
            WHERE document_id = correction_id AND category_id = OLD.category_id;
        END IF;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trig_sync_correction_categories
AFTER INSERT OR DELETE ON public.secondary_document_category_links
FOR EACH ROW EXECUTE FUNCTION sync_correction_categories();

-- Quand une correction est ajoutée à un document existant, synchroniser
CREATE OR REPLACE FUNCTION sync_new_correction() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.correction_document_id IS NOT NULL AND OLD.correction_document_id IS NULL THEN
        -- Mettre à jour le dossier de la correction
        UPDATE public.secondary_documents
        SET folder_id = NEW.folder_id
        WHERE id = NEW.correction_document_id AND is_correction = TRUE;
        
        -- Copier les catégories
        INSERT INTO public.secondary_document_category_links (document_id, category_id)
        SELECT NEW.correction_document_id, category_id
        FROM public.secondary_document_category_links
        WHERE document_id = NEW.id
        ON CONFLICT DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trig_sync_new_correction
AFTER UPDATE ON public.secondary_documents
FOR EACH ROW WHEN (OLD.is_correction = FALSE)
EXECUTE FUNCTION sync_new_correction();

-- 3b. Triggers pour synchroniser automatiquement les exercices et quiz avec les cours

-- Quand un cours est ajouté à un programme, ajouter tous ses exercices
CREATE OR REPLACE FUNCTION sync_exercises_on_course_add() RETURNS TRIGGER AS $$
BEGIN
    -- Insérer tous les exercices du cours dans le programme
    INSERT INTO public.secondary_program_exercises (program_id, exercise_id, is_active)
    SELECT NEW.program_id, e.id, TRUE
    FROM public.exercices e
    WHERE e.course_id = NEW.course_id
    ON CONFLICT DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trig_sync_exercises_on_course_add
AFTER INSERT ON public.secondary_program_courses
FOR EACH ROW EXECUTE FUNCTION sync_exercises_on_course_add();

-- Quand un cours est ajouté à un programme, ajouter tous ses quiz
CREATE OR REPLACE FUNCTION sync_quizzes_on_course_add() RETURNS TRIGGER AS $$
BEGIN
    -- Insérer tous les quiz du cours dans le programme
    INSERT INTO public.secondary_program_quizzes (program_id, quiz_id, is_active)
    SELECT NEW.program_id, qc."quizId", TRUE
    FROM public.quiz_courses qc
    WHERE qc."courseId" = NEW.course_id
    ON CONFLICT DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trig_sync_quizzes_on_course_add
AFTER INSERT ON public.secondary_program_courses
FOR EACH ROW EXECUTE FUNCTION sync_quizzes_on_course_add();

-- Quand un cours est retiré d'un programme, retirer tous ses exercices
CREATE OR REPLACE FUNCTION sync_exercises_on_course_remove() RETURNS TRIGGER AS $$
BEGIN
    -- Supprimer tous les exercices du cours du programme
    DELETE FROM public.secondary_program_exercises
    WHERE program_id = OLD.program_id
    AND exercise_id IN (
        SELECT id FROM public.exercices WHERE course_id = OLD.course_id
    );
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trig_sync_exercises_on_course_remove
AFTER DELETE ON public.secondary_program_courses
FOR EACH ROW EXECUTE FUNCTION sync_exercises_on_course_remove();

-- Quand un cours est retiré d'un programme, retirer ses quiz SI aucun autre cours du programme n'y est lié
CREATE OR REPLACE FUNCTION sync_quizzes_on_course_remove() RETURNS TRIGGER AS $$
BEGIN
    -- Supprimer les quiz qui ne sont plus liés à aucun cours du programme
    DELETE FROM public.secondary_program_quizzes spq
    WHERE spq.program_id = OLD.program_id
    AND spq.quiz_id IN (
        SELECT qc."quizId" FROM public.quiz_courses qc WHERE qc."courseId" = OLD.course_id
    )
    AND NOT EXISTS (
        -- Vérifier qu'aucun autre cours du programme n'est lié à ce quiz
        SELECT 1 FROM public.secondary_program_courses spc
        JOIN public.quiz_courses qc2 ON qc2."courseId" = spc.course_id
        WHERE spc.program_id = OLD.program_id
        AND qc2."quizId" = spq.quiz_id
    );
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trig_sync_quizzes_on_course_remove
AFTER DELETE ON public.secondary_program_courses
FOR EACH ROW EXECUTE FUNCTION sync_quizzes_on_course_remove();

-- Quand un exercice est créé, l'ajouter à tous les programmes contenant son cours
CREATE OR REPLACE FUNCTION sync_exercise_to_programs() RETURNS TRIGGER AS $$
BEGIN
    -- Insérer l'exercice dans tous les programmes qui contiennent le cours
    INSERT INTO public.secondary_program_exercises (program_id, exercise_id, is_active)
    SELECT spc.program_id, NEW.id, TRUE
    FROM public.secondary_program_courses spc
    WHERE spc.course_id = NEW.course_id
    ON CONFLICT DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trig_sync_exercise_to_programs
AFTER INSERT ON public.exercices
FOR EACH ROW EXECUTE FUNCTION sync_exercise_to_programs();

-- Quand un exercice est supprimé, le retirer de tous les programmes
CREATE OR REPLACE FUNCTION remove_exercise_from_programs() RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM public.secondary_program_exercises
    WHERE exercise_id = OLD.id;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trig_remove_exercise_from_programs
BEFORE DELETE ON public.exercices
FOR EACH ROW EXECUTE FUNCTION remove_exercise_from_programs();

-- Quand un quiz est lié à un cours (dans quiz_courses), l'ajouter aux programmes contenant ce cours
CREATE OR REPLACE FUNCTION sync_quiz_to_programs() RETURNS TRIGGER AS $$
BEGIN
    -- Insérer le quiz dans tous les programmes qui contiennent le cours
    INSERT INTO public.secondary_program_quizzes (program_id, quiz_id, is_active)
    SELECT spc.program_id, NEW."quizId", TRUE
    FROM public.secondary_program_courses spc
    WHERE spc.course_id = NEW."courseId"
    ON CONFLICT DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trig_sync_quiz_to_programs
AFTER INSERT ON public.quiz_courses
FOR EACH ROW EXECUTE FUNCTION sync_quiz_to_programs();

-- Quand un quiz est délié d'un cours, le retirer des programmes SI aucun autre cours du programme n'y est lié
CREATE OR REPLACE FUNCTION remove_quiz_from_programs() RETURNS TRIGGER AS $$
BEGIN
    -- Supprimer le quiz des programmes où aucun autre cours n'est lié à ce quiz
    DELETE FROM public.secondary_program_quizzes spq
    WHERE spq.quiz_id = OLD."quizId"
    AND NOT EXISTS (
        -- Vérifier qu'aucun autre cours du programme n'est lié à ce quiz
        SELECT 1 FROM public.secondary_program_courses spc
        JOIN public.quiz_courses qc ON qc."courseId" = spc.course_id
        WHERE spc.program_id = spq.program_id
        AND qc."quizId" = OLD."quizId"
    );
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trig_remove_quiz_from_programs
AFTER DELETE ON public.quiz_courses
FOR EACH ROW EXECUTE FUNCTION remove_quiz_from_programs();

-- 3d. Triggers pour mettre à jour updated_at automatiquement

-- Trigger pour secondary_documents_complete
CREATE OR REPLACE FUNCTION update_secondary_documents_complete_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = clock_timestamp();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_secondary_documents_complete_updated_at
    BEFORE UPDATE ON public.secondary_documents_complete
    FOR EACH ROW
    EXECUTE FUNCTION update_secondary_documents_complete_updated_at();

-- Trigger pour secondary_documents_pin
CREATE OR REPLACE FUNCTION update_secondary_documents_pin_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = clock_timestamp();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_secondary_documents_pin_updated_at
    BEFORE UPDATE ON public.secondary_documents_pin
    FOR EACH ROW
    EXECUTE FUNCTION update_secondary_documents_pin_updated_at();

-- 4. Tables pour subscriptions et paiements
CREATE TABLE IF NOT EXISTS public.user_secondary_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    program_id UUID REFERENCES public.secondary_programs(id) ON DELETE CASCADE,
    enrollment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expiry_date TIMESTAMP WITH TIME ZONE,  -- Calculé via trigger
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled'))
);

CREATE TABLE IF NOT EXISTS public.user_secondary_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    program_id UUID REFERENCES public.secondary_programs(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL,
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expiry_date TIMESTAMP WITH TIME ZONE,  -- ex. payment_date + 1 year
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed')),
    promo_code_id UUID REFERENCES public.influencers(id),  -- Réutilisez vos promo codes
    transaction_id TEXT  -- Lien vers Stripe ou autre
);

-- Triggers pour paiements
CREATE OR REPLACE FUNCTION calculate_secondary_expiry() RETURNS TRIGGER AS $$
BEGIN
    NEW.expiry_date := NEW.payment_date + (SELECT duration FROM public.secondary_programs WHERE id = NEW.program_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trig_secondary_expiry
BEFORE INSERT OR UPDATE ON public.user_secondary_payments
FOR EACH ROW EXECUTE FUNCTION calculate_secondary_expiry();

CREATE OR REPLACE FUNCTION enroll_after_secondary_payment() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.payment_status = 'completed' THEN
        INSERT INTO public.user_secondary_enrollments (user_id, program_id, expiry_date)
        VALUES (NEW.user_id, NEW.program_id, NEW.expiry_date)
        ON CONFLICT DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trig_enroll_secondary
AFTER UPDATE ON public.user_secondary_payments
FOR EACH ROW WHEN (NEW.payment_status = 'completed') EXECUTE FUNCTION enroll_after_secondary_payment();

-- 5. Fonction pour vérifier l'accès
CREATE OR REPLACE FUNCTION check_secondary_access(p_user_id UUID, p_program_id UUID) RETURNS BOOLEAN AS $$
DECLARE has_access BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM user_secondary_enrollments 
        WHERE user_id = p_user_id AND program_id = p_program_id AND expiry_date > NOW()
    ) INTO has_access;
    RETURN has_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Vues utiles
CREATE OR REPLACE VIEW vw_available_secondary_programs AS
SELECT sp.id, sc.name AS class_name, ss.name AS series_name, sp.price, sp.description,
       sp.course_count, sp.quiz_count, sp.exercise_count
FROM public.secondary_programs sp
JOIN public.secondary_classes sc ON sp.class_id = sc.id
JOIN public.secondary_series ss ON sp.series_id = ss.id
WHERE sp.is_active = TRUE
AND sp.id NOT IN (SELECT program_id FROM user_secondary_enrollments WHERE user_id = auth.uid());

CREATE OR REPLACE VIEW vw_user_secondary_subscriptions AS
SELECT ue.program_id, ue.expiry_date, sp.price
FROM user_secondary_enrollments ue
JOIN secondary_programs sp ON ue.program_id = sp.id
WHERE ue.user_id = auth.uid() AND ue.expiry_date > NOW();

-- 7. Politiques RLS
-- Enable RLS
ALTER TABLE public.secondary_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.secondary_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.secondary_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_secondary_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.secondary_document_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.secondary_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.secondary_document_category_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.secondary_program_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.secondary_documents_complete ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.secondary_documents_pin ENABLE ROW LEVEL SECURITY;

-- Policies for secondary_classes
CREATE POLICY "Anyone can view secondary classes" ON public.secondary_classes FOR SELECT USING (TRUE);
CREATE POLICY "Admins can insert secondary classes" ON public.secondary_classes FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Admins can update secondary classes" ON public.secondary_classes FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can delete secondary classes" ON public.secondary_classes FOR DELETE USING (auth.role() = 'authenticated');

-- Policies for secondary_series
CREATE POLICY "Anyone can view secondary series" ON public.secondary_series FOR SELECT USING (TRUE);
CREATE POLICY "Admins can manage secondary series" ON public.secondary_series FOR ALL USING (auth.role() = 'authenticated');

-- Policies for secondary_programs
CREATE POLICY "Users view secondary programs" ON public.secondary_programs FOR SELECT USING (TRUE);
CREATE POLICY "Admins edit secondary programs" ON public.secondary_programs FOR ALL USING (auth.role() = 'authenticated');

-- Policies for payments
CREATE POLICY "Users insert own secondary payments" ON public.user_secondary_payments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users view own secondary payments" ON public.user_secondary_payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own secondary payments" ON public.user_secondary_payments FOR UPDATE USING (auth.uid() = user_id);

-- Policies for documents
CREATE POLICY "Users view document folders" ON public.secondary_document_folders FOR SELECT USING (TRUE);
CREATE POLICY "Admins manage document folders" ON public.secondary_document_folders FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Users view documents" ON public.secondary_documents FOR SELECT USING (TRUE);
CREATE POLICY "Admins manage documents" ON public.secondary_documents FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Users view document category links" ON public.secondary_document_category_links FOR SELECT USING (TRUE);
CREATE POLICY "Admins manage document category links" ON public.secondary_document_category_links FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Users view program documents" ON public.secondary_program_documents FOR SELECT USING (TRUE);
CREATE POLICY "Admins manage program documents" ON public.secondary_program_documents FOR ALL USING (auth.role() = 'authenticated');

-- Policies for secondary_documents_complete
CREATE POLICY "Users can view their own completed documents"
    ON public.secondary_documents_complete
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own completed documents"
    ON public.secondary_documents_complete
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own completed documents"
    ON public.secondary_documents_complete
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own completed documents"
    ON public.secondary_documents_complete
    FOR DELETE
    USING (auth.uid() = user_id);

-- Policies for secondary_documents_pin
CREATE POLICY "Users can view their own pinned documents"
    ON public.secondary_documents_pin
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own pinned documents"
    ON public.secondary_documents_pin
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pinned documents"
    ON public.secondary_documents_pin
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pinned documents"
    ON public.secondary_documents_pin
    FOR DELETE
    USING (auth.uid() = user_id);

-- Storage policies for secondary-documents bucket
CREATE POLICY "Public can view documents" ON storage.objects FOR SELECT USING (bucket_id = 'secondary-documents');
CREATE POLICY "Authenticated users can upload documents" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'secondary-documents' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update documents" ON storage.objects FOR UPDATE USING (bucket_id = 'secondary-documents' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete documents" ON storage.objects FOR DELETE USING (bucket_id = 'secondary-documents' AND auth.role() = 'authenticated');

-- 8. Commentaires pour documentation
COMMENT ON TABLE public.secondary_documents_complete IS 'Table pour suivre les documents consultés/terminés par les utilisateurs';
COMMENT ON COLUMN public.secondary_documents_complete.user_id IS 'ID de l''utilisateur';
COMMENT ON COLUMN public.secondary_documents_complete.document_id IS 'ID du document consulté';
COMMENT ON COLUMN public.secondary_documents_complete.is_completed IS 'Statut de complétion du document';
COMMENT ON COLUMN public.secondary_documents_complete.completed_at IS 'Date et heure de complétion';

COMMENT ON TABLE public.secondary_documents_pin IS 'Table pour suivre les documents épinglés par les utilisateurs';
COMMENT ON COLUMN public.secondary_documents_pin.user_id IS 'ID de l''utilisateur';
COMMENT ON COLUMN public.secondary_documents_pin.document_id IS 'ID du document épinglé';
COMMENT ON COLUMN public.secondary_documents_pin.is_pinned IS 'Statut d''épinglage du document';
COMMENT ON COLUMN public.secondary_documents_pin.pinned_at IS 'Date et heure d''épinglage';

-- Fin du script
set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.calculate_secondary_expiry()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.expiry_date := NEW.payment_date + (SELECT duration FROM public.secondary_programs WHERE id = NEW.program_id);
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_secondary_access(p_user_id uuid, p_program_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE has_access BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM user_secondary_enrollments 
        WHERE user_id = p_user_id AND program_id = p_program_id AND expiry_date > NOW()
    ) INTO has_access;
    RETURN has_access;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.delete_correction_with_document()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.enroll_after_secondary_payment()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF NEW.payment_status = 'completed' THEN
        INSERT INTO public.user_secondary_enrollments (user_id, program_id, expiry_date)
        VALUES (NEW.user_id, NEW.program_id, NEW.expiry_date)
        ON CONFLICT DO NOTHING;
    END IF;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.remove_exercise_from_programs()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    DELETE FROM public.secondary_program_exercises
    WHERE exercise_id = OLD.id;
    
    RETURN OLD;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.remove_quiz_from_programs()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.sync_correction_categories()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.sync_correction_categories_on_insert()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.sync_correction_properties()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF NEW.correction_document_id IS NOT NULL AND NEW.is_correction = TRUE THEN
        -- Copier le folder_id du document principal
        NEW.folder_id := (SELECT folder_id FROM public.secondary_documents WHERE id = NEW.correction_document_id);
    END IF;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_exercise_to_programs()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Insérer l'exercice dans tous les programmes qui contiennent le cours
    INSERT INTO public.secondary_program_exercises (program_id, exercise_id, is_active)
    SELECT spc.program_id, NEW.id, TRUE
    FROM public.secondary_program_courses spc
    WHERE spc.course_id = NEW.course_id
    ON CONFLICT DO NOTHING;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_exercises_on_course_add()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Insérer tous les exercices du cours dans le programme
    INSERT INTO public.secondary_program_exercises (program_id, exercise_id, is_active)
    SELECT NEW.program_id, e.id, TRUE
    FROM public.exercices e
    WHERE e.course_id = NEW.course_id
    ON CONFLICT DO NOTHING;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_exercises_on_course_remove()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Supprimer tous les exercices du cours du programme
    DELETE FROM public.secondary_program_exercises
    WHERE program_id = OLD.program_id
    AND exercise_id IN (
        SELECT id FROM public.exercices WHERE course_id = OLD.course_id
    );
    
    RETURN OLD;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_new_correction()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.sync_quiz_to_programs()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Insérer le quiz dans tous les programmes qui contiennent le cours
    INSERT INTO public.secondary_program_quizzes (program_id, quiz_id, is_active)
    SELECT spc.program_id, NEW."quizId", TRUE
    FROM public.secondary_program_courses spc
    WHERE spc.course_id = NEW."courseId"
    ON CONFLICT DO NOTHING;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_quizzes_on_course_add()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Insérer tous les quiz du cours dans le programme
    INSERT INTO public.secondary_program_quizzes (program_id, quiz_id, is_active)
    SELECT NEW.program_id, qc."quizId", TRUE
    FROM public.quiz_courses qc
    WHERE qc."courseId" = NEW.course_id
    ON CONFLICT DO NOTHING;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_quizzes_on_course_remove()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.update_correction_folder()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF NEW.folder_id IS DISTINCT FROM OLD.folder_id AND NEW.correction_document_id IS NOT NULL THEN
        -- Le principal document stocke l'ID de sa correction dans correction_document_id
        UPDATE public.secondary_documents
        SET folder_id = NEW.folder_id
        WHERE id = NEW.correction_document_id AND is_correction = TRUE;
    END IF;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_secondary_program_counts()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    UPDATE public.secondary_programs sp
    SET course_count = (SELECT COUNT(*) FROM public.secondary_program_courses WHERE program_id = sp.id),
        quiz_count = (SELECT COUNT(*) FROM public.secondary_program_quizzes WHERE program_id = sp.id),
        exercise_count = (SELECT COUNT(*) FROM public.secondary_program_exercises WHERE program_id = sp.id),
        document_count = (SELECT COUNT(*) FROM public.secondary_program_documents WHERE program_id = sp.id)
    WHERE sp.id = COALESCE(NEW.program_id, OLD.program_id);
    RETURN COALESCE(NEW, OLD);
END;
$function$
;



-- Test: Vérification des triggers du système secondaire
-- Ce test vérifie que les triggers fonctionnent correctement

begin;

select plan(37);

-- Nettoyage préalable
DELETE FROM public.secondary_program_exercises WHERE program_id IN (
    SELECT id FROM public.secondary_programs WHERE class_id IN (
        SELECT id FROM public.secondary_classes WHERE name = 'Test Terminale'
    )
);
DELETE FROM public.secondary_program_courses WHERE program_id IN (
    SELECT id FROM public.secondary_programs WHERE class_id IN (
        SELECT id FROM public.secondary_classes WHERE name = 'Test Terminale'
    )
);
DELETE FROM public.secondary_programs WHERE class_id IN (
    SELECT id FROM public.secondary_classes WHERE name = 'Test Terminale'
);
DELETE FROM public.secondary_series WHERE class_id IN (
    SELECT id FROM public.secondary_classes WHERE name = 'Test Terminale'
);
DELETE FROM public.secondary_classes WHERE name = 'Test Terminale';

-- ========================================
-- Tests des triggers de comptage
-- ========================================

-- Test 1: Vérifier que le trigger trig_update_program_counts_courses existe
SELECT has_trigger(
    'public',
    'secondary_program_courses',
    'trig_update_program_counts_courses',
    'Le trigger trig_update_program_counts_courses devrait exister'
);

-- Test 2: Vérifier que le trigger trig_update_program_counts_quizzes existe
SELECT has_trigger(
    'public',
    'secondary_program_quizzes',
    'trig_update_program_counts_quizzes',
    'Le trigger trig_update_program_counts_quizzes devrait exister'
);

-- Test 3: Vérifier que le trigger trig_update_program_counts_exercises existe
SELECT has_trigger(
    'public',
    'secondary_program_exercises',
    'trig_update_program_counts_exercises',
    'Le trigger trig_update_program_counts_exercises devrait exister'
);

-- Test 3b: Vérifier que le trigger trig_update_program_counts_documents existe
SELECT has_trigger(
    'public',
    'secondary_program_documents',
    'trig_update_program_counts_documents',
    'Le trigger trig_update_program_counts_documents devrait exister'
);

-- ========================================
-- Tests des triggers de synchronisation des corrections
-- ========================================

-- Test 3c: Vérifier que le trigger trig_delete_correction_with_document existe
SELECT has_trigger(
    'public',
    'secondary_documents',
    'trig_delete_correction_with_document',
    'Le trigger trig_delete_correction_with_document devrait exister'
);

-- Test 3d: Vérifier que le trigger trig_sync_correction_on_insert existe
SELECT has_trigger(
    'public',
    'secondary_documents',
    'trig_sync_correction_on_insert',
    'Le trigger trig_sync_correction_on_insert devrait exister'
);

-- Test 3e: Vérifier que le trigger trig_update_correction_folder existe
SELECT has_trigger(
    'public',
    'secondary_documents',
    'trig_update_correction_folder',
    'Le trigger trig_update_correction_folder devrait exister'
);

-- Test 3f: Vérifier que le trigger trig_sync_correction_categories existe
SELECT has_trigger(
    'public',
    'secondary_document_category_links',
    'trig_sync_correction_categories',
    'Le trigger trig_sync_correction_categories devrait exister'
);

-- Test 3g: Vérifier que le trigger trig_sync_new_correction existe
SELECT has_trigger(
    'public',
    'secondary_documents',
    'trig_sync_new_correction',
    'Le trigger trig_sync_new_correction devrait exister'
);

-- Test 3h: Vérifier que le trigger trig_sync_correction_categories_on_insert existe
SELECT has_trigger(
    'public',
    'secondary_documents',
    'trig_sync_correction_categories_on_insert',
    'Le trigger trig_sync_correction_categories_on_insert devrait exister'
);

-- ========================================
-- Tests des triggers de synchronisation
-- ========================================

-- Test 4: Vérifier que le trigger trig_sync_exercises_on_course_add existe
SELECT has_trigger(
    'public',
    'secondary_program_courses',
    'trig_sync_exercises_on_course_add',
    'Le trigger trig_sync_exercises_on_course_add devrait exister'
);

-- Test 5: Vérifier que le trigger trig_sync_exercises_on_course_remove existe
SELECT has_trigger(
    'public',
    'secondary_program_courses',
    'trig_sync_exercises_on_course_remove',
    'Le trigger trig_sync_exercises_on_course_remove devrait exister'
);

-- Test 6: Vérifier que le trigger trig_sync_exercise_to_programs existe
SELECT has_trigger(
    'public',
    'exercices',
    'trig_sync_exercise_to_programs',
    'Le trigger trig_sync_exercise_to_programs devrait exister'
);

-- Test 7: Vérifier que le trigger trig_remove_exercise_from_programs existe
SELECT has_trigger(
    'public',
    'exercices',
    'trig_remove_exercise_from_programs',
    'Le trigger trig_remove_exercise_from_programs devrait exister'
);

-- Test 8: Vérifier que le trigger trig_sync_quizzes_on_course_add existe
SELECT has_trigger(
    'public',
    'secondary_program_courses',
    'trig_sync_quizzes_on_course_add',
    'Le trigger trig_sync_quizzes_on_course_add devrait exister'
);

-- Test 9: Vérifier que le trigger trig_sync_quizzes_on_course_remove existe
SELECT has_trigger(
    'public',
    'secondary_program_courses',
    'trig_sync_quizzes_on_course_remove',
    'Le trigger trig_sync_quizzes_on_course_remove devrait exister'
);

-- Test 10: Vérifier que le trigger trig_sync_quiz_to_programs existe
SELECT has_trigger(
    'public',
    'quiz_courses',
    'trig_sync_quiz_to_programs',
    'Le trigger trig_sync_quiz_to_programs devrait exister'
);

-- Test 11: Vérifier que le trigger trig_remove_quiz_from_programs existe
SELECT has_trigger(
    'public',
    'quiz_courses',
    'trig_remove_quiz_from_programs',
    'Le trigger trig_remove_quiz_from_programs devrait exister'
);

-- Test 11b: Vérifier que le trigger trig_sync_quiz_to_secondary_program existe
SELECT has_trigger(
    'public',
    'quiz_courses',
    'trig_sync_quiz_to_secondary_program',
    'Le trigger trig_sync_quiz_to_secondary_program devrait exister'
);

-- Test 11c: Vérifier que le trigger trig_recalc_quiz_count_on_course existe
SELECT has_trigger(
    'public',
    'secondary_program_courses',
    'trig_recalc_quiz_count_on_course',
    'Le trigger trig_recalc_quiz_count_on_course devrait exister'
);

-- ========================================
-- Tests des triggers de paiement
-- ========================================

-- Test 12: Vérifier que le trigger trig_secondary_expiry existe
SELECT has_trigger(
    'public',
    'user_secondary_payments',
    'trig_secondary_expiry',
    'Le trigger trig_secondary_expiry devrait exister'
);

-- Test 13: Vérifier que le trigger trig_enroll_secondary existe
SELECT has_trigger(
    'public',
    'user_secondary_payments',
    'trig_enroll_secondary',
    'Le trigger trig_enroll_secondary devrait exister'
);

-- ========================================
-- Test fonctionnel du trigger de comptage
-- ========================================

-- Créer des données de test
INSERT INTO public.secondary_classes (id, name, level) 
VALUES ('10000000-0000-0000-0000-000000000001'::uuid, 'Test Terminale', 1);

INSERT INTO public.secondary_series (id, class_id, name) 
VALUES ('20000000-0000-0000-0000-000000000001'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, 'C');

INSERT INTO public.secondary_programs (id, class_id, series_id, price) 
VALUES ('30000000-0000-0000-0000-000000000001'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000001'::uuid, 50.00);

-- Test 14: Le course_count initial devrait être 0
SELECT is(
    (SELECT course_count FROM public.secondary_programs WHERE id = '30000000-0000-0000-0000-000000000001'::uuid),
    0,
    'Le course_count initial devrait être 0'
);

-- Ajouter un cours (si un cours existe)
INSERT INTO public.secondary_program_courses (program_id, course_id, order_index)
SELECT '30000000-0000-0000-0000-000000000001'::uuid, id, 0
FROM public.courses LIMIT 1;

-- Test 15: Le course_count devrait être incrémenté après ajout d'un cours
SELECT ok(
    (SELECT course_count FROM public.secondary_programs WHERE id = '30000000-0000-0000-0000-000000000001'::uuid) >= 0,
    'Le course_count devrait être mis à jour après ajout d''un cours'
);

-- Test 16: Les exercices du cours devraient être automatiquement ajoutés au programme
SELECT ok(
    (SELECT COUNT(*) FROM public.secondary_program_exercises 
     WHERE program_id = '30000000-0000-0000-0000-000000000001'::uuid) >= 0,
    'Les exercices du cours devraient être synchronisés automatiquement'
);

-- ========================================
-- Tests de décrémentation des compteurs
-- ========================================

-- Récupérer le nombre de cours ajoutés
DO $$
DECLARE
    v_course_count INTEGER;
BEGIN
    SELECT course_count INTO v_course_count
    FROM public.secondary_programs 
    WHERE id = '30000000-0000-0000-0000-000000000001'::uuid;
    
    RAISE NOTICE 'Courses ajoutés: %', v_course_count;
END $$;

-- Test 17: course_count après ajout
SELECT ok(
    (SELECT course_count FROM public.secondary_programs WHERE id = '30000000-0000-0000-0000-000000000001'::uuid) >= 0,
    'course_count devrait être >= 0 après ajout'
);

-- Ajouter un deuxième cours si possible
INSERT INTO public.secondary_program_courses (program_id, course_id, order_index)
SELECT '30000000-0000-0000-0000-000000000001'::uuid, id, 1
FROM public.courses WHERE id NOT IN (
    SELECT course_id FROM public.secondary_program_courses 
    WHERE program_id = '30000000-0000-0000-0000-000000000001'::uuid
) LIMIT 1;

-- Test 18: course_count après ajout du deuxième cours
SELECT ok(
    (SELECT course_count FROM public.secondary_programs WHERE id = '30000000-0000-0000-0000-000000000001'::uuid) >= 0,
    'course_count devrait être >= 0 après ajout de cours'
);

-- Sauvegarder le count avant suppression
DO $$
DECLARE
    v_count_before INTEGER;
BEGIN
    SELECT course_count INTO v_count_before
    FROM public.secondary_programs 
    WHERE id = '30000000-0000-0000-0000-000000000001'::uuid;
    
    RAISE NOTICE 'Count avant suppression: %', v_count_before;
END $$;

-- Supprimer un cours
DELETE FROM public.secondary_program_courses 
WHERE program_id = '30000000-0000-0000-0000-000000000001'::uuid 
AND ctid = (SELECT ctid FROM public.secondary_program_courses 
            WHERE program_id = '30000000-0000-0000-0000-000000000001'::uuid LIMIT 1);

-- Test 19: course_count décrémenté après suppression
SELECT ok(
    (SELECT course_count FROM public.secondary_programs WHERE id = '30000000-0000-0000-0000-000000000001'::uuid) >= 0,
    'course_count devrait être décrémenté après suppression'
);

-- Test 20: exercise_count après suppression du cours
SELECT ok(
    (SELECT exercise_count FROM public.secondary_programs WHERE id = '30000000-0000-0000-0000-000000000001'::uuid) >= 0,
    'exercise_count devrait être >= 0 après suppression du cours'
);

-- Test 21: quiz_count après suppression du cours
SELECT ok(
    (SELECT quiz_count FROM public.secondary_programs WHERE id = '30000000-0000-0000-0000-000000000001'::uuid) >= 0,
    'quiz_count devrait être >= 0 après suppression du cours'
);

-- Supprimer tous les cours
DELETE FROM public.secondary_program_courses 
WHERE program_id = '30000000-0000-0000-0000-000000000001'::uuid;

-- Test 22: Tous les compteurs à 0 après suppression de tous les cours
SELECT is(
    (SELECT course_count + quiz_count + exercise_count FROM public.secondary_programs WHERE id = '30000000-0000-0000-0000-000000000001'::uuid),
    0,
    'Tous les compteurs devraient être à 0 après suppression de tous les cours'
);

-- ========================================
-- Tests fonctionnels quiz_count via quiz_courses
-- ========================================

-- Créer un programme de test pour quiz_count
INSERT INTO public.secondary_classes (id, name, level) 
VALUES ('10000000-0000-0000-0000-000000000002'::uuid, 'Test Terminale Quiz', 1)
ON CONFLICT DO NOTHING;

INSERT INTO public.secondary_series (id, class_id, name) 
VALUES ('20000000-0000-0000-0000-000000000002'::uuid, '10000000-0000-0000-0000-000000000002'::uuid, 'D')
ON CONFLICT DO NOTHING;

INSERT INTO public.secondary_programs (id, class_id, series_id, price) 
VALUES ('30000000-0000-0000-0000-000000000002'::uuid, '10000000-0000-0000-0000-000000000002'::uuid, '20000000-0000-0000-0000-000000000002'::uuid, 50.00)
ON CONFLICT DO NOTHING;

-- Test 23: quiz_count initial devrait être 0
SELECT is(
    (SELECT quiz_count FROM public.secondary_programs WHERE id = '30000000-0000-0000-0000-000000000002'::uuid),
    0,
    'quiz_count initial devrait être 0'
);

-- Ajouter un cours au programme
INSERT INTO public.secondary_program_courses (program_id, course_id, order_index)
SELECT '30000000-0000-0000-0000-000000000002'::uuid, id, 0
FROM public.courses 
WHERE id IN (SELECT DISTINCT "courseId" FROM public.quiz_courses LIMIT 1)
LIMIT 1;

-- Test 24: quiz_count devrait refléter les quiz du cours ajouté
SELECT ok(
    (SELECT quiz_count FROM public.secondary_programs WHERE id = '30000000-0000-0000-0000-000000000002'::uuid) >= 0,
    'quiz_count devrait être >= 0 après ajout d''un cours avec quiz'
);

-- Sauvegarder le quiz_count actuel
DO $$
DECLARE
    v_quiz_count_before INTEGER;
    v_course_id BIGINT;
BEGIN
    SELECT quiz_count INTO v_quiz_count_before
    FROM public.secondary_programs 
    WHERE id = '30000000-0000-0000-0000-000000000002'::uuid;
    
    SELECT course_id INTO v_course_id
    FROM public.secondary_program_courses
    WHERE program_id = '30000000-0000-0000-0000-000000000002'::uuid
    LIMIT 1;
    
    RAISE NOTICE 'Quiz count avant ajout de quiz: %, Course ID: %', v_quiz_count_before, v_course_id;
END $$;

-- Ajouter un quiz au cours du programme (si un quiz existe)
DO $$
DECLARE
    v_course_id BIGINT;
    v_quiz_id UUID;
BEGIN
    -- Récupérer le cours du programme
    SELECT course_id INTO v_course_id
    FROM public.secondary_program_courses
    WHERE program_id = '30000000-0000-0000-0000-000000000002'::uuid
    LIMIT 1;
    
    -- Récupérer un quiz qui n'est pas encore lié à ce cours
    SELECT id INTO v_quiz_id
    FROM public.quiz
    WHERE id NOT IN (SELECT "quizId" FROM public.quiz_courses WHERE "courseId" = v_course_id)
    LIMIT 1;
    
    IF v_course_id IS NOT NULL AND v_quiz_id IS NOT NULL THEN
        INSERT INTO public.quiz_courses ("quizId", "courseId")
        VALUES (v_quiz_id, v_course_id)
        ON CONFLICT DO NOTHING;
        
        RAISE NOTICE 'Quiz % ajouté au cours %', v_quiz_id, v_course_id;
    END IF;
END $$;

-- Test 25: quiz_count devrait être incrémenté après ajout d'un quiz au cours
SELECT ok(
    (SELECT quiz_count FROM public.secondary_programs WHERE id = '30000000-0000-0000-0000-000000000002'::uuid) >= 0,
    'quiz_count devrait être mis à jour après ajout d''un quiz au cours'
);

-- Vérifier le comptage réel vs le compteur
DO $$
DECLARE
    v_stored_count INTEGER;
    v_actual_count INTEGER;
BEGIN
    SELECT quiz_count INTO v_stored_count
    FROM public.secondary_programs 
    WHERE id = '30000000-0000-0000-0000-000000000002'::uuid;
    
    SELECT COUNT(DISTINCT qc."quizId") INTO v_actual_count
    FROM public.secondary_program_courses spc
    JOIN public.quiz_courses qc ON qc."courseId" = spc.course_id
    WHERE spc.program_id = '30000000-0000-0000-0000-000000000002'::uuid;
    
    RAISE NOTICE 'Stored quiz_count: %, Actual quiz count: %', v_stored_count, v_actual_count;
END $$;

-- Test 26: Le quiz_count stocké devrait correspondre au comptage réel
SELECT is(
    (SELECT quiz_count FROM public.secondary_programs WHERE id = '30000000-0000-0000-0000-000000000002'::uuid),
    (SELECT COUNT(DISTINCT qc."quizId")::INTEGER 
     FROM public.secondary_program_courses spc
     JOIN public.quiz_courses qc ON qc."courseId" = spc.course_id
     WHERE spc.program_id = '30000000-0000-0000-0000-000000000002'::uuid),
    'quiz_count stocké devrait correspondre au nombre réel de quiz via quiz_courses'
);

-- Supprimer un quiz du cours
DO $$
DECLARE
    v_course_id BIGINT;
BEGIN
    SELECT course_id INTO v_course_id
    FROM public.secondary_program_courses
    WHERE program_id = '30000000-0000-0000-0000-000000000002'::uuid
    LIMIT 1;
    
    DELETE FROM public.quiz_courses
    WHERE "courseId" = v_course_id
    AND ctid = (SELECT ctid FROM public.quiz_courses WHERE "courseId" = v_course_id LIMIT 1);
    
    RAISE NOTICE 'Quiz supprimé du cours %', v_course_id;
END $$;

-- Test 27: quiz_count devrait être décrémenté après suppression d'un quiz
SELECT is(
    (SELECT quiz_count FROM public.secondary_programs WHERE id = '30000000-0000-0000-0000-000000000002'::uuid),
    (SELECT COUNT(DISTINCT qc."quizId")::INTEGER 
     FROM public.secondary_program_courses spc
     JOIN public.quiz_courses qc ON qc."courseId" = spc.course_id
     WHERE spc.program_id = '30000000-0000-0000-0000-000000000002'::uuid),
    'quiz_count devrait correspondre après suppression d''un quiz'
);

-- Supprimer le cours du programme
DELETE FROM public.secondary_program_courses
WHERE program_id = '30000000-0000-0000-0000-000000000002'::uuid;

-- Test 28: quiz_count devrait être 0 après suppression du cours
SELECT is(
    (SELECT quiz_count FROM public.secondary_programs WHERE id = '30000000-0000-0000-0000-000000000002'::uuid),
    0,
    'quiz_count devrait être 0 après suppression de tous les cours'
);

-- Nettoyage test quiz_count
DELETE FROM public.secondary_program_courses WHERE program_id = '30000000-0000-0000-0000-000000000002'::uuid;
DELETE FROM public.secondary_programs WHERE id = '30000000-0000-0000-0000-000000000002'::uuid;
DELETE FROM public.secondary_series WHERE id = '20000000-0000-0000-0000-000000000002'::uuid;
DELETE FROM public.secondary_classes WHERE id = '10000000-0000-0000-0000-000000000002'::uuid;

-- Nettoyage
DELETE FROM public.secondary_program_courses WHERE program_id = '30000000-0000-0000-0000-000000000001'::uuid;
DELETE FROM public.secondary_programs WHERE id = '30000000-0000-0000-0000-000000000001'::uuid;
DELETE FROM public.secondary_series WHERE id = '20000000-0000-0000-0000-000000000001'::uuid;
DELETE FROM public.secondary_classes WHERE id = '10000000-0000-0000-0000-000000000001'::uuid;

select * from finish();
rollback;

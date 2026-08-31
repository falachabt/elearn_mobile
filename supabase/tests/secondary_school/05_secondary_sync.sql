-- Test: Synchronisation automatique du système secondaire
-- Tests de synchronisation des exercices, quiz et corrections
begin;

select plan(37);

-- ========================================
-- PARTIE 1: SYNCHRONISATION EXERCICES & QUIZ
-- ========================================

-- Setup: Create test data
DELETE FROM public.secondary_classes WHERE name = 'Terminale';
INSERT INTO public.secondary_classes (id, name, level) VALUES 
    ('11111111-1111-1111-1111-111111111111', 'Terminale', 1);

INSERT INTO public.secondary_series (id, name, class_id) VALUES 
    ('22222222-2222-2222-2222-222222222222', 'Série S', '11111111-1111-1111-1111-111111111111'),
    ('88888888-8888-8888-8888-888888888888', 'Série C', '11111111-1111-1111-1111-111111111111');

INSERT INTO public.secondary_programs (id, class_id, series_id, price, duration) VALUES 
    ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 100, INTERVAL '1 year'),
    ('77777777-7777-7777-7777-777777777777', '11111111-1111-1111-1111-111111111111', '88888888-8888-8888-8888-888888888888', 150, INTERVAL '1 year');

INSERT INTO public.courses (id, name, status) VALUES 
    (9001, 'Mathématiques', TRUE),
    (9002, 'Physique', TRUE);

INSERT INTO public.exercices (id, course_id, title, content) VALUES 
    ('80000001-0000-0000-0000-000000000001', 9001, 'Exercice Math 1', '{}'),
    ('80000002-0000-0000-0000-000000000002', 9001, 'Exercice Math 2', '{}');

INSERT INTO public.quiz (id, name) VALUES 
    ('44444444-4444-4444-4444-444444444444', 'Quiz Math 1'),
    ('55555555-5555-5555-5555-555555555555', 'Quiz Math 2'),
    ('66666666-6666-6666-6666-666666666666', 'Quiz Physique');

INSERT INTO public.quiz_courses ("quizId", "courseId") VALUES 
    ('44444444-4444-4444-4444-444444444444', 9001),
    ('55555555-5555-5555-5555-555555555555', 9001);

-- Test 1: Ajouter un cours ajoute ses exercices aux programmes
INSERT INTO public.secondary_program_courses (program_id, course_id) VALUES 
    ('33333333-3333-3333-3333-333333333333', 9001),
    ('77777777-7777-7777-7777-777777777777', 9001);

SELECT is(
    (SELECT COUNT(*)::integer FROM public.secondary_program_exercises 
     WHERE exercise_id IN ('80000001-0000-0000-0000-000000000001', '80000002-0000-0000-0000-000000000002')),
    4,
    'Les 2 exercices ajoutés aux 2 programmes (4 entrées)'
);

-- Test 2: Nouvel exercice ajouté automatiquement
INSERT INTO public.exercices (id, course_id, title, content) VALUES 
    ('80000003-0000-0000-0000-000000000003', 9001, 'Exercice Math 3', '{}');

SELECT is(
    (SELECT COUNT(DISTINCT program_id)::integer FROM public.secondary_program_exercises 
     WHERE exercise_id = '80000003-0000-0000-0000-000000000003'),
    2,
    'Nouvel exercice ajouté aux 2 programmes'
);

-- Test 3: Exercices ajoutés avec is_active = TRUE
SELECT is(
    (SELECT COUNT(*)::integer FROM public.secondary_program_exercises 
     WHERE program_id IN ('33333333-3333-3333-3333-333333333333', '77777777-7777-7777-7777-777777777777')
     AND is_active = TRUE),
    6,
    'Tous les exercices avec is_active = TRUE'
);

-- Test 4-5: Retirer cours retire exercices
DELETE FROM public.secondary_program_courses 
WHERE program_id = '33333333-3333-3333-3333-333333333333' AND course_id = 9001;

SELECT is(
    (SELECT COUNT(*)::integer FROM public.secondary_program_exercises WHERE program_id = '33333333-3333-3333-3333-333333333333'),
    0,
    'Exercices retirés du programme 1'
);

SELECT is(
    (SELECT COUNT(*)::integer FROM public.secondary_program_exercises WHERE program_id = '77777777-7777-7777-7777-777777777777'),
    3,
    'Exercices conservés dans programme 2'
);

-- Test 6-7: Supprimer exercice le retire partout
DELETE FROM public.exercices WHERE id = '80000001-0000-0000-0000-000000000001';

SELECT ok(
    NOT EXISTS(SELECT 1 FROM public.secondary_program_exercises WHERE exercise_id = '80000001-0000-0000-0000-000000000001'),
    'Exercice supprimé retiré de tous les programmes'
);

SELECT is(
    (SELECT exercise_count FROM public.secondary_programs WHERE id = '77777777-7777-7777-7777-777777777777'),
    2,
    'Compteur exercise_count correct'
);

-- Test 8: Quiz ajoutés aux programmes
INSERT INTO public.secondary_program_courses (program_id, course_id) VALUES 
    ('33333333-3333-3333-3333-333333333333', 9001);

SELECT is(
    (SELECT COUNT(*)::integer FROM public.secondary_program_quizzes 
     WHERE quiz_id IN ('44444444-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555555')),
    4,
    'Les 2 quiz ajoutés aux 2 programmes'
);

-- Test 9: Nouveau quiz lié ajouté
INSERT INTO public.quiz (id, name) VALUES ('77777777-7777-7777-7777-777777777777', 'Quiz Math 3');
INSERT INTO public.quiz_courses ("quizId", "courseId") VALUES ('77777777-7777-7777-7777-777777777777', 9001);

SELECT is(
    (SELECT COUNT(DISTINCT program_id)::integer FROM public.secondary_program_quizzes 
     WHERE quiz_id = '77777777-7777-7777-7777-777777777777'),
    2,
    'Nouveau quiz ajouté aux 2 programmes'
);

-- Test 10: Quiz avec is_active = TRUE
SELECT is(
    (SELECT COUNT(*)::integer FROM public.secondary_program_quizzes 
     WHERE program_id IN ('33333333-3333-3333-3333-333333333333', '77777777-7777-7777-7777-777777777777')
     AND is_active = TRUE),
    6,
    'Tous les quiz avec is_active = TRUE'
);

-- Test 11-14: Quiz partagés
INSERT INTO public.quiz_courses ("quizId", "courseId") VALUES 
    ('66666666-6666-6666-6666-666666666666', 9002),
    ('44444444-4444-4444-4444-444444444444', 9002);

INSERT INTO public.secondary_program_courses (program_id, course_id) VALUES 
    ('77777777-7777-7777-7777-777777777777', 9002),
    ('33333333-3333-3333-3333-333333333333', 9002);

SELECT is(
    (SELECT COUNT(*)::integer FROM public.secondary_program_quizzes 
     WHERE program_id = '33333333-3333-3333-3333-333333333333'
     AND quiz_id IN ('44444444-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555555', '66666666-6666-6666-6666-666666666666')),
    3,
    'Programme 1: 3 quiz sans doublon'
);

DELETE FROM public.secondary_program_courses 
WHERE program_id = '33333333-3333-3333-3333-333333333333' AND course_id = 9001;

SELECT ok(
    EXISTS(SELECT 1 FROM public.secondary_program_quizzes 
           WHERE program_id = '33333333-3333-3333-3333-333333333333' 
           AND quiz_id = '44444444-4444-4444-4444-444444444444'),
    'Quiz partagé reste (lié via Physique)'
);

SELECT ok(
    NOT EXISTS(SELECT 1 FROM public.secondary_program_quizzes 
               WHERE program_id = '33333333-3333-3333-3333-333333333333' 
               AND quiz_id = '55555555-5555-5555-5555-555555555555'),
    'Quiz exclusif retiré'
);

SELECT ok(
    (SELECT COUNT(*)::integer FROM public.secondary_program_quizzes WHERE program_id = '77777777-7777-7777-7777-777777777777') >= 3,
    'Programme 2 conserve ses quiz'
);

-- Test 15-19: Délier quiz
DELETE FROM public.secondary_program_courses 
WHERE program_id = '33333333-3333-3333-3333-333333333333' AND course_id = 9002;

SELECT ok(
    NOT EXISTS(SELECT 1 FROM public.secondary_program_quizzes WHERE program_id = '33333333-3333-3333-3333-333333333333'),
    'Tous les quiz retirés après suppression de tous les cours'
);

DELETE FROM public.quiz_courses WHERE "quizId" = '77777777-7777-7777-7777-777777777777' AND "courseId" = 9001;

SELECT ok(
    NOT EXISTS(SELECT 1 FROM public.secondary_program_quizzes WHERE quiz_id = '77777777-7777-7777-7777-777777777777'),
    'Délier quiz le retire de tous les programmes'
);

DELETE FROM public.quiz_courses WHERE "quizId" = '44444444-4444-4444-4444-444444444444' AND "courseId" = 9002;

SELECT ok(
    EXISTS(SELECT 1 FROM public.secondary_program_quizzes 
           WHERE program_id = '77777777-7777-7777-7777-777777777777' 
           AND quiz_id = '44444444-4444-4444-4444-444444444444'),
    'Quiz partagé reste (encore lié via Math)'
);

DELETE FROM public.quiz_courses WHERE "quizId" = '44444444-4444-4444-4444-444444444444' AND "courseId" = 9001;

SELECT ok(
    NOT EXISTS(SELECT 1 FROM public.secondary_program_quizzes WHERE quiz_id = '44444444-4444-4444-4444-444444444444'),
    'Quiz retiré après suppression du dernier lien'
);

SELECT ok(
    (SELECT quiz_count FROM public.secondary_programs WHERE id = '77777777-7777-7777-7777-777777777777') >= 1,
    'Compteur quiz_count correct'
);

-- Test 20-23: Tests mixtes
INSERT INTO public.exercices (id, course_id, title, content) VALUES 
    ('80000004-0000-0000-0000-000000000004', 9002, 'Exercice Physique', '{}');

INSERT INTO public.secondary_program_courses (program_id, course_id) VALUES 
    ('33333333-3333-3333-3333-333333333333', 9002);

SELECT is(
    (SELECT COUNT(*)::integer FROM public.secondary_program_exercises 
     WHERE program_id = '33333333-3333-3333-3333-333333333333' 
     AND exercise_id = '80000004-0000-0000-0000-000000000004'),
    1,
    'Exercice Physique ajouté au programme 1'
);

SELECT is(
    (SELECT COUNT(*)::integer FROM public.secondary_program_exercises 
     WHERE program_id = '77777777-7777-7777-7777-777777777777' 
     AND exercise_id = '80000004-0000-0000-0000-000000000004'),
    1,
    'Exercice Physique ajouté au programme 2'
);

SELECT is(
    (SELECT COUNT(*)::integer FROM public.secondary_program_quizzes 
     WHERE program_id = '33333333-3333-3333-3333-333333333333' 
     AND quiz_id = '66666666-6666-6666-6666-666666666666'),
    1,
    'Quiz Physique ajouté au programme 1'
);

SELECT is(
    (SELECT COUNT(*)::integer FROM public.secondary_program_quizzes 
     WHERE program_id = '77777777-7777-7777-7777-777777777777' 
     AND quiz_id = '66666666-6666-6666-6666-666666666666'),
    1,
    'Quiz Physique ajouté au programme 2'
);

-- Test 24-25: Retirer cours retire exercices et quiz
DELETE FROM public.secondary_program_courses WHERE course_id = 9002;

SELECT ok(
    NOT EXISTS(SELECT 1 FROM public.secondary_program_exercises WHERE exercise_id = '80000004-0000-0000-0000-000000000004'),
    'Exercice Physique retiré des 2 programmes'
);

SELECT is(
    (SELECT COUNT(*)::integer FROM public.secondary_program_quizzes WHERE quiz_id = '66666666-6666-6666-6666-666666666666'),
    0,
    'Quiz Physique retiré des 2 programmes'
);

-- ========================================
-- PARTIE 2: SYNCHRONISATION CORRECTIONS
-- ========================================

-- Setup correction tests
DO $$
DECLARE
    v_program_id UUID;
    v_folder_id UUID;
    v_category_id UUID;
BEGIN
    SELECT id INTO v_program_id FROM secondary_programs LIMIT 1;
    INSERT INTO secondary_document_folders (program_id, name) VALUES (v_program_id, 'Test Folder') RETURNING id INTO v_folder_id;
    INSERT INTO courses_categories (name, description) VALUES ('Test Cat Sync', 'Test') RETURNING id INTO v_category_id;
    
    PERFORM set_config('test.folder_id', v_folder_id::text, false);
    PERFORM set_config('test.category_id', v_category_id::text, false);
END $$;

-- Test 26: Héritage du dossier à la création
DO $$
DECLARE
    v_doc_id UUID;
    v_corr_id UUID;
BEGIN
    INSERT INTO secondary_documents (folder_id, name, storage_path, is_correction)
    VALUES (current_setting('test.folder_id')::uuid, 'Doc1.pdf', 'doc1.pdf', FALSE)
    RETURNING id INTO v_doc_id;
    
    INSERT INTO secondary_documents (correction_document_id, name, storage_path, is_correction, folder_id)
    VALUES (v_doc_id, 'Corr1.pdf', 'corr1.pdf', TRUE, NULL)
    RETURNING id INTO v_corr_id;
    
    UPDATE secondary_documents SET correction_document_id = v_corr_id WHERE id = v_doc_id;
    
    PERFORM set_config('test.doc1_id', v_doc_id::text, false);
    PERFORM set_config('test.corr1_id', v_corr_id::text, false);
END $$;

SELECT is(
    (SELECT folder_id FROM secondary_documents WHERE id = current_setting('test.corr1_id')::uuid),
    current_setting('test.folder_id')::uuid,
    'Correction hérite du dossier'
);

-- Test 27: Héritage des catégories
DO $$
DECLARE
    v_doc2_id UUID;
    v_corr2_id UUID;
BEGIN
    INSERT INTO secondary_documents (folder_id, name, storage_path, is_correction)
    VALUES (current_setting('test.folder_id')::uuid, 'Doc2.pdf', 'doc2.pdf', FALSE)
    RETURNING id INTO v_doc2_id;
    
    INSERT INTO secondary_document_category_links (document_id, category_id)
    VALUES (v_doc2_id, current_setting('test.category_id')::uuid);
    
    INSERT INTO secondary_documents (correction_document_id, name, storage_path, is_correction, folder_id)
    VALUES (v_doc2_id, 'Corr2.pdf', 'corr2.pdf', TRUE, NULL)
    RETURNING id INTO v_corr2_id;
    
    UPDATE secondary_documents SET correction_document_id = v_corr2_id WHERE id = v_doc2_id;
    
    PERFORM set_config('test.doc2_id', v_doc2_id::text, false);
    PERFORM set_config('test.corr2_id', v_corr2_id::text, false);
END $$;

SELECT ok(
    EXISTS(SELECT 1 FROM secondary_document_category_links 
           WHERE document_id = current_setting('test.corr2_id')::uuid 
           AND category_id = current_setting('test.category_id')::uuid),
    'Correction hérite des catégories'
);

-- Test 28: Synchronisation changement de dossier
DO $$
DECLARE
    v_new_folder_id UUID;
BEGIN
    INSERT INTO secondary_document_folders (program_id, name)
    SELECT program_id, 'New Folder' FROM secondary_document_folders WHERE id = current_setting('test.folder_id')::uuid
    RETURNING id INTO v_new_folder_id;
    
    PERFORM set_config('test.new_folder_id', v_new_folder_id::text, false);
    
    UPDATE secondary_documents SET folder_id = v_new_folder_id WHERE id = current_setting('test.doc1_id')::uuid;
END $$;

SELECT is(
    (SELECT folder_id FROM secondary_documents WHERE id = current_setting('test.corr1_id')::uuid),
    current_setting('test.new_folder_id')::uuid,
    'Correction suit le changement de dossier'
);

-- Test 29-30: Synchronisation catégories
DO $$
DECLARE
    v_new_cat_id UUID;
BEGIN
    INSERT INTO courses_categories (name, description) VALUES ('New Cat Sync', 'Test') RETURNING id INTO v_new_cat_id;
    PERFORM set_config('test.new_cat_id', v_new_cat_id::text, false);
    
    INSERT INTO secondary_document_category_links (document_id, category_id)
    VALUES (current_setting('test.doc1_id')::uuid, v_new_cat_id);
END $$;

SELECT ok(
    EXISTS(SELECT 1 FROM secondary_document_category_links 
           WHERE document_id = current_setting('test.corr1_id')::uuid 
           AND category_id = current_setting('test.new_cat_id')::uuid),
    'Correction reçoit nouvelle catégorie'
);

DELETE FROM secondary_document_category_links
WHERE document_id = current_setting('test.doc1_id')::uuid
AND category_id = current_setting('test.new_cat_id')::uuid;

SELECT ok(
    NOT EXISTS(SELECT 1 FROM secondary_document_category_links 
               WHERE document_id = current_setting('test.corr1_id')::uuid 
               AND category_id = current_setting('test.new_cat_id')::uuid),
    'Catégorie supprimée de la correction'
);

-- Test 31-32: Ajout correction après coup
DO $$
DECLARE
    v_doc3_id UUID;
    v_corr3_id UUID;
BEGIN
    INSERT INTO secondary_documents (folder_id, name, storage_path, is_correction)
    VALUES (current_setting('test.folder_id')::uuid, 'Doc3.pdf', 'doc3.pdf', FALSE)
    RETURNING id INTO v_doc3_id;
    
    INSERT INTO secondary_document_category_links (document_id, category_id)
    VALUES (v_doc3_id, current_setting('test.category_id')::uuid);
    
    INSERT INTO secondary_documents (correction_document_id, name, storage_path, is_correction)
    VALUES (v_doc3_id, 'Corr3.pdf', 'corr3.pdf', TRUE)
    RETURNING id INTO v_corr3_id;
    
    PERFORM set_config('test.doc3_id', v_doc3_id::text, false);
    PERFORM set_config('test.corr3_id', v_corr3_id::text, false);
    
    UPDATE secondary_documents SET correction_document_id = v_corr3_id WHERE id = v_doc3_id;
END $$;

SELECT is(
    (SELECT folder_id FROM secondary_documents WHERE id = current_setting('test.corr3_id')::uuid),
    (SELECT folder_id FROM secondary_documents WHERE id = current_setting('test.doc3_id')::uuid),
    'Correction ajoutée après coup hérite du dossier'
);

SELECT ok(
    EXISTS(SELECT 1 FROM secondary_document_category_links 
           WHERE document_id = current_setting('test.corr3_id')::uuid 
           AND category_id = current_setting('test.category_id')::uuid),
    'Correction ajoutée après coup hérite des catégories'
);

-- Test 33: Suppression en cascade
DO $$
DECLARE
    v_doc4_id UUID;
    v_corr4_id UUID;
BEGIN
    INSERT INTO secondary_documents (folder_id, name, storage_path, is_correction)
    VALUES (current_setting('test.folder_id')::uuid, 'Doc4.pdf', 'doc4.pdf', FALSE)
    RETURNING id INTO v_doc4_id;
    
    INSERT INTO secondary_documents (correction_document_id, name, storage_path, is_correction, folder_id)
    VALUES (v_doc4_id, 'Corr4.pdf', 'corr4.pdf', TRUE, NULL)
    RETURNING id INTO v_corr4_id;
    
    PERFORM set_config('test.doc4_id', v_doc4_id::text, false);
    PERFORM set_config('test.corr4_id', v_corr4_id::text, false);
    
    UPDATE secondary_documents SET correction_document_id = v_corr4_id WHERE id = v_doc4_id;
    DELETE FROM secondary_documents WHERE id = v_doc4_id;
END $$;

SELECT ok(
    NOT EXISTS(SELECT 1 FROM secondary_documents WHERE id = current_setting('test.corr4_id')::uuid),
    'Correction supprimée avec document principal'
);

-- Test 34: Correction ne synchronise pas vers principal
DO $$
DECLARE
    v_doc5_id UUID;
    v_corr5_id UUID;
BEGIN
    INSERT INTO secondary_documents (folder_id, name, storage_path, is_correction)
    VALUES (current_setting('test.folder_id')::uuid, 'Doc5.pdf', 'doc5.pdf', FALSE)
    RETURNING id INTO v_doc5_id;
    
    INSERT INTO secondary_documents (correction_document_id, name, storage_path, is_correction, folder_id)
    VALUES (v_doc5_id, 'Corr5.pdf', 'corr5.pdf', TRUE, NULL)
    RETURNING id INTO v_corr5_id;
    
    UPDATE secondary_documents SET correction_document_id = v_corr5_id WHERE id = v_doc5_id;
    UPDATE secondary_documents SET folder_id = current_setting('test.new_folder_id')::uuid WHERE id = v_corr5_id;
END $$;

SELECT is(
    (SELECT folder_id FROM secondary_documents WHERE name = 'Doc5.pdf'),
    current_setting('test.folder_id')::uuid,
    'Changement correction n''affecte pas le principal'
);

-- Test 35-37: Vérifier triggers existent
SELECT ok(
    EXISTS(SELECT 1 FROM pg_trigger WHERE tgname = 'trig_delete_correction_with_document'),
    'Trigger delete_correction_with_document existe'
);

SELECT ok(
    EXISTS(SELECT 1 FROM pg_trigger WHERE tgname = 'trig_sync_exercises_on_course_add'),
    'Trigger sync_exercises_on_course_add existe'
);

SELECT ok(
    EXISTS(SELECT 1 FROM pg_trigger WHERE tgname = 'trig_sync_quizzes_on_course_add'),
    'Trigger sync_quizzes_on_course_add existe'
);

select * from finish();
rollback;

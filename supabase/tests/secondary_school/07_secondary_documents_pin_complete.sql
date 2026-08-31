-- Test: Vérification des fonctionnalités de documents épinglés et complétés
-- Ce test vérifie que les tables secondary_documents_pin et secondary_documents_complete fonctionnent correctement

begin;

select plan(20);

-- Nettoyage préalable
DELETE FROM public.secondary_documents_pin WHERE document_id IN (
    SELECT id FROM public.secondary_documents WHERE name = 'Test Document Pin Complete'
);
DELETE FROM public.secondary_documents_complete WHERE document_id IN (
    SELECT id FROM public.secondary_documents WHERE name = 'Test Document Pin Complete'
);
DELETE FROM public.secondary_documents WHERE name = 'Test Document Pin Complete';
DELETE FROM public.secondary_document_folders WHERE name = 'Test Folder Pin Complete';
DELETE FROM public.secondary_programs WHERE id IN (
    SELECT id FROM public.secondary_programs WHERE description = 'Test Program Pin Complete'
);
DELETE FROM public.secondary_series WHERE name = 'Test Series Pin Complete';
DELETE FROM public.secondary_classes WHERE name = 'Test Class Pin Complete';

-- Créer les données de test
INSERT INTO public.secondary_classes (name, description, level)
VALUES ('Test Class Pin Complete', 'Test class', 1);

INSERT INTO public.secondary_series (class_id, name, description)
SELECT id, 'Test Series Pin Complete', 'Test series'
FROM public.secondary_classes WHERE name = 'Test Class Pin Complete';

INSERT INTO public.secondary_programs (class_id, series_id, price, description)
SELECT sc.id, ss.id, 50.00, 'Test Program Pin Complete'
FROM public.secondary_classes sc
JOIN public.secondary_series ss ON ss.class_id = sc.id
WHERE sc.name = 'Test Class Pin Complete' AND ss.name = 'Test Series Pin Complete';

INSERT INTO public.secondary_document_folders (program_id, name, description)
SELECT id, 'Test Folder Pin Complete', 'Test folder'
FROM public.secondary_programs WHERE description = 'Test Program Pin Complete';

INSERT INTO public.secondary_documents (folder_id, name, description, storage_path)
SELECT id, 'Test Document Pin Complete', 'Test document', 'test/path.pdf'
FROM public.secondary_document_folders WHERE name = 'Test Folder Pin Complete';

-- ========================================
-- Tests de la table secondary_documents_complete
-- ========================================

-- Créer un utilisateur de test
DO $$
DECLARE
    v_test_user_id UUID := '00000000-0000-0000-0000-000000000001'::UUID;
BEGIN
    -- Insérer l'utilisateur de test s'il n'existe pas
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
    VALUES (
        v_test_user_id,
        'test_pin_complete@test.com',
        crypt('password123', gen_salt('bf')),
        NOW(),
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO NOTHING;
END $$;

-- Test 1: Vérifier qu'on peut insérer un document comme complété
DO $$
DECLARE
    v_doc_id UUID;
    v_user_id UUID := '00000000-0000-0000-0000-000000000001'::UUID;
BEGIN
    SELECT id INTO v_doc_id FROM public.secondary_documents WHERE name = 'Test Document Pin Complete';
    
    INSERT INTO public.secondary_documents_complete (user_id, document_id, is_completed)
    VALUES (v_user_id, v_doc_id, TRUE);
END $$;

SELECT isnt_empty(
    $$SELECT 1 FROM public.secondary_documents_complete 
      WHERE document_id IN (SELECT id FROM public.secondary_documents WHERE name = 'Test Document Pin Complete')$$,
    'On devrait pouvoir insérer un document comme complété'
);

-- Test 2: Vérifier que completed_at est défini automatiquement
SELECT isnt_empty(
    $$SELECT 1 FROM public.secondary_documents_complete 
      WHERE document_id IN (SELECT id FROM public.secondary_documents WHERE name = 'Test Document Pin Complete')
      AND completed_at IS NOT NULL$$,
    'La colonne completed_at devrait être définie automatiquement'
);

-- Test 3: Vérifier que created_at est défini automatiquement
SELECT isnt_empty(
    $$SELECT 1 FROM public.secondary_documents_complete 
      WHERE document_id IN (SELECT id FROM public.secondary_documents WHERE name = 'Test Document Pin Complete')
      AND created_at IS NOT NULL$$,
    'La colonne created_at devrait être définie automatiquement'
);

-- Test 4: Vérifier que updated_at est défini automatiquement
SELECT isnt_empty(
    $$SELECT 1 FROM public.secondary_documents_complete 
      WHERE document_id IN (SELECT id FROM public.secondary_documents WHERE name = 'Test Document Pin Complete')
      AND updated_at IS NOT NULL$$,
    'La colonne updated_at devrait être définie automatiquement'
);

-- Test 5: Vérifier que is_completed a la valeur par défaut TRUE
SELECT results_eq(
    $$SELECT is_completed FROM public.secondary_documents_complete 
      WHERE document_id IN (SELECT id FROM public.secondary_documents WHERE name = 'Test Document Pin Complete')$$,
    $$VALUES (TRUE)$$,
    'La valeur par défaut de is_completed devrait être TRUE'
);

-- Test 6: Vérifier qu'on ne peut pas insérer deux fois le même (user_id, document_id)
DO $$
DECLARE
    v_doc_id UUID;
    v_user_id UUID := '00000000-0000-0000-0000-000000000001'::UUID;
    v_error_raised BOOLEAN := FALSE;
BEGIN
    SELECT id INTO v_doc_id FROM public.secondary_documents WHERE name = 'Test Document Pin Complete';
    
    BEGIN
        INSERT INTO public.secondary_documents_complete (user_id, document_id, is_completed)
        VALUES (v_user_id, v_doc_id, TRUE);
    EXCEPTION WHEN unique_violation THEN
        v_error_raised := TRUE;
    END;
    
    IF NOT v_error_raised THEN
        RAISE EXCEPTION 'Une erreur unique_violation aurait dû être levée';
    END IF;
END $$;

SELECT ok(TRUE, 'La contrainte UNIQUE (user_id, document_id) devrait empêcher les doublons');

-- Test 7: Vérifier qu'on peut mettre à jour is_completed
DO $$
DECLARE
    v_doc_id UUID;
    v_user_id UUID := '00000000-0000-0000-0000-000000000001'::UUID;
BEGIN
    SELECT id INTO v_doc_id FROM public.secondary_documents WHERE name = 'Test Document Pin Complete';
    
    UPDATE public.secondary_documents_complete
    SET is_completed = FALSE
    WHERE user_id = v_user_id AND document_id = v_doc_id;
END $$;

SELECT results_eq(
    $$SELECT is_completed FROM public.secondary_documents_complete 
      WHERE document_id IN (SELECT id FROM public.secondary_documents WHERE name = 'Test Document Pin Complete')$$,
    $$VALUES (FALSE)$$,
    'On devrait pouvoir mettre à jour is_completed'
);

-- Test 8: Vérifier que le trigger updated_at fonctionne
DO $$
DECLARE
    v_doc_id UUID;
    v_user_id UUID := '00000000-0000-0000-0000-000000000001'::UUID;
    v_updated_at_before TIMESTAMPTZ;
    v_updated_at_after TIMESTAMPTZ;
BEGIN
    SELECT id INTO v_doc_id FROM public.secondary_documents WHERE name = 'Test Document Pin Complete';
    
    SELECT updated_at INTO v_updated_at_before 
    FROM public.secondary_documents_complete 
    WHERE user_id = v_user_id AND document_id = v_doc_id;
    
    PERFORM pg_sleep(1);
    
    UPDATE public.secondary_documents_complete
    SET is_completed = TRUE
    WHERE user_id = v_user_id AND document_id = v_doc_id;
    
    SELECT updated_at INTO v_updated_at_after 
    FROM public.secondary_documents_complete 
    WHERE user_id = v_user_id AND document_id = v_doc_id;
    
    IF v_updated_at_after <= v_updated_at_before THEN
        RAISE EXCEPTION 'updated_at devrait être mis à jour automatiquement';
    END IF;
END $$;

SELECT ok(TRUE, 'Le trigger updated_at devrait mettre à jour automatiquement le timestamp');

-- ========================================
-- Tests de la table secondary_documents_pin
-- ========================================

-- Créer un deuxième utilisateur de test pour les pins
DO $$
DECLARE
    v_test_user_id UUID := '00000000-0000-0000-0000-000000000002'::UUID;
BEGIN
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
    VALUES (
        v_test_user_id,
        'test_pin_complete2@test.com',
        crypt('password123', gen_salt('bf')),
        NOW(),
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO NOTHING;
END $$;

-- Test 9: Vérifier qu'on peut insérer un document comme épinglé
DO $$
DECLARE
    v_doc_id UUID;
    v_user_id UUID := '00000000-0000-0000-0000-000000000002'::UUID;
BEGIN
    SELECT id INTO v_doc_id FROM public.secondary_documents WHERE name = 'Test Document Pin Complete';
    
    INSERT INTO public.secondary_documents_pin (user_id, document_id, is_pinned)
    VALUES (v_user_id, v_doc_id, TRUE);
END $$;

SELECT isnt_empty(
    $$SELECT 1 FROM public.secondary_documents_pin 
      WHERE document_id IN (SELECT id FROM public.secondary_documents WHERE name = 'Test Document Pin Complete')$$,
    'On devrait pouvoir insérer un document comme épinglé'
);

-- Test 10: Vérifier que pinned_at est défini automatiquement
SELECT isnt_empty(
    $$SELECT 1 FROM public.secondary_documents_pin 
      WHERE document_id IN (SELECT id FROM public.secondary_documents WHERE name = 'Test Document Pin Complete')
      AND pinned_at IS NOT NULL$$,
    'La colonne pinned_at devrait être définie automatiquement'
);

-- Test 11: Vérifier que created_at est défini automatiquement
SELECT isnt_empty(
    $$SELECT 1 FROM public.secondary_documents_pin 
      WHERE document_id IN (SELECT id FROM public.secondary_documents WHERE name = 'Test Document Pin Complete')
      AND created_at IS NOT NULL$$,
    'La colonne created_at devrait être définie automatiquement'
);

-- Test 12: Vérifier que updated_at est défini automatiquement
SELECT isnt_empty(
    $$SELECT 1 FROM public.secondary_documents_pin 
      WHERE document_id IN (SELECT id FROM public.secondary_documents WHERE name = 'Test Document Pin Complete')
      AND updated_at IS NOT NULL$$,
    'La colonne updated_at devrait être définie automatiquement'
);

-- Test 13: Vérifier que is_pinned a la valeur par défaut TRUE
SELECT results_eq(
    $$SELECT is_pinned FROM public.secondary_documents_pin 
      WHERE document_id IN (SELECT id FROM public.secondary_documents WHERE name = 'Test Document Pin Complete')$$,
    $$VALUES (TRUE)$$,
    'La valeur par défaut de is_pinned devrait être TRUE'
);

-- Test 14: Vérifier qu'on ne peut pas insérer deux fois le même (user_id, document_id)
DO $$
DECLARE
    v_doc_id UUID;
    v_user_id UUID := '00000000-0000-0000-0000-000000000002'::UUID;
    v_error_raised BOOLEAN := FALSE;
BEGIN
    SELECT id INTO v_doc_id FROM public.secondary_documents WHERE name = 'Test Document Pin Complete';
    
    BEGIN
        INSERT INTO public.secondary_documents_pin (user_id, document_id, is_pinned)
        VALUES (v_user_id, v_doc_id, TRUE);
    EXCEPTION WHEN unique_violation THEN
        v_error_raised := TRUE;
    END;
    
    IF NOT v_error_raised THEN
        RAISE EXCEPTION 'Une erreur unique_violation aurait dû être levée';
    END IF;
END $$;

SELECT ok(TRUE, 'La contrainte UNIQUE (user_id, document_id) devrait empêcher les doublons');

-- Test 15: Vérifier qu'on peut mettre à jour is_pinned
DO $$
DECLARE
    v_doc_id UUID;
    v_user_id UUID := '00000000-0000-0000-0000-000000000002'::UUID;
BEGIN
    SELECT id INTO v_doc_id FROM public.secondary_documents WHERE name = 'Test Document Pin Complete';
    
    UPDATE public.secondary_documents_pin
    SET is_pinned = FALSE
    WHERE user_id = v_user_id AND document_id = v_doc_id;
END $$;

SELECT results_eq(
    $$SELECT is_pinned FROM public.secondary_documents_pin 
      WHERE document_id IN (SELECT id FROM public.secondary_documents WHERE name = 'Test Document Pin Complete')$$,
    $$VALUES (FALSE)$$,
    'On devrait pouvoir mettre à jour is_pinned'
);

-- Test 16: Vérifier que le trigger updated_at fonctionne
DO $$
DECLARE
    v_doc_id UUID;
    v_user_id UUID := '00000000-0000-0000-0000-000000000002'::UUID;
    v_updated_at_before TIMESTAMPTZ;
    v_updated_at_after TIMESTAMPTZ;
BEGIN
    SELECT id INTO v_doc_id FROM public.secondary_documents WHERE name = 'Test Document Pin Complete';
    
    SELECT updated_at INTO v_updated_at_before 
    FROM public.secondary_documents_pin 
    WHERE user_id = v_user_id AND document_id = v_doc_id;
    
    PERFORM pg_sleep(1);
    
    UPDATE public.secondary_documents_pin
    SET is_pinned = TRUE
    WHERE user_id = v_user_id AND document_id = v_doc_id;
    
    SELECT updated_at INTO v_updated_at_after 
    FROM public.secondary_documents_pin 
    WHERE user_id = v_user_id AND document_id = v_doc_id;
    
    IF v_updated_at_after <= v_updated_at_before THEN
        RAISE EXCEPTION 'updated_at devrait être mis à jour automatiquement';
    END IF;
END $$;

SELECT ok(TRUE, 'Le trigger updated_at devrait mettre à jour automatiquement le timestamp');

-- ========================================
-- Tests de CASCADE DELETE
-- ========================================

-- Test 17: Vérifier que la suppression d'un document supprime les entrées de complete
DO $$
DECLARE
    v_doc_id UUID;
BEGIN
    SELECT id INTO v_doc_id FROM public.secondary_documents WHERE name = 'Test Document Pin Complete';
    
    -- Supprimer le document
    DELETE FROM public.secondary_documents WHERE id = v_doc_id;
END $$;

SELECT is_empty(
    $$SELECT 1 FROM public.secondary_documents_complete 
      WHERE document_id IN (SELECT id FROM public.secondary_documents WHERE name = 'Test Document Pin Complete')$$,
    'La suppression d''un document devrait supprimer ses entrées dans secondary_documents_complete'
);

-- Test 18: Vérifier que la suppression d'un document supprime les entrées de pin
SELECT is_empty(
    $$SELECT 1 FROM public.secondary_documents_pin 
      WHERE document_id IN (SELECT id FROM public.secondary_documents WHERE name = 'Test Document Pin Complete')$$,
    'La suppression d''un document devrait supprimer ses entrées dans secondary_documents_pin'
);

-- ========================================
-- Tests d'index
-- ========================================

-- Test 19: Vérifier que l'index sur user_id existe pour complete
SELECT has_index(
    'public',
    'secondary_documents_complete',
    'idx_secondary_documents_complete_user_id',
    'L''index idx_secondary_documents_complete_user_id devrait exister'
);

-- Test 20: Vérifier que l'index sur user_id existe pour pin
SELECT has_index(
    'public',
    'secondary_documents_pin',
    'idx_secondary_documents_pin_user_id',
    'L''index idx_secondary_documents_pin_user_id devrait exister'
);

-- Nettoyage
DELETE FROM public.secondary_documents_pin WHERE document_id IN (
    SELECT id FROM public.secondary_documents WHERE name = 'Test Document Pin Complete'
);
DELETE FROM public.secondary_documents_complete WHERE document_id IN (
    SELECT id FROM public.secondary_documents WHERE name = 'Test Document Pin Complete'
);
DELETE FROM public.secondary_documents WHERE name = 'Test Document Pin Complete';
DELETE FROM public.secondary_document_folders WHERE name = 'Test Folder Pin Complete';
DELETE FROM public.secondary_programs WHERE description = 'Test Program Pin Complete';
DELETE FROM public.secondary_series WHERE name = 'Test Series Pin Complete';
DELETE FROM public.secondary_classes WHERE name = 'Test Class Pin Complete';

-- Supprimer les utilisateurs de test
DELETE FROM auth.users WHERE email IN ('test_pin_complete@test.com', 'test_pin_complete2@test.com');

select * from finish();

rollback;

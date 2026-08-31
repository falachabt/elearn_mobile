-- Test: Système de documents avec dossiers et catégories
begin;

select plan(21);

-- ========================================
-- Tests d'intégration: Dossiers hiérarchiques
-- ========================================

-- Test 1: Créer un programme de test
DO $$
DECLARE
    v_class_id UUID;
    v_series_id UUID;
    v_program_id UUID;
BEGIN
    INSERT INTO secondary_classes (name, level) VALUES ('Terminale Test', 1) RETURNING id INTO v_class_id;
    INSERT INTO secondary_series (class_id, name) VALUES (v_class_id, 'C') RETURNING id INTO v_series_id;
    INSERT INTO secondary_programs (class_id, series_id, price) VALUES (v_class_id, v_series_id, 50.00) RETURNING id INTO v_program_id;
    PERFORM set_config('test.program_id', v_program_id::text, false);
END $$;

SELECT ok(current_setting('test.program_id')::uuid IS NOT NULL, 'Programme de test créé');

-- Test 2: Créer un dossier racine
DO $$
DECLARE
    v_folder_id UUID;
BEGIN
    INSERT INTO secondary_document_folders (program_id, name, parent_folder_id)
    VALUES (current_setting('test.program_id')::uuid, 'Mathématiques', NULL)
    RETURNING id INTO v_folder_id;
    PERFORM set_config('test.folder_id', v_folder_id::text, false);
END $$;

SELECT ok(current_setting('test.folder_id')::uuid IS NOT NULL, 'Dossier racine créé');

-- Test 3: Créer un sous-dossier
DO $$
DECLARE
    v_subfolder_id UUID;
BEGIN
    INSERT INTO secondary_document_folders (program_id, name, parent_folder_id)
    VALUES (
        current_setting('test.program_id')::uuid,
        'Algèbre',
        current_setting('test.folder_id')::uuid
    )
    RETURNING id INTO v_subfolder_id;
    PERFORM set_config('test.subfolder_id', v_subfolder_id::text, false);
END $$;

SELECT ok(current_setting('test.subfolder_id')::uuid IS NOT NULL, 'Sous-dossier créé');

-- Test 4: Vérifier la hiérarchie des dossiers
SELECT is(
    (SELECT parent_folder_id FROM secondary_document_folders WHERE id = current_setting('test.subfolder_id')::uuid),
    current_setting('test.folder_id')::uuid,
    'Le sous-dossier devrait avoir le bon parent'
);

-- ========================================
-- Tests d'intégration: Documents
-- ========================================

-- Test 5: Créer un document dans le dossier
DO $$
DECLARE
    v_doc_id UUID;
BEGIN
    INSERT INTO secondary_documents (folder_id, name, storage_path, file_type, file_size)
    VALUES (
        current_setting('test.folder_id')::uuid,
        'Cours Algèbre.pdf',
        'secondary-documents/test/cours-algebre.pdf',
        'pdf',
        1024000
    )
    RETURNING id INTO v_doc_id;
    PERFORM set_config('test.doc_id', v_doc_id::text, false);
END $$;

SELECT ok(current_setting('test.doc_id')::uuid IS NOT NULL, 'Document créé');

-- Test 6: Vérifier les propriétés du document
SELECT is(
    (SELECT file_type FROM secondary_documents WHERE id = current_setting('test.doc_id')::uuid),
    'pdf',
    'Le type de fichier devrait être pdf'
);

-- Test 7: Lier le document au programme
INSERT INTO secondary_program_documents (program_id, document_id)
VALUES (current_setting('test.program_id')::uuid, current_setting('test.doc_id')::uuid);

SELECT ok(
    EXISTS(
        SELECT 1 FROM secondary_program_documents 
        WHERE program_id = current_setting('test.program_id')::uuid 
        AND document_id = current_setting('test.doc_id')::uuid
    ),
    'Document lié au programme'
);

-- Test 8: Vérifier que document_count est mis à jour
SELECT is(
    (SELECT document_count FROM secondary_programs WHERE id = current_setting('test.program_id')::uuid),
    1,
    'Le compteur document_count devrait être 1'
);

-- ========================================
-- Tests: Catégories existantes
-- ========================================

-- Test 9: Créer une catégorie de test
DO $$
DECLARE
    v_cat_id UUID;
BEGIN
    INSERT INTO courses_categories (name, description) VALUES ('Test Math', 'Catégorie test') RETURNING id INTO v_cat_id;
    PERFORM set_config('test.category_id', v_cat_id::text, false);
END $$;

SELECT ok(current_setting('test.category_id')::uuid IS NOT NULL, 'Catégorie créée');

-- Test 10: Lier le document à la catégorie
INSERT INTO secondary_document_category_links (document_id, category_id)
VALUES (current_setting('test.doc_id')::uuid, current_setting('test.category_id')::uuid);

SELECT ok(
    EXISTS(
        SELECT 1 FROM secondary_document_category_links 
        WHERE document_id = current_setting('test.doc_id')::uuid
    ),
    'Document lié à une catégorie'
);

-- Test 11: Un document peut avoir plusieurs catégories
DO $$
DECLARE
    v_cat2_id UUID;
BEGIN
    INSERT INTO courses_categories (name, description) VALUES ('Test Cours', 'Catégorie test 2') RETURNING id INTO v_cat2_id;
    INSERT INTO secondary_document_category_links (document_id, category_id)
    VALUES (current_setting('test.doc_id')::uuid, v_cat2_id);
END $$;

SELECT is(
    (SELECT COUNT(*)::integer FROM secondary_document_category_links WHERE document_id = current_setting('test.doc_id')::uuid),
    2,
    'Un document peut avoir plusieurs catégories'
);

-- ========================================
-- Tests: Contraintes et cascades
-- ========================================

-- Test 12: Contrainte UNIQUE sur (document_id, category_id)
SELECT throws_ok(
    format('INSERT INTO secondary_document_category_links (document_id, category_id) VALUES (%L, %L)',
        current_setting('test.doc_id')::uuid,
        current_setting('test.category_id')::uuid
    ),
    '23505',
    NULL,
    'Devrait empêcher les doublons document-catégorie'
);

-- Test 13: Contrainte UNIQUE sur (program_id, document_id)
SELECT throws_ok(
    format('INSERT INTO secondary_program_documents (program_id, document_id) VALUES (%L, %L)',
        current_setting('test.program_id')::uuid,
        current_setting('test.doc_id')::uuid
    ),
    '23505',
    NULL,
    'Devrait empêcher les doublons programme-document'
);

-- Test 14: Créer un second document
DO $$
DECLARE
    v_doc2_id UUID;
BEGIN
    INSERT INTO secondary_documents (folder_id, name, storage_path)
    VALUES (
        current_setting('test.folder_id')::uuid,
        'Exercices.pdf',
        'secondary-documents/test/exercices.pdf'
    )
    RETURNING id INTO v_doc2_id;
    
    INSERT INTO secondary_program_documents (program_id, document_id)
    VALUES (current_setting('test.program_id')::uuid, v_doc2_id);
END $$;

SELECT is(
    (SELECT document_count FROM secondary_programs WHERE id = current_setting('test.program_id')::uuid),
    2,
    'Le compteur devrait être 2 après ajout d''un second document'
);

-- Test 15: Supprimer un document met à jour le compteur
DELETE FROM secondary_program_documents 
WHERE program_id = current_setting('test.program_id')::uuid 
AND document_id = current_setting('test.doc_id')::uuid;

SELECT is(
    (SELECT document_count FROM secondary_programs WHERE id = current_setting('test.program_id')::uuid),
    1,
    'Le compteur devrait être 1 après suppression'
);

-- Test 16: Cascade DELETE dossier -> documents
DO $$
DECLARE
    v_folder_id UUID;
    v_doc_id UUID;
BEGIN
    INSERT INTO secondary_document_folders (program_id, name)
    VALUES (current_setting('test.program_id')::uuid, 'Temp Folder')
    RETURNING id INTO v_folder_id;
    
    INSERT INTO secondary_documents (folder_id, name, storage_path)
    VALUES (v_folder_id, 'Temp.pdf', 'temp.pdf')
    RETURNING id INTO v_doc_id;
    
    DELETE FROM secondary_document_folders WHERE id = v_folder_id;
    
    IF EXISTS(SELECT 1 FROM secondary_documents WHERE id = v_doc_id) THEN
        RAISE EXCEPTION 'Document devrait être supprimé avec le dossier';
    END IF;
END $$;

SELECT ok(true, 'CASCADE DELETE fonctionne pour dossier -> documents');

-- Test 17: order_index fonctionne
UPDATE secondary_document_folders SET order_index = 10 WHERE id = current_setting('test.folder_id')::uuid;
UPDATE secondary_documents SET order_index = 5 WHERE id = current_setting('test.doc_id')::uuid;

SELECT ok(
    (SELECT order_index FROM secondary_document_folders WHERE id = current_setting('test.folder_id')::uuid) = 10,
    'order_index fonctionne pour les dossiers'
);

-- Test 18: is_active fonctionne
UPDATE secondary_program_documents 
SET is_active = false 
WHERE program_id = current_setting('test.program_id')::uuid;

SELECT ok(
    (SELECT is_active FROM secondary_program_documents WHERE program_id = current_setting('test.program_id')::uuid LIMIT 1) = false,
    'is_active peut être désactivé'
);

-- Test 19: Vérifier les timestamps
SELECT ok(
    (SELECT created_at FROM secondary_documents WHERE id = current_setting('test.doc_id')::uuid) IS NOT NULL,
    'created_at devrait être défini automatiquement'
);

-- Test 20: Vérifier updated_at
SELECT ok(
    (SELECT updated_at FROM secondary_document_folders WHERE id = current_setting('test.folder_id')::uuid) IS NOT NULL,
    'updated_at devrait être défini automatiquement'
);

-- Test 21: Lier un document à son corrigé
DO $$
DECLARE
    v_exercice_id UUID;
    v_correction_id UUID;
BEGIN
    -- Créer un document exercice (principal)
    INSERT INTO secondary_documents (folder_id, name, storage_path, is_correction)
    VALUES (
        current_setting('test.folder_id')::uuid,
        'Exercice 1.pdf',
        'secondary-documents/test/exercice1.pdf',
        FALSE
    )
    RETURNING id INTO v_exercice_id;
    
    -- Créer un document correction
    INSERT INTO secondary_documents (folder_id, name, storage_path, is_correction)
    VALUES (
        current_setting('test.folder_id')::uuid,
        'Correction Exercice 1.pdf',
        'secondary-documents/test/correction-exercice1.pdf',
        TRUE
    )
    RETURNING id INTO v_correction_id;
    
    -- Lier l'exercice à sa correction
    UPDATE secondary_documents
    SET correction_document_id = v_correction_id
    WHERE id = v_exercice_id;
    
    -- Vérifier le lien et le flag is_correction
    IF (SELECT correction_document_id FROM secondary_documents WHERE id = v_exercice_id) = v_correction_id 
       AND (SELECT is_correction FROM secondary_documents WHERE id = v_correction_id) = TRUE THEN
        RAISE NOTICE 'Document lié à son corrigé avec succès';
    ELSE
        RAISE EXCEPTION 'Erreur lors de la liaison du document à son corrigé';
    END IF;
END $$;

SELECT ok(true, 'Un document peut être lié à son document de correction avec is_correction=TRUE');

select * from finish();
rollback;

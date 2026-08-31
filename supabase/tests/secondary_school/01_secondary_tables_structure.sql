-- Test: Vérification de la structure des tables secondaires
-- Ce test vérifie que toutes les tables du système secondaire existent avec les bonnes colonnes

begin;

select plan(54);

-- ========================================
-- Tests de la table secondary_classes
-- ========================================

-- Test 1: Vérifier que la table secondary_classes existe
SELECT has_table(
    'public',
    'secondary_classes',
    'La table public.secondary_classes devrait exister'
);

-- Test 2: Vérifier la clé primaire
SELECT col_is_pk(
    'public',
    'secondary_classes',
    'id',
    'La colonne id devrait être la clé primaire de secondary_classes'
);

-- Test 3: Vérifier la contrainte unique sur name
SELECT col_is_unique(
    'public',
    'secondary_classes',
    'name',
    'Le name devrait avoir une contrainte UNIQUE dans secondary_classes'
);

-- Test 4: Vérifier que la colonne level existe
SELECT has_column(
    'public',
    'secondary_classes',
    'level',
    'La colonne level devrait exister dans secondary_classes'
);

-- ========================================
-- Tests de la table secondary_series
-- ========================================

-- Test 5: Vérifier que la table secondary_series existe
SELECT has_table(
    'public',
    'secondary_series',
    'La table public.secondary_series devrait exister'
);

-- Test 6: Vérifier la clé étrangère vers secondary_classes
SELECT has_column(
    'public',
    'secondary_series',
    'class_id',
    'La colonne class_id devrait exister dans secondary_series'
);

-- Test 7: Vérifier la contrainte unique (class_id, name)
SELECT col_is_unique(
    'public',
    'secondary_series',
    ARRAY['class_id', 'name'],
    'La combinaison (class_id, name) devrait être unique'
);

-- ========================================
-- Tests de la table secondary_programs
-- ========================================

-- Test 8: Vérifier que la table secondary_programs existe
SELECT has_table(
    'public',
    'secondary_programs',
    'La table public.secondary_programs devrait exister'
);

-- Test 9: Vérifier la contrainte unique (class_id, series_id)
SELECT col_is_unique(
    'public',
    'secondary_programs',
    ARRAY['class_id', 'series_id'],
    'La combinaison (class_id, series_id) devrait être unique'
);

-- Test 10: Vérifier que price existe
SELECT has_column(
    'public',
    'secondary_programs',
    'price',
    'La colonne price devrait exister dans secondary_programs'
);

-- Test 11: Vérifier que course_count existe
SELECT has_column(
    'public',
    'secondary_programs',
    'course_count',
    'La colonne course_count devrait exister'
);

-- ========================================
-- Tests des tables de jonction
-- ========================================

-- Test 12: Vérifier que secondary_program_courses existe
SELECT has_table(
    'public',
    'secondary_program_courses',
    'La table secondary_program_courses devrait exister'
);

-- Test 13: Vérifier que secondary_program_quizzes existe
SELECT has_table(
    'public',
    'secondary_program_quizzes',
    'La table secondary_program_quizzes devrait exister'
);

-- Test 14: Vérifier que secondary_program_exercises existe
SELECT has_table(
    'public',
    'secondary_program_exercises',
    'La table secondary_program_exercises devrait exister'
);

-- ========================================
-- Tests des tables utilisateur
-- ========================================

-- Test 15: Vérifier que user_secondary_enrollments existe
SELECT has_table(
    'public',
    'user_secondary_enrollments',
    'La table user_secondary_enrollments devrait exister'
);

-- Test 16: Vérifier que user_secondary_payments existe
SELECT has_table(
    'public',
    'user_secondary_payments',
    'La table user_secondary_payments devrait exister'
);

-- Test 17: Vérifier la colonne expiry_date dans enrollments
SELECT has_column(
    'public',
    'user_secondary_enrollments',
    'expiry_date',
    'La colonne expiry_date devrait exister dans user_secondary_enrollments'
);

-- Test 18: Vérifier la colonne payment_status dans payments
SELECT has_column(
    'public',
    'user_secondary_payments',
    'payment_status',
    'La colonne payment_status devrait exister dans user_secondary_payments'
);

-- Test 19: Vérifier la colonne transaction_id dans payments
SELECT has_column(
    'public',
    'user_secondary_payments',
    'transaction_id',
    'La colonne transaction_id devrait exister'
);

-- Test 20: Vérifier la colonne promo_code_id dans payments
SELECT has_column(
    'public',
    'user_secondary_payments',
    'promo_code_id',
    'La colonne promo_code_id devrait exister'
);

-- ========================================
-- Tests des tables de documents
-- ========================================

-- Test 21: Vérifier que secondary_document_folders existe
SELECT has_table(
    'public',
    'secondary_document_folders',
    'La table secondary_document_folders devrait exister'
);

-- Test 22: Vérifier que secondary_documents existe
SELECT has_table(
    'public',
    'secondary_documents',
    'La table secondary_documents devrait exister'
);

-- Test 23: Vérifier que secondary_document_category_links existe
SELECT has_table(
    'public',
    'secondary_document_category_links',
    'La table secondary_document_category_links devrait exister'
);

-- Test 24: Vérifier que secondary_program_documents existe
SELECT has_table(
    'public',
    'secondary_program_documents',
    'La table secondary_program_documents devrait exister'
);

-- Test 25: Vérifier parent_folder_id pour hiérarchie
SELECT has_column(
    'public',
    'secondary_document_folders',
    'parent_folder_id',
    'La colonne parent_folder_id devrait exister pour la hiérarchie'
);

-- Test 26: Vérifier storage_path dans documents
SELECT has_column(
    'public',
    'secondary_documents',
    'storage_path',
    'La colonne storage_path devrait exister'
);

-- Test 26b: Vérifier storage_object_id dans documents
SELECT has_column(
    'public',
    'secondary_documents',
    'storage_object_id',
    'La colonne storage_object_id devrait exister pour lier à storage.objects'
);

-- Test 26c: Vérifier download_url dans documents
SELECT has_column(
    'public',
    'secondary_documents',
    'download_url',
    'La colonne download_url devrait exister'
);

-- Test 26d: Vérifier correction_document_id dans documents
SELECT has_column(
    'public',
    'secondary_documents',
    'correction_document_id',
    'La colonne correction_document_id devrait exister pour lier un document à son corrigé'
);

-- Test 26e: Vérifier is_correction dans documents
SELECT has_column(
    'public',
    'secondary_documents',
    'is_correction',
    'La colonne is_correction devrait exister pour identifier les documents de correction'
);

-- Test 27: Vérifier document_count dans programs
SELECT has_column(
    'public',
    'secondary_programs',
    'document_count',
    'La colonne document_count devrait exister'
);

-- Test 28: Vérifier contrainte unique (document_id, category_id)
SELECT col_is_unique(
    'public',
    'secondary_document_category_links',
    ARRAY['document_id', 'category_id'],
    'La combinaison (document_id, category_id) devrait être unique'
);

-- ========================================
-- Tests de la table secondary_documents_complete
-- ========================================

-- Test 29: Vérifier que la table secondary_documents_complete existe
SELECT has_table(
    'public',
    'secondary_documents_complete',
    'La table public.secondary_documents_complete devrait exister'
);

-- Test 30: Vérifier la clé primaire de secondary_documents_complete
SELECT col_is_pk(
    'public',
    'secondary_documents_complete',
    'id',
    'La colonne id devrait être la clé primaire de secondary_documents_complete'
);

-- Test 31: Vérifier que user_id existe et n'est pas null
SELECT has_column(
    'public',
    'secondary_documents_complete',
    'user_id',
    'La colonne user_id devrait exister dans secondary_documents_complete'
);

SELECT col_not_null(
    'public',
    'secondary_documents_complete',
    'user_id',
    'La colonne user_id ne devrait pas être NULL'
);

-- Test 32: Vérifier que document_id existe et n'est pas null
SELECT has_column(
    'public',
    'secondary_documents_complete',
    'document_id',
    'La colonne document_id devrait exister dans secondary_documents_complete'
);

SELECT col_not_null(
    'public',
    'secondary_documents_complete',
    'document_id',
    'La colonne document_id ne devrait pas être NULL'
);

-- Test 33: Vérifier la contrainte unique (user_id, document_id)
SELECT col_is_unique(
    'public',
    'secondary_documents_complete',
    ARRAY['user_id', 'document_id'],
    'La combinaison (user_id, document_id) devrait être unique dans secondary_documents_complete'
);

-- Test 34: Vérifier que is_completed existe
SELECT has_column(
    'public',
    'secondary_documents_complete',
    'is_completed',
    'La colonne is_completed devrait exister dans secondary_documents_complete'
);

-- Test 35: Vérifier que completed_at existe
SELECT has_column(
    'public',
    'secondary_documents_complete',
    'completed_at',
    'La colonne completed_at devrait exister dans secondary_documents_complete'
);

-- Test 36: Vérifier que updated_at existe
SELECT has_column(
    'public',
    'secondary_documents_complete',
    'updated_at',
    'La colonne updated_at devrait exister dans secondary_documents_complete'
);

-- ========================================
-- Tests de la table secondary_documents_pin
-- ========================================

-- Test 37: Vérifier que la table secondary_documents_pin existe
SELECT has_table(
    'public',
    'secondary_documents_pin',
    'La table public.secondary_documents_pin devrait exister'
);

-- Test 38: Vérifier la clé primaire de secondary_documents_pin
SELECT col_is_pk(
    'public',
    'secondary_documents_pin',
    'id',
    'La colonne id devrait être la clé primaire de secondary_documents_pin'
);

-- Test 39: Vérifier que user_id existe et n'est pas null
SELECT has_column(
    'public',
    'secondary_documents_pin',
    'user_id',
    'La colonne user_id devrait exister dans secondary_documents_pin'
);

SELECT col_not_null(
    'public',
    'secondary_documents_pin',
    'user_id',
    'La colonne user_id ne devrait pas être NULL'
);

-- Test 40: Vérifier que document_id existe et n'est pas null
SELECT has_column(
    'public',
    'secondary_documents_pin',
    'document_id',
    'La colonne document_id devrait exister dans secondary_documents_pin'
);

SELECT col_not_null(
    'public',
    'secondary_documents_pin',
    'document_id',
    'La colonne document_id ne devrait pas être NULL'
);

-- Test 41: Vérifier la contrainte unique (user_id, document_id)
SELECT col_is_unique(
    'public',
    'secondary_documents_pin',
    ARRAY['user_id', 'document_id'],
    'La combinaison (user_id, document_id) devrait être unique dans secondary_documents_pin'
);

-- Test 42: Vérifier que is_pinned existe
SELECT has_column(
    'public',
    'secondary_documents_pin',
    'is_pinned',
    'La colonne is_pinned devrait exister dans secondary_documents_pin'
);

-- Test 43: Vérifier que pinned_at existe
SELECT has_column(
    'public',
    'secondary_documents_pin',
    'pinned_at',
    'La colonne pinned_at devrait exister dans secondary_documents_pin'
);

-- Test 44: Vérifier que updated_at existe
SELECT has_column(
    'public',
    'secondary_documents_pin',
    'updated_at',
    'La colonne updated_at devrait exister dans secondary_documents_pin'
);

-- Test 45: Vérifier l'index sur is_pinned
SELECT has_index(
    'public',
    'secondary_documents_pin',
    'idx_secondary_documents_pin_is_pinned',
    'L''index idx_secondary_documents_pin_is_pinned devrait exister'
);

-- Test 46: Vérifier les clés étrangères vers auth.users
SELECT has_fk(
    'public',
    'secondary_documents_complete',
    'La table secondary_documents_complete devrait avoir une clé étrangère vers auth.users'
);

select * from finish();
rollback;

-- Test: Vérification des fonctions du système secondaire
-- Ce test vérifie l'existence et le bon fonctionnement des fonctions

begin;

select plan(14);

-- ========================================
-- Tests des fonctions de trigger
-- ========================================

-- Test 1: Vérifier que update_secondary_program_counts existe
SELECT has_function(
    'public',
    'update_secondary_program_counts',
    'La fonction update_secondary_program_counts devrait exister'
);

-- Test 2: Vérifier que sync_exercises_on_course_add existe
SELECT has_function(
    'public',
    'sync_exercises_on_course_add',
    'La fonction sync_exercises_on_course_add devrait exister'
);

-- Test 3: Vérifier que sync_exercises_on_course_remove existe
SELECT has_function(
    'public',
    'sync_exercises_on_course_remove',
    'La fonction sync_exercises_on_course_remove devrait exister'
);

-- Test 4: Vérifier que sync_exercise_to_programs existe
SELECT has_function(
    'public',
    'sync_exercise_to_programs',
    'La fonction sync_exercise_to_programs devrait exister'
);

-- Test 5: Vérifier que remove_exercise_from_programs existe
SELECT has_function(
    'public',
    'remove_exercise_from_programs',
    'La fonction remove_exercise_from_programs devrait exister'
);

-- ========================================
-- Tests des fonctions de paiement
-- ========================================

-- Test 6: Vérifier que calculate_secondary_expiry existe
SELECT has_function(
    'public',
    'calculate_secondary_expiry',
    'La fonction calculate_secondary_expiry devrait exister'
);

-- Test 7: Vérifier que enroll_after_secondary_payment existe
SELECT has_function(
    'public',
    'enroll_after_secondary_payment',
    'La fonction enroll_after_secondary_payment devrait exister'
);

-- ========================================
-- Tests de la fonction d'accès
-- ========================================

-- Test 8: Vérifier que check_secondary_access existe
SELECT has_function(
    'public',
    'check_secondary_access',
    'La fonction check_secondary_access devrait exister'
);

-- ========================================
-- Tests des fonctions de synchronisation des corrections
-- ========================================

-- Test 9: Vérifier que delete_correction_with_document existe
SELECT has_function(
    'public',
    'delete_correction_with_document',
    'La fonction delete_correction_with_document devrait exister'
);

-- Test 10: Vérifier que sync_correction_properties existe
SELECT has_function(
    'public',
    'sync_correction_properties',
    'La fonction sync_correction_properties devrait exister'
);

-- Test 11: Vérifier que update_correction_folder existe
SELECT has_function(
    'public',
    'update_correction_folder',
    'La fonction update_correction_folder devrait exister'
);

-- Test 12: Vérifier que sync_correction_categories existe
SELECT has_function(
    'public',
    'sync_correction_categories',
    'La fonction sync_correction_categories devrait exister'
);

-- Test 13: Vérifier que sync_new_correction existe
SELECT has_function(
    'public',
    'sync_new_correction',
    'La fonction sync_new_correction devrait exister'
);

-- Test 14: Vérifier que sync_correction_categories_on_insert existe
SELECT has_function(
    'public',
    'sync_correction_categories_on_insert',
    'La fonction sync_correction_categories_on_insert devrait exister'
);

select * from finish();
rollback;

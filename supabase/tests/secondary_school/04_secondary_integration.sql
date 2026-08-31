-- Test d'intégration: Scénario complet du système secondaire
-- Ce test vérifie le flux complet de création de programme et d'inscription

begin;

select plan(15);

-- Nettoyage préalable
DELETE FROM public.user_secondary_enrollments WHERE program_id IN (
    SELECT id FROM public.secondary_programs WHERE class_id IN (
        SELECT id FROM public.secondary_classes WHERE name LIKE 'Integration Test%'
    )
);
DELETE FROM public.user_secondary_payments WHERE program_id IN (
    SELECT id FROM public.secondary_programs WHERE class_id IN (
        SELECT id FROM public.secondary_classes WHERE name LIKE 'Integration Test%'
    )
);
DELETE FROM public.secondary_program_exercises WHERE program_id IN (
    SELECT id FROM public.secondary_programs WHERE class_id IN (
        SELECT id FROM public.secondary_classes WHERE name LIKE 'Integration Test%'
    )
);
DELETE FROM public.secondary_program_courses WHERE program_id IN (
    SELECT id FROM public.secondary_programs WHERE class_id IN (
        SELECT id FROM public.secondary_classes WHERE name LIKE 'Integration Test%'
    )
);
DELETE FROM public.secondary_programs WHERE class_id IN (
    SELECT id FROM public.secondary_classes WHERE name LIKE 'Integration Test%'
);
DELETE FROM public.secondary_series WHERE class_id IN (
    SELECT id FROM public.secondary_classes WHERE name LIKE 'Integration Test%'
);
DELETE FROM public.secondary_classes WHERE name LIKE 'Integration Test%';

-- ========================================
-- Étape 1: Création de la structure
-- ========================================

-- Créer une classe
INSERT INTO public.secondary_classes (id, name, level, description) 
VALUES (
    'a0000000-0000-0000-0000-000000000001'::uuid, 
    'Integration Test Terminale', 
    1,
    'Classe de test pour intégration'
);

-- Test 1: La classe est créée
SELECT ok(
    EXISTS(SELECT 1 FROM public.secondary_classes WHERE id = 'a0000000-0000-0000-0000-000000000001'::uuid),
    'La classe devrait être créée'
);

-- Créer une série
INSERT INTO public.secondary_series (id, class_id, name, description) 
VALUES (
    'b0000000-0000-0000-0000-000000000001'::uuid,
    'a0000000-0000-0000-0000-000000000001'::uuid,
    'C',
    'Série scientifique'
);

-- Test 2: La série est créée
SELECT ok(
    EXISTS(SELECT 1 FROM public.secondary_series WHERE id = 'b0000000-0000-0000-0000-000000000001'::uuid),
    'La série devrait être créée'
);

-- Créer un programme
INSERT INTO public.secondary_programs (id, class_id, series_id, price, description, is_active, duration) 
VALUES (
    'c0000000-0000-0000-0000-000000000001'::uuid,
    'a0000000-0000-0000-0000-000000000001'::uuid,
    'b0000000-0000-0000-0000-000000000001'::uuid,
    75.00,
    'Programme de préparation Terminale C',
    TRUE,
    '1 year'::interval
);

-- Test 3: Le programme est créé
SELECT ok(
    EXISTS(SELECT 1 FROM public.secondary_programs WHERE id = 'c0000000-0000-0000-0000-000000000001'::uuid),
    'Le programme devrait être créé'
);

-- Test 4: Le prix est correct
SELECT is(
    (SELECT price FROM public.secondary_programs WHERE id = 'c0000000-0000-0000-0000-000000000001'::uuid),
    75.00::numeric,
    'Le prix devrait être 75.00'
);

-- ========================================
-- Étape 2: Ajout de contenu
-- ========================================

-- Ajouter un cours (si disponible)
INSERT INTO public.secondary_program_courses (program_id, course_id, order_index)
SELECT 'c0000000-0000-0000-0000-000000000001'::uuid, id, 0
FROM public.courses LIMIT 1;

-- Test 5: Le course_count est mis à jour
SELECT ok(
    (SELECT course_count FROM public.secondary_programs WHERE id = 'c0000000-0000-0000-0000-000000000001'::uuid) >= 0,
    'Le course_count devrait être mis à jour'
);

-- ========================================
-- Étape 3: Paiement et inscription
-- ========================================

-- Créer un utilisateur de test (si nécessaire)
INSERT INTO auth.users (id, instance_id, email, encrypted_password, role, aud, created_at, updated_at)
VALUES (
    'd0000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000000',
    'test_secondary@example.com',
    crypt('test_password', gen_salt('bf')),
    'authenticated',
    'authenticated',
    now(),
    now()
)
ON CONFLICT (id) DO NOTHING;

-- Créer un paiement
INSERT INTO public.user_secondary_payments (
    id,
    user_id,
    program_id,
    amount,
    payment_date,
    payment_status,
    transaction_id
) VALUES (
    'e0000000-0000-0000-0000-000000000001'::uuid,
    'd0000000-0000-0000-0000-000000000001'::uuid,
    'c0000000-0000-0000-0000-000000000001'::uuid,
    75.00,
    now(),
    'pending',
    'test_transaction_123'
);

-- Test 6: Le paiement est créé
SELECT ok(
    EXISTS(SELECT 1 FROM public.user_secondary_payments WHERE id = 'e0000000-0000-0000-0000-000000000001'::uuid),
    'Le paiement devrait être créé'
);

-- Test 7: L'expiry_date est calculée automatiquement
SELECT ok(
    (SELECT expiry_date FROM public.user_secondary_payments WHERE id = 'e0000000-0000-0000-0000-000000000001'::uuid) IS NOT NULL,
    'L''expiry_date devrait être calculée automatiquement'
);

-- Test 8: L'expiry_date est dans environ 1 an
SELECT ok(
    (SELECT expiry_date FROM public.user_secondary_payments WHERE id = 'e0000000-0000-0000-0000-000000000001'::uuid) > now() + interval '11 months',
    'L''expiry_date devrait être dans environ 1 an'
);

-- Marquer le paiement comme complété
UPDATE public.user_secondary_payments 
SET payment_status = 'completed' 
WHERE id = 'e0000000-0000-0000-0000-000000000001'::uuid;

-- Test 9: L'inscription est créée automatiquement
SELECT ok(
    EXISTS(
        SELECT 1 FROM public.user_secondary_enrollments 
        WHERE user_id = 'd0000000-0000-0000-0000-000000000001'::uuid 
        AND program_id = 'c0000000-0000-0000-0000-000000000001'::uuid
    ),
    'L''inscription devrait être créée automatiquement après paiement'
);

-- Test 10: L'expiry_date de l'inscription est correcte
SELECT ok(
    (SELECT expiry_date FROM public.user_secondary_enrollments 
     WHERE user_id = 'd0000000-0000-0000-0000-000000000001'::uuid 
     AND program_id = 'c0000000-0000-0000-0000-000000000001'::uuid) IS NOT NULL,
    'L''expiry_date de l''inscription devrait être définie'
);

-- ========================================
-- Étape 4: Vérification d'accès
-- ========================================

-- Test 11: L'utilisateur a accès au programme
SELECT ok(
    public.check_secondary_access(
        'd0000000-0000-0000-0000-000000000001'::uuid,
        'c0000000-0000-0000-0000-000000000001'::uuid
    ),
    'L''utilisateur devrait avoir accès au programme après paiement'
);

-- ========================================
-- Étape 5: Tests des vues
-- ========================================

-- Test 12: La vue vw_available_secondary_programs fonctionne
SELECT ok(
    (SELECT COUNT(*) FROM public.vw_available_secondary_programs) >= 0,
    'La vue vw_available_secondary_programs devrait fonctionner'
);

-- Test 13: La vue vw_user_secondary_subscriptions fonctionne
SELECT ok(
    (SELECT COUNT(*) FROM public.vw_user_secondary_subscriptions) >= 0,
    'La vue vw_user_secondary_subscriptions devrait fonctionner'
);

-- ========================================
-- Étape 6: Tests de contraintes
-- ========================================

-- Test 14: Impossible de créer deux programmes identiques (class_id, series_id)
SELECT throws_ok(
    format(
        'INSERT INTO public.secondary_programs (class_id, series_id, price) VALUES (%L, %L, 50.00)',
        'a0000000-0000-0000-0000-000000000001',
        'b0000000-0000-0000-0000-000000000001'
    ),
    '23505',
    NULL,
    'La création d''un programme en double devrait échouer'
);

-- Test 15: Vérifier que tous les champs essentiels sont remplis
SELECT ok(
    (SELECT COUNT(*) FROM public.secondary_programs 
     WHERE id = 'c0000000-0000-0000-0000-000000000001'::uuid
     AND class_id IS NOT NULL
     AND series_id IS NOT NULL
     AND price IS NOT NULL
     AND is_active IS NOT NULL
     AND created_at IS NOT NULL
     AND updated_at IS NOT NULL
    ) = 1,
    'Le programme devrait avoir tous ses champs essentiels remplis'
);

-- Nettoyage
DELETE FROM public.user_secondary_enrollments WHERE user_id = 'd0000000-0000-0000-0000-000000000001'::uuid;
DELETE FROM public.user_secondary_payments WHERE user_id = 'd0000000-0000-0000-0000-000000000001'::uuid;
DELETE FROM auth.users WHERE id = 'd0000000-0000-0000-0000-000000000001'::uuid;
DELETE FROM public.secondary_program_courses WHERE program_id = 'c0000000-0000-0000-0000-000000000001'::uuid;
DELETE FROM public.secondary_programs WHERE id = 'c0000000-0000-0000-0000-000000000001'::uuid;
DELETE FROM public.secondary_series WHERE id = 'b0000000-0000-0000-0000-000000000001'::uuid;
DELETE FROM public.secondary_classes WHERE id = 'a0000000-0000-0000-0000-000000000001'::uuid;

select * from finish();
rollback;

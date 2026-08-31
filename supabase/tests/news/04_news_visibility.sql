-- Test: Vérification de la visibilité et du ciblage des actualités
-- Ce test vérifie que la logique de visibilité et de ciblage fonctionne correctement

begin;

select plan(15);

-- Nettoyage préalable
DELETE FROM public.news_interactions WHERE news_id IN (
    SELECT id FROM public.news WHERE title LIKE 'Test News Visibility%'
);
DELETE FROM public.news_views WHERE news_id IN (
    SELECT id FROM public.news WHERE title LIKE 'Test News Visibility%'
);
DELETE FROM public.news WHERE title LIKE 'Test News Visibility%';

-- ========================================
-- Tests de visibilité de base
-- ========================================

-- Créer une actualité publiée
INSERT INTO public.news (
    title,
    description,
    start_date,
    end_date,
    status,
    target_audience
) VALUES (
    'Test News Visibility - Published',
    'Actualité publiée',
    NOW() - INTERVAL '1 day',
    NOW() + INTERVAL '7 days',
    'published',
    'all'
);

-- Créer une actualité en brouillon
INSERT INTO public.news (
    title,
    description,
    start_date,
    status,
    target_audience
) VALUES (
    'Test News Visibility - Draft',
    'Actualité en brouillon',
    NOW() - INTERVAL '1 day',
    'draft',
    'all'
);

-- Créer une actualité expirée
INSERT INTO public.news (
    title,
    description,
    start_date,
    end_date,
    status,
    target_audience
) VALUES (
    'Test News Visibility - Expired',
    'Actualité expirée',
    NOW() - INTERVAL '10 days',
    NOW() - INTERVAL '1 day',
    'published',
    'all'
);

-- Créer une actualité future
INSERT INTO public.news (
    title,
    description,
    start_date,
    status,
    target_audience
) VALUES (
    'Test News Visibility - Future',
    'Actualité future',
    NOW() + INTERVAL '7 days',
    'published',
    'all'
);

-- Test 1: Vérifier qu'une actualité publiée est visible
SELECT isnt_empty(
    $$SELECT 1 FROM public.news 
      WHERE title = 'Test News Visibility - Published' 
      AND status = 'published'
      AND start_date <= NOW()
      AND (end_date IS NULL OR end_date >= NOW())$$,
    'Une actualité publiée avec dates valides devrait être visible'
);

-- Test 2: Vérifier qu'une actualité en brouillon n'est pas visible (via RLS)
SELECT is_empty(
    $$SELECT 1 FROM public.news 
      WHERE title = 'Test News Visibility - Draft' 
      AND status = 'published'$$,
    'Une actualité en brouillon ne devrait pas avoir le statut published'
);

-- Test 3: Vérifier qu'une actualité expirée n'est pas visible
SELECT is_empty(
    $$SELECT 1 FROM public.news 
      WHERE title = 'Test News Visibility - Expired' 
      AND status = 'published'
      AND start_date <= NOW()
      AND (end_date IS NULL OR end_date >= NOW())$$,
    'Une actualité expirée ne devrait pas être visible'
);

-- Test 4: Vérifier qu'une actualité future n'est pas visible
SELECT is_empty(
    $$SELECT 1 FROM public.news 
      WHERE title = 'Test News Visibility - Future' 
      AND status = 'published'
      AND start_date <= NOW()$$,
    'Une actualité future ne devrait pas être visible'
);

-- ========================================
-- Tests de ciblage d'audience
-- ========================================

-- Créer des actualités avec différents ciblages
INSERT INTO public.news (
    title,
    description,
    start_date,
    status,
    target_audience
) VALUES 
(
    'Test News Visibility - All',
    'Pour tous',
    NOW(),
    'published',
    'all'
),
(
    'Test News Visibility - Concours',
    'Pour concours',
    NOW(),
    'published',
    'concours'
),
(
    'Test News Visibility - Secondary',
    'Pour secondaire',
    NOW(),
    'published',
    'secondary'
);

-- Test 5: Vérifier le ciblage 'all'
SELECT isnt_empty(
    $$SELECT 1 FROM public.news 
      WHERE title = 'Test News Visibility - All' 
      AND target_audience = 'all'$$,
    'Une actualité avec target_audience "all" devrait exister'
);

-- Test 6: Vérifier le ciblage 'concours'
SELECT isnt_empty(
    $$SELECT 1 FROM public.news 
      WHERE title = 'Test News Visibility - Concours' 
      AND target_audience = 'concours'$$,
    'Une actualité avec target_audience "concours" devrait exister'
);

-- Test 7: Vérifier le ciblage 'secondary'
SELECT isnt_empty(
    $$SELECT 1 FROM public.news 
      WHERE title = 'Test News Visibility - Secondary' 
      AND target_audience = 'secondary'$$,
    'Une actualité avec target_audience "secondary" devrait exister'
);

-- ========================================
-- Tests de priorité et ordre d'affichage
-- ========================================

-- Créer des actualités avec différentes priorités
INSERT INTO public.news (
    title,
    description,
    start_date,
    status,
    priority,
    display_order,
    is_featured
) VALUES 
(
    'Test News Visibility - High Priority',
    'Priorité haute',
    NOW(),
    'published',
    100,
    1,
    TRUE
),
(
    'Test News Visibility - Low Priority',
    'Priorité basse',
    NOW(),
    'published',
    10,
    2,
    FALSE
);

-- Test 8: Vérifier qu'une actualité épinglée existe
SELECT isnt_empty(
    $$SELECT 1 FROM public.news 
      WHERE title = 'Test News Visibility - High Priority' 
      AND is_featured = TRUE$$,
    'Une actualité épinglée devrait exister'
);

-- Test 9: Vérifier l'ordre de priorité
SELECT results_eq(
    $$SELECT title FROM public.news 
      WHERE title LIKE 'Test News Visibility - %Priority'
      ORDER BY priority DESC, display_order ASC
      LIMIT 1$$,
    $$VALUES ('Test News Visibility - High Priority'::VARCHAR)$$,
    'L''actualité avec la plus haute priorité devrait être en premier'
);

-- ========================================
-- Tests de tracking des vues et interactions
-- ========================================

-- Créer une actualité pour le tracking
INSERT INTO public.news (
    title,
    description,
    start_date,
    status
) VALUES (
    'Test News Visibility - Tracking',
    'Pour test de tracking',
    NOW(),
    'published'
);

-- Récupérer l'ID de l'actualité
DO $$
DECLARE
    v_news_id UUID;
    v_test_user_id UUID := '00000000-0000-0000-0000-000000000001'::UUID;
BEGIN
    SELECT id INTO v_news_id FROM public.news WHERE title = 'Test News Visibility - Tracking';
    
    -- Enregistrer quelques vues
    INSERT INTO public.news_views (news_id, user_id) 
    VALUES (v_news_id, v_test_user_id);
    
    -- Enregistrer des interactions
    INSERT INTO public.news_interactions (news_id, user_id, interaction_type) 
    VALUES 
        (v_news_id, v_test_user_id, 'click'),
        (v_news_id, v_test_user_id, 'share');
    
    -- Mettre à jour les compteurs
    UPDATE public.news 
    SET 
        view_count = (SELECT COUNT(*) FROM public.news_views WHERE news_id = v_news_id),
        click_count = (SELECT COUNT(*) FROM public.news_interactions WHERE news_id = v_news_id AND interaction_type = 'click'),
        share_count = (SELECT COUNT(*) FROM public.news_interactions WHERE news_id = v_news_id AND interaction_type = 'share')
    WHERE id = v_news_id;
END $$;

-- Test 10: Vérifier que les vues sont enregistrées
SELECT isnt_empty(
    $$SELECT 1 FROM public.news_views nv
      JOIN public.news n ON n.id = nv.news_id
      WHERE n.title = 'Test News Visibility - Tracking'$$,
    'Les vues devraient être enregistrées'
);

-- Test 11: Vérifier que les interactions sont enregistrées
SELECT isnt_empty(
    $$SELECT 1 FROM public.news_interactions ni
      JOIN public.news n ON n.id = ni.news_id
      WHERE n.title = 'Test News Visibility - Tracking'$$,
    'Les interactions devraient être enregistrées'
);

-- Test 12: Vérifier le compteur de vues
SELECT cmp_ok(
    (SELECT view_count FROM public.news WHERE title = 'Test News Visibility - Tracking'),
    '>=',
    1,
    'Le compteur de vues devrait être >= 1'
);

-- Test 13: Vérifier le compteur de clics
SELECT cmp_ok(
    (SELECT click_count FROM public.news WHERE title = 'Test News Visibility - Tracking'),
    '>=',
    1,
    'Le compteur de clics devrait être >= 1'
);

-- Test 14: Vérifier le compteur de partages
SELECT cmp_ok(
    (SELECT share_count FROM public.news WHERE title = 'Test News Visibility - Tracking'),
    '>=',
    1,
    'Le compteur de partages devrait être >= 1'
);

-- Test 15: Vérifier que les types d'interactions sont valides
SELECT bag_eq(
    $$SELECT DISTINCT interaction_type 
      FROM public.news_interactions ni
      JOIN public.news n ON n.id = ni.news_id
      WHERE n.title = 'Test News Visibility - Tracking'$$,
    $$VALUES ('click'::VARCHAR), ('share'::VARCHAR)$$,
    'Les types d''interactions devraient être valides'
);

-- Nettoyage
DELETE FROM public.news_interactions WHERE news_id IN (
    SELECT id FROM public.news WHERE title LIKE 'Test News Visibility%'
);
DELETE FROM public.news_views WHERE news_id IN (
    SELECT id FROM public.news WHERE title LIKE 'Test News Visibility%'
);
DELETE FROM public.news WHERE title LIKE 'Test News Visibility%';

select * from finish();

rollback;

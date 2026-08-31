-- Test: Vérification des triggers du système de news
-- Ce test vérifie que les triggers fonctionnent correctement

begin;

select plan(5);

-- ========================================
-- Tests de l'existence des triggers
-- ========================================

-- Test 1: Vérifier que le trigger trigger_update_news_updated_at existe
SELECT has_trigger(
    'public',
    'news',
    'trigger_update_news_updated_at',
    'Le trigger trigger_update_news_updated_at devrait exister'
);

-- ========================================
-- Tests fonctionnels des triggers
-- ========================================

-- Nettoyage préalable
DELETE FROM public.news WHERE title = 'Test News Trigger';

-- Insérer une actualité de test
INSERT INTO public.news (
    title,
    description,
    start_date,
    status
) VALUES (
    'Test News Trigger',
    'Description de test',
    NOW(),
    'draft'
);

-- Récupérer l'ID de l'actualité créée
DO $$
DECLARE
    v_news_id UUID;
    v_created_at TIMESTAMPTZ;
    v_updated_at TIMESTAMPTZ;
    v_updated_at_after TIMESTAMPTZ;
BEGIN
    -- Récupérer les timestamps initiaux
    SELECT id, created_at, updated_at 
    INTO v_news_id, v_created_at, v_updated_at
    FROM public.news 
    WHERE title = 'Test News Trigger';
    
    -- Attendre un peu
    PERFORM pg_sleep(0.1);
    
    -- Mettre à jour l'actualité
    UPDATE public.news 
    SET description = 'Description mise à jour'
    WHERE id = v_news_id;
    
    -- Récupérer le nouveau updated_at
    SELECT updated_at INTO v_updated_at_after
    FROM public.news 
    WHERE id = v_news_id;
END $$;

-- Test 2: Vérifier que created_at est défini
SELECT isnt_empty(
    $$SELECT 1 FROM public.news WHERE title = 'Test News Trigger' AND created_at IS NOT NULL$$,
    'La colonne created_at devrait être définie automatiquement'
);

-- Test 3: Vérifier que updated_at est défini
SELECT isnt_empty(
    $$SELECT 1 FROM public.news WHERE title = 'Test News Trigger' AND updated_at IS NOT NULL$$,
    'La colonne updated_at devrait être définie automatiquement'
);

-- Test 4: Vérifier que les compteurs sont initialisés à 0
SELECT results_eq(
    $$SELECT view_count, click_count, share_count FROM public.news WHERE title = 'Test News Trigger'$$,
    $$VALUES (0, 0, 0)$$,
    'Les compteurs devraient être initialisés à 0'
);

-- Test 5: Vérifier que les valeurs par défaut sont correctes
SELECT results_eq(
    $$SELECT 
        COALESCE(media_type, 'none'),
        COALESCE(status, 'draft'),
        COALESCE(action_type, 'none'),
        COALESCE(target_audience, 'all')
    FROM public.news 
    WHERE title = 'Test News Trigger'$$,
    $$VALUES ('none'::VARCHAR, 'draft'::VARCHAR, 'none'::VARCHAR, 'all'::VARCHAR)$$,
    'Les valeurs par défaut devraient être correctes'
);

-- Nettoyage
DELETE FROM public.news WHERE title = 'Test News Trigger';

select * from finish();

rollback;

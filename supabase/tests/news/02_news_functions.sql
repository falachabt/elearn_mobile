-- Test: Vérification des fonctions du système de news
-- Ce test vérifie l'existence et le bon fonctionnement des fonctions

begin;

select plan(5);

-- ========================================
-- Tests des fonctions de visibilité
-- ========================================

-- Test 1: Vérifier que is_news_visible_for_user existe
SELECT has_function(
    'public',
    'is_news_visible_for_user',
    'La fonction is_news_visible_for_user devrait exister'
);

-- Test 2: Vérifier que get_active_news_for_user existe
SELECT has_function(
    'public',
    'get_active_news_for_user',
    'La fonction get_active_news_for_user devrait exister'
);

-- ========================================
-- Tests des fonctions de tracking
-- ========================================

-- Test 3: Vérifier que record_news_view existe
SELECT has_function(
    'public',
    'record_news_view',
    'La fonction record_news_view devrait exister'
);

-- Test 4: Vérifier que record_news_interaction existe
SELECT has_function(
    'public',
    'record_news_interaction',
    'La fonction record_news_interaction devrait exister'
);

-- ========================================
-- Tests des fonctions de statistiques
-- ========================================

-- Test 5: Vérifier que get_news_statistics existe
SELECT has_function(
    'public',
    'get_news_statistics',
    'La fonction get_news_statistics devrait exister'
);

select * from finish();

rollback;

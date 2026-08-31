-- Test: Vérification de la structure des tables du système de news
-- Ce test vérifie que toutes les tables du système de news existent avec les bonnes colonnes

begin;

select plan(52);

-- ========================================
-- Tests de la table news
-- ========================================

-- Test 1: Vérifier que la table news existe
SELECT has_table(
    'public',
    'news',
    'La table public.news devrait exister'
);

-- Test 2: Vérifier la clé primaire
SELECT col_is_pk(
    'public',
    'news',
    'id',
    'La colonne id devrait être la clé primaire de news'
);

-- Test 3: Vérifier que la colonne title existe et n'est pas nulle
SELECT has_column(
    'public',
    'news',
    'title',
    'La colonne title devrait exister dans news'
);

SELECT col_not_null(
    'public',
    'news',
    'title',
    'La colonne title ne devrait pas être NULL'
);

-- Test 4: Vérifier que la colonne subtitle existe
SELECT has_column(
    'public',
    'news',
    'subtitle',
    'La colonne subtitle devrait exister dans news'
);

-- Test 5: Vérifier que la colonne description existe
SELECT has_column(
    'public',
    'news',
    'description',
    'La colonne description devrait exister dans news'
);

-- Test 6: Vérifier que la colonne content existe
SELECT has_column(
    'public',
    'news',
    'content',
    'La colonne content devrait exister dans news'
);

-- Test 7: Vérifier que la colonne media_type existe avec contrainte CHECK
SELECT has_column(
    'public',
    'news',
    'media_type',
    'La colonne media_type devrait exister dans news'
);

-- Test 8: Vérifier que la colonne media_url existe
SELECT has_column(
    'public',
    'news',
    'media_url',
    'La colonne media_url devrait exister dans news'
);

-- Test 9: Vérifier que la colonne thumbnail_url existe
SELECT has_column(
    'public',
    'news',
    'thumbnail_url',
    'La colonne thumbnail_url devrait exister dans news'
);

-- Test 10: Vérifier que la colonne start_date existe et n'est pas nulle
SELECT has_column(
    'public',
    'news',
    'start_date',
    'La colonne start_date devrait exister dans news'
);

SELECT col_not_null(
    'public',
    'news',
    'start_date',
    'La colonne start_date ne devrait pas être NULL'
);

-- Test 11: Vérifier que la colonne end_date existe
SELECT has_column(
    'public',
    'news',
    'end_date',
    'La colonne end_date devrait exister dans news'
);

-- Test 12: Vérifier que la colonne status existe avec contrainte CHECK
SELECT has_column(
    'public',
    'news',
    'status',
    'La colonne status devrait exister dans news'
);

-- Test 13: Vérifier que la colonne action_type existe avec contrainte CHECK
SELECT has_column(
    'public',
    'news',
    'action_type',
    'La colonne action_type devrait exister dans news'
);

-- Test 14: Vérifier que la colonne action_data existe (JSONB)
SELECT has_column(
    'public',
    'news',
    'action_data',
    'La colonne action_data devrait exister dans news'
);

-- Test 15: Vérifier que la colonne target_audience existe avec contrainte CHECK
SELECT has_column(
    'public',
    'news',
    'target_audience',
    'La colonne target_audience devrait exister dans news'
);

-- Test 16: Vérifier que la colonne target_programs existe (JSONB)
SELECT has_column(
    'public',
    'news',
    'target_programs',
    'La colonne target_programs devrait exister dans news'
);

-- Test 17: Vérifier que la colonne target_user_types existe (JSONB)
SELECT has_column(
    'public',
    'news',
    'target_user_types',
    'La colonne target_user_types devrait exister dans news'
);

-- Test 18: Vérifier que la colonne is_featured existe
SELECT has_column(
    'public',
    'news',
    'is_featured',
    'La colonne is_featured devrait exister dans news'
);

-- Test 19: Vérifier que la colonne priority existe
SELECT has_column(
    'public',
    'news',
    'priority',
    'La colonne priority devrait exister dans news'
);

-- Test 20: Vérifier que la colonne display_order existe
SELECT has_column(
    'public',
    'news',
    'display_order',
    'La colonne display_order devrait exister dans news'
);

-- Test 21: Vérifier que la colonne view_count existe
SELECT has_column(
    'public',
    'news',
    'view_count',
    'La colonne view_count devrait exister dans news'
);

-- Test 22: Vérifier que la colonne click_count existe
SELECT has_column(
    'public',
    'news',
    'click_count',
    'La colonne click_count devrait exister dans news'
);

-- Test 23: Vérifier que la colonne share_count existe
SELECT has_column(
    'public',
    'news',
    'share_count',
    'La colonne share_count devrait exister dans news'
);

-- Test 24: Vérifier que la colonne author_id existe
SELECT has_column(
    'public',
    'news',
    'author_id',
    'La colonne author_id devrait exister dans news'
);

-- Test 25: Vérifier que la colonne category existe
SELECT has_column(
    'public',
    'news',
    'category',
    'La colonne category devrait exister dans news'
);

-- Test 26: Vérifier que la colonne tags existe (JSONB)
SELECT has_column(
    'public',
    'news',
    'tags',
    'La colonne tags devrait exister dans news'
);

-- Test 27: Vérifier que la colonne created_at existe
SELECT has_column(
    'public',
    'news',
    'created_at',
    'La colonne created_at devrait exister dans news'
);

-- Test 28: Vérifier que la colonne updated_at existe
SELECT has_column(
    'public',
    'news',
    'updated_at',
    'La colonne updated_at devrait exister dans news'
);

-- ========================================
-- Tests de la table news_views
-- ========================================

-- Test 29: Vérifier que la table news_views existe
SELECT has_table(
    'public',
    'news_views',
    'La table public.news_views devrait exister'
);

-- Test 30: Vérifier la clé primaire
SELECT col_is_pk(
    'public',
    'news_views',
    'id',
    'La colonne id devrait être la clé primaire de news_views'
);

-- Test 31: Vérifier que la colonne news_id existe et n'est pas nulle
SELECT has_column(
    'public',
    'news_views',
    'news_id',
    'La colonne news_id devrait exister dans news_views'
);

SELECT col_not_null(
    'public',
    'news_views',
    'news_id',
    'La colonne news_id ne devrait pas être NULL'
);

-- Test 32: Vérifier que la colonne user_id existe et n'est pas nulle
SELECT has_column(
    'public',
    'news_views',
    'user_id',
    'La colonne user_id devrait exister dans news_views'
);

SELECT col_not_null(
    'public',
    'news_views',
    'user_id',
    'La colonne user_id ne devrait pas être NULL'
);

-- Test 33: Vérifier que la colonne viewed_at existe
SELECT has_column(
    'public',
    'news_views',
    'viewed_at',
    'La colonne viewed_at devrait exister dans news_views'
);

-- Test 34: Vérifier que la clé étrangère vers news existe
SELECT has_fk(
    'public',
    'news_views',
    'La table news_views devrait avoir une clé étrangère vers news'
);

-- ========================================
-- Tests de la table news_interactions
-- ========================================

-- Test 35: Vérifier que la table news_interactions existe
SELECT has_table(
    'public',
    'news_interactions',
    'La table public.news_interactions devrait exister'
);

-- Test 36: Vérifier la clé primaire
SELECT col_is_pk(
    'public',
    'news_interactions',
    'id',
    'La colonne id devrait être la clé primaire de news_interactions'
);

-- Test 37: Vérifier que la colonne news_id existe et n'est pas nulle
SELECT has_column(
    'public',
    'news_interactions',
    'news_id',
    'La colonne news_id devrait exister dans news_interactions'
);

SELECT col_not_null(
    'public',
    'news_interactions',
    'news_id',
    'La colonne news_id ne devrait pas être NULL'
);

-- Test 38: Vérifier que la colonne user_id existe et n'est pas nulle
SELECT has_column(
    'public',
    'news_interactions',
    'user_id',
    'La colonne user_id devrait exister dans news_interactions'
);

SELECT col_not_null(
    'public',
    'news_interactions',
    'user_id',
    'La colonne user_id ne devrait pas être NULL'
);

-- Test 39: Vérifier que la colonne interaction_type existe et n'est pas nulle
SELECT has_column(
    'public',
    'news_interactions',
    'interaction_type',
    'La colonne interaction_type devrait exister dans news_interactions'
);

SELECT col_not_null(
    'public',
    'news_interactions',
    'interaction_type',
    'La colonne interaction_type ne devrait pas être NULL'
);

-- Test 40: Vérifier que la colonne interacted_at existe
SELECT has_column(
    'public',
    'news_interactions',
    'interacted_at',
    'La colonne interacted_at devrait exister dans news_interactions'
);

-- Test 41: Vérifier que la colonne metadata existe (JSONB)
SELECT has_column(
    'public',
    'news_interactions',
    'metadata',
    'La colonne metadata devrait exister dans news_interactions'
);

-- Test 42: Vérifier que la clé étrangère vers news existe
SELECT has_fk(
    'public',
    'news_interactions',
    'La table news_interactions devrait avoir une clé étrangère vers news'
);

-- ========================================
-- Tests des index
-- ========================================

-- Test 43: Vérifier que l'index sur status existe
SELECT has_index(
    'public',
    'news',
    'idx_news_status',
    'L''index idx_news_status devrait exister sur la table news'
);

-- Test 44: Vérifier que l'index sur priority existe
SELECT has_index(
    'public',
    'news',
    'idx_news_priority',
    'L''index idx_news_priority devrait exister sur la table news'
);

-- Test 45: Vérifier que l'index sur news_views (news_id, user_id) existe
SELECT has_index(
    'public',
    'news_views',
    'idx_news_views_news_user',
    'L''index idx_news_views_news_user devrait exister sur la table news_views'
);

select * from finish();

rollback;

-- =====================================================
-- SCHEMA: News System
-- Description: Système de gestion d'actualités avec support multimédia,
--              ciblage d'audience, analytics et interactions utilisateurs
-- Version: 1.0
-- Date: 2026-01-10
-- =====================================================

-- =====================================================
-- TABLES PRINCIPALES
-- =====================================================

-- Table principale des actualités
CREATE TABLE IF NOT EXISTS news (
    -- Identification
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Contenu de l'actualité
    title VARCHAR(255) NOT NULL,
    subtitle VARCHAR(255),
    description TEXT,
    content TEXT,
    
    -- Gestion des médias
    media_type VARCHAR(20) CHECK (media_type IN ('image', 'video', 'none')) DEFAULT 'none',
    media_url VARCHAR(500),
    thumbnail_url VARCHAR(500),
    media_alt_text VARCHAR(255),
    video_duration INT,
    
    -- Gestion des dates
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ,
    
    -- Priorité et ordre
    priority INT DEFAULT 0,
    display_order INT DEFAULT 0,
    
    -- Statut de publication
    status VARCHAR(20) CHECK (status IN ('draft', 'scheduled', 'published', 'archived')) DEFAULT 'draft',
    
    -- Configuration de l'action au clic
    action_type VARCHAR(30) CHECK (action_type IN ('none', 'internal_page', 'external_link', 'detail_page', 'deep_link')) DEFAULT 'none',
    action_data JSONB,
    
    -- Ciblage de l'audience
    target_audience VARCHAR(20) CHECK (target_audience IN ('all', 'concours', 'secondary', 'specific')) DEFAULT 'all',
    target_programs JSONB,
    target_user_types JSONB,
    
    -- Options d'affichage
    is_featured BOOLEAN DEFAULT FALSE,
    show_badge BOOLEAN DEFAULT FALSE,
    badge_text VARCHAR(50),
    badge_color VARCHAR(20),
    
    -- Style et apparence
    background_color VARCHAR(20),
    text_color VARCHAR(20),
    card_style VARCHAR(20) CHECK (card_style IN ('default', 'minimal', 'full', 'banner')) DEFAULT 'default',
    
    -- Métadonnées
    author_id UUID,
    category VARCHAR(50),
    tags JSONB,
    
    -- Statistiques
    view_count INT DEFAULT 0,
    click_count INT DEFAULT 0,
    share_count INT DEFAULT 0,
    
    -- Options avancées
    require_authentication BOOLEAN DEFAULT FALSE,
    show_for_new_users_only BOOLEAN DEFAULT FALSE,
    max_display_count INT
);

-- Commentaires sur les colonnes de la table news
COMMENT ON TABLE news IS 'Table principale des actualités de l''application';
COMMENT ON COLUMN news.title IS 'Titre de l''actualité';
COMMENT ON COLUMN news.subtitle IS 'Sous-titre optionnel';
COMMENT ON COLUMN news.description IS 'Description courte pour la liste';
COMMENT ON COLUMN news.content IS 'Contenu complet HTML/Markdown pour la page de détails';
COMMENT ON COLUMN news.media_type IS 'Type de média: image, video, ou none';
COMMENT ON COLUMN news.media_url IS 'URL du média principal';
COMMENT ON COLUMN news.thumbnail_url IS 'URL de la miniature (surtout pour les vidéos)';
COMMENT ON COLUMN news.media_alt_text IS 'Texte alternatif pour l''accessibilité';
COMMENT ON COLUMN news.video_duration IS 'Durée de la vidéo en secondes';
COMMENT ON COLUMN news.start_date IS 'Date de début d''affichage';
COMMENT ON COLUMN news.end_date IS 'Date de fin d''affichage (NULL = illimité)';
COMMENT ON COLUMN news.priority IS 'Priorité d''affichage (plus élevé = plus important)';
COMMENT ON COLUMN news.display_order IS 'Ordre d''affichage manuel';
COMMENT ON COLUMN news.status IS 'Statut: draft, scheduled, published, archived';
COMMENT ON COLUMN news.action_type IS 'Type d''action: none, internal_page, external_link, detail_page, deep_link';
COMMENT ON COLUMN news.action_data IS 'Données JSON de l''action (route, params, url, etc.)';
COMMENT ON COLUMN news.target_audience IS 'Audience cible: all, concours, secondary, specific';
COMMENT ON COLUMN news.target_programs IS 'Array JSON des IDs de programmes ciblés';
COMMENT ON COLUMN news.target_user_types IS 'Array JSON des types d''utilisateurs ciblés';
COMMENT ON COLUMN news.is_featured IS 'Épinglé en haut de la liste';
COMMENT ON COLUMN news.show_badge IS 'Afficher un badge';
COMMENT ON COLUMN news.badge_text IS 'Texte du badge personnalisé';
COMMENT ON COLUMN news.badge_color IS 'Couleur du badge (hex)';
COMMENT ON COLUMN news.card_style IS 'Style de la carte: default, minimal, full, banner';
COMMENT ON COLUMN news.view_count IS 'Nombre total de vues';
COMMENT ON COLUMN news.click_count IS 'Nombre total de clics';
COMMENT ON COLUMN news.share_count IS 'Nombre total de partages';
COMMENT ON COLUMN news.require_authentication IS 'Nécessite une authentification';
COMMENT ON COLUMN news.show_for_new_users_only IS 'Visible uniquement pour les nouveaux utilisateurs';
COMMENT ON COLUMN news.max_display_count IS 'Nombre max d''affichages par utilisateur';

-- Table des vues d'actualités
CREATE TABLE IF NOT EXISTS news_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    news_id UUID NOT NULL REFERENCES news(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    viewed_at TIMESTAMPTZ DEFAULT NOW(),
    session_id VARCHAR(100),
    device_info JSONB
);

COMMENT ON TABLE news_views IS 'Tracking des vues des actualités par utilisateur';
COMMENT ON COLUMN news_views.news_id IS 'ID de l''actualité';
COMMENT ON COLUMN news_views.user_id IS 'ID de l''utilisateur';
COMMENT ON COLUMN news_views.viewed_at IS 'Date et heure de la vue';
COMMENT ON COLUMN news_views.session_id IS 'ID de session pour tracking';
COMMENT ON COLUMN news_views.device_info IS 'Informations sur l''appareil (JSON)';

-- Table des interactions
CREATE TABLE IF NOT EXISTS news_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    news_id UUID NOT NULL REFERENCES news(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    interaction_type VARCHAR(20) CHECK (interaction_type IN ('click', 'share', 'dismiss', 'like', 'bookmark')) NOT NULL,
    interacted_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB
);

COMMENT ON TABLE news_interactions IS 'Tracking des interactions (clics, partages, likes, etc.)';
COMMENT ON COLUMN news_interactions.news_id IS 'ID de l''actualité';
COMMENT ON COLUMN news_interactions.user_id IS 'ID de l''utilisateur';
COMMENT ON COLUMN news_interactions.interaction_type IS 'Type: click, share, dismiss, like, bookmark';
COMMENT ON COLUMN news_interactions.interacted_at IS 'Date et heure de l''interaction';
COMMENT ON COLUMN news_interactions.metadata IS 'Métadonnées supplémentaires (JSON)';

-- =====================================================
-- INDEX
-- =====================================================

-- Index pour la table news
CREATE INDEX IF NOT EXISTS idx_news_status ON news(status);
CREATE INDEX IF NOT EXISTS idx_news_dates ON news(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_news_priority ON news(priority DESC, display_order DESC);
CREATE INDEX IF NOT EXISTS idx_news_featured ON news(is_featured) WHERE is_featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_news_target ON news(target_audience);
CREATE INDEX IF NOT EXISTS idx_news_action_data ON news USING GIN(action_data);
CREATE INDEX IF NOT EXISTS idx_news_tags ON news USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_news_target_programs ON news USING GIN(target_programs);
CREATE INDEX IF NOT EXISTS idx_news_author ON news(author_id);
CREATE INDEX IF NOT EXISTS idx_news_category ON news(category);

-- Index pour la table news_views
CREATE INDEX IF NOT EXISTS idx_news_views_news_user ON news_views(news_id, user_id);
CREATE INDEX IF NOT EXISTS idx_news_views_date ON news_views(viewed_at);
CREATE INDEX IF NOT EXISTS idx_news_views_news ON news_views(news_id);
CREATE INDEX IF NOT EXISTS idx_news_views_user ON news_views(user_id);

-- Index pour la table news_interactions
CREATE INDEX IF NOT EXISTS idx_news_interactions_news ON news_interactions(news_id);
CREATE INDEX IF NOT EXISTS idx_news_interactions_user ON news_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_news_interactions_type ON news_interactions(news_id, interaction_type);
CREATE INDEX IF NOT EXISTS idx_news_interactions_date ON news_interactions(interacted_at);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_news_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_news_updated_at
    BEFORE UPDATE ON news
    FOR EACH ROW
    EXECUTE FUNCTION update_news_updated_at();

-- =====================================================
-- FONCTIONS UTILITAIRES
-- =====================================================

-- Fonction: Vérifier si une actualité est visible pour un utilisateur
CREATE OR REPLACE FUNCTION is_news_visible_for_user(
    p_news_id UUID,
    p_user_id UUID,
    p_user_type VARCHAR DEFAULT 'all',
    p_user_programs JSONB DEFAULT '[]'::jsonb,
    p_is_new_user BOOLEAN DEFAULT FALSE
)
RETURNS BOOLEAN AS $$
DECLARE
    v_news RECORD;
    v_view_count INT;
BEGIN
    -- Récupérer l'actualité
    SELECT * INTO v_news FROM news WHERE id = p_news_id;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Vérifier le statut
    IF v_news.status != 'published' THEN
        RETURN FALSE;
    END IF;
    
    -- Vérifier les dates
    IF v_news.start_date > NOW() OR (v_news.end_date IS NOT NULL AND v_news.end_date < NOW()) THEN
        RETURN FALSE;
    END IF;
    
    -- Vérifier le nombre max d'affichages
    IF v_news.max_display_count IS NOT NULL THEN
        SELECT COUNT(*) INTO v_view_count FROM news_views WHERE news_id = p_news_id AND user_id = p_user_id;
        IF v_view_count >= v_news.max_display_count THEN
            RETURN FALSE;
        END IF;
    END IF;
    
    -- Vérifier le ciblage nouveaux utilisateurs
    IF v_news.show_for_new_users_only = TRUE AND p_is_new_user = FALSE THEN
        RETURN FALSE;
    END IF;
    
    -- Vérifier le ciblage d'audience
    IF v_news.target_audience = 'all' THEN
        RETURN TRUE;
    ELSIF v_news.target_audience = p_user_type THEN
        RETURN TRUE;
    ELSIF v_news.target_audience = 'specific' THEN
        -- Vérifier les programmes
        IF v_news.target_programs IS NOT NULL AND NOT (v_news.target_programs @> p_user_programs) THEN
            RETURN FALSE;
        END IF;
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION is_news_visible_for_user IS 'Vérifie si une actualité est visible pour un utilisateur donné';

-- Fonction: Récupérer les actualités actives pour un utilisateur
CREATE OR REPLACE FUNCTION get_active_news_for_user(
    p_user_id UUID,
    p_user_type VARCHAR DEFAULT 'all',
    p_user_programs TEXT DEFAULT '[]',
    p_is_new_user BOOLEAN DEFAULT FALSE,
    p_limit INT DEFAULT 20
)
RETURNS TABLE (
    id UUID,
    title VARCHAR,
    subtitle VARCHAR,
    description TEXT,
    content TEXT,
    media_type VARCHAR,
    media_url VARCHAR,
    thumbnail_url VARCHAR,
    media_alt_text VARCHAR,
    video_duration INT,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    priority INT,
    display_order INT,
    status VARCHAR,
    action_type VARCHAR,
    action_data JSONB,
    target_audience VARCHAR,
    is_featured BOOLEAN,
    show_badge BOOLEAN,
    badge_text VARCHAR,
    badge_color VARCHAR,
    background_color VARCHAR,
    text_color VARCHAR,
    card_style VARCHAR,
    category VARCHAR,
    tags JSONB,
    view_count INT,
    click_count INT,
    share_count INT,
    has_viewed BOOLEAN,
    user_view_count BIGINT,
    has_clicked BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        n.id,
        n.title,
        n.subtitle,
        n.description,
        n.content,
        n.media_type,
        n.media_url,
        n.thumbnail_url,
        n.media_alt_text,
        n.video_duration,
        n.start_date,
        n.end_date,
        n.created_at,
        n.updated_at,
        n.published_at,
        n.priority,
        n.display_order,
        n.status,
        n.action_type,
        n.action_data,
        n.target_audience,
        n.is_featured,
        n.show_badge,
        n.badge_text,
        n.badge_color,
        n.background_color,
        n.text_color,
        n.card_style,
        n.category,
        n.tags,
        n.view_count,
        n.click_count,
        n.share_count,
        -- Vérifier si l'utilisateur a déjà vu cette actualité
        EXISTS(
            SELECT 1 FROM news_views 
            WHERE news_id = n.id AND user_id = p_user_id
        ) as has_viewed,
        -- Compter le nombre de fois que l'utilisateur a vu cette actualité
        (
            SELECT COUNT(*) FROM news_views 
            WHERE news_id = n.id AND user_id = p_user_id
        ) as user_view_count,
        -- Vérifier si l'utilisateur a cliqué sur cette actualité
        EXISTS(
            SELECT 1 FROM news_interactions 
            WHERE news_id = n.id AND user_id = p_user_id AND interaction_type = 'click'
        ) as has_clicked
    FROM news n
    WHERE 
        -- Statut publié uniquement
        n.status = 'published'
        
        -- Vérifier les dates de début et fin
        AND n.start_date <= NOW()
        AND (n.end_date IS NULL OR n.end_date >= NOW())
        
        -- Vérifier le ciblage d'audience
        AND (
            n.target_audience = 'all'
            OR n.target_audience = p_user_type
            OR (
                n.target_audience = 'specific'
                AND (
                    n.target_programs IS NULL
                    OR n.target_programs @> p_user_programs::jsonb
                )
            )
        )
        
        -- Respecter le nombre max d'affichages
        AND (
            n.max_display_count IS NULL
            OR (
                SELECT COUNT(*) FROM news_views 
                WHERE news_id = n.id AND user_id = p_user_id
            ) < n.max_display_count
        )
        
        -- Filtre pour les nouveaux utilisateurs
        AND (
            n.show_for_new_users_only = FALSE
            OR (n.show_for_new_users_only = TRUE AND p_is_new_user = TRUE)
        )
    
    -- Ordre d'affichage
    ORDER BY 
        n.is_featured DESC,
        n.priority DESC,
        n.display_order DESC,
        n.published_at DESC
    
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_active_news_for_user IS 'Récupère les actualités actives pour un utilisateur avec ciblage et filtrage';

-- Fonction: Enregistrer une vue d'actualité
CREATE OR REPLACE FUNCTION record_news_view(
    p_news_id UUID,
    p_user_id UUID,
    p_session_id VARCHAR DEFAULT NULL,
    p_device_info JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    -- Insérer la vue
    INSERT INTO news_views (news_id, user_id, session_id, device_info)
    VALUES (p_news_id, p_user_id, p_session_id, p_device_info);
    
    -- Incrémenter le compteur de vues
    UPDATE news 
    SET view_count = view_count + 1
    WHERE id = p_news_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION record_news_view IS 'Enregistre une vue d''actualité et met à jour les compteurs';

-- Fonction: Enregistrer une interaction
CREATE OR REPLACE FUNCTION record_news_interaction(
    p_news_id UUID,
    p_user_id UUID,
    p_interaction_type VARCHAR,
    p_metadata JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    -- Insérer l'interaction
    INSERT INTO news_interactions (news_id, user_id, interaction_type, metadata)
    VALUES (p_news_id, p_user_id, p_interaction_type, p_metadata);
    
    -- Mettre à jour les compteurs selon le type d'interaction
    IF p_interaction_type = 'click' THEN
        UPDATE news SET click_count = click_count + 1 WHERE id = p_news_id;
    ELSIF p_interaction_type = 'share' THEN
        UPDATE news SET share_count = share_count + 1 WHERE id = p_news_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION record_news_interaction IS 'Enregistre une interaction utilisateur et met à jour les compteurs';

-- Fonction: Récupérer les statistiques d'une actualité
CREATE OR REPLACE FUNCTION get_news_statistics(p_news_id UUID)
RETURNS TABLE (
    news_id UUID,
    title VARCHAR,
    total_views INT,
    total_clicks INT,
    total_shares INT,
    unique_viewers BIGINT,
    unique_clickers BIGINT,
    likes_count BIGINT,
    bookmarks_count BIGINT,
    click_rate_percentage NUMERIC,
    last_interaction_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        n.id as news_id,
        n.title,
        n.view_count as total_views,
        n.click_count as total_clicks,
        n.share_count as total_shares,
        (SELECT COUNT(DISTINCT user_id) FROM news_views WHERE news_views.news_id = n.id) as unique_viewers,
        (SELECT COUNT(DISTINCT user_id) FROM news_interactions WHERE news_interactions.news_id = n.id AND interaction_type = 'click') as unique_clickers,
        (SELECT COUNT(*) FROM news_interactions WHERE news_interactions.news_id = n.id AND interaction_type = 'like') as likes_count,
        (SELECT COUNT(*) FROM news_interactions WHERE news_interactions.news_id = n.id AND interaction_type = 'bookmark') as bookmarks_count,
        CASE 
            WHEN n.view_count > 0 THEN 
                ROUND((n.click_count::NUMERIC / n.view_count::NUMERIC) * 100, 2)
            ELSE 0 
        END as click_rate_percentage,
        (SELECT MAX(interacted_at) FROM news_interactions WHERE news_interactions.news_id = n.id) as last_interaction_at
    FROM news n
    WHERE n.id = p_news_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_news_statistics IS 'Récupère les statistiques complètes d''une actualité';

-- =====================================================
-- VUE MATÉRIALISÉE POUR LES STATISTIQUES (OPTIONNEL)
-- =====================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS news_stats AS
SELECT 
    n.id as news_id,
    n.title,
    n.status,
    n.category,
    n.created_at,
    n.published_at,
    COUNT(DISTINCT nv.user_id) as unique_viewers,
    COUNT(nv.id) as total_views,
    COUNT(DISTINCT CASE WHEN ni.interaction_type = 'click' THEN ni.user_id END) as unique_clickers,
    COUNT(CASE WHEN ni.interaction_type = 'click' THEN 1 END) as total_clicks,
    COUNT(CASE WHEN ni.interaction_type = 'share' THEN 1 END) as total_shares,
    COUNT(CASE WHEN ni.interaction_type = 'like' THEN 1 END) as total_likes,
    COUNT(CASE WHEN ni.interaction_type = 'bookmark' THEN 1 END) as total_bookmarks,
    ROUND(
        (COUNT(CASE WHEN ni.interaction_type = 'click' THEN 1 END)::NUMERIC / 
         NULLIF(COUNT(nv.id), 0)::NUMERIC) * 100, 
        2
    ) as click_through_rate
FROM news n
LEFT JOIN news_views nv ON n.id = nv.news_id
LEFT JOIN news_interactions ni ON n.id = ni.news_id
GROUP BY n.id, n.title, n.status, n.category, n.created_at, n.published_at;

CREATE UNIQUE INDEX IF NOT EXISTS idx_news_stats_news_id ON news_stats(news_id);

COMMENT ON MATERIALIZED VIEW news_stats IS 'Vue matérialisée des statistiques agrégées des actualités (à rafraîchir périodiquement)';

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Activer RLS sur les tables
ALTER TABLE news ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_interactions ENABLE ROW LEVEL SECURITY;

-- Politique: Les utilisateurs peuvent voir les actualités publiées
CREATE POLICY "Users can view published news"
ON news FOR SELECT
USING (
    status = 'published'
    AND start_date <= NOW()
    AND (end_date IS NULL OR end_date >= NOW())
);

-- Politique: Les utilisateurs peuvent voir leurs propres vues
CREATE POLICY "Users can view their own news views"
ON news_views FOR SELECT
USING (auth.uid() = user_id);

-- Politique: Les utilisateurs peuvent créer leurs propres vues
CREATE POLICY "Users can create their own news views"
ON news_views FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Politique: Les utilisateurs peuvent voir leurs propres interactions
CREATE POLICY "Users can view their own interactions"
ON news_interactions FOR SELECT
USING (auth.uid() = user_id);

-- Politique: Les utilisateurs peuvent créer leurs propres interactions
CREATE POLICY "Users can create their own interactions"
ON news_interactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Politique: Les admins ont accès complet aux actualités
-- Note: Adapter selon votre système de rôles
-- CREATE POLICY "Admins have full access to news"
-- ON news FOR ALL
-- USING (
--     EXISTS (
--         SELECT 1 FROM user_roles
--         WHERE user_id = auth.uid()
--         AND role = 'admin'
--     )
-- );

-- =====================================================
-- NOTES D'UTILISATION
-- =====================================================

-- Pour rafraîchir la vue matérialisée des statistiques :
-- REFRESH MATERIALIZED VIEW CONCURRENTLY news_stats;

-- Pour nettoyer les anciennes actualités archivées :
-- DELETE FROM news WHERE status = 'archived' AND updated_at < NOW() - INTERVAL '6 months';

-- Pour supprimer les vieilles vues (plus de 1 an) :
-- DELETE FROM news_views WHERE viewed_at < NOW() - INTERVAL '1 year';

-- Note: Les fonctionnalités de masquage (dismissals) et de ciblage par niveaux
-- ne sont pas encore implémentées dans ce schéma.

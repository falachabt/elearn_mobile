-- ============================================================================
-- Seed File: Default Resources, Roles, and Permissions
-- ============================================================================
-- Ce fichier initialise les ressources, rôles et permissions par défaut
-- pour le système de gestion des permissions de l'application eLearn
-- 
-- Structure:
-- 1. Ressources (resources)
-- 2. Rôles (roles)
-- 3. Permissions globales par rôle
-- ============================================================================

-- ============================================================================
-- 1. RESSOURCES (RESOURCES)
-- ============================================================================
-- Les ressources représentent les différentes entités de l'application
-- Format slug: nom-en-minuscule-0 (cohérent avec les données existantes)
-- Note: Supprime les anciennes ressources pour éviter les doublons

DELETE FROM public.ressources;

INSERT INTO public.ressources (name, code, slug, created_at) 
VALUES 
  -- Ressources principales existantes
  ('COURSES', 'COURSES', 'courses-0', now()),
  ('QUIZ', 'QUIZ', 'quiz-0', now()),
  ('LEARNING_PATH', 'LEARNING_PATH', 'learning_path-0', now()),
  
  -- Gestion des cours et contenu
  ('Course Content', 'COURSE_CONTENT', 'course_content-0', now()),
  ('Course Categories', 'COURSE_CATEGORY', 'course_category-0', now()),
  
  -- Gestion des quiz et examens
  ('Quiz Questions', 'QUIZ_QUESTION', 'quiz_question-0', now()),
  ('Quiz Templates', 'QUIZ_TEMPLATE', 'quiz_template-0', now()),
  ('Exams', 'EXAM', 'exam-0', now()),
  ('Started Exams', 'STARTED_EXAM', 'started_exam-0', now()),
  
  -- Gestion des utilisateurs
  ('Accounts', 'ACCOUNT', 'account-0', now()),
  ('User Progress', 'USER_PROGRESS', 'user_progress-0', now()),
  ('User XP', 'USER_XP', 'user_xp-0', now()),
  
  -- Gestion des groupes et classes
  ('Groups', 'GROUP', 'group-0', now()),
  ('Classes', 'CLASS', 'class-0', now()),
  
  -- Gestion du contenu
  ('Tags', 'TAG', 'tag-0', now()),
  ('Media', 'MEDIA', 'media-0', now()),
  ('Documents', 'DOCUMENT', 'document-0', now()),
  
  -- Communication et collaboration
  ('Chat Rooms', 'CHAT_ROOM', 'chat_room-0', now()),
  ('Messages', 'MESSAGE', 'message-0', now()),
  
  -- Gestion des écoles
  ('Schools', 'SCHOOL', 'school-0', now()),
  ('School Programs', 'SCHOOL_PROGRAM', 'school_program-0', now()),
  ('Year Programs', 'YEAR_PROGRAM', 'year_program-0', now()),
  
  -- Rapports et statistiques
  ('Reports', 'REPORT', 'report-0', now()),
  ('Analytics', 'ANALYTICS', 'analytics-0', now()),
  
  -- Système
  ('Roles', 'ROLE', 'role-0', now()),
  ('Permissions', 'PERMISSION', 'permission-0', now()),
  ('Settings', 'SETTING', 'setting-0', now()),
  ('Staff', 'STAFF', 'staff-0', now()),
  
  -- Finances et paiements
  ('Payments', 'PAYMENT', 'payment-0', now()),
  ('Invoices', 'INVOICE', 'invoice-0', now()),
  ('Transactions', 'TRANSACTION', 'transaction-0', now()),
  
  -- Concours
  ('Competitions', 'COMPETITION', 'competition-0', now());

-- ============================================================================
-- 2. RÔLES (ROLES)
-- ============================================================================
-- Les rôles définissent les différents niveaux d'accès dans l'application
-- Note: Pour l'instant, seuls ADMIN et STAFF sont utilisés dans l'application

DELETE FROM public.roles;

INSERT INTO public.roles (name)
VALUES
  ('ADMIN'),
  ('STAFF');

-- ============================================================================
-- 3. PERMISSIONS PAR RÔLE
-- ============================================================================
-- Définit les permissions globales pour chaque rôle sur chaque ressource
-- Format: role -> resource -> [can_create, can_read, can_update, can_delete]
-- Note: Seuls ADMIN et STAFF sont configurés pour l'instant

-- ----------------------------------------------------------------------------
-- 3.1 ADMIN - Accès complet à toutes les ressources
-- ----------------------------------------------------------------------------
DELETE FROM public.resource_permissions;

INSERT INTO public.resource_permissions (role_id, resource_id, can_create, can_read, can_update, can_delete, created_at)
SELECT 
  r.id as role_id,
  res.id as resource_id,
  true as can_create,
  true as can_read,
  true as can_update,
  true as can_delete,
  now() as created_at
FROM public.roles r
CROSS JOIN public.ressources res
WHERE r.name = 'ADMIN';

-- ----------------------------------------------------------------------------
-- 3.2 STAFF - Accès complet sauf suppression sur ressources critiques système
-- ----------------------------------------------------------------------------
INSERT INTO public.resource_permissions (role_id, resource_id, can_create, can_read, can_update, can_delete, created_at)
SELECT 
  r.id as role_id,
  res.id as resource_id,
  -- Staff peut créer presque tout
  CASE 
    WHEN res.slug IN ('role-0', 'permission-0') THEN false
    ELSE true
  END as can_create,
  -- Staff peut tout lire
  true as can_read,
  -- Staff peut tout modifier sauf les permissions système
  CASE 
    WHEN res.slug IN ('permission-0') THEN false
    ELSE true
  END as can_update,
  -- Staff ne peut supprimer les ressources critiques système
  CASE 
    WHEN res.slug IN ('setting-0', 'role-0', 'permission-0', 'school-0', 'account-0') THEN false
    ELSE true
  END as can_delete,
  now() as created_at
FROM public.roles r
CROSS JOIN public.ressources res
WHERE r.name = 'STAFF';

-- ============================================================================
-- 4. VÉRIFICATIONS ET STATISTIQUES
-- ============================================================================

-- Compter les ressources créées
DO $$
DECLARE
  resource_count INTEGER;
  role_count INTEGER;
  permission_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO resource_count FROM public.ressources;
  SELECT COUNT(*) INTO role_count FROM public.roles;
  SELECT COUNT(*) INTO permission_count FROM public.resource_permissions;
  
  RAISE NOTICE '============================================';
  RAISE NOTICE 'SEED COMPLETED SUCCESSFULLY';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Resources created: %', resource_count;
  RAISE NOTICE 'Roles created: %', role_count;
  RAISE NOTICE 'Permissions created: %', permission_count;
  RAISE NOTICE '============================================';
END $$;

-- ============================================================================
-- 5. REQUÊTES UTILES POUR VÉRIFICATION
-- ============================================================================

-- Lister toutes les ressources
-- SELECT * FROM public.ressources ORDER BY name;

-- Lister tous les rôles
-- SELECT * FROM public.roles ORDER BY name;

-- Voir les permissions par rôle
-- SELECT 
--   r.name as role,
--   res.name as resource,
--   res.slug,
--   rp.can_create,
--   rp.can_read,
--   rp.can_update,
--   rp.can_delete
-- FROM public.resource_permissions rp
-- JOIN public.roles r ON rp.role_id = r.id
-- JOIN public.ressources res ON rp.resource_id = res.id
-- ORDER BY r.name, res.name;

-- Compter les permissions par rôle
-- SELECT 
--   r.name as role,
--   COUNT(*) as total_permissions,
--   SUM(CASE WHEN rp.can_create THEN 1 ELSE 0 END) as can_create_count,
--   SUM(CASE WHEN rp.can_read THEN 1 ELSE 0 END) as can_read_count,
--   SUM(CASE WHEN rp.can_update THEN 1 ELSE 0 END) as can_update_count,
--   SUM(CASE WHEN rp.can_delete THEN 1 ELSE 0 END) as can_delete_count
-- FROM public.resource_permissions rp
-- JOIN public.roles r ON rp.role_id = r.id
-- GROUP BY r.name
-- ORDER BY r.name;

-- ============================================================================
-- FIN DU SEED
-- ============================================================================


-- ============================================================================
-- 6. DONNÉES DE TEST - SECONDARY SCHOOL SYSTEM
-- ============================================================================

-- 6.1 Catégories
INSERT INTO public.courses_categories (name, description) VALUES
  ('Mathématiques', 'Cours de mathématiques'),
  ('Physique', 'Cours de physique'),
  ('Chimie', 'Cours de chimie'),
  ('SVT', 'Sciences de la Vie et de la Terre'),
  ('Français', 'Langue française'),
  ('Anglais', 'Langue anglaise')
ON CONFLICT DO NOTHING;

-- 6.2 Tags
INSERT INTO public.tags (name) VALUES
  ('Terminale'),
  ('Première'),
  ('Algèbre'),
  ('Géométrie'),
  ('Mécanique'),
  ('Électricité'),
  ('Chimie organique'),
  ('Biologie'),
  ('Grammaire'),
  ('Vocabulaire')
ON CONFLICT DO NOTHING;

-- 6.3 Cours avec catégories et tags
INSERT INTO public.courses (name, description, status, category) 
SELECT 
  'Algèbre Terminale',
  'Cours d''algèbre pour Terminale',
  true,
  id
FROM public.courses_categories WHERE name = 'Mathématiques'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.courses (name, description, status, category)
SELECT 
  'Géométrie dans l''espace',
  'Cours de géométrie 3D',
  true,
  id
FROM public.courses_categories WHERE name = 'Mathématiques'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.courses (name, description, status, category)
SELECT 
  'Mécanique Newtonienne',
  'Lois de Newton et applications',
  true,
  id
FROM public.courses_categories WHERE name = 'Physique'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.courses (name, description, status, category)
SELECT 
  'Électricité',
  'Circuits électriques et lois',
  true,
  id
FROM public.courses_categories WHERE name = 'Physique'
LIMIT 1
ON CONFLICT DO NOTHING;

-- Lier tags aux cours (via array tags)
UPDATE public.courses
SET tags = ARRAY(SELECT id::text FROM public.tags WHERE name IN ('Terminale', 'Algèbre'))
WHERE name = 'Algèbre Terminale';

UPDATE public.courses
SET tags = ARRAY(SELECT id::text FROM public.tags WHERE name IN ('Terminale', 'Géométrie'))
WHERE name = 'Géométrie dans l''espace';

UPDATE public.courses
SET tags = ARRAY(SELECT id::text FROM public.tags WHERE name IN ('Terminale', 'Mécanique'))
WHERE name = 'Mécanique Newtonienne';

UPDATE public.courses
SET tags = ARRAY(SELECT id::text FROM public.tags WHERE name IN ('Terminale', 'Électricité'))
WHERE name = 'Électricité';

-- 6.4 Quiz (beaucoup plus)
INSERT INTO public.quiz (name, description) VALUES
  ('Quiz Algèbre 1', 'Équations du second degré'),
  ('Quiz Algèbre 2', 'Systèmes d''équations'),
  ('Quiz Algèbre 3', 'Polynômes'),
  ('Quiz Algèbre 4', 'Fonctions'),
  ('Quiz Algèbre 5', 'Suites numériques'),
  ('Quiz Géométrie 1', 'Volumes'),
  ('Quiz Géométrie 2', 'Surfaces'),
  ('Quiz Géométrie 3', 'Vecteurs 3D'),
  ('Quiz Géométrie 4', 'Produit scalaire'),
  ('Quiz Mécanique 1', 'Lois de Newton'),
  ('Quiz Mécanique 2', 'Chute libre'),
  ('Quiz Mécanique 3', 'Énergie cinétique'),
  ('Quiz Mécanique 4', 'Énergie potentielle'),
  ('Quiz Mécanique 5', 'Travail et puissance'),
  ('Quiz Électricité 1', 'Loi d''Ohm'),
  ('Quiz Électricité 2', 'Circuits série'),
  ('Quiz Électricité 3', 'Circuits parallèle'),
  ('Quiz Électricité 4', 'Puissance électrique')
ON CONFLICT DO NOTHING;

-- 6.5 Lier quiz aux cours
INSERT INTO public.quiz_courses ("quizId", "courseId")
SELECT q.id, c.id
FROM public.quiz q
CROSS JOIN public.courses c
WHERE q.name LIKE 'Quiz Algèbre%' AND c.name = 'Algèbre Terminale'
ON CONFLICT DO NOTHING;

INSERT INTO public.quiz_courses ("quizId", "courseId")
SELECT q.id, c.id
FROM public.quiz q
CROSS JOIN public.courses c
WHERE q.name LIKE 'Quiz Géométrie%' AND c.name = 'Géométrie dans l''espace'
ON CONFLICT DO NOTHING;

INSERT INTO public.quiz_courses ("quizId", "courseId")
SELECT q.id, c.id
FROM public.quiz q
CROSS JOIN public.courses c
WHERE q.name LIKE 'Quiz Mécanique%' AND c.name = 'Mécanique Newtonienne'
ON CONFLICT DO NOTHING;

INSERT INTO public.quiz_courses ("quizId", "courseId")
SELECT q.id, c.id
FROM public.quiz q
CROSS JOIN public.courses c
WHERE q.name LIKE 'Quiz Électricité%' AND c.name = 'Électricité'
ON CONFLICT DO NOTHING;

-- 6.6 Exercices pour les cours (beaucoup plus)
INSERT INTO public.exercices (course_id, title, content)
SELECT id, 'Exercice 1: Équations du second degré', '{}'::jsonb FROM public.courses WHERE name = 'Algèbre Terminale'
UNION ALL
SELECT id, 'Exercice 2: Systèmes d''équations', '{}'::jsonb FROM public.courses WHERE name = 'Algèbre Terminale'
UNION ALL
SELECT id, 'Exercice 3: Polynômes degré 3', '{}'::jsonb FROM public.courses WHERE name = 'Algèbre Terminale'
UNION ALL
SELECT id, 'Exercice 4: Factorisation', '{}'::jsonb FROM public.courses WHERE name = 'Algèbre Terminale'
UNION ALL
SELECT id, 'Exercice 5: Fonctions polynomiales', '{}'::jsonb FROM public.courses WHERE name = 'Algèbre Terminale'
UNION ALL
SELECT id, 'Exercice 6: Suites arithmétiques', '{}'::jsonb FROM public.courses WHERE name = 'Algèbre Terminale'
UNION ALL
SELECT id, 'Exercice 7: Suites géométriques', '{}'::jsonb FROM public.courses WHERE name = 'Algèbre Terminale'
UNION ALL
SELECT id, 'Exercice 1: Volumes et surfaces', '{}'::jsonb FROM public.courses WHERE name = 'Géométrie dans l''espace'
UNION ALL
SELECT id, 'Exercice 2: Vecteurs dans l''espace', '{}'::jsonb FROM public.courses WHERE name = 'Géométrie dans l''espace'
UNION ALL
SELECT id, 'Exercice 3: Produit scalaire', '{}'::jsonb FROM public.courses WHERE name = 'Géométrie dans l''espace'
UNION ALL
SELECT id, 'Exercice 4: Plans et droites', '{}'::jsonb FROM public.courses WHERE name = 'Géométrie dans l''espace'
UNION ALL
SELECT id, 'Exercice 5: Sphères', '{}'::jsonb FROM public.courses WHERE name = 'Géométrie dans l''espace'
UNION ALL
SELECT id, 'Exercice 1: Principe fondamental', '{}'::jsonb FROM public.courses WHERE name = 'Mécanique Newtonienne'
UNION ALL
SELECT id, 'Exercice 2: Chute libre', '{}'::jsonb FROM public.courses WHERE name = 'Mécanique Newtonienne'
UNION ALL
SELECT id, 'Exercice 3: Énergie cinétique', '{}'::jsonb FROM public.courses WHERE name = 'Mécanique Newtonienne'
UNION ALL
SELECT id, 'Exercice 4: Énergie potentielle', '{}'::jsonb FROM public.courses WHERE name = 'Mécanique Newtonienne'
UNION ALL
SELECT id, 'Exercice 5: Conservation énergie', '{}'::jsonb FROM public.courses WHERE name = 'Mécanique Newtonienne'
UNION ALL
SELECT id, 'Exercice 6: Travail d''une force', '{}'::jsonb FROM public.courses WHERE name = 'Mécanique Newtonienne'
UNION ALL
SELECT id, 'Exercice 1: Loi d''Ohm', '{}'::jsonb FROM public.courses WHERE name = 'Électricité'
UNION ALL
SELECT id, 'Exercice 2: Circuits série', '{}'::jsonb FROM public.courses WHERE name = 'Électricité'
UNION ALL
SELECT id, 'Exercice 3: Circuits parallèle', '{}'::jsonb FROM public.courses WHERE name = 'Électricité'
UNION ALL
SELECT id, 'Exercice 4: Puissance électrique', '{}'::jsonb FROM public.courses WHERE name = 'Électricité'
UNION ALL
SELECT id, 'Exercice 5: Résistances équivalentes', '{}'::jsonb FROM public.courses WHERE name = 'Électricité'
ON CONFLICT DO NOTHING;

-- 6.7 Classes secondaires
INSERT INTO public.secondary_classes (name, description, level) VALUES
  ('Terminale', 'Classe de Terminale', 1),
  ('Première', 'Classe de Première', 2)
ON CONFLICT (name) DO NOTHING;

-- 6.8 Séries
INSERT INTO public.secondary_series (class_id, name, description)
SELECT id, 'C', 'Série scientifique C'
FROM public.secondary_classes WHERE name = 'Terminale'
ON CONFLICT (class_id, name) DO NOTHING;

INSERT INTO public.secondary_series (class_id, name, description)
SELECT id, 'D', 'Série scientifique D'
FROM public.secondary_classes WHERE name = 'Terminale'
ON CONFLICT (class_id, name) DO NOTHING;

INSERT INTO public.secondary_series (class_id, name, description)
SELECT id, 'A', 'Série littéraire'
FROM public.secondary_classes WHERE name = 'Terminale'
ON CONFLICT (class_id, name) DO NOTHING;

INSERT INTO public.secondary_series (class_id, name, description)
SELECT id, 'C', 'Série scientifique C'
FROM public.secondary_classes WHERE name = 'Première'
ON CONFLICT (class_id, name) DO NOTHING;

-- 6.9 Programmes
INSERT INTO public.secondary_programs (class_id, series_id, price, description, is_active)
SELECT 
  sc.id,
  ss.id,
  75.00,
  'Programme complet Terminale C',
  true
FROM public.secondary_classes sc
JOIN public.secondary_series ss ON ss.class_id = sc.id
WHERE sc.name = 'Terminale' AND ss.name = 'C'
ON CONFLICT (class_id, series_id) DO NOTHING;

INSERT INTO public.secondary_programs (class_id, series_id, price, description, is_active)
SELECT 
  sc.id,
  ss.id,
  75.00,
  'Programme complet Terminale D',
  true
FROM public.secondary_classes sc
JOIN public.secondary_series ss ON ss.class_id = sc.id
WHERE sc.name = 'Terminale' AND ss.name = 'D'
ON CONFLICT (class_id, series_id) DO NOTHING;

INSERT INTO public.secondary_programs (class_id, series_id, price, description, is_active)
SELECT 
  sc.id,
  ss.id,
  60.00,
  'Programme complet Première C',
  true
FROM public.secondary_classes sc
JOIN public.secondary_series ss ON ss.class_id = sc.id
WHERE sc.name = 'Première' AND ss.name = 'C'
ON CONFLICT (class_id, series_id) DO NOTHING;

-- 6.10 Ajouter des cours aux programmes
-- Programme Terminale C: Algèbre + Mécanique
INSERT INTO public.secondary_program_courses (program_id, course_id, order_index)
SELECT sp.id, c.id, 0
FROM public.secondary_programs sp
CROSS JOIN public.courses c
JOIN public.secondary_classes sc ON sp.class_id = sc.id
JOIN public.secondary_series ss ON sp.series_id = ss.id
WHERE sc.name = 'Terminale' AND ss.name = 'C' AND c.name = 'Algèbre Terminale'
ON CONFLICT DO NOTHING;

INSERT INTO public.secondary_program_courses (program_id, course_id, order_index)
SELECT sp.id, c.id, 1
FROM public.secondary_programs sp
CROSS JOIN public.courses c
JOIN public.secondary_classes sc ON sp.class_id = sc.id
JOIN public.secondary_series ss ON sp.series_id = ss.id
WHERE sc.name = 'Terminale' AND ss.name = 'C' AND c.name = 'Mécanique Newtonienne'
ON CONFLICT DO NOTHING;

-- Programme Terminale D: Géométrie + Électricité
INSERT INTO public.secondary_program_courses (program_id, course_id, order_index)
SELECT sp.id, c.id, 0
FROM public.secondary_programs sp
CROSS JOIN public.courses c
JOIN public.secondary_classes sc ON sp.class_id = sc.id
JOIN public.secondary_series ss ON sp.series_id = ss.id
WHERE sc.name = 'Terminale' AND ss.name = 'D' AND c.name = 'Géométrie dans l''espace'
ON CONFLICT DO NOTHING;

INSERT INTO public.secondary_program_courses (program_id, course_id, order_index)
SELECT sp.id, c.id, 1
FROM public.secondary_programs sp
CROSS JOIN public.courses c
JOIN public.secondary_classes sc ON sp.class_id = sc.id
JOIN public.secondary_series ss ON sp.series_id = ss.id
WHERE sc.name = 'Terminale' AND ss.name = 'D' AND c.name = 'Électricité'
ON CONFLICT DO NOTHING;

-- Programme Première C: Algèbre uniquement
INSERT INTO public.secondary_program_courses (program_id, course_id, order_index)
SELECT sp.id, c.id, 0
FROM public.secondary_programs sp
CROSS JOIN public.courses c
JOIN public.secondary_classes sc ON sp.class_id = sc.id
JOIN public.secondary_series ss ON sp.series_id = ss.id
WHERE sc.name = 'Première' AND ss.name = 'C' AND c.name = 'Algèbre Terminale'
ON CONFLICT DO NOTHING;

-- Statistiques finales
DO $$
DECLARE
  cat_count INTEGER;
  tag_count INTEGER;
  course_count INTEGER;
  quiz_count INTEGER;
  exercise_count INTEGER;
  class_count INTEGER;
  series_count INTEGER;
  program_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO cat_count FROM public.courses_categories;
  SELECT COUNT(*) INTO tag_count FROM public.tags;
  SELECT COUNT(*) INTO course_count FROM public.courses;
  SELECT COUNT(*) INTO quiz_count FROM public.quiz;
  SELECT COUNT(*) INTO exercise_count FROM public.exercices;
  SELECT COUNT(*) INTO class_count FROM public.secondary_classes;
  SELECT COUNT(*) INTO series_count FROM public.secondary_series;
  SELECT COUNT(*) INTO program_count FROM public.secondary_programs;
  
  RAISE NOTICE '============================================';
  RAISE NOTICE 'SECONDARY SCHOOL DATA SEEDED';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Categories: %', cat_count;
  RAISE NOTICE 'Tags: %', tag_count;
  RAISE NOTICE 'Courses: %', course_count;
  RAISE NOTICE 'Quiz: %', quiz_count;
  RAISE NOTICE 'Exercises: %', exercise_count;
  RAISE NOTICE 'Classes: %', class_count;
  RAISE NOTICE 'Series: %', series_count;
  RAISE NOTICE 'Programs: %', program_count;
  RAISE NOTICE '============================================';
END $$;

-- ============================================================================
-- 5. CRÉATION DU COMPTE ADMIN PAR DÉFAUT
-- ============================================================================
-- Crée un compte administrateur vérifié pour l'accès initial au système
-- Email: bennytenezeu@gmail.com
-- Mot de passe: Mohsaakou*195612
-- ============================================================================

DO $$
DECLARE
  admin_role_id UUID;
  admin_auth_id UUID;
  admin_exists BOOLEAN;
BEGIN
  -- Récupérer l'ID du rôle ADMIN
  SELECT id INTO admin_role_id FROM public.roles WHERE name = 'ADMIN' LIMIT 1;
  
  -- Vérifier si l'utilisateur existe déjà dans auth.users
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'bennytenezeu@gmail.com'
  ) INTO admin_exists;
  
  IF NOT admin_exists THEN
    -- Créer l'utilisateur dans auth.users
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      invited_at,
      confirmation_token,
      confirmation_sent_at,
      recovery_token,
      recovery_sent_at,
      email_change_token_new,
      email_change,
      email_change_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      created_at,
      updated_at,
      phone,
      phone_confirmed_at,
      phone_change,
      phone_change_token,
      phone_change_sent_at,
      email_change_token_current,
      email_change_confirm_status,
      banned_until,
      reauthentication_token,
      reauthentication_sent_at,
      is_sso_user,
      deleted_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'bennytenezeu@gmail.com',
      crypt('Mohsaakou*195612', gen_salt('bf')), -- Hash du mot de passe
      NOW(), -- Email vérifié immédiatement
      NULL,
      '',
      NULL,
      '',
      NULL,
      '',
      '',
      NULL,
      NULL,
      '{"provider":"email","providers":["email"]}',
      '{"type":"admin","role":"admin"}',
      false,
      NOW(),
      NOW(),
      NULL,
      NULL,
      '',
      '',
      NULL,
      '',
      0,
      NULL,
      '',
      NULL,
      false,
      NULL
    )
    RETURNING id INTO admin_auth_id;
    
    -- Créer le compte dans la table accounts
    INSERT INTO public.accounts (
      id,
      "authId",
      firstname,
      lastname,
      email,
      type,
      role_id,
      status,
      onboarding_done,
      created_at
    ) VALUES (
      gen_random_uuid(),
      admin_auth_id,
      'Benny',
      'Tenezeu',
      'bennytenezeu@gmail.com',
      'admin',
      admin_role_id,
      true,
      true,
      NOW()
    );
    
    RAISE NOTICE '============================================';
    RAISE NOTICE 'COMPTE ADMIN CRÉÉ AVEC SUCCÈS';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Email: bennytenezeu@gmail.com';
    RAISE NOTICE 'Mot de passe: Mohsaakou*195612';
    RAISE NOTICE 'Statut: Vérifié et actif';
    RAISE NOTICE 'Type: admin (Accès complet)';
    RAISE NOTICE '============================================';
  ELSE
    -- Mettre à jour l'utilisateur existant
    SELECT id INTO admin_auth_id FROM auth.users WHERE email = 'bennytenezeu@gmail.com';
    
    -- Mettre à jour le mot de passe et vérifier l'email
    UPDATE auth.users 
    SET 
      encrypted_password = crypt('Mohsaakou*195612', gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
      raw_app_meta_data = '{"provider":"email","providers":["email"]}',
      raw_user_meta_data = '{"type":"admin","role":"admin"}',
      updated_at = NOW()
    WHERE email = 'bennytenezeu@gmail.com';
    
    -- Mettre à jour ou créer le compte dans accounts
    INSERT INTO public.accounts (
      id,
      "authId",
      firstname,
      lastname,
      email,
      type,
      role_id,
      status,
      onboarding_done,
      created_at
    ) VALUES (
      gen_random_uuid(),
      admin_auth_id,
      'Benny',
      'Tenezeu',
      'bennytenezeu@gmail.com',
      'admin',
      admin_role_id,
      true,
      true,
      NOW()
    )
    ON CONFLICT ("authId") 
    DO UPDATE SET
      type = 'admin',
      role_id = admin_role_id,
      status = true,
      onboarding_done = true;
    
    RAISE NOTICE '============================================';
    RAISE NOTICE 'COMPTE ADMIN MIS À JOUR';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Email: bennytenezeu@gmail.com';
    RAISE NOTICE 'Mot de passe: Mohsaakou*195612';
    RAISE NOTICE 'Statut: Vérifié et actif';
    RAISE NOTICE 'Type: admin (Accès complet)';
    RAISE NOTICE '============================================';
  END IF;
  
END $$;

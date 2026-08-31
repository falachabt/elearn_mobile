# Tests Supabase

Ce dossier contient les tests pour les différents systèmes de l'application :
- **secondary_school/** - Tests du système de préparation secondaire (Terminale, Première, etc.)
- **news/** - Tests du système de gestion d'actualités
- **jobs/** - Tests du système de jobs asynchrones

## 📋 Fichiers de test

---

## 🎓 Système Secondaire (secondary_school/)

### 01_secondary_tables_structure.sql
Vérifie la structure des tables :
- `secondary_classes` - Classes (Terminale, Première)
- `secondary_series` - Séries (C, D, A, TI)
- `secondary_programs` - Programmes de préparation
- `secondary_program_courses` - Cours associés
- `secondary_program_quizzes` - Quiz associés
- `secondary_program_exercises` - Exercices associés
- `secondary_document_folders` - Dossiers de documents
- `secondary_documents` - Documents (PDFs)
- `secondary_document_category_links` - Liens documents-catégories
- `secondary_program_documents` - Liens programmes-documents
- `user_secondary_enrollments` - Inscriptions utilisateurs
- `user_secondary_payments` - Paiements utilisateurs

**Tests:** 32 tests de structure et contraintes (storage.objects, correction_document_id et is_correction)

### 02_secondary_functions.sql
Vérifie l'existence des fonctions :
- `update_secondary_program_counts()` - Mise à jour des compteurs
- `sync_exercises_on_course_add()` - Synchronisation exercices
- `sync_exercises_on_course_remove()` - Suppression exercices
- `sync_exercise_to_programs()` - Ajout exercice aux programmes
- `remove_exercise_from_programs()` - Retrait exercice des programmes
- `calculate_secondary_expiry()` - Calcul date d'expiration
- `enroll_after_secondary_payment()` - Inscription après paiement
- `check_secondary_access()` - Vérification d'accès
- `delete_correction_with_document()` - Suppression correction avec document
- `sync_correction_properties()` - Synchronisation propriétés correction
- `update_correction_folder()` - Mise à jour dossier correction
- `sync_correction_categories()` - Synchronisation catégories correction
- `sync_new_correction()` - Synchronisation nouvelle correction

**Tests:** 13 tests de fonctions

### 03_secondary_triggers.sql
Vérifie les triggers :
- Triggers de comptage (courses, quizzes, exercises, documents)
- Triggers de synchronisation des exercices
- Triggers de synchronisation des corrections
- Triggers de paiement et inscription
- Test fonctionnel du trigger de comptage

**Tests:** 28 tests de triggers

### 04_secondary_integration.sql
Test d'intégration complet :
1. Création de classe, série et programme
2. Ajout de contenu (cours, quiz, exercices)
3. Paiement et inscription utilisateur
4. Vérification d'accès
5. Tests des vues
6. Tests des contraintes

**Tests:** 15 tests d'intégration

### 05_secondary_content_sync.sql
Test de synchronisation automatique des exercices et quiz (multi-programmes) :
- Ajout automatique des exercices/quiz quand un cours est ajouté
- Synchronisation sur plusieurs programmes simultanément
- Gestion des quiz partagés entre plusieurs cours
- Désactivation de contenu spécifique (is_active = FALSE)
- Suppression automatique du contenu quand le cours est retiré
- Tests mixtes (exercices + quiz)

**Tests:** 26 tests de synchronisation

### 06_secondary_documents.sql
Test du système de documents avec dossiers et catégories :
- Hiérarchie de dossiers (parent_folder_id)
- Création et gestion de documents
- Liaison avec catégories existantes (public.courses_categories)
- Compteur document_count automatique
- Contraintes UNIQUE et CASCADE DELETE
- Champs order_index et is_active

**Tests:** 21 tests fonctionnels (incluant liaison document-correction)

### 07_correction_sync.sql
Test de la synchronisation automatique des corrections :
- Héritage du dossier à la création
- Héritage des catégories à la création
- Synchronisation du changement de dossier
- Synchronisation ajout/suppression de catégorie
- Ajout de correction après coup
- Suppression en cascade
- Vérification de l'isolation (correction ne modifie pas le principal)

**Tests:** 10 tests de synchronisation des corrections

---

## 📰 Système de News (news/)

### 01_news_tables_structure.sql
Vérifie la structure des tables du système de news :
- `news` - Table principale des actualités
  - Contenu (title, subtitle, description, content)
  - Gestion des médias (media_type, media_url, thumbnail_url)
  - Dates (start_date, end_date, created_at, updated_at)
  - Statut (draft, scheduled, published, archived)
  - Actions (action_type, action_data)
  - Ciblage (target_audience, target_programs, target_user_types)
  - Affichage (is_featured, priority, display_order)
  - Statistiques (view_count, click_count, share_count)
- `news_views` - Tracking des vues par utilisateur
- `news_interactions` - Tracking des interactions (click, share, dismiss, like, bookmark)

**Tests:** 52 tests de structure (tables, colonnes, contraintes, index)

### 02_news_functions.sql
Vérifie l'existence des fonctions :
- `is_news_visible_for_user()` - Vérification de visibilité pour un utilisateur
- `get_active_news_for_user()` - Récupération des actualités actives filtrées
- `record_news_view()` - Enregistrement d'une vue
- `record_news_interaction()` - Enregistrement d'une interaction
- `get_news_statistics()` - Statistiques d'une actualité

**Tests:** 5 tests de fonctions

### 03_news_triggers.sql
Vérifie les triggers du système de news :
- Trigger `trigger_update_news_updated_at` - Mise à jour automatique de updated_at
- Tests fonctionnels des valeurs par défaut
- Tests des compteurs (view_count, click_count, share_count)
- Tests des timestamps (created_at, updated_at)

**Tests:** 5 tests de triggers

### 04_news_visibility.sql
Tests de visibilité et ciblage des actualités :
- Visibilité selon le statut (published, draft, archived)
- Visibilité selon les dates (start_date, end_date)
- Ciblage d'audience (all, concours, secondary, specific)
- Priorité et ordre d'affichage (priority, display_order, is_featured)
- Tracking des vues et interactions
- Mise à jour des compteurs

**Tests:** 15 tests de visibilité et ciblage

## 🚀 Exécution des tests

### Prérequis
Installer pgTAP dans votre base de données Supabase :
```sql
CREATE EXTENSION IF NOT EXISTS pgtap;
```

### Exécuter tous les tests
```bash
# Via Supabase CLI
supabase test db

# Système Secondaire
psql -h localhost -p 54322 -U postgres -d postgres -f supabase/tests/secondary_school/01_secondary_tables_structure.sql
psql -h localhost -p 54322 -U postgres -d postgres -f supabase/tests/secondary_school/02_secondary_functions.sql
psql -h localhost -p 54322 -U postgres -d postgres -f supabase/tests/secondary_school/03_secondary_triggers.sql
psql -h localhost -p 54322 -U postgres -d postgres -f supabase/tests/secondary_school/04_secondary_integration.sql
psql -h localhost -p 54322 -U postgres -d postgres -f supabase/tests/secondary_school/05_secondary_sync.sql
psql -h localhost -p 54322 -U postgres -d postgres -f supabase/tests/secondary_school/06_secondary_documents.sql

# Système News
psql -h localhost -p 54322 -U postgres -d postgres -f supabase/tests/news/01_news_tables_structure.sql
psql -h localhost -p 54322 -U postgres -d postgres -f supabase/tests/news/02_news_functions.sql
psql -h localhost -p 54322 -U postgres -d postgres -f supabase/tests/news/03_news_triggers.sql
psql -h localhost -p 54322 -U postgres -d postgres -f supabase/tests/news/04_news_visibility.sql
```

### Exécuter un test spécifique
```bash
# Test de structure du système secondaire
psql -h localhost -p 54322 -U postgres -d postgres -f supabase/tests/secondary_school/01_secondary_tables_structure.sql

# Test de visibilité du système news
psql -h localhost -p 54322 -U postgres -d postgres -f supabase/tests/news/04_news_visibility.sql
```

## 📊 Résultats attendus

Chaque fichier de test devrait afficher :
```
1..N
ok 1 - Description du test
ok 2 - Description du test
...
ok N - Description du test
```

En cas d'échec :
```
not ok X - Description du test
# Failed test X: "Description du test"
```

## 🔍 Détails des tests

### Tests du Système Secondaire

#### Tests de structure (01)
- Existence des tables
- Clés primaires et étrangères
- Contraintes UNIQUE
- Colonnes essentielles

#### Tests de fonctions (02)
- Existence des fonctions
- Signatures correctes

#### Tests de triggers (03)
- Existence des triggers
- Déclenchement correct
- Mise à jour des compteurs
- Synchronisation automatique

#### Tests d'intégration (04)
- Flux complet utilisateur
- Création de données
- Paiement et inscription
- Vérification d'accès
- Contraintes d'intégrité

### Tests du Système News

#### Tests de structure (01)
- Existence des 3 tables principales
- Vérification de toutes les colonnes
- Contraintes CHECK sur les enums
- Index pour performance
- Clés étrangères avec CASCADE

#### Tests de fonctions (02)
- Fonctions de visibilité et ciblage
- Fonctions de tracking
- Fonctions de statistiques

#### Tests de triggers (03)
- Trigger de mise à jour automatique
- Valeurs par défaut
- Initialisation des compteurs

#### Tests de visibilité (04)
- Filtrage par statut et dates
- Ciblage d'audience
- Ordre et priorité d'affichage
- Tracking complet

## 🛠️ Dépannage

### Erreur: "extension pgtap is not available"
```sql
CREATE EXTENSION pgtap;
```

### Erreur: "relation does not exist"
Exécutez d'abord les migrations :
```bash
supabase db reset
```

### Tests échouent après modifications
1. Vérifiez que le schéma est à jour
2. Nettoyez les données de test
3. Réexécutez les migrations

## 📝 Ajouter de nouveaux tests

Pour ajouter un nouveau test :

1. Créez un fichier dans le dossier approprié :
   - `secondary_school/` pour le système secondaire
   - `news/` pour le système de news
   - `jobs/` pour le système de jobs

2. Utilisez la structure pgTAP :
```sql
begin;
select plan(N); -- N = nombre de tests

-- Vos tests ici
SELECT ok(...);
SELECT is(...);
SELECT has_table(...);

select * from finish();
rollback;
```

3. Documentez dans ce README

## 📚 Ressources

- [pgTAP Documentation](https://pgtap.org/)
- [Supabase Testing Guide](https://supabase.com/docs/guides/database/testing)
- [PostgreSQL Testing Best Practices](https://www.postgresql.org/docs/current/regress.html)

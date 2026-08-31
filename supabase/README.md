# Supabase Database Seeding

Ce dossier contient les fichiers de seed pour initialiser la base de données avec les ressources, rôles et permissions par défaut.

## 📋 Contenu du Seed

Le fichier `seed.sql` crée :

### 1. **Ressources (30 ressources)**
Les différentes entités de l'application avec leurs slugs uniques :

| Catégorie | Ressources |
|-----------|-----------|
| **Cours** | courses, course-content, course-categories |
| **Quiz/Examens** | quizzes, quiz-questions, quiz-templates, exams |
| **Apprentissage** | learning-paths |
| **Utilisateurs** | students, accounts, user-progress |
| **Groupes/Classes** | groups, classes |
| **Contenu** | tags, media, documents |
| **Communication** | chat-rooms, messages |
| **Écoles** | schools, school-programs |
| **Rapports** | reports, analytics |
| **Système** | roles, permissions, settings |
| **Finance** | payments, invoices, transactions |
| **Concours** | competitions |

### 2. **Rôles (8 rôles)**
- **admin** - Accès complet à toutes les ressources
- **staff** - Accès complet sauf suppression de ressources critiques
- **instructor** - Gestion des cours et contenus pédagogiques
- **teacher** - Consultation et modification limitée
- **student** - Accès lecture + progression personnelle
- **view** - Lecture seule sur contenu sélectionné
- **parent** - Suivi de la progression de l'enfant
- **guest** - Aucun accès (par défaut)

### 3. **Permissions (CRUD par rôle)**
Chaque rôle a des permissions spécifiques (Create, Read, Update, Delete) sur chaque ressource.

#### Résumé des permissions par rôle :

| Rôle | Create | Read | Update | Delete | Description |
|------|--------|------|--------|--------|-------------|
| **admin** | ✅ Tout | ✅ Tout | ✅ Tout | ✅ Tout | Contrôle total |
| **staff** | ✅ Presque tout | ✅ Presque tout | ✅ Presque tout | ⚠️ Limité | Pas de suppression des paramètres système |
| **instructor** | ✅ Contenu pédagogique | ✅ Large | ✅ Contenu pédagogique | ⚠️ Très limité | Gestion des cours et quiz |
| **teacher** | ⚠️ Limité | ✅ Contenu pédagogique | ⚠️ Très limité | ❌ Aucun | Consultation et modification mineure |
| **student** | ⚠️ Messages uniquement | ✅ Contenu accessible | ⚠️ Sa progression | ❌ Aucun | Apprentissage et communication |
| **view** | ❌ Aucun | ✅ Contenu limité | ❌ Aucun | ❌ Aucun | Observation uniquement |
| **parent** | ⚠️ Messages uniquement | ✅ Progression enfant | ❌ Aucun | ❌ Aucun | Suivi parental |

## 🚀 Utilisation

### Méthode 1 : Via Supabase CLI (Recommandé)

```bash
# Exécuter le seed
npx supabase db reset --db-url "postgresql://user:password@host:port/database"

# Ou si vous utilisez un projet local
npx supabase db reset
```

### Méthode 2 : Via l'éditeur SQL Supabase Dashboard

1. Allez dans votre projet Supabase Dashboard
2. Cliquez sur "SQL Editor" dans le menu latéral
3. Créez une nouvelle requête
4. Copiez-collez le contenu de `seed.sql`
5. Cliquez sur "Run" ou appuyez sur `Ctrl+Enter`

### Méthode 3 : Via psql (Ligne de commande)

```bash
psql -h your-host -p 5432 -U postgres -d your-database -f supabase/seed.sql
```

### Méthode 4 : Via npm script

```bash
npm run db:seed
```

## 🔍 Vérifications

Après l'exécution du seed, vous pouvez vérifier les données créées :

### Compter les ressources
```sql
SELECT COUNT(*) as total FROM public.ressources;
-- Résultat attendu : 30
```

### Compter les rôles
```sql
SELECT COUNT(*) as total FROM public.roles;
-- Résultat attendu : 8
```

### Voir les permissions par rôle
```sql
SELECT 
  r.name as role,
  COUNT(*) as total_permissions,
  SUM(CASE WHEN rp.can_create THEN 1 ELSE 0 END) as can_create,
  SUM(CASE WHEN rp.can_read THEN 1 ELSE 0 END) as can_read,
  SUM(CASE WHEN rp.can_update THEN 1 ELSE 0 END) as can_update,
  SUM(CASE WHEN rp.can_delete THEN 1 ELSE 0 END) as can_delete
FROM public.resource_permissions rp
JOIN public.roles r ON rp.role_id = r.id
GROUP BY r.name
ORDER BY r.name;
```

### Voir toutes les permissions d'un rôle spécifique
```sql
SELECT 
  res.name as resource,
  res.slug,
  rp.can_create,
  rp.can_read,
  rp.can_update,
  rp.can_delete
FROM public.resource_permissions rp
JOIN public.roles r ON rp.role_id = r.id
JOIN public.ressources res ON rp.resource_id = res.id
WHERE r.name = 'instructor'
ORDER BY res.name;
```

## 🔄 Réinitialisation

Pour réinitialiser les données et réexécuter le seed :

```sql
-- Supprimer toutes les permissions
TRUNCATE TABLE public.resource_permissions CASCADE;

-- Supprimer toutes les ressources
TRUNCATE TABLE public.ressources CASCADE;

-- Supprimer tous les rôles (attention : cela supprime aussi les références dans accounts)
-- TRUNCATE TABLE public.roles CASCADE;

-- Puis réexécuter le seed.sql
```

⚠️ **ATTENTION** : La suppression des rôles affectera les comptes utilisateurs existants.

## 📝 Structure des tables

### Table `ressources`
```sql
CREATE TABLE ressources (
  id uuid PRIMARY KEY,
  name text,
  code text,
  slug text UNIQUE,
  created_at timestamptz
);
```

### Table `roles`
```sql
CREATE TABLE roles (
  id uuid PRIMARY KEY,
  name varchar(255) UNIQUE NOT NULL
);
```

### Table `resource_permissions`
```sql
CREATE TABLE resource_permissions (
  id uuid PRIMARY KEY,
  role_id uuid REFERENCES roles(id),
  resource_id uuid REFERENCES ressources(id),
  user_id uuid,
  can_create boolean DEFAULT false,
  can_read boolean DEFAULT false,
  can_update boolean DEFAULT false,
  can_delete boolean DEFAULT false,
  created_at timestamptz
);
```

## 🛠️ Personnalisation

Pour ajouter de nouvelles ressources ou modifier les permissions :

1. **Ajouter une ressource** :
```sql
INSERT INTO public.ressources (id, name, code, slug, created_at) 
VALUES (gen_random_uuid(), 'Ma Ressource', 'MY_RESOURCE', 'my-resource', now());
```

2. **Modifier les permissions d'un rôle** :
```sql
-- Donner tous les droits au rôle 'instructor' sur 'my-resource'
INSERT INTO public.resource_permissions (role_id, resource_id, can_create, can_read, can_update, can_delete)
SELECT r.id, res.id, true, true, true, true
FROM public.roles r, public.ressources res
WHERE r.name = 'instructor' AND res.slug = 'my-resource';
```

3. **Créer un nouveau rôle** :
```sql
-- Créer le rôle
INSERT INTO public.roles (id, name) VALUES (gen_random_uuid(), 'moderator');

-- Assigner des permissions (exemple : lecture seule sur tout)
INSERT INTO public.resource_permissions (role_id, resource_id, can_create, can_read, can_update, can_delete)
SELECT r.id, res.id, false, true, false, false
FROM public.roles r
CROSS JOIN public.ressources res
WHERE r.name = 'moderator';
```

## 🔐 Sécurité

- Les slugs sont uniques et utilisés pour identifier les ressources dans le code
- Les permissions sont granulaires (CRUD séparé)
- Les rôles peuvent être combinés avec des permissions spécifiques par utilisateur
- Le système supporte à la fois les permissions globales (par rôle) et spécifiques (par utilisateur + ressource)

## 📚 Utilisation dans le code

```javascript
// Vérifier une permission
import { useResourcePermissions } from '@/lib/useAuthorisation';

function MyComponent() {
  const { permissions, isLoading } = useResourcePermissions('courses');
  
  if (permissions?.can_create) {
    // L'utilisateur peut créer un cours
  }
}

// Utiliser le PermissionGuard
import { PermissionGuard } from '@/components/authorization/AuthComponents';

<PermissionGuard 
  resource_slug="courses" 
  requiredPermission="create"
>
  <CreateCourseButton />
</PermissionGuard>
```

## 🐛 Dépannage

### Erreur : "duplicate key value violates unique constraint"
- Le seed a déjà été exécuté. Utilisez `TRUNCATE` pour réinitialiser ou modifiez le seed pour utiliser `ON CONFLICT DO NOTHING`.

### Erreur : "relation does not exist"
- Les tables n'existent pas encore. Exécutez d'abord les migrations du schéma (`0_prod.sql`).

### Permissions manquantes pour un rôle
- Vérifiez que le rôle existe dans la table `roles`
- Vérifiez que les ressources existent dans la table `ressources`
- Réexécutez la section des permissions pour ce rôle spécifique

---

**Dernière mise à jour** : 1er novembre 2025

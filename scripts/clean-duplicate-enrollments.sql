-- Script SQL pour nettoyer les duplications dans user_program_enrollments
-- À exécuter dans Supabase SQL Editor ou via psql

-- 1. Voir les duplications actuelles
SELECT 
    user_id, 
    program_id, 
    COUNT(*) as duplicate_count
FROM user_program_enrollments
GROUP BY user_id, program_id
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- 2. Garder uniquement l'enrollment le plus récent pour chaque (user_id, program_id)
-- ⚠️ ATTENTION : Cette requête SUPPRIME les duplications. Faites un backup avant !
WITH ranked_enrollments AS (
    SELECT 
        id,
        ROW_NUMBER() OVER (
            PARTITION BY user_id, program_id 
            ORDER BY created_at DESC  -- Garde le plus récent
        ) as rn
    FROM user_program_enrollments
)
DELETE FROM user_program_enrollments
WHERE id IN (
    SELECT id 
    FROM ranked_enrollments 
    WHERE rn > 1  -- Supprime tous sauf le plus récent
);

-- 3. Vérifier que les duplications sont supprimées
SELECT 
    user_id, 
    program_id, 
    COUNT(*) as count
FROM user_program_enrollments
GROUP BY user_id, program_id
HAVING COUNT(*) > 1;
-- Si cette requête retourne 0 lignes, c'est bon !

-- 4. Ajouter une contrainte UNIQUE pour empêcher les futures duplications (FORTEMENT RECOMMANDÉ)
-- Cette contrainte empêche le trigger de créer des duplications même en cas de race condition
ALTER TABLE user_program_enrollments
ADD CONSTRAINT unique_user_program 
UNIQUE (user_id, program_id);

-- 5. Vérifier que la contrainte a bien été ajoutée
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'user_program_enrollments'::regclass
  AND conname = 'unique_user_program';

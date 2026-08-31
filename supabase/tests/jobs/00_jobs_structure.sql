-- Vérification de l'existence de la table et des colonnes

SELECT plan(5);

SELECT ok(
  EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'generation_jobs'
  ),
  'La table generation_jobs existe'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name = 'generation_jobs' AND column_name = 'id'
  ),
  'La colonne id existe dans generation_jobs'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name = 'generation_jobs' AND column_name = 'user_id'
  ),
  'La colonne user_id existe dans generation_jobs'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'generation_jobs' AND constraint_type = 'PRIMARY KEY'
  ),
  'La contrainte PRIMARY KEY existe sur generation_jobs'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'generation_jobs' AND tc.constraint_type = 'FOREIGN KEY' AND kcu.column_name = 'user_id'
  ),
  'La contrainte FOREIGN KEY sur user_id existe dans generation_jobs'
);

SELECT * FROM finish();

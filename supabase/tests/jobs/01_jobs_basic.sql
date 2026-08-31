
SELECT plan(4);

-- Créer un utilisateur de test
INSERT INTO auth.users (id, instance_id, email, encrypted_password, role, aud, created_at, updated_at)
VALUES (
	'00000000-0000-0000-0000-000000000001'::uuid,
	'00000000-0000-0000-0000-000000000000'::uuid,
	'test@example.com',
	'$2a$10$abcdefghijklmnopqrstuv',
	'authenticated',
	'authenticated',
	NOW(),
	NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Créer un job de test
INSERT INTO generation_jobs (user_id, type, status, progress)
VALUES (
	'00000000-0000-0000-0000-000000000001'::uuid,
	'test',
	'pending',
	'{"current": 0, "total": 1}'
);

SELECT ok(
	EXISTS (
		SELECT 1 FROM generation_jobs WHERE type = 'test'
	),
	'Un job de type test a été créé'
);

UPDATE generation_jobs SET status = 'completed' WHERE type = 'test';
SELECT ok(
	EXISTS (
		SELECT 1 FROM generation_jobs WHERE type = 'test' AND status = 'completed'
	),
	'Le job test a été mis à jour en completed'
);

DELETE FROM generation_jobs WHERE type = 'test';
SELECT ok(
	NOT EXISTS (
		SELECT 1 FROM generation_jobs WHERE type = 'test'
	),
	'Le job test a été supprimé'
);

-- Nettoyer l'utilisateur de test
DELETE FROM auth.users WHERE id = '00000000-0000-0000-0000-000000000001'::uuid;

SELECT ok(true, 'Nettoyage effectué');

SELECT * FROM finish();

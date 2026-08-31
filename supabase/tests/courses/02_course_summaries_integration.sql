BEGIN;

SELECT plan(4);

INSERT INTO courses (id, name) VALUES (999999, 'Test Course Integration') ON CONFLICT DO NOTHING;

-- Test 1: Insert course summary
INSERT INTO course_summaries (course_id, name, content) 
VALUES (999999, 'Test Summary', '{"blocks": [{"type": "paragraph"}]}'::jsonb);

SELECT results_eq(
    'SELECT name FROM course_summaries WHERE course_id = 999999',
    ARRAY['Test Summary'::text],
    'Can insert a course summary'
);

-- Test 2: Upsert course summary
INSERT INTO course_summaries (course_id, name, content, updated_at) 
VALUES (999999, 'Updated Summary', '{"updated": true}'::jsonb, NOW())
ON CONFLICT (course_id) DO UPDATE SET 
    name = EXCLUDED.name, 
    content = EXCLUDED.content, 
    updated_at = EXCLUDED.updated_at;

SELECT results_eq(
    'SELECT name FROM course_summaries WHERE course_id = 999999',
    ARRAY['Updated Summary'::text],
    'Can upsert a course summary'
);

-- Test 3: Check updated_at works manually
UPDATE course_summaries SET updated_at = NOW() WHERE course_id = 999999;
SELECT pass('Manual updated_at modification works without errors');

-- Test 4: Cascade delete follows course deletion
DELETE FROM courses WHERE id = 999999;
SELECT is(
    (SELECT COUNT(*)::integer FROM course_summaries WHERE course_id = 999999),
    0,
    'Deleting a course cascades to its summary'
);

SELECT * FROM finish();
ROLLBACK;

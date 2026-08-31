BEGIN;

SELECT plan(14);

SELECT has_table('public', 'course_summaries', 'Table course_summaries exists');
SELECT col_is_pk('public', 'course_summaries', 'id', 'id is primary key');
SELECT col_is_unique('public', 'course_summaries', 'course_id', 'course_id is unique');

SELECT has_column('public', 'course_summaries', 'name', 'name column exists');
SELECT has_column('public', 'course_summaries', 'content', 'content column exists');
SELECT has_column('public', 'course_summaries', 'source_content_ids', 'source_content_ids column exists');
SELECT has_column('public', 'course_summaries', 'source_content_count', 'source_content_count column exists');
SELECT has_column('public', 'course_summaries', 'metadata', 'metadata column exists');

SELECT col_not_null('public', 'course_summaries', 'course_id', 'course_id is not null');
SELECT col_not_null('public', 'course_summaries', 'name', 'name is not null');
SELECT col_not_null('public', 'course_summaries', 'content', 'content is not null');
SELECT col_not_null('public', 'course_summaries', 'source_content_ids', 'source_content_ids is not null');
SELECT col_not_null('public', 'course_summaries', 'source_content_count', 'source_content_count is not null');

SELECT fk_ok('public', 'course_summaries', 'course_id', 'public', 'courses', 'id', 'course_id references courses.id');

SELECT * FROM finish();

ROLLBACK;

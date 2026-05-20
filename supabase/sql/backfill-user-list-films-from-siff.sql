-- ============================================
-- user_list_films 从 siff_films 回填 title_en / year / note(section)
-- 在 Supabase Dashboard → SQL Editor 中执行（需有 UPDATE 权限）
-- 按片名匹配，仅填补 title_en 或 year 为空的行；note 用 COALESCE 保留已有值
-- 执行前可先预览：
--   SELECT ulf.id, ulf.title, ulf.title_en, ulf.year, ulf.note, sf.title_en, sf.year, sf.section
--   FROM user_list_films ulf
--   JOIN siff_films sf ON ulf.title = sf.title AND sf.festival = 'siff2026'
--   WHERE ulf.title_en IS NULL OR ulf.year IS NULL;
-- ============================================

UPDATE user_list_films ulf
SET
  title_en = sf.title_en,
  year     = sf.year,
  note     = COALESCE(ulf.note, sf.section)
FROM siff_films sf
WHERE ulf.title = sf.title
  AND sf.festival = 'siff2026'
  AND (ulf.title_en IS NULL OR ulf.year IS NULL);

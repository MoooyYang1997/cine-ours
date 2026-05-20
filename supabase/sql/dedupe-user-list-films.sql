-- ============================================
-- user_list_films 按 list_id + title 去重（保留每组 MIN(id)）
-- 在 Supabase Dashboard → SQL Editor 中执行（需 service role / 管理员）
-- 执行前可先预览重复数：
--   SELECT list_id, title, COUNT(*) FROM user_list_films GROUP BY list_id, title HAVING COUNT(*) > 1;
-- ============================================

DELETE FROM user_list_films
WHERE id NOT IN (
  SELECT MIN(id)
  FROM user_list_films
  GROUP BY list_id, title
);

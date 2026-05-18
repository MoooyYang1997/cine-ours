-- 油猴脚本 douban-importer 直传 place-images（anon / 已登录均可）
-- Supabase Dashboard → SQL Editor 执行

drop policy if exists "userscript anon upload place-images" on storage.objects;
create policy "userscript anon upload place-images"
  on storage.objects for insert to anon
  with check (bucket_id = 'place-images');

drop policy if exists "userscript authenticated upload place-images" on storage.objects;
create policy "userscript authenticated upload place-images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'place-images');

drop policy if exists "userscript authenticated update place-images" on storage.objects;
create policy "userscript authenticated update place-images"
  on storage.objects for update to authenticated
  using (bucket_id = 'place-images');

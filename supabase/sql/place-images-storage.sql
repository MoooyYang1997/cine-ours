-- ============================================
-- place-images Storage（proxy-image Edge Function 用）
-- 在 Supabase Dashboard → SQL Editor 中执行
-- ============================================

insert into storage.buckets (id, name, public)
values ('place-images', 'place-images', true)
on conflict (id) do update set public = true;

drop policy if exists "公开读取" on storage.objects;
create policy "公开读取"
  on storage.objects for select
  using (bucket_id = 'place-images');

drop policy if exists "管理员可上传" on storage.objects;
create policy "管理员可上传"
  on storage.objects for insert
  with check (bucket_id = 'place-images');

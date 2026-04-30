-- ============================================
-- Cine Ours 数据库表结构
-- 在 Supabase SQL Editor 中运行此文件
-- ============================================

-- 1. 用户扩展信息表（Supabase 自带 auth.users，这里存额外信息）
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  username text unique not null,
  display_name text,
  avatar_url text,
  bio text,
  role text default 'viewer', -- viewer / curator / creator
  location text,
  -- 品味标签（onboarding 填写）
  taste_movements text[], -- 喜欢的电影运动
  taste_styles text[],    -- 喜欢的风格
  taste_directors text[], -- 喜欢的导演
  -- 统计
  films_watched integer default 0,
  festivals_created integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. 线上电影节表
create table public.festivals (
  id uuid default gen_random_uuid() primary key,
  creator_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text,
  tags text[],
  -- 时间
  start_date date,
  end_date date,
  -- 设置
  is_public boolean default true,
  unlock_mode text default 'daily', -- daily / all_at_once
  -- 统计（冗余字段，便于查询）
  participant_count integer default 0,
  film_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. 电影节影片表
create table public.festival_films (
  id uuid default gen_random_uuid() primary key,
  festival_id uuid references public.festivals(id) on delete cascade not null,
  -- 影片信息（来自 TMDB 或手动填写）
  tmdb_id integer,
  title text not null,
  title_original text,
  year integer,
  director text,
  duration integer, -- 分钟
  poster_path text, -- TMDB poster path
  -- 排片
  order_index integer default 0,
  unlock_date date,
  -- 策展人导赏
  curator_note text,
  -- 投票问题
  vote_question text,
  vote_options jsonb, -- [{label: '', count: 0}]
  created_at timestamptz default now()
);

-- 4. 打卡记录表
create table public.checkins (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  festival_id uuid references public.festivals(id) on delete cascade not null,
  film_id uuid references public.festival_films(id) on delete cascade not null,
  -- 评分与感受
  rating integer check (rating >= 1 and rating <= 5),
  mood_tags text[],
  review text,
  is_public boolean default true,
  -- 投票
  vote_option_index integer,
  created_at timestamptz default now(),
  -- 每个用户每部影片只能打卡一次
  unique(user_id, film_id)
);

-- 5. 电影节参与记录
create table public.festival_participants (
  festival_id uuid references public.festivals(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  joined_at timestamptz default now(),
  primary key (festival_id, user_id)
);

-- 6. 讨论/评论表
create table public.comments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  festival_id uuid references public.festivals(id) on delete cascade,
  film_id uuid references public.festival_films(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete cascade,
  content text not null,
  has_spoiler boolean default false,
  like_count integer default 0,
  created_at timestamptz default now()
);

-- 7. 点赞表
create table public.likes (
  user_id uuid references public.profiles(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, comment_id)
);

-- 8. 影展数据库（线下影展）
create table public.film_festivals_offline (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  name_en text,
  country text,
  city text,
  type text, -- A类/独立/地区
  founded_year integer,
  main_award text,
  website text,
  description text,
  logo_url text,
  -- 本届信息
  current_edition text,
  current_dates text,
  current_status text default 'upcoming', -- upcoming / active / past
  created_at timestamptz default now()
);

-- 9. 观影记录（个人影片库，独立于电影节）
create table public.watched_films (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  tmdb_id integer,
  title text not null,
  year integer,
  director text,
  poster_path text,
  rating integer check (rating >= 1 and rating <= 5),
  review text,
  watched_date date,
  source text default 'manual', -- manual / douban_import
  created_at timestamptz default now(),
  unique(user_id, tmdb_id)
);

-- ============================================
-- Row Level Security (RLS) 权限控制
-- ============================================

alter table public.profiles enable row level security;
alter table public.festivals enable row level security;
alter table public.festival_films enable row level security;
alter table public.checkins enable row level security;
alter table public.festival_participants enable row level security;
alter table public.comments enable row level security;
alter table public.likes enable row level security;
alter table public.film_festivals_offline enable row level security;
alter table public.watched_films enable row level security;

-- profiles: 所有人可读，只有本人可写
create policy "profiles_read" on public.profiles for select using (true);
create policy "profiles_insert" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update" on public.profiles for update using (auth.uid() = id);

-- festivals: 公开可读，登录用户可创建，创建者可修改
create policy "festivals_read" on public.festivals for select using (is_public = true or auth.uid() = creator_id);
create policy "festivals_insert" on public.festivals for insert with check (auth.uid() = creator_id);
create policy "festivals_update" on public.festivals for update using (auth.uid() = creator_id);

-- festival_films: 同 festivals
create policy "festival_films_read" on public.festival_films for select using (true);
create policy "festival_films_write" on public.festival_films for all using (
  auth.uid() = (select creator_id from public.festivals where id = festival_id)
);

-- checkins: 公开可读，本人可写
create policy "checkins_read" on public.checkins for select using (is_public = true or auth.uid() = user_id);
create policy "checkins_write" on public.checkins for all using (auth.uid() = user_id);

-- participants: 所有人可读，本人可写
create policy "participants_read" on public.festival_participants for select using (true);
create policy "participants_write" on public.festival_participants for all using (auth.uid() = user_id);

-- comments: 公开可读，登录用户可写
create policy "comments_read" on public.comments for select using (true);
create policy "comments_insert" on public.comments for insert with check (auth.uid() = user_id);
create policy "comments_update" on public.comments for update using (auth.uid() = user_id);

-- likes: 本人可写
create policy "likes_read" on public.likes for select using (true);
create policy "likes_write" on public.likes for all using (auth.uid() = user_id);

-- offline festivals: 所有人可读
create policy "offline_read" on public.film_festivals_offline for select using (true);

-- watched_films: 本人可读写
create policy "watched_read" on public.watched_films for select using (auth.uid() = user_id);
create policy "watched_write" on public.watched_films for all using (auth.uid() = user_id);

-- ============================================
-- 自动创建 profile 的触发器
-- 用户注册后自动在 profiles 表创建记录
-- ============================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

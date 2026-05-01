// ============================================
// supabase.js — Cine Ours 数据层
// 在每个需要数据的页面顶部引入：
// <script src="supabase.js"></script>
// ============================================

// ── 初始化 Supabase ──────────────────────────
const SUPABASE_URL  = 'https://dirrnojiybbwotuqeqww.supabase.co';
const SUPABASE_KEY  = 'sb_publishable_Rbie_WEsyNAV38b-QKrbCw_bBwuxicP';
const TMDB_KEY      = 'YOUR_TMDB_KEY_HERE'; // 替换为你的 TMDB key
const TMDB_BASE     = 'https://api.themoviedb.org/3';
const TMDB_IMG      = 'https://image.tmdb.org/t/p/w500';
const TMDB_IMG_ORIG = 'https://image.tmdb.org/t/p/original';

// 加载 Supabase SDK
(function loadSupabase() {
  const s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
  s.onload = () => {
    window._sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    window.dispatchEvent(new Event('supabase-ready'));
    initAuth();
  };
  document.head.appendChild(s);
})();

// ── 当前用户状态 ─────────────────────────────
window.currentUser = null;
window.currentProfile = null;

async function initAuth() {
  const { data: { session } } = await window._sb.auth.getSession();
  if (session?.user) {
    window.currentUser = session.user;
    window.currentProfile = await getProfile(session.user.id);
  }
  // 监听登录状态变化
  window._sb.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN') {
      window.currentUser = session.user;
      window.currentProfile = await getProfile(session.user.id);
      window.dispatchEvent(new CustomEvent('auth-change', { detail: { loggedIn: true } }));
    }
    if (event === 'SIGNED_OUT') {
      window.currentUser = null;
      window.currentProfile = null;
      window.dispatchEvent(new CustomEvent('auth-change', { detail: { loggedIn: false } }));
    }
  });
}

// ════════════════════════════════════════════
// AUTH 方法
// ════════════════════════════════════════════

// 邮箱注册
async function signUpEmail(email, password, username) {
  const { data, error } = await window._sb.auth.signUp({
    email,
    password,
    options: { data: { username, display_name: username } }
  });
  if (error) throw error;
  return data;
}

// 邮箱登录
async function signInEmail(email, password) {
  const { data, error } = await window._sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

// 手机号发送验证码
async function sendOTP(phone) {
  // 格式：+8613800000000
  const { error } = await window._sb.auth.signInWithOtp({ phone });
  if (error) throw error;
}

// 手机号验证码登录
async function verifyOTP(phone, token) {
  const { data, error } = await window._sb.auth.verifyOtp({
    phone, token, type: 'sms'
  });
  if (error) throw error;
  return data;
}

// 退出登录
async function signOut() {
  await window._sb.auth.signOut();
}

// ════════════════════════════════════════════
// PROFILE 方法
// ════════════════════════════════════════════

async function getProfile(userId) {
  const { data } = await window._sb.from('profiles').select('*').eq('id', userId).single();
  return data;
}

async function updateProfile(updates) {
  const { data, error } = await window._sb
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', window.currentUser.id)
    .select()
    .single();
  if (error) throw error;
  window.currentProfile = data;
  return data;
}

// ════════════════════════════════════════════
// 电影节方法
// ════════════════════════════════════════════

// 获取所有公开电影节（首页用）
async function getFestivals({ limit = 20, status = 'active' } = {}) {
  let query = window._sb
    .from('festivals')
    .select(`
      *,
      creator:profiles(username, display_name),
      films:festival_films(count)
    `)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(limit);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

// 获取单个电影节详情
async function getFestival(festivalId) {
  const { data, error } = await window._sb
    .from('festivals')
    .select(`
      *,
      creator:profiles(id, username, display_name, avatar_url),
      films:festival_films(*, checkin_count:checkins(count)),
      participant_count:festival_participants(count)
    `)
    .eq('id', festivalId)
    .single();
  if (error) throw error;
  return data;
}

// 创建电影节
async function createFestival(festivalData) {
  const { data, error } = await window._sb
    .from('festivals')
    .insert({ ...festivalData, creator_id: window.currentUser.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// 加入电影节
async function joinFestival(festivalId) {
  const { error } = await window._sb
    .from('festival_participants')
    .insert({ festival_id: festivalId, user_id: window.currentUser.id });
  if (error && error.code !== '23505') throw error; // 23505 = 已参与，忽略
}

// ════════════════════════════════════════════
// 打卡方法
// ════════════════════════════════════════════

// 打卡
async function checkin({ festivalId, filmId, rating, review, moodTags, voteOptionIndex, isPublic = true }) {
  const { data, error } = await window._sb
    .from('checkins')
    .upsert({
      user_id: window.currentUser.id,
      festival_id: festivalId,
      film_id: filmId,
      rating,
      review,
      mood_tags: moodTags,
      vote_option_index: voteOptionIndex,
      is_public: isPublic
    }, { onConflict: 'user_id,film_id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// 获取我的打卡记录
async function getMyCheckins(festivalId) {
  const { data } = await window._sb
    .from('checkins')
    .select('*, film:festival_films(*)')
    .eq('user_id', window.currentUser?.id)
    .eq('festival_id', festivalId);
  return data || [];
}

// 获取某部影片的所有打卡（展示用）
async function getFilmCheckins(filmId, limit = 20) {
  const { data } = await window._sb
    .from('checkins')
    .select('*, user:profiles(username, display_name, avatar_url)')
    .eq('film_id', filmId)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(limit);
  return data || [];
}

// ════════════════════════════════════════════
// 评论方法
// ════════════════════════════════════════════

async function getComments(festivalId, filmId = null) {
  let query = window._sb
    .from('comments')
    .select('*, user:profiles(username, display_name, avatar_url)')
    .eq('festival_id', festivalId)
    .is('parent_id', null)
    .order('created_at', { ascending: false });
  if (filmId) query = query.eq('film_id', filmId);
  const { data } = await query;
  return data || [];
}

async function postComment({ festivalId, filmId, content, hasSpoiler = false, parentId = null }) {
  const { data, error } = await window._sb
    .from('comments')
    .insert({
      user_id: window.currentUser.id,
      festival_id: festivalId,
      film_id: filmId,
      content,
      has_spoiler: hasSpoiler,
      parent_id: parentId
    })
    .select('*, user:profiles(username, display_name, avatar_url)')
    .single();
  if (error) throw error;
  return data;
}

async function toggleLike(commentId) {
  // 检查是否已点赞
  const { data: existing } = await window._sb
    .from('likes')
    .select()
    .eq('user_id', window.currentUser.id)
    .eq('comment_id', commentId)
    .single();

  if (existing) {
    await window._sb.from('likes').delete()
      .eq('user_id', window.currentUser.id)
      .eq('comment_id', commentId);
    await window._sb.from('comments')
      .update({ like_count: window._sb.rpc('decrement', { x: 1 }) })
      .eq('id', commentId);
    return false; // unliked
  } else {
    await window._sb.from('likes')
      .insert({ user_id: window.currentUser.id, comment_id: commentId });
    await window._sb.from('comments')
      .update({ like_count: window._sb.rpc('increment', { x: 1 }) })
      .eq('id', commentId);
    return true; // liked
  }
}

// ════════════════════════════════════════════
// TMDB 方法
// ════════════════════════════════════════════

// 搜索电影
async function searchFilm(query) {
  if (TMDB_KEY === 'YOUR_TMDB_KEY_HERE') return [];
  const r = await fetch(`${TMDB_BASE}/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(query)}&language=zh-CN`);
  const d = await r.json();
  return (d.results || []).slice(0, 6).map(formatTMDB);
}

// 获取电影详情
async function getFilmDetail(tmdbId) {
  if (TMDB_KEY === 'YOUR_TMDB_KEY_HERE') return null;
  const r = await fetch(`${TMDB_BASE}/movie/${tmdbId}?api_key=${TMDB_KEY}&language=zh-CN&append_to_response=credits`);
  return await r.json();
}

// 获取本周热门
async function getTrending() {
  if (TMDB_KEY === 'YOUR_TMDB_KEY_HERE') return [];
  const r = await fetch(`${TMDB_BASE}/trending/movie/week?api_key=${TMDB_KEY}&language=zh-CN`);
  const d = await r.json();
  return (d.results || []).slice(0, 6).map(formatTMDB);
}

function formatTMDB(m) {
  return {
    tmdb_id: m.id,
    title: m.title || m.name,
    title_original: m.original_title,
    year: m.release_date?.slice(0, 4),
    poster_path: m.poster_path,
    poster_url: m.poster_path ? TMDB_IMG + m.poster_path : null,
    overview: m.overview,
    vote_average: m.vote_average,
  };
}

// 获取海报 URL
function posterUrl(path, size = 'w500') {
  if (!path) return null;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

// ════════════════════════════════════════════
// 个人观影记录
// ════════════════════════════════════════════

async function addWatched(film) {
  const { data, error } = await window._sb
    .from('watched_films')
    .upsert({ ...film, user_id: window.currentUser.id }, { onConflict: 'user_id,tmdb_id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function getWatched(userId) {
  const { data } = await window._sb
    .from('watched_films')
    .select('*')
    .eq('user_id', userId || window.currentUser?.id)
    .order('watched_date', { ascending: false });
  return data || [];
}

// ════════════════════════════════════════════
// 工具函数
// ════════════════════════════════════════════

// 检查登录状态，未登录则跳转
function requireAuth(msg = '请先登录') {
  if (!window.currentUser) {
    showSbToast(msg);
    setTimeout(() => {
      if (window.parent && window.parent.navigate) window.parent.navigate('auth');
      else window.parent.postMessage({ type: 'navigate', payload: { page: 'auth' } }, '*');
    }, 800);
    return false;
  }
  return true;
}

// 简易 toast（页面内用）
function showSbToast(msg) {
  if (window.parent && window.parent.showToast) {
    window.parent.showToast(msg);
  } else {
    const t = document.getElementById('toast');
    if (t) {
      t.textContent = msg; t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2400);
    }
  }
}

// 格式化时间
function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60)    return '刚刚';
  if (diff < 3600)  return Math.floor(diff / 60) + '分钟前';
  if (diff < 86400) return Math.floor(diff / 3600) + '小时前';
  return Math.floor(diff / 86400) + '天前';
}

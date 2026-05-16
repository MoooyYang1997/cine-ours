// api/sync-siff.js
// Vercel Serverless Function + Cron Job
// 每天自动抓取 siff.com 展映片单，增量写入 Supabase

const SUPABASE_URL = 'https://dirrnojiybbwotuqeqww.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY; // 用 service_role key，有写入权限
const FESTIVAL     = 'siff2026';

// 所有展映单元的 URL
const SECTIONS = [
  { name: 'SIFF狂想曲',          url: 'https://www.siff.com/content?aid=101260514144734824620519834783749932' },
  { name: '影像无限',             url: 'https://www.siff.com/content?aid=101260514150129824624022640660485578' },
  { name: '影史推荐',             url: 'https://www.siff.com/content?aid=101260512162633823920652560896005012' },
  { name: '向大师致敬｜特别纪念', url: 'https://www.siff.com/content?aid=101260424112521817321871199440901496' },
  { name: '新视野｜IMAX',         url: 'https://www.siff.com/content?aid=101260516170059825378869698629637281' },
  { name: '新视野｜杜比视界',     url: 'https://www.siff.com/content?aid=101260509155512822825602053574661668' },
  { name: '科幻电影周',           url: 'https://www.siff.com/content?aid=101260509154717822823607557165061695' },
  { name: '向大师致敬｜肯·洛奇', url: 'https://www.siff.com/content?aid=101260508181214822497699747074053715' },
  { name: '放大',                 url: 'https://www.siff.com/content?aid=101260507144438822083066905235461219' },
  { name: '名导新作',             url: 'https://www.siff.com/content?aid=101260507141635822076005580541957044' },
  { name: '年度亚洲电影',         url: 'https://www.siff.com/content?aid=101260507144348822082856326008837904' },
  { name: '向大师致敬｜比利·怀尔德', url: 'https://www.siff.com/content?aid=101260430171813819585000419627013579' },
  { name: 'SIFF动画',             url: 'https://www.siff.com/content?aid=101260428132927818802655823400965832' },
  { name: '"一带一路"电影周',     url: 'https://www.siff.com/content?aid=101260427110556818404151573614597634' },
  { name: '影展精粹',             url: 'https://www.siff.com/content?aid=101260423202712817095844980330501467' },
  { name: '特别策划｜陀思妥耶夫斯基', url: 'https://www.siff.com/content?aid=101260423200413817090059680354309701' },
];

// 解析单元页面 HTML，提取影片列表
function parseFilms(html, sectionName) {
  const films = [];
  // 匹配图片行及其下方的字幕：中文名 | 英文名 | 年份
  const imgRe = /!\[[^\]]*\]\((https:\/\/www\.siff\.com\/files\/[^)]+)\)\s*\n+\s*([^\n]+)/g;
  let m, idx = 0;
  while ((m = imgRe.exec(html)) !== null) {
    const siffImg = m[1].trim();
    const caption = m[2].replace(/\s+/g, ' ').trim();
    if (caption.startsWith('注：')) continue;

    // 分隔符可能是 | 或 ｜（全角）
    const parts = caption.split(/[|｜]/).map(p => p.trim()).filter(Boolean);
    if (parts.length < 2) continue;

    const title    = parts[0];
    const titleEn  = parts[1] || null;
    const yearStr  = parts[parts.length - 1];
    const year     = /^\d{4}$/.test(yearStr) ? parseInt(yearStr) : null;

    if (!title || title.startsWith('注：')) continue;

    films.push({ title, title_en: titleEn, year, siff_img: siffImg, section: sectionName, order_index: idx++ });
  }
  return films;
}

// 抓取单个页面
async function fetchSection(section) {
  try {
    const res = await fetch(section.url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CineOurs/1.0)' }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    return parseFilms(html, section.name);
  } catch (e) {
    console.error(`[sync-siff] 抓取失败 ${section.name}:`, e.message);
    return [];
  }
}

// 获取数据库现有影片（用 title+section 做唯一键）
async function getExistingFilms() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/siff_films?festival=eq.${FESTIVAL}&select=title,section`,
    { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
  );
  const data = await res.json();
  const set = new Set();
  (data || []).forEach(f => set.add(`${f.section}||${f.title}`));
  return set;
}

// 批量插入新影片
async function insertFilms(films) {
  if (!films.length) return 0;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/siff_films`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(films.map(f => ({ ...f, festival: FESTIVAL })))
  });
  return res.ok ? films.length : 0;
}

// 主处理函数
export default async function handler(req, res) {
  // 安全校验：只允许 Vercel Cron 或带正确 token 的请求
  const authHeader = req.headers['authorization'];
  const cronHeader = req.headers['x-vercel-cron'];
  if (!cronHeader && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('[sync-siff] 开始同步…');
  const existing = await getExistingFilms();

  let totalNew = 0;
  const results = [];

  for (const section of SECTIONS) {
    const films = await fetchSection(section);
    const newFilms = films.filter(f => !existing.has(`${f.section}||${f.title}`));

    if (newFilms.length) {
      const inserted = await insertFilms(newFilms);
      totalNew += inserted;
      results.push({ section: section.name, new: inserted });
      console.log(`[sync-siff] ${section.name}: +${inserted} 部新片`);
    } else {
      results.push({ section: section.name, new: 0 });
    }

    // 避免请求过快被限流
    await new Promise(r => setTimeout(r, 600));
  }

  console.log(`[sync-siff] 完成，共新增 ${totalNew} 部影片`);
  return res.status(200).json({ ok: true, totalNew, results, timestamp: new Date().toISOString() });
}

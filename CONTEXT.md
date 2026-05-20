# Cine Ours — 项目上下文

## 项目性质
**Cinema of Our Own** — 跟随电影节发生的社区平台。
用户在这里记录线下电影节观影、浏览世界各地电影信号、追踪线上策展线索。

---

## 技术栈
- 纯 HTML / CSS / JS，无框架，无构建工具
- **Shell + iframe 路由**：`index.html` 是唯一外壳，所有页面作为 iframe 懒加载切换
- 后端：Supabase（已接入，`supabase.js` 统一初始化，挂载到 `window._sb`）
- 部署：Vercel（`vercel.json` 已配置）

---

## 目录结构关键点
```
index.html                  # Shell：导航栏、路由、message bridge
page-home.html              # 首页（三屏）
page-map.html               # 世界地图（D3 + 城市切换）
page-map-r3.js / .css       # 地图独立逻辑文件
page-festivals.html         # 电影节聚合页
page-festival-detail.html   # 电影节详情页
page-offline-festival.html  # 上影节专区（线下影展）
page-auth.html              # 登录/注册
page-profile.html           # 个人主页
page-creator.html           # 创作空间（V1 隐藏）
page-history.html           # 影史今天（V1 隐藏）
supabase.js                 # 数据层统一入口
data/places.js              # 地图地点数据（var PL 数组）
data/cinema-images.json     # 影院图片
data/place-images.json      # 取景地图片
```

---

## 路由机制
`index.html` 的 `go(pageKey)` 函数控制 iframe 显示/隐藏，懒加载 src。
页面间通信通过 `window.parent.postMessage` → message bridge 处理。

**已注册页面（PAGES 表）：**
| key | 文件 | 导航项 | V1 可见 |
|---|---|---|---|
| home | page-home.html | 首页 | ✅ |
| map | page-map.html | 世界地图 | ✅ |
| festivals | page-festivals.html | 电影节 | ✅ |
| festival-detail | page-festival-detail.html | （从电影节进入）| ✅ |
| offline-festival | page-offline-festival.html | 上影节专区 | ✅ |
| creator | page-creator.html | 创作（隐藏）| ❌ |
| history | page-history.html | 影史今天（隐藏）| ❌ |
| auth | page-auth.html | — | ✅ |
| profile | page-profile.html | — | ✅ |

**Message bridge 已支持的消息类型：**
- `navigate` — 跳转页面
- `navigateAndScroll` — 跳转页面并滚动到指定 section
- `toast` — 显示提示
- `login` — 登录状态同步

---

## 首页结构（page-home.html）
- **第一屏**：上影节主卡（跳 offline-festival）+ ic0/ic1 互动格（带 section 定向跳转）+ 更多影展三列
- **第二屏**：世界地图信号（城市卡片，跳 map?city=xxx）
- **第三屏**：策展线索（tab 切换，进入跳 festival-detail）

**上影节专区 section ID 对照：**
| id | 内容 |
|---|---|
| sec-banner | 顶部 banner |
| sec-lists | 社区片单 |
| sec-films | 选片视角 |
| sec-checkin | 现场打卡 |
| sec-discuss | 散场后讨论 |

---

## 验证原则
- **验证数据库写入**：直接去 Supabase Dashboard → Table Editor 查表，不通过页面行为推断
- **验证页面功能**：用 Supabase Dashboard → Authentication → Users 确认用户存在后，再测试页面

---

## 当前状态
<!-- 由 scripts/update-context.cjs 每日 00:00 北京时间自动更新；也可手动运行 -->
<!-- CONTEXT_STATUS_START -->
**最近自动更新：** 2026-05-20 00:00 北京时间

**上次完成（2026-05-19）：** Revert "Add list detail page and refresh offline festival list UI"；Add list detail page and refresh offline festival list UI；Add Supabase SQL for avatars storage bucket and RLS policies；地图页底部条全宽：移除左栏并等比放大卡片；docs: 自动更新 CONTEXT 进度（北京时间）；feat: expand places to 150 and refine profile page layout。涉及文件：CONTEXT.md、data/cinema-images.json、data/places-picker.json、data/places.js、index.html、page-auth.html、page-creator.html、page-festival-detail.html 等

**正在做：** —

**下一步：** 按「进度日报」与 Issue/对话继续推进；新功能上线后记得在 Supabase Dashboard 验证
<!-- CONTEXT_STATUS_END -->

---

## 进度日报
<!-- 保留最近 14 天；由 GitHub Actions 每日追加 -->
<!-- CONTEXT_DAILY_START -->
### 2026-05-19
Revert "Add list detail page and refresh offline festival list UI"；Add list detail page and refresh offline festival list UI；Add Supabase SQL for avatars storage bucket and RLS policies；地图页底部条全宽：移除左栏并等比放大卡片；docs: 自动更新 CONTEXT 进度（北京时间）；feat: expand places to 150 and refine profile page layout。涉及文件：CONTEXT.md、data/cinema-images.json、data/places-picker.json、data/places.js、index.html、page-auth.html、page-creator.html、page-festival-detail.html 等

### 2026-05-18
docs: 自动更新 CONTEXT 进度（北京时间）。涉及文件：.github/workflows/sync-places-picker.yml、.github/workflows/update-context.yml、CONTEXT.md、data/places-picker.json、film-image-picker.html、index.html、package.json、page-home.html 等

### 2026-05-17
Add GitHub Actions workflow for daily SIFF film sync.；add package.json for serverless functions；Refactor page-map with fixed-height map row and scrollable film strip.；Tweak page-map city subtitle and frame placeholder gradients.；Fix page-map scroll layout and enlarge film strip cards.；Improve page-map bottom strip and frame card layout.。涉及文件：.github/workflows/sync-siff.yml、api:/sync-siff.js、data/cinema-images.json、data/place-images.json、data/places.js、film-image-picker.html、index.html、package.json 等
<!-- CONTEXT_DAILY_END -->

---

## 已知 Bug / 待修
- [ ] 地图封面仅存 `localStorage`，换设备/用户不可见
- [ ] `place_checkins` / `place-checkins` Storage 需在 Supabase 手动确认已创建
- [ ] `index.html` 按 `L` 为演示假登录，勿用于测 Supabase 功能

---

## 近期已修（归档）
<!-- 以下区块由 `scripts/update-context.cjs` 每日写入（与 GitHub Actions 定时任务同源），仅汇总「修复类」提交（见脚本内 `isFixLikeCommit`）；无命中日期不出现在本节。验收口径的短句可放在对话或 Issue；首次启用可本地执行 `node scripts/update-context.cjs --backfill-fixed` 重算近 14 天。 -->
<!-- CONTEXT_FIXED_START -->
### 2026-05-19
Revert "Add list detail page and refresh offline festival list UI"；地图页底部条全宽：移除左栏并等比放大卡片。涉及文件：CONTEXT.md、data/cinema-images.json、data/places-picker.json、data/places.js、index.html、page-auth.html 等

### 2026-05-17
Fix page-map scroll layout and enlarge film strip cards.；Update page-map: shell layout, no duplicate nav, card and strip fixes.。涉及文件：.github/workflows/sync-siff.yml、api:/sync-siff.js、data/cinema-images.json、data/place-images.json、data/places.js、film-image-picker.html 等

### 2026-05-16
fix: iframe 子页面缓存版本号，确保地图 Round2 线上生效；Fix festivals page filename and restore page-festivals.html。涉及文件：index.html、page-festivals.html、page-map-r3.css、page-map-r3.js、page-map.html、page-offline-festival.html 等

### 2026-05-14
fix(home): make curator line-bg visible above canvas blend。涉及文件：page-home.html、page-map.html
<!-- CONTEXT_FIXED_END -->

---

## 重要决策记录
- **Shell + iframe 架构**：统一管理导航状态、登录状态、消息通信，页面间完全隔离
- **懒加载**：除首页外所有 iframe 首次切换时才注入 src，避免首屏慢
- **创作/影史今天 V1 隐藏**：`display:none` 保留代码，V2 直接取消隐藏
- **Supabase 统一初始化**：所有页面引用 `supabase.js`，通过 `supabase-ready` 事件等待客户端就绪

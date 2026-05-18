// ==UserScript==
// @name         CineOurs 豆瓣选图
// @namespace    cineours
// @version      1.3
// @match        https://movie.douban.com/*
// @run-at       document-idle
// @grant        GM_xmlhttpRequest
// @connect      *
// ==/UserScript==

const SUPABASE_URL = 'https://dirrnojiybbwotuqeqww.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_Rbie_WEsyNAV38b-QKrbCw_bBwuxicP'

// 从 PL 数组读地标列表
const PLACES = [
  {id:'esc', nm:'中环至半山自动扶梯'},
  {id:'ck',  nm:'重庆大厦'},
  {id:'tsk', nm:'天星码头'},
  {id:'hkcc',nm:'香港文化中心'},
  {id:'bwy', nm:'百老汇电影中心'},
  {id:'dgm', nm:'大光明电影院'},
  {id:'wkl', nm:'武康路'},
  {id:'gtdy',nm:'国泰电影院'},
  {id:'szh', nm:'苏州河沿岸'},
  {id:'shfc',nm:'上海影城'},
  {id:'gdt', nm:'牯岭街'},
  {id:'xmt', nm:'西门町'},
  {id:'gdt2',nm:'光点台北'},
  {id:'dsw', nm:'淡水河边'},
  {id:'bab', nm:'Babylon Kino'},
  {id:'blp', nm:'Berlinale Palast'},
  {id:'bbg', nm:'勃兰登堡门'},
  {id:'cin', nm:'La Cinémathèque française'},
  {id:'pnt', nm:'Cinéma du Panthéon'},
  {id:'sm',  nm:'圣米歇尔广场'},
  {id:'sbk', nm:'涩谷十字路口'},
  {id:'bun', nm:'涩谷 Bunkamura'},
  {id:'shj', nm:'新宿黄金街'},
  {id:'ith', nm:'梨泰院坡道'},
  {id:'cgv', nm:'CGV 狎鸥亭'},
  {id:'gwh', nm:'광화문广场'},
  {id:'lum', nm:'卢米埃尔大厅'},
  {id:'cnp', nm:'戛纳海滨大道'},
  {id:'trv', nm:'特雷维喷泉'},
  {id:'via', nm:'威尼托大街'},
  {id:'ace', nm:'Ace Hotel Theatre'},
  {id:'grm', nm:'TCL Chinese Theatre'},
  {id:'grf', nm:'葛里菲斯天文台'},
  {id:'iff', nm:'IFC Center'},
  {id:'brk', nm:'布鲁克林大桥'},
  {id:'wst', nm:'西村街道'},
]

/** 跨域图 naturalWidth 常为 0，用显示尺寸回退 */
function imgVisibleSize(img) {
  const nw = img.naturalWidth || 0
  const nh = img.naturalHeight || 0
  if (nw >= 200 || nh >= 200) return Math.max(nw, nh)
  return Math.max(
    img.width || 0,
    img.height || 0,
    img.offsetWidth || 0,
    img.offsetHeight || 0,
    img.clientWidth || 0,
    img.clientHeight || 0
  )
}

function imgBestSrc(img) {
  return img.currentSrc || img.src || img.getAttribute('data-src') || ''
}

function minImgSize() {
  return /\/photos\/photo\//.test(location.pathname) ? 80 : 200
}

function attachPlusButton(img) {
  if (img.dataset.cineours === '1') return true
  const src = imgBestSrc(img)
  if (!src || src.startsWith('data:')) return false

  const rect = img.getBoundingClientRect()
  const vis = Math.max(imgVisibleSize(img), rect.width, rect.height)
  if (vis < minImgSize()) return false

  img.dataset.cineours = '1'

  const btn = document.createElement('button')
  btn.textContent = '+'
  btn.title = 'CineOurs 选图上传'
  btn.className = 'cineours-plus-btn'
  btn.style.cssText = `
    position:fixed;
    background:#D4AF37;color:#000;
    border:none;border-radius:50%;
    width:28px;height:28px;
    font-size:18px;font-weight:bold;
    cursor:pointer;
    z-index:2147483647;
    box-shadow:0 2px 8px rgba(0,0,0,0.45);
    pointer-events:auto;
  `

  const placeBtn = () => {
    const r = img.getBoundingClientRect()
    if (r.width < 40 || r.height < 40) {
      btn.style.display = 'none'
      return
    }
    btn.style.display = 'block'
    btn.style.left = `${Math.max(4, r.right - 32)}px`
    btn.style.top = `${Math.max(4, r.top + 6)}px`
  }

  placeBtn()
  const onReflow = () => placeBtn()
  window.addEventListener('scroll', onReflow, { passive: true })
  window.addEventListener('resize', onReflow)
  btn._coDetach = () => {
    window.removeEventListener('scroll', onReflow)
    window.removeEventListener('resize', onReflow)
  }

  btn.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopPropagation()
    showPicker(src, btn)
  })

  document.body.appendChild(btn)
  return true
}

function scheduleInjectRetries(img, maxTry = 40) {
  let n = 0
  const tick = () => {
    if (img.dataset.cineours === '1') return
    if (attachPlusButton(img)) return
    n += 1
    if (n < maxTry) setTimeout(tick, 250)
  }
  setTimeout(tick, 250)
}

function watchImage(img) {
  if (img.dataset.cineours === '1' || img.dataset.cineoursWatch === '1') return
  img.dataset.cineoursWatch = '1'

  const onReady = () => {
    if (!attachPlusButton(img)) scheduleInjectRetries(img)
  }

  if (img.complete) {
    onReady()
  } else {
    img.addEventListener('load', onReady, { once: true })
    img.addEventListener('error', () => { img.dataset.cineoursWatch = '' }, { once: true })
  }
}

function injectButtons() {
  document.querySelectorAll('img[src*="doubanio"], img[src*="douban.com"]').forEach(watchImage)
}

function injectPhotoHero() {
  if (!/\/photos\/photo\//.test(location.pathname)) return
  const imgs = [...document.querySelectorAll('img[src*="doubanio"]')]
  if (!imgs.length) return
  const hero = imgs.sort((a, b) => {
    const ra = a.getBoundingClientRect()
    const rb = b.getBoundingClientRect()
    return (rb.width * rb.height) - (ra.width * ra.height)
  })[0]
  if (!hero) return
  hero.dataset.cineoursWatch = ''
  watchImage(hero)
}

function boot() {
  injectButtons()
  injectPhotoHero()
}

console.log('[CineOurs] 豆瓣选图 v1.3 已加载', location.href)

function gmRequest(opts) {
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      timeout: 90000,
      ...opts,
      onload(res) {
        resolve(res)
      },
      onerror(err) {
        reject(new Error((err && err.error) || '网络请求失败'))
      },
      ontimeout() {
        reject(new Error('请求超时'))
      },
    })
  })
}

function parseHttpError(res, fallback) {
  let msg = fallback + ' (HTTP ' + res.status + ')'
  try {
    const body = typeof res.responseText === 'string' ? res.responseText : ''
    if (body) {
      const j = JSON.parse(body)
      if (j.message) msg += ': ' + j.message
      else if (j.error) msg += ': ' + j.error
    }
  } catch (_) {}
  return msg
}

function showPicker(imgSrc, anchor) {
  document.getElementById('co-picker')?.remove()

  const div = document.createElement('div')
  div.id = 'co-picker'
  div.style.cssText = `
    position:fixed;top:50%;left:50%;
    transform:translate(-50%,-50%);
    background:#1a1a1a;color:#EDE8DF;
    border:1px solid #D4AF37;
    border-radius:8px;padding:20px;
    width:320px;z-index:99999;
    font-family:sans-serif;
  `

  div.innerHTML = `
    <div style="font-size:13px;color:#D4AF37;margin-bottom:12px">选择对应地标</div>
    <img src="${imgSrc}" style="width:100%;border-radius:4px;margin-bottom:12px">
    <select id="co-select" style="width:100%;padding:8px;background:#111;color:#EDE8DF;border:1px solid #333;border-radius:4px;margin-bottom:12px">
      ${PLACES.map(p => `<option value="${p.id}">${p.nm}</option>`).join('')}
    </select>
    <div style="display:flex;gap:8px">
      <button id="co-confirm" style="flex:1;padding:8px;background:#D4AF37;color:#000;border:none;border-radius:4px;cursor:pointer;font-weight:bold">确认上传</button>
      <button id="co-cancel" style="flex:1;padding:8px;background:#333;color:#EDE8DF;border:none;border-radius:4px;cursor:pointer">取消</button>
    </div>
    <div id="co-status" style="margin-top:10px;font-size:12px;color:#888"></div>
  `

  document.body.appendChild(div)

  document.getElementById('co-cancel').onclick = () => div.remove()
  document.getElementById('co-confirm').onclick = () => {
    const placeId = document.getElementById('co-select').value
    uploadImage(imgSrc, placeId, div).catch((e) => console.error('[CineOurs]', e))
  }
}

async function uploadImage(imgSrc, placeId, div) {
  const status = document.getElementById('co-status')
  const confirmBtn = document.getElementById('co-confirm')
  if (!status) return

  status.style.color = '#888'
  status.textContent = '下载图片中…'
  if (confirmBtn) confirmBtn.disabled = true

  try {
    const fetchRes = await gmRequest({
      method: 'GET',
      url: imgSrc,
      responseType: 'blob',
      headers: { Referer: 'https://movie.douban.com/' },
    })

    if (fetchRes.status < 200 || fetchRes.status >= 300) {
      throw new Error(parseHttpError(fetchRes, '下载豆瓣图片失败'))
    }

    const blob = fetchRes.response
    if (!blob || (blob.size !== undefined && blob.size === 0)) {
      throw new Error('图片数据为空')
    }

    const objectPath = `places/${placeId}/${Date.now()}.jpg`
    status.textContent = '上传到 Supabase…'

    const uploadRes = await gmRequest({
      method: 'POST',
      url: `${SUPABASE_URL}/storage/v1/object/place-images/${objectPath}`,
      headers: {
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': blob.type || 'image/jpeg',
        'x-upsert': 'true',
      },
      data: blob,
    })

    if (uploadRes.status !== 200 && uploadRes.status !== 201) {
      const hint =
        uploadRes.status === 401 || uploadRes.status === 403
          ? '（请在 Supabase 执行 supabase/sql/place-images-userscript-upload.sql）'
          : ''
      throw new Error(parseHttpError(uploadRes, '上传 Storage 失败') + hint)
    }

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/place-images/${objectPath}`
    status.style.color = '#4CAF50'
    status.textContent = '✓ 上传成功'

    try {
      await navigator.clipboard.writeText(publicUrl)
    } catch (_) {}

    setTimeout(() => {
      div.remove()
      alert(
        `已上传并复制 URL：\n${publicUrl}\n\n刷新站点「世界地图」即可显示；也可写入 data/places.js 中 id:'${placeId}' 的 img 字段`
      )
    }, 600)
  } catch (err) {
    status.style.color = '#f44336'
    status.textContent = (err && err.message) || '上传失败'
    console.error('[CineOurs] upload failed', err)
  } finally {
    if (confirmBtn) confirmBtn.disabled = false
  }
}

boot()
window.addEventListener('load', boot)
window.addEventListener('scroll', boot, { passive: true })
new MutationObserver(boot).observe(document.documentElement, { childList: true, subtree: true })

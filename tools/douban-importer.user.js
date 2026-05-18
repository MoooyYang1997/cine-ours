// ==UserScript==
// @name         CineOurs 豆瓣选图
// @namespace    cineours
// @version      2.1
// @match        https://movie.douban.com/*
// @run-at       document-idle
// @grant        GM_xmlhttpRequest
// @connect      dirrnojiybbwotuqeqww.supabase.co
// @connect      cine-ours.vercel.app
// @connect      movie.douban.com
// @connect      img1.doubanio.com
// @connect      img2.doubanio.com
// @connect      img3.doubanio.com
// @connect      img9.doubanio.com
// @connect      *.doubanio.com
// @connect      *
// ==/UserScript==

const SUPABASE_URL = 'https://dirrnojiybbwotuqeqww.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_Rbie_WEsyNAV38b-QKrbCw_bBwuxicP'

// 与 data/places.js 同步：部署后由 data/places-picker.json 自动提供（无需改油猴）
const PLACES_JSON_URL = 'https://cine-ours.vercel.app/data/places-picker.json'
const PLACE_CITY_ORDER = ['香港','上海','北京','台北','柏林','巴黎','东京','戛纳','罗马','洛杉矶','纽约']

let placesCache = null
let placesLoading = null

function gmRequest(opts) {
  const label = opts._label || opts.url || '请求'
  const { _label, ...req } = opts
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      timeout: 90000,
      ...req,
      onload(res) {
        resolve(res)
      },
      onerror(err) {
        const detail =
          (err && (err.error || err.statusText || err.status)) ||
          (typeof err === 'string' ? err : '')
        const host = (() => {
          try {
            return new URL(req.url).hostname
          } catch (_) {
            return ''
          }
        })()
        reject(
          new Error(
            `${label}失败${host ? '（' + host + '）' : ''}${detail ? '：' + detail : ''}。请确认 Tampermonkey 已允许脚本访问该域名`
          )
        )
      },
      onabort() {
        reject(new Error(label + '已取消'))
      },
      ontimeout() {
        reject(new Error(label + '超时'))
      },
    })
  })
}

/** 豆瓣缩略图 → 大图；补全 https */
function normalizeDoubanImgUrl(src) {
  let u = (src || '').trim()
  if (!u) return u
  if (u.startsWith('//')) u = 'https:' + u
  u = u.replace(/^http:\/\//i, 'https://')
  u = u.replace(/\/view\/photo\/[sm]\//i, '/view/photo/l/')
  return u
}

function responseToArrayBuffer(res) {
  const r = res.response
  if (r instanceof ArrayBuffer) return r
  if (r && r.buffer instanceof ArrayBuffer) return r.buffer
  if (typeof res.responseText === 'string' && res.responseText.length) {
    const bytes = new Uint8Array(res.responseText.length)
    for (let i = 0; i < res.responseText.length; i++) {
      bytes[i] = res.responseText.charCodeAt(i) & 0xff
    }
    return bytes.buffer
  }
  return null
}

async function downloadDoubanImage(imgSrc) {
  const candidates = [...new Set([normalizeDoubanImgUrl(imgSrc), imgSrc].filter(Boolean))]
  let lastErr = null

  for (const url of candidates) {
    try {
      const res = await gmRequest({
        _label: '下载豆瓣图片',
        method: 'GET',
        url,
        responseType: 'arraybuffer',
        headers: {
          Referer: 'https://movie.douban.com/',
          Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
          'User-Agent': navigator.userAgent,
        },
      })
      if (res.status < 200 || res.status >= 300) {
        throw new Error(parseHttpError(res, '下载豆瓣图片失败'))
      }
      const buf = responseToArrayBuffer(res)
      if (!buf || !buf.byteLength) {
        throw new Error('图片数据为空')
      }
      return buf
    } catch (e) {
      lastErr = e
      console.warn('[CineOurs] 下载失败，尝试下一 URL', url, e)
    }
  }

  throw lastErr || new Error('下载豆瓣图片失败')
}

function loadPlaces() {
  if (placesCache) return Promise.resolve(placesCache)
  if (placesLoading) return placesLoading

  placesLoading = gmRequest({
    _label: '加载地点列表',
    method: 'GET',
    url: PLACES_JSON_URL + '?t=' + Date.now(),
  })
    .then((res) => {
      if (res.status !== 200 || !res.responseText) {
        throw new Error('HTTP ' + res.status)
      }
      const list = JSON.parse(res.responseText)
      if (!Array.isArray(list) || !list.length) {
        throw new Error('地点列表为空')
      }
      placesCache = list
      console.log('[CineOurs] 地点列表', list.length, '个（来自 places-picker.json）')
      return placesCache
    })
    .catch((err) => {
      console.warn('[CineOurs] 加载地点失败', err)
      placesCache = []
      return placesCache
    })
    .finally(() => {
      placesLoading = null
    })

  return placesLoading
}

function buildPlaceSelectHtml(places) {
  const byCity = {}
  places.forEach((p) => {
    if (!byCity[p.cy]) byCity[p.cy] = []
    byCity[p.cy].push(p)
  })
  const cities = PLACE_CITY_ORDER.filter((cy) => byCity[cy])
  const extra = Object.keys(byCity).filter((cy) => !PLACE_CITY_ORDER.includes(cy))
  return [...cities, ...extra]
    .map(
      (cy) =>
        `<optgroup label="${cy}">` +
        byCity[cy].map((p) => `<option value="${p.id}">${p.nm}</option>`).join('') +
        `</optgroup>`
    )
    .join('')
}

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
    showPicker(src, btn).catch((err) => {
      console.error('[CineOurs]', err)
      alert((err && err.message) || '打开选图失败')
    })
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

async function showPicker(imgSrc, anchor) {
  const places = await loadPlaces()
  if (!places.length) {
    alert(
      '无法加载地点列表。\n\n请确认已部署 data/places-picker.json（改 places.js 后运行 npm run sync:places 并 push）'
    )
    return
  }

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
      ${buildPlaceSelectHtml(places)}
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

const COVERS_MANIFEST_PATH = 'covers-manifest.json'

async function updateCoversManifest(placeId, publicUrl) {
  const manifestUrl = `${SUPABASE_URL}/storage/v1/object/public/place-images/${COVERS_MANIFEST_PATH}`
  let manifest = {}
  try {
    const res = await gmRequest({
      _label: '读取封面索引',
      method: 'GET',
      url: manifestUrl + '?t=' + Date.now(),
    })
    if (res.status === 200 && res.responseText) {
      manifest = JSON.parse(res.responseText)
    }
  } catch (_) {}

  manifest[placeId] = publicUrl
  const uploadRes = await gmRequest({
    _label: '更新封面索引',
    method: 'POST',
    url: `${SUPABASE_URL}/storage/v1/object/place-images/${COVERS_MANIFEST_PATH}`,
    headers: {
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
      'x-upsert': 'true',
    },
    data: JSON.stringify(manifest, null, 2),
  })
  if (uploadRes.status !== 200 && uploadRes.status !== 201) {
    console.warn('[CineOurs] manifest 更新失败', uploadRes.status, uploadRes.responseText)
  }
}

/** Edge Function 中转（本地 GM 下载失败时备用） */
async function uploadViaProxy(imgSrc, placeId) {
  const res = await gmRequest({
    _label: '中转上传',
    method: 'POST',
    url: `${SUPABASE_URL}/functions/v1/proxy-image`,
    headers: {
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    data: JSON.stringify({
      imageUrl: normalizeDoubanImgUrl(imgSrc),
      placeId,
    }),
  })
  if (res.status < 200 || res.status >= 300) {
    throw new Error(parseHttpError(res, '中转上传失败'))
  }
  let body
  try {
    body = JSON.parse(res.responseText || '{}')
  } catch (_) {
    throw new Error('中转上传返回格式错误')
  }
  if (!body.url) {
    throw new Error(body.error || '中转上传未返回 URL')
  }
  return body.url
}

async function uploadImage(imgSrc, placeId, div) {
  const status = document.getElementById('co-status')
  const confirmBtn = document.getElementById('co-confirm')
  if (!status) return

  status.style.color = '#888'
  status.textContent = '下载图片中…'
  if (confirmBtn) confirmBtn.disabled = true

  try {
    let publicUrl = null
    let imageBytes = null

    try {
      imageBytes = await downloadDoubanImage(imgSrc)
    } catch (dlErr) {
      console.warn('[CineOurs] 直链下载失败，尝试 Edge Function', dlErr)
      status.textContent = '直链失败，改用服务器中转…'
      try {
        publicUrl = await uploadViaProxy(imgSrc, placeId)
      } catch (proxyErr) {
        const a = (dlErr && dlErr.message) || '下载失败'
        const b = (proxyErr && proxyErr.message) || '中转失败'
        throw new Error(a + '；' + b)
      }
    }

    if (!publicUrl) {
      const objectPath = `places/${placeId}/${Date.now()}.jpg`
      status.textContent = '上传到 Supabase…'

      const uploadRes = await gmRequest({
        _label: '上传到 Supabase',
        method: 'POST',
        url: `${SUPABASE_URL}/storage/v1/object/place-images/${objectPath}`,
        headers: {
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          apikey: SUPABASE_ANON_KEY,
          'Content-Type': 'image/jpeg',
          'x-upsert': 'true',
        },
        data: imageBytes,
      })

      if (uploadRes.status !== 200 && uploadRes.status !== 201) {
        const hint =
          uploadRes.status === 401 || uploadRes.status === 403
            ? '（请在 Supabase 执行 supabase/sql/place-images-userscript-upload.sql）'
            : ''
        throw new Error(parseHttpError(uploadRes, '上传 Storage 失败') + hint)
      }

      publicUrl = `${SUPABASE_URL}/storage/v1/object/public/place-images/${objectPath}`
    }

    status.textContent = '更新封面索引…'
    await updateCoversManifest(placeId, publicUrl)

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
loadPlaces()
console.log('[CineOurs] 豆瓣选图 v2.1 已加载', location.href)
window.addEventListener('load', boot)
window.addEventListener('scroll', boot, { passive: true })
new MutationObserver(boot).observe(document.documentElement, { childList: true, subtree: true })

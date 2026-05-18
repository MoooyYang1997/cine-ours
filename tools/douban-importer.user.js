// ==UserScript==
// @name         CineOurs 豆瓣选图
// @namespace    cineours
// @version      1.0
// @match        https://movie.douban.com/*
// @grant        GM_xmlhttpRequest
// @connect      supabase.co
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

function injectButtons() {
  document.querySelectorAll('img').forEach(img => {
    if (img.dataset.cineours) return

    const tryInject = () => {
      if (img.naturalWidth < 200) return
      img.dataset.cineours = '1'

      const btn = document.createElement('button')
      btn.textContent = '+'
      btn.style.cssText = `
        position:absolute;
        top:6px;right:6px;
        background:#D4AF37;color:#000;
        border:none;border-radius:50%;
        width:28px;height:28px;
        font-size:18px;font-weight:bold;
        cursor:pointer;z-index:9999;
      `
      const wrap = img.parentElement
      if (getComputedStyle(wrap).position === 'static') {
        wrap.style.position = 'relative'
      }
      wrap.appendChild(btn)

      btn.addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()
        showPicker(img.src, btn)
      })
    }

    if (img.complete) {
      tryInject()
    } else {
      img.addEventListener('load', tryInject)
    }
  })
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
    uploadImage(imgSrc, placeId, div)
  }
}

function uploadImage(imgSrc, placeId, div) {
  const status = document.getElementById('co-status')
  status.textContent = '上传中...'

  GM_xmlhttpRequest({
    method: 'GET',
    url: imgSrc,
    responseType: 'blob',
    headers: { 'Referer': 'https://movie.douban.com' },
    onload: async (res) => {
      const filename = `places/${placeId}/${Date.now()}.jpg`
      const blob = res.response

      // 上传到 Supabase Storage
      GM_xmlhttpRequest({
        method: 'POST',
        url: `${SUPABASE_URL}/storage/v1/object/place-images/${filename}`,
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'image/jpeg',
          'x-upsert': 'true'
        },
        data: blob,
        onload: (uploadRes) => {
          if (uploadRes.status === 200) {
            const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/place-images/${filename}`
            status.style.color = '#4CAF50'
            status.textContent = `✓ 上传成功`
            
            // 复制URL到剪贴板
            navigator.clipboard.writeText(publicUrl)
            
            setTimeout(() => {
              div.remove()
              // 提示复制结果
              alert(`已上传并复制URL：\n${publicUrl}\n\n请粘入 data/places.js 中 id:'${placeId}' 的 img 字段`)
            }, 800)
          } else {
            status.style.color = '#f44336'
            status.textContent = '上传失败，请重试'
          }
        }
      })
    }
  })
}

// 页面加载完注入按钮，滚动时也检查新图片
window.addEventListener('load', injectButtons)
window.addEventListener('scroll', injectButtons)
new MutationObserver(injectButtons).observe(document.body, {childList:true, subtree:true})

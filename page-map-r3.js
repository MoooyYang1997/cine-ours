/* Round 3 map logic — inlined into page-map.html by build script */
var KINO_IMG = '__KINO_PLACEHOLDER__';

var PLACES = [
  { id:'escalator-hk', type:'film_location', name:'中环至半山自动扶梯', city:'香港', cityEn:'HONG KONG', country:'中国香港',
    film:'重庆森林', filmYear:1994, director:'王家卫', quote:'她每天经过这里。', user:null, likes:156, lng:114.155, lat:22.282, img:null },
  { id:'chungking-mansions', type:'film_location', name:'重庆大厦', city:'香港', cityEn:'HONG KONG', country:'中国香港',
    film:'重庆森林', filmYear:1994, director:'王家卫', quote:'每个人都是孤岛。', user:null, likes:89, lng:114.172, lat:22.297, img:null },
  { id:'escalator-paris', type:'film_location', name:'圣米歇尔广场', city:'巴黎', cityEn:'PARIS', country:'法国',
    film:'爱在日落黄昏时', filmYear:2004, director:'理查德·林克莱特', quote:'街道突然像电影里的场景。', user:null, likes:62, lng:2.347, lat:48.853, img:null },
  { id:'shibuya-tokyo', type:'film_location', name:'涩谷十字路口', city:'东京', cityEn:'TOKYO', country:'日本',
    film:'迷失东京', filmYear:2003, director:'索菲亚·科波拉', quote:'城市越大，越容易迷失。', user:null, likes:104, lng:139.701, lat:35.659, img:null },
  { id:'hkcc', type:'cinema', name:'香港文化中心', city:'香港', cityEn:'HONG KONG', country:'中国香港',
    quote:'散场后没人说话。', user:'@YueLiang · 记录于此', likes:89, lng:114.172, lat:22.295, img:null },
  { id:'broadway-hk', type:'cinema', name:'百老汇电影中心', city:'香港', cityEn:'HONG KONG', country:'中国香港',
    quote:'灯亮的时候才是现实。', user:'@MingMing · 记录于此', likes:34, lng:114.177, lat:22.326, img:null },
  { id:'babylon-berlin', type:'cinema', name:'Babylon Kino', city:'柏林', cityEn:'BERLIN', country:'德国',
    quote:'散场后，雨还在下，街灯把影子拉得很长。', user:'@Lena · 刚刚记录于此', likes:24, lng:13.405, lat:52.52, img:KINO_IMG },
  { id:'cinematheque-paris', type:'cinema', name:'La Cinémathèque française', city:'巴黎', cityEn:'PARIS', country:'法国',
    quote:'走出电影院时，街道突然像电影里的场景。', user:'@Marie · 记录于此', likes:37, lng:2.388, lat:48.848, img:null },
  { id:'bunkamura-tokyo', type:'cinema', name:'涩谷 Bunkamura', city:'东京', cityEn:'TOKYO', country:'日本',
    quote:'字幕结束后没有人离开，我们都在等灯亮。', user:'@Haruki · 记录于此', likes:52, lng:139.698, lat:35.660, img:null },
  { id:'lincoln-nyc', type:'cinema', name:'Film at Lincoln Center', city:'纽约', cityEn:'NEW YORK', country:'美国',
    quote:'在纽约看完电影走出来，城市本身就是续集。', user:'@Maya · 记录于此', likes:61, lng:-73.983, lat:40.771, img:null }
];

var CITIES = [
  { id:'hk', zh:'香港', lng:114.172, lat:22.295 },
  { id:'berlin', zh:'柏林', lng:13.405, lat:52.52 },
  { id:'paris', zh:'巴黎', lng:2.346, lat:48.851 },
  { id:'tokyo', zh:'东京', lng:139.700, lat:35.659 },
  { id:'nyc', zh:'纽约', lng:-73.983, lat:40.771 },
  { id:'sp', zh:'圣保罗', lng:-46.633, lat:-23.55 }
];

var HEAT_CITIES = [
  [2.35,48.85],[13.41,52.52],[0.12,51.51],[-3.70,40.42],[12.49,41.90],
  [4.90,52.37],[18.07,59.33],[14.42,50.08],[19.04,47.50],[28.95,41.01],
  [30.52,50.45],[37.62,55.75],[16.37,48.21],[9.19,45.46],[2.17,41.38],
  [114.17,22.30],[121.47,31.23],[116.39,39.93],[139.70,35.68],[126.98,37.57],
  [103.82,1.35],[100.52,13.75],[77.21,28.63],[72.88,19.07],[88.36,22.57],
  [104.92,11.57],[106.85,-6.21],[51.53,25.29],[46.72,24.69],[55.27,25.20],
  [-73.98,40.77],[-87.63,41.88],[-118.24,34.05],[-122.42,37.77],
  [-79.38,43.65],[-43.17,-22.90],[-46.63,-23.55],[-58.38,-34.60],
  [-70.67,-33.45],[-99.13,19.43],[3.39,6.45],[36.82,-1.29],
  [28.04,-26.20],[18.42,-33.93],[151.21,-33.87],[144.96,-37.82]
];

function navigate(page) {
  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'navigate', page: page }, '*');
    }
  } catch (e) {}
}

function typeLabel(t) {
  return t === 'film_location' ? '电影地标' : '影院现场';
}

function placeById(id) {
  for (var i = 0; i < PLACES.length; i++) if (PLACES[i].id === id) return PLACES[i];
  return PLACES[0];
}

function cityById(id) {
  for (var i = 0; i < CITIES.length; i++) if (CITIES[i].id === id) return CITIES[i];
  return CITIES[0];
}

function cityIdForPlace(p) {
  for (var i = 0; i < CITIES.length; i++) if (CITIES[i].zh === p.city) return CITIES[i].id;
  return CITIES[0].id;
}

var activePlaceId = 'babylon-berlin';
var activeCityId = 'berlin';
var worldData = null;
var mapWrap = document.getElementById('mapWrap');
var svgEl = document.getElementById('map-svg');
var floatCard = document.getElementById('float-card');
var zoomK = 1;

function syncSearch(val) {
  var p = document.getElementById('placeFilter');
  if (p && p !== document.activeElement) p.value = val;
}

function renderPlaceList(filter) {
  var q = (filter || '').trim().toLowerCase();
  syncSearch(filter || '');
  var list = document.getElementById('placeList');
  list.innerHTML = '';
  PLACES.forEach(function (p) {
    var hay = (p.name + p.city + p.cityEn + (p.film || '') + typeLabel(p.type)).toLowerCase();
    if (q && hay.indexOf(q) === -1) return;
    var div = document.createElement('div');
    div.className = 'place-item' + (p.id === activePlaceId ? ' on' : '');
    var sub = p.type === 'film_location'
      ? '《' + p.film + '》· ' + p.city
      : p.city + ' · ' + p.country;
    div.innerHTML = '<div class="pl-type">' + typeLabel(p.type) + '</div>'
      + '<div class="pl-name">' + p.name + '</div>'
      + '<div class="pl-sub">' + sub + '</div>';
    div.onclick = function () { selectPlace(p.id); };
    list.appendChild(div);
  });
}

function renderFloatCard(p, skipAnim) {
  function fill() {
    var isCinema = p.type === 'cinema';
    var still = '';
    if (p.img) {
      still = '<img src="' + p.img + '" alt="' + p.name + '">';
    }
    var cap = '<div class="fc-still-cap"><div class="nm">' + p.name + '</div><div class="ct">' + p.city + ' · ' + p.country + '</div></div>';
    var body = '';
    if (isCinema) {
      body = '<div class="fc-type">影院现场</div>'
        + '<div class="fc-quote">「' + p.quote + '」</div>'
        + '<div class="fc-meta"><span>' + (p.user || '') + '</span><span class="likes">♡ ' + p.likes + '</span></div>'
        + '<div class="fc-actions"><button type="button" class="fc-btn-ghost">查看场景</button><button type="button" class="fc-btn-gold">我也来打卡</button></div>'
        + '<div class="fc-more">查看此地全部记录 →</div>';
    } else {
      body = '<div class="fc-type">电影地标</div>'
        + '<div class="fc-film">《' + p.film + '》' + p.filmYear + ' · ' + p.director + '</div>'
        + '<div class="fc-quote">「' + p.quote + '」</div>'
        + '<div class="fc-meta"><span>场景记录</span><span class="likes">♡ ' + p.likes + '</span></div>'
        + '<div class="fc-actions"><button type="button" class="fc-btn-ghost">查看场景</button><button type="button" class="fc-btn-gold">我也来打卡</button></div>'
        + '<div class="fc-more">查看此地全部记录 →</div>';
    }
    floatCard.innerHTML = '<div class="fc-still"><div class="fc-grain"></div>' + still + cap + '</div><div class="fc-body">' + body + '</div>';
  }
  if (skipAnim) { fill(); return; }
  floatCard.classList.add('fade-out');
  setTimeout(function () {
    fill();
    floatCard.classList.remove('fade-out');
    floatCard.classList.add('show');
  }, 300);
}

function frameEl(p) {
  var d = document.createElement('div');
  d.className = 'bs-frame' + (p.id === activePlaceId ? ' active' : '');
  var warm = p.type === 'film_location';
  var img = p.img
    ? '<img src="' + p.img + '" alt="">'
  : '';
  d.innerHTML = '<div class="bs-frame-img ' + (warm ? 'warm' : 'cool') + '">' + img + '</div>'
    + '<div class="bs-frame-info"><div class="bs-frame-name">' + p.name + '</div>'
    + '<div class="bs-frame-quote">「' + p.quote + '」</div></div>';
  d.onclick = function () { selectPlace(p.id); };
  return d;
}

function renderStrip(cityZh) {
  var cityPlaces = PLACES.filter(function (p) { return p.city === cityZh; });
  var filmLocs = cityPlaces.filter(function (p) { return p.type === 'film_location'; });
  var cinemas = cityPlaces.filter(function (p) { return p.type === 'cinema'; });
  document.getElementById('bsCityName').textContent = cityZh;
  document.getElementById('bsCityCount').textContent = cityPlaces.length + ' 个地点';
  var sf = document.getElementById('scrollFilm');
  var sc = document.getElementById('scrollCinema');
  sf.innerHTML = '';
  sc.innerHTML = '';
  filmLocs.forEach(function (p) { sf.appendChild(frameEl(p)); });
  cinemas.forEach(function (p) { sc.appendChild(frameEl(p)); });
}

function selectPlace(placeId) {
  var p = placeById(placeId);
  activePlaceId = placeId;
  activeCityId = cityIdForPlace(p);
  renderPlaceList(document.getElementById('placeFilter').value);
  renderStrip(p.city);
  renderFloatCard(p, false);
  renderMap();
}
window.selectPlace = selectPlace;

function selectCity(cityId) {
  var city = cityById(cityId);
  var first = null;
  for (var i = 0; i < PLACES.length; i++) {
    if (PLACES[i].city === city.zh) { first = PLACES[i]; break; }
  }
  if (first) selectPlace(first.id);
}
window.selectCity = selectCity;

function buildArc(projection, from, to) {
  var a = projection([from.lng, from.lat]);
  var b = projection([to.lng, to.lat]);
  if (!a || !b) return '';
  var dx = b[0] - a[0], dy = b[1] - a[1];
  var len = Math.sqrt(dx * dx + dy * dy) || 1;
  var px = -dy / len, py = dx / len;
  var d = 'M' + a[0] + ',' + a[1];
  for (var i = 1; i <= 50; i++) {
    var t = i / 50;
    var sag = Math.sin(Math.PI * t) * -22;
    var x = (1 - t) * a[0] + t * b[0] + px * sag;
    var y = (1 - t) * a[1] + t * b[1] + py * sag;
    d += 'L' + x + ',' + y;
  }
  return d;
}

function arcOpacity(projection, active, c, w, h) {
  var a = projection([active.lng, active.lat]);
  var b = projection([c.lng, c.lat]);
  if (!a || !b) return 0.12;
  var dist = Math.sqrt(Math.pow(b[0] - a[0], 2) + Math.pow(b[1] - a[1], 2));
  var t = Math.min(1, dist / (Math.min(w, h) * 0.45));
  if (t < 0.33) return 0.16;
  if (t < 0.66) return 0.12;
  return 0.08;
}

function renderMap() {
  var host = mapWrap.querySelector('.map-svg-host');
  var w = host ? host.clientWidth : mapWrap.clientWidth;
  var h = host ? host.clientHeight : mapWrap.clientHeight;
  if (w < 2 || h < 2) return;

  var projection = d3.geoNaturalEarth1()
    .scale(Math.min(w / 6.0, h / 3.2) * zoomK)
    .translate([w / 2, h / 2]);
  var path = d3.geoPath().projection(projection);
  var svg = d3.select(svgEl);
  svg.selectAll('*').remove();
  svg.attr('width', w).attr('height', h);

  var activeCity = cityById(activeCityId);
  var defs = svg.append('defs');
  var dotGlow = defs.append('filter').attr('id', 'dot-glow');
  dotGlow.append('feGaussianBlur').attr('in', 'SourceGraphic').attr('stdDeviation', 3).attr('result', 'blur');
  var dm = dotGlow.append('feMerge');
  dm.append('feMergeNode').attr('in', 'blur');
  dm.append('feMergeNode').attr('in', 'SourceGraphic');

  var landBlur = defs.append('filter').attr('id', 'land-blur');
  landBlur.append('feGaussianBlur').attr('in', 'SourceGraphic').attr('stdDeviation', 1.4);

  var root = svg.append('g');
  root.append('rect').attr('width', w).attr('height', h).attr('fill', '#0a0c14');

  var grid = root.append('g');
  [0.33, 0.66].forEach(function (f) {
    grid.append('line').attr('x1', 0).attr('x2', w).attr('y1', h * f).attr('y2', h * f)
      .attr('stroke', 'rgba(255,255,255,0.01)').attr('stroke-width', 0.3).attr('stroke-dasharray', '6 14');
    grid.append('line').attr('y1', 0).attr('y2', h).attr('x1', w * f).attr('x2', w * f)
      .attr('stroke', 'rgba(255,255,255,0.01)').attr('stroke-width', 0.3).attr('stroke-dasharray', '6 14');
  });

  if (worldData) {
    var countries = topojson.feature(worldData, worldData.objects.countries);
    root.append('g').attr('filter', 'url(#land-blur)').attr('opacity', 0.9)
      .selectAll('path').data(countries.features).join('path')
      .attr('d', path)
      .attr('fill', 'rgba(255,255,255,0.11)')
      .attr('stroke', 'rgba(255,255,255,0.16)')
      .attr('stroke-width', 0.5);
  }

  var heatG = root.append('g').attr('opacity', 0.85);
  var baseR = 28 * zoomK;
  HEAT_CITIES.forEach(function (coord) {
    var pt = projection(coord);
    if (!pt) return;
    var near = Math.abs(coord[0] - activeCity.lng) < 3 && Math.abs(coord[1] - activeCity.lat) < 3;
    var r = near ? baseR * 2 : baseR;
    var gid = 'heat-' + coord[0] + '-' + coord[1];
    var g = defs.append('radialGradient').attr('id', gid).attr('cx', '50%').attr('cy', '50%').attr('r', '50%');
    g.append('stop').attr('offset', '0%').attr('stop-color', near ? 'rgba(160,100,15,0.24)' : 'rgba(160,100,15,0.20)');
    g.append('stop').attr('offset', '100%').attr('stop-color', 'rgba(0,0,0,0)');
    heatG.append('circle').attr('cx', pt[0]).attr('cy', pt[1]).attr('r', r).attr('fill', 'url(#' + gid + ')');
  });

  var arcG = root.append('g');
  CITIES.forEach(function (c) {
    if (c.id === activeCityId) return;
    var d = buildArc(projection, activeCity, c);
    if (!d) return;
    arcG.append('path').attr('d', d).attr('fill', 'none')
      .attr('stroke', 'rgba(201,168,76,' + arcOpacity(projection, activeCity, c, w, h) + ')')
      .attr('stroke-width', 0.55).attr('stroke-dasharray', '2 8');
  });

  var markers = root.append('g');
  CITIES.forEach(function (c) {
    var pt = projection([c.lng, c.lat]);
    if (!pt) return;
    var g = markers.append('g').attr('transform', 'translate(' + pt[0] + ',' + pt[1] + ')').style('cursor', 'pointer');
    if (c.id === activeCityId) {
      g.append('circle').attr('r', 17).attr('fill', 'rgba(201,168,76,0.07)').style('animation', 'glow 2.4s ease-in-out infinite');
      g.append('circle').attr('r', 9).attr('fill', 'rgba(201,168,76,0.14)');
      g.append('circle').attr('r', 5).attr('fill', '#f0c86a').attr('filter', 'url(#dot-glow)').style('animation', 'glow 2.4s ease-in-out infinite');
      g.append('text').attr('x', 10).attr('y', -3).attr('fill', 'rgba(237,232,223,0.78)')
        .attr('font-size', 10).attr('font-family', 'Georgia, serif').text(c.zh);
      var offs = [[10, 8], [-12, 6], [8, -10], [-10, -8]];
      var locs = PLACES.filter(function (p) { return p.city === c.zh && p.type === 'film_location'; });
      locs.forEach(function (p, i) {
        var o = offs[i % offs.length];
        g.append('circle').attr('cx', o[0]).attr('cy', o[1]).attr('r', 2.5).attr('fill', 'rgba(201,168,76,0.62)');
      });
    } else {
      var oc = g.append('circle').attr('r', 2.2).attr('fill', '#c9a84c').attr('opacity', 0.18);
      g.append('title').text(c.zh);
      g.on('mouseenter', function () { oc.attr('opacity', 0.55); });
      g.on('mouseleave', function () { oc.attr('opacity', 0.18); });
    }
    g.on('click', function () { selectCity(c.id); });
  });
}

function mapFallback(on) {
  mapWrap.classList.toggle('map-fallback', on);
}

function loadWorld() {
  fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      worldData = data;
      mapFallback(false);
      renderMap();
    })
    .catch(function () {
      worldData = null;
      mapFallback(true);
      renderMap();
    });
}

function initDrag(el) {
  var down = false, sx = 0, sl = 0;
  el.addEventListener('mousedown', function (e) {
    down = true; el.classList.add('grabbing'); sx = e.pageX - el.offsetLeft; sl = el.scrollLeft;
  });
  el.addEventListener('mouseleave', function () { down = false; el.classList.remove('grabbing'); });
  el.addEventListener('mouseup', function () { down = false; el.classList.remove('grabbing'); });
  el.addEventListener('mousemove', function (e) {
    if (!down) return;
    e.preventDefault();
    el.scrollLeft = sl - (e.pageX - el.offsetLeft - sx) * 1.2;
  });
}

function init() {
  document.getElementById('placeFilter').addEventListener('input', function () { renderPlaceList(this.value); });
  document.getElementById('zoomIn').onclick = function () { zoomK = Math.min(2.2, zoomK * 1.12); renderMap(); };
  document.getElementById('zoomOut').onclick = function () { zoomK = Math.max(0.65, zoomK / 1.12); renderMap(); };
  initDrag(document.getElementById('scrollFilm'));
  initDrag(document.getElementById('scrollCinema'));
  new ResizeObserver(function () { renderMap(); }).observe(mapWrap);

  var p0 = placeById(activePlaceId);
  renderPlaceList('');
  renderStrip(p0.city);
  renderFloatCard(p0, true);
  floatCard.classList.add('show');
  loadWorld();
  setTimeout(renderMap, 40);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();

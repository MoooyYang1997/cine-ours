#!/usr/bin/env python3
"""Assemble page-map.html (Round 3) from CSS, HTML shell, JS + embedded kino."""
import base64
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
kino = "data:image/jpeg;base64," + base64.b64encode((ROOT / "kino_cinema.jpg").read_bytes()).decode()
css = (ROOT / "page-map-r3.css").read_text(encoding="utf-8")
js = (ROOT / "page-map-r3.js").read_text(encoding="utf-8").replace("__KINO_PLACEHOLDER__", kino)

html_shell = """<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Cine Ours — 世界电影信号地图</title>
<script src="https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/topojson-client@3/dist/topojson-client.min.js"></script>
<style>
""" + css + """
</style>
</head>
<body>
<div class="app">
  <div id="body" class="body-row">
    <aside class="sidebar">
      <div class="sb-head">
        <div class="sb-live"><i></i>正在发生</div>
        <input class="sb-search" id="placeFilter" type="search" placeholder="🔍 搜索城市、影院或电影地标" autocomplete="off">
      </div>
      <div class="sb-hint">刚刚有人在世界某处留下了记录</div>
      <div class="place-list" id="placeList"></div>
      <div class="sb-foot"></div>
    </aside>

    <main class="map-wrap" id="mapWrap">
      <div class="map-svg-host"><svg id="map-svg" aria-label="世界电影信号地图"></svg></div>
      <div id="map-ctrl">
        <button type="button" id="zoomIn" title="放大">+</button>
        <button type="button" id="zoomOut" title="缩小">−</button>
      </div>
      <div class="float-card" id="float-card"></div>
    </main>
  </div>

  <div class="bottom-strip">
    <div class="bs-city">
      <div class="bs-city-name" id="bsCityName">柏林</div>
      <div class="bs-city-sub">电影发生过的地方</div>
      <div class="bs-city-count" id="bsCityCount">1 个地点</div>
    </div>
    <div class="bs-rows">
      <div class="bs-row">
        <div class="bs-row-label"><span class="bs-row-type">电影<br>地标</span></div>
        <div class="bs-row-scroll" id="scrollFilm"></div>
        <div class="bs-row-cta"><span class="bs-cta-link">我来添加 →</span></div>
      </div>
      <div class="bs-row">
        <div class="bs-row-label"><span class="bs-row-type">影院<br>现场</span></div>
        <div class="bs-row-scroll" id="scrollCinema"></div>
        <div class="bs-row-cta"><span class="bs-cta-link">我来打卡 →</span></div>
      </div>
    </div>
  </div>
</div>
<script>
""" + js + """
</script>
</body>
</html>
""".replace("<div", "<div").replace("</div>", "</div>")

out = ROOT / "page-map.html"
out.write_text(html_shell, encoding="utf-8")
print(f"Wrote {out} ({out.stat().st_size} bytes)")

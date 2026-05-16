#!/usr/bin/env python3
"""Embed kino_cinema.jpg as base64 into page-map.html (var KINO_IMG)."""
import base64
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MAP = ROOT / "page-map.html"
KINO = ROOT / "kino_cinema.jpg"

data_uri = "data:image/jpeg;base64," + base64.b64encode(KINO.read_bytes()).decode()
text = MAP.read_text(encoding="utf-8")
text, n = re.subn(r"var KINO_IMG = .*?;\n", f"var KINO_IMG = {data_uri!r};\n", text, count=1)
if n != 1:
    raise SystemExit("Could not find var KINO_IMG in page-map.html")
MAP.write_text(text, encoding="utf-8")
print(f"Updated {MAP} ({MAP.stat().st_size} bytes)")

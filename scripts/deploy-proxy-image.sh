#!/usr/bin/env bash
# 部署 proxy-image Edge Function（需先登录 Supabase CLI）
set -e
cd "$(dirname "$0")/.."

echo "→ 检查登录状态…"
if ! npx supabase projects list >/dev/null 2>&1; then
  echo ""
  echo "请先登录（会打开浏览器）："
  echo "  npx supabase login"
  echo ""
  exit 1
fi

echo "→ 部署 proxy-image（无需 Docker，使用 --use-api）…"
npx supabase functions deploy proxy-image \
  --project-ref dirrnojiybbwotuqeqww \
  --use-api

echo ""
echo "✓ 部署完成。请在 Dashboard → Edge Functions 查看 proxy-image"
echo "  测试: index.html → 地图 → 策展人账号 → 设为封面"

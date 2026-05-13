#!/usr/bin/env bash
# 一键提交并推送到 origin，触发 GitHub Pages 等线上更新。
# 用法：
#   ./scripts/sync-online.sh
#   ./scripts/sync-online.sh "首页港影节区块微调"
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -z $(git status --porcelain 2>/dev/null) ]]; then
  echo "sync-online: 工作区无改动，跳过。"
  exit 0
fi

BRANCH="$(git branch --show-current 2>/dev/null || echo main)"
MSG="${1:-Update site $(date -u +%Y-%m-%dT%H:%MZ)}"

git add -A
if git diff --cached --quiet; then
  echo "sync-online: 没有可提交内容（可能全是忽略文件）。"
  exit 0
fi

git commit -m "$MSG"
git push origin "$BRANCH"
echo "sync-online: 已推送到 origin/$BRANCH，等待 GitHub Pages 部署（通常 1～2 分钟）。"

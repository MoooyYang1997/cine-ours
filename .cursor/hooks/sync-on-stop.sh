#!/usr/bin/env bash
# Cursor「stop」：本轮 Agent 结束后，若有未提交改动则自动 push（触发 GitHub Pages）。
# 关闭：在项目根创建空文件 .cursor/disable-auto-sync
set -uo pipefail

HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$HOOK_DIR/../.." && pwd)"
cd "$REPO" || { printf '%s\n' '{}'; exit 0; }

if [[ -f .cursor/disable-auto-sync ]]; then
  printf '%s\n' '{}'
  exit 0
fi

# 消耗 stdin（Cursor 传入的 JSON），避免阻塞
cat >/dev/null 2>&1 || true

if [[ ! -d .git ]]; then
  printf '%s\n' '{}'
  exit 0
fi

if [[ -z $(git status --porcelain 2>/dev/null) ]]; then
  printf '%s\n' '{}'
  exit 0
fi

# 不因 push 失败而阻断 Cursor；失败时在本机终端可见 sync-online 输出
bash scripts/sync-online.sh "auto: Cursor 会话后同步线上" || true

printf '%s\n' '{}'
exit 0

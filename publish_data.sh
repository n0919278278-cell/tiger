#!/usr/bin/env bash
# 重建 data.json 並推送到 GitHub Pages repo（每日開獎後由例行流程呼叫）
# 方法：本機 git + GitHub CLI 的登入（gh auth login 一次，由使用者本人完成；腳本不產生任何權杖）。
# 若 gh 未登入，腳本只重建 data.json 並以代碼 3 結束，讓呼叫端改走其他方式（例如 Cursor 雲端代理推送）。
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
REPO="${TIGER_REPO:-n0919278278-cell/tiger}"
BRANCH="${TIGER_BRANCH:-main}"
cd "$DIR"
python3 build_data.py ../draws.csv data.json
if ! gh auth status >/dev/null 2>&1; then
  echo "gh 未登入：data.json 已在本機更新，但未推送（exit 3）" >&2; exit 3
fi
gh auth setup-git >/dev/null 2>&1 || true
if [ ! -d .git ]; then
  git init -q -b "$BRANCH"
  git remote add origin "https://github.com/$REPO.git"
fi
git config user.name  >/dev/null || git config user.name  "幻湮宮 bot"
git config user.email >/dev/null || git config user.email "bot@users.noreply.github.com"
git fetch -q origin "$BRANCH" 2>/dev/null && git reset -q --soft "origin/$BRANCH" || true
git add -A
if git diff --cached --quiet; then echo "沒有變更"; exit 0; fi
git commit -q -m "data: $(python3 -c 'import json;d=json.load(open("data.json"));print(d["last_draw"], d["total_draws"])')"
git push -q origin "HEAD:$BRANCH"
echo "已推送 $(git rev-parse --short HEAD) 到 $REPO@$BRANCH"

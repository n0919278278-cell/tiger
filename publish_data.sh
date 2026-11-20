#!/usr/bin/env bash
# 舊版：重建 data.json（含下一期暗號雜湊，不含明文）並推送到 GitHub Pages。
# 2026-11 起網站已改為「財神幻湮宮」服務門面，首頁不再使用選號資料。
# 預設直接結束（代碼 0），避免每日例行把舊統計推上官網。
# 若確實要重建舊 data.json，請明確設定 TIGER_PUBLISH_LEGACY=1。
# 舊流程仍需本機 .secret_salt（已 gitignore），並用 GitHub CLI 登入（腳本不產生權杖）。
set -euo pipefail
if [ "${TIGER_PUBLISH_LEGACY:-}" != "1" ]; then
  echo "本站已轉型為財神幻湮宮官網門面，略過選號資料發布。若要重建舊 data.json，請設 TIGER_PUBLISH_LEGACY=1。"
  exit 0
fi
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

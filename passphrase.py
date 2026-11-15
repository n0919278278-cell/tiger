#!/usr/bin/env python3
"""每日暗號：依開獎日 + 私密鹽決定兩個吉利字，並產出可公開的 SHA-256 雜湊。

用法：
  python3 passphrase.py 2026-11-16          # 印出當日暗號（只給內部／影片用，不可上架）
  python3 passphrase.py 2026-11-16 --hash   # 只印雜湊（可公開）

鹽檔（勿提交）：tiger_page/.secret_salt
  備用複本：/cursor/stores/store-f2005c21-16ab-41f1-b558-2bfd094bf466/.secret_salt

頁面核對用的是 SHA-256(pepper|date|word)，不含鹽。詞庫只有約 50 個詞，
懂程式的人仍可窮舉破解，這是已告知的簡單版限制。
"""
from __future__ import annotations

import hashlib
import os
import sys
from datetime import date, timedelta
PEPPER = "hyy539-passphrase-v1"
SALT_NAME = ".secret_salt"
STORE_SALT = "/cursor/stores/store-f2005c21-16ab-41f1-b558-2bfd094bf466/.secret_salt"
HERE = os.path.dirname(os.path.abspath(__file__))
LOCAL_SALT = os.path.join(HERE, SALT_NAME)
AVOID_LAST = 10
EPOCH = date(2007, 1, 1)  # 今彩539 資料起點；從此日往後填，避免遞迴

# 詞序固定後不得再改，否則歷史日期的暗號會變。
WORDS = (
    "招財", "進寶", "金虎", "納福", "旺運", "如意", "吉祥", "聚財",
    "開運", "鴻福", "迎祥", "添壽", "富貴", "興隆", "瑞氣", "發財",
    "得財", "福臨", "吉慶", "安康", "天賜", "好運", "祿來", "豐收",
    "平安", "喜樂", "吉兆", "福澤", "財旺", "祥瑞", "福到", "金來",
    "亨通", "順遂", "昌盛", "招福", "添財", "福星", "萬福", "瑞祥",
    "嘉運", "福安", "吉利", "得寶", "盈餘", "滿福", "通達", "瑞彩",
)

# 簡體 → 繁體（僅覆蓋本詞庫會用到、且簡繁不同的字）
S2T = {
    "纳": "納", "宝": "寶", "运": "運", "开": "開", "鸿": "鴻",
    "寿": "壽", "贵": "貴", "兴": "興", "气": "氣", "发": "發",
    "临": "臨", "庆": "慶", "赐": "賜", "禄": "祿", "来": "來",
    "丰": "豐", "乐": "樂", "泽": "澤", "顺": "順", "万": "萬",
    "余": "餘", "满": "滿", "达": "達", "财": "財", "进": "進",
}

assert len(WORDS) >= 40 and len(set(WORDS)) == len(WORDS)
assert all(len(w) == 2 for w in WORDS)


def normalize_word(s: str) -> str:
    s = "".join(str(s or "").split())
    return "".join(S2T.get(c, c) for c in s)


def load_salt() -> str:
    for path in (LOCAL_SALT, STORE_SALT):
        if os.path.isfile(path):
            salt = open(path, encoding="utf-8").read().strip()
            if salt:
                if path != LOCAL_SALT:
                    try:
                        if not os.path.exists(LOCAL_SALT):
                            with open(LOCAL_SALT, "w", encoding="utf-8") as f:
                                f.write(salt + "\n")
                            os.chmod(LOCAL_SALT, 0o600)
                    except OSError:
                        pass
                return salt
    sys.exit(f"找不到鹽檔：請建立 {LOCAL_SALT}（或 {STORE_SALT}）")


def _is_draw_day(d: date) -> bool:
    return d.weekday() != 6  # 今彩539 週一至週六開獎（春節停開未處理）


def next_draw_after(last_iso: str) -> str:
    d = date.fromisoformat(last_iso) + timedelta(days=1)
    while not _is_draw_day(d):
        d += timedelta(days=1)
    return d.isoformat()


def prev_draw_dates(iso: str, n: int = AVOID_LAST) -> list[str]:
    d = date.fromisoformat(iso)
    out = []
    while len(out) < n:
        d -= timedelta(days=1)
        if _is_draw_day(d):
            out.append(d.isoformat())
    return out


def public_hash(date_str: str, word: str) -> str:
    word = normalize_word(word)
    msg = f"{PEPPER}|{date_str}|{word}".encode("utf-8")
    return hashlib.sha256(msg).hexdigest()


def _raw_index(date_str: str, salt: str, offset: int = 0) -> int:
    h = hashlib.sha256(f"{salt}|{date_str}|{offset}".encode("utf-8")).hexdigest()
    return int(h, 16) % len(WORDS)


_CACHE: dict[str, str] = {}
_FILLED_UNTIL: date | None = None


def _assign(iso: str, salt: str, avoided: set[str]) -> str:
    for offset in range(len(WORDS)):
        w = WORDS[_raw_index(iso, salt, offset)]
        if w not in avoided:
            return w
    return WORDS[_raw_index(iso, salt, 0)]


def _ensure_filled(until: date) -> None:
    """從 EPOCH 逐日填到 until（含），每個開獎日避開最近 AVOID_LAST 個開獎日用過的詞。"""
    global _FILLED_UNTIL
    if until < EPOCH:
        return
    salt = load_salt()
    if _FILLED_UNTIL is not None and until <= _FILLED_UNTIL:
        return
    if _FILLED_UNTIL is None:
        cur = EPOCH
        recent: list[str] = []
    else:
        cur = _FILLED_UNTIL + timedelta(days=1)
        recent = [_CACHE[p] for p in reversed(prev_draw_dates(cur.isoformat(), AVOID_LAST)) if p in _CACHE]
    while cur <= until:
        iso = cur.isoformat()
        if iso not in _CACHE:
            avoided = set(recent[-AVOID_LAST:])
            w = _assign(iso, salt, avoided)
            _CACHE[iso] = w
            if _is_draw_day(cur):
                recent.append(w)
        cur += timedelta(days=1)
    _FILLED_UNTIL = until if _FILLED_UNTIL is None else max(_FILLED_UNTIL, until)


def word_for_date(date_str: str) -> str:
    """依日期與鹽決定暗號；避開最近 AVOID_LAST 期已用過的詞。"""
    d = date.fromisoformat(date_str)
    if d < EPOCH:
        return _assign(date_str, load_salt(), set())
    _ensure_filled(d)
    return _CACHE[date_str]


def passphrase_line(word: str) -> str:
    return f"今日暗號：{word}，記好了。"


def passphrase_sub(word: str) -> str:
    return f"今日暗號：{word}\n記好了。"


def payload_for_build(last_draw_iso: str) -> dict:
    """給 data.json 用：只有日期、雜湊、公開胡椒，沒有明文暗號。"""
    d = next_draw_after(last_draw_iso)
    w = word_for_date(d)
    return {"date": d, "hash": public_hash(d, w), "pepper": PEPPER}


def main(argv: list[str] | None = None) -> int:
    argv = list(sys.argv[1:] if argv is None else argv)
    if not argv or argv[0] in ("-h", "--help"):
        print("usage: passphrase.py <YYYY-MM-DD> [--hash]", file=sys.stderr)
        return 2
    date_str = argv[0]
    date.fromisoformat(date_str)
    want_hash = "--hash" in argv[1:]
    w = word_for_date(date_str)
    print(public_hash(date_str, w) if want_hash else w)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

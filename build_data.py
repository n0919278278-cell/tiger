#!/usr/bin/env python3
"""產生 data.json（虎爺賜號頁面用的號碼統計）。
用法：python3 build_data.py [draws.csv路徑] [輸出路徑]
預設讀 ../draws.csv（2007 起全部開獎），輸出 ./data.json。可每日開獎後重跑。
內容：每個號碼(1-39)的歷史出現次數、近100期出現次數、目前遺漏期數。
"""
import csv, json, sys, os, datetime
here = os.path.dirname(os.path.abspath(__file__))
src = sys.argv[1] if len(sys.argv) > 1 else os.path.join(here, '..', 'draws.csv')
out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(here, 'data.json')
rows = []
with open(src, newline='') as f:
    for r in csv.DictReader(f):
        nums = [int(r[k]) for k in ('n1', 'n2', 'n3', 'n4', 'n5')]
        assert len(set(nums)) == 5 and all(1 <= n <= 39 for n in nums), r
        rows.append((r['date'], nums))
rows.sort(key=lambda x: x[0])
N = len(rows)
allf = [0] * 40; rec = [0] * 40; gap = [None] * 40
for i, (d, nums) in enumerate(rows):
    for n in nums:
        allf[n] += 1
        if i >= N - 100: rec[n] += 1
for n in range(1, 40):
    for k in range(N - 1, -1, -1):
        if n in rows[k][1]:
            gap[n] = N - 1 - k; break
data = {
    'generated_at': datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=8))).isoformat(timespec='seconds'),
    'first_draw': rows[0][0], 'last_draw': rows[-1][0], 'last_numbers': rows[-1][1],
    'total_draws': N, 'recent_window': min(100, N),
    'all': allf[1:], 'recent': rec[1:], 'gap': gap[1:],
}
with open(out, 'w') as f:
    json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
print(f'wrote {out}: {N} draws {rows[0][0]}..{rows[-1][0]}')

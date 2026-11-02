#!/usr/bin/env python3
"""ربط كروت المحافظات بالموقع.

١) شبكة ثابتة (HTML مش JS) لكل المحافظات في offices.html
٢) لينك «دليل المحافظة كامل» في كل صفحة قسم/محافظة (١٠٨ صفحة)
آمن للتشغيل أكتر من مرة.
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = json.loads((ROOT / "tools/seo/offices-data.json").read_text(encoding="utf-8"))
CATS = ["civil", "traffic", "insurance", "notary"]

NAMES = {}
for p in sorted((ROOT / "offices/civil").glob("*.html")):
    t = re.search(r"<title>(.*?)</title>", p.read_text(encoding="utf-8"), re.S)
    m = re.search(r"في\s+(.+?)\s*—", t.group(1)) if t else None
    NAMES[p.stem] = m.group(1).strip() if m else p.stem

MARK_HUB = 'data-gov-grid="1"'
MARK_LINK = 'data-gov-link="1"'


def grid() -> str:
    cards = []
    for gov in sorted(DATA, key=lambda g: NAMES[g]):
        n = sum(len(DATA[gov].get(c, [])) for c in CATS)
        cards.append(
            f'<a class="gov-card" href="offices/{gov}.html">'
            f'<span class="gov-name">{NAMES[gov]}</span>'
            f'<span class="gov-count">{n} مكتب</span></a>'
        )
    return (
        f'<section {MARK_HUB} style="max-width:1100px;margin:0 auto 40px;padding:0 20px">'
        '<h2 style="font-size:19px;color:#fff;font-weight:800;margin:0 0 6px">المكاتب حسب المحافظة</h2>'
        '<p style="font-size:13.5px;color:#8ea0c4;margin:0 0 16px;line-height:1.8">'
        "اختار محافظتك تلاقي تقسيمة المكاتب كلها: أحوال مدنية، مرور، تأمينات، وشهر عقاري — بالعناوين والمواعيد.</p>"
        '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px">'
        + "".join(cards)
        + "</div></section>"
    )


GRID_CSS = """<style>
.gov-card{display:flex;flex-direction:column;gap:4px;background:#162847;border:1px solid #1e3556;border-radius:12px;padding:12px 14px;text-decoration:none;transition:all .25s}
.gov-card:hover{border-color:#e6c258;transform:translateY(-2px)}
.gov-name{font-size:14px;font-weight:800;color:#fff}
.gov-count{font-size:11.5px;color:#8ea0c4}
</style>"""


def link_line(gov: str) -> str:
    name = NAMES[gov]
    n = sum(len(DATA[gov].get(c, [])) for c in CATS)
    return (
        f'<div {MARK_LINK} style="max-width:800px;margin:0 auto 26px;padding:0 20px">'
        f'<a href="../{gov}.html" style="display:block;background:#162847;border:1px solid #e6c258;'
        f'border-radius:12px;padding:14px 16px;text-decoration:none;color:#e8eef8;font-size:13.5px;font-weight:700">'
        f"🏙️ دليل {name} كامل — {n} مكتب في ٤ أقسام ←</a></div>"
    )


def main() -> int:
    # ١) شبكة المحافظات
    hub = ROOT / "offices.html"
    h = hub.read_text(encoding="utf-8")
    if MARK_HUB not in h:
        anchor = "<!-- ===== BOOK MINI AD ===== -->"
        if anchor in h:
            h = h.replace(anchor, grid() + "\n" + GRID_CSS + "\n" + anchor, 1)
            hub.write_text(h, encoding="utf-8")
            print("offices.html: اتضافت شبكة ٢٧ محافظة")
        else:
            print("offices.html: مالقيش مكان الإدراج")

    # ٢) لينك المحافظة في صفحات الأقسام
    added = skipped = 0
    for cat in CATS:
        for p in sorted((ROOT / "offices" / cat).glob("*.html")):
            s = p.read_text(encoding="utf-8")
            if MARK_LINK in s:
                skipped += 1
                continue
            m = re.search(r'<div class="footer">', s)
            if not m:
                continue
            s = s[: m.start()] + link_line(p.stem) + "\n\n" + s[m.start():]
            p.write_text(s, encoding="utf-8")
            added += 1
    print(f"صفحات الأقسام: {added} اتعدّلت · {skipped} كانت متعدّلة")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

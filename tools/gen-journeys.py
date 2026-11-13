#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
مولّد رحلات الخدمة — بيبني مسارات journeys.json من محتوى صفحات الخدمات الموجودة.
مفيش نص جديد ومفيش أرقام مخترعة: الخطوات والأسئلة والأوراق كلها مسحوبة من
pages/services/*.html + data/docs-finder.json.

    python3 tools/gen-journeys.py            # يدمج الرحلات الجديدة في journeys.json
    python3 tools/gen-journeys.py --dry      # يعرض بس، من غير كتابة
"""

import html
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JOURNEYS = os.path.join(ROOT, "journeys.json")
DOCS = os.path.join(ROOT, "data", "docs-finder.json")

EMOJI = {
    "car-ownership-transfer": "🚗",
    "renew-car-license": "🪪",
    "new-passport": "🛂",
    "national-id-card": "🆔",
    "criminal-record": "📜",
    "birth-certificate": "👶",
    "inheritance-declaration": "🏠",
    "property-sale-registration": "🔑",
    "power-of-attorney": "✍️",
}

ORDER = list(EMOJI)


def clean(t):
    t = re.sub(r"<[^>]+>", " ", t)
    t = html.unescape(t)
    return re.sub(r"\s+", " ", t).strip()


def parse_steps(block):
    out = []
    for m in re.finditer(
        r'<div class="step-title">(.*?)</div>\s*<div class="step-desc">(.*?)</div>',
        block,
        flags=re.S,
    ):
        t, d = clean(m.group(1)), clean(m.group(2))
        if t and d:
            out.append({"title": t, "desc": d, "time": "", "docs": []})
    return out


def parse_page(path):
    with open(path, encoding="utf-8") as f:
        s = f.read()

    h1 = re.search(r"<h1[^>]*>(.*?)</h1>", s, flags=re.S)
    title = clean(h1.group(1)) if h1 else ""
    title = re.sub(r"^[^\w\u0600-\u06FF]+", "", title).strip()

    desc = re.search(r'<meta name="description" content="(.*?)"', s, flags=re.S)
    subtitle = clean(desc.group(1)) if desc else title
    if len(subtitle) > 120:
        subtitle = subtitle[:117].rsplit(" ", 1)[0] + "…"

    # المسارات: تابات لو موجودة
    labels = [
        clean(x)
        for x in re.findall(r'<button class="tab-btn[^"]*"[^>]*>(.*?)</button>', s, flags=re.S)
    ]
    panes = re.findall(r'<div class="tab-pane[^"]*">(.*?)(?=<div class="tab-pane|</div>\s*</div>\s*<div class="section)',
                       s, flags=re.S)
    paths = []
    if labels and panes:
        for i, lab in enumerate(labels):
            if i >= len(panes):
                break
            steps = parse_steps(panes[i])
            if steps:
                paths.append({"id": f"p{i+1}", "label": lab, "best_for": "", "steps": steps})
    if not paths:
        steps = parse_steps(s)
        if steps:
            paths.append({"id": "main", "label": "🛣️ المسار الكامل", "best_for": "", "steps": steps})

    # الأسئلة الشائعة → معالجة المشاكل
    trouble = []
    for m in re.finditer(
        r'<button class="faq-q"[^>]*><span>(.*?)</span>.*?<div class="faq-a">(.*?)</div></div>',
        s,
        flags=re.S,
    ):
        q, a = clean(m.group(1)), clean(m.group(2))
        if q and a and len(trouble) < 4:
            trouble.append({"q": q, "a": a})

    return {"title": title, "subtitle": subtitle, "paths": paths, "troubleshooting": trouble}


def main():
    dry = "--dry" in sys.argv
    with open(DOCS, encoding="utf-8") as f:
        docs = {x["slug"]: x for x in json.load(f)["services"]}
    with open(JOURNEYS, encoding="utf-8") as f:
        data = json.load(f)

    have = {x["id"] for x in data["services"]}
    added = []

    for slug in ORDER:
        if slug in have:
            continue
        page = os.path.join(ROOT, slug and "services", slug + ".html")
        if not os.path.exists(page):
            print("✗ مفيش صفحة:", slug)
            continue
        info = parse_page(page)
        if not info["paths"]:
            print("✗ مفيش خطوات في الصفحة:", slug)
            continue
        d = docs.get(slug, {})
        limit = 6
        reqs = [x.get("t", "").strip() for x in d.get("docs", [])][:limit]

        journey = {
            "id": slug,
            "emoji": EMOJI[slug],
            "title": info["title"] or d.get("title", slug),
            "subtitle": info["subtitle"],
            "page": f"services/{slug}.html",
            "authority": d.get("auth") or "الجهة الحكومية المختصة",
            "duration": d.get("dur") or "حسب الجهة",
            "online": True,
            "official_url": "https://digital.gov.eg/",
            "official_label": "بوابة مصر الرقمية",
            "warning": "",
            "requirements": [r for r in reqs if r],
            "paths": info["paths"],
            "fees": [],
            "troubleshooting": info["troubleshooting"],
        }
        data["services"].append(journey)
        added.append(slug)
        n = sum(len(p["steps"]) for p in info["paths"])
        print(f"✓ {slug}: {len(info['paths'])} مسار / {n} خطوة / {len(info['troubleshooting'])} سؤال")

    if not added:
        print("مفيش جديد.")
        return

    data["version"] = "2.1.0"
    data["updated"] = "2026-11-13"
    print(f"\n{len(added)} رحلة جديدة → إجمالي {len(data['services'])}")

    if dry:
        print("(dry run — مفيش كتابة)")
        return
    with open(JOURNEYS, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print("اتكتب في journeys.json")


if __name__ == "__main__":
    main()

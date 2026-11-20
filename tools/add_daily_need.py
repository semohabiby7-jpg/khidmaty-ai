#!/usr/bin/env python3
"""إضافة خبر يومي إلى src/data/daily-needs.js من ملف JSON — آمن ومتكرر (idempotent)."""
import json, sys, os, re

JS = "/home/user/workspace/khidmaty-ai-push/src/data/daily-needs.js"


def js_str(v):
    return json.dumps(v, ensure_ascii=False)


def block(d):
    L = []
    L.append("  {")
    L.append(f"    date: {js_str(d['date'])},")
    if d.get("category"):
        L.append(f"    category: {js_str(d['category'])},")
    L.append(f"    icon: {js_str(d.get('icon', '📋'))},")
    if d.get("badge"):
        L.append(f"    badge: {js_str(d['badge'])},")
    L.append(f"    title: {js_str(d['title'])},")
    if d.get("summary"):
        L.append(f"    summary: {js_str(d['summary'])},")
    for key, label in (("highlights", None), ("fees", None), ("documents", None)):
        if d.get(key):
            L.append(f"    {key}: [")
            for x in d[key]:
                L.append(f"      {js_str(x)},")
            L.append("    ],")
    if d.get("complexPapers"):
        L.append(f"    complexPapers: {js_str(d['complexPapers'])},")
    if d.get("sources"):
        L.append("    sources: [")
        for s in d["sources"]:
            L.append(f"      {{ name: {js_str(s['name'])}, url: {js_str(s['url'])} }},")
        L.append("    ],")
    L.append("  },")
    return "\n".join(L)


def main(path):
    d = json.load(open(path, encoding="utf-8"))
    date = d["date"]
    src = open(JS, encoding="utf-8").read()
    if f'date: "{date}"' in src:
        print("موجود بالفعل:", date)
        return
    # أدخل قبل نهاية المصفوفة (أول "\n];" بعد بداية المصفوفة)
    idx = src.index("\n];")
    src = src[: idx + 1] + block(d) + "\n" + src[idx + 1 :]
    open(JS, "w", encoding="utf-8").write(src)
    print("اتضاف:", date)


if __name__ == "__main__":
    for p in sys.argv[1:]:
        main(p)

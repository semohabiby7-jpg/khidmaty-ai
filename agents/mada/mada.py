#!/usr/bin/env python3
"""مَدى — عين النمو: تقيس، تفسّر، وتقترح قرار واحد.

الاستخدام:
    python3 agents/mada/mada.py

بتقرأ حاجات موجودة فعلًا وقابلة للقياس:
  • عدد المقالات + آخر تحديث
  • صفحات الـ sitemap (وكام صفحة مش في الـ sitemap)
  • الكتب: متجر الموقع + أمازون (من books.json)
  • آخر تقرير لحارس (المشاكل المفتوحة)

وأي حاجة مش متاحة (زي الزيارات) بتتكتب «محتاج ربط GA» — ممنوع تخترع رقم.

بعدين تطلع **قرار واحد** مبني على قاعدة واضحة، مع السبب والمتوقع.

قراءة فقط على المشروع. بتكتب بس في agents/mada/reports/.
"""
from __future__ import annotations

import json
import os
import re
from datetime import datetime, timedelta, timezone

BASE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(BASE, "..", ".."))
REPORTS = os.path.join(BASE, "reports")
HARES_REPORTS = os.path.join(ROOT, "agents", "hares", "reports")
CAIRO = timezone(timedelta(hours=2))
CONTENT_DIRS = ["maqalat", "articles"]
KEY_PAGES = ["index.html", "store.html", "store-en.html", "services.html", "offices.html", "calc.html", "maqalat.html"]
STALE_DAYS = 14


def content_stats() -> dict:
    files: list[tuple[float, str]] = []
    for d in CONTENT_DIRS:
        p = os.path.join(ROOT, d)
        if not os.path.isdir(p):
            continue
        for name in os.listdir(p):
            if name.endswith((".html", ".md")):
                full = os.path.join(p, name)
                files.append((os.path.getmtime(full), f"{d}/{name}"))
    if not files:
        return {"count": 0, "newest_days": None, "newest": None, "last_30": 0}
    files.sort(reverse=True)
    now = datetime.now(CAIRO).timestamp()
    newest_days = int((now - files[0][0]) / 86400)
    last_30 = sum(1 for m, _ in files if now - m <= 30 * 86400)
    return {"count": len(files), "newest_days": newest_days, "newest": files[0][1], "last_30": last_30}


def sitemap_stats() -> dict:
    path = os.path.join(ROOT, "sitemap.xml")
    if not os.path.exists(path):
        return {"urls": None, "note": "sitemap مش موجود"}
    with open(path, encoding="utf-8", errors="ignore") as f:
        body = f.read()
    urls = re.findall(r"<loc>\s*(.*?)\s*</loc>", body, re.S)
    listed = {u.strip().rstrip("/") for u in urls if u.strip().startswith("http")}
    missing = []
    for page in KEY_PAGES:
        cand = f"https://khidmatyai.com/{page}"
        if cand.rstrip("/") not in listed and cand.replace(".html", "/").rstrip("/") not in listed:
            missing.append(page)
    return {"urls": len(urls), "key_pages_missing": missing}


def books_stats() -> dict:
    path = os.path.join(ROOT, "agents", "hares", "books.json")
    out = {"amazon": 0, "need_asin": 0, "labels": []}
    if os.path.exists(path):
        try:
            with open(path, encoding="utf-8") as f:
                cfg = json.load(f)
            for b in cfg.get("books", []):
                out["amazon"] += 1
                if not (b.get("asin") or "").strip():
                    out["need_asin"] += 1
                out["labels"].append(b.get("label", "?"))
        except Exception:  # noqa: BLE001
            out["note"] = "books.json مش مقروء"
    # عدد كتب المتجر من صفحة المتجر
    store = os.path.join(ROOT, "store.html")
    out["store_cards"] = 0
    if os.path.exists(store):
        with open(store, encoding="utf-8", errors="ignore") as f:
            html = f.read()
        out["store_cards"] = len(re.findall(r'class="product-card', html))
    return out


def hares_open_issues() -> tuple[list[str], int | None]:
    """مشاكل حارس — بترجع (المشاكل، عمر التقرير بالأيام). تقرير قديم ما يتحكمش في قرار النهاردة."""
    if not os.path.isdir(HARES_REPORTS):
        return [], None
    files = sorted(f for f in os.listdir(HARES_REPORTS) if f.endswith(".json"))
    if not files:
        return [], None
    try:
        with open(os.path.join(HARES_REPORTS, files[-1]), encoding="utf-8") as f:
            rep = json.load(f)
        age = (datetime.now(CAIRO).date() - datetime.strptime(rep.get("date", files[-1][:10]), "%Y-%m-%d").date()).days
        return rep.get("problems", []), age
    except Exception:  # noqa: BLE001
        return [], None


def decide(content: dict, site: dict, books: dict, issues: list[str], traffic: dict | None = None, week: dict | None = None, pages: list[dict] | None = None) -> dict:
    """قرار واحد — بأولوية واضحة، ومكتوب معاه السبب والموقف."""
    if issues:
        return {
            "rule": "في عطل مفتوح عند حارس",
            "stance": "مش هنشتغل على نمو وفيه باب مكسور.",
            "decision": f"نقفل العطل ده قبل أي حاجة: {issues[0]}",
            "why": "أي زائر بيقع في عطل = محتوى ومسارات مش بتوصل، فالنمو عليه كلام",
            "expect": "تفادي زائر بياخد صفحة خطأ بدل ما يكمّل",
        }

    w = week or {}
    if w.get("ok") and w.get("sessions_change_pct") is not None and w["sessions_change_pct"] <= -25:
        return {
            "rule": f"الأسبوع واقع {w['sessions_change_pct']}% عن اللي قبله",
            "stance": "النمو الشهري بيغطي على وقعة أسبوعية، وأنا مش هسمح بالغطا ده.",
            "decision": "نعرف الأسبوع ده إيه اللي اتغيّر: مصدر وقف ولا صفحة وقعت؟",
            "why": "الوقعة السريعة في أسبوع واحد بتبان متأخرة في المتوسط الشهري",
            "expect": "نوقف النزيف قبل ما يدخل في أرقام الشهر الجاي",
        }

    p = pages or []
    worst = next((r for r in p if r.get("change_pct") is not None and r["change_pct"] <= -40 and r["prev"] >= 20), None)
    if worst:
        return {
            "rule": f"صفحة واقعة: {worst['page']} ({worst['change_pct']}%)",
            "stance": "صفحة كانت بتجيب زوار وبقت لأ — دي مش فرصة، دي عطل خفي.",
            "decision": f"نراجع {worst['page']}: اتغيّر عنوانها؟ اتشالت من اللينكات؟ ولا المحتوى بقى قديم؟",
            "why": f"كانت {worst['prev']:.0f} مشاهدة وبقت {worst['views']:.0f}",
            "expect": "نرجّع المسار اللي كان شغال قبل ما ندور على مسار جديد",
        }

    t = traffic or {}
    if t.get("ok"):
        growth = (t.get("change_pct") or {}).get("users")
        top_src = (t.get("top_sources") or [{}])[0].get("name", "—")
        top_page = (t.get("top_pages") or [{}])[0].get("name", "—")
        engagement = t["current"].get("engagementRate")
        if growth is not None and growth >= 50:
            return {
                "rule": f"الزيارات بتنمو {growth}% في ٢٨ يوم",
                "stance": "الرقم بيتكلم: القناة دي شغالة، والباقي لسه رأي.",
                "decision": f"نضاعف اللي شغّال فعلًا: {top_page} + جايبينها {top_src}",
                "why": "لما النمو جاي من مسار واحد، تقويته أسرع من فتح مسار جديد",
                "expect": "زيادة في نفس المسار اللي أثبت نفسه، مش تجربة جديدة",
            }
        if engagement is not None and engagement < 0.4:
            return {
                "rule": f"نسبة التفاعل {round(engagement * 100)}% فقط",
                "stance": "زوار كتير واهتمام قليل = الوعد في أول الصفحة مش واضح.",
                "decision": "نعيد أول ١٠ ثواني في الصفحة الرئيسية: مين إحنا وبنعمل إيه.",
                "why": "زائر بيخرج بسرعة = الصفحة مش بترد على سؤاله الأول",
                "expect": "وقت أطول على الصفحة = فرصة أكبر لطلب خدمة",
            }
    if books.get("need_asin"):
        return {
            "rule": "كتب بدون ASIN = مراقبة ناقصة",
            "decision": f"ناخد ASIN لـ {books['need_asin']} كتاب ناقص ونسجّلهم في books.json",
            "why": "من غير الرقم مش عارفين السعر/التقييم/الطلب بيتحرك ولا لأ",
            "expect": "أول بيانات حقيقية عن أداء الكتب",
        }
    if content["newest_days"] is None or content["newest_days"] >= STALE_DAYS:
        return {
            "rule": f"المحتوى واقف من {content['newest_days']} يوم",
            "decision": "مقال واحد جديد الأسبوع ده عن خدمة عليها طلب",
            "why": "المحتوى المتوقف بيوقف الوصول من جوجل كمان",
            "expect": "صفحة دخول جديدة + زيارات من بحث",
        }
    if site.get("key_pages_missing"):
        return {
            "rule": "صفحات مهمة مش في الـ sitemap",
            "decision": f"نضيف {site['key_pages_missing'][0]} للـ sitemap",
            "why": "جوجل بيكتشف الصفحات من الـ sitemap، والمش موجودة يعني مفيش ظهور",
            "expect": "ظهور أسرع في نتايج البحث",
        }
    return {
        "rule": "كل المؤشرات في النطاق",
        "decision": "نقيس الزيارات فعلًا (ربط Google Analytics) قبل أي قرار محتوى جديد",
        "why": "كل الأرقام عندنا عن الشغل مش عن الناس — قررنا من غير ما نشوف الجمهور",
        "expect": "أول قراءة حقيقية للسلوك بدل التخمين",
    }


def main() -> int:
    os.makedirs(REPORTS, exist_ok=True)
    now = datetime.now(CAIRO)
    day = now.strftime("%Y-%m-%d")

    content = content_stats()
    site = sitemap_stats()
    books = books_stats()
    issues, issues_age = hares_open_issues()
    issues_fresh = issues if (issues_age is not None and issues_age <= 0) else []
    try:
        from ga import page_trends as ga_pages  # noqa: PLC0415
        from ga import traffic as ga_traffic  # noqa: PLC0415
        from ga import week as ga_week  # noqa: PLC0415

        traffic = ga_traffic()
        week = ga_week()
        pages = ga_pages()
    except Exception as e:  # noqa: BLE001
        traffic = {"ok": False, "state": "محتاج تأكيد", "note": f"وحدة الزيارات مش متاحة ({type(e).__name__})"}
        week = {"ok": False}
        pages = []
    choice = decide(content, site, books, issues_fresh, traffic, week, pages)

    unknowns = []
    if not traffic.get("ok"):
        unknowns.append(f"زيارات الموقع — {traffic.get('note', 'محتاج تأكيد')} (مفيش رقم مخترع)")

    report = {
        "date": day,
        "at": now.strftime("%H:%M"),
        "measured": {
            "articles": content,
            "sitemap": site,
            "books": books,
            "hares_open_issues": len(issues),
            "traffic": traffic,
            "week": week,
            "page_trends": pages,
        },
        "unknown": unknowns,
        "decision": choice,
    }
    with open(os.path.join(REPORTS, f"{day}.json"), "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    lines = [f"# 🌿 مدى — {day}", "", "## أرقام مقيسة"]
    if traffic.get("ok"):
        c = traffic["current"]
        ch = traffic.get("change_pct") or {}
        w = traffic["window"]
        lines.append(
            f"- الزيارات ({w['days']} يوم): {c['totalUsers']:.0f} زائر · {c['sessions']:.0f} جلسة · "
            f"{c['screenPageViews']:.0f} مشاهدة · تفاعل {round((c['engagementRate'] or 0) * 100)}%"
        )
        diffs = [f"زوار {ch['users']}%" if ch.get("users") is not None else "",
                 f"جلسات {ch['sessions']}%" if ch.get("sessions") is not None else ""]
        diffs = [d for d in diffs if d]
        if diffs:
            lines.append(f"- الفرق عن الـ {w['days']} يوم اللي قبلهم: " + " · ".join(diffs))
        if traffic.get("top_pages"):
            tops = " · ".join(f"{p['name']} ({p['value']:.0f})" for p in traffic["top_pages"][:3])
            lines.append(f"- أكتر صفحات: {tops}")
        if traffic.get("top_sources"):
            srcs = " · ".join(f"{s['name']} ({s['value']:.0f})" for s in traffic["top_sources"][:3])
            lines.append(f"- أكتر مصادر: {srcs}")
    else:
        lines.append(f"- الزيارات: {traffic.get('note', 'محتاج تأكيد')}")
    if week.get("ok") and week.get("current"):
        cw = week["current"]
        chg = week.get("sessions_change_pct")
        arrow = f"{chg:+}%" if isinstance(chg, (int, float)) else "محتاج تأكيد"
        lines.append(f"- الأسبوع (٧ أيام): {cw.get('sessions', 0):.0f} جلسة · {cw.get('totalUsers', 0):.0f} زائر · التغيير {arrow}")
    if pages:
        fallen = [r for r in pages if r.get("change_pct") is not None and r["change_pct"] < 0][:3]
        risen = [r for r in pages if r.get("change_pct") is not None and r["change_pct"] > 0][-3:]
        if risen:
            lines.append("- صفحات طالعة: " + " · ".join(f"{r['page']} ({r['change_pct']:+}%)" for r in reversed(risen)))
        if fallen:
            lines.append("- صفحات واقعة: " + " · ".join(f"{r['page']} ({r['change_pct']:+}%)" for r in fallen))
    lines += [
        f"- المحتوى: {content['count']} ملف · آخر واحد من {content['newest_days']} يوم ({content['newest']}) · آخر ٣٠ يوم: {content['last_30']}",
        f"- الـ sitemap: {site.get('urls')} لينك · صفحات مهمة ناقصة: {len(site.get('key_pages_missing', []))}",
        f"- الكتب: {books.get('store_cards', 0)} كاردة في المتجر · {books['amazon']} على أمازون · بدون ASIN: {books['need_asin']}",
        f"- حارس: {len(issues)} مشكلة مفتوحة" + (f" (تقريره من {issues_age} يوم — ما اتحسبش في القرار)" if issues_fresh == [] and issues else ""),
    ]
    if unknowns:
        lines += ["", "## مش مقيس"] + [f"- {u}" for u in unknowns]
    lines += [
        "",
        "## القرار",
        f"> {choice.get('stance', '')}",
        "",
        f"**{choice['decision']}**",
        f"- القاعدة: {choice['rule']}",
        f"- ليه: {choice['why']}",
        f"- المتوقع: {choice['expect']}",
    ]

    with open(os.path.join(REPORTS, f"{day}.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")

    print("\n".join(lines))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
"""مدى — عين على الزيارات (Google Analytics 4).

بتسحب آخر ٢٨ يوم + الـ ٢٨ اللي قبلهم، وتطلّع:
  • المستخدمين · الجلسات · مشاهدات الصفحة · نسبة التفاعل
  • أكتر ٥ صفحات بتتشاف
  • أكتر ٥ مصادر بتجيب زوار
  • الفرق بين الفترتين

قاعدة: لو الـ API مردّش، بنقول «محتاج تأكيد» وبنكتب السبب — ممنوع رقم مخترع.

التشغيل:
    uv run --with google-analytics-data --with google-auth python agents/mada/ga.py
"""
from __future__ import annotations

import json
import os
from datetime import datetime, timedelta, timezone

BASE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(BASE, "..", ".."))
VAULT = "/home/user/workspace/khidmaty-vault"
KEY = os.path.join(VAULT, "ga-service-account.json")
PROPERTY = os.environ.get("GA_PROPERTY_ID", "554298401")  # خدمتى ai
CACHE = os.path.join(BASE, "ga-cache.json")
CAIRO = timezone(timedelta(hours=2))
SCOPE = ["https://www.googleapis.com/auth/analytics.readonly"]


def _client():
    from google.analytics.data_v1beta import BetaAnalyticsDataClient  # noqa: PLC0415
    from google.oauth2 import service_account  # noqa: PLC0415

    creds = service_account.Credentials.from_service_account_file(KEY, scopes=SCOPE)
    return BetaAnalyticsDataClient(credentials=creds)


def _run(client, day_from: str, day_to: str, metrics: list[str], dims: list[str] | None = None, limit: int = 10):
    from google.analytics.data_v1beta.types import (  # noqa: PLC0415
        DateRange,
        Dimension,
        Metric,
        OrderBy,
        RunReportRequest,
    )

    req = RunReportRequest(
        property=f"properties/{PROPERTY}",
        date_ranges=[DateRange(start_date=day_from, end_date=day_to)],
        metrics=[Metric(name=m) for m in metrics],
        dimensions=[Dimension(name=d) for d in (dims or [])],
        limit=limit,
    )
    if dims:
        req.order_bys = [OrderBy(metric=OrderBy.MetricOrderBy(metric_name=metrics[0]), desc=True)]
    return client.run_report(req)


def _totals(client, day_from: str, day_to: str) -> dict:
    metrics = ["totalUsers", "sessions", "screenPageViews", "engagementRate", "averageSessionDuration"]
    resp = _run(client, day_from, day_to, metrics)
    if not resp.rows:
        return {"totalUsers": 0, "sessions": 0, "screenPageViews": 0, "engagementRate": 0, "averageSessionDuration": 0}
    vals = resp.rows[0].metric_values
    out = {}
    for name, v in zip(metrics, vals):
        try:
            out[name] = round(float(v.value), 3)
        except ValueError:
            out[name] = None
    return out


def _top(client, day_from: str, day_to: str, dim: str, metric: str) -> list[dict]:
    resp = _run(client, day_from, day_to, [metric], [dim], limit=5)
    rows = []
    for r in resp.rows:
        key = r.dimension_values[0].value or "(غير معروف)"
        try:
            val = round(float(r.metric_values[0].value), 2)
        except ValueError:
            val = 0
        rows.append({"name": key, "value": val})
    return rows


def traffic(days: int = 28, save_cache: bool = True) -> dict:
    now = datetime.now(CAIRO)
    cur_end = now - timedelta(days=1)
    cur_start = cur_end - timedelta(days=days - 1)
    prev_end = cur_start - timedelta(days=1)
    prev_start = prev_end - timedelta(days=days - 1)
    fmt = lambda d: d.strftime("%Y-%m-%d")  # noqa: E731

    if not os.path.exists(KEY):
        return {"ok": False, "state": "محتاج تأكيد", "note": "مفيش ملف خدمة لجوجل أناليتيكس"}
    try:
        client = _client()
        cur = _totals(client, fmt(cur_start), fmt(cur_end))
        prev = _totals(client, fmt(prev_start), fmt(prev_end))
        pages = _top(client, fmt(cur_start), fmt(cur_end), "pagePath", "screenPageViews")
        sources = _top(client, fmt(cur_start), fmt(cur_end), "sessionSourceMedium", "sessions")
    except Exception as e:  # noqa: BLE001
        return {"ok": False, "state": "محتاج تأكيد", "note": f"قراءة أناليتيكس فشلت ({type(e).__name__})"}

    def delta(a, b):
        if a in (None, 0) or b is None:
            return None
        return round((b - a) / a * 100, 1)

    out = {
        "ok": True,
        "property": PROPERTY,
        "window": {"from": fmt(cur_start), "to": fmt(cur_end), "days": days},
        "current": cur,
        "previous": prev,
        "change_pct": {
            "users": delta(prev.get("totalUsers"), cur.get("totalUsers")),
            "sessions": delta(prev.get("sessions"), cur.get("sessions")),
            "views": delta(prev.get("screenPageViews"), cur.get("screenPageViews")),
        },
        "top_pages": pages,
        "top_sources": sources,
    }
    if save_cache:
        with open(CACHE, "w", encoding="utf-8") as f:
            json.dump(out, f, ensure_ascii=False, indent=2)
    return out


def week(days: int = 7) -> dict:
    """أسبوع مقابل الأسبوع اللي قبله — عشان تشوف التوقف مش بس النمو."""
    now = datetime.now(CAIRO)
    cur_end = now - timedelta(days=1)
    cur_start = cur_end - timedelta(days=days - 1)
    prev_end = cur_start - timedelta(days=1)
    prev_start = prev_end - timedelta(days=days - 1)
    fmt = lambda d: d.strftime("%Y-%m-%d")  # noqa: E731
    try:
        client = _client()
        cur = _totals(client, fmt(cur_start), fmt(cur_end))
        prev = _totals(client, fmt(prev_start), fmt(prev_end))
    except Exception as e:  # noqa: BLE001
        return {"ok": False, "note": f"قراءة الأسبوع فشلت ({type(e).__name__})"}
    change = None
    if prev.get("sessions"):
        change = round((cur.get("sessions", 0) - prev["sessions"]) / prev["sessions"] * 100, 1)
    return {"ok": True, "current": cur, "previous": prev, "sessions_change_pct": change}


def page_trends(days: int = 28, min_views: int = 5) -> list[dict]:
    """كل صفحة: مشاهدات الفترة + مقارنة بأسبوع سابق. بيرجّع اللي وقع واللي طلع."""
    now = datetime.now(CAIRO)
    cur_end = now - timedelta(days=1)
    cur_start = cur_end - timedelta(days=days - 1)
    prev_end = cur_start - timedelta(days=1)
    prev_start = prev_end - timedelta(days=days - 1)
    fmt = lambda d: d.strftime("%Y-%m-%d")  # noqa: E731
    try:
        client = _client()
        cur = _top(client, fmt(cur_start), fmt(cur_end), "pagePath", "screenPageViews")
        prev = _top(client, fmt(prev_start), fmt(prev_end), "pagePath", "screenPageViews")
    except Exception:  # noqa: BLE001
        return []
    prev_map = {p["name"]: p["value"] for p in prev}
    rows = []
    for p in cur:
        old = prev_map.get(p["name"], 0)
        if p["value"] < min_views and old < min_views:
            continue
        change = round((p["value"] - old) / old * 100, 1) if old else None
        rows.append({"page": p["name"], "views": p["value"], "prev": old, "change_pct": change})
    rows.sort(key=lambda r: (r["change_pct"] is None, r["change_pct"] or 0))
    return rows


if __name__ == "__main__":
    print(json.dumps({"traffic": traffic(), "week": week(), "pages": page_trends()}, ensure_ascii=False, indent=2))

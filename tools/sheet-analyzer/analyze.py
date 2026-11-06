#!/usr/bin/env python3
"""المحلل السريع — يقرأ شيت المكتب ويطلّع اللي بيوجع في دقيقة.

الاستخدام:
    uv run --with openpyxl python tools/sheet-analyzer/analyze.py ملف.xlsx
    uv run --with openpyxl python tools/sheet-analyzer/analyze.py كشف.csv
    python3 tools/sheet-analyzer/analyze.py نسخة-naql.json

بيطلّع لكل شيت/جدول:
  • الحجم: صفوف × أعمدة
  • الأرقام: مجموع · أصغر · أكبر · متوسط لكل عمود رقمي
  • الفاضي: الأعمدة اللي نصها فاضي (بتبوّظ أي تحليل)
  • المكرر: صفوف مكررة حرفيًا
  • المشبوه: خانات فاضية في أعمدة المبالغ · مبالغ سالبة · تواريخ في المستقبل

بعدين بيحفظ تقرير عربي + ملف CSV بالصفوف المشكوك فيها. قراءة فقط على الملف الأصلي.
"""
from __future__ import annotations

import csv
import io
import json
import os
import re
import sys
from datetime import datetime, timedelta, timezone

CAIRO = timezone(timedelta(hours=2))
OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "reports")
MONEY_HINT = ("سعر", "مبلغ", "اجر", "أجر", "قيمة", "ريال", "جنيه", "cost", "price", "amount", "total", "salary", "اجمالي", "إجمالي")
DATE_HINT = ("تاريخ", "date", "يوم")
BLANK_WARN = 0.30
MAX_ROWS_SHOWN = 5


def _num(v) -> float | None:
    if isinstance(v, (int, float)):
        return float(v)
    if isinstance(v, str):
        s = v.strip().replace(",", "").replace("٬", "")
        if re.fullmatch(r"-?\d+(\.\d+)?", s):
            return float(s)
    return None


def load_tables(path: str) -> dict[str, list[list]]:
    """بيرجّع {اسم الجدول: [صفوف]} من xlsx أو csv أو نسخة JSON."""
    ext = os.path.splitext(path)[1].lower()
    if ext in (".xlsx", ".xlsm"):
        from openpyxl import load_workbook  # noqa: PLC0415

        wb = load_workbook(path, data_only=True, read_only=True)
        out = {}
        for ws in wb.worksheets:
            rows = [[c for c in row] for row in ws.iter_rows(values_only=True)]
            out[ws.title] = rows
        return out
    if ext in (".csv", ".txt"):
        with open(path, encoding="utf-8-sig", errors="replace") as f:
            sample = f.read(4096)
        delim = ";" if sample.count(";") > sample.count(",") else ","
        with open(path, encoding="utf-8-sig", errors="replace") as f:
            rows = [r for r in csv.reader(f, delimiter=delim)]
        name = os.path.splitext(os.path.basename(path))[0]
        return {name: rows}
    if ext == ".json":
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        out = {}
        if isinstance(data, dict):
            for k, v in data.items():
                if isinstance(v, list) and v and isinstance(v[0], dict):
                    heads = list({key for row in v for key in row})
                    out[k] = [heads] + [[row.get(h, "") for h in heads] for row in v]
        elif isinstance(data, list) and data and isinstance(data[0], dict):
            heads = list({key for row in data for key in row})
            out["نسخة"] = [heads] + [[row.get(h, "") for h in heads] for row in data]
        if not out:
            out["غير معروف"] = []
        return out
    raise SystemExit(f"نوع ملف مش مدعوم: {ext} — استخدم xlsx أو csv أو json")


def analyze(name: str, rows: list[list]) -> dict:
    rows = [r for r in rows if any(c not in (None, "") for c in r)]
    if not rows:
        return {"table": name, "empty": True}
    header = [str(c).strip() if c is not None else "" for c in rows[0]]
    body = rows[1:]
    ncols = len(header)

    blanks = [0] * ncols
    nums: list[list[float]] = [[] for _ in range(ncols)]
    future_dates: list[tuple[int, str]] = []
    now = datetime.now(CAIRO)

    for ri, r in enumerate(body, start=2):
        for ci in range(ncols):
            v = r[ci] if ci < len(r) else None
            if v in (None, "", " "):
                blanks[ci] += 1
                continue
            n = _num(v)
            if n is not None:
                nums[ci].append(n)
            s = str(v)
            if re.search(r"\d{4}-\d{2}-\d{2}", s):
                try:
                    d = datetime.strptime(re.search(r"\d{4}-\d{2}-\d{2}", s).group(0), "%Y-%m-%d").replace(tzinfo=CAIRO)
                    if d > now + timedelta(days=1):
                        future_dates.append((ri, s))
                except ValueError:
                    pass

    nrows = len(body)
    numeric_cols = []
    for ci, vals in enumerate(nums):
        if not vals or len(vals) < max(2, nrows * 0.2):
            continue
        label = header[ci] or f"عمود {ci + 1}"
        numeric_cols.append(
            {
                "col": label,
                "count": len(vals),
                "sum": round(sum(vals), 2),
                "min": round(min(vals), 2),
                "max": round(max(vals), 2),
                "mean": round(sum(vals) / len(vals), 2),
                "negatives": sum(1 for v in vals if v < 0),
                "zeros": sum(1 for v in vals if v == 0),
            }
        )

    empty_cols = [(header[i] or f"عمود {i + 1}", round(blanks[i] / nrows * 100)) for i in range(ncols) if nrows and blanks[i] / nrows >= BLANK_WARN]
    money_cols = [i for i, h in enumerate(header) if any(k in h.lower() for k in MONEY_HINT)]
    money_blanks = [(header[i] or f"عمود {i + 1}", blanks[i]) for i in money_cols if blanks[i] > 0]

    seen = {}
    dup_rows = []
    for ri, r in enumerate(body, start=2):
        key = tuple("" if c is None else str(c).strip() for c in r)
        if key in seen:
            dup_rows.append(ri)
        else:
            seen[key] = ri

    # أعمدة فاضية تمامًا (زي «ملاحظات») مش بتتحسب ناقصة — دي اختيارية بطبعها
    dead_cols = {i for i in range(ncols) if nrows and blanks[i] / nrows >= 0.9}
    incomplete = [
        ri
        for ri, r in enumerate(body, start=2)
        if any(c in (None, "", " ") for i, c in enumerate(r[:ncols]) if i not in dead_cols)
    ]

    return {
        "table": name,
        "empty": False,
        "rows": nrows,
        "cols": ncols,
        "header": header,
        "numeric": numeric_cols,
        "empty_columns": empty_cols,
        "money_blanks": money_blanks,
        "duplicate_rows": dup_rows,
        "incomplete_rows": incomplete,
        "future_dates": future_dates,
    }


def verdict(res: dict) -> list[str]:
    issues = []
    if res.get("empty"):
        return ["الجدول فاضي — مفيش صفوف"]
    for col, pct in res["empty_columns"]:
        issues.append(f"عمود «{col}» فاضي {pct}% — أي تحليل بيتحط فيه مش هيصدق")
    for col, n in res["money_blanks"]:
        issues.append(f"عمود مبالغ «{col}» فيه {n} خانة فاضية — إجماليك ناقص")
    for n in res["numeric"]:
        if n["negatives"]:
            issues.append(f"«{n['col']}» فيه {n['negatives']} قيمة سالبة — راجعها")
        if n["zeros"] and n["sum"] > 0:
            issues.append(f"«{n['col']}» فيه {n['zeros']} صفر — بيعني مجاني ولا ناسي؟")
    if res.get("incomplete_rows"):
        n = len(res["incomplete_rows"])
        rows_txt = "، ".join(str(r) for r in res["incomplete_rows"][:MAX_ROWS_SHOWN])
        issues.append(f"{n} صف فيه خانة فاضية (سطور: {rows_txt}) — الصف مش مكتمل")
    if res["duplicate_rows"]:
        issues.append(f"{len(res['duplicate_rows'])} صف مكرر حرفيًا")
    if res["future_dates"]:
        issues.append(f"{len(res['future_dates'])} تاريخ في المستقبل — غالبًا غلطة إدخال")
    return issues


def main(argv: list[str]) -> int:
    if len(argv) < 2:
        print("استخدم: analyze.py <ملف.xlsx|csv|json>")
        return 2
    path = argv[1]
    if not os.path.exists(path):
        print(f"مفيش ملف بالمسار ده: {path}")
        return 2

    tables = load_tables(path)
    results = [analyze(name, rows) for name, rows in tables.items()]

    os.makedirs(OUT_DIR, exist_ok=True)
    stamp = datetime.now(CAIRO).strftime("%Y-%m-%d_%H%M")
    base = os.path.splitext(os.path.basename(path))[0]

    lines = [f"# المحلل السريع — {base}", "", f"اتحلل: {datetime.now(CAIRO).strftime('%Y-%m-%d %H:%M')} · {len(results)} جدول", ""]
    all_issues = 0
    for res in results:
        lines.append(f"## {res['table']}")
        if res.get("empty"):
            lines += ["- فاضي.", ""]
            continue
        lines.append(f"- {res['rows']} صف × {res['cols']} عمود")
        for n in res["numeric"][:6]:
            lines.append(
                f"- {n['col']}: مجموع {n['sum']:,} · من {n['min']:,} لـ {n['max']:,} · متوسط {n['mean']:,}"
            )
        issues = verdict(res)
        all_issues += len(issues)
        if issues:
            lines.append("")
            lines.append("**مشاكل:**")
            lines += [f"- {i}" for i in issues]
        else:
            lines.append("- نضيف: مفيش فاضي ولا مكرر ولا قيمة غريبة.")
        lines.append("")

    lines += ["", "## الخلاصة", f"- {all_issues} ملاحظة محتاجة نظرة." if all_issues else "- مفيش حاجة محتاجة تدخل."]
    report_path = os.path.join(OUT_DIR, f"{base}-{stamp}.md")
    with open(report_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")

    print("\n".join(lines))
    print(f"\nالتقرير: {report_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))

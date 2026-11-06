#!/usr/bin/env python3
"""حارس — نسخة احتياطية يومية + إثبات إنها سليمة.

بياخد زيب من: كود الموقع + المحتوى (مقالات/كتب) + المساعدين + ملفات الإعداد المهمة.
مستثنى: _backup، .git، node_modules، والملفات المولّدة الكبيرة (pdf/epub/apk) —
النسخة بتاعت الكود والقرارات مش بتاعت الميديا (& دي موجودة في درايف و git).

بعد الزيب بيتأكد إنه سليم (testzip) ويسجّل الحجم والبصمة.
الاحتفاظ: آخر 7 نسخ.
"""
from __future__ import annotations

import hashlib
import json
import os
import time
import zipfile
from datetime import datetime, timedelta, timezone

BASE = os.path.dirname(os.path.abspath(__file__))
PROJECT = os.path.abspath(os.path.join(BASE, "..", ".."))
WORKSPACE = os.path.abspath(os.path.join(PROJECT, ".."))
OUT = os.path.join(BASE, "backups")
INDEX = os.path.join(OUT, "index.json")
KEEP = 7

INCLUDE = [
    ("khidmaty-ai-main", ["agents", "articles", "maqalat", "offices", "data", "books", "scripts", "scan"]),
    ("khidmaty-vault", ["kdp-prep", "محمد", "ماكرون"]),
]
ROOT_FILES = [
    ("khidmaty-ai-main", ["sitemap.xml", "robots.txt", "store.html", "store-en.html", "index.html",
                          "services.html", "offices.html", "calc.html", "PROJECT-TRACKER.md"]),
    ("khidmaty-vault", ["ذاكرتي.md", "حزمة-كتب-KDP.md"]),
]
SKIP_EXT = {".pdf", ".epub", ".apk", ".zip", ".mp4", ".jpg", ".jpeg", ".png", ".webp"}
SKIP_DIRS = {"_backup", ".git", "node_modules", "__pycache__", "backups", ".venv"}
MAX_FILE = 8 * 1024 * 1024
CAIRO = timezone(timedelta(hours=2))


def _add_dir(zf: zipfile.ZipFile, base_root: str, rel: str, stats: dict) -> None:
    path = os.path.join(base_root, rel)
    if not os.path.isdir(path):
        return
    for root, dirs, files in os.walk(path):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS and not d.startswith(".")]
        for name in files:
            full = os.path.join(root, name)
            ext = os.path.splitext(name)[1].lower()
            if ext in SKIP_EXT or name.startswith("."):
                continue
            try:
                if os.path.getsize(full) > MAX_FILE:
                    stats["skipped_big"] += 1
                    continue
            except OSError:
                continue
            arc = os.path.relpath(full, WORKSPACE)
            try:
                zf.write(full, arc)
                stats["files"] += 1
                stats["bytes"] += os.path.getsize(full)
            except OSError:
                stats["failed"] += 1


def run() -> tuple[dict, list[str], list[str]]:
    os.makedirs(OUT, exist_ok=True)
    now = datetime.now(CAIRO)
    stamp = now.strftime("%Y-%m-%d_%H%M")
    target = os.path.join(OUT, f"hares-backup-{stamp}.zip")
    stats = {"files": 0, "bytes": 0, "failed": 0, "skipped_big": 0}
    problems: list[str] = []
    care: list[str] = []

    started = time.time()
    try:
        with zipfile.ZipFile(target, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
            for folder, subs in INCLUDE:
                for s in subs:
                    _add_dir(zf, os.path.join(WORKSPACE, folder), s, stats)
            for folder, files in ROOT_FILES:
                for f in files:
                    full = os.path.join(WORKSPACE, folder, f)
                    if os.path.isfile(full):
                        try:
                            zf.write(full, os.path.relpath(full, WORKSPACE))
                            stats["files"] += 1
                            stats["bytes"] += os.path.getsize(full)
                        except OSError:
                            stats["failed"] += 1
    except Exception as e:  # noqa: BLE001
        problems.append(f"نسخة احتياطية: فشل إنشاء الزيب ({type(e).__name__}: {e})")
        return {"ok": False, "error": str(e)}, problems, care

    # التحقق من السلامة
    ok_zip = True
    try:
        with zipfile.ZipFile(target) as zf:
            bad = zf.testzip()
            if bad:
                ok_zip = False
                problems.append(f"نسخة احتياطية: الملف {bad} تالف داخل الزيب")
            names = zf.namelist()
    except Exception as e:  # noqa: BLE001
        ok_zip = False
        names = []
        problems.append(f"نسخة احتياطية: الزيب مش مقروء ({type(e).__name__})")

    size = os.path.getsize(target) if os.path.exists(target) else 0
    if size < 200 * 1024:
        problems.append(f"نسخة احتياطية: حجمها صغير بشكل مريب ({size // 1024} كيلو)")

    sha = ""
    if os.path.exists(target):
        h = hashlib.sha256()
        with open(target, "rb") as f:
            for chunk in iter(lambda: f.read(1 << 20), b""):
                h.update(chunk)
        sha = h.hexdigest()[:16]

    # تسجيل + تقليم
    index: list[dict] = []
    if os.path.exists(INDEX):
        try:
            with open(INDEX, encoding="utf-8") as f:
                index = json.load(f)
        except Exception:  # noqa: BLE001
            index = []
    index.append({
        "at": now.strftime("%Y-%m-%d %H:%M"),
        "file": os.path.basename(target),
        "files": stats["files"],
        "mb": round(size / 1_048_576, 2),
        "seconds": round(time.time() - started, 1),
        "sha256_16": sha,
        "ok": ok_zip,
    })

    old = sorted([r["file"] for r in index])[:-KEEP]
    for name in old:
        p = os.path.join(OUT, name)
        try:
            if os.path.exists(p):
                os.remove(p)
        except OSError:
            pass
    index = [r for r in index if r["file"] not in old]
    with open(INDEX, "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)

    first = len(index) == 1
    row = {
        "ok": ok_zip,
        "file": os.path.basename(target),
        "files": stats["files"],
        "mb": round(size / 1_048_576, 2),
        "seconds": round(time.time() - started, 1),
        "sha256_16": sha,
        "kept": len(index),
        "entries_sample": names[:3],
    }
    if first:
        care.append("نسخة احتياطية: أول نسخة اتعملت — تاني نسخة بكرة هي اللي تثبت إن الجدول شغال")
    if stats["failed"]:
        care.append(f"نسخة احتياطية: {stats['failed']} ملف مش قادر يتقرأ وقت النسخ")
    return row, problems, care


if __name__ == "__main__":
    res, probs, cares = run()
    print(json.dumps({"backup": res, "problems": probs, "care": cares}, ensure_ascii=False, indent=2))

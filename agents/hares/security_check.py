#!/usr/bin/env python3
"""حارس — الأمان والتسريب.

بيفحص حاجات محددة وقابلة للقياس:
  • هيدرز الحماية على الموقع الحي (HSTS، CSP، nosniff، Referrer، Frame)
  • إصدار TLS
  • ملفات حساسة متاحة للعامة بالغلط (توكنز، .env، .git)
  • ملفات أسرار مكشوفة جوّه مجلد الموقع اللي بيتنشر

قراءة فقط.
"""
from __future__ import annotations

import json
import os
import re
import socket
import ssl
import urllib.error
import urllib.request

SITE = "https://khidmatyai.com"
HOST = "khidmatyai.com"
UA = "hares/3.0 (+khidmatyai.com)"
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))

# مسارات لازم تكون مقفولة. أي واحد فيهم بيرد 200 = ثغرة.
SENSITIVE_PATHS = [
    "/.env",
    "/.git/config",
    "/oauth-tokens.json",
    "/oauth-credentials.json",
    "/mcp-tokens.json",
    "/telegram.token",
    "/gemini.token",
    "/supabase.secret",
    "/zoho.secret",
    "/khidmaty-drive-key.json",
    "/ga-service-account.json",
    "/scanmacaron.keystore",
    "/ذاكرتي.md",
]

HEADER_RULES = {
    "strict-transport-security": "HSTS",
    "content-security-policy": "CSP",
    "x-content-type-options": "nosniff",
    "referrer-policy": "Referrer-Policy",
}


def headers_of(url: str) -> tuple[int | None, dict]:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=20, context=ssl.create_default_context()) as r:
            return r.status, {k.lower(): v for k, v in r.headers.items()}
    except urllib.error.HTTPError as e:
        return e.code, {k.lower(): v for k, v in (e.headers or {}).items()}
    except Exception:  # noqa: BLE001
        return None, {}


def tls_version() -> str | None:
    try:
        ctx = ssl.create_default_context()
        with socket.create_connection((HOST, 443), timeout=12) as sock:
            with ctx.wrap_socket(sock, server_hostname=HOST) as ssock:
                return ssock.version()
    except Exception:  # noqa: BLE001
        return None


def exposed_files() -> list[str]:
    hits = []
    for p in SENSITIVE_PATHS:
        code, _ = headers_of(SITE + p)
        if code == 200:
            hits.append(p)
    return hits


def repo_secrets() -> list[str]:
    """ملفات أسرار جوّه مجلد الموقع نفسه — لو اتنشرت بتبقى مشكلة."""
    found = []
    if not os.path.isdir(ROOT):
        return found
    for name in os.listdir(ROOT):
        low = name.lower()
        if low.endswith((".token", ".secret", ".keystore")) or "service-account" in low or "tokens.json" in low:
            found.append(name)
    return sorted(found)


def check() -> tuple[dict, list[str], list[str]]:
    problems: list[str] = []
    care: list[str] = []

    status, hdrs = headers_of(SITE + "/")
    missing = [label for key, label in HEADER_RULES.items() if key not in hdrs]
    csp = hdrs.get("content-security-policy")
    row = {
        "status": status,
        "tls": tls_version(),
        "headers_present": sorted(k for k in HEADER_RULES if k in hdrs),
        "headers_missing": missing,
        "server": hdrs.get("server"),
    }
    if status != 200:
        problems.append(f"أمان: الصفحة الرئيسية رد {status or 'فشل'} وانت بتقيس الهيدرز")

    if "strict-transport-security" not in hdrs:
        care.append("أمان: مفيش HSTS — المتصفح مش مجبور يستخدم https")
    if "content-security-policy" not in hdrs:
        care.append("أمان: مفيش CSP — أي سكربت غريب ممكن يشتغل في صفحتك")
    if "x-content-type-options" not in hdrs:
        care.append("أمان: مفيش nosniff")
    if "referrer-policy" not in hdrs:
        care.append("أمان: مفيش Referrer-Policy")
    if csp and "unsafe-inline" in csp:
        care.append("أمان: CSP فيها unsafe-inline — فايدتها ضعيفة")

    if row["tls"] and row["tls"] not in ("TLSv1.2", "TLSv1.3"):
        problems.append(f"أمان: إصدار TLS قديم ({row['tls']})")

    row["exposed"] = exposed_files()
    for p in row["exposed"]:
        problems.append(f"🔴 أمان: الملف {p} متاح على النت لأي حد")

    # ملفات أسرار في المشروع — للمعلومة مش إنذار، لأنها محلية
    row["local_secret_files"] = repo_secrets()
    if row["local_secret_files"]:
        care.append(f"أمان: {len(row['local_secret_files'])} ملف أسرار في مجلد المشروع — يتأكد إنه مش بيتنشر")

    return row, problems, care


if __name__ == "__main__":
    res, probs, cares = check()
    print(json.dumps(res, ensure_ascii=False, indent=2))
    print("مشاكل:", probs or "مفيش")
    print("تنبيهات:", cares or "مفيش")

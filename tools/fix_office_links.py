# -*- coding: utf-8 -*-
"""إصلاح اللينكات النسبية في صفحات المكاتب (offices/**) — كل اللينكات الجذرية كانت مكتوبة
بافتراض عمق واحد، فبقت مكسورة في الصفحات اللي على عمق ٢ أو ٣."""
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ATTR = re.compile(r'(href|src)="([^"]+)"')


def local_target(page_dir, url):
    u = url.split("#")[0].split("?")[0]
    if not u:
        return None
    if u.startswith("/"):
        return os.path.normpath(os.path.join(ROOT, u.lstrip("/")))
    return os.path.normpath(os.path.join(page_dir, u))


def fix_url(page_dir, url):
    if url.startswith(("http://", "https://", "//", "mailto:", "tel:", "javascript:", "data:", "#", "{")):
        return url, False
    path = url.split("#")[0].split("?")[0]
    if not path or path.startswith("/"):
        return url, False
    if os.path.exists(local_target(page_dir, url)):
        return url, False
    suffix = url[len(path):]
    for depth in range(1, 5):
        cand = "../" * depth + path
        if os.path.exists(local_target(page_dir, cand)):
            return cand + suffix, True
    return url, False


def main():
    changed_files = 0
    changed_links = 0
    unresolved = []
    for dp, dn, fn in os.walk(os.path.join(ROOT, "offices")):
        for f in fn:
            if not f.endswith(".html"):
                continue
            p = os.path.join(dp, f)
            s = open(p, encoding="utf-8", errors="ignore").read()
            n = [0]

            def rep(m):
                new, ch = fix_url(dp, m.group(2))
                if ch:
                    n[0] += 1
                else:
                    if not m.group(2).startswith(("http", "//", "mailto", "tel", "javascript", "data", "#", "{", "/")):
                        tgt = local_target(dp, m.group(2))
                        if tgt and not os.path.exists(tgt):
                            unresolved.append((os.path.relpath(p, ROOT), m.group(2)))
                return '%s="%s"' % (m.group(1), new)

            new = ATTR.sub(rep, s)
            if n[0]:
                open(p, "w", encoding="utf-8").write(new)
                changed_files += 1
                changed_links += n[0]
    print("files changed:", changed_files, "links fixed:", changed_links)
    print("unresolved:", len(unresolved))
    for x in unresolved[:15]:
        print("  ", x)


if __name__ == "__main__":
    main()

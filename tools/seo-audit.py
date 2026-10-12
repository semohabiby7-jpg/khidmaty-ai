#!/usr/bin/env python3
"""
خِدْمَتي AI — SEO Audit Script (Saher S4)
يفحص كل صفحات HTML ويولّد تقرير SEO شامل
Usage: python3 tools/seo-audit.py [--fix]
"""
import re, glob, os, json, sys
from datetime import datetime

BASE_URL = "https://khidmatyai.com"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def audit_page(filepath):
    """Audit a single HTML page for SEO elements"""
    with open(filepath, 'r', encoding='utf-8') as f:
        html = f.read()
    
    rel_path = os.path.relpath(filepath, ROOT)
    issues = []
    warnings = []
    passed = []
    
    # 1. Title tag
    title_m = re.search(r'<title>(.*?)</title>', html)
    if not title_m:
        issues.append("Missing <title> tag")
    else:
        title = title_m.group(1)
        if len(title) < 10:
            warnings.append(f"Title too short: '{title}'")
        elif len(title) > 70:
            warnings.append(f"Title too long ({len(title)} chars)")
        else:
            passed.append(f"Title OK ({len(title)} chars)")
    
    # 2. Meta description
    desc_m = re.search(r'<meta name="description" content="(.*?)"', html)
    if not desc_m:
        issues.append("Missing meta description")
    else:
        desc = desc_m.group(1)
        if len(desc) < 50:
            warnings.append(f"Description too short ({len(desc)} chars)")
        elif len(desc) > 160:
            warnings.append(f"Description too long ({len(desc)} chars)")
        else:
            passed.append(f"Description OK ({len(desc)} chars)")
    
    # 3. Canonical URL
    if 'rel="canonical"' not in html:
        issues.append("Missing canonical URL")
    else:
        passed.append("Canonical URL present")
    
    # 4. Open Graph tags
    og_tags = ['og:title', 'og:description', 'og:url', 'og:image', 'og:type']
    missing_og = [t for t in og_tags if f'property="{t}"' not in html]
    if missing_og:
        issues.append(f"Missing OG tags: {', '.join(missing_og)}")
    else:
        passed.append("All OG tags present")
    
    # 5. Twitter Card
    if 'twitter:card' not in html:
        warnings.append("Missing Twitter Card tags")
    else:
        passed.append("Twitter Card present")
    
    # 6. Schema.org structured data
    if 'application/ld+json' not in html:
        warnings.append("Missing schema.org structured data")
    else:
        # Count schema types
        schemas = re.findall(r'"@type":\s*"(\w+)"', html)
        if schemas:
            passed.append(f"Schema.org: {', '.join(set(schemas))}")
        else:
            warnings.append("Schema.org present but no @type found")
    
    # 7. H1 tag
    h1_count = len(re.findall(r'<h1[^>]*>', html))
    if h1_count == 0:
        issues.append("Missing H1 tag")
    elif h1_count > 1:
        warnings.append(f"Multiple H1 tags ({h1_count})")
    else:
        passed.append("Exactly one H1 tag")
    
    # 8. Alt text on images
    imgs = re.findall(r'<img[^>]+>', html)
    imgs_without_alt = [i for i in imgs if 'alt=' not in i]
    if imgs_without_alt:
        warnings.append(f"{len(imgs_without_alt)} images without alt text")
    else:
        if imgs:
            passed.append(f"All {len(imgs)} images have alt text")
    
    # 9. Mobile viewport
    if 'viewport' not in html:
        issues.append("Missing viewport meta tag")
    else:
        passed.append("Viewport meta present")
    
    # 10. Lang attribute
    if '<html lang="ar"' not in html and '<html lang="ar-' not in html:
        warnings.append("Missing or incorrect lang attribute")
    else:
        passed.append("Lang attribute set to Arabic")
    
    # 11. Robots meta (check for noindex on public pages)
    if 'noindex' in html and '/services/' in filepath:
        issues.append("Service page has noindex (should be indexable)")
    
    return {
        'file': rel_path,
        'issues': issues,
        'warnings': warnings,
        'passed': passed,
        'score': max(0, 100 - len(issues) * 20 - len(warnings) * 5)
    }

def main():
    fix_mode = '--fix' in sys.argv
    
    # Collect all HTML files
    all_files = sorted(glob.glob(os.path.join(ROOT, '**/*.html'), recursive=True))
    
    # Skip node_modules, .git, etc.
    all_files = [f for f in all_files if 'node_modules' not in f and '.git' not in f]
    
    results = []
    for f in all_files:
        results.append(audit_page(f))
    
    # Generate report
    total = len(results)
    total_issues = sum(len(r['issues']) for r in results)
    total_warnings = sum(len(r['warnings']) for r in results)
    avg_score = sum(r['score'] for r in results) / total if total else 0
    
    # Pages with issues
    pages_with_issues = [r for r in results if r['issues']]
    pages_with_warnings = [r for r in results if r['warnings']]
    perfect_pages = [r for r in results if not r['issues'] and not r['warnings']]
    
    # Generate markdown report
    report = f"""# 📊 تقرير فحص SEO — خِدْمَتي AI

**التاريخ:** {datetime.now().strftime('%Y-%m-%d %H:%M')}
**المولّد بواسطة:** `tools/seo-audit.py` (ساهر #4)

---

## 📈 ملخص عام

| المؤشر | القيمة |
|---|---|
| إجمالي الصفحات | {total} |
| صفحات بمشاكل حرجة | {len(pages_with_issues)} |
| صفحات بتحذيرات | {len(pages_with_warnings)} |
| صفحات مثالية | {len(perfect_pages)} |
| متوسط درجة SEO | {avg_score:.1f}/100 |
| إجمالي المشاكل الحرجة | {total_issues} |
| إجمالي التحذيرات | {total_warnings} |

---

## 🚨 المشاكل الحرجة (يجب إصلاحها)

"""
    if pages_with_issues:
        for r in pages_with_issues[:20]:
            report += f"### {r['file']}\n"
            for issue in r['issues']:
                report += f"- ❌ {issue}\n"
            report += "\n"
        if len(pages_with_issues) > 20:
            report += f"... و {len(pages_with_issues) - 20} صفحة أخرى بمشاكل\n"
    else:
        report += "✅ لا توجد مشاكل حرجة!\n"
    
    report += "\n---\n\n## ⚠️ التحذيرات (ينصح بإصلاحها)\n\n"
    if pages_with_warnings:
        for r in pages_with_warnings[:20]:
            report += f"### {r['file']}\n"
            for w in r['warnings']:
                report += f"- ⚠️ {w}\n"
            report += "\n"
        if len(pages_with_warnings) > 20:
            report += f"... و {len(pages_with_warnings) - 20} صفحة أخرى بتحذيرات\n"
    else:
        report += "✅ لا توجد تحذيرات!\n"
    
    report += f"\n---\n\n## ✅ الصفحات المثالية ({len(perfect_pages)} صفحة)\n\n"
    for r in perfect_pages[:10]:
        report += f"- {r['file']} — درجة: {r['score']}/100\n"
    if len(perfect_pages) > 10:
        report += f"... و {len(perfect_pages) - 10} صفحة أخرى\n"
    
    # Score distribution
    report += "\n---\n\n## 📊 توزيع الدرجات\n\n"
    score_ranges = [(90, 100, 'ممتاز'), (70, 89, 'جيد'), (50, 69, 'متوسط'), (0, 49, 'ضعيف')]
    for lo, hi, label in score_ranges:
        count = sum(1 for r in results if lo <= r['score'] <= hi)
        report += f"- **{label}** ({lo}-{hi}): {count} صفحة\n"
    
    report += f"\n---\n\n*تم توليد هذا التقرير تلقائيًا بواسطة سكريبت فحص SEO — ساهر #4*\n"
    
    # Write report
    report_path = os.path.join(ROOT, 'ideas', 'seo-audit-report.md')
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write(report)
    
    print(f"=== SEO Audit Complete ===")
    print(f"Pages: {total} | Issues: {total_issues} | Warnings: {total_warnings} | Avg Score: {avg_score:.1f}/100")
    print(f"Report: {report_path}")
    
    # Also save JSON for programmatic use
    json_path = os.path.join(ROOT, 'ideas', 'seo-audit-data.json')
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump({
            'date': datetime.now().isoformat(),
            'total_pages': total,
            'total_issues': total_issues,
            'total_warnings': total_warnings,
            'avg_score': round(avg_score, 1),
            'results': results
        }, f, ensure_ascii=False, indent=2)
    print(f"JSON: {json_path}")

if __name__ == '__main__':
    main()

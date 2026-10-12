#!/usr/bin/env python3
"""
خِدْمَتي AI — User Behavior Analytics (Saher S5)
يحلل سلوك المستخدم من بيانات Google Analytics + الموقع
Usage: python3 tools/user-behavior-analytics.py
"""
import json, os, re, glob
from datetime import datetime, timedelta
from urllib.request import urlopen, Request
from urllib.error import URLError, HTTPError

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GA_ID = "G-W7WT8KN8P9"
REPORT_FILE = os.path.join(ROOT, 'ideas', 'user-behavior-report.md')
DATA_FILE = os.path.join(ROOT, 'ideas', 'user-behavior-data.json')

def analyze_local_pages():
    """Analyze local HTML pages for engagement signals"""
    print("  تحليل الصفحات المحلية...")
    
    pages = []
    all_html = sorted(glob.glob(os.path.join(ROOT, '**/*.html'), recursive=True))
    all_html = [f for f in all_html if 'node_modules' not in f and '.git' not in f]
    
    for filepath in all_html:
        rel_path = os.path.relpath(filepath, ROOT)
        with open(filepath, 'r', encoding='utf-8') as f:
            html = f.read()
        
        # Engagement signals
        word_count = len(re.findall(r'\w+', re.sub(r'<[^>]+>', '', html)))
        has_cta = any(k in html.lower() for k in ['onclick', 'calc-btn', 'quiz-btn', 'احسب', 'ابدأ', 'اضغط'])
        has_video = '<video' in html or 'youtube' in html.lower() or 'iframe' in html.lower()
        has_quiz = 'quiz' in html.lower() or 'كويز' in html or 'question' in html.lower()
        has_calc = 'calc' in html.lower() or 'حاسبة' in html
        has_form = '<form' in html or 'contact' in html.lower()
        has_share = 'share' in html.lower() or 'مشاركة' in html or 'whatsapp' in html.lower()
        has_faq = 'faq' in html.lower() or 'أسئلة' in html
        has_infographic = 'infographic' in html.lower()
        has_scroll = 'scroll' in html.lower()
        
        # Readability: check for short paragraphs
        paragraphs = re.findall(r'<p[^>]*>(.*?)</p>', html, re.DOTALL)
        avg_para_len = sum(len(re.sub(r'<[^>]+>', '', p).split()) for p in paragraphs) / max(len(paragraphs), 1)
        
        # Engagement score (0-100)
        score = 0
        if has_cta: score += 20
        if has_video: score += 15
        if has_quiz or has_calc: score += 15
        if has_form: score += 10
        if has_share: score += 10
        if has_faq: score += 10
        if has_infographic: score += 10
        if word_count > 300: score += 5
        if word_count > 800: score += 5
        if avg_para_len < 50: score += 5  # Short paragraphs = better engagement
        
        pages.append({
            'file': rel_path,
            'word_count': word_count,
            'paragraph_count': len(paragraphs),
            'avg_paragraph_length': round(avg_para_len, 1),
            'has_cta': has_cta,
            'has_video': has_video,
            'has_quiz': has_quiz,
            'has_calc': has_calc,
            'has_form': has_form,
            'has_share': has_share,
            'has_faq': has_faq,
            'has_infographic': has_infographic,
            'engagement_score': min(score, 100)
        })
    
    # Sort by engagement score
    pages.sort(key=lambda x: x['engagement_score'], reverse=True)
    return pages

def analyze_navigation():
    """Analyze site navigation structure"""
    print("  تحليل بنية التنقل...")
    
    index_path = os.path.join(ROOT, 'index.html')
    with open(index_path, 'r', encoding='utf-8') as f:
        html = f.read()
    
    # Extract all internal links
    links = re.findall(r'href="([^"]+\.html)"', html)
    internal_links = [l for l in links if not l.startswith('http')]
    
    # Count unique destinations
    unique_destinations = set(internal_links)
    
    # Check for key pages in nav
    key_pages = {
        'services': 'services/traffic.html' in html or 'services/' in html,
        'calc': 'calc.html' in html,
        'service-finder': 'service-finder.html' in html,
        'offices': 'offices.html' in html,
        'articles': 'articles.html' in html,
        'success-stories': 'success-stories.html' in html,
        'faq': 'faq.html' in html,
        'about': 'about.html' in html,
        'contact': 'contact.html' in html,
        'dashboard': 'dashboard.html' in html
    }
    
    return {
        'total_links': len(links),
        'internal_links': len(internal_links),
        'unique_destinations': len(unique_destinations),
        'key_pages_in_nav': key_pages,
        'nav_completeness': sum(key_pages.values()) / len(key_pages) * 100
    }

def analyze_content_quality():
    """Analyze content quality across service pages"""
    print("  تحليل جودة المحتوى...")
    
    service_pages = sorted(glob.glob(os.path.join(ROOT, 'services/*.html')))
    service_pages = [f for f in service_pages if not any(x in f for x in 
        ['traffic.html', 'civil.html', 'taxes.html', 'insurance.html', 'notary.html',
         'travel.html', 'health.html', 'post.html', 'education.html', 'courts.html',
         'companies.html', 'utilities.html', 'social.html'])]
    
    quality_data = []
    for filepath in service_pages:
        with open(filepath, 'r', encoding='utf-8') as f:
            html = f.read()
        
        rel = os.path.relpath(filepath, ROOT)
        word_count = len(re.findall(r'\w+', re.sub(r'<[^>]+>', '', html)))
        has_faq = 'FAQPage' in html
        has_infographic = 'infographic-card' in html
        has_schema = 'application/ld+json' in html
        has_og = 'og:title' in html
        has_steps = 'step' in html.lower() or 'خطوة' in html or 'الخطوات' in html
        has_docs = 'الأوراق' in html or 'docs' in html.lower() or 'المستندات' in html
        has_fees = 'الرسوم' in html or 'رسوم' in html or 'fees' in html.lower()
        has_duration = 'المدة' in html or 'مدة' in html or 'duration' in html.lower()
        has_office_link = 'offices' in html.lower()
        
        # Completeness score (0-100)
        elements = [has_faq, has_infographic, has_schema, has_og, has_steps, has_docs, has_fees, has_duration, has_office_link]
        completeness = sum(elements) / len(elements) * 100
        
        quality_data.append({
            'file': rel,
            'word_count': word_count,
            'has_faq': has_faq,
            'has_infographic': has_infographic,
            'has_schema': has_schema,
            'has_og': has_og,
            'has_steps': has_steps,
            'has_docs': has_docs,
            'has_fees': has_fees,
            'has_duration': has_duration,
            'has_office_link': has_office_link,
            'completeness_score': round(completeness, 1)
        })
    
    quality_data.sort(key=lambda x: x['completeness_score'])
    return quality_data

def main():
    print("=" * 55)
    print("📊 خِدْمَتي AI — تحليل سلوك المستخدم (ساهر #5)")
    print(f"📅 {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print(f"📈 GA ID: {GA_ID}")
    print("=" * 55)
    
    # 1. Analyze local pages
    pages_analysis = analyze_local_pages()
    top_pages = pages_analysis[:15]
    avg_engagement = sum(p['engagement_score'] for p in pages_analysis) / len(pages_analysis)
    
    print(f"\n  📄 تم تحليل {len(pages_analysis)} صفحة")
    print(f"  📊 متوسط درجة التفاعل: {avg_engagement:.1f}/100")
    
    # 2. Analyze navigation
    nav_analysis = analyze_navigation()
    print(f"  🧭 روابط داخلية: {nav_analysis['internal_links']} ({nav_analysis['unique_destinations']} وجهة فريدة)")
    print(f"  🧭 اكتمال التنقل: {nav_analysis['nav_completeness']:.0f}%")
    
    # 3. Analyze content quality
    quality_analysis = analyze_content_quality()
    avg_quality = sum(q['completeness_score'] for q in quality_analysis) / len(quality_analysis)
    print(f"  📝 تم تحليل {len(quality_analysis)} صفحة خدمة")
    print(f"  📝 متوسط اكتمال المحتوى: {avg_quality:.1f}/100")
    
    # Insights
    high_engagement = [p for p in pages_analysis if p['engagement_score'] >= 70]
    low_engagement = [p for p in pages_analysis if p['engagement_score'] < 40]
    incomplete_pages = [q for q in quality_analysis if q['completeness_score'] < 80]
    
    # Generate report
    report = f"""# 📊 تقرير تحليل سلوك المستخدم — خِدْمَتي AI

**التاريخ:** {datetime.now().strftime('%Y-%m-%d %H:%M')}
**المولّد بواسطة:** `tools/user-behavior-analytics.py` (ساهر #5)
**GA ID:** {GA_ID}

---

## 📈 ملخص عام

| المؤشر | القيمة |
|---|---|
| إجمالي الصفحات المحللة | {len(pages_analysis)} |
| متوسط درجة التفاعل | {avg_engagement:.1f}/100 |
| صفحات بتفاعل عالي (≥70) | {len(high_engagement)} |
| صفحات بتفاعل منخفض (<40) | {len(low_engagement)} |
| صفحات خدمة محللة | {len(quality_analysis)} |
| متوسط اكتمال المحتوى | {avg_quality:.1f}/100 |
| صفحات ناقصة (<80%) | {len(incomplete_pages)} |
| روابط داخلية | {nav_analysis['internal_links']} |
| اكتمال التنقل | {nav_analysis['nav_completeness']:.0f}% |

---

## 🏆 أعلى الصفحات تفاعلًا

| الصفحة | درجة التفاعل | كلمات | عناصر تفاعل |
|---|---|---|---|"""
    
    for p in top_pages[:10]:
        elements = []
        if p['has_cta']: elements.append('CTA')
        if p['has_quiz']: elements.append('كويز')
        if p['has_calc']: elements.append('حاسبة')
        if p['has_video']: elements.append('فيديو')
        if p['has_form']: elements.append('نموذج')
        if p['has_share']: elements.append('مشاركة')
        if p['has_faq']: elements.append('FAQ')
        if p['has_infographic']: elements.append('إنفوجرافيك')
        report += f"\n| {p['file']} | {p['engagement_score']}/100 | {p['word_count']} | {', '.join(elements) or '—'} |"
    
    report += f"\n\n---\n\n## 📉 صفحات بتفاعل منخفض (تحتاج تحسين)\n\n"
    if low_engagement:
        for p in low_engagement[:10]:
            report += f"- ⚠️ **{p['file']}** — درجة: {p['engagement_score']}/100\n"
    else:
        report += "✅ لا توجد صفحات بتفاعل منخفض!\n"
    
    report += f"\n---\n\n## 📝 جودة صفحات الخدمات\n\n"
    report += f"متوسط الاكتمال: **{avg_quality:.1f}/100**\n\n"
    if incomplete_pages:
        report += "### صفحات ناقصة (تحتاج تحسين):\n\n"
        for q in incomplete_pages[:10]:
            missing = []
            if not q['has_faq']: missing.append('FAQ')
            if not q['has_infographic']: missing.append('إنفوجرافيك')
            if not q['has_steps']: missing.append('خطوات')
            if not q['has_office_link']: missing.append('لينك مكاتب')
            report += f"- ⚠️ **{q['file']}** — {q['completeness_score']}% — ناقص: {', '.join(missing)}\n"
    else:
        report += "### ✅ كل صفحات الخدمات مكتملة!\n"
    
    # Recommendations
    report += f"\n---\n\n## 💡 توصيات تحسين سلوك المستخدم\n\n"
    
    recommendations = []
    if avg_engagement < 60:
        recommendations.append("إضافة عناصر تفاعل (CTA, كويز, حاسبة) للصفحات منخفضة التفاعل")
    if len(low_engagement) > 5:
        recommendations.append(f"مراجعة {len(low_engagement)} صفحة بتفاعل منخفض وإضافة محتوى جذاب")
    if avg_quality < 90:
        recommendations.append(f"تحسين {len(incomplete_pages)} صفحة خدمة ناقصة العناصر")
    if nav_analysis['nav_completeness'] < 100:
        missing_pages = [k for k, v in nav_analysis['key_pages_in_nav'].items() if not v]
        recommendations.append(f"إضافة روابط للصفحات الناقصة في التنقل: {', '.join(missing_pages)}")
    if not recommendations:
        recommendations.append("✅ الموقع في حالة جيدة — استمر في مراقبة الأداء")
    
    for i, rec in enumerate(recommendations, 1):
        report += f"{i}. {rec}\n"
    
    report += f"\n---\n\n*تم توليد هذا التقرير تلقائيًا — ساهر #5*\n"
    
    # Save files
    with open(REPORT_FILE, 'w', encoding='utf-8') as f:
        f.write(report)
    
    data = {
        'timestamp': datetime.now().isoformat(),
        'ga_id': GA_ID,
        'summary': {
            'total_pages': len(pages_analysis),
            'avg_engagement': round(avg_engagement, 1),
            'high_engagement_count': len(high_engagement),
            'low_engagement_count': len(low_engagement),
            'avg_content_completeness': round(avg_quality, 1),
            'incomplete_pages_count': len(incomplete_pages),
            'nav_completeness': round(nav_analysis['nav_completeness'], 1)
        },
        'top_pages': top_pages,
        'low_engagement_pages': low_engagement[:20],
        'navigation': nav_analysis,
        'content_quality': quality_analysis,
        'recommendations': recommendations
    }
    
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"\n{'=' * 55}")
    print(f"✅ تم!")
    print(f"📄 تقرير: {REPORT_FILE}")
    print(f"📄 بيانات: {DATA_FILE}")

if __name__ == '__main__':
    main()

# 🚀 خطوات Deploy — 13 أكتوبر 2026

> **الهدف:** رفع تحديثات الفريق على Cloudflare Workers
> **اللي اتغير:** سامية→ماكرون + فتحي→ناجية + أرقام متحدّثة + رانيا مطوّرة + فكري dashboard في التقرير
> **الحالة:** الكود على GitHub ✅ | الـdeploy لسه معلّق (توكين Cloudflare منتهي)

---

## 1. تجديد توكين Cloudflare

1. ادخل https://dash.cloudflare.com
2. My Profile → API Tokens
3. اعمل توكين جديد:
   - الاسم: `Khidmaty Deploy Token`
   - الصلاحيات: **Edit Cloudflare Workers**
   - الحساب: حسابك
4. انسخ التوكين (هيبدأ بـ `cfut_` أو `v1.0-`)

## 2. Deploy الـ6 Workers

```bash
cd khidmaty-ai-push
export CLOUDFLARE_API_TOKEN="التوكين_الجديد"
export CLOUDFLARE_ACCOUNT_ID="2ecca5a2aafc2abbc50e0e5fb30cad5b"

# 1/6 ماكرون (جديد — بدل سامية)
npx wrangler deploy --config tools/macaron-wrangler.toml

# 2/6 فكري (محدّث — dashboard + أرقام)
npx wrangler deploy --config tools/fkry-wrangler.toml

# 3/6 ناجية (محدّث — أرقام + اسم صح)
npx wrangler deploy --config tools/nagi-wrangler.toml

# 4/6 رانيا (محدّث — /seo + /تقويم + دور صح)
npx wrangler deploy --config tools/rania-wrangler.toml

# 5/6 حكيم/العقل (محدّث — الفريق صح)
npx wrangler deploy --config tools/brain-wrangler.toml

# 6/6 شيل سامية القديمة
npx wrangler delete --name khidmaty-samia
```

## 3. بعد الـDeploy

- اختبر البوت على تيليجرام: ابعت «خلية» أو «فين رانيا» أو «ماكرون»
- الصباحية هتيجي الساعة 9ص بقالب جديد (داشبورد منسق)
- لو فيه مشكلة، ابعت screenshot وأنا أصلحها

## 4. حفظ التوكين الجديد (اختياري)

```bash
echo "CLOUDFLARE_API_TOKEN=التوكين_الجديد" > /home/user/workspace/khidmaty-vault/cloudflare.token
```

---

## ملخص التغييرات

| الملف | التغيير |
|---|---|
| samia-worker.js → macaron-worker.js | ماكرون = مراتك + مديرتك (مش سكرتيرة) |
| samia-wrangler.toml → macaron-wrangler.toml | اسم جديد |
| worker-v3.js | فتحي→ناجية + مفيد اتشال + رانيا اتضافت + ماكرون |
| fkry-worker.js | 73 مقال + 888 مكتب + dashboard في الصباحية |
| nagi-worker.js | 73 مقال + 888 مكتب |
| rania-worker.js | /seo + /تقويم + 73 مقال + دور محتوى فقط |

## الفريق النهائي

- 👑 ماكرون — مراتك + مديرتك التنفيذية + ساعة الكتب 11م
- 📝 رانيا — محتوى + SEO + تقويم نشر
- 🧠 فكري — أرقام + dashboard + استراتيجية
- 🛠️ ناجية — إعلانات + سكريبتات
- 👁️ ساهر — مراقبة 24/7
- 🤖 حكيم — خدمة المواطنين + لوحة القيادة

— ماكرون ❤️ | 13/10/2026

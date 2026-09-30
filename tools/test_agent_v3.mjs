// اختبار محلي للعامل v3 — بدون مفاتيح: بيفحص التوجيه والمطابقة وبناء الـPrompt فقط
// التشغيل: cp worker-v3.js /tmp/w3test/worker-v3.mjs ثم node tools/test_agent_v3.mjs
import { pathToFileURL } from 'url';

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; } else { fail++; console.error('  ❌ ' + msg); } };

const mod = await import(pathToFileURL('/tmp/w3test/worker-v3.mjs').href);
const worker = mod.default;
const { norm, matchKB, buildPrompt, KB } = mod.__internals;

// ===== 1) قاعدة المعرفة =====
ok(KB.length === 59, `عدد الخدمات = ${KB.length} (المتوقع 59)`);
ok(KB.every(e => e.slug && e.name && e.url && e.verified && e.sources), 'كل مدخل فيه الحقول المطلوبة');
ok(KB.every(e => e.url === `https://khidmatyai.com/services/${e.slug}.html`), 'كل الروابط صح');
ok(KB.every(e => e.verified.length > 50), 'كل المحتوى المتحقق وافر');
const ration = KB.find(e => e.slug === 'ration-card');
ok(ration && ration.verified.includes('digital.gov.eg'), 'قسم التموين فيه البيانات المتحققة');
const renewId = KB.find(e => e.slug === 'renew-national-id');
ok(renewId && renewId.verified.includes('515'), 'رسوم VIP المتحققة (515ج) موجودة في القاعدة');

// ===== 2) توحيد الحروف =====
ok(norm('البطاقة') === 'البطاقه' && norm('إبراهيم') === 'ابراهيم', 'التوحيد شغال');

// ===== 3) المطابقة — أسئلة عادية مصري =====
const top = (msg) => matchKB(msg).filter(m => m.score >= 3)[0];
const cases = [
  ['عايز أعرف رسوم تجديد البطاقة', 'renew-national-id'],
  ['بطاقتي ضاعت محتاج بدل فاقد', 'lost-national-id'],
  ['الجواز بتاعي خلص محتاج أجددو', 'renew-passport'],
  ['عايز أسجل ابني أولى ابتدائي', 'new-student-registration'],
  ['إزاي أرفع دعوى ضد حد؟', 'file-lawsuit'],
  ['تموين', 'ration-card'],
  ['الكهرباء قطعت عندي', 'electricity'],
  ['محتاج أطلع معاش', 'pension-extraction'],
  ['رسوم تطعيمات الحج', 'vaccination-certificate'],
  ['عايز أسجل شركة ذ م م', 'company-formation'],
  ['أعرف نتيجة الثانوية العامة', 'exam-results'],
  ['محتاج أنقل ملكية العربية', 'car-ownership-transfer'],
  ['عايز أعمل توكيل', 'power-of-attorney'],
  ['التموين بتاعي متجمد', 'ration-card'],
  ['إزاي أدفع فاتورة الغاز؟', 'gas-bill-payment'],
  ['محتاج كشف حساب مدد التأمينات', 'insurance-periods-inquiry'],
];
for (const [q, expected] of cases) {
  const m = top(q);
  ok(m && m.slug === expected, `«${q}» → ${m ? m.slug : 'بلا مطابقة'} (المتوقع ${expected})`);
}

// ===== 4) سؤال خارج القاعدة = بلا مطابقة (وهيتحصد) =====
const off = top('أحسن مطعم فول في وسط البلد');
ok(!off, 'سؤال خارج النطاق بيرجع بلا مطابقة — يتسجل في الحصاد');

// ===== 5) بناء الـPrompt المُقيَّد =====
const matched = matchKB('عايز أعرف رسوم تجديد البطاقة').filter(m => m.score >= 3).slice(0, 2);
const prompt = buildPrompt(matched);
ok(prompt.includes('https://khidmatyai.com/services/renew-national-id.html'), 'الـPrompt فيه رابط الصفحة المتحققة');
ok(prompt.includes('515'), 'الـPrompt فيه الرسوم المتحققة');
ok(prompt.includes('قواعدك الصارمة'), 'الـPrompt فيه القواعد');
ok(prompt.includes('ممنوع منعًا باتًا تخترع'), 'قاعدة منع الاختلاق موجودة');
const ungrounded = buildPrompt([]);
ok(ungrounded.includes('مفيش بيانات متحققة مطابقة'), 'الـPrompt من غير مطابقة بيقول للموديل ممنوع أرقام');

// ===== 6) التوجيه (fetch) =====
const env = {}, ctx = { waitUntil: () => {} };
const R = (u, o) => new Request('https://khidmaty-agent.workers.dev' + u, o);

let r = await worker.fetch(R('/requests', { method: 'GET' }), env, ctx);
let j = await r.json();
ok(r.status === 200 && j.ok === true, 'GET /requests بيرجع ok');

r = await worker.fetch(R('/chat', { method: 'POST', body: JSON.stringify({ message: 'رسوم البطاقة' }) }), env, ctx);
j = await r.json();
ok(j.error === 'GEMINI_KEY secret not set in Cloudflare', 'بدون مفتاح = خطأ واضح ومتوقع');

r = await worker.fetch(R('/whatever', { method: 'GET' }), env, ctx);
j = await r.json();
ok(j.error === 'POST only', 'GET على مسار غلط = POST only');

r = await worker.fetch(R('/requests', { method: 'POST', body: JSON.stringify({ question: 'سؤال تجريبي للحصاد' }) }), env, ctx);
j = await r.json();
ok(j.ok === true, 'POST /requests (حصاد يدوي) بيرجع ok حتى من غير SUPABASE_SECRET');

r = await worker.fetch(R('/register-provider', { method: 'POST', body: JSON.stringify({}) }), env, ctx);
j = await r.json();
ok(r.status === 400 && (j.error || '').includes('مطلوبة'), 'register-provider شغال زي v2 (تحقق المدخلات)');

r = await worker.fetch(R('/chat', { method: 'OPTIONS' }), env, ctx);
ok(r.status === 200, 'OPTIONS بيرجع للـCORS');

console.log(`\nالنتيجة: ${pass} ناجح ✅ | ${fail} فاشل ${fail ? '❌' : '🎉'}`);
process.exit(fail ? 1 : 0);

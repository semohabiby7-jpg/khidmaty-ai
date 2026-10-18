/* ============================================================
   Scan Macaron AI — app.js
   معالجة محلية 100%: Canvas + Tesseract.js (OCR) + pdf-lib (PDF)
   + تصحيح المنظور (homography) + فلاتر مستند + حدّة.
   Vanilla JS، بلا build. كل المكتبات من CDN.
   معماري self-contained: غيّر CONFIG لنقل القسم لموقع مستقل.
   ============================================================ */

// ===== إعدادات العلامة =====
const CONFIG = {
  brand: 'Scan Macaron AI',
  parentSite: 'https://khidmatyai.com',
  maxDim: 2200,          // أقصى بُعد للصورة (أداء)
  thumbMax: 900,
  downloadPrefix: 'scan-macaron',
  perspCap: 1500,        // أقصى بُعد لنتيجة تصحيح المنظور (أداء)
};

// ===== مراجع DOM =====
const $ = (id) => document.getElementById(id);
const dom = {
  dropzone: $('dropzone'), fileInput: $('fileInput'), cameraInput: $('cameraInput'),
  btnPick: $('btnPick'), btnCamera: $('btnCamera'),
  uploadCard: $('uploadCard'), editorCard: $('editorCard'), exportCard: $('exportCard'),
  ocrCard: $('ocrCard'), pdfCard: $('pdfCard'),
  canvas: $('canvas'), stage: $('stage'), stageHint: $('stageHint'),
  cropOverlay: $('cropOverlay'),
  // magic scan
  btnPersp: $('btnPersp'), btnPerspApply: $('btnPerspApply'), btnPerspCancel: $('btnPerspCancel'),
  btnDoc: $('btnDoc'), btnWhite: $('btnWhite'), btnVivid: $('btnVivid'), btnSharpen: $('btnSharpen'),
  // controls
  btnRotL: $('btnRotL'), btnRotR: $('btnRotR'), rotFine: $('rotFine'), rotVal: $('rotVal'),
  bri: $('bri'), con: $('con'), sat: $('sat'),
  briVal: $('briVal'), conVal: $('conVal'), satVal: $('satVal'),
  btnAuto: $('btnAuto'), btnBW: $('btnBW'),
  // وضع اللون + التحسين الفوري (المرحلة ٥)
  btnEnhance: $('btnEnhance'),
  btnModeMagic: $('btnModeMagic'), btnModeColor: $('btnModeColor'),
  btnModeGray: $('btnModeGray'), btnModeBW: $('btnModeBW'),
  btnCrop: $('btnCrop'), btnCropApply: $('btnCropApply'), btnCropCancel: $('btnCropCancel'), cropHint: $('cropHint'),
  btnBefore: $('btnBefore'), btnReset: $('btnReset'),
  fmt: $('fmt'), quality: $('quality'), qualityField: $('qualityField'), dims: $('dims'), btnDownload: $('btnDownload'),
  // كشف تلقائي
  btnAutoDetect: $('btnAutoDetect'),
  // تعليقات / توقيع
  btnAnnotate: $('btnAnnotate'), annotateBar: $('annotateBar'),
  annoColor: $('annoColor'), annoWidth: $('annoWidth'), annoModeHint: $('annoModeHint'),
  btnAnnoText: $('btnAnnoText'), btnAnnoClear: $('btnAnnoClear'), btnAnnoExit: $('btnAnnoExit'),
  // حفظ محلي
  btnSave: $('btnSave'),
  // سجل / أرشيف
  historyCard: $('historyCard'), historyTray: $('historyTray'),
  // OCR
  ocrLang: $('ocrLang'), btnOCR: $('btnOCR'),
  ocrProgress: $('ocrProgress'), ocrBar: $('ocrBar'), ocrPct: $('ocrPct'), ocrText: $('ocrText'),
  btnCopy: $('btnCopy'), btnTxt: $('btnTxt'), btnSpeak: $('btnSpeak'), btnStopSpeak: $('btnStopSpeak'),
  // PDF
  btnAddPage: $('btnAddPage'), pageCount: $('pageCount'), pagesTray: $('pagesTray'), pageSize: $('pageSize'), btnPdf: $('btnPdf'),
};
const ctx = dom.canvas.getContext('2d', { willReadFrequently: true });

// ===== الحالة =====
const state = {
  base: null, baseW: 0, baseH: 0,
  rotate90: 0, fineRot: 0,
  bri: 100, con: 100, sat: 100, bw: false,
  // وضع اللون: 'magic' | 'color' | 'gray' | 'bw'
  // colorMode بتتحكّم في محرّك التحسين (المرحلة ٥).
  // bw الموجود قبل كده بيبقى true لما colorMode = 'bw'.
  colorMode: 'color',
  showOriginal: false,
  cropMode: false, cropRect: null, dragging: false, dragStart: null,
  perspMode: false, perspCorners: null, perspDrag: -1,
  pages: [],
  // تعليقات / توقيع
  annotateMode: false, annoTextMode: false,
  annotations: [], currentStroke: null,
  annoColor: '#e6c258', annoWidth: 3,
};

// ===== أدوات =====
function show(el){ el.classList.remove('hidden'); }
function hide(el){ el.classList.add('hidden'); }
function setVal(slider, valEl, val, suffix='%'){ state[slider] = val; valEl.textContent = val + suffix; }
function clamp(v,a,b){ return v<a?a:(v>b?b:v); }

function saveBlob(blob, name){
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href), 2000);
}
function blobToDataURL(blob){
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(blob);
  });
}

// تحميل ملف → canvas أساسي
function loadFile(file){
  if(!file || !file.type.startsWith('image/')){ toast('الملف مش صورة مدعومة'); return; }
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    URL.revokeObjectURL(url);
    setBaseFromImage(img);
    resetTransforms();
    render();
    show(dom.editorCard); show(dom.exportCard); show(dom.ocrCard); show(dom.pdfCard);
    warmOcrWorker(); // تسخين OCR في الخلفية = أول استخراج نص فوري
    dom.canvas.scrollIntoView({ behavior:'smooth', block:'center' });
  };
  img.onerror = () => { URL.revokeObjectURL(url); toast('تعذّر فتح الصورة'); };
  img.src = url;
}

function setBaseFromImage(img){
  let w = img.naturalWidth, h = img.naturalHeight;
  const max = CONFIG.maxDim;
  if(w > max || h > max){ const s = max / Math.max(w,h); w = Math.round(w*s); h = Math.round(h*s); }
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  c.getContext('2d').drawImage(img, 0, 0, w, h);
  state.base = c; state.baseW = w; state.baseH = h;
}

function setEditingEnabled(en){
  const els = [dom.btnAuto,dom.btnBW,dom.btnCrop,dom.btnBefore,dom.btnReset,
    dom.btnDoc,dom.btnWhite,dom.btnVivid,dom.btnSharpen,dom.btnRotL,dom.btnRotR,
    dom.rotFine,dom.bri,dom.con,dom.sat,
    dom.btnAutoDetect,dom.btnAnnotate,dom.btnEnhance,
    dom.btnModeMagic,dom.btnModeColor,dom.btnModeGray,dom.btnModeBW];
  els.forEach(b => { if(b) b.disabled = !en; });
}

function resetTransforms(){
  state.rotate90 = 0; state.fineRot = 0;
  state.bri = 100; state.con = 100; state.sat = 100; state.bw = false;
  state.colorMode = 'color';
  state.showOriginal = false; state.cropMode = false; state.cropRect = null;
  if(state.perspMode){ state.perspMode=false; setEditingEnabled(true); dom.btnPerspApply.disabled=true; dom.btnPerspCancel.disabled=true; dom.btnPersp.classList.remove('active'); state.perspCorners=null; state.perspDrag=-1; dom.stage.style.cursor=''; dom.stageHint.textContent=''; }
  dom.rotFine.value = 0; dom.rotVal.textContent = '0°';
  dom.bri.value = 100; dom.con.value = 100; dom.sat.value = 100;
  dom.briVal.textContent = '100%'; dom.conVal.textContent = '100%'; dom.satVal.textContent = '100%';
  dom.btnBW.classList.remove('active');
  dom.btnBefore.classList.remove('active');
  // اطفي كل شرائح وضع اللون
  updateColorModeUI();
  exitCropMode();
  // مسح التعليقات والخروج من وضعها
  if(state.annotateMode) exitAnnotate();
  state.annotations = []; state.currentStroke = null;
}

// ===== الرسم =====
function render(){
  if(!state.base) return;
  if(state.perspMode){ renderPersp(); return; }
  const base = state.base, w = state.baseW, h = state.baseH;

  if(state.showOriginal){
    dom.canvas.width = w; dom.canvas.height = h;
    ctx.setTransform(1,0,0,1,0,0); ctx.filter = 'none';
    ctx.clearRect(0,0,w,h); ctx.drawImage(base,0,0);
    drawCropOverlay(); drawAnnotations(); updateDims(); return;
  }

  const angle = (state.rotate90 * 90 + state.fineRot) * Math.PI / 180;
  const cos = Math.abs(Math.cos(angle)), sin = Math.abs(Math.sin(angle));
  const nw = Math.max(1, Math.round(w*cos + h*sin));
  const nh = Math.max(1, Math.round(w*sin + h*cos));
  dom.canvas.width = nw; dom.canvas.height = nh;

  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0,0,nw,nh);
  ctx.filter = `brightness(${state.bri}%) contrast(${state.con}%) saturate(${state.sat}%)${state.bw? ' grayscale(1)':''}`;
  ctx.imageSmoothingQuality = 'high';
  ctx.translate(nw/2, nh/2);
  ctx.rotate(angle);
  ctx.drawImage(base, -w/2, -h/2);
  ctx.setTransform(1,0,0,1,0,0);
  ctx.filter = 'none';

  // محرّك التحسين (المرحلة ٥) — اطبق على بكسلات الـcanvas بعد الرسم.
  // bw => Sauvola. color/gray/magic => فلاتر تحسين لونية/حدّة.
  if(state.bw) applySauvola();
  else enhanceColorMode();
  drawCropOverlay();
  drawAnnotations();
  updateDims();
}

// ============================================================
//  المرحلة ٥ — محرّك تحسين جودة المستند (Phase 5 quality engine)
//  Pure Canvas/JS, typed arrays, O(n), بلا مكتبات خارجية.
//  خوارزميات: Sauvola B/W + موازنة خلفية + unsharp + Magic Color
// ============================================================

// ---- Sauvola adaptive binarization (استبدال العتبة البسيطة) ----
// صورة تكاملية (integral image) بمصفوفتي Float64Array: المجموع والمجموع التربيعي.
// لكل بكسل، نافذة مربعة نصف قطرها R، نحسب المتوسط المحلي m والتباين المحلي v،
// ثم العتبة T = m * (1 + k*(std/128 - 1)). الناتج: نص أسود حاد على أبيض ناصع، بلا ظلال.
// O(n) عن طريق الصورة التكاملية، O(1) لكل بكسل.
const SAUVOLA_K = 0.5; // معامل Sauvola
function applySauvola(){
  const w = dom.canvas.width, h = dom.canvas.height;
  try{
    const d = ctx.getImageData(0,0,w,h);
    const p = d.data, n = w * h;
    // ١. رمادي + بناء الصورة التكاملية (sum و sum²)
    // S[i] = مجموع القيم من (0,0) لـ(x,y) شامل. S2 = مجموع المربعات.
    const S = new Float64Array(n);
    const S2 = new Float64Array(n);
    // عشان الكفاءة: نبني صف صف، نستخدم prefix-sum أفقي
    const rowAcc = new Float64Array(w);  // prefix أفقي للصف الحالي
    const rowAcc2 = new Float64Array(w);
    for(let y = 0; y < h; y++){
      const rowOff = y * w;
      rowAcc[0] = 0.299*p[rowOff*4] + 0.587*p[rowOff*4+1] + 0.114*p[rowOff*4+2];
      rowAcc2[0] = rowAcc[0] * rowAcc[0];
      for(let x = 1; x < w; x++){
        const idx4 = (rowOff + x) * 4;
        const g = 0.299*p[idx4] + 0.587*p[idx4+1] + 0.114*p[idx4+2];
        rowAcc[x] = rowAcc[x-1] + g;
        rowAcc2[x] = rowAcc2[x-1] + g * g;
      }
      if(y === 0){
        for(let x = 0; x < w; x++){ S[x] = rowAcc[x]; S2[x] = rowAcc2[x]; }
      } else {
        const prevRow = (y - 1) * w;
        for(let x = 0; x < w; x++){
          S[rowOff + x] = S[prevRow + x] + rowAcc[x];
          S2[rowOff + x] = S2[prevRow + x] + rowAcc2[x];
        }
      }
    }
    // ٢. نصف قطر النافذة التكيّفية
    const R = Math.max(8, Math.round(Math.min(w, h) * 0.02));
    const winN = (2 * R + 1) * (2 * R + 1); // عدد عناصر النافذة
    // ٣. لكل بكسل: اجمع النافذة عبر ٤ زوايا تكاملية، احسب m و std، ثم العتبة
    for(let y = 0; y < h; y++){
      const rowOff = y * w;
      // حدود النافذة (مع clamp)
      const y0 = y - R < 0 ? 0 : y - R;
      const y1 = y + R >= h ? h - 1 : y + R;
      const row1Off = y1 * w;
      for(let x = 0; x < w; x++){
        const x0 = x - R < 0 ? 0 : x - R;
        const x1 = x + R >= w ? w - 1 : x + R;
        // مجموع النافذة = S(إيجابي) − أعلى − يسار + أعلى-يسار (صورة تكاملية)
        let sum = S[row1Off + x1];
        let sum2 = S2[row1Off + x1];
        if(y0 > 0){ sum -= S[(y0-1)*w + x1]; sum2 -= S2[(y0-1)*w + x1]; }
        if(x0 > 0){ sum -= S[row1Off + x0 - 1]; sum2 -= S2[row1Off + x0 - 1]; }
        if(y0 > 0 && x0 > 0){ sum += S[(y0-1)*w + x0 - 1]; sum2 += S2[(y0-1)*w + x0 - 1]; }
        const m = sum / winN;
        const v = sum2 / winN - m * m;
        const std = v > 0 ? Math.sqrt(v) : 0;
        const T = m * (1 + SAUVOLA_K * (std / 128 - 1));
        const idx4 = (rowOff + x) * 4;
        const g = 0.299*p[idx4] + 0.587*p[idx4+1] + 0.114*p[idx4+2];
        const v2 = g >= T ? 255 : 0;
        p[idx4] = p[idx4+1] = p[idx4+2] = v2;
      }
    }
    ctx.putImageData(d, 0, 0);
  }catch(e){ /* تجاهل — fallback صامت */ }
}

// ---- موازنة الخلفية (background white-balance) ----
// خلفية = النسبة المئوية ٩٥ من histogram الرمادي.
// scale = 255 / bg → paper تقريبًا أبيض. يزيل الصبغة الصفراء/الرمادية.
const BG_PERCENTILE = 0.95;
// رجّع قيمة النسبة المئوية من histogram
function grayPercentile(gray, n, pct){
  const hist = new Uint32Array(256);
  for(let i = 0; i < n; i++) hist[gray[i]]++;
  const target = Math.floor(n * pct);
  let acc = 0;
  for(let i = 0; i < 256; i++){
    acc += hist[i];
    if(acc >= target) return i;
  }
  return 255;
}
// موازنة الخلفية على قناة رمادية (Uint8Array) — inplace
function whiteBalanceGray(gray, n){
  const bg = grayPercentile(gray, n, BG_PERCENTILE);
  if(bg < 1) return; // صورة سوداء — مالهاش لازمه
  const scale = 255 / bg;
  for(let i = 0; i < n; i++){
    let v = gray[i] * scale;
    if(v > 255) v = 255;
    gray[i] = v;
  }
}

// ---- Unsharp mask (حدّة) ----
// نعيد استخدام boxBlur بمصفوفة Float32Array. نطبّق على قناة واحدة (رمادي).
// out = clamp(img + amount*(img - blurred)). amount = 0.7.
const UNSHARP_AMOUNT = 0.7;
const UNSHARP_RADIUS = 2;
function unsharpGray(gray, w, h){
  const blurred = boxBlur(gray, w, h, UNSHARP_RADIUS);
  for(let i = 0; i < w * h; i++){
    let v = gray[i] + UNSHARP_AMOUNT * (gray[i] - blurred[i]);
    if(v < 0) v = 0; else if(v > 255) v = 255;
    gray[i] = v;
  }
}

// ---- تحسين وضع اللون (color / gray / magic) ----
// بيتطبّق بعد الرسم بـ CSS filter. يشتغل على بكسلات الـcanvas الحالي.
function enhanceColorMode(){
  const w = dom.canvas.width, h = dom.canvas.height;
  if(w < 1 || h < 1) return;
  try{
    const mode = state.colorMode;
    if(mode === 'bw') return; // Sauvola بيتطبّق في المسار التاني
    const d = ctx.getImageData(0,0,w,h);
    const p = d.data, n = w * h;

    if(mode === 'gray'){
      // رمادي + موازنة خلفية + حدّة
      const gray = new Uint8ClampedArray(n);
      for(let i = 0; i < n; i++){
        const j = i * 4;
        gray[i] = 0.299*p[j] + 0.587*p[j+1] + 0.114*p[j+2];
      }
      whiteBalanceGray(gray, n);
      unsharpGray(gray, w, h);
      for(let i = 0; i < n; i++){
        const j = i * 4, v = gray[i];
        p[j] = p[j+1] = p[j+2] = v;
      }
    } else if(mode === 'color'){
      // لون + موازنة خلفية (لكل قناة) + حدّة خفيفة
      enhanceColorChannels(p, n, false);
      unsharpChannels(p, w, h);
    } else if(mode === 'magic'){
      // Magic Color: RGB→HSL، رفع التشبّع ~١.٢×، contrast stretch لكل قناة،
      // موازنة خلفية luminance → أبيض
      enhanceMagic(p, n, w, h);
    }
    ctx.putImageData(d, 0, 0);
  }catch(e){ /* تجاهل */ }
}

// موازنة خلفية لكل قناة RGB (inplace) — تبيّض الورقة
function enhanceColorChannels(p, n, isMagic){
  // احسب histogram luminance للنسبة المئوية المشتركة
  const gray = new Uint8ClampedArray(n);
  for(let i = 0; i < n; i++){
    const j = i * 4;
    gray[i] = 0.299*p[j] + 0.587*p[j+1] + 0.114*p[j+2];
  }
  const bg = grayPercentile(gray, n, BG_PERCENTILE);
  if(bg < 1) return;
  const scale = 255 / bg;
  // طبّق scale على كل قناة
  for(let i = 0; i < n; i++){
    const j = i * 4;
    let r = p[j] * scale, g = p[j+1] * scale, b = p[j+2] * scale;
    if(r > 255) r = 255; if(g > 255) g = 255; if(b > 255) b = 255;
    p[j] = r; p[j+1] = g; p[j+2] = b;
  }
}

// Unsharp على ٣ قنوات RGB
function unsharpChannels(p, w, h){
  const n = w * h;
  for(let ch = 0; ch < 3; ch++){
    const c = new Float32Array(n);
    for(let i = 0; i < n; i++) c[i] = p[i*4 + ch];
    const blurred = boxBlur(c, w, h, UNSHARP_RADIUS);
    for(let i = 0; i < n; i++){
      let v = c[i] + UNSHARP_AMOUNT * (c[i] - blurred[i]);
      if(v < 0) v = 0; else if(v > 255) v = 255;
      p[i*4 + ch] = v;
    }
  }
}

// ---- Magic Color mode ----
// RGB→HSL، رفع التشبّع، contrast stretch لكل قناة (percentile)، موازنة خلفية luminance.
const MAGIC_SAT_BOOST = 1.2;
const MAGIC_STRETCH_LO = 0.02;
const MAGIC_STRETCH_HI = 0.98;
function enhanceMagic(p, n, w, h){
  // ١. contrast stretch لكل قناة (percentile 2%–98%)
  for(let ch = 0; ch < 3; ch++){
    stretchChannel(p, n, ch, MAGIC_STRETCH_LO, MAGIC_STRETCH_HI);
  }
  // ٢. رفع التشبّع عبر RGB→HSL → boost S → RGB
  for(let i = 0; i < n; i++){
    const j = i * 4;
    let r = p[j] / 255, g = p[j+1] / 255, b = p[j+2] / 255;
    const hsl = rgb2hsl(r, g, b);
    hsl[1] = Math.min(1, hsl[1] * MAGIC_SAT_BOOST);
    const rgb = hsl2rgb(hsl[0], hsl[1], hsl[2]);
    p[j]   = rgb[0] * 255;
    p[j+1] = rgb[1] * 255;
    p[j+2] = rgb[2] * 255;
  }
  // ٣. موازنة خلفية luminance → أبيض
  enhanceColorChannels(p, n, true);
}

// contrast stretch لقناة واحدة (percentile)
function stretchChannel(p, n, ch, loPct, hiPct){
  const hist = new Uint32Array(256);
  for(let i = 0; i < n; i++) hist[p[i*4 + ch]]++;
  const loTarget = Math.floor(n * loPct), hiTarget = Math.floor(n * hiPct);
  let acc = 0, lo = 0, hi = 255;
  for(let i = 0; i < 256; i++){ acc += hist[i]; if(acc >= loTarget){ lo = i; break; } }
  acc = 0;
  for(let i = 255; i >= 0; i--){ acc += hist[i]; if(acc >= n - hiTarget){ hi = i; break; } }
  if(hi - lo < 8) return; // تباين ضعيل — تجاهل
  const range = hi - lo;
  for(let i = 0; i < n; i++){
    let v = p[i*4 + ch];
    v = (v - lo) * 255 / range;
    if(v < 0) v = 0; else if(v > 255) v = 255;
    p[i*4 + ch] = v;
  }
}

// ---- تحويلات RGB ↔ HSL ----
function rgb2hsl(r, g, b){
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h, s;
  const d = max - min;
  if(d < 1e-9){ h = 0; s = 0; }
  else {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if(max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if(max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return [h, s, l];
}
function hsl2rgb(h, s, l){
  let r, g, b;
  if(s < 1e-9){ r = g = b = l; }
  else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const pp = 2 * l - q;
    r = hue2rgb(pp, q, h + 1/3);
    g = hue2rgb(pp, q, h);
    b = hue2rgb(pp, q, h - 1/3);
  }
  return [r, g, b];
}
function hue2rgb(p, q, t){
  if(t < 0) t += 1; if(t > 1) t -= 1;
  if(t < 1/6) return p + (q - p) * 6 * t;
  if(t < 1/2) return q;
  if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
  return p;
}

// ---- التحسين الفوري (one-tap auto-enhance) ----
// اكتشف نوع المستند: لو متوسط التشبّع منخفض (<٠.١٢) أو تباين رمادي محلي عالي
// => مستند نصّي => Sauvola B/W + حدّة. غير كده => Magic Color + حدّة.
const AUTO_SAT_THRESH = 0.12;
const AUTO_VAR_THRESH = 0.04;
function oneTapEnhance(){
  if(!state.base) return;
  // عيّنة صغيرة (max 200px) لتحليل الإحصاءات — أسرع للموبايل
  const sw = state.baseW, sh = state.baseH;
  const sampleMax = 200;
  const ss = sampleMax / Math.max(sw, sh);
  const dw = Math.max(1, Math.round(sw * ss)), dh = Math.max(1, Math.round(sh * ss));
  const off = document.createElement('canvas');
  off.width = dw; off.height = dh;
  const oc = off.getContext('2d');
  oc.drawImage(state.base, 0, 0, dw, dh);
  const d = oc.getImageData(0,0,dw,dh).data;
  const n = dw * dh;
  // متوسط التشبّع + تباين الرمادي
  let satSum = 0, graySum = 0, graySum2 = 0;
  for(let i = 0; i < n; i++){
    const j = i * 4;
    const r = d[j] / 255, g = d[j+1] / 255, b = d[j+2] / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    const lum = (mx + mn) / 2;
    const sat = mx - mn < 1e-9 ? 0 : (lum > 0.5 ? (mx - mn) / (2 - mx - mn) : (mx - mn) / (mx + mn));
    satSum += sat;
    const gray = 0.299*d[j] + 0.587*d[j+1] + 0.114*d[j+2];
    graySum += gray; graySum2 += gray * gray;
  }
  const meanSat = satSum / n;
  const meanGray = graySum / n;
  const varGray = graySum2 / n - meanGray * meanGray;
  const normVar = varGray / (255 * 255); // تطبيع لـ[0,1]

  // قرار: نصّي لو تشبّع منخفض أو تباين عالي
  const isTextDoc = meanSat < AUTO_SAT_THRESH || normVar > AUTO_VAR_THRESH;
  if(isTextDoc){
    // Sauvola B/W — نص أسود حاد على أبيض ناصع
    state.colorMode = 'bw';
    state.bw = true;
  } else {
    // Magic Color + حدّة — ألوان حيّة وخلفية بيضاء
    state.colorMode = 'magic';
    state.bw = false;
  }
  updateColorModeUI();
  render();
  toast('✨ اتحسّن');
}

// ---- تحديث واجهة شرائح وضع اللون ----
function updateColorModeUI(){
  const map = { magic: dom.btnModeMagic, color: dom.btnModeColor, gray: dom.btnModeGray, bw: dom.btnModeBW };
  for(const k in map){
    if(map[k]) map[k].classList.toggle('active', k === state.colorMode);
  }
  // btnBW الموجود قبل كده بيتزامن مع وضع bw
  if(dom.btnBW) dom.btnBW.classList.toggle('active', state.colorMode === 'bw');
}

// ---- اختيار وضع اللون من الشريحة ----
function setColorMode(mode){
  if(!state.base || state.colorMode === mode) return;
  state.colorMode = mode;
  state.bw = (mode === 'bw'); // الحفاظ على توافق bw القديم
  updateColorModeUI();
  render();
}

function updateDims(){
  if(dom.dims) dom.dims.textContent = dom.canvas.width + '×' + dom.canvas.height + 'px';
}

// ===== التحسين التلقائي =====
function autoEnhance(){
  if(!state.base) return;
  const w = state.baseW, h = state.baseH;
  const off = document.createElement('canvas'); off.width=w; off.height=h;
  const oc = off.getContext('2d'); oc.drawImage(state.base,0,0);
  const d = oc.getImageData(0,0,w,h).data;
  const hist = new Array(256).fill(0);
  for(let i=0;i<d.length;i+=4){ hist[Math.round(0.299*d[i]+0.587*d[i+1]+0.114*d[i+2])]++; }
  const total = d.length/4;
  let lo=0, hi=255, acc=0;
  const pLo = total*0.02, pHi = total*0.98;
  for(let i=0;i<256;i++){ acc+=hist[i]; if(acc>=pLo){ lo=i; break; } }
  acc=0; for(let i=255;i>=0;i--){ acc+=hist[i]; if(acc>=total-pHi){ hi=i; break; } }
  if(hi-lo < 30) hi = Math.min(255, lo+128);
  const stretch = Math.min(180, Math.round(100 + (180 * (1 - (hi-lo)/255))));
  const meanLum = lo + (hi-lo)/2;
  const briBoost = Math.max(50, Math.min(150, Math.round(100 + (128 - meanLum) * 0.5)));
  dom.con.value = stretch; dom.bri.value = briBoost;
  state.con = stretch; state.bri = briBoost;
  dom.conVal.textContent = stretch+'%'; dom.briVal.textContent = briBoost+'%';
  render();
  toast('✨ تحسين تلقائي اتطبّق');
}

// ============================================================
//  المسح السحري — تصحيح المنظور (homography)
// ============================================================
function enterPersp(){
  if(!state.base) return;
  exitCropMode();
  state.perspMode = true;
  const w=state.baseW, h=state.baseH, ix=w*0.08, iy=h*0.08;
  state.perspCorners = [{x:ix,y:iy},{x:w-ix,y:iy},{x:w-ix,y:h-iy},{x:ix,y:h-iy}];
  state.perspDrag = -1;
  setEditingEnabled(false);
  dom.btnPerspApply.disabled = false; dom.btnPerspCancel.disabled = false;
  dom.btnPersp.classList.add('active');
  dom.stageHint.textContent = 'حرّك الـ٤ زوايا على حدود الورقة';
  renderPersp();
}
function exitPersp(){
  state.perspMode = false; state.perspCorners = null; state.perspDrag = -1;
  setEditingEnabled(true);
  dom.btnPerspApply.disabled = true; dom.btnPerspCancel.disabled = true;
  dom.btnPersp.classList.remove('active');
  dom.stageHint.textContent = '';
  render();
}

function renderPersp(){
  const w=state.baseW, h=state.baseH;
  dom.canvas.width = w; dom.canvas.height = h;
  ctx.setTransform(1,0,0,1,0,0); ctx.filter = 'none';
  ctx.clearRect(0,0,w,h);
  ctx.drawImage(state.base,0,0);
  const c = state.perspCorners;
  // غمّق خارج الرباعي واعرض الصورة جواه
  ctx.save();
  ctx.fillStyle = 'rgba(6,12,26,.5)';
  ctx.fillRect(0,0,w,h);
  ctx.beginPath();
  ctx.moveTo(c[0].x,c[0].y); ctx.lineTo(c[1].x,c[1].y);
  ctx.lineTo(c[2].x,c[2].y); ctx.lineTo(c[3].x,c[3].y); ctx.closePath();
  ctx.clip();
  ctx.drawImage(state.base,0,0);
  ctx.restore();
  // حدود الرباعي
  ctx.strokeStyle = '#e6c258'; ctx.lineWidth = Math.max(2, w*0.004); ctx.setLineDash([10,6]);
  ctx.beginPath();
  ctx.moveTo(c[0].x,c[0].y); ctx.lineTo(c[1].x,c[1].y);
  ctx.lineTo(c[2].x,c[2].y); ctx.lineTo(c[3].x,c[3].y); ctx.closePath(); ctx.stroke();
  ctx.setLineDash([]);
  // المقابض
  const r = Math.max(8, w*0.018);
  for(let i=0;i<4;i++){
    ctx.beginPath(); ctx.arc(c[i].x, c[i].y, r, 0, Math.PI*2);
    ctx.fillStyle = '#e6c258'; ctx.fill();
    ctx.strokeStyle = '#0F1E3D'; ctx.lineWidth = 3; ctx.stroke();
  }
  updateDims();
}

// حلّ homography عكسي: خرج(u,v) ← مدخل(x,y)
function solveHomography(outPts, inPts){
  const A=[], b=[];
  for(let i=0;i<4;i++){
    const u=outPts[i][0], v=outPts[i][1], x=inPts[i].x, y=inPts[i].y;
    A.push([u,v,1,0,0,0,-u*x,-v*x]); b.push(x);
    A.push([0,0,0,u,v,1,-u*y,-v*y]); b.push(y);
  }
  const s = gauss(A,b);
  return { a:s[0],b:s[1],c:s[2],d:s[3],e:s[4],f:s[5],g:s[6],h:s[7] };
}
function gauss(A,b){
  const n=b.length;
  const M=A.map((row,i)=>[...row,b[i]]);
  for(let col=0;col<n;col++){
    let piv=col; for(let r=col+1;r<n;r++){ if(Math.abs(M[r][col])>Math.abs(M[piv][col])) piv=r; }
    if(piv!==col){ const t=M[col]; M[col]=M[piv]; M[piv]=t; }
    const pv=M[col][col]; if(Math.abs(pv)<1e-12) continue;
    for(let c=col;c<=n;c++) M[col][c]/=pv;
    for(let r=0;r<n;r++){ if(r===col) continue; const f=M[r][col]; if(f===0) continue; for(let c=col;c<=n;c++) M[r][c]-=f*M[col][c]; }
  }
  const x=new Array(n); for(let i=0;i<n;i++) x[i]=M[i][n]; return x;
}

function applyPersp(){
  const c = state.perspCorners;
  const wTop=Math.hypot(c[1].x-c[0].x, c[1].y-c[0].y);
  const wBot=Math.hypot(c[2].x-c[3].x, c[2].y-c[3].y);
  const hLeft=Math.hypot(c[3].x-c[0].x, c[3].y-c[0].y);
  const hRight=Math.hypot(c[2].x-c[1].x, c[2].y-c[1].y);
  let W=Math.max(1,Math.round(Math.max(wTop,wBot)));
  let H=Math.max(1,Math.round(Math.max(hLeft,hRight)));
  const cap=CONFIG.perspCap; const mx=Math.max(W,H); if(mx>cap){ const s=cap/mx; W=Math.round(W*s); H=Math.round(H*s); }

  const Hm = solveHomography([[0,0],[W,0],[W,H],[0,H]], c);
  // بيانات المصدر
  const sw=state.baseW, sh=state.baseH;
  const srcC=document.createElement('canvas'); srcC.width=sw; srcC.height=sh;
  const sctx=srcC.getContext('2d'); sctx.drawImage(state.base,0,0);
  const sd=sctx.getImageData(0,0,sw,sh); const sp=sd.data;
  // المخرج
  const out=document.createElement('canvas'); out.width=W; out.height=H;
  const octx=out.getContext('2d'); const od=octx.createImageData(W,H); const op=od.data;
  for(let v=0; v<H; v++){
    for(let u=0; u<W; u++){
      const den=Hm.g*u+Hm.h*v+1;
      const sx=(Hm.a*u+Hm.b*v+Hm.c)/den;
      const sy=(Hm.d*u+Hm.e*v+Hm.f)/den;
      const xi=sx|0, yi=sy|0, fx=sx-xi, fy=sy-yi;
      const idx=(v*W+u)*4;
      if(xi<0||yi<0||xi>=sw-1||yi>=sh-1){ op[idx]=op[idx+1]=op[idx+2]=op[idx+3]=255; continue; }
      const i00=(yi*sw+xi)*4, i10=(yi*sw+xi+1)*4, i01=((yi+1)*sw+xi)*4, i11=((yi+1)*sw+xi+1)*4;
      for(let k=0;k<4;k++){
        const top=sp[i00+k]*(1-fx)+sp[i10+k]*fx;
        const bot=sp[i01+k]*(1-fx)+sp[i11+k]*fx;
        op[idx+k]=top*(1-fy)+bot*fy;
      }
    }
  }
  octx.putImageData(od,0,0);
  state.base=out; state.baseW=W; state.baseH=H;
  exitPersp();
  toast('📐 اتفرّد المستند');
}

// ===== فلاتر المستند (تطبيق على الـbase) =====
function applyToBase(fn){
  if(!state.base) return;
  const w=state.baseW, h=state.baseH;
  const c=document.createElement('canvas'); c.width=w; c.height=h;
  const cc=c.getContext('2d'); cc.drawImage(state.base,0,0);
  try{ fn(cc,w,h); }catch(e){ console.error(e); toast('تعذّر تطبيق الفلتر'); return; }
  state.base=c; state.baseW=w; state.baseH=h;
  resetTransforms(); render();
}
function documentFilter(cc,w,h){
  const d=cc.getImageData(0,0,w,h), p=d.data;
  for(let i=0;i<p.length;i+=4){
    const lum=0.299*p[i]+0.587*p[i+1]+0.114*p[i+2];
    if(lum>175){ p[i]=p[i+1]=p[i+2]=255; }
    else{
      const v=clamp((lum-100)*1.6+100, 0, 230);
      const r=lum>0? v/lum : 1;
      p[i]=clamp(p[i]*r,0,255); p[i+1]=clamp(p[i+1]*r,0,255); p[i+2]=clamp(p[i+2]*r,0,255);
    }
  }
  cc.putImageData(d,0,0);
}
function whitenFilter(cc,w,h){
  const d=cc.getImageData(0,0,w,h), p=d.data;
  for(let i=0;i<p.length;i+=4){
    const lum=0.299*p[i]+0.587*p[i+1]+0.114*p[i+2];
    if(lum>150){ p[i]=p[i+1]=p[i+2]=255; }
    else{ const v=clamp((lum-90)*1.8+90, 0, 255); p[i]=p[i+1]=p[i+2]=v; }
  }
  cc.putImageData(d,0,0);
}
function vividFilter(cc,w,h){
  const d=cc.getImageData(0,0,w,h), p=d.data, s=1.5;
  for(let i=0;i<p.length;i+=4){
    const lum=0.299*p[i]+0.587*p[i+1]+0.114*p[i+2];
    p[i]=clamp(lum+(p[i]-lum)*s,0,255);
    p[i+1]=clamp(lum+(p[i+1]-lum)*s,0,255);
    p[i+2]=clamp(lum+(p[i+2]-lum)*s,0,255);
  }
  cc.putImageData(d,0,0);
}
function sharpenFilter(cc,w,h){
  const src=cc.getImageData(0,0,w,h), s=src.data;
  const out=cc.createImageData(w,h), o=out.data;
  const k=[0,-1,0,-1,5,-1,0,-1,0];
  for(let y=0;y<h;y++){
    for(let x=0;x<w;x++){
      const idx=(y*w+x)*4;
      for(let ch=0;ch<3;ch++){
        if(x===0||y===0||x===w-1||y===h-1){ o[idx+ch]=s[idx+ch]; continue; }
        let acc=0, ki=0;
        for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++) acc += s[((y+dy)*w+(x+dx))*4+ch]*k[ki++];
        o[idx+ch]=clamp(acc,0,255);
      }
      o[idx+3]=s[idx+3];
    }
  }
  cc.putImageData(out,0,0);
}

// ===== القص =====
function enterCropMode(){
  if(!state.base) return;
  if(state.perspMode) exitPersp();
  state.cropMode = true; state.cropRect = null;
  dom.stage.style.cursor = 'crosshair';
  dom.cropOverlay.classList.remove('hidden');
  dom.stageHint.textContent = 'ارسم مربّع القص على الصورة';
  dom.btnCropApply.disabled = true; dom.btnCropCancel.disabled = false;
  dom.btnCrop.classList.add('active');
  render();
}
function exitCropMode(){
  state.cropMode = false; state.cropRect = null; state.dragging = false;
  dom.stage.style.cursor = '';
  dom.cropOverlay.classList.add('hidden');
  dom.stageHint.textContent = '';
  dom.btnCropApply.disabled = true; dom.btnCropCancel.disabled = true;
  dom.btnCrop.classList.remove('active');
}
function applyCrop(){
  const r = state.cropRect;
  if(!r || r.w < 8 || r.h < 8){ toast('ارسم مربّع أكتر'); return; }
  const sx = Math.max(0,Math.round(r.x)), sy = Math.max(0,Math.round(r.y));
  const sw = Math.max(1,Math.round(r.w)), sh = Math.max(1,Math.round(r.h));
  const out = document.createElement('canvas'); out.width = sw; out.height = sh;
  out.getContext('2d').drawImage(dom.canvas, sx, sy, sw, sh, 0, 0, sw, sh);
  state.base = out; state.baseW = sw; state.baseH = sh;
  resetTransforms(); render();
  toast('✂️ اتقصّت');
}

function drawCropOverlay(){
  if(!state.cropMode) return;
  const r = state.cropRect; if(!r) return;
  ctx.save();
  ctx.fillStyle = 'rgba(6,12,26,.55)';
  ctx.fillRect(0,0,dom.canvas.width,dom.canvas.height);
  ctx.clearRect(r.x, r.y, r.w, r.h);
  ctx.strokeStyle = '#e6c258'; ctx.lineWidth = 3; ctx.setLineDash([8,6]);
  ctx.strokeRect(r.x, r.y, r.w, r.h);
  ctx.strokeStyle='rgba(230,194,88,.5)'; ctx.lineWidth=1; ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(r.x+r.w/3,r.y); ctx.lineTo(r.x+r.w/3,r.y+r.h);
  ctx.moveTo(r.x+2*r.w/3,r.y); ctx.lineTo(r.x+2*r.w/3,r.y+r.h);
  ctx.moveTo(r.x,r.y+r.h/3); ctx.lineTo(r.x+r.w,r.y+r.h/3);
  ctx.moveTo(r.x,r.y+2*r.h/3); ctx.lineTo(r.x+r.w,r.y+2*r.h/3);
  ctx.stroke();
  ctx.restore();
}

function toCanvasCoords(e){
  const rect = dom.canvas.getBoundingClientRect();
  const sx = dom.canvas.width / rect.width;
  const sy = dom.canvas.height / rect.height;
  const cx = ( (e.touches? e.touches[0].clientX : e.clientX) - rect.left ) * sx;
  const cy = ( (e.touches? e.touches[0].clientY : e.clientY) - rect.top ) * sy;
  return { x: clamp(cx,0,dom.canvas.width), y: clamp(cy,0,dom.canvas.height) };
}

// ===== تصدير الصورة =====
function download(){
  if(!state.base) return;
  const fmt = dom.fmt.value;
  const q = (fmt==='image/jpeg'||fmt==='image/webp') ? (dom.quality.value/100) : undefined;
  dom.canvas.toBlob((blob) => {
    if(!blob){ toast('تعذّر التصدير'); return; }
    const ext = fmt==='image/png'?'png':fmt==='image/webp'?'webp':'jpg';
    saveBlob(blob, `${CONFIG.downloadPrefix}-${Date.now()}.${ext}`);
    toast('⬇️ اتتنزّل');
  }, fmt, q);
}

// ============================================================
//  OCR — استخراج النص (Tesseract.js) — معالجة محلية
// ============================================================
let ocrWorker = null, ocrLangCached = '';

// مراحل Tesseract → نطاق تراكمي للشريط + تسمية عربية (عشان مايقفش عند ٠٪)
const OCR_PHASES = {
  'loading tesseract core':       { r:[0,12],   t:'بيحمّل المحرّك' },
  'initializing tesseract':       { r:[12,20],  t:'بيجهّز المحرّك' },
  'loading language traineddata': { r:[20,55],  t:'بيحمّل لغة التعريف' },
  'initializing api':             { r:[55,62],  t:'بيبدأ التحليل' },
  'recognizing text':             { r:[62,100], t:'بيستخرج النص' },
};
let ocrWarming = false;
function setOcrProgress(p, label){
  const pct = clamp(Math.round((p||0)*100), 0, 100);
  dom.ocrBar.style.width = pct + '%';
  dom.ocrPct.textContent = label ? (pct + '% · ' + label) : (pct + '%');
}
async function getOcrWorker(lang){
  if(typeof Tesseract === 'undefined') throw new Error('محرّك OCR لسه بيحمّل — استنى ثواني وحاول تاني.');
  if(ocrWorker && ocrLangCached === lang) return ocrWorker;
  if(ocrWorker){ try{ await ocrWorker.terminate(); }catch(e){} ocrWorker = null; }
  ocrWorker = await Tesseract.createWorker(lang, 1, {
    langPath: 'https://tessdata.projectnaptha.com/4.0.0_fast', // بيانات سريعة (int8): تحميل وتحليل أسرع للموبايل
    logger: (m) => {
      if(!m || !m.status) return;
      const ph = OCR_PHASES[m.status];
      if(ph) setOcrProgress(ph.r[0] + (ph.r[1]-ph.r[0])*(m.progress||0), ph.t);
    },
  });
  ocrLangCached = lang;
  return ocrWorker;
}
// تسخين مسبق: يبدأ تحميل محرّك OCR + اللغة في الخلفية بعد اختيار الصورة
// (من غير ما يوقف الواجهة) عشان أول ضغطة «استخرج النص» تطلع فورية.
function warmOcrWorker(){
  const lang = dom.ocrLang.value;
  if(ocrWarming || (ocrWorker && ocrLangCached === lang)) return;
  ocrWarming = true;
  getOcrWorker(lang).then(()=>{ ocrWarming=false; }).catch(()=>{ ocrWarming=false; });
}
// نسخة مصغّرة من الكانفس (max 1600px) كـJPEG لـOCR — أسرع ٢-٤ أضعاف بدون فقدان دقّة تذكر
function ocrInputBlob(){
  const src = dom.canvas, max = 1600;
  const scale = Math.min(1, max / Math.max(src.width, src.height));
  const w = Math.round(src.width*scale), h = Math.round(src.height*scale);
  const c = document.createElement('canvas'); c.width=w; c.height=h;
  c.getContext('2d').drawImage(src, 0, 0, w, h);
  return new Promise((res)=> c.toBlob(res, 'image/jpeg', 0.85));
}
async function runOCR(){
  if(!state.base){ toast('اختار صورة الأول'); return; }
  const lang = dom.ocrLang.value;
  show(dom.ocrProgress); setOcrProgress(0, 'بيبدأ');
  dom.btnOCR.disabled = true;
  dom.ocrText.value = '';
  dom.ocrText.placeholder = 'بيشتغل… لو أول مرة ممكن يستني تحميل محرّك العربي شوية.';
  try{
    const blob = await ocrInputBlob();
    const worker = await getOcrWorker(lang);
    const { data } = await worker.recognize(blob);
    const text = (data && data.text ? data.text : '').trim();
    dom.ocrText.value = text || 'مفيش نص واضح — جرّب تحسّن الصورة (✨) أو غيّر اللغة.';
    if(text) toast('🧠 النص اتاستخرج');
  }catch(e){
    console.error(e);
    dom.ocrText.value = 'حصل خطأ في الاستخراج: ' + (e && e.message ? e.message : 'حاول تاني.');
  }finally{
    dom.btnOCR.disabled = false;
    hide(dom.ocrProgress);
  }
}
function copyText(){
  const t = dom.ocrText.value;
  if(!t){ toast('مفيش نص يتنسخ'); return; }
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(t).then(()=>toast('📋 اتنسخ')).catch(()=>fallbackCopy(t));
  } else fallbackCopy(t);
}
function fallbackCopy(t){
  const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta);
  ta.select(); try{ document.execCommand('copy'); toast('📋 اتنسخ'); }catch(e){ toast('تعذّر النسخ'); } ta.remove();
}
function downloadTxt(){
  const t = dom.ocrText.value;
  if(!t){ toast('مفيش نص ينزّل'); return; }
  saveBlob(new Blob([t], { type:'text/plain;charset=utf-8' }), `${CONFIG.downloadPrefix}-text-${Date.now()}.txt`);
  toast('⬇️ اتتنزّل النص');
}

// ============================================================
//  القراءة الصوتية العربية (SpeechSynthesis) — محلي 100%
// ============================================================
let speaking = false; // حالة القراءة الصوتية
let speakQueue = [];
let speakIdx = 0;
let speakToken = 0; // يلغي الـqueue القديم لما المستخدم يوقف/يعيد

// تحميل + ترتيب الأصوات العربية مسبقًا (أول مرة getVoices بترجع فاضي)
let arVoices = [];
function loadArVoices(){
  if(!('speechSynthesis' in window)) return;
  arVoices = (window.speechSynthesis.getVoices() || []).filter(v => v.lang && v.lang.toLowerCase().startsWith('ar'));
  arVoices.sort((a,b) => {
    const score = v => {
      let s = 0; const n = (v.name||'').toLowerCase(), l = (v.lang||'').toLowerCase();
      if(n.includes('google')) s += 3;   // أصوات Google أنشط وأنقى
      if(l.startsWith('ar-eg')) s += 2;   // المصرية أفهمها للجمهور
      if(n.includes('arabic')) s += 1;
      return s;
    };
    return score(b) - score(a);
  });
}
function arVoice(){ return arVoices[0] || null; }
if('speechSynthesis' in window){
  loadArVoices();
  window.speechSynthesis.onvoiceschanged = loadArVoices;
}

// تنظيف نص الـOCR قبل النطق => صوت أنظف وأطبع
function cleanForSpeech(t){
  return (t||'')
    .replace(/\u0640/g, '')            // شل التطويل (ـــ)
    .replace(/[|{}\[\]~`_<>]/g, ' ')  // رموز OCR زايدة
    .replace(/\s*\n\s*/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .replace(/\n/g, '، ')              // السطر الجديد => وقفة خفيفة
    .replace(/\s*،\s*،\s*/g, '، ')
    .replace(/\s*\.\s*\.\s*/g, '. ')
    .replace(/\s+([،\.؟!\؛])/g, '$1')  // مسافة قبل الفاصلة = شيلها
    .trim();
}

// تقسيم النص لجمل قصيرة: وقفات طبيعية + بلا تقطّع على الموبايل
function splitForSpeech(t){
  const clean = cleanForSpeech(t);
  if(!clean) return [];
  const rough = clean.replace(/([\.\؟!\؛])\s*/g, '$1\n').split('\n');
  const chunks = [];
  let buf = '';
  for(const piece of rough){
    const p = piece.trim();
    if(!p) continue;
    if((buf + ' ' + p).length > 220 && buf){ chunks.push(buf.trim()); buf = p; }
    else { buf = buf ? buf + ' ' + p : p; }
  }
  if(buf.trim()) chunks.push(buf.trim());
  return chunks.filter(Boolean);
}

function speak(){
  const text = (dom.ocrText.value || '').trim();
  if(!text){ toast('مفيش نص للقراءة'); return; }
  if(!('speechSynthesis' in window)){ toast('المتصفح مش بيدعم القراءة الصوتية'); return; }
  const chunks = splitForSpeech(text);
  if(!chunks.length){ toast('مفيش نص صالح للقراءة'); return; }
  window.speechSynthesis.cancel();
  speakQueue = chunks; speakIdx = 0;
  const token = ++speakToken;
  const v = arVoice();
  const playChunk = () => {
    if(token !== speakToken) return; // الـqueue اتلغى
    if(speakIdx >= speakQueue.length){
      speaking=false; dom.btnSpeak.disabled=false; dom.btnStopSpeak.disabled=true;
      toast('انتهت القراءة ✓'); return;
    }
    const u = new SpeechSynthesisUtterance(speakQueue[speakIdx]);
    u.lang = v ? v.lang : 'ar-EG';
    u.rate = 0.95; u.pitch = 1;
    if(v) u.voice = v;
    u.onend  = () => { if(token !== speakToken) return; speakIdx++; playChunk(); };
    u.onerror = () => { if(token !== speakToken) return; speaking=false; dom.btnSpeak.disabled=false; dom.btnStopSpeak.disabled=true; toast('فيه مشكلة في القراءة'); };
    window.speechSynthesis.speak(u);
  };
  setTimeout(playChunk, 80); // تأخير بسيط بعد cancel() علشان متتسابقش (Chrome)
  speaking = true; dom.btnSpeak.disabled = true; dom.btnStopSpeak.disabled = false;
  toast('🔊 بيقرا... (' + chunks.length + ' جملة)');
}
function stopSpeak(){
  if('speechSynthesis' in window) window.speechSynthesis.cancel();
  speakToken++; // يبطل أي queue شغّال
  speaking = false; dom.btnSpeak.disabled = false; dom.btnStopSpeak.disabled = true;
}

// ============================================================
//  PDF متعدد الصفحات (pdf-lib)
// ============================================================
function addPage(){
  if(!state.base){ toast('اختار صورة الأول'); return; }
  dom.canvas.toBlob(async (blob) => {
    if(!blob){ toast('تعذّر إضافة الصفحة'); return; }
    const dataURL = await blobToDataURL(blob);
    state.pages.push({ id: Date.now()+Math.random(), dataURL, w: dom.canvas.width, h: dom.canvas.height });
    renderPages();
    toast('➕ اتضافت صفحة');
  }, 'image/jpeg', 0.92);
}
function renderPages(){
  dom.pagesTray.innerHTML = '';
  dom.pageCount.textContent = state.pages.length + ' صفحة';
  if(state.pages.length === 0){
    const hint = document.createElement('div');
    hint.className = 'empty-hint';
    hint.textContent = 'اضغط «ضيف الصورة الحالية كصفحة»، رتّب الصفحات أو امسحها، وبعدين نزّلها PDF واحد.';
    dom.pagesTray.appendChild(hint);
    return;
  }
  state.pages.forEach((p, i) => {
    const card = document.createElement('div');
    card.className = 'page-thumb';
    card.innerHTML =
      `<img src="${p.dataURL}" alt="صفحة ${i+1}">` +
      `<button class="thumb-del" title="امسح">×</button>` +
      `<div class="thumb-idx">${i+1}</div>` +
      `<div class="thumb-move"><button class="mv-l" title="حرّك لليسار">◀</button><button class="mv-r" title="حرّك لليمين">▶</button></div>`;
    card.querySelector('.thumb-del').addEventListener('click', () => { state.pages.splice(i,1); renderPages(); });
    card.querySelector('.mv-l').addEventListener('click', () => movePage(i, i-1));
    card.querySelector('.mv-r').addEventListener('click', () => movePage(i, i+1));
    dom.pagesTray.appendChild(card);
  });
}
function movePage(from, to){
  if(to < 0 || to >= state.pages.length) return;
  const [it] = state.pages.splice(from, 1);
  state.pages.splice(to, 0, it);
  renderPages();
}
async function downloadPDF(){
  if(state.pages.length === 0){ toast('ضيف صفحة واحدة على الأقل'); return; }
  if(typeof PDFLib === 'undefined'){ toast('مكتبة PDF لسه بتحمّل — استنى ثواني'); return; }
  dom.btnPdf.disabled = true; dom.btnPdf.textContent = '⏳ بيجهّز الـPDF...';
  try{
    const { PDFDocument } = PDFLib;
    const doc = await PDFDocument.create();
    const sizes = { a4:[595.28,841.89], letter:[612,792] };
    for(const p of state.pages){
      const bytes = await (await fetch(p.dataURL)).arrayBuffer();
      const img = await doc.embedJpg(bytes);
      const size = dom.pageSize.value;
      let pw, ph, margin;
      if(size === 'fit'){ pw = p.w; ph = p.h; margin = 0; }
      else { [pw, ph] = sizes[size]; margin = 24; }
      const page = doc.addPage([pw, ph]);
      const maxW = pw - 2*margin, maxH = ph - 2*margin;
      const scale = Math.min(maxW / p.w, maxH / p.h);
      const dw = p.w * scale, dh = p.h * scale;
      page.drawImage(img, { x:(pw-dw)/2, y:(ph-dh)/2, width:dw, height:dh });
    }
    const out = await doc.save();
    saveBlob(new Blob([out], { type:'application/pdf' }), `${CONFIG.downloadPrefix}-pdf-${Date.now()}.pdf`);
    toast('📑 اتتنزّل PDF');
  }catch(e){
    console.error(e);
    toast('تعذّر إنشاء PDF: ' + (e && e.message ? e.message : 'حاول تاني'));
  }finally{
    dom.btnPdf.disabled = false; dom.btnPdf.textContent = '⬇️ نزّل PDF';
  }
}

// ============================================================
//  كشف تلقائي للمستند — pure Canvas (ممنوع OpenCV.js للموبايل)
//  الخطوات: صغّر → رمادي → blur → Sobel → threshold →
//  ابحث عن أكبر رباعي (scanline + refine) → اربط بـperspCorners → applyPersp
// ============================================================

// Box blur بسيط (نصف القطر r) — sliding window O(n)
function boxBlur(src, w, h, r){
  const tmp = new Float32Array(w * h);
  const out = new Float32Array(w * h);
  const d = r * 2 + 1;
  // blur أفقي
  for(let y = 0; y < h; y++){
    let sum = 0;
    const row = y * w;
    for(let x = -r; x <= r; x++) sum += src[row + clamp(x, 0, w-1)];
    for(let x = 0; x < w; x++){
      tmp[row + x] = sum / d;
      sum += src[row + clamp(x + r + 1, 0, w-1)] - src[row + clamp(x - r, 0, w-1)];
    }
  }
  // blur رأسي
  for(let x = 0; x < w; x++){
    let sum = 0;
    for(let y = -r; y <= r; y++) sum += tmp[clamp(y, 0, h-1) * w + x];
    for(let y = 0; y < h; y++){
      out[y * w + x] = sum / d;
      sum += tmp[clamp(y + r + 1, 0, h-1) * w + x] - tmp[clamp(y - r, 0, h-1) * w + x];
    }
  }
  return out;
}

// Sobel لكشف الحواف — يرجّع مصفوفة magnitude
function sobelEdges(src, w, h){
  const out = new Uint8ClampedArray(w * h);
  for(let y = 1; y < h - 1; y++){
    for(let x = 1; x < w - 1; x++){
      const i = y * w + x;
      // Sobel X
      const gx = -src[i - w - 1] - 2 * src[i - 1] - src[i + w - 1]
                 + src[i - w + 1] + 2 * src[i + 1] + src[i + w + 1];
      // Sobel Y
      const gy = -src[i - w - 1] - 2 * src[i - w] - src[i - w + 1]
                 + src[i + w - 1] + 2 * src[i + w] + src[i + w + 1];
      out[i] = Math.min(255, Math.abs(gx) + Math.abs(gy));
    }
  }
  return out;
}

// ابحث عن أكبر رباعي مضلّع من خريطة الحواف الثنائية
function findDocumentCorners(binary, w, h){
  // اجمع الحواف لكل صف وكل عمود
  const rowSum = new Float32Array(h);
  const colSum = new Float32Array(w);
  for(let y = 0; y < h; y++){
    for(let x = 0; x < w; x++){
      const v = binary[y * w + x];
      rowSum[y] += v;
      colSum[x] += v;
    }
  }
  // عتبة دنيا — حد edges لاعتبار الصف/العمود به حواف
  const minEdges = 3;
  // ابحث عن الحدود الأربعة (أول/آخر صف/عمود به كثافة حواف)
  let top = -1, bottom = -1, left = -1, right = -1;
  for(let y = 0; y < h; y++){ if(rowSum[y] >= minEdges){ top = y; break; } }
  for(let y = h - 1; y >= 0; y--){ if(rowSum[y] >= minEdges){ bottom = y; break; } }
  for(let x = 0; x < w; x++){ if(colSum[x] >= minEdges){ left = x; break; } }
  for(let x = w - 1; x >= 0; x--){ if(colSum[x] >= minEdges){ right = x; break; } }
  if(top < 0 || bottom < 0 || left < 0 || right < 0) return null;
  if(right - left < w * 0.15 || bottom - top < h * 0.15) return null;
  // ابحث عن الزوايا الفعلية بمسح من كل ركن ناحية المركز
  const tl = refineCorner(binary, w, h, left, top, 1, 1);
  const tr = refineCorner(binary, w, h, right, top, -1, 1);
  const bl = refineCorner(binary, w, h, left, bottom, 1, -1);
  const br = refineCorner(binary, w, h, right, bottom, -1, -1);
  // ترتيب: أعلى-يسار، أعلى-يمين، أسفل-يمين، أسفل-يسار
  return [tl, tr, br, bl];
}

// ابحث عن أقوى نقطة حافة بالقرب من (startX,startY) باتجاه (dx,dy)
function refineCorner(binary, w, h, startX, startY, dx, dy){
  const searchR = Math.max(8, Math.floor(Math.min(w, h) * 0.15));
  let bestX = startX, bestY = startY, bestScore = 0;
  const r = 3; // نصف قطر نافذة جمع الحواف
  for(let oy = 0; oy < searchR; oy++){
    for(let ox = 0; ox < searchR; ox++){
      const x = startX + dx * ox, y = startY + dy * oy;
      if(x < 0 || x >= w || y < 0 || y >= h) continue;
      let score = 0;
      for(let ny = -r; ny <= r; ny++){
        for(let nx = -r; nx <= r; nx++){
          const px = x + nx, py = y + ny;
          if(px >= 0 && px < w && py >= 0 && py < h) score += binary[py * w + px];
        }
      }
      if(score > bestScore){ bestScore = score; bestX = x; bestY = y; }
    }
  }
  return { x: bestX, y: bestY };
}

// الدالة الرئيسية للكشف التلقائي
function autoDetectDoc(){
  if(!state.base){ toast('اختار صورة الأول'); return; }
  // ١. صغّر الصورة لـ~300px
  const smallMax = 300;
  const sw = state.baseW, sh = state.baseH;
  const scale = smallMax / Math.max(sw, sh);
  const dw = Math.max(1, Math.round(sw * scale));
  const dh = Math.max(1, Math.round(sh * scale));
  const sc = document.createElement('canvas');
  sc.width = dw; sc.height = dh;
  const sctx = sc.getContext('2d');
  sctx.drawImage(state.base, 0, 0, dw, dh);
  // ٢. رمادي
  const imgData = sctx.getImageData(0, 0, dw, dh);
  const data = imgData.data;
  const gray = new Float32Array(dw * dh);
  for(let i = 0; i < dw * dh; i++){
    const j = i * 4;
    gray[i] = 0.299 * data[j] + 0.587 * data[j+1] + 0.114 * data[j+2];
  }
  // ٣. Box blur لتنعيم الضوضاء
  const blurred = boxBlur(gray, dw, dh, 1);
  // ٤. Sobel لكشف الحواف
  const edges = sobelEdges(blurred, dw, dh);
  // ٥. Threshold للحصول على خريطة ثنائية
  const edgeThresh = 60;
  const binary = new Uint8Array(dw * dh);
  for(let i = 0; i < edges.length; i++) binary[i] = edges[i] > edgeThresh ? 1 : 0;
  // ٦. ابحث عن أكبر رباعي مضلّع
  const corners = findDocumentCorners(binary, dw, dh);
  if(!corners){
    toast('ماقدرش ألاقي حدود واضحة — ارسمها يدويًا بـ«تصحيح المنظور»');
    return;
  }
  // ٧. اربط النتائج بمقاييس الصورة الأصلية
  const invScale = 1 / scale;
  state.perspCorners = corners.map(c => ({
    x: clamp(c.x * invScale, 0, sw),
    y: clamp(c.y * invScale, 0, sh)
  }));
  // ٨. ادخل وضع المنظور واعرض النتيجة
  state.perspMode = true;
  state.perspDrag = -1;
  setEditingEnabled(false);
  dom.btnPerspApply.disabled = false;
  dom.btnPerspCancel.disabled = false;
  dom.btnPersp.classList.add('active');
  dom.stageHint.textContent = 'كشف تلقائي — راجع الزوايا واضغط «تطبيق»';
  renderPersp();
  toast('🔍 اتكشف المستند — راجع الزوايا');
}

// ============================================================
//  التعليقات / التوقيع — وضع الرسم فوق الـcanvas
// ============================================================

// اطبق التحويلات الحالية على الـbase (bake) عشان التعليقات تترسم
// في نفس إحداثيات الصورة الأساسية
function bakeTransforms(){
  if(state.rotate90 || state.fineRot || state.bri !== 100 || state.con !== 100 ||
     state.sat !== 100 || state.bw || state.colorMode !== 'color'){
    const w = dom.canvas.width, h = dom.canvas.height;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    c.getContext('2d').drawImage(dom.canvas, 0, 0);
    state.base = c; state.baseW = w; state.baseH = h;
    state.rotate90 = 0; state.fineRot = 0;
    state.bri = 100; state.con = 100; state.sat = 100; state.bw = false;
    state.colorMode = 'color';
    // تحديث الواجهة
    if(dom.rotFine){ dom.rotFine.value = 0; dom.rotVal.textContent = '0°'; }
    if(dom.bri){ dom.bri.value = 100; dom.con.value = 100; dom.sat.value = 100; }
    if(dom.briVal){ dom.briVal.textContent = '100%'; dom.conVal.textContent = '100%'; dom.satVal.textContent = '100%'; }
    if(dom.btnBW) dom.btnBW.classList.remove('active');
    if(dom.btnBefore) dom.btnBefore.classList.remove('active');
    updateColorModeUI();
  }
}

function enterAnnotate(){
  if(!state.base) return;
  if(state.perspMode) exitPersp();
  if(state.cropMode) exitCropMode();
  bakeTransforms(); // اطبق التحويلات الحالية
  state.annotateMode = true;
  state.annoTextMode = false;
  setEditingEnabled(false);
  dom.btnAnnotate.classList.add('active');
  if(dom.annotateBar) dom.annotateBar.classList.remove('hidden');
  dom.stageHint.textContent = 'ارسم أو أضف نص فوق المستند';
  dom.stage.style.cursor = 'crosshair';
  render();
}

function exitAnnotate(){
  state.annotateMode = false;
  state.annoTextMode = false;
  state.currentStroke = null;
  setEditingEnabled(true);
  if(dom.btnAnnotate) dom.btnAnnotate.classList.remove('active');
  if(dom.btnAnnoText) dom.btnAnnoText.classList.remove('active');
  if(dom.annotateBar) dom.annotateBar.classList.add('hidden');
  dom.stageHint.textContent = '';
  dom.stage.style.cursor = '';
  render();
}

// ارسم طبقة التعليقات فوق الصورة
function drawAnnotations(){
  if(!state.annotations || state.annotations.length === 0) return;
  ctx.save();
  for(const ann of state.annotations){
    if(ann.type === 'stroke'){
      ctx.strokeStyle = ann.color;
      ctx.lineWidth = ann.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const pts = ann.points;
      if(pts.length < 2){
        // نقطة واحدة — ارسم دائرة صغيرة
        ctx.beginPath();
        ctx.arc(pts[0].x, pts[0].y, ann.width / 2, 0, Math.PI * 2);
        ctx.fillStyle = ann.color;
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for(let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();
      }
    } else if(ann.type === 'text'){
      ctx.font = ann.fontSize + 'px Cairo, sans-serif';
      ctx.textBaseline = 'top';
      const metrics = ctx.measureText(ann.text);
      // خلفية شفافة خلف النص
      ctx.fillStyle = 'rgba(6,12,26,.72)';
      ctx.fillRect(ann.x - 5, ann.y - 4, metrics.width + 10, ann.fontSize + 8);
      ctx.fillStyle = ann.color;
      ctx.fillText(ann.text, ann.x, ann.y);
    }
  }
  ctx.restore();
}

// أحداث الرسم (التعليقات) — على الـcanvas
function bindAnnotateEvents(){
  const aDown = (e) => {
    if(!state.annotateMode) return;
    e.preventDefault();
    if(state.annoTextMode){
      // وضع النص: انقر لوضع التعليق النصي
      const p = toCanvasCoords(e);
      const text = prompt('اكتب التعليق:');
      if(text){
        state.annotations.push({
          type: 'text', text, x: p.x, y: p.y,
          color: state.annoColor, fontSize: 24
        });
        render();
      }
      return;
    }
    // وضع الرسم الحر
    const p = toCanvasCoords(e);
    state.currentStroke = {
      type: 'stroke', points: [p],
      color: state.annoColor, width: state.annoWidth
    };
    state.annotations.push(state.currentStroke);
    render();
  };
  let aRaf = 0;
  const aMove = (e) => {
    if(!state.annotateMode || !state.currentStroke || state.annoTextMode) return;
    e.preventDefault();
    const p = toCanvasCoords(e);
    state.currentStroke.points.push(p);
    cancelAnimationFrame(aRaf);
    aRaf = requestAnimationFrame(render);
  };
  const aUp = () => {
    if(state.annotateMode) state.currentStroke = null;
  };
  dom.canvas.addEventListener('pointerdown', aDown);
  dom.canvas.addEventListener('pointermove', aMove);
  window.addEventListener('pointerup', aUp);
  dom.canvas.addEventListener('touchstart', aDown, {passive:false});
  dom.canvas.addEventListener('touchmove', aMove, {passive:false});
}

// ============================================================
//  حفظ محلي (IndexedDB) — قاعدة بيانات scan-macaron
// ============================================================
let scanDB = null;

function openScanDB(){
  return new Promise((resolve, reject) => {
    if(scanDB){ resolve(scanDB); return; }
    const req = indexedDB.open('scan-macaron', 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if(!db.objectStoreNames.contains('scans')){
        db.createObjectStore('scans', { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = (e) => { scanDB = e.target.result; resolve(scanDB); };
    req.onerror = (e) => reject(e.target.error);
  });
}

// احفظ المستند الحالي في IndexedDB
async function saveScan(){
  if(!state.base){ toast('اختار صورة الأول'); return; }
  try{
    const db = await openScanDB();
    // الصورة الكاملة (للفتح لاحقًا) — JPEG بجودة 85
    const fc = document.createElement('canvas');
    fc.width = state.baseW; fc.height = state.baseH;
    fc.getContext('2d').drawImage(state.base, 0, 0);
    const image = fc.toDataURL('image/jpeg', 0.85);
    // مصغّر ~300px (لعرض السجل)
    const maxThumb = 300;
    const ts = Math.min(1, maxThumb / Math.max(state.baseW, state.baseH));
    const tw = Math.round(state.baseW * ts), th = Math.round(state.baseH * ts);
    const tc = document.createElement('canvas');
    tc.width = tw; tc.height = th;
    tc.getContext('2d').drawImage(state.base, 0, 0, tw, th);
    const thumb = tc.toDataURL('image/jpeg', 0.7);
    const text = dom.ocrText ? (dom.ocrText.value || '') : '';
    const date = Date.now();
    const tx = db.transaction('scans', 'readwrite');
    const store = tx.objectStore('scans');
    const req = store.add({ thumb, image, text, date, w: state.baseW, h: state.baseH });
    req.onsuccess = () => { toast('💾 اتحفظ المستند'); renderHistory(); };
    req.onerror = () => toast('تعذّر الحفظ');
  }catch(e){
    console.error(e);
    toast('تعذّر فتح قاعدة البيانات');
  }
}

// اعرض السجل (الأحدث أولًا)
async function renderHistory(){
  if(!dom.historyTray) return;
  try{
    const db = await openScanDB();
    const tx = db.transaction('scans', 'readonly');
    const store = tx.objectStore('scans');
    const req = store.getAll();
    req.onsuccess = () => {
      const items = (req.result || []).sort((a, b) => b.date - a.date);
      dom.historyTray.innerHTML = '';
      if(items.length === 0){
        const hint = document.createElement('div');
        hint.className = 'empty-hint';
        hint.textContent = 'لسه مفيش مستندات محفوظة. استخدم زر «احفظ المستند» في قسم OCR.';
        dom.historyTray.appendChild(hint);
        return;
      }
      for(const item of items){
        const card = document.createElement('div');
        card.className = 'history-thumb';
        const dateStr = new Date(item.date).toLocaleDateString('ar-EG', {
          year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'
        });
        card.innerHTML =
          '<img src="' + item.thumb + '" alt="مستند محفوظ">' +
          '<button class="hist-del" title="امسح">🗑️</button>' +
          '<button class="hist-open" title="افتح">📂</button>' +
          '<div class="hist-info"><b>' + dateStr + '</b><br>' + item.w + '×' + item.h + 'px</div>';
        card.querySelector('.hist-open').addEventListener('click', () => openScan(item.id));
        card.querySelector('.hist-del').addEventListener('click', () => deleteScan(item.id));
        dom.historyTray.appendChild(card);
      }
    };
  }catch(e){ console.error(e); }
}

// افتح مستند محفوظ — يعيد تحميل الصورة للكانفس
async function openScan(id){
  try{
    const db = await openScanDB();
    const tx = db.transaction('scans', 'readonly');
    const store = tx.objectStore('scans');
    const req = store.get(id);
    req.onsuccess = () => {
      const item = req.result;
      if(!item || !item.image){ toast('المستند غير موجود'); return; }
      const img = new Image();
      img.onload = () => {
        setBaseFromImage(img);
        resetTransforms();
        state.annotations = []; state.currentStroke = null;
        render();
        show(dom.editorCard); show(dom.exportCard); show(dom.ocrCard); show(dom.pdfCard);
        if(item.text && dom.ocrText) dom.ocrText.value = item.text;
        dom.canvas.scrollIntoView({ behavior:'smooth', block:'center' });
        toast('📂 اتفتح المستند');
      };
      img.onerror = () => toast('تعذّر فتح الصورة');
      img.src = item.image;
    };
  }catch(e){ toast('تعذّر فتح المستند'); }
}

// امسح مستند محفوظ
async function deleteScan(id){
  try{
    const db = await openScanDB();
    const tx = db.transaction('scans', 'readwrite');
    const store = tx.objectStore('scans');
    const req = store.delete(id);
    req.onsuccess = () => { toast('🗑️ اتمسح'); renderHistory(); };
    req.onerror = () => toast('تعذّر الحذف');
  }catch(e){ toast('تعذّر الحذف'); }
}

// ===== Toast =====
let toastT;
function toast(msg){
  let t = document.getElementById('toast');
  if(!t){ t = document.createElement('div'); t.id='toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.style.cssText = 'position:fixed;inset-block-end:20px;inset-inline:0;margin:auto;max-width:90%;width:fit-content;background:#162847;color:#e8eef8;border:1px solid #e6c258;padding:11px 18px;border-radius:30px;font-family:Cairo,sans-serif;font-weight:700;font-size:14px;box-shadow:0 8px 24px rgba(0,0,0,.4);z-index:200;opacity:0;transition:opacity .2s';
  requestAnimationFrame(()=>t.style.opacity='1');
  clearTimeout(toastT); toastT = setTimeout(()=>{ t.style.opacity='0'; }, 1800);
}

// ===== ربط الأحداث =====
function bind(){
  // رفع
  dom.dropzone.addEventListener('click', ()=> dom.fileInput.click());
  dom.dropzone.addEventListener('keydown', (e)=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); dom.fileInput.click(); } });
  dom.dropzone.addEventListener('dragover', (e)=>{ e.preventDefault(); dom.dropzone.classList.add('focus'); });
  dom.dropzone.addEventListener('dragleave', ()=> dom.dropzone.classList.remove('focus'));
  dom.dropzone.addEventListener('drop', (e)=>{ e.preventDefault(); dom.dropzone.classList.remove('focus'); if(e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0]); });
  dom.fileInput.addEventListener('change', (e)=>{ if(e.target.files[0]) loadFile(e.target.files[0]); });
  dom.btnPick.addEventListener('click', ()=> dom.fileInput.click());
  dom.btnCamera.addEventListener('click', ()=> dom.cameraInput.click());
  dom.cameraInput.addEventListener('change', (e)=>{ if(e.target.files[0]) loadFile(e.target.files[0]); });
  window.addEventListener('paste', (e)=>{ const it = (e.clipboardData||{}).items; if(it) for(const i of it){ if(i.type && i.type.startsWith('image/')){ loadFile(i.getAsFile()); break; } } });

  // المسح السحري
  dom.btnPersp.addEventListener('click', ()=> state.perspMode ? exitPersp() : enterPersp());
  dom.btnPerspApply.addEventListener('click', applyPersp);
  dom.btnPerspCancel.addEventListener('click', exitPersp);
  dom.btnDoc.addEventListener('click', ()=> applyToBase(documentFilter));
  dom.btnWhite.addEventListener('click', ()=> applyToBase(whitenFilter));
  dom.btnVivid.addEventListener('click', ()=> applyToBase(vividFilter));
  dom.btnSharpen.addEventListener('click', ()=> applyToBase(sharpenFilter));

  // المقابض (تصحيح المنظور) — على الـcanvas
  const pDown=(e)=>{ if(!state.perspMode) return; e.preventDefault(); const p=toCanvasCoords(e); const r=Math.max(14, state.baseW*0.03); let best=-1,bd=1e9; for(let i=0;i<4;i++){ const d=Math.hypot(p.x-state.perspCorners[i].x, p.y-state.perspCorners[i].y); if(d<bd){bd=d;best=i;} } if(bd<=r) state.perspDrag=best; };
  const pMove=(e)=>{ if(!state.perspMode||state.perspDrag<0) return; e.preventDefault(); const p=toCanvasCoords(e); state.perspCorners[state.perspDrag]={x:clamp(p.x,0,state.baseW),y:clamp(p.y,0,state.baseH)}; renderPersp(); };
  const pUp=()=>{ if(state.perspMode) state.perspDrag=-1; };
  dom.canvas.addEventListener('pointerdown', pDown);
  dom.canvas.addEventListener('pointermove', pMove);
  window.addEventListener('pointerup', pUp);
  dom.canvas.addEventListener('touchstart', pDown, {passive:false});
  dom.canvas.addEventListener('touchmove', pMove, {passive:false});

  // تدوير
  dom.btnRotL.addEventListener('click', ()=>{ state.rotate90 = (state.rotate90+3)%4; render(); });
  dom.btnRotR.addEventListener('click', ()=>{ state.rotate90 = (state.rotate90+1)%4; render(); });
  dom.rotFine.addEventListener('input', ()=>{ state.fineRot = +dom.rotFine.value; dom.rotVal.textContent = state.fineRot+'°'; render(); });

  // تحسين
  bindSlider(dom.bri, dom.briVal, 'bri');
  bindSlider(dom.con, dom.conVal, 'con');
  bindSlider(dom.sat, dom.satVal, 'sat');
  dom.btnAuto.addEventListener('click', autoEnhance);
  dom.btnBW.addEventListener('click', ()=>{ setColorMode(state.bw ? 'color' : 'bw'); });
  // المرحلة ٥ — وضع اللون + التحسين الفوري
  if(dom.btnEnhance) dom.btnEnhance.addEventListener('click', oneTapEnhance);
  if(dom.btnModeMagic) dom.btnModeMagic.addEventListener('click', ()=> setColorMode('magic'));
  if(dom.btnModeColor) dom.btnModeColor.addEventListener('click', ()=> setColorMode('color'));
  if(dom.btnModeGray) dom.btnModeGray.addEventListener('click', ()=> setColorMode('gray'));
  if(dom.btnModeBW) dom.btnModeBW.addEventListener('click', ()=> setColorMode('bw'));

  // قص
  dom.btnCrop.addEventListener('click', ()=> state.cropMode ? exitCropMode() : enterCropMode());
  dom.btnCropApply.addEventListener('click', applyCrop);
  dom.btnCropCancel.addEventListener('click', ()=>{ state.cropRect=null; render(); dom.btnCropApply.disabled=true; });
  const co = dom.cropOverlay;
  const down = (e)=>{ if(!state.cropMode) return; e.preventDefault(); state.dragging=true; const p=toCanvasCoords(e); state.dragStart=p; state.cropRect={x:p.x,y:p.y,w:0,h:0}; render(); };
  const move = (e)=>{ if(!state.dragging||!state.cropMode) return; e.preventDefault(); const p=toCanvasCoords(e); const s=state.dragStart; state.cropRect={x:Math.min(s.x,p.x),y:Math.min(s.y,p.y),w:Math.abs(p.x-s.x),h:Math.abs(p.y-s.y)}; render(); };
  const up = ()=>{ if(!state.dragging) return; state.dragging=false; const r=state.cropRect; if(r && r.w>=8 && r.h>=8){ dom.btnCropApply.disabled=false; dom.stageHint.textContent='تم رسم المربع — اضغط «تطبيق القص»'; } else { state.cropRect=null; render(); } };
  co.addEventListener('pointerdown', down);
  co.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  co.addEventListener('touchstart', down, {passive:false});
  co.addEventListener('touchmove', move, {passive:false});

  // قبل/بعد + إعادة
  dom.btnBefore.addEventListener('click', ()=>{ state.showOriginal = !state.showOriginal; dom.btnBefore.classList.toggle('active', state.showOriginal); render(); });
  dom.btnReset.addEventListener('click', ()=>{ resetTransforms(); render(); toast('↩️ اترجّع للأصل'); });

  // تصدير الصورة
  dom.fmt.addEventListener('change', ()=> dom.qualityField.classList.toggle('hidden', dom.fmt.value==='image/png'));
  dom.btnDownload.addEventListener('click', download);

  // OCR
  dom.btnOCR.addEventListener('click', runOCR);
  dom.btnCopy.addEventListener('click', copyText);
  dom.btnTxt.addEventListener('click', downloadTxt);
  dom.btnSpeak.addEventListener('click', speak);
  dom.btnStopSpeak.addEventListener('click', stopSpeak);

  // PDF
  dom.btnAddPage.addEventListener('click', addPage);
  dom.btnPdf.addEventListener('click', downloadPDF);

  // كشف تلقائي
  if(dom.btnAutoDetect) dom.btnAutoDetect.addEventListener('click', autoDetectDoc);

  // تعليقات / توقيع
  if(dom.btnAnnotate) dom.btnAnnotate.addEventListener('click', () => state.annotateMode ? exitAnnotate() : enterAnnotate());
  if(dom.btnAnnoText) dom.btnAnnoText.addEventListener('click', () => {
    if(!state.annotateMode){ enterAnnotate(); }
    state.annoTextMode = !state.annoTextMode;
    dom.btnAnnoText.classList.toggle('active', state.annoTextMode);
    if(dom.annoModeHint) dom.annoModeHint.textContent = state.annoTextMode
      ? 'اضغط على الصورة لوضع نص.'
      : 'ارسم بإصبعك/القلم فوق الصورة. اضغط «نص» لإضافة ملاحظة مكتوبة.';
  });
  if(dom.btnAnnoClear) dom.btnAnnoClear.addEventListener('click', () => {
    state.annotations = []; state.currentStroke = null; render();
    toast('🗑️ اتمسحت التعليقات');
  });
  if(dom.btnAnnoExit) dom.btnAnnoExit.addEventListener('click', exitAnnotate);
  if(dom.annoColor) dom.annoColor.addEventListener('input', () => { state.annoColor = dom.annoColor.value; });
  if(dom.annoWidth) dom.annoWidth.addEventListener('input', () => { state.annoWidth = +dom.annoWidth.value; });

  // أحداث الرسم فوق الـcanvas
  bindAnnotateEvents();

  // حفظ محلي
  if(dom.btnSave) dom.btnSave.addEventListener('click', saveScan);
}
function bindSlider(slider, valEl, key){
  let raf=0;
  slider.addEventListener('input', ()=>{
    const v = +slider.value; state[key] = v; valEl.textContent = v+'%';
    cancelAnimationFrame(raf); raf = requestAnimationFrame(render);
  });
}

// ===== Init =====
bind();
renderHistory(); // حمّل السجل المحفوظ عند بدء التشغيل
if('serviceWorker' in navigator){
  window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
}

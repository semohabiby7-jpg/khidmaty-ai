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
  btnAutoCapture: $('btnAutoCapture'), autoCapVideo: $('autoCapVideo'),
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
  btnModeBoard: $('btnModeBoard'), btnSmartBoard: $('btnSmartBoard'),
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
  btnAnalyzeDoc: $('btnAnalyzeDoc'), docInfo: $('docInfo'),
  // سجل / أرشيف
  historyCard: $('historyCard'), historyTray: $('historyTray'),
  // OCR
  ocrLang: $('ocrLang'), btnOCR: $('btnOCR'),
  ocrProgress: $('ocrProgress'), ocrBar: $('ocrBar'), ocrPct: $('ocrPct'), ocrText: $('ocrText'),
  btnCopy: $('btnCopy'), btnTxt: $('btnTxt'), btnSpeak: $('btnSpeak'), btnStopSpeak: $('btnStopSpeak'),
  btnPauseSpeak: $('btnPauseSpeak'), btnPrevChunk: $('btnPrevChunk'), btnNextChunk: $('btnNextChunk'),
  speakControls: $('speakControls'), speakProgress: $('speakProgress'),
  ttsRate: $('ttsRate'), ttsRateVal: $('ttsRateVal'), btnExportAudio: $('btnExportAudio'),
  btnSpeakAll: $('btnSpeakAll'),
  btnTranslate: $('btnTranslate'), translateLang: $('translateLang'), transText: $('transText'), btnCopyTrans: $('btnCopyTrans'),
  // 🔍 البحث العميق (Deep Search)
  searchQuery: $('searchQuery'), btnSearch: $('btnSearch'), btnSearchClear: $('btnSearchClear'), searchCount: $('searchCount'), btnSearchPrev: $('btnSearchPrev'), btnSearchNext: $('btnSearchNext'), searchPreview: $('searchPreview'),
  // كشف التزوير (Forgery Detection)
  btnForgery: $('btnForgery'), btnForgeryClear: $('btnForgeryClear'), forgeryProgress: $('forgeryProgress'), forgeryBar: $('forgeryBar'), forgeryPct: $('forgeryPct'), forgeryResult: $('forgeryResult'), forgeryVerdict: $('forgeryVerdict'), elaCanvas: $('elaCanvas'), noiseCanvas: $('noiseCanvas'), forgeryReasons: $('forgeryReasons'),
  btnTheme: $('btnTheme'),
  btnA11y: $('btnA11y'),
  btnInstallApp: $('btnInstallApp'),
  // الصوت الطبيعي (Cloud TTS)
  voiceCard: $('voiceCard'), ttsKey: $('ttsKey'), ttsVoice: $('ttsVoice'),
  btnTtsSave: $('btnTtsSave'), btnTtsTest: $('btnTtsTest'), btnTtsClear: $('btnTtsClear'), ttsStatus: $('ttsStatus'),
  // PDF
  btnAddPage: $('btnAddPage'), pageCount: $('pageCount'), pagesTray: $('pagesTray'), pageSize: $('pageSize'), btnPdf: $('btnPdf'),
  // ميزات متقدمة (Batch + ID Card + Ultra-Compression + Book Flatten)
  btnBatch: $('btnBatch'), btnIdCard: $('btnIdCard'), idCardStatus: $('idCardStatus'),
  chkCompress: $('chkCompress'), btnFlatten: $('btnFlatten'),
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
    show(dom.editorCard); show(dom.exportCard); show(dom.ocrCard); show(dom.voiceCard); show(dom.pdfCard);
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
    dom.btnModeMagic,dom.btnModeColor,dom.btnModeGray,dom.btnModeBW,dom.btnModeBoard,dom.btnSmartBoard];
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
    } else if(mode === 'whiteboard'){
      // السبورة الذكية: خلفية بيضاء ناصعة + أقلام ملونة حادّة + إزالة لمعان الإضاءة
      enhanceWhiteboard(p, n, w, h);
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

// ---- Whiteboard mode (السبورة الذكية) ----
// تحسين مخصّص للسبورات/اللوحات البيضاء: خلفية بيضاء ناصعة + أقلام ملونة حادّة + إزالة لمعان الإضاءة.
const BOARD_STRETCH_LO = 0.005;
const BOARD_STRETCH_HI = 0.995;
const BOARD_BG_LUM = 0.82;    // threshold الخلفية الفاتحة
const BOARD_GLARE_LUM = 0.92; // threshold اللمعان (pixels أسطع من ٠.٩٢ = لمعان)
const BOARD_BG_SAT = 0.12;    // الخلفية = ساطعة + قليلة التشبّع
const BOARD_PEN_BOOST = 1.6;  // تشبّع الأقلام الملونة
function enhanceWhiteboard(p, n, w, h){
  // ١. contrast stretch قوي لكل قناة (0.5%-99.5%)
  for(let ch = 0; ch < 3; ch++){
    stretchChannel(p, n, ch, BOARD_STRETCH_LO, BOARD_STRETCH_HI);
  }
  // ٢. كشف الخلفية/الأقلام/اللمعان عبر HSL
  for(let i = 0; i < n; i++){
    const j = i * 4;
    const r = p[j] / 255, g = p[j+1] / 255, b = p[j+2] / 255;
    const hsl = rgb2hsl(r, g, b);
    const L = hsl[2], S = hsl[1];
    if(L > BOARD_GLARE_LUM && S < 0.08){
      // لمعان الإضاءة → أبيض ناصع
      p[j] = p[j+1] = p[j+2] = 255;
    } else if(L > BOARD_BG_LUM && S < BOARD_BG_SAT){
      // خلفية فاتحة قليلة التشبّع → أبيض ناصع
      p[j] = p[j+1] = p[j+2] = 255;
    } else {
      // قلم (غامق أو متشبّع) → زيادة التشبّع + تباين أعلى
      hsl[1] = Math.min(1, S * BOARD_PEN_BOOST);
      if(L < 0.5) hsl[2] = L * 0.82; // أغمق للأقلام الغامقة
      const rgb = hsl2rgb(hsl[0], hsl[1], hsl[2]);
      p[j] = rgb[0] * 255; p[j+1] = rgb[1] * 255; p[j+2] = rgb[2] * 255;
    }
  }
  // ٣. موازنة خلفية luminance نهائية
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
  const map = { magic: dom.btnModeMagic, color: dom.btnModeColor, gray: dom.btnModeGray, bw: dom.btnModeBW, whiteboard: dom.btnModeBoard };
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

// ---- السبورة الذكية: وضع whiteboard بضغطة واحدة ----
function smartWhiteboard(){
  if(!state.base) return;
  setColorMode('whiteboard');
  toast('🖼️ السبورة الذكية اتطبّقت');
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
    langPath: 'https://tessdata.projectnaptha.com/4.0.0_best', // أعلى دقّة للعربية (float) — «الإتقان قبل السرعة»
    logger: (m) => {
      if(!m || !m.status) return;
      const ph = OCR_PHASES[m.status];
      if(ph) setOcrProgress(ph.r[0] + (ph.r[1]-ph.r[0])*(m.progress||0), ph.t);
    },
  });
  // ضبط تقسيم الصفحة: كتلة نص واحدة + حفظ المسافات → نص أنظف للمستندات
  try{ await ocrWorker.setParameters({ tessedit_pageseg_mode: '3', preserve_interword_spaces: '1' }); }catch(e){}
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
// نسخة أصلية للـGemini Vision: تكبير 2x + PNG بلا فقدان (صورة ملونة واضحة — الـAI بيقراها أحسن من الـthresholded).
function ocrInputBlob(){
  const src = dom.canvas, MAX = 2500;
  const scale = Math.min(2, MAX / Math.max(src.width, src.height)); // تكبير لحد 2x للنص الصغير
  const w = Math.round(src.width*scale), h = Math.round(src.height*scale);
  const c = document.createElement('canvas'); c.width=w; c.height=h;
  const cc = c.getContext('2d');
  cc.imageSmoothingEnabled = true; cc.imageSmoothingQuality = 'high';
  cc.drawImage(src, 0, 0, w, h); // صورة أصلية ملونة
  return new Promise((res)=> c.toBlob(res, 'image/png'));
}
// نسخة محلية للـTesseract (fallback): رمادي + عتبة محلية (local adaptive threshold) بـintegral image.
// العتبة المحلية تحل الإضاءة غير المتساوية + الظلال = استخراج عربي أدقّ offline.
// مكافئة لـImageMagick -lat 25x25+10% — اختُبرت على ورقة فعلية (الإتقان قبل السرعة).
function ocrLocalBlob(){
  const src = dom.canvas, MAX = 2500;
  const scale = Math.min(2, MAX / Math.max(src.width, src.height));
  const w = Math.round(src.width*scale), h = Math.round(src.height*scale);
  const c = document.createElement('canvas'); c.width=w; c.height=h;
  const cc = c.getContext('2d', { willReadFrequently: true });
  cc.imageSmoothingEnabled = true; cc.imageSmoothingQuality = 'high';
  cc.filter = 'grayscale(1)';
  cc.drawImage(src, 0, 0, w, h);
  cc.filter = 'none';
  const img = cc.getImageData(0,0,w,h), d = img.data;
  const WIN = 25, HALF = WIN>>1, OFF = 0.10*255;
  const I = new Float64Array((w+1)*(h+1));
  for(let y=0;y<h;y++){ let rs=0;
    for(let x=0;x<w;x++){ rs += d[(y*w+x)*4];
      I[(y+1)*(w+1)+(x+1)] = I[y*(w+1)+(x+1)] + rs; } }
  for(let y=0;y<h;y++){
    for(let x=0;x<w;x++){
      const x1=Math.max(0,x-HALF), x2=Math.min(w,x+HALF+1);
      const y1=Math.max(0,y-HALF), y2=Math.min(h,y+HALF+1);
      const area=(x2-x1)*(y2-y1);
      const sum=I[y2*(w+1)+x2]-I[y1*(w+1)+x2]-I[y2*(w+1)+x1]+I[y1*(w+1)+x1];
      const mean=sum/area;
      const idx=(y*w+x)*4;
      const v = d[idx] < (mean - OFF) ? 0 : 255;
      d[idx]=d[idx+1]=d[idx+2]=v;
    } }
  cc.putImageData(img,0,0);
  return new Promise((res)=> c.toBlob(res, 'image/png'));
}
// ---- الترجمة الفورية (Google Translate — مجاني، بدون مفتاح) ----
// «الفورية»: ترجم نص الـOCR المُستخرَج لأي لغة بضغطة. محتاجة إنترنت (النص بيتُرسل لخدمة ترجمة مجانية).
async function translateText(){
  const t = (dom.ocrText.value || '').trim();
  if(!t){ toast('🔍 استخرج النص الأول'); return; }
  const tl = dom.translateLang.value;
  const btn = dom.btnTranslate;
  if(btn) btn.disabled = true;
  if(dom.transText) dom.transText.value = '🌐 بيتُرجم…';
  try{
    const url = 'https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=auto&tl=' + encodeURIComponent(tl) + '&q=' + encodeURIComponent(t);
    const r = await fetch(url);
    if(!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json();
    let out = '';
    if(Array.isArray(j)){
      if(typeof j[0] === 'string') out = j[0];
      else if(Array.isArray(j[0])) for(const seg of j[0]) if(seg && seg[0]) out += seg[0];
    }
    if(dom.transText) dom.transText.value = out || 'مفيش ترجمة — حاول تاني.';
    if(dom.btnCopyTrans) dom.btnCopyTrans.disabled = !out;
  }catch(e){
    if(dom.transText) dom.transText.value = 'الترجمة فشلت (شوف الإنترنت): ' + (e && e.message ? e.message : '');
    if(dom.btnCopyTrans) dom.btnCopyTrans.disabled = true;
  }finally{
    if(btn) btn.disabled = false;
  }
}
function copyTranslation(){
  const t = dom.transText && dom.transText.value ? dom.transText.value.trim() : '';
  if(!t){ toast('مفيش ترجمة لنسخها'); return; }
  navigator.clipboard.writeText(t).then(()=> toast('📋 اتنسخ')).catch(()=> toast('تعذّر النسخ'));
}

// ---- 🔍 البحث العميق (Deep Search) — آخر ميزة في خطة الشهر ----
// ابحث في النص المُستخرج (OCR) عن كلمة/عبارة — تمييز + تنقّل + عدّاد. مجاني 100% (محلي).
const searchResults = [];   // [{start, end}]
let searchIdx = -1;          // المؤشر النشط
function escapeHtmlSrch(s){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function deepSearch(){
  const text = (dom.ocrText && dom.ocrText.value) ? dom.ocrText.value : '';
  const q = (dom.searchQuery && dom.searchQuery.value) ? dom.searchQuery.value.trim() : '';
  if(!text){ toast('🔍 استخرج النص الأول'); return; }
  if(!q){ toast('✍️ اكتب كلمة للبحث'); if(dom.searchQuery) dom.searchQuery.focus(); return; }
  const hayLC = text.toLowerCase();
  const needleLC = q.toLowerCase();
  searchResults.length = 0;
  let pos = 0;
  while(true){
    const i = hayLC.indexOf(needleLC, pos);
    if(i === -1) break;
    searchResults.push({start: i, end: i + q.length});
    pos = i + q.length;
  }
  const n = searchResults.length;
  const ar = n.toLocaleString('ar-EG');
  if(dom.searchCount) dom.searchCount.textContent = ar + ' نتيجة';
  renderSearchPreview(text);
  if(dom.btnSearchPrev) dom.btnSearchPrev.disabled = (n < 2);
  if(dom.btnSearchNext) dom.btnSearchNext.disabled = (n < 2);
  if(dom.btnSearchClear) dom.btnSearchClear.disabled = false;
  if(n === 0){
    searchIdx = -1;
    toast('❌ مفيش نتائج لـ«' + q + '»');
  } else {
    searchIdx = 0;
    setActiveMatch(0);
    toast('✅ ' + ar + ' نتيجة');
  }
}

function renderSearchPreview(text){
  if(!dom.searchPreview) return;
  if(searchResults.length === 0){
    dom.searchPreview.innerHTML = '<span class="empty">مفيش نتائج مطابقة للبحث.</span>';
    dom.searchPreview.classList.remove('hidden');
    return;
  }
  let out = '';
  let cur = 0;
  for(let i=0; i<searchResults.length; i++){
    const r = searchResults[i];
    out += escapeHtmlSrch(text.slice(cur, r.start));
    out += '<mark data-idx="' + i + '" id="m' + i + '">' + escapeHtmlSrch(text.slice(r.start, r.end)) + '</mark>';
    cur = r.end;
  }
  out += escapeHtmlSrch(text.slice(cur));
  dom.searchPreview.innerHTML = out;
  dom.searchPreview.classList.remove('hidden');
}

function setActiveMatch(idx){
  const marks = dom.searchPreview ? dom.searchPreview.querySelectorAll('mark') : [];
  marks.forEach((m, i) => m.classList.toggle('active', i === idx));
  const active = dom.searchPreview ? dom.searchPreview.querySelector('#m' + idx) : null;
  if(active) active.scrollIntoView({block:'center', behavior:'smooth'});
}

function navigateSearch(dir){
  const n = searchResults.length;
  if(n === 0) return;
  searchIdx = (searchIdx + dir + n) % n;
  setActiveMatch(searchIdx);
  const r = searchResults[searchIdx];
  if(dom.ocrText){
    try{ dom.ocrText.focus(); dom.ocrText.setSelectionRange(r.start, r.end); }catch(e){}
  }
}

function clearSearch(){
  searchResults.length = 0;
  searchIdx = -1;
  if(dom.searchQuery) dom.searchQuery.value = '';
  if(dom.searchCount) dom.searchCount.textContent = '٠ نتيجة';
  if(dom.searchPreview){ dom.searchPreview.innerHTML = ''; dom.searchPreview.classList.add('hidden'); }
  if(dom.btnSearchPrev) dom.btnSearchPrev.disabled = true;
  if(dom.btnSearchNext) dom.btnSearchNext.disabled = true;
  if(dom.btnSearchClear) dom.btnSearchClear.disabled = true;
}

// ---- كشف التزوير (Forgery Detection) ----
// ELA (Error Level Analysis) + Noise Map (Laplacian) + بيانات الصورة + تقرير شامل.
// كل المعالجة على جهازك (Canvas). مجاني 100%.
function setForgeryProgress(pct){
  if(dom.forgeryBar) dom.forgeryBar.style.width = pct + '%';
  if(dom.forgeryPct) dom.forgeryPct.textContent = pct + '%';
}
function clearForgery(){
  if(dom.forgeryResult) dom.forgeryResult.classList.add('hidden');
  if(dom.elaCanvas){ const c=dom.elaCanvas.getContext('2d'); c.clearRect(0,0,dom.elaCanvas.width,dom.elaCanvas.height); }
  if(dom.noiseCanvas){ const c=dom.noiseCanvas.getContext('2d'); c.clearRect(0,0,dom.noiseCanvas.width,dom.noiseCanvas.height); }
  if(dom.forgeryVerdict) dom.forgeryVerdict.innerHTML = '';
  if(dom.forgeryReasons) dom.forgeryReasons.innerHTML = '';
  if(dom.btnForgeryClear) dom.btnForgeryClear.disabled = true;
}
async function detectForgery(){
  if(!state.base){ toast('🔍 اختار صورة الأول'); return; }
  const btn = dom.btnForgery;
  if(btn) btn.disabled = true;
  if(dom.forgeryProgress) dom.forgeryProgress.classList.remove('hidden');
  if(dom.forgeryResult) dom.forgeryResult.classList.add('hidden');
  setForgeryProgress(8);
  try{
    // حدّ الحجم للأداء
    const src = state.base;
    const maxD = 1100;
    let w = src.width, h = src.height;
    const scale = Math.min(1, maxD / Math.max(w, h));
    w = Math.max(1, Math.round(w * scale)); h = Math.max(1, Math.round(h * scale));
    const base = document.createElement('canvas');
    base.width = w; base.height = h;
    base.getContext('2d').drawImage(src, 0, 0, w, h);

    setForgeryProgress(25);
    // 1) ELA
    const ela = await elaAnalysis(base, 85);
    drawDataToCanvas(dom.elaCanvas, ela.data, w, h);
    setForgeryProgress(55);

    // 2) Noise Map (Laplacian)
    const noise = noiseMap(base);
    drawDataToCanvas(dom.noiseCanvas, noise.data, w, h);
    setForgeryProgress(80);

    // 3) بيانات الصورة
    const meta = checkMetadata();

    // 4) الحكم
    const v = computeVerdict(ela, noise, meta);
    renderForgeryVerdict(v);
    renderForgeryReasons(v, ela, noise, meta);
    setForgeryProgress(100);
    if(dom.forgeryResult) dom.forgeryResult.classList.remove('hidden');
    if(dom.btnForgeryClear) dom.btnForgeryClear.disabled = false;
  }catch(e){
    console.error('forgery', e);
    toast('فشل تحليل التزوير: ' + (e && e.message ? e.message : e));
  }finally{
    if(btn) btn.disabled = false;
    setTimeout(()=>{ if(dom.forgeryProgress) dom.forgeryProgress.classList.add('hidden'); }, 600);
  }
}
// ELA: أعيد حفظ JPEG بجودة q + أحسب الفرق pixel-by-pixel
async function elaAnalysis(srcCanvas, q){
  const dataUrl = srcCanvas.toDataURL('image/jpeg', q/100);
  const img = await new Promise((res,rej)=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=rej; i.src=dataUrl; });
  const w = srcCanvas.width, h = srcCanvas.height;
  const rc = document.createElement('canvas'); rc.width=w; rc.height=h;
  rc.getContext('2d').drawImage(img, 0, 0, w, h);
  const a = srcCanvas.getContext('2d').getImageData(0,0,w,h).data;
  const b = rc.getContext('2d').getImageData(0,0,w,h).data;
  const diff = new Float32Array(w*h);
  let sum=0, maxD=0;
  for(let p=0,i=0; p<diff.length; p++, i+=4){
    const d = (Math.abs(a[i]-b[i]) + Math.abs(a[i+1]-b[i+1]) + Math.abs(a[i+2]-b[i+2]))/3;
    diff[p] = d; sum += d; if(d>maxD) maxD=d;
  }
  const mean = sum/diff.length;
  // عدّ البكسلات عالية الخطأ (أعلى من threshold ذكي)
  const thr = Math.max(mean*1.6, 7);
  let high=0;
  for(let p=0;p<diff.length;p++) if(diff[p] > thr) high++;
  const score = (high/diff.length)*100;
  // heatmap: أسود←أحمر←أصفر←أبيض
  const scale = maxD > 0 ? 255/maxD : 1;
  const out = new Uint8ClampedArray(diff.length*4);
  for(let p=0,i=0;p<diff.length;p++,i+=4){
    const v = Math.min(255, diff[p]*scale);
    if(v < 60){ out[i]=v*4.25; out[i+1]=0; out[i+2]=0; }
    else if(v < 150){ out[i]=255; out[i+1]=(v-60)*2.83; out[i+2]=0; }
    else { out[i]=255; out[i+1]=255; out[i+2]=(v-150)*4.25; }
    out[i+3]=255;
  }
  return { data: out, width: w, height: h, score, mean, highPct: score };
}
// Noise Map: Laplacian على grayscale
function noiseMap(srcCanvas){
  const w=srcCanvas.width, h=srcCanvas.height;
  const ctx=srcCanvas.getContext('2d');
  const src=ctx.getImageData(0,0,w,h).data;
  const gray=new Float32Array(w*h);
  for(let p=0,i=0;p<gray.length;p++,i+=4) gray[p]=0.299*src[i]+0.587*src[i+1]+0.114*src[i+2];
  const lap=new Float32Array(w*h);
  let maxL=0, sum=0;
  for(let y=1;y<h-1;y++) for(let x=1;x<w-1;x++){
    const idx=y*w+x;
    const v=Math.abs(4*gray[idx]-gray[idx-1]-gray[idx+1]-gray[idx-w]-gray[idx+w]);
    lap[idx]=v; sum+=v; if(v>maxL) maxL=v;
  }
  const mean=sum/lap.length;
  let varSum=0; for(let p=0;p<lap.length;p++) varSum+=(lap[p]-mean)*(lap[p]-mean);
  const variance=varSum/lap.length;
  const std=Math.sqrt(variance);
  // عدّ بكسلات الضجيج العالي
  const thr=Math.max(mean+std*1.2, 12);
  let high=0;
  for(let p=0;p<lap.length;p++) if(lap[p]>thr) high++;
  const score=(high/lap.length)*100;
  // اعرض grayscale عظّم
  const scale=maxL>0?255/maxL:1;
  const out=new Uint8ClampedArray(lap.length*4);
  for(let p=0,i=0;p<lap.length;p++,i+=4){
    const v=Math.min(255, lap[p]*scale);
    out[i]=out[i+1]=out[i+2]=v; out[i+3]=255;
  }
  return { data: out, width: w, height: h, score, variance, std, mean };
}
// بيانات الصورة المتاحة (EXIF الأصلي مش متاح بعد المعالجة المحلية)
function checkMetadata(){
  const flags=[];
  if(state.base){
    flags.push({k:'الأبعاد', v:(state.baseW||state.base.width)+'×'+(state.baseH||state.base.height)+' بكسل', sev:'info'});
    const maxD = Math.max(state.baseW||state.base.width||0, state.baseH||state.base.height||0);
    if(maxD > 0 && maxD < 800) flags.push({k:'تنبيه الجودة', v:'دقة منخفضة ('+maxD+'px) — التحليل أقل دقة', sev:'warn'});
    else if(maxD >= 1500) flags.push({k:'الجودة', v:'دقة عالية ('+maxD+'px) — تحليل أدق', sev:'ok'});
  }
  flags.push({k:'ملاحظة', v:'البيانات الوصفية الأصلية (EXIF) مش متاحة بعد المعالجة المحلية — للفحص الكامل ارفع الملف الأصلي قبل أي معالجة', sev:'info'});
  return { flags };
}
// الحكم النهائي
function computeVerdict(ela, noise, meta){
  let risk=0; const reasons=[];
  // ELA
  if(ela.highPct > 18){ risk += 38; reasons.push({sev:'danger', text:'🔬 ELA: '+ela.highPct.toFixed(1)+'% من البكسلات بمستوى خطأ مرتفع — تزوير محتمل'}); }
  else if(ela.highPct > 8){ risk += 22; reasons.push({sev:'warn', text:'🔬 ELA: '+ela.highPct.toFixed(1)+'% بكسلات بمستوى خطأ أعلى من الطبيعي — تعديل محتمل'}); }
  else { reasons.push({sev:'ok', text:'🔬 ELA: '+ela.highPct.toFixed(1)+'% — طبيعي ✅'}); }
  // Noise
  if(noise.score > 25){ risk += 30; reasons.push({sev:'danger', text:'🌫️ الضجيج: '+noise.score.toFixed(1)+'% تباين عالٍ — تلاعب محتمل'}); }
  else if(noise.score > 12){ risk += 14; reasons.push({sev:'warn', text:'🌫️ الضجيج: '+noise.score.toFixed(1)+'% تباين فوق المتوسط'}); }
  else { reasons.push({sev:'ok', text:'🌫️ الضجيج: '+noise.score.toFixed(1)+'% — متناسق ✅'}); }
  // Metadata
  const metaWarn = meta.flags.find(f=>f.sev==='warn');
  if(metaWarn){ risk += 10; reasons.push({sev:'warn', text:'📈 '+metaWarn.k+': '+metaWarn.v}); }
  const metaOk = meta.flags.find(f=>f.sev==='ok');
  if(metaOk) reasons.push({sev:'ok', text:'📈 '+metaOk.k+': '+metaOk.v});
  reasons.push({sev:'info', text:'🕒 بيانات وصفية: EXIF مش متاح بعد المعالجة المحلية'});
  risk = Math.min(100, Math.round(risk));
  let level='safe', label='✅ المستند يبدو أصليًا';
  if(risk >= 50){ level='danger'; label='🚨 احتمال تزوير عالٍ'; }
  else if(risk >= 28){ level='warn'; label='⚠️ احتمال تعديل — راجع بنفسك'; }
  return { risk, level, label, reasons };
}
function renderForgeryVerdict(v){
  if(!dom.forgeryVerdict) return;
  dom.forgeryVerdict.className = 'forgery-verdict ' + v.level;
  dom.forgeryVerdict.innerHTML =
    '<div>'+v.label+'</div>'+
    '<div class="forgery-risk-bar"><div class="forgery-risk-fill" style="width:'+(100-v.risk)+'%"></div></div>'+
    '<div class="micro" style="margin-top:6px">نسبة الخطورة: <b>'+v.risk+'%</b></div>';
}
function renderForgeryReasons(v, ela, noise, meta){
  if(!dom.forgeryReasons) return;
  let html = '<h3>📋 تفاصيل التحليل</h3><ul>';
  for(const r of v.reasons) html += '<li class="'+r.sev+'">'+r.text+'</li>';
  html += '</ul>';
  html += '<div class="forgery-meta"><b>تفاصيل ELA:</b> متوسط الفرق '+ela.mean.toFixed(2)+' | بكسلات مشبوهة '+ela.highPct.toFixed(1)+'%<br>';
  html += '<b>تفاصيل الضجيج:</b> الانحراف '+noise.std.toFixed(2)+' | بكسلات عالية '+noise.score.toFixed(1)+'%</div>';
  if(meta.flags.length){
    html += '<div class="forgery-meta"><b>البيانات الوصفية:</b><ul style="margin:6px 0">';
    for(const f of meta.flags) html += '<li class="'+f.sev+'">'+f.k+': '+f.v+'</li>';
    html += '</ul></div>';
  }
  html += '<p class="micro" style="margin-top:8px;color:#93c5fd">⚠️ التحليل استرشادي ومساعد — ما يُغني عن الفحص البصري والجهات الرسمية. النتائج تعتمد على جودة الصورة ونوع التعديل.</p>';
  dom.forgeryReasons.innerHTML = html;
}
// أداة: ارسم Uint8ClampedArray (RGBA) على canvas
function drawDataToCanvas(canvas, data, w, h){
  if(!canvas) return;
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  const imgData = ctx.createImageData(w, h);
  imgData.data.set(data);
  ctx.putImageData(imgData, 0, 0);
}

async function runOCR(){
  if(!state.base){ toast('اختار صورة الأول'); return; }
  // اقتراح ٥: فحص جودة الصورة قبل الـOCR
  const quality = checkImageQuality(state.base);
  if(quality.warnings.length){
    toast('⚠️ ' + quality.warnings.join(' · '));
  }
  const lang = dom.ocrLang.value;
  show(dom.ocrProgress); setOcrProgress(0, 'بيبدأ');
  dom.btnOCR.disabled = true;
  dom.ocrText.value = '';
  dom.ocrText.placeholder = 'بيشتغل… بـالذكاء الاصطناعي (Gemini). لو الإنترنت قطع بيستخدم محرّك الجهاز.';
  try{
    const blob = await ocrInputBlob();
    let text = '';
    try{
      setOcrProgress(0.35, 'الذكاء الاصطناعي بيقرا');
      text = await ocrGemini(blob);
    }catch(ge){
      console.warn('Gemini OCR فشل → محرّك الجهاز:', ge);
      setOcrProgress(0.55, 'محرّك الجهاز (احتياطي)');
      const worker = await getOcrWorker(lang);
      const locBlob = await ocrLocalBlob();
      const { data } = await worker.recognize(locBlob);
      text = (data && data.text ? data.text : '').trim();
    }
    dom.ocrText.value = text || 'مفيش نص واضح — جرّب تحسّن الصورة (✨) أو غيّر اللغة.';
    if(text) toast('🧠 النص اتاستخرج');
    // اقتراح ٣: قراءة أوتوماتيك بعد OCR لما وضع الإتاحة شغّال (للمكفوفين)
    if(text && localStorage.getItem('scan_a11y')==='1'){
      setTimeout(()=>{ try{ speakCloud(text); }catch(e){ console.warn('auto-speak failed:',e); } }, 500);
    }
  }catch(e){
    console.error(e);
    dom.ocrText.value = 'حصل خطأ في الاستخراج: ' + (e && e.message ? e.message : 'حاول تاني.');
  }finally{
    dom.btnOCR.disabled = false;
    setOcrProgress(1, 'خلص');
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
    .replace(/[^0-9A-Za-z\u0600-\u06FF\u0750-\u077F\s،.؟!؛:\-()]/g, ' ')  // شيل كل الرموز الزايدة، ابقِ عربي/لاتيني/أرقام + علامات وقف
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

function filterOcrForSpeech(t){
  // شيل أسطر واجهة التطبيق + الأسطر بلا عربي واضح (أرقام/شوشرة) — اقرأ المحتوى بس
  const UI=/^(الرئيسية|خدماتي|المتجر|استخرج النص|استخراج النص|انتهت القراءة|نسخ|تنزيل|استماع|إيقاف|إعدادات|عربي\s*\+\s*إنجليزي|Scan Macaron AI|ماسح المستندات)\s*$/i;
  return (t||'').split(/\n+/).map(l=>l.trim()).filter(l=>{
    if(!l) return false;
    if(UI.test(l)) return false;
    const ar=(l.match(/[\u0600-\u06FF]/g)||[]).length;
    return ar>=3;
  }).join('\n');
}

function speak(){
  const text = (dom.ocrText.value || '').trim();
  if(!text){ toast('مفيش نص للقراءة'); return; }
  speakCloud(text); // صوت طبيعي سحابي (لو فشل/offline، يقع على صوت الجهاز جوه speakCloud)
}
// صوت الجهاز (on-device) — fallback لما الصوت السحابي يفشل أو الجهاز offline
function speakLocal(text){
  if(!('speechSynthesis' in window)){ toast('المتصفح مش بيدعم القراءة الصوتية'); return; }
  const chunks = splitForSpeech(filterOcrForSpeech(text));
  if(!chunks.length){ toast('مفيش نص صالح للقراءة'); return; }
  window.speechSynthesis.cancel();
  speakQueue = chunks.map(c=>c.replace(/[^0-9A-Za-z\u0600-\u06FF\u0750-\u077F\s]/g,' ').replace(/\s+/g,' ').trim()); speakIdx = 0;
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
    u.rate = 0.92; u.pitch = 1;
    if(v) u.voice = v;
    u.onend  = () => { if(token !== speakToken) return; speakIdx++; playChunk(); };
    u.onerror = () => { if(token !== speakToken) return; speaking=false; dom.btnSpeak.disabled=false; dom.btnStopSpeak.disabled=true; toast('فيه مشكلة في القراءة'); };
    window.speechSynthesis.speak(u);
  };
  setTimeout(playChunk, 80);
  speaking = true; dom.btnSpeak.disabled = true; dom.btnStopSpeak.disabled = false;
  toast('🔊 بيقرا بصوت الجهاز... (' + chunks.length + ' جملة)');
}
function stopSpeak(){
  ttsToken++; if(ttsAudio){ try{ ttsAudio.pause(); }catch(e){} ttsAudio=null; }
  if('speechSynthesis' in window) window.speechSynthesis.cancel();
  speakToken++; // يبطل أي queue شغّال
  speaking = false; ttsPaused=false; dom.btnSpeak.disabled = false; dom.btnStopSpeak.disabled = true; setSpeakControls(false);
}

// ============================================================
// ---- الصوت الطبيعي السحابي (edge-tts proxy على Cloudflare Worker) ----
//  مجاني 100% — بلا مفتاح، بلا فاتورة. أصوات Microsoft Neural العربية.
//  Worker: khidmaty-tts.semohabiby7.workers.dev (مسموح لـ khidmatyai.com).
//  لو فشل أو offline → يقع على صوت الجهاز (speakLocal).
// ----------------------------------------------------------------
const TTS_WORKER='https://khidmaty-tts.semohabiby7.workers.dev/tts';

//  OCR أساسي عبر Gemini Vision (Cloudflare Worker) — استخراج عربي شبه 100% + أرقام هندية.
//  مجاني 100% — المفتاح مخفي في الـWorker (مش في التطبيق). مسموح لـ khidmatyai.com.
//  لو فشل أو offline → يقع على Tesseract المحلي (احتياطي) جوه runOCR.
// ----------------------------------------------------------------
const OCR_WORKER='https://khidmaty-ocr.semohabiby7.workers.dev';
function blobToB64(blob){ return new Promise((res,rej)=>{ const r=new FileReader(); r.onloadend=()=>res((r.result||'').split(',')[1]||''); r.onerror=()=>rej(r.error); r.readAsDataURL(blob); }); }
async function ocrGemini(blob){
  const b64 = await blobToB64(blob);
  if(!b64) throw new Error('فشل تحضير الصورة');
  const r = await fetch(OCR_WORKER, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({image:b64, mime:(blob.type||'image/png')})});
  if(!r.ok) throw new Error('OCR HTTP '+r.status);
  const d = await r.json();
  const t = (d && d.text ? String(d.text) : '').trim();
  if(!t) throw new Error('الذكاء الاصطناعي رجع فاضي');
  return t;
}
const TTS_VOICE='scan_tts_voice';
function ttsCfg(){ return { voice: localStorage.getItem(TTS_VOICE) || 'ar-EG-ShakirNeural' }; }
async function ttsSynth(text, voiceName, rate){
  const url = TTS_WORKER + '?text=' + encodeURIComponent(text) + '&voice=' + encodeURIComponent(voiceName) + '&rate=' + encodeURIComponent(rate||'-8%');
  const r = await fetch(url);
  if(!r.ok) throw new Error('TTS HTTP '+r.status);
  return URL.createObjectURL(await r.blob());
}
let ttsAudio=null, ttsToken=0;
// تحويل الـslider (0.6-1.4) لصيغة edge-tts (-40%..+40%)
function ttsRateFor(){ const v=parseFloat((dom.ttsRate&&dom.ttsRate.value)||'1'); const pct=Math.round((v-1)*100); return (pct>=0?'+':'')+pct+'%'; }
function ttsRateLabel(){ const v=parseFloat((dom.ttsRate&&dom.ttsRate.value)||'1'); if(v<0.85)return 'بطيئة'; if(v>1.15)return 'سريعة'; return 'عادية'; }
let ttsChunks=[], ttsChunkIdx=0, ttsPaused=false;
function setSpeakControls(on){ if(!dom.speakControls)return; if(on){dom.speakControls.classList.remove('hidden');}else{dom.speakControls.classList.add('hidden');} if(dom.btnPrevChunk)dom.btnPrevChunk.disabled=!on; if(dom.btnNextChunk)dom.btnNextChunk.disabled=!on; if(dom.btnPauseSpeak)dom.btnPauseSpeak.disabled=!on; if(!on&&dom.btnPauseSpeak)dom.btnPauseSpeak.textContent='⏸️ إيقاف مؤقت'; }
function updateSpeakProgress(){ if(dom.speakProgress)dom.speakProgress.textContent='جملة '+(ttsChunkIdx+1)+' من '+ttsChunks.length; }
function finishSpeak(token,fail){ if(token!==ttsToken&&!fail)return; speaking=false; ttsAudio=null; ttsPaused=false; dom.btnSpeak.disabled=false; dom.btnStopSpeak.disabled=true; setSpeakControls(false); if(!fail)toast('انتهت القراءة ✓'); }
async function playTtsChunk(token){
  if(token!==ttsToken||ttsChunkIdx<0||ttsChunkIdx>=ttsChunks.length){ finishSpeak(token); return; }
  updateSpeakProgress();
  try{
    const uri=await ttsSynth(ttsChunks[ttsChunkIdx], ttsCfg().voice, ttsRateFor());
    if(token!==ttsToken){ URL.revokeObjectURL(uri); return; }
    await new Promise((res)=>{ const a=new Audio(uri); ttsAudio=a; a.onended=()=>{URL.revokeObjectURL(uri);res();}; a.onerror=()=>{URL.revokeObjectURL(uri);res();}; a.play().catch(()=>res()); });
    if(token!==ttsToken) return;
    ttsChunkIdx++; playTtsChunk(token);
  }catch(e){ console.error(e); finishSpeak(token,true); toast('⚠️ الصوت السحابي فشل — بنقلب على صوت الجهاز'); speakLocal(dom.ocrText.value||''); }
}
async function speakCloud(text){
  ttsChunks=splitForSpeech(filterOcrForSpeech(text));
  if(!ttsChunks.length){ toast('مفيش نص صالح للقراءة'); return; }
  ttsToken++; const token=ttsToken;
  if(ttsAudio){ try{ttsAudio.pause();}catch(e){} ttsAudio=null; }
  speaking=true; ttsPaused=false; ttsChunkIdx=0;
  dom.btnSpeak.disabled=true; dom.btnStopSpeak.disabled=false; setSpeakControls(true);
  toast('🔊 بيقرا بصوت طبيعي... ('+ttsChunks.length+' جملة)');
  playTtsChunk(token);
}
function togglePauseSpeak(){ if(!ttsAudio)return; if(ttsPaused){ ttsAudio.play().catch(()=>{}); ttsPaused=false; if(dom.btnPauseSpeak)dom.btnPauseSpeak.textContent='⏸️ إيقاف مؤقت'; } else { ttsAudio.pause(); ttsPaused=true; if(dom.btnPauseSpeak)dom.btnPauseSpeak.textContent='▶️ كمّل'; } }
function skipChunk(dir){ if(!ttsChunks.length)return; if(ttsAudio){ const a=ttsAudio; a.onended=null; try{a.pause();}catch(e){} if(a.src&&a.src.startsWith('blob:'))URL.revokeObjectURL(a.src); ttsAudio=null; } ttsChunkIdx=Math.max(0,Math.min(ttsChunks.length-1,ttsChunkIdx+dir)); playTtsChunk(ttsToken); }
async function ttsExport(){
  const text=(dom.ocrText.value||'').trim();
  if(!text){ toast('مفيش نص للتصدير'); return; }
  const chunks=splitForSpeech(filterOcrForSpeech(text));
  if(!chunks.length){ toast('مفيش نص صالح'); return; }
  const btn=dom.btnExportAudio; if(btn){btn.disabled=true;btn.textContent='⏳ بيجهّز الصوت...';}
  toast('🎵 بيجمع الصوت... ('+chunks.length+' جملة)');
  try{
    const voice=ttsCfg().voice, rate=ttsRateFor(); const blobs=[];
    for(let i=0;i<chunks.length;i++){
      const r=await fetch(TTS_WORKER+'?text='+encodeURIComponent(chunks[i])+'&voice='+encodeURIComponent(voice)+'&rate='+encodeURIComponent(rate));
      if(!r.ok) throw new Error('TTS HTTP '+r.status);
      blobs.push(await r.blob());
      if(btn)btn.textContent='⏳ '+(i+1)+'/'+chunks.length+' جملة...';
    }
    const merged=new Blob(blobs,{type:'audio/mpeg'});
    const url=URL.createObjectURL(merged);
    const a=document.createElement('a'); a.href=url; a.download='scan-macaron-'+Date.now()+'.mp3';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),60000);
    toast('✅ اتصدّر الصوت ('+chunks.length+' جملة)');
  }catch(e){ console.error(e); toast('⚠️ فشل تصدير الصوت — تأكد من النت'); }
  finally{ if(btn){btn.disabled=false;btn.textContent='🎵 صدّر صوت (MP3)';} }
}
function initTheme(){
  const root=document.documentElement;
  const meta=document.querySelector('meta[name="theme-color"]');
  const apply=(t)=>{ root.setAttribute('data-theme',t); if(dom.btnTheme)dom.btnTheme.textContent=(t==='light'?'☀️':'🌙'); if(meta)meta.setAttribute('content',t==='light'?'#f4f6fb':'#0F1E3D'); };
  let cur=localStorage.getItem('scan_theme')||'dark';
  apply(cur);
  if(dom.btnTheme) dom.btnTheme.addEventListener('click', ()=>{ cur=(cur==='dark'?'light':'dark'); localStorage.setItem('scan_theme',cur); apply(cur); });
}
function initA11y(){
  if(!dom.btnA11y) return;
  const apply=(on)=>{ document.body.classList.toggle('a11y',on); dom.btnA11y.textContent=on?'👁️✓':'👁️'; dom.btnA11y.style.borderColor=on?'var(--gold)':'var(--border)'; };
  let on=localStorage.getItem('scan_a11y')==='1';
  apply(on);
  dom.btnA11y.addEventListener('click',()=>{ on=!on; localStorage.setItem('scan_a11y',on?'1':'0'); apply(on); toast(on?'👁️ وضع الإتاحة شغّال':'وضع الإتاحة اتقفل'); });
}
let deferredInstallPrompt=null;
function initInstallPrompt(){
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); deferredInstallPrompt = e;
    if(dom.btnInstallApp){ dom.btnInstallApp.style.display='inline-block'; }
  });
  if(dom.btnInstallApp){
    dom.btnInstallApp.addEventListener('click', async () => {
      if(!deferredInstallPrompt){ toast('افتح قائمة المتصفح (⋮) واختار «إضافة للشاشة الرئيسية»'); return; }
      deferredInstallPrompt.prompt();
      const { outcome } = await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      dom.btnInstallApp.style.display='none';
      toast(outcome==='accepted' ? '✅ التطبيق اتثبت!' : 'تمام، تقدر تثبته بعدين من قائمة المتصفح (⋮)');
    });
  }
  window.addEventListener('appinstalled', () => {
    if(dom.btnInstallApp) dom.btnInstallApp.style.display='none';
    deferredInstallPrompt = null;
    toast('🎉 شكراً! التطبيق اتثبت على جهازك');
  });
}
function initTtsSettings(){
  if(!dom.ttsVoice) return;
  dom.ttsVoice.value = ttsCfg().voice;
  if(dom.ttsRate){
    const savedRate = localStorage.getItem('scan_tts_rate');
    if(savedRate) dom.ttsRate.value = savedRate;
    const updRate = ()=>{ if(dom.ttsRateVal)dom.ttsRateVal.textContent = ttsRateLabel(); localStorage.setItem('scan_tts_rate', dom.ttsRate.value); };
    dom.ttsRate.addEventListener('input', updRate); updRate();
  }
  if(dom.btnPauseSpeak) dom.btnPauseSpeak.onclick = togglePauseSpeak;
  if(dom.btnPrevChunk) dom.btnPrevChunk.onclick = ()=>skipChunk(-1);
  if(dom.btnNextChunk) dom.btnNextChunk.onclick = ()=>skipChunk(+1);
  if(dom.btnExportAudio) dom.btnExportAudio.onclick = ttsExport;
  dom.btnTtsTest.onclick = async ()=>{
    localStorage.setItem(TTS_VOICE, dom.ttsVoice.value);
    toast('🔔 بيجرّب الصوت...');
    try{
      const v = dom.ttsVoice.value, rate = ttsRateFor();
      const r = await fetch(TTS_WORKER + '?text=' + encodeURIComponent('أهلاً يا محمد، ده صوت Scan Macaron الطبيعي.') + '&voice=' + encodeURIComponent(v) + '&rate=' + encodeURIComponent(rate));
      if(!r.ok) throw new Error('HTTP '+r.status);
      const a = new Audio(URL.createObjectURL(await r.blob()));
      a.onended = () => URL.revokeObjectURL(a.src);
      a.play();
    }catch(e){ toast('⚠️ '+(e.message||'فشل — تأكد من النت')); }
  };
}

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
  // اقتراح ٤: فعّل زر «اقرأ الكل» لما فيه صفحات
  if(dom.btnSpeakAll) dom.btnSpeakAll.disabled = state.pages.length === 0;
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
    card.draggable = true; // اقتراح ٧: سحب وإفلات لإعادة الترتيب
    card.dataset.idx = i;
    card.innerHTML =
      `<img src="${p.dataURL}" alt="صفحة ${i+1}" draggable="false">` +
      `<button class="thumb-del" title="امسح">×</button>` +
      `<div class="thumb-idx">${i+1}</div>` +
      `<div class="thumb-move"><button class="mv-l" title="حرّك لليسار">◀</button><button class="mv-r" title="حرّك لليمين">▶</button></div>`;
    card.querySelector('.thumb-del').addEventListener('click', () => { state.pages.splice(i,1); renderPages(); });
    card.querySelector('.mv-l').addEventListener('click', () => movePage(i, i-1));
    card.querySelector('.mv-r').addEventListener('click', () => movePage(i, i+1));
    // اقتراح ٧: سحب وإفلات — HTML5 Drag-and-Drop API
    card.addEventListener('dragstart', (e) => {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(i));
      card.classList.add('dragging');
    });
    card.addEventListener('dragend', () => { card.classList.remove('dragging'); document.querySelectorAll('.page-thumb.drag-over').forEach(el => el.classList.remove('drag-over')); });
    card.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; card.classList.add('drag-over'); });
    card.addEventListener('dragleave', () => { card.classList.remove('drag-over'); });
    card.addEventListener('drop', (e) => {
      e.preventDefault();
      card.classList.remove('drag-over');
      const from = parseInt(e.dataTransfer.getData('text/plain'), 10);
      const to = i;
      if(!isNaN(from) && from !== to) movePage(from, to);
    });
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
  if(state.pages.length === 0){ toast('ضيف صفحة واحدة على أقل'); return; }
  if(typeof PDFLib === 'undefined'){ toast('مكتبة PDF لسه بتحمّل — استنى ثواني'); return; }
  const useCompress = dom.chkCompress && dom.chkCompress.checked;
  dom.btnPdf.disabled = true; dom.btnPdf.textContent = useCompress ? '⏳ بيضغغ وتجهّز الـPDF...' : '⏳ بيجهّز الـPDF...';
  try{
    const { PDFDocument } = PDFLib;
    const doc = await PDFDocument.create();
    const sizes = { a4:[595.28,841.89], letter:[612,792] };
    for(const p of state.pages){
      let dataURL = p.dataURL, pw = p.w, ph = p.h;
      if(useCompress){
        const comp = await compressImageForPDF(p.dataURL);
        dataURL = comp.dataURL; pw = comp.w; ph = comp.h;
      }
      const bytes = await (await fetch(dataURL)).arrayBuffer();
      const img = await doc.embedJpg(bytes);
      const size = dom.pageSize.value;
      let pageW, pageH, margin;
      if(size === 'fit'){ pageW = pw; pageH = ph; margin = 0; }
      else { [pageW, pageH] = sizes[size]; margin = 24; }
      const page = doc.addPage([pageW, pageH]);
      const maxW = pageW - 2*margin, maxH = pageH - 2*margin;
      const scale = Math.min(maxW / pw, maxH / ph);
      const dw = pw * scale, dh = ph * scale;
      page.drawImage(img, { x:(pageW-dw)/2, y:(pageH-dh)/2, width:dw, height:dh });
    }
    const out = await doc.save();
    saveBlob(new Blob([out], { type:'application/pdf' }), `${CONFIG.downloadPrefix}-pdf-${Date.now()}.pdf`);
    toast(useCompress ? '📑 اتتنزّل PDF (مضغوط)' : '📑 اتتنزّل PDF');
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
        show(dom.editorCard); show(dom.exportCard); show(dom.ocrCard); show(dom.voiceCard); show(dom.pdfCard);
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

// ============================================================
//  اقتراح ٤: القراءة المتتابعة (اقرأ الكل) — يجمع نصوص كل الصفحات
// ============================================================
let speakAllRunning = false;

async function speakAll(){
  if(speaking){ toast('القراءة شغّالة دلوقتي — اضغط إيقاف الأول'); return; }
  if(speakAllRunning){ toast('بيشتغل بالفعل... استنى'); return; }
  if(state.pages.length === 0){ toast('ضيف صفحة واحدة على الأقل'); return; }

  speakAllRunning = true;
  const orig = dom.btnSpeakAll.textContent;
  dom.btnSpeakAll.disabled = true;
  const lang = dom.ocrLang.value;
  let allText = '';

  for(let i = 0; i < state.pages.length; i++){
    dom.btnSpeakAll.textContent = `📖 ${i+1}/${state.pages.length}…`;
    try{
      const blob = await (await fetch(state.pages[i].dataURL)).blob();
      let text = '';
      try{
        text = await ocrGemini(blob);
      }catch(ge){
        console.warn('Gemini فشل للصفحة', i+1, '→ محرّك الجهاز:', ge);
        const img = await dataURLToImage(state.pages[i].dataURL);
        const localBlob = await imgToThresholdBlob(img);
        const worker = await getOcrWorker(lang);
        const { data } = await worker.recognize(localBlob);
        text = (data && data.text ? data.text : '').trim();
      }
      if(text) allText += text + '\n\n';
    }catch(e){ console.warn('OCR صفحة', i+1, 'فشل:', e); }
  }

  dom.btnSpeakAll.disabled = false;
  dom.btnSpeakAll.textContent = orig;
  speakAllRunning = false;

  if(allText.trim()){
    speakCloud(allText.trim());
  } else {
    toast('مفيش نص قابل للقراءة في الصفحات');
  }
}

// دالة مساعدة: تحويل dataURL إلى Image
function dataURLToImage(dataURL){
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = dataURL;
  });
}

// دالة مساعدة: تحويل Image إلى blob بعتبة محلية (للـTesseract)
function imgToThresholdBlob(img){
  const MAX = 2500;
  const scale = Math.min(2, MAX / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.round(img.naturalWidth * scale), h = Math.round(img.naturalHeight * scale);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const cc = c.getContext('2d', { willReadFrequently: true });
  cc.imageSmoothingEnabled = true; cc.imageSmoothingQuality = 'high';
  cc.filter = 'grayscale(1)';
  cc.drawImage(img, 0, 0, w, h);
  cc.filter = 'none';
  const imgData = cc.getImageData(0, 0, w, h), d = imgData.data;
  const WIN = 25, HALF = WIN >> 1, OFF = 0.10 * 255;
  const I = new Float64Array((w + 1) * (h + 1));
  for(let y = 0; y < h; y++){ let rs = 0;
    for(let x = 0; x < w; x++){ rs += d[(y * w + x) * 4];
      I[(y + 1) * (w + 1) + (x + 1)] = I[y * (w + 1) + (x + 1)] + rs; } }
  for(let y = 0; y < h; y++){
    for(let x = 0; x < w; x++){
      const x1 = Math.max(0, x - HALF), x2 = Math.min(w, x + HALF + 1);
      const y1 = Math.max(0, y - HALF), y2 = Math.min(h, y + HALF + 1);
      const area = (x2 - x1) * (y2 - y1);
      const sum = I[y2 * (w + 1) + x2] - I[y1 * (w + 1) + x2] - I[y2 * (w + 1) + x1] + I[y1 * (w + 1) + x1];
      const mean = sum / area;
      const idx = (y * w + x) * 4;
      const v = d[idx] < (mean - OFF) ? 0 : 255;
      d[idx] = d[idx + 1] = d[idx + 2] = v;
    }
  }
  cc.putImageData(imgData, 0, 0);
  return new Promise((res) => c.toBlob(res, 'image/png'));
}

// ============================================================
//  اقتراح ٥: فحص جودة الصورة قبل الـOCR (blur + brightness)
// ============================================================
function checkImageQuality(canvasOrImg){
  const w = 128, h = 128;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const cc = c.getContext('2d', { willReadFrequently: true });
  cc.drawImage(canvasOrImg, 0, 0, w, h);
  const { data } = cc.getImageData(0, 0, w, h);
  // المتوسط (سطوع)
  let sum = 0;
  for(let i = 0; i < data.length; i += 4){ sum += (data[i] + data[i + 1] + data[i + 2]) / 3; }
  const brightness = sum / (w * h);
  // التباين (variance) — مؤشر للوضوح (ضبابية = variance منخفض)
  let sumSq = 0;
  for(let i = 0; i < data.length; i += 4){
    const v = (data[i] + data[i + 1] + data[i + 2]) / 3;
    sumSq += (v - brightness) * (v - brightness);
  }
  const variance = sumSq / (w * h);
  // Laplacian variance (أدق لكشف الضبابية)
  let lapSum = 0, lapSqSum = 0, lapCount = 0;
  for(let y = 1; y < h - 1; y++){
    for(let x = 1; x < w - 1; x++){
      const idx = (y * w + x) * 4;
      const v = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
      const l = -v * 4 +
        (data[((y - 1) * w + x) * 4] + data[((y + 1) * w + x) * 4] +
         data[(y * w + x - 1) * 4] + data[(y * w + x + 1) * 4]) / 3 * 4;
      lapSum += l; lapSqSum += l * l; lapCount++;
    }
  }
  const lapVar = lapCount ? (lapSqSum / lapCount) - (lapSum / lapCount) ** 2 : 0;

  const warnings = [];
  if(brightness < 50) warnings.push('الصورة غامقة جدًا — زوّد الإضاءة');
  else if(brightness > 235) warnings.push('الصورة فاتحة جدًا — خفّف الإضاءة أو الوميض');
  if(lapVar < 100) warnings.push('الصورة ضبابية أو غير واضحة');
  return { brightness, variance, lapVar, warnings };
}

// ============================================================
//  اقتراح ٦: الالتقاط التلقائي — يصوّر لما المستند ثابت وواضح
// ============================================================
let autoCapStream = null;
let autoCapRAF = null;
let autoCapLastGray = null;
let autoCapStable = 0;
let autoCapBusy = false;

async function startAutoCapture(){
  if(autoCapStream){ stopAutoCapture(); return; }
  if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
    toast('الالتقاط التلقائي غير مدعوم على هذا الجهاز'); return;
  }
  try{
    autoCapStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
    });
    dom.autoCapVideo.srcObject = autoCapStream;
    dom.autoCapVideo.hidden = false;
    dom.btnAutoCapture.textContent = '⏹️ إيقاف الالتقاط';
    dom.btnAutoCapture.classList.add('active');
    autoCapStable = 0;
    autoCapLastGray = null;
    autoCapBusy = false;
    autoCapLoop();
    toast('📷 الالتقاط التلقائي شغّال — ثبّت الكاميرا على المستند');
  }catch(e){
    console.error(e);
    toast('تعذّر تشغيل الكاميرا — تأكّد من الأذونات');
    autoCapStream = null;
  }
}

function autoCapLoop(){
  if(!autoCapStream) return;
  const v = dom.autoCapVideo;
  if(v.readyState >= 2 && !autoCapBusy){
    const w = 120, h = 120;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const cc = c.getContext('2d', { willReadFrequently: true });
    cc.drawImage(v, 0, 0, w, h);
    const { data } = cc.getImageData(0, 0, w, h);
    // مستوى رمادي للإطار الحالي
    const gray = new Uint8ClampedArray(w * h);
    for(let i = 0, j = 0; i < data.length; i += 4, j++){
      gray[j] = (data[i] + data[i + 1] + data[i + 2]) / 3;
    }
    // كشف الثبات: فرق الإطارات
    let diff = 0;
    if(autoCapLastGray){
      for(let i = 0; i < gray.length; i++) diff += Math.abs(gray[i] - autoCapLastGray[i]);
      diff /= gray.length;
    }
    // كشف الوضوح: تباين Laplacian
    let lapVar = 0, cnt = 0;
    for(let y = 1; y < h - 1; y++){
      for(let x = 1; x < w - 1; x++){
        const v = gray[y * w + x];
        const l = Math.abs(4 * v - gray[(y-1)*w+x] - gray[(y+1)*w+x] - gray[y*w+x-1] - gray[y*w+x+1]);
        lapVar += l; cnt++;
      }
    }
    lapVar /= cnt;

    if(diff < 3 && lapVar > 15){
      autoCapStable++;
      if(autoCapStable >= 12){ // ~0.4 ثانية ثبات
        autoCapBusy = true;
        autoCapCapture();
        return;
      }
    } else {
      autoCapStable = 0;
    }
    autoCapLastGray = gray;
  }
  autoCapRAF = requestAnimationFrame(autoCapLoop);
}

function autoCapCapture(){
  const v = dom.autoCapVideo;
  const c = document.createElement('canvas');
  c.width = v.videoWidth; c.height = v.videoHeight;
  c.getContext('2d').drawImage(v, 0, 0);
  c.toBlob((blob) => {
    if(blob){
      const file = new File([blob], 'auto-capture-' + Date.now() + '.jpg', { type: 'image/jpeg' });
      loadFile(file);
      toast('📸 اتالتقطت الصورة!');
    }
    stopAutoCapture();
  }, 'image/jpeg', 0.92);
}

function stopAutoCapture(){
  if(autoCapRAF){ cancelAnimationFrame(autoCapRAF); autoCapRAF = null; }
  if(autoCapStream){
    autoCapStream.getTracks().forEach(t => t.stop());
    autoCapStream = null;
  }
  if(dom.autoCapVideo){ dom.autoCapVideo.srcObject = null; dom.autoCapVideo.hidden = true; }
  if(dom.btnAutoCapture){
    dom.btnAutoCapture.textContent = '📷 التقاط تلقائي';
    dom.btnAutoCapture.classList.remove('active');
    dom.btnAutoCapture.disabled = false;
  }
  autoCapLastGray = null;
  autoCapStable = 0;
  autoCapBusy = false;
}

// ============================================================
//  وضع المسح المتسلسل السريع (Batch Mode)
// ============================================================
let batchMode = false;
let batchCount = 0;

function toggleBatchMode(){
  batchMode = !batchMode;
  if(batchMode){
    batchCount = 0;
    if(dom.btnBatch){
      dom.btnBatch.textContent = '⏹️ إيقاف المسح';
      dom.btnBatch.classList.add('active');
    }
    toast('⚡ المسح المتسلسل شغّال — كل صورة هتتضاف تلقائيًا. صوّر!');
    dom.cameraInput.click();
  } else {
    if(dom.btnBatch){
      dom.btnBatch.textContent = '⚡ مسح متسلسل';
      dom.btnBatch.classList.remove('active');
    }
    toast('اتوقف المسح المتسلسل — ' + batchCount + ' صفحة اتضافت');
  }
}

// ============================================================
//  وضع البطاقة (ID Card Mode) — دمج الوجه والظهر في صفحة واحدة
// ============================================================
let idCardFront = null;

function idCardMode(){
  if(!state.base){ toast('اختار/صوّر صورة الأول (وجه البطاقة)'); return; }
  if(!idCardFront){
    dom.canvas.toBlob(async (blob) => {
      if(!blob){ toast('تعذّر التقاط الصورة'); return; }
      const dataURL = await blobToDataURL(blob);
      idCardFront = { dataURL, w: dom.canvas.width, h: dom.canvas.height };
      if(dom.btnIdCard) dom.btnIdCard.textContent = '🆔 التقط الظهر';
      if(dom.btnIdCard) dom.btnIdCard.classList.add('active');
      if(dom.idCardStatus) dom.idCardStatus.textContent = '✅ الوجه اتسجّل — دلوقتي صوّر الظهر';
      toast('✅ وجه البطاقة اتسجّل — صوّر الظهر دلوقتي');
      dom.cameraInput.click();
    }, 'image/jpeg', 0.92);
  } else {
    dom.canvas.toBlob(async (blob) => {
      if(!blob){ toast('تعذّر التقاط الصورة'); return; }
      const backDataURL = await blobToDataURL(blob);
      const back = { dataURL: backDataURL, w: dom.canvas.width, h: dom.canvas.height };
      try{
        const merged = await mergeIdCard(idCardFront, back);
        state.pages.push({ id: Date.now() + Math.random(), dataURL: merged.dataURL, w: merged.w, h: merged.h });
        renderPages();
      }catch(e){
        console.error(e);
        toast('تعذّر دمج البطاقة — حاول تاني');
      }
      idCardFront = null;
      if(dom.btnIdCard) dom.btnIdCard.textContent = '🆔 وضع البطاقة';
      if(dom.btnIdCard) dom.btnIdCard.classList.remove('active');
      if(dom.idCardStatus) dom.idCardStatus.textContent = '';
      toast('🆔 البطاقة الكاملة (وجه + ظهر) اتضافت كصفحة واحدة!');
    }, 'image/jpeg', 0.92);
  }
}

async function mergeIdCard(front, back){
  const fImg = await loadImgHelper(front.dataURL);
  const bImg = await loadImgHelper(back.dataURL);
  const maxH = 1100;
  const fScale = Math.min(1, maxH / fImg.height);
  const bScale = Math.min(1, maxH / bImg.height);
  const fW = Math.round(fImg.width * fScale);
  const fH = Math.round(fImg.height * fScale);
  const bW = Math.round(bImg.width * bScale);
  const bH = Math.round(bImg.height * bScale);
  const gap = 24;
  const totalW = fW + gap + bW;
  const totalH = Math.max(fH, bH);
  const c = document.createElement('canvas');
  c.width = totalW; c.height = totalH;
  const cc = c.getContext('2d');
  cc.fillStyle = '#ffffff';
  cc.fillRect(0, 0, totalW, totalH);
  cc.drawImage(fImg, bW + gap, 0, fW, fH);
  cc.drawImage(bImg, 0, 0, bW, bH);
  const dataURL = await new Promise((res) => {
    c.toBlob((b) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.readAsDataURL(b);
    }, 'image/jpeg', 0.92);
  });
  return { dataURL, w: totalW, h: totalH };
}

function loadImgHelper(src){
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

// ============================================================
//  الضغط الفائق للـPDF (Ultra-Compression)
// ============================================================
async function compressImageForPDF(dataURL){
  const img = await loadImgHelper(dataURL);
  const maxDim = 1500;
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const cc = c.getContext('2d');
  cc.imageSmoothingQuality = 'high';
  cc.drawImage(img, 0, 0, w, h);
  const compDataURL = await new Promise((res) => {
    c.toBlob((b) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.readAsDataURL(b);
    }, 'image/jpeg', 0.72);
  });
  return { dataURL: compDataURL, w, h };
}

// ============================================================
//  فرد انحناء الكتب (Book Curve Flattening)
//  خوارزمية: لكل عمود احسب مركز ثقل البكسلات الداكنة (النص)،
//  ثم أزّح كل عمود رأسيًا لمحاذاة المراكز على خط أفقي مستقيم.
//  بعدها كرّر أفقيًا لمحاذاة الصفوف.
// ============================================================
function flattenBookCurve(){
  if(!state.base){ toast('اختار صورة الأول'); return; }
  if(dom.btnFlatten){
    dom.btnFlatten.disabled = true;
    dom.btnFlatten.textContent = '⏳ بيفرد الانحناء...';
  }
  setTimeout(() => {
    try{
      const srcW = dom.canvas.width;
      const srcH = dom.canvas.height;
      const src = ctx.getImageData(0, 0, srcW, srcH);
      const dst = ctx.createImageData(srcW, srcH);

      // Pass 1: فرد رأسي
      const colCenters = smoothColumnCenters(src, srcW, srcH);
      let meanCenter = 0;
      for(let x = 0; x < srcW; x++) meanCenter += colCenters[x];
      meanCenter /= srcW;

      for(let x = 0; x < srcW; x++){
        const shift = Math.round(meanCenter - colCenters[x]);
        for(let y = 0; y < srcH; y++){
          const srcY = clamp(y + shift, 0, srcH - 1);
          const si = (srcY * srcW + x) * 4;
          const di = (y * srcW + x) * 4;
          dst.data[di] = src.data[si];
          dst.data[di+1] = src.data[si+1];
          dst.data[di+2] = src.data[si+2];
          dst.data[di+3] = src.data[si+3];
        }
      }

      // Pass 2: فرد أفقي
      const rowCenters = smoothRowCenters(dst, srcW, srcH);
      let meanRow = 0;
      for(let y = 0; y < srcH; y++) meanRow += rowCenters[y];
      meanRow /= srcH;

      const finalImg = ctx.createImageData(srcW, srcH);
      for(let y = 0; y < srcH; y++){
        const shift = Math.round(meanRow - rowCenters[y]);
        for(let x = 0; x < srcW; x++){
          const srcX = clamp(x + shift, 0, srcW - 1);
          const si = (y * srcW + srcX) * 4;
          const di = (y * srcW + x) * 4;
          finalImg.data[di] = dst.data[si];
          finalImg.data[di+1] = dst.data[si+1];
          finalImg.data[di+2] = dst.data[si+2];
          finalImg.data[di+3] = dst.data[si+3];
        }
      }

      const tmpC = document.createElement('canvas');
      tmpC.width = srcW; tmpC.height = srcH;
      tmpC.getContext('2d').putImageData(finalImg, 0, 0);
      const tmpImg = new Image();
      tmpImg.onload = () => {
        setBaseFromImage(tmpImg);
        resetTransforms();
        render();
        toast('📖 ات فرد انحناء الكتاب — افحص النتيجة');
      };
      tmpImg.src = tmpC.toDataURL('image/jpeg', 0.95);
    }catch(e){
      console.error(e);
      toast('تعذّر فرد الانحناء — حاول بصورة أوضح');
    }finally{
      if(dom.btnFlatten){
        dom.btnFlatten.disabled = false;
        dom.btnFlatten.textContent = '📖 فرد انحناء';
      }
    }
  }, 50);
}

function smoothColumnCenters(img, w, h){
  const centers = new Float32Array(w);
  const step = Math.max(1, Math.floor(h / 600));
  for(let x = 0; x < w; x++){
    let sum = 0, total = 0;
    for(let y = 0; y < h; y += step){
      const i = (y * w + x) * 4;
      const lum = (img.data[i] + img.data[i+1] + img.data[i+2]) / 3;
      const weight = lum < 128 ? (128 - lum) : 0;
      sum += y * weight;
      total += weight;
    }
    centers[x] = total > 0 ? sum / total : h / 2;
  }
  const smoothed = new Float32Array(w);
  const r = 20;
  for(let x = 0; x < w; x++){
    let s = 0, cnt = 0;
    for(let dx = -r; dx <= r; dx++){
      const xx = clamp(x + dx, 0, w - 1);
      s += centers[xx]; cnt++;
    }
    smoothed[x] = s / cnt;
  }
  return smoothed;
}

function smoothRowCenters(img, w, h){
  const centers = new Float32Array(h);
  const step = Math.max(1, Math.floor(w / 600));
  for(let y = 0; y < h; y++){
    let sum = 0, total = 0;
    for(let x = 0; x < w; x += step){
      const i = (y * w + x) * 4;
      const lum = (img.data[i] + img.data[i+1] + img.data[i+2]) / 3;
      const weight = lum < 128 ? (128 - lum) : 0;
      sum += x * weight;
      total += weight;
    }
    centers[y] = total > 0 ? sum / total : w / 2;
  }
  const smoothed = new Float32Array(h);
  const r = 20;
  for(let y = 0; y < h; y++){
    let s = 0, cnt = 0;
    for(let dy = -r; dy <= r; dy++){
      const yy = clamp(y + dy, 0, h - 1);
      s += centers[yy]; cnt++;
    }
    smoothed[y] = s / cnt;
  }
  return smoothed;
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
  dom.btnAutoCapture.addEventListener('click', startAutoCapture); // اقتراح ٦: الالتقاط التلقائي
  dom.cameraInput.addEventListener('change', (e)=>{
    if(e.target.files[0]){
      loadFile(e.target.files[0]);
      if(batchMode){
        setTimeout(() => {
          if(state.base && batchMode){
            addPage();
            batchCount++;
            toast('⚡ صفحة ' + batchCount + ' — صوّر التالية أو اضغر إتقاف');
            if(batchMode) dom.cameraInput.click();
          }
        }, 1200);
      }
    }
    e.target.value = '';
  });
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
  if(dom.btnModeBoard) dom.btnModeBoard.addEventListener('click', ()=> setColorMode('whiteboard'));
  if(dom.btnSmartBoard) dom.btnSmartBoard.addEventListener('click', smartWhiteboard);

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
  if(dom.btnTranslate) dom.btnTranslate.addEventListener('click', translateText);
  if(dom.btnCopyTrans) dom.btnCopyTrans.addEventListener('click', copyTranslation);
  // 🔍 البحث العميق
  if(dom.btnSearch) dom.btnSearch.addEventListener('click', deepSearch);
  if(dom.btnSearchClear) dom.btnSearchClear.addEventListener('click', clearSearch);
  if(dom.btnSearchPrev) dom.btnSearchPrev.addEventListener('click', ()=> navigateSearch(-1));
  if(dom.btnSearchNext) dom.btnSearchNext.addEventListener('click', ()=> navigateSearch(1));
  if(dom.searchQuery) dom.searchQuery.addEventListener('keydown', (e)=>{ if(e.key === 'Enter'){ e.preventDefault(); deepSearch(); } });
  if(dom.btnForgery) dom.btnForgery.addEventListener('click', detectForgery);
  if(dom.btnForgeryClear) dom.btnForgeryClear.addEventListener('click', clearForgery);
  dom.btnStopSpeak.addEventListener('click', stopSpeak);
  if(dom.btnSpeakAll) dom.btnSpeakAll.addEventListener('click', speakAll); // اقتراح ٤: اقرأ الكل
  initTtsSettings(); // إعدادات الصوت الطبيعي (Cloud TTS)
  initTheme(); // الوضع الليلي/النهاري
  initA11y(); // وضع الإتاحة (أزرار أكبر)
  initInstallPrompt(); // زر تثبيت التطبيق (PWA install)

  // PDF
  dom.btnAddPage.addEventListener('click', addPage);
  dom.btnPdf.addEventListener('click', downloadPDF);
  if(dom.btnBatch) dom.btnBatch.addEventListener('click', toggleBatchMode);
  if(dom.btnIdCard) dom.btnIdCard.addEventListener('click', idCardMode);
  if(dom.btnFlatten) dom.btnFlatten.addEventListener('click', flattenBookCurve);

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

  // ميزة: الاستخراج الذكي للبيانات + التصنيف التلقائي
  if(dom.btnAnalyzeDoc) dom.btnAnalyzeDoc.addEventListener('click', analyzeDocument);

  // اقتراح ٧: أنماط بصرية للسحب والإفلات (بدون ملف CSS خارجي)
  if(!document.getElementById('dragdrop-style')){
    const s = document.createElement('style');
    s.id = 'dragdrop-style';
    s.textContent = [
      '.page-thumb.dragging{opacity:.4;border:2px dashed #e6c258;}',
      '.page-thumb.drag-over{border:2px dashed #34d399;transform:scale(1.05);}',
      '#autoCapVideo{max-width:100%;border-radius:12px;margin-top:8px;}',
      '.btn.active{background:#1a3556;border-color:#34d399;}'
    ].join('');
    document.head.appendChild(s);
  }
}
function bindSlider(slider, valEl, key){
  let raf=0;
  slider.addEventListener('input', ()=>{
    const v = +slider.value; state[key] = v; valEl.textContent = v+'%';
    cancelAnimationFrame(raf); raf = requestAnimationFrame(render);
  });
}

// ============================================================
//  ميزة: الاستخراج الذكي للبيانات + التصنيف التلقائي (Gemini عبر chat-worker)
// ============================================================
const ANALYZE_WORKER = 'https://khidmaty-chat.semohabiby7.workers.dev';
async function analyzeDocument(){
  const text = (dom.ocrText && dom.ocrText.value || '').trim();
  if(!text){ toast('استخرج النص الأول بالـOCR'); return; }
  const btn = $('btnAnalyzeDoc');
  if(btn){ btn.disabled = true; btn.textContent = '⏳ بيحلّل...'; }
  const info = $('docInfo');
  try{
    const question = 'حلّل نص المستند التالي. حدد نوع المستند (فاتورة/عقد/شهادة/مستند شخصي/عام) واستخرج البيانات المنظمة. رجع JSON فقط (بدون شرح) بالصيغة: {"type":"نوع_المستند","category":"الفئة","fields":{"المبلغ":"...","التاريخ":"...","اسم_المتجر":"...","رقم_الفاتورة":"...","الأطراف":"...","البنود":"...","الكلمات_المفتاحية":"..."}} — خلي الحقول المش موجودة null. الفئات: فواتير / مستندات شخصية / شهادات / دراسة / عمل / عام.';
    const r = await fetch(ANALYZE_WORKER, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ document_text: text, question })
    });
    if(!r.ok) throw new Error('HTTP '+r.status);
    const d = await r.json();
    const answer = (d.answer || d.text || d.response || '').trim();
    let parsed = null;
    try{ parsed = JSON.parse(answer.replace(/```json|```/g,'').trim()); }catch(e){ /* ممكن الرد نص */ }
    if(parsed && typeof parsed === 'object' && parsed.fields){
      renderDocInfo(parsed);
      toast('🏷️ اتحلّل المستند: '+ (parsed.category || parsed.type || 'عام'));
    } else if(info){
      info.classList.remove('hidden');
      info.innerHTML = '<div class="doc-info-head">📊 تحليل المستند</div><p class="doc-info-text">'+answer+'</p>';
      toast('📊 التحليل اتعمل');
    } else {
      toast('⚠️ ما قدرتش أحلّل — جرّب تاني');
    }
  }catch(e){
    console.error('analyzeDocument error:', e);
    toast('⚠️ فشل التحليل — تأكد من الإنترنت');
  }finally{
    if(btn){ btn.disabled = false; btn.textContent = '🏷️ استخرج البيانات'; }
  }
}
function renderDocInfo(info){
  const el = $('docInfo');
  if(!el) return;
  el.classList.remove('hidden');
  let html = '<div class="doc-info-head">📊 بيانات المستند';
  if(info.category) html += ' · <span class="doc-badge">🏷️ '+info.category+'</span>';
  if(info.type) html += ' · <span class="doc-badge">'+info.type+'</span>';
  html += '</div>';
  if(info.fields && typeof info.fields === 'object'){
    html += '<table class="doc-info-table">';
    for(const [k,v] of Object.entries(info.fields)){
      if(v !== null && v !== undefined && v !== ''){
        html += '<tr><th>'+k+'</th><td>'+String(v)+'</td></tr>';
      }
    }
    html += '</table>';
  }
  el.innerHTML = html;
}


// ===== Init =====
bind();
renderHistory(); // حمّل السجل المحفوظ عند بدء التشغيل
if('serviceWorker' in navigator){
  window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
}

/* ============================================================
   ماسح المستندات الذكي — app.js
   معالجة محلية 100% على Canvas. Vanilla JS، بلا مكتبات خارجية.
   معماري self-contained: غيّر CONFIG لنقل القسم لموقع مستقل.
   ============================================================ */

// ===== إعدادات العلامة (للتحويل لموقع مستقل Scan Macaron AI لاحقًا) =====
const CONFIG = {
  brand: 'Scan Macaron AI',
  parentSite: 'https://khidmatyai.com',
  maxDim: 2200,          // أقصى بُعد للصورة (أداء)
  thumbMax: 900,         // تصغير للعرض السريع
  downloadPrefix: 'scan-macaron',
};

// ===== مراجع DOM =====
const $ = (id) => document.getElementById(id);
const dom = {
  dropzone: $('dropzone'), fileInput: $('fileInput'), cameraInput: $('cameraInput'),
  btnPick: $('btnPick'), btnCamera: $('btnCamera'),
  uploadCard: $('uploadCard'), editorCard: $('editorCard'), exportCard: $('exportCard'),
  canvas: $('canvas'), stage: $('stage'), stageHint: $('stageHint'),
  cropOverlay: $('cropOverlay'),
  // controls
  btnRotL: $('btnRotL'), btnRotR: $('btnRotR'), rotFine: $('rotFine'), rotVal: $('rotVal'),
  bri: $('bri'), con: $('con'), sat: $('sat'),
  briVal: $('briVal'), conVal: $('conVal'), satVal: $('satVal'),
  btnAuto: $('btnAuto'), btnBW: $('btnBW'),
  btnCrop: $('btnCrop'), btnCropApply: $('btnCropApply'), btnCropCancel: $('btnCropCancel'), cropHint: $('cropHint'),
  btnBefore: $('btnBefore'), btnReset: $('btnReset'),
  fmt: $('fmt'), quality: $('quality'), qualityField: $('qualityField'), dims: $('dims'), btnDownload: $('btnDownload'),
};
const ctx = dom.canvas.getContext('2d', { willReadFrequently: true });

// ===== الحالة =====
const state = {
  base: null,            // HTMLCanvasElement (الصورة الأساسية الحالية)
  baseW: 0, baseH: 0,
  rotate90: 0,           // 0..3 (× 90°)
  fineRot: 0,            // -45..45
  bri: 100, con: 100, sat: 100,
  bw: false,
  showOriginal: false,
  // crop
  cropMode: false,
  cropRect: null,        // {x,y,w,h} بإحداثيات الـcanvas المعروض
  dragging: false, dragStart: null,
};

// ===== أدوات =====
function show(el){ el.classList.remove('hidden'); }
function hide(el){ el.classList.add('hidden'); }
function setVal(slider, valEl, val, suffix='%'){ state[slider] = val; valEl.textContent = val + suffix; }

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
    show(dom.editorCard); show(dom.exportCard);
    dom.canvas.scrollIntoView({ behavior:'smooth', block:'center' });
  };
  img.onerror = () => { URL.revokeObjectURL(url); toast('تعذّر فتح الصورة'); };
  img.src = url;
}

// صورة → canvas أساسي (مع تصغير لو ضخمة)
function setBaseFromImage(img){
  let w = img.naturalWidth, h = img.naturalHeight;
  const max = CONFIG.maxDim;
  if(w > max || h > max){ const s = max / Math.max(w,h); w = Math.round(w*s); h = Math.round(h*s); }
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  c.getContext('2d').drawImage(img, 0, 0, w, h);
  state.base = c; state.baseW = w; state.baseH = h;
}

function resetTransforms(){
  state.rotate90 = 0; state.fineRot = 0;
  state.bri = 100; state.con = 100; state.sat = 100; state.bw = false;
  state.showOriginal = false; state.cropMode = false; state.cropRect = null;
  dom.rotFine.value = 0; dom.rotVal.textContent = '0°';
  dom.bri.value = 100; dom.con.value = 100; dom.sat.value = 100;
  dom.briVal.textContent = '100%'; dom.conVal.textContent = '100%'; dom.satVal.textContent = '100%';
  dom.btnBW.classList.remove('active');
  dom.btnBefore.classList.remove('active');
  exitCropMode();
}

// ===== الرسم =====
function render(){
  if(!state.base) return;
  const base = state.base, w = state.baseW, h = state.baseH;

  if(state.showOriginal){
    dom.canvas.width = w; dom.canvas.height = h;
    ctx.setTransform(1,0,0,1,0,0); ctx.filter = 'none';
    ctx.clearRect(0,0,w,h); ctx.drawImage(base,0,0);
    drawCropOverlay(); updateDims(); return;
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

  if(state.bw) applyThreshold();
  drawCropOverlay();
  updateDims();
}

// أبيض وأسود بحدّ (threshold) لمستند نظيف
function applyThreshold(){
  const { width:w, height:h } = dom.canvas;
  try{
    const d = ctx.getImageData(0,0,w,h);
    const p = d.data;
    for(let i=0;i<p.length;i+=4){
      const lum = 0.299*p[i] + 0.587*p[i+1] + 0.114*p[i+2];
      const v = lum > 150 ? 255 : 0; // حدّ متوسط؛ المستندات البيضاء تبقى بيضاء
      p[i]=p[i+1]=p[i+2]=v;
    }
    ctx.putImageData(d,0,0);
  }catch(e){ /* تجاهل */ }
}

function updateDims(){
  if(dom.dims) dom.dims.textContent = dom.canvas.width + '×' + dom.canvas.height + 'px';
}

// ===== التحسين التلقائي (تمدّد التباين على الهيستوجرام) =====
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
  // رفع التباين حسب ضيق النطاق + تعديل السطوع لو الصورة غامقة
  const stretch = Math.min(180, Math.round(100 + (180 * (1 - (hi-lo)/255))));
  const meanLum = lo + (hi-lo)/2;
  const briBoost = Math.max(50, Math.min(150, Math.round(100 + (128 - meanLum) * 0.5)));
  dom.con.value = stretch; dom.bri.value = briBoost;
  state.con = stretch; state.bri = briBoost;
  dom.conVal.textContent = stretch+'%'; dom.briVal.textContent = briBoost+'%';
  render();
  toast('✨ تحسين تلقائي اتطبّق');
}

// ===== القص =====
function enterCropMode(){
  if(!state.base) return;
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
  // خذ المنطقة من الـcanvas المعروض الحالي (بعد التدوير/التحسين)
  const sx = Math.max(0,Math.round(r.x)), sy = Math.max(0,Math.round(r.y));
  const sw = Math.max(1,Math.round(r.w)), sh = Math.max(1,Math.round(r.h));
  const out = document.createElement('canvas'); out.width = sw; out.height = sh;
  out.getContext('2d').drawImage(dom.canvas, sx, sy, sw, sh, 0, 0, sw, sh);
  state.base = out; state.baseW = sw; state.baseH = sh;
  resetTransforms(); render();
  toast('✂️ اتقصّت');
}

// رسم overlay القص
function drawCropOverlay(){
  if(!state.cropMode) return;
  const r = state.cropRect; if(!r) return;
  ctx.save();
  ctx.fillStyle = 'rgba(6,12,26,.55)';
  // غمّق خارج المربع
  ctx.fillRect(0,0,dom.canvas.width,dom.canvas.height);
  ctx.clearRect(r.x, r.y, r.w, r.h);
  // إعادة رسم الصورة جوه المربع
  // (بساطة: نرسم حدود ذهبية)
  ctx.strokeStyle = '#e6c258'; ctx.lineWidth = 3; ctx.setLineDash([8,6]);
  ctx.strokeRect(r.x, r.y, r.w, r.h);
  // شبكة تقاطع
  ctx.strokeStyle='rgba(230,194,88,.5)'; ctx.lineWidth=1; ctx.setLineDash([]);
  ctx.beginPath(); ctx.moveTo(r.x+r.w/3,r.y); ctx.lineTo(r.x+r.w/3,r.y+r.h);
  ctx.moveTo(r.x+2*r.w/3,r.y); ctx.lineTo(r.x+2*r.w/3,r.y+r.h);
  ctx.moveTo(r.x,r.y+r.h/3); ctx.lineTo(r.x+r.w,r.y+r.h/3);
  ctx.moveTo(r.x,r.y+2*r.h/3); ctx.lineTo(r.x+r.w,r.y+2*r.h/3);
  ctx.stroke();
  ctx.restore();
}

// تحويل إحداثيات المؤشر → إحداثيات الـcanvas
function toCanvasCoords(e){
  const rect = dom.canvas.getBoundingClientRect();
  const sx = dom.canvas.width / rect.width;
  const sy = dom.canvas.height / rect.height;
  const cx = ( (e.touches? e.touches[0].clientX : e.clientX) - rect.left ) * sx;
  const cy = ( (e.touches? e.touches[0].clientY : e.clientY) - rect.top ) * sy;
  return { x: Math.min(dom.canvas.width, Math.max(0,cx)), y: Math.min(dom.canvas.height, Math.max(0,cy)) };
}

// ===== التصدير =====
function download(){
  if(!state.base) return;
  const fmt = dom.fmt.value;
  const q = (fmt==='image/jpeg'||fmt==='image/webp') ? (dom.quality.value/100) : undefined;
  dom.canvas.toBlob((blob) => {
    if(!blob){ toast('تعذّر التصدير'); return; }
    const ext = fmt==='image/png'?'png':fmt==='image/webp'?'webp':'jpg';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${CONFIG.downloadPrefix}-${Date.now()}.${ext}`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href), 1500);
    toast('⬇️ اتتنزّل');
  }, fmt, q);
}

// ===== Toast بسيط =====
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

  // تدوير
  dom.btnRotL.addEventListener('click', ()=>{ state.rotate90 = (state.rotate90+3)%4; render(); });
  dom.btnRotR.addEventListener('click', ()=>{ state.rotate90 = (state.rotate90+1)%4; render(); });
  dom.rotFine.addEventListener('input', ()=>{ state.fineRot = +dom.rotFine.value; dom.rotVal.textContent = state.fineRot+'°'; render(); });

  // تحسين
  bindSlider(dom.bri, dom.briVal, 'bri');
  bindSlider(dom.con, dom.conVal, 'con');
  bindSlider(dom.sat, dom.satVal, 'sat');
  dom.btnAuto.addEventListener('click', autoEnhance);
  dom.btnBW.addEventListener('click', ()=>{ state.bw = !state.bw; dom.btnBW.classList.toggle('active', state.bw); render(); });

  // قص
  dom.btnCrop.addEventListener('click', ()=> state.cropMode ? exitCropMode() : enterCropMode());
  dom.btnCropApply.addEventListener('click', applyCrop);
  dom.btnCropCancel.addEventListener('click', ()=>{ state.cropRect=null; render(); dom.btnCropApply.disabled=true; });

  // قص — Pointer events على طبقة الـoverlay
  const co = dom.cropOverlay;
  const down = (e)=>{ if(!state.cropMode) return; e.preventDefault(); state.dragging=true; const p=toCanvasCoords(e); state.dragStart=p; state.cropRect={x:p.x,y:p.y,w:0,h:0}; render(); };
  const move = (e)=>{ if(!state.dragging||!state.cropMode) return; e.preventDefault(); const p=toCanvasCoords(e); const s=state.dragStart; state.cropRect={x:Math.min(s.x,p.x),y:Math.min(s.y,p.y),w:Math.abs(p.x-s.x),h:Math.abs(p.y-s.y)}; render(); };
  const up = (e)=>{ if(!state.dragging) return; state.dragging=false; const r=state.cropRect; if(r && r.w>=8 && r.h>=8){ dom.btnCropApply.disabled=false; dom.stageHint.textContent='تم رسم المربع — اضغط «تطبيق القص»'; } else { state.cropRect=null; render(); } };
  co.addEventListener('pointerdown', down);
  co.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  co.addEventListener('touchstart', down, {passive:false});
  co.addEventListener('touchmove', move, {passive:false});

  // قبل/بعد + إعادة
  dom.btnBefore.addEventListener('click', ()=>{ state.showOriginal = !state.showOriginal; dom.btnBefore.classList.toggle('active', state.showOriginal); render(); });
  dom.btnReset.addEventListener('click', ()=>{ resetTransforms(); render(); toast('↩️ اترجّع للأصل'); });

  // تصدير
  dom.fmt.addEventListener('change', ()=> dom.qualityField.classList.toggle('hidden', dom.fmt.value==='image/png'));
  dom.btnDownload.addEventListener('click', download);
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

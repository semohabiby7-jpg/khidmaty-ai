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
  btnCrop: $('btnCrop'), btnCropApply: $('btnCropApply'), btnCropCancel: $('btnCropCancel'), cropHint: $('cropHint'),
  btnBefore: $('btnBefore'), btnReset: $('btnReset'),
  fmt: $('fmt'), quality: $('quality'), qualityField: $('qualityField'), dims: $('dims'), btnDownload: $('btnDownload'),
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
  showOriginal: false,
  cropMode: false, cropRect: null, dragging: false, dragStart: null,
  perspMode: false, perspCorners: null, perspDrag: -1,
  pages: [],
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
    dom.rotFine,dom.bri,dom.con,dom.sat];
  els.forEach(b => { if(b) b.disabled = !en; });
}

function resetTransforms(){
  state.rotate90 = 0; state.fineRot = 0;
  state.bri = 100; state.con = 100; state.sat = 100; state.bw = false;
  state.showOriginal = false; state.cropMode = false; state.cropRect = null;
  if(state.perspMode){ state.perspMode=false; setEditingEnabled(true); dom.btnPerspApply.disabled=true; dom.btnPerspCancel.disabled=true; dom.btnPersp.classList.remove('active'); state.perspCorners=null; state.perspDrag=-1; dom.stage.style.cursor=''; dom.stageHint.textContent=''; }
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
  if(state.perspMode){ renderPersp(); return; }
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

function applyThreshold(){
  const { width:w, height:h } = dom.canvas;
  try{
    const d = ctx.getImageData(0,0,w,h);
    const p = d.data;
    for(let i=0;i<p.length;i+=4){
      const lum = 0.299*p[i] + 0.587*p[i+1] + 0.114*p[i+2];
      const v = lum > 150 ? 255 : 0;
      p[i]=p[i+1]=p[i+2]=v;
    }
    ctx.putImageData(d,0,0);
  }catch(e){ /* تجاهل */ }
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
let speaking = false;
function arVoice(){
  if(!('speechSynthesis' in window)) return null;
  const vs = window.speechSynthesis.getVoices() || [];
  return vs.find(v => v.lang && v.lang.toLowerCase().startsWith('ar')) || null;
}
function speak(){
  const text = (dom.ocrText.value || '').trim();
  if(!text){ toast('مفيش نص للقراءة'); return; }
  if(!('speechSynthesis' in window)){ toast('المتصفح مش بيدعم القراءة الصوتية'); return; }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ar-EG'; u.rate = 0.95; u.pitch = 1;
  const v = arVoice(); if(v) u.voice = v;
  u.onend = () => { speaking=false; dom.btnSpeak.disabled=false; dom.btnStopSpeak.disabled=true; };
  u.onerror = () => { speaking=false; dom.btnSpeak.disabled=false; dom.btnStopSpeak.disabled=true; };
  window.speechSynthesis.speak(u);
  speaking = true; dom.btnSpeak.disabled = true; dom.btnStopSpeak.disabled = false;
  toast('🔊 بيقرا...');
}
function stopSpeak(){
  if('speechSynthesis' in window) window.speechSynthesis.cancel();
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
  dom.btnBW.addEventListener('click', ()=>{ state.bw = !state.bw; dom.btnBW.classList.toggle('active', state.bw); render(); });

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
if('serviceWorker' in navigator){
  window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
}

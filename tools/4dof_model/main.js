
/* --------------------- Peak detection & labeling --------------------- */
function subs(n){ return ["","₁","₂","₃","₄","₅"][n] || ("_"+n); }
function maxPeaksFor(order){ return Math.min(4, Math.max(1, order)); }

function detectPeaks(series, // array of {x, y}
  { minDb=-90, minProm=4, minDistHz=20 } = {}
){
  // collect local maxima
  const cands = [];
  for(let i=1;i<series.length-1;i++){
    const y = series[i].y, yL = series[i-1].y, yR = series[i+1].y;
    if(!(y > yL && y >= yR)) continue;
    if(y < minDb) continue;

    // prominence: compare to local minima within a window
    const windowHz = 40;                 // window to search minima (on each side)
    const stepHz = series[1].x - series[0].x;
    const W = Math.max(3, Math.floor(windowHz/stepHz));
    let minL = y, minR = y;
    for(let k=1;k<=W && i-k>=0;k++){ if(series[i-k].y < minL) minL = series[i-k].y; }
    for(let k=1;k<=W && i+k<series.length;k++){ if(series[i+k].y < minR) minR = series[i+k].y; }
    const prom = y - Math.max(minL, minR);
    if(prom >= minProm) cands.push({i, f: series[i].x, y, prom});
  }

  // greedy select by height with min distance
  cands.sort((a,b)=>b.y - a.y);
  const picked = [];
  for(const p of cands){
    if(picked.some(q => Math.abs(q.f - p.f) < minDistHz)) continue;
    picked.push(p);
  }
  // sort by frequency for readable labels
  picked.sort((a,b)=>a.f - b.f);
  return picked;
}

function dominantAt(index, R){
  const vals = {
    top:   R.top[index]?.y ?? -140,
    back:  R.back[index]?.y ?? -140,
    air:   R.air[index]?.y ?? -140,
    sides: R.sides[index]?.y ?? -140
  };
  let bestKey = "air", best = -1e9;
  for(const k of ["top","back","air","sides"]){
    if(vals[k] > best){ best = vals[k]; bestKey = k; }
  }
  const name = {top:"Top", back:"Back", air:"Air", sides:"Sides"}[bestKey];
  const color = COLORS[bestKey];
  return { key: bestKey, name, color };
}

function modeName(order, ordinal, domKey){
  if(order === 1) return "A(0,1)";
  // For 2–4 DOF, label the T(1,1) family and append dominant subsystem
  const base = `T(1,1)${subs(ordinal)}`;
  const tag = {top:"top", back:"back", air:"air", sides:"sides"}[domKey] || "";
  return tag ? `${base} (${tag})` : base;
}

/* --------------------- Plotting --------------------- */
const cvs = $("plot");
const ctx = cvs.getContext("2d");
const dpi = window.devicePixelRatio || 1;

function resize(){
  const w = cvs.clientWidth, h = cvs.clientHeight;
  cvs.width = Math.max(1, Math.floor(w * dpi));
  cvs.height = Math.max(1, Math.floor(h * dpi));
  ctx.setTransform(dpi,0,0,dpi,0,0);
}
window.addEventListener("resize", resize); resize();

let yMin = -100, yMax = -20;
function xPix(f){ return (f/500) * cvs.clientWidth; }
function yPix(y){ return cvs.clientHeight - ((y - yMin)/(yMax - yMin)) * cvs.clientHeight; }
function drawAxes(){
  // bg
  ctx.fillStyle = "#0b0f16";
  ctx.fillRect(0,0,cvs.clientWidth,cvs.clientHeight);

  ctx.strokeStyle = "#242a3a";
  ctx.lineWidth = 1;

  // x grid / labels
  ctx.fillStyle = "#5b6473";
  ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  for(let f=0; f<=500; f+=50){
    const x = xPix(f);
    ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,cvs.clientHeight); ctx.stroke();
    ctx.fillText(f.toString(), x+2, cvs.clientHeight-6);
  }

  // y grid / labels
  const step = 10;
  const start = Math.ceil(yMin/step)*step;
  for(let y=start; y<=yMax+1e-9; y+=step){
    const py = yPix(y);
    ctx.beginPath(); ctx.moveTo(0,py); ctx.lineTo(cvs.clientWidth,py); ctx.stroke();
    ctx.fillText(y.toFixed(0), 4, py-3);
  }

  // axes titles
  ctx.fillStyle = "#9aa4b2";
  ctx.fillText("Frequency (Hz)", cvs.clientWidth - 100, cvs.clientHeight - 6);
  ctx.save();
  ctx.translate(10, 16);
  ctx.rotate(-Math.PI/2);
  ctx.fillText("Sound Pressure Level (dB)", 0, 0);
  ctx.restore();
}

function line(data, color, width=2, dashed=false){
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash(dashed ? [6,4] : []);
  ctx.beginPath();
  let first = true;
  for(const p of data){
    const x = xPix(p.x), y = yPix(p.y);
    if(first){ ctx.moveTo(x,y); first=false; }
    else { ctx.lineTo(x,y); }
  }
  ctx.stroke();
  ctx.setLineDash([]);
}


function drawLabel(x, y, text, color, yBump=0){
  const padX=6, padY=3;
  ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  const textWidth = ctx.measureText(text).width;
  const boxW = textWidth + padX*2, boxH = 18;

  // keep label within viewport
  let bx = Math.min(Math.max(6, x - boxW/2), cvs.clientWidth - boxW - 6);
  let by = Math.max(6, y - 24 + yBump);

  // stem
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, by + boxH);
  ctx.stroke();

  // box
  ctx.fillStyle = "rgba(24,30,44,0.92)";
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(bx, by, boxW, boxH, 6);
  ctx.fill(); ctx.stroke();

  // text
  ctx.fillStyle = color;
  ctx.fillText(text, bx + padX, by + boxH - 6);
}

function render(){
  const p = readParams();
  const R = computeResponse(p);

  // autoscale y to content (with sensible bounds)
  const allVals = [...R.total, ...R.top, ...R.back, ...R.air, ...R.sides].map(d=>d.y);
  let vmin = Math.min(...allVals), vmax = Math.max(...allVals);
  vmin = Math.max(-140, Math.min(vmin, -10));
  vmax = Math.min(  -5, Math.max(vmax, -120));
  const span = Math.max(15, (vmax - vmin) || 1);
  yMin = vmin - 0.05*span;
  yMax = vmax + 0.10*span;

  // draw curves
  drawAxes();
  line(R.total, COLORS.total, 3, false);
  line(R.top,   COLORS.top, 2, true);
  line(R.back,  COLORS.back, 2, true);
  line(R.air,   COLORS.air, 2, true);
  line(R.sides, COLORS.sides, 2, true);

  // peak detection on total
  const maxN = maxPeaksFor(p.model_order);
  const peaks = detectPeaks(R.total, {
    minDb: -95,
    minProm: 4.0,
    minDistHz: 20
  }).slice(0, maxN);

  // draw markers + labels
  const list = [];
  if(p.show_labels){
    // stagger labels vertically to reduce overlap
    const bumps = [-10, -28, -46, -64];
    peaks.forEach((pk, idx)=>{
      const x = xPix(pk.f), y = yPix(pk.y);
      const dom = dominantAt(pk.i, R);
      const name = modeName(p.model_order, idx+1, dom.key);
      const text = `${name} — ${pk.f.toFixed(1)} Hz`;
      drawLabel(x, y, text, dom.color, bumps[idx % bumps.length]);
      list.push({ text, color: dom.color });
    });
  }

  // write textual list
  const el = $("peak_list");
  if(peaks.length === 0){
    el.innerHTML = `<div class="small">No prominent peaks detected in 0–500 Hz (try increasing F, lowering damping, or adjusting volumes/stiffness).</div>`;
  } else {
    el.innerHTML = peaks.map((pk, idx)=>{
      const dom = dominantAt(pk.i, R);
      const name = modeName(p.model_order, idx+1, dom.key);
      return `<div class="pl-item" style="color:${dom.color}">${name}: <b>${pk.f.toFixed(1)} Hz</b> (prom≈${pk.prom.toFixed(1)} dB)</div>`;
    }).join("");
  }
}

/* --------------------- UI hooks --------------------- */
const ids = [
  "mass_top","mass_back","mass_sides","mass_air",
  "stiffness_top","stiffness_back","stiffness_sides",
  "damping_top","damping_back","damping_sides","damping_air",
  "area_top","area_back","area_sides","area_hole",
  "volume_air","driving_force","model_order","show_labels"
];

ids.forEach(id=>{
  const el = $(id);
  if(!el) return;
  el.addEventListener("input", ()=>{
    const lab = $(`${id}_val`);
    if(lab && el.type === "range") lab.textContent = fmt(parseFloat(el.value));
    if(id === "model_order"){
      const labels = {1:"1‑DOF",2:"2‑DOF",3:"3‑DOF",4:"4‑DOF"};
      $("model_label").textContent = labels[parseInt(el.value,10)] || "—";
      setModelVisibility(parseInt(el.value,10));
    }
    render();
  });
});

/* initialize displayed numbers from defaults */
(function initVals(){
  ids.forEach(id=>{
    const el = $(id);
    if(!el) return;
    if(el.type === "range"){
      const v = parseFloat(el.value);
      const lab = $(`${id}_val`);
      if(lab && !Number.isNaN(v)) lab.textContent = fmt(v);
    }
  });
})();

/* Show/hide blocks based on model order */
function setModelVisibility(order){
  $("blk_top").style.display   = (order>=2) ? "" : "none";
  $("blk_back").style.display  = (order>=3) ? "" : "none";
  $("blk_sides").style.display = (order>=4) ? "" : "none";
}

/* Reset */
$("btn_reset").addEventListener("click", ()=>{
  document.querySelectorAll("input[type=range]").forEach(e => e.value = e.defaultValue || e.value);
  $("model_order").value = "4";
  $("show_labels").checked = true;
  ["mass_top","mass_back","mass_sides","mass_air","stiffness_top","stiffness_back","stiffness_sides","damping_top","damping_back","damping_sides","damping_air","area_top","area_back","area_sides","area_hole","volume_air","driving_force"].forEach(id=>{
    const el = $(id), lab = $(`${id}_val`);
    if(el && lab) lab.textContent = fmt(parseFloat(el.value));
  });
  $("model_label").textContent = "4‑DOF";
  setModelVisibility(4);
  render();
});

/* first render */
setModelVisibility(parseInt($("model_order").value,10) || 4);
render();

/* canvas API: roundRect polyfill for older browsers */
if(!CanvasRenderingContext2D.prototype.roundRect){
  CanvasRenderingContext2D.prototype.roundRect = function(x,y,w,h,r){
    if(typeof r === 'number') r = {tl:r,tr:r,br:r,bl:r};
    const {tl=6,tr=6,br=6,bl=6} = r||{};
    this.beginPath();
    this.moveTo(x+tl,y); this.lineTo(x+w-tr,y);
    this.quadraticCurveTo(x+w,y,x+w,y+tr);
    this.lineTo(x+w,y+h-br); this.quadraticCurveTo(x+w,y+h,x+w-br,y+h);
    this.lineTo(x+bl,y+h); this.quadraticCurveTo(x,y+h,x,y+h-bl);
    this.lineTo(x,y+tl); this.quadraticCurveTo(x,y,x+tl,y);
    this.closePath(); return this;
  };
}// main.js — existing UI renderer placeholder

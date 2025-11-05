
const DEFAULT_COLORS = { total: "#ff9a5c", top: "#61a8ff", back: "#47d78a", air: "#b38cff", sides: "#ffd166" };
const WHATIF_COLORS = { ...DEFAULT_COLORS, total: "#61a8ff" };
function activeColors(){ return (typeof document !== "undefined" && document.body?.dataset?.palette === "whatif") ? WHATIF_COLORS : DEFAULT_COLORS; }
const BASE_LINE_COLOR = "#61a8ff";
const WHATIF_LINE_COLOR = "#ff9a5c";
const WHATIF_DB_OFFSET = -20;
const MASS_IDS = new Set(["mass_top","mass_back","mass_sides","mass_air"]);
const STIFFNESS_IDS = new Set(["stiffness_top","stiffness_back","stiffness_sides"]);
const RANGE_IDS = [
  "ambient_temp","altitude",
  "mass_top","mass_back","mass_sides","mass_air",
  "stiffness_top","stiffness_back","stiffness_sides",
  "damping_top","damping_back","damping_sides","damping_air",
  "area_top","area_back","area_sides","area_hole",
  "volume_air","driving_force"
];
const CONTROL_IDS = [...RANGE_IDS, "model_order","show_labels"];

const ISA = {
  T0: 288.15,            // K
  P0: 101325,            // Pa
  LAPSE: 0.0065,         // K/m
  R: 287.05,             // J/(kg·K) specific gas constant for dry air
  GAMMA: 1.4,
  G: 9.80665
};
ISA.EXP = ISA.G / (ISA.R * ISA.LAPSE);
const MAX_ATM_ALT = 10000;  // m, comfortably inside troposphere band
const FT_PER_M = 3.28084;
const REFERENCE_RHO = 1.205; // sea-level density used for slider baseline

function deriveAtmosphere(altitudeMeters = 0, tempC = 20){
  const h = Math.max(0, Math.min(altitudeMeters, MAX_ATM_ALT));
  const tempK = (tempC ?? 20) + 273.15;
  const ratio = Math.max(0.01, 1 - (ISA.LAPSE * h) / ISA.T0);
  const pressure = ISA.P0 * Math.pow(ratio, ISA.EXP);
  const rho = pressure / (ISA.R * tempK);
  const c = Math.sqrt(ISA.GAMMA * ISA.R * tempK);
  return { rho, c, pressure, tempK, tempC: tempK - 273.15, altitude: h };
}

function formatAtmosphereSummary(atm){
  return `ρ ≈ ${atm.rho.toFixed(4)} kg/m³ • c ≈ ${atm.c.toFixed(1)} m/s • P ≈ ${(atm.pressure/100).toFixed(0)} hPa`;
}

function formatEffectiveAirMass(atm){
  if(!atm || !Number.isFinite(atm.effectiveMassAirKg)) return null;
  const effectiveG = atm.effectiveMassAirKg * 1000;
  const baseG = (atm.baseMassAirKg ?? atm.effectiveMassAirKg) * 1000;
  const densityPct = (atm.densityScale ?? 1) * 100;
  if(Math.abs(effectiveG - baseG) < 0.0005){
    return `${effectiveG.toFixed(2)} g`;
  }
  return `${effectiveG.toFixed(2)} g (slider ${baseG.toFixed(2)} g · ${densityPct.toFixed(0)}% ρ)`;
}

function formatSliderValue(id, value){
  if(Number.isNaN(value)) return "—";
  if(id === "ambient_temp"){
    const degF = (value * 9/5) + 32;
    return `${value.toFixed(1)} °C (${degF.toFixed(1)} °F)`;
  }
  if(id === "altitude"){
    const feet = value * FT_PER_M;
    return `${value.toFixed(0)} m (${feet.toFixed(0)} ft)`;
  }
  if(MASS_IDS.has(id)) return `${value.toFixed(1)} g`;
  if(id === "area_hole"){
    const diameterMm = Math.sqrt((4 * value) / Math.PI) * 1000;
    return `${value.toFixed(5)} m² (diameter ${diameterMm.toFixed(1)} mm)`;
  }
  if(id === "damping_air") return value.toFixed(4);
  if(id === "volume_air"){
    const liters = value * 1000;
    return `${value.toFixed(4)} m³ (${liters.toFixed(1)} L)`;
  }
  if(STIFFNESS_IDS.has(id)) return `${value.toFixed(0)} N/m`;
  return fmt(value);
}

function isWhatIfPage(){
  return document.body?.dataset?.palette === "whatif";
}
function isWhatIfEnabled(){
  const toggle = document.getElementById("whatif_toggle");
  return Boolean(toggle && toggle.checked && isWhatIfPage());
}

function isWhatIfPage(){
  return typeof document !== "undefined" && document.body?.dataset?.palette === "whatif";
}
function isWhatIfEnabled(){
  const toggle = document.getElementById("whatif_toggle");
  return isWhatIfPage() && toggle && toggle.checked;
}

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

function detectPeaksAdaptive(series, desiredCount, baseOpts){
  const attempts = [
    baseOpts,
    { ...baseOpts, minProm: baseOpts.minProm * 0.75 },
    { ...baseOpts, minProm: baseOpts.minProm * 0.5, minDb: baseOpts.minDb - 5 },
    { ...baseOpts, minProm: baseOpts.minProm * 0.35, minDb: baseOpts.minDb - 10 }
  ];
  for(let i=0;i<attempts.length;i++){
    const result = detectPeaks(series, attempts[i]);
    if(result.length >= desiredCount || i === attempts.length - 1) return result;
  }
  return [];
}

function dominantAt(index, R){
  const palette = activeColors();
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
  const color = palette[bestKey];
  return { key: bestKey, name, color };
}

function expectedSubsystemKey(ordinal){
  const table = ["air","top","back","sides"];
  return table[ordinal - 1] || null;
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
const legendEl = $("legend");

function resizeCanvas(){
  const w = cvs.clientWidth, h = cvs.clientHeight;
  cvs.width = Math.max(1, Math.floor(w * dpi));
  cvs.height = Math.max(1, Math.floor(h * dpi));
  ctx.setTransform(dpi,0,0,dpi,0,0);
}
function resizeAndRender(){
  resizeCanvas();
  render();
}
window.addEventListener("resize", resizeAndRender);
resizeCanvas();

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

function renderLegend(showWhatIf){
  if(!legendEl) return;
  if(isWhatIfPage()){
    legendEl.innerHTML = `
      <div><span class="sw current"></span> Current Response</div>
      <div><span class="sw whatif${showWhatIf ? "" : " muted"}"></span> What‑If Response${showWhatIf ? "" : " (off)"}</div>
    `;
  } else {
    const palette = activeColors();
    legendEl.innerHTML = `
      <div><span class="sw total" style="background:${palette.total}"></span> Total</div>
      <div><span class="sw top" style="background:${palette.top}"></span> Top</div>
      <div><span class="sw back" style="background:${palette.back}"></span> Back</div>
      <div><span class="sw air" style="background:${palette.air}"></span> Air</div>
      <div><span class="sw sides" style="background:${palette.sides}"></span> Sides</div>
    `;
  }
}

function line(data, color, width=2, dashed=false, offsetDb=0){
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = dashed ? Math.max(1, width * 0.7) : width;
  if(dashed){
    ctx.globalAlpha = 0.45;
    ctx.setLineDash([6,4]);
  } else {
    ctx.setLineDash([]);
  }
  ctx.beginPath();
  let first = true;
  for(const p of data){
    const x = xPix(p.x), y = yPix(p.y + offsetDb);
    if(first){ ctx.moveTo(x,y); first=false; }
    else { ctx.lineTo(x,y); }
  }
  ctx.stroke();
  ctx.restore();
}


function drawLabel(x, y, text, color, yBump=0, opts={}){
  const lines = Array.isArray(text) ? text : [text];
  const padX=8, padY=5, lineH = 14;
  ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  let textWidth = 0;
  lines.forEach(line=>{
    textWidth = Math.max(textWidth, ctx.measureText(line).width);
  });
  const boxW = textWidth + padX*2;
  const boxH = lines.length * lineH + padY*2;

  // keep label within viewport
  let bx = Math.min(Math.max(6, x - boxW/2), cvs.clientWidth - boxW - 6);
  let by = Math.max(6, y - (boxH + 6) + yBump);

  const baseY = by + boxH;
  const stems = Array.isArray(opts.stems) && opts.stems.length ? opts.stems : null;

  // stems
  (stems || [{x, y, color}]).forEach(stem=>{
    ctx.strokeStyle = stem.color || color;
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    const anchorX = Math.max(bx + 3, Math.min(stem.x, bx + boxW - 3));
    ctx.moveTo(anchorX, baseY);
    ctx.lineTo(stem.x, stem.y);
    ctx.stroke();
  });

  // box
  ctx.fillStyle = "rgba(24,30,44,0.92)";
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(bx, by, boxW, boxH, 6);
  ctx.fill(); ctx.stroke();

  // text
  lines.forEach((line, idx)=>{
    let fill = color;
    if(opts.lineColors && opts.lineColors[idx]) fill = opts.lineColors[idx];
    else if(/What-If:/i.test(line)) fill = WHATIF_LINE_COLOR;
    else if(/Δ/.test(line)) fill = WHATIF_LINE_COLOR;
    ctx.fillStyle = fill;
    const ty = by + padY + lineH*(idx+1) - 2;
    ctx.fillText(line, bx + padX, ty);
  });
}

function buildWhatIfPeakList(basePeaks, whatPeaks, order){
  return basePeaks.map((pk, idx)=>{
    const name = modeName(order, idx + 1, expectedSubsystemKey(idx + 1));
    const baseText = `<span style="color:${BASE_LINE_COLOR}">${name}: <b>${pk.f.toFixed(1)} Hz</b></span>`;
    const what = whatPeaks?.[idx];
    if(!what) return `<div class="pl-item">${baseText}</div>`;
    const whatText = `<span style="color:${WHATIF_LINE_COLOR}"><b>${what.f.toFixed(1)} Hz</b></span>`;
    return `<div class="pl-item">${baseText} → ${whatText}</div>`;
  }).join(" ");
}

/* --------------------- Read UI params + adapter --------------------- */
function readUiInputs(){
  const g = id => parseFloat($(id).value);
  return {
    mass_top: g("mass_top"), mass_back: g("mass_back"),
    mass_sides: g("mass_sides"), mass_air: g("mass_air"),
    stiffness_top: g("stiffness_top"), stiffness_back: g("stiffness_back"),
    stiffness_sides: g("stiffness_sides"),
    damping_top: g("damping_top"), damping_back: g("damping_back"),
    damping_sides: g("damping_sides"), damping_air: g("damping_air"),
    area_top: g("area_top"), area_back: g("area_back"),
    area_sides: g("area_sides"), area_hole: g("area_hole"),
    volume_air: g("volume_air"), driving_force: g("driving_force"),
    ambient_temp: g("ambient_temp"), altitude: g("altitude"),
    model_order: parseInt($("model_order").value, 10),
    show_labels: $("show_labels").checked
  };
}

function adaptUiToSolver(raw){
  const out = { ...raw };
  MASS_IDS.forEach(key=>{
    const v = out[key];
    if(typeof v === "number" && !Number.isNaN(v)){
      out[key] = v / 1000;
    }
  });
  const alt = typeof out.altitude === "number" && !Number.isNaN(out.altitude) ? out.altitude : 0;
  const temp = typeof out.ambient_temp === "number" && !Number.isNaN(out.ambient_temp) ? out.ambient_temp : 20;
  const atm = deriveAtmosphere(alt, temp);
  const baseMassAirKg = Number.isFinite(out.mass_air) ? out.mass_air : null;
  if(baseMassAirKg !== null){
    const densityScale = atm.rho / REFERENCE_RHO;
    const effectiveMassAirKg = baseMassAirKg * densityScale;
    out.mass_air = effectiveMassAirKg;
    atm.baseMassAirKg = baseMassAirKg;
    atm.effectiveMassAirKg = effectiveMassAirKg;
    atm.densityScale = densityScale;
  }

  out.air_density = atm.rho;
  out.speed_of_sound = atm.c;
  out.air_pressure = atm.pressure;
  out.air_temp_k = atm.tempK;
  out._atm = atm;
  return out;
}

function readWhatIfRaw(baseRaw){
  if(!isWhatIfEnabled()) return null;
  const overlays = Array.from(document.querySelectorAll(".dual-slider__overlay.active"));
  if(overlays.length === 0) return null;
  const copy = { ...baseRaw };
  overlays.forEach(slider=>{
    const baseId = slider.dataset.baseId || slider.id.replace(/_whatif$/, "");
    const val = parseFloat(slider.value);
    if(Number.isNaN(val)) return;
    copy[baseId] = val;
  });
  return copy;
}

function buildParams(){
  const raw = readUiInputs();
  const base = adaptUiToSolver(raw);
  const whatRaw = readWhatIfRaw(raw);
  const whatIf = whatRaw ? adaptUiToSolver(whatRaw) : null;
  return { base, whatIf };
}

function render(){
  const { base, whatIf } = buildParams();
  const colors = activeColors();
  if(base._atm){
    const meta = $("atm_meta");
    if(meta) meta.textContent = formatAtmosphereSummary(base._atm);
    const massLabel = $("mass_air_val");
    const massText = formatEffectiveAirMass(base._atm);
    if(massLabel && massText) massLabel.textContent = massText;
  }
  const baseResponse = computeResponse(base);
  const showWhatIf = Boolean(whatIf);

  const whatIfResponse = showWhatIf ? computeResponse(whatIf) : null;
  const seriesForScale = whatIfResponse
    ? [...baseResponse.total, ...whatIfResponse.total.map(p => ({ x: p.x, y: p.y - 20 }))]
    : [...baseResponse.total, ...baseResponse.top, ...baseResponse.back, ...baseResponse.air, ...baseResponse.sides];
  const allVals = seriesForScale.map(d=>d.y);
  let vmin = Math.min(...allVals), vmax = Math.max(...allVals);
  vmin = Math.max(-140, Math.min(vmin, -10));
  vmax = Math.min(-5, Math.max(vmax, -120));
  const span = Math.max(15, (vmax - vmin) || 1);
  yMin = vmin - 0.05*span;
  yMax = vmax + 0.10*span;

  drawAxes();
  renderLegend(showWhatIf);
  if(showWhatIf && whatIfResponse){
    line(baseResponse.total, BASE_LINE_COLOR, 3, false);
    line(whatIfResponse.total, WHATIF_LINE_COLOR, 3, false, WHATIF_DB_OFFSET);
  } else {
    line(baseResponse.total, colors.total, 3, false);
    line(baseResponse.top,   colors.top, 2, true);
    line(baseResponse.back,  colors.back, 2, true);
    line(baseResponse.air,   colors.air, 2, true);
    line(baseResponse.sides, colors.sides, 2, true);
  }

  const maxN = maxPeaksFor(base.model_order);
  const basePeaks = detectPeaksAdaptive(baseResponse.total, maxN, {
    minDb: -95,
    minProm: 4.0,
    minDistHz: 20
  }).slice(0, maxN);
  const whatPeaks = whatIfResponse ? detectPeaksAdaptive(whatIfResponse.total, maxN, {
    minDb: -95,
    minProm: 4.0,
    minDistHz: 20
  }).slice(0, maxN) : null;

  if(base.show_labels){
    const bumps = [-10, -28, -46, -64];
    basePeaks.forEach((pk, idx)=>{
      const dom = dominantAt(pk.i, baseResponse);
      const ordinal = idx + 1;
      const expectedKey = expectedSubsystemKey(ordinal);
      const labelKey = expectedKey || dom.key;
      const colorKey = colors[labelKey] ? labelKey : dom.key;
      const color = colors[colorKey] || dom.color;
      const name = modeName(base.model_order, ordinal, labelKey);
      const what = (whatIfResponse && whatPeaks) ? whatPeaks[idx] : null;
      if(showWhatIf && what){
        const text = [
          name,
          `Current: ${pk.f.toFixed(1)} Hz`,
          `What-If: ${what.f.toFixed(1)} Hz`
        ];
        const baseX = xPix(pk.f);
        const baseY = yPix(pk.y);
        const whatX = xPix(what.f);
        const whatY = yPix(what.y + WHATIF_DB_OFFSET);
        const labelX = (baseX + whatX) / 2;
        const labelY = Math.min(baseY, whatY);
        drawLabel(labelX, labelY, text, color, bumps[idx % bumps.length], {
          lineColors: [color, color, WHATIF_LINE_COLOR],
          stems: [
            { x: baseX, y: baseY, color },
            { x: whatX, y: whatY, color: WHATIF_LINE_COLOR }
          ]
        });
      } else {
        const text = `${name} — ${pk.f.toFixed(1)} Hz`;
        drawLabel(xPix(pk.f), yPix(pk.y), text, color, bumps[idx % bumps.length]);
      }
    });
  }

  const el = $("peak_list");
  if(whatIfResponse){
    el.innerHTML = buildWhatIfPeakList(basePeaks, whatPeaks, base.model_order);
  } else if(basePeaks.length === 0){
    el.innerHTML = `<div class="small">No prominent peaks detected in 0–500 Hz (try increasing F, lowering damping, or adjusting volumes/stiffness).</div>`;
  } else {
    el.innerHTML = basePeaks.map((pk, idx)=>{
      const dom = dominantAt(pk.i, baseResponse);
      const ordinal = idx + 1;
      const expectedKey = expectedSubsystemKey(ordinal);
      const labelKey = expectedKey || dom.key;
      const colorKey = colors[labelKey] ? labelKey : dom.key;
      const color = colors[colorKey] || dom.color;
      const name = modeName(base.model_order, ordinal, labelKey);
      return `<div class="pl-item" style="color:${color}">${name}: <b>${pk.f.toFixed(1)} Hz</b> (prom≈${pk.prom.toFixed(1)} dB)</div>`;
    }).join("");
  }
}

/* --------------------- UI hooks --------------------- */
CONTROL_IDS.forEach(id=>{
  const el = $(id);
  if(!el) return;
  el.addEventListener("input", ()=>{
    const lab = $(`${id}_val`);
    if(lab && el.type === "range") lab.textContent = formatSliderValue(id, parseFloat(el.value));
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
  CONTROL_IDS.forEach(id=>{
    const el = $(id);
    if(!el) return;
    if(el.type === "range"){
      const v = parseFloat(el.value);
      const lab = $(`${id}_val`);
      if(lab && !Number.isNaN(v)) lab.textContent = formatSliderValue(id, v);
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
  ["ambient_temp","altitude","mass_top","mass_back","mass_sides","mass_air","stiffness_top","stiffness_back","stiffness_sides","damping_top","damping_back","damping_sides","damping_air","area_top","area_back","area_sides","area_hole","volume_air","driving_force"].forEach(id=>{
    const el = $(id), lab = $(`${id}_val`);
    if(el && lab) lab.textContent = formatSliderValue(id, parseFloat(el.value));
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

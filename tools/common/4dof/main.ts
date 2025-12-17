
// @ts-nocheck
/*
© 2025 Rick Molloy. All rights reserved.

This work extends and builds upon the acoustic-guitar modeling framework
originally developed and published by Trevor Gore and Gerard Gilet in
*Contemporary Acoustic Guitar Design and Build*. Their research established
the theoretical foundation used here. This implementation is an independent
derivative applying those principles in software form.

Permission is granted to view and reference this source code for educational
and research purposes only. Redistribution, modification, or commercial use
of this code or any derivative works is strictly prohibited without written
permission from the author.

This license supersedes all previous licensing for this repository.
*/

(() => {
  type TracePoint = { x: number; y: number };
  type SolverResponseSeries = {
    total: TracePoint[];
    top: TracePoint[];
    back: TracePoint[];
    air: TracePoint[];
    sides: TracePoint[];
    dipole?: TracePoint[];
    tripole?: TracePoint[];
  };
  type SliderMeta = Record<string, { min: number; max: number; step: number }>;
  type WhatIfField = {
    id: string;
    label: string;
    unit: string;
    precision?: number;
    threshold?: number;
    transform?: (value: number) => number;
    extra?: (baseVal: number, targetVal: number, delta?: number) => string | null | undefined;
  };
  type FitTargets = {
    freqs: Array<number | null>;
    mass_top: number | null;
    stiffness_top: number | null;
    mass_back: number | null;
    stiffness_back: number | null;
    volume_air: number | null;
    area_hole_diam: number | null;
    area_hole: number | null;
  };
  type Peak = { i: number; f: number; y: number; prom: number };

  type AtmosphereState = {
    rho: number;
    c: number;
    pressure?: number;
    tempK?: number;
    tempC?: number;
    altitude?: number;
    baseMassAirKg?: number;
    effectiveMassAirKg?: number;
    densityScale?: number;
  };

  type AtmosphereLib = {
    deriveAtmosphere: (altitude?: number, temp?: number) => AtmosphereState;
    formatAtmosphereSummary: (atm?: AtmosphereState | null) => string;
    formatEffectiveAirMass: (meta: { effectiveMassAirKg?: number; baseMassAirKg?: number; densityScale?: number } | null) => string | null;
    FT_PER_M: number;
    REFERENCE_RHO: number;
  };

  const $ = (globalThis as any).$ as (id: string) => HTMLElement | null;
  const fmt = (globalThis as any).fmt as (value: number) => string;
  const computeResponse = (globalThis as any).computeResponse as (params: Record<string, number | boolean | undefined>) => SolverResponseSeries;
  const Plotly = (globalThis as any).Plotly;

  const DEFAULT_COLORS = { total: "#ff9a5c", top: "#61a8ff", back: "#47d78a", air: "#b38cff", sides: "#ffd166" };
const WHATIF_COLORS = { ...DEFAULT_COLORS, total: "#61a8ff" };
function activeColors(): typeof DEFAULT_COLORS { return (typeof document !== "undefined" && document.body?.dataset?.palette === "whatif") ? WHATIF_COLORS : DEFAULT_COLORS; }
const BASE_LINE_COLOR = "#61a8ff";
const WHATIF_LINE_COLOR = "#ff9a5c";
const FREQ_MIN_HZ = 90;
const FREQ_MAX_HZ = 500;
const WHATIF_AXIS_OFFSET_DB = 20;
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
const FIT_PARAM_IDS = [
  "mass_top","stiffness_top","mass_back","stiffness_back",
  "volume_air","area_top","area_hole"
];

function hexToRgb(hex: string | null | undefined): [number, number, number] {
  const clean = hex?.replace("#", "");
  if(!clean || clean.length !== 6) return [255, 255, 255];
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16)
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (value: number) => Math.max(0, Math.min(255, value));
  return `#${[r, g, b].map(v => clamp(v).toString(16).padStart(2, "0")).join("")}`;
}

function mixHex(color: string, base = "#0b0f16", ratio = 0.65): string {
  const a = hexToRgb(color);
  const b = hexToRgb(base);
  const mix = a.map((val, idx) => Math.round(val * ratio + b[idx] * (1 - ratio)));
  return rgbToHex(mix[0], mix[1], mix[2]);
}

function buildSliderMeta(): SliderMeta {
  const meta: SliderMeta = {};
  RANGE_IDS.forEach(id=>{
    const el = $(id) as HTMLInputElement | null;
    if(!el) return;
    const min = parseFloat(el.min);
    const max = parseFloat(el.max);
    const step = parseFloat(el.step);
    meta[id] = {
      min: Number.isFinite(min) ? min : -Infinity,
      max: Number.isFinite(max) ? max : Infinity,
      step: Number.isFinite(step) ? step : 0.0001
    };
  });
  return meta;
}
const SLIDER_META = buildSliderMeta();
const WHATIF_SUMMARY_FIELDS = [
  { id: "mass_top", label: "top plate mass", unit: "g", precision: 1, threshold: 0.1 },
  { id: "stiffness_top", label: "top plate stiffness", unit: "N/m", precision: 0, threshold: 50 },
  { id: "mass_back", label: "back plate mass", unit: "g", precision: 1, threshold: 0.1 },
  { id: "stiffness_back", label: "back plate stiffness", unit: "N/m", precision: 0, threshold: 50 },
  { id: "volume_air", label: "cavity volume", unit: "m³", precision: 4, threshold: 0.00005 },
  {
    id: "area_hole",
    label: "soundhole diameter",
    unit: "mm",
    precision: 1,
    threshold: 0.1,
    transform: areaToDiameterMm,
    extra: (baseVal, targetVal)=>{
      const deltaArea = targetVal - baseVal;
      const sign = deltaArea >= 0 ? "+" : "-";
      return ` (${sign}${Math.abs(deltaArea).toFixed(5)} m²)`;
    }
  }
];

function getAdjustableIds(raw: Record<string, number | boolean | undefined>){
  return FIT_PARAM_IDS.filter(id=>{
    return typeof raw[id] === "number" && !Number.isNaN(raw[id]) && SLIDER_META[id];
  });
}

const AtmosphereLib: AtmosphereLib | null = (typeof globalThis !== "undefined" && (globalThis as any).Atmosphere)
  ? (globalThis as any).Atmosphere
  : null;
if(!AtmosphereLib){
  throw new Error("Missing Atmosphere library. Ensure tools/common/atmosphere.js is loaded before main.js.");
}
const {
  deriveAtmosphere,
  formatAtmosphereSummary,
  formatEffectiveAirMass,
  FT_PER_M,
  REFERENCE_RHO
} = AtmosphereLib;

function formatSliderValue(id: string, value: number){
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

function areaToDiameterMm(area: number){
  if(!Number.isFinite(area) || area <= 0) return NaN;
  return Math.sqrt((4 * area) / Math.PI) * 1000;
}

function diameterMmToArea(diamMm: number){
  if(!Number.isFinite(diamMm) || diamMm <= 0) return NaN;
  const meters = diamMm / 1000;
  return Math.PI * Math.pow(meters, 2) / 4;
}

function isWhatIfPage(){
  return typeof document !== "undefined" && document.body?.dataset?.palette === "whatif";
}
function isWhatIfEnabled(){
  const toggle = document.getElementById("whatif_toggle") as HTMLInputElement | null;
  return isWhatIfPage() && toggle && toggle.checked;
}

/* --------------------- Peak detection & labeling --------------------- */
function subs(n){ return ["","₁","₂","₃","₄","₅"][n] || ("_"+n); }
function maxPeaksFor(order){ return Math.min(4, Math.max(1, order)); }

function detectPeaks(series: TracePoint[], // array of {x, y}
  { minDb=-90, minProm=4, minDistHz=20 }: { minDb?: number; minProm?: number; minDistHz?: number } = {}
): Peak[]{
  // collect local maxima
  const cands: Peak[] = [];
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
  const picked: Peak[] = [];
  for(const p of cands){
    if(picked.some(q => Math.abs(q.f - p.f) < minDistHz)) continue;
    picked.push(p);
  }
  // sort by frequency for readable labels
  picked.sort((a,b)=>a.f - b.f);
  return picked;
}

function detectPeaksAdaptive(series: TracePoint[], desiredCount: number, baseOpts: { minDb: number; minProm: number; minDistHz: number }): Peak[]{
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

function dominantAt(index: number, R: SolverResponseSeries){
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

function expectedSubsystemKey(ordinal: number){
  const table = ["air","top","back","sides"];
  return table[ordinal - 1] || null;
}

function modeName(order: number, ordinal: number, domKey: string | null){
  if(order === 1) return "A(0,1)";
  // For 2–4 DOF, label the T(1,1) family and append dominant subsystem
  const base = `T(1,1)${subs(ordinal)}`;
  const tag = {top:"top", back:"back", air:"air", sides:"sides"}[domKey] || "";
  return tag ? `${base} (${tag})` : base;
}

/* --------------------- Plotting --------------------- */
const plotEl = $("plot") as HTMLElement | null;
  const PLOTLY_CONFIG = {
    responsive: true,
    displaylogo: false,
    modeBarButtonsToRemove: ["lasso2d","select2d","autoScale2d","zoom","pan","resetScale2d"]
  };
  let lastPlot: { traces: any[]; layout: any } | null = null;
  let pendingFrame: number | null = null;
  let render: () => void;

  function computeResponseSafe(params: Record<string, number | boolean | undefined>){
    try {
      return computeResponse(params);
    } catch(err){
      console.error("computeResponse failed; attempting JS fallback.", err);
      const js = (globalThis as any).computeResponseJs;
      if(typeof js === "function"){
        try { return js(params); } catch(err2){ console.error("JS fallback computeResponse failed.", err2); }
      }
      return null;
    }
  }

  function buildTrace(series: TracePoint[], label: string, color: string, { width=2, dash="solid", axis="y" }: { width?: number; dash?: "solid" | "dot" | "dash"; axis?: string } = {}){
    const xs: number[] = [];
    const ys: number[] = [];
    series.forEach(p=>{
      if(Number.isFinite(p?.x) && Number.isFinite(p?.y)){
        xs.push(p.x);
        ys.push(p.y);
      }
    });
    if(xs.length === 0 || ys.length === 0) return null;
    const hoverBg = mixHex(color, "#0b0f16", 0.55);
    return {
      x: xs,
      y: ys,
      mode: "lines",
      name: label,
      line: { color, width, dash, shape: "spline", smoothing: 1 },
      hovertemplate: `${label}: %{y:.2f} dB @ %{x:.1f} Hz<extra></extra>`,
      hoverlabel: {
        bgcolor: hoverBg,
        bordercolor: color,
        font: { color: "#ffffff", size: 11, family: "Inter, system-ui, -apple-system, Segoe UI" }
      },
      yaxis: axis
    };
  }

function yBoundsWithin(traces: Array<{ x: number[]; y: number[] }>, minHz: number, maxHz: number): [number, number]{
  let min = Infinity;
  let max = -Infinity;
  traces.forEach(trace=>{
    trace.x.forEach((x, idx)=>{
      if(x < minHz || x > maxHz) return;
      const y = trace.y[idx];
      if(!Number.isFinite(y)) return;
      if(y < min) min = y;
      if(y > max) max = y;
    });
  });
  if(!Number.isFinite(min) || !Number.isFinite(max)){
    return [-100, -20];
  }
  const span = Math.max(1, max - min);
  const padding = span * 0.10;
  return [min - padding, max + padding];
}

function niceStep(span: number, maxTicks=6){
  if(span <= 0 || !Number.isFinite(span)) return 5;
  const raw = span / Math.max(1, maxTicks);
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const multiples = [1, 2, 5, 10];
  for(const m of multiples){
    const step = m * pow;
    if(raw <= step) return step;
  }
  return 10 * pow;
}

function buildTickValues(min: number, max: number){
  if(!Number.isFinite(min) || !Number.isFinite(max)) return [];
  const span = Math.max(1, max - min);
  const step = niceStep(span, 6);
  const start = Math.floor(min / step) * step;
  const ticks = [];
  for(let v = start; v <= max + step * 0.5; v += step){
    ticks.push(parseFloat(v.toFixed(4)));
  }
  return ticks;
}

function formatTickLabel(value: number){
  if(!Number.isFinite(value)) return "";
  if(Math.abs(value) >= 50) return value.toFixed(0);
  if(Math.abs(value) >= 10) return value.toFixed(1);
  return value.toFixed(2);
}

function buildAnnotations(peaks: Peak[], whatPeaks: Peak[] | null, baseResponse: SolverResponseSeries, showWhatIf: boolean, order: number){
  const annotations = [];
  peaks.forEach((pk, idx)=>{
    const dom = dominantAt(pk.i, baseResponse);
    const ordinal = idx + 1;
    const expectedKey = expectedSubsystemKey(ordinal);
    const labelKey = expectedKey || dom.key;
    const name = modeName(order, ordinal, labelKey);
    const what = showWhatIf ? whatPeaks?.[idx] : null;
    let text = `${name}<br>${pk.f.toFixed(1)} Hz`;
    if(what) text += `<br>What-If ${what.f.toFixed(1)} Hz`;
    annotations.push({
      x: pk.f,
      y: pk.y,
      text,
      bgcolor: "rgba(11,15,22,0.92)",
      bordercolor: dom.color,
      font: { color: "#fff", size: 11 },
      arrowcolor: dom.color,
      arrowsize: 1,
      arrowwidth: 1,
      ax: 0,
      ay: -40 - (idx * 8)
    });
  });
  return annotations;
}

function buildWhatIfPeakList(basePeaks: Peak[], whatPeaks: Peak[] | null, order: number){
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
function readUiInputs(): Record<string, number | boolean>{
  const g = (id: string) => {
    const el = $(id) as HTMLInputElement | null;
    return el ? parseFloat(el.value) : NaN;
  };
  const modelOrderEl = $("model_order") as HTMLInputElement | null;
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
    model_order: parseInt(modelOrderEl?.value ?? "4", 10),
    show_labels: Boolean((($("show_labels") as HTMLInputElement | null)?.checked))
  };
}

function adaptUiToSolver(raw: Record<string, number | boolean>): Record<string, any>{
  const out: Record<string, any> = { ...raw };
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

function readWhatIfRaw(baseRaw: Record<string, number | boolean>){
  if(!isWhatIfEnabled()) return null;
  const overlays = Array.from(document.querySelectorAll<HTMLInputElement>(".dual-slider__overlay.active"));
  if(overlays.length === 0) return null;
  const copy: Record<string, number | boolean> = { ...baseRaw };
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

function clampToSlider(id: string, value: number){
  const meta = SLIDER_META[id];
  if(!meta || !Number.isFinite(value)) return value;
  let v = value;
  if(Number.isFinite(meta.min)) v = Math.max(meta.min, v);
  if(Number.isFinite(meta.max)) v = Math.min(meta.max, v);
  return v;
}

function applyRawValues(raw: Record<string, number>){
  Object.entries(raw).forEach(([key, val])=>{
    if(!Number.isFinite(val)) return;
    const el = $(key) as HTMLInputElement | null;
    if(!el) return;
    const next = clampToSlider(key, val);
    el.value = next;
    if(el.type === "range"){
      const lab = $(`${key}_val`);
      if(lab) lab.textContent = formatSliderValue(key, next);
    }
  });
  render();
}

function ensureWhatIfModeOn(){
  const toggle = $("whatif_toggle") as HTMLInputElement | null;
  if(!toggle) return;
  if(!toggle.checked){
    toggle.checked = true;
    toggle.dispatchEvent(new Event("change", { bubbles: true }));
  } else {
    document.body.classList.add("whatif-mode");
  }
}

function applyWhatIfRawValues(raw: Record<string, number>){
  ensureWhatIfModeOn();
  let applied = false;
  FIT_PARAM_IDS.forEach(id=>{
    if(!Number.isFinite(raw[id])) return;
    const overlay = document.getElementById(`${id}_whatif`) as HTMLInputElement | null;
    if(!overlay) return;
    const next = clampToSlider(id, raw[id] as number);
    overlay.value = next;
    overlay.dispatchEvent(new Event("input", { bubbles: true }));
    applied = true;
  });
  if(!applied) throw new Error("No What-If sliders available to adjust.");
}

function describeDeltaLine(field: WhatIfField, baseRaw: Record<string, number>, targetRaw: Record<string, number>){
  const baseVal = baseRaw[field.id];
  const targetVal = targetRaw[field.id];
  if(!Number.isFinite(baseVal) || !Number.isFinite(targetVal)) return null;
  let base = baseVal;
  let target = targetVal;
  if(typeof field.transform === "function"){
    base = field.transform(baseVal);
    target = field.transform(targetVal);
  }
  if(!Number.isFinite(base) || !Number.isFinite(target)) return null;
  const delta = target - base;
  if(Math.abs(delta) < (field.threshold ?? 0)) return null;
  const dir = delta >= 0 ? "Increase" : "Decrease";
  const precision = typeof field.precision === "number" ? field.precision : 2;
  const amount = Math.abs(delta).toFixed(precision);
  let line = `${dir} ${field.label} by ${amount} ${field.unit}`;
  if(field.extra) line += field.extra(baseVal, targetVal, delta) || "";
  return line;
}

function buildWhatIfSummary(baseRaw: Record<string, number> | null, targetRaw: Record<string, number> | null){
  if(!baseRaw || !targetRaw) return null;
  const lines = WHATIF_SUMMARY_FIELDS
    .map(field => describeDeltaLine(field, baseRaw, targetRaw))
    .filter(Boolean);
  return lines.length ? lines : null;
}

function updateWhatIfSummary(lines: string[] | null){
  const box = $("whatif_summary") as HTMLElement | null;
  if(!box) return;
  const body = box.querySelector(".delta-summary__body") as HTMLElement | null || box;
  if(!lines || !lines.length){
    body.textContent = "Run Solve Targets to see suggested adjustments.";
    box.classList.remove("has-content");
    return;
  }
  const html = `<ul>${lines.map(line=>`<li>${line}</li>`).join("")}</ul>`;
  body.innerHTML = html;
  box.classList.add("has-content");
}

function setWhatIfSummary(lines: string[] | null){
  updateWhatIfSummary(lines);
}
window.setWhatIfSummary = setWhatIfSummary;

function collectFitTargets(form: HTMLFormElement): FitTargets{
  const read = (id: string)=>{
    const el = form.querySelector<HTMLInputElement>(`#${id}`);
    if(!el) return null;
    const val = parseFloat(el.value);
    return Number.isFinite(val) ? val : null;
  };
  return {
    freqs: [read("fit_freq_1"), read("fit_freq_2"), read("fit_freq_3")],
    mass_top: read("fit_mass_top"),
    stiffness_top: read("fit_stiffness_top"),
    mass_back: read("fit_mass_back"),
    stiffness_back: read("fit_stiffness_back"),
    volume_air: read("fit_volume_air"),
    area_hole_diam: read("fit_area_hole_diam"),
    area_hole: (()=>{
      const diam = read("fit_area_hole_diam");
      return Number.isFinite(diam) ? diameterMmToArea(diam) : null;
    })()
  };
}

function hasFitTargets(targets: FitTargets){
  if(targets.freqs && targets.freqs.some(v=>Number.isFinite(v))) return true;
  return ["mass_top","stiffness_top","mass_back","stiffness_back","volume_air","area_hole"]
    .some(key => Number.isFinite(targets[key]));
}

function sqRelative(value: number, target: number){
  const denom = Math.max(Math.abs(target), 1);
  const diff = (value - target) / denom;
  return diff * diff;
}

function evaluateFitDetail(raw: Record<string, number>, targets: FitTargets){
  const params = adaptUiToSolver(raw);
  const response = computeResponse(params);
  const maxN = maxPeaksFor(params.model_order as number);
  const peaks = detectPeaksAdaptive(response.total, maxN, {
    minDb: -95,
    minProm: 4.0,
    minDistHz: 20
  }).slice(0, 3);

  let cost = 0;
  const freqErrors: number[] = [];
  targets.freqs?.forEach((target, idx)=>{
    if(!Number.isFinite(target)) return;
    const pk = peaks[idx];
    const actual = pk ? pk.f : target;
    const diff = actual - target;
    freqErrors.push(diff);
    const denom = Math.max(target, 1);
    cost += 10 * (diff/denom) * (diff/denom);
  });

  if(Number.isFinite(targets.mass_top)) cost += sqRelative(raw.mass_top, targets.mass_top);
  if(Number.isFinite(targets.stiffness_top)) cost += sqRelative(raw.stiffness_top, targets.stiffness_top);
  if(Number.isFinite(targets.mass_back)) cost += sqRelative(raw.mass_back, targets.mass_back);
  if(Number.isFinite(targets.stiffness_back)) cost += sqRelative(raw.stiffness_back, targets.stiffness_back);
  if(Number.isFinite(targets.volume_air)) cost += sqRelative(raw.volume_air, targets.volume_air);
  if(Number.isFinite(targets.area_hole)) cost += sqRelative(raw.area_hole, targets.area_hole);

  return { cost, peaks, freqErrors };
}

function evaluateFitCost(raw: Record<string, number>, targets: FitTargets){
  return evaluateFitDetail(raw, targets).cost;
}

function runCoordinateDescent(initialRaw: Record<string, number>, adjustableIds: string[], targets: FitTargets, { maxIter=80, clampDirection }: { maxIter?: number; clampDirection?: (id: string, delta: number) => boolean | void } = {}){
  if(!adjustableIds.length) throw new Error("No adjustable parameters available.");
  let best = { ...initialRaw };
  let bestCost = evaluateFitCost(best, targets);
  if(!Number.isFinite(bestCost)) bestCost = 1e6;

  const stepSizes: Record<string, number> = {};
  adjustableIds.forEach(id=>{
    const meta = SLIDER_META[id];
    const span = (Number.isFinite(meta.max) && Number.isFinite(meta.min))
      ? Math.max(meta.max - meta.min, Math.abs(best[id]) || 1)
      : Math.abs(best[id]) || 1;
    stepSizes[id] = span * 0.05;
  });

  let decay = 1;
  for(let iter=0; iter<maxIter; iter++){
    let improved = false;
    for(const id of adjustableIds){
      const meta = SLIDER_META[id];
      const baseStep = Math.max(stepSizes[id] * decay, meta.step || 0.0001);
      const tryDelta = (delta: number)=>{
        if(clampDirection && !clampDirection(id, delta)) return null;
        const candidate = { ...best, [id]: clampToSlider(id, best[id] + delta) };
        const cost = evaluateFitCost(candidate, targets);
        return { candidate, cost };
      };
      const plus = tryDelta(baseStep);
      const minus = tryDelta(-baseStep);
      let next = null;
      if(plus && plus.cost < bestCost) next = plus;
      if(minus && minus.cost < ((next && next.cost) || bestCost)) next = minus;
      if(next){
        best = next.candidate;
        bestCost = next.cost;
        improved = true;
      }
    }
    if(!improved){
      decay *= 0.6;
      if(decay < 0.05) break;
    }
  }
  return { raw: best, evaluation: evaluateFitDetail(best, targets) };
}

function fitBaselineParameters(targets: FitTargets, opts: { maxIter?: number; restrictSimple?: boolean } = {}){
  const raw = readUiInputs();
  const adjustable = getAdjustableIds(raw);
  return runCoordinateDescent(raw as Record<string, number>, adjustable, targets, opts);
}

function buildDirectionClamp(options: { restrictSimple?: boolean } | undefined){
  if(!options || !options.restrictSimple) return null;
  const increaseOnly = new Set(["mass_top","mass_back"]);
  const allowed = new Set(["mass_top","mass_back","area_hole"]);
  return (id: string, delta: number)=>{
    if(!allowed.has(id)) return false;
    if(increaseOnly.has(id)) return delta >= 0;
    return true;
  };
}

function fitWhatIfParameters(targets: FitTargets, opts: { maxIter?: number; restrictSimple?: boolean } = {}){
  const baseRaw = readUiInputs();
  const whatRaw = readWhatIfRaw(baseRaw);
  const initial = whatRaw ? whatRaw : { ...baseRaw };
  const adjustable = getAdjustableIds(initial).filter(id=>id !== "volume_air");
  const restrictClamp = buildDirectionClamp(opts);
  const stiffnessClamp = (id: string, delta: number)=>{
    if(id === "stiffness_top" || id === "stiffness_back") return delta <= 0;
    return true;
  };
  const clampDirection = (id: string, delta: number)=>{
    if(!stiffnessClamp(id, delta)) return false;
    if(restrictClamp && !restrictClamp(id, delta)) return false;
    return true;
  };
  const result = runCoordinateDescent(initial as Record<string, number>, adjustable, targets, { ...opts, clampDirection });
  return { ...result, baseRaw };
}

function initFitAssistUi(){
  const baselineBtn = $("btn_fit_baseline");
  const whatIfBtn = $("btn_fit_whatif");
  const modal = $("fit_modal");
  const inlinePanel = document.querySelector<HTMLDetailsElement>("[data-fit-panel='inline']");
  const form = $("fit_form") as HTMLFormElement | null;
  const status = $("fit_status") as HTMLElement | null;
  if(!form || !status) return;

  const isModal = Boolean(modal);
  const isInline = Boolean(inlinePanel);
  if(!isModal && !isInline) return;

  const titleEl = modal?.querySelector("header h2") as HTMLElement | null;
  const submitBtn = form.querySelector("button[type=submit]") as HTMLButtonElement | null;
  let mode = form.dataset?.fitMode || "baseline";

  const setMode = (nextMode: string)=>{
    mode = nextMode;
    if(titleEl) titleEl.textContent = mode === "whatif" ? "Solve Targets" : "Fit My Guitar";
    if(submitBtn) submitBtn.textContent = mode === "whatif" ? "Compute Recipe" : "Fit My Guitar";
  };
  const openPanel = (nextMode: string)=>{
    setMode(nextMode);
    status.textContent = "";
    if(isModal){
      modal.classList.add("is-open");
      modal.setAttribute("aria-hidden","false");
    } else if(isInline){
      inlinePanel.open = true;
      inlinePanel.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };
  const closePanel = ()=>{
    if(!isModal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden","true");
    status.textContent = "";
    form.reset();
  };

  baselineBtn?.addEventListener("click", ()=>openPanel("baseline"));
  whatIfBtn?.addEventListener("click", ()=>openPanel("whatif"));

  if(isModal){
    const closeButtons = modal.querySelectorAll<HTMLElement>("[data-fit-close]");
    closeButtons.forEach(el=>el.addEventListener("click", closePanel));
    modal.addEventListener("click", evt=>{
      if(evt.target === modal || evt.target.classList.contains("fit-modal__backdrop")) closePanel();
    });
  } else if(isInline){
    inlinePanel.addEventListener("toggle", ()=>{
      if(!inlinePanel.open) status.textContent = "";
    });
  }

  const resetBtn = form.querySelector("[data-fit-reset]");
  if(resetBtn){
    resetBtn.addEventListener("click",()=>{
      if(mode === "whatif"){
        if(window.resetWhatIfOverlays) window.resetWhatIfOverlays();
        else document.getElementById("btn_reset_whatif")?.click();
        status.textContent = "What-If sliders reset.";
      } else {
        document.getElementById("btn_reset")?.click();
        status.textContent = "Baseline reset to defaults.";
      }
    });
  }

  const toggleDisabled = (disabled: boolean)=>{
    form.querySelectorAll<HTMLInputElement | HTMLButtonElement>("input,button").forEach(el=>{
      if(el.dataset.fitClose !== undefined) return;
      el.disabled = disabled;
    });
  };

  form.addEventListener("submit", async evt=>{
    evt.preventDefault();
    const targets = collectFitTargets(form);
    if(!hasFitTargets(targets)){
      status.textContent = "Enter at least one target to fit.";
      return;
    }
    const restrictSimple = Boolean($("fit_restrict_simple")?.checked);
    status.textContent = "Solving…";
    toggleDisabled(true);
    await new Promise(requestAnimationFrame);
    try{
      const result = mode === "whatif"
        ? fitWhatIfParameters(targets, { maxIter: 90, restrictSimple })
        : fitBaselineParameters(targets, { maxIter: 90 });

      if(mode === "whatif"){
        applyWhatIfRawValues(result.raw);
        const summary = buildWhatIfSummary(result.baseRaw, result.raw);
        setWhatIfSummary(summary);
        if(inlinePanel && inlinePanel.open){
          inlinePanel.open = false;
        }
      } else {
        applyRawValues(result.raw);
        setWhatIfSummary(null);
        if(inlinePanel && inlinePanel.open){
          inlinePanel.open = false;
        }
      }

      const diffs = result.evaluation.freqErrors.filter(v=>Number.isFinite(v));
      const rms = diffs.length ? Math.sqrt(diffs.reduce((sum,v)=>sum + v*v, 0) / diffs.length) : null;
      status.textContent = rms != null
        ? `Fit complete. RMS Δf ≈ ${rms.toFixed(2)} Hz.`
        : "Fit complete.";
    } catch(err: any){
      console.error(err);
      status.textContent = err?.message || (mode === "whatif" ? "Unable to fit What-If." : "Unable to fit your guitar.");
    } finally {
      toggleDisabled(false);
    }
  });

  setMode(mode);
}

async function renderNow(): Promise<void> {
    const { base, whatIf } = buildParams();
    const colors = activeColors();
  if(base._atm){
    const meta = $("atm_meta");
    if(meta) meta.textContent = formatAtmosphereSummary(base._atm);
    const massLabel = $("mass_air_val");
    const massText = formatEffectiveAirMass(base._atm);
    if(massLabel && massText) massLabel.textContent = massText;
  }
  const baseResponse = computeResponseSafe(base);
  const validBase = baseResponse && Array.isArray(baseResponse.total) && baseResponse.total.length > 1;
  if(!validBase){
    console.warn("Skipping render; baseResponse invalid or empty.", baseResponse);
    return;
  }
  const showWhatIf = Boolean(whatIf);
  const whatIfResponse = showWhatIf ? computeResponseSafe(whatIf as any) : null;
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

  if(plotEl && typeof Plotly !== "undefined"){
    const traces: any[] = [];
      if(showWhatIf && whatIfResponse){
        const t1 = buildTrace(baseResponse.total, "Current Total", BASE_LINE_COLOR, { width: 3 });
        const t2 = buildTrace(whatIfResponse.total, "What-If Total", WHATIF_LINE_COLOR, { width: 3, axis: "y2" });
        if(t1) traces.push(t1);
        if(t2) traces.push(t2);
      } else {
      const tTotal = buildTrace(baseResponse.total, "Total", colors.total, { width: 3 });
      const tTop = buildTrace(baseResponse.top, "Top", colors.top, { dash: "dot" });
      const tBack = buildTrace(baseResponse.back, "Back", colors.back, { dash: "dot" });
      const tAir = buildTrace(baseResponse.air, "Air", colors.air, { dash: "dot" });
      const tSides = buildTrace(baseResponse.sides, "Sides", colors.sides, { dash: "dot" });
      [tTotal, tTop, tBack, tAir, tSides].forEach(t=>{ if(t) traces.push(t); });
    }
    const hasValidData = traces.length > 0 && traces.every(t => Array.isArray(t.x) && Array.isArray(t.y) && t.x.length > 0 && t.y.length > 0);
    if(!hasValidData){
      console.warn("Skipping Plotly render; traces invalid/empty.", traces);
      if(lastPlot && plotEl){
        try {
          Plotly.react(plotEl, lastPlot.traces, lastPlot.layout, PLOTLY_CONFIG);
        } catch(err){
          console.error("Failed to restore previous plot", err);
        }
      }
      return;
    }
    const [yMin, yMax] = yBoundsWithin(traces, FREQ_MIN_HZ, FREQ_MAX_HZ);
    const tickVals = buildTickValues(yMin, yMax);
    const safeTicks = tickVals.length ? tickVals : [yMin, yMax];
    const layout: any = {
      margin: { l: 64, r: 28, t: 22, b: 48 },
      paper_bgcolor: "#0b0f16",
      plot_bgcolor: "#0f1422",
      font: { color: "#f0f2ff", family: "system-ui, -apple-system, Segoe UI" },
      xaxis: {
        title: "Frequency (Hz)",
        range: [25, 450],
        gridcolor: "#1a2131",
        tickfont: { size: 11, color: "#f0f2ff" },
        titlefont: { size: 12 },
        zeroline: false,
        ticks: "outside",
        tickcolor: "#1a2131"
      },
      yaxis: {
        title: "Sound Pressure Level (dB)",
        range: [yMin, yMax],
        tickmode: "array",
        tickvals: safeTicks,
        ticktext: safeTicks.map(formatTickLabel),
        gridcolor: "#1a2131",
        tickfont: { size: 11, color: BASE_LINE_COLOR },
        titlefont: { size: 12, color: BASE_LINE_COLOR },
        zeroline: false,
        ticks: "outside",
        tickcolor: BASE_LINE_COLOR,
        linecolor: BASE_LINE_COLOR
      },
      legend: { orientation: "h", x: 0, y: 1.12, bgcolor: "rgba(0,0,0,0)" },
      hovermode: showWhatIf ? "x unified" : "x",
      hoverlabel: {
        bgcolor: "#1c2335",
        bordercolor: "#384152",
        font: { size: 11, family: "system-ui, -apple-system, Segoe UI" }
      },
      annotations: base.show_labels ? buildAnnotations(basePeaks, whatPeaks, baseResponse, showWhatIf, base.model_order) : []
    };
    if(showWhatIf){
      layout.yaxis2 = {
        title: `What-If SPL (dB +${WHATIF_AXIS_OFFSET_DB})`,
        overlaying: "y",
        side: "right",
        range: [yMin, yMax],
        tickmode: "array",
        tickvals: safeTicks,
        ticktext: safeTicks.map(v=>formatTickLabel(v + WHATIF_AXIS_OFFSET_DB)),
        tickfont: { size: 11, color: WHATIF_LINE_COLOR },
        titlefont: { size: 12, color: WHATIF_LINE_COLOR },
        showgrid: false,
        zeroline: false,
        ticks: "outside",
        tickcolor: WHATIF_LINE_COLOR,
        linecolor: WHATIF_LINE_COLOR
      };
    } else {
      layout.yaxis2 = {
        overlaying: "y",
        side: "right",
        showticklabels: false,
        ticks: "",
        showgrid: false,
        zeroline: false
      };
      }
      try{
        await Plotly.react(plotEl, traces, layout, PLOTLY_CONFIG);
        lastPlot = { traces, layout };
      } catch(err){
        console.error("Plot render failed; restoring previous plot if available.", err);
        if(lastPlot){
          try {
            await Plotly.react(plotEl, lastPlot.traces, lastPlot.layout, PLOTLY_CONFIG);
          } catch(innerErr){
            console.error("Failed to restore previous plot", innerErr);
          }
        }
      }
  }

  const el = $("peak_list") as HTMLElement | null;
  if(el){
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
        const colorKey = (colors as Record<string, string>)[labelKey] ? labelKey : dom.key;
        const color = (colors as Record<string, string>)[colorKey] || dom.color;
        const name = modeName(base.model_order, ordinal, labelKey);
        return `<div class="pl-item" style="color:${color}">${name}: <b>${pk.f.toFixed(1)} Hz</b> (prom≈${pk.prom.toFixed(1)} dB)</div>`;
      }).join("");
    }
  }
}

  render = function render(): void {
    if(pendingFrame !== null){
      cancelAnimationFrame(pendingFrame);
    }
    pendingFrame = requestAnimationFrame(async ()=>{
      pendingFrame = null;
      try {
        await renderNow();
      } catch(err){
        console.error("Render error", err);
      }
    });
  };

initFitAssistUi();

/* --------------------- UI hooks --------------------- */
CONTROL_IDS.forEach(id=>{
  const el = $(id) as HTMLInputElement | null;
  if(!el) return;
  el.addEventListener("input", ()=>{
    const lab = $(`${id}_val`);
    if(lab && el.type === "range") lab.textContent = formatSliderValue(id, parseFloat(el.value));
    if(id === "model_order"){
      const labels = {1:"1‑DOF",2:"2‑DOF",3:"3‑DOF",4:"4‑DOF"};
      const modelLabel = $("model_label");
      if(modelLabel) modelLabel.textContent = labels[parseInt(el.value,10)] || "—";
      setModelVisibility(parseInt(el.value,10));
    }
    render();
  });
});

/* initialize displayed numbers from defaults */
(function initVals(){
  CONTROL_IDS.forEach(id=>{
    const el = $(id) as HTMLInputElement | null;
    if(!el) return;
    if(el.type === "range"){
      const v = parseFloat(el.value);
      const lab = $(`${id}_val`);
      if(lab && !Number.isNaN(v)) lab.textContent = formatSliderValue(id, v);
    }
  });
})();

/* Show/hide blocks based on model order */
function setModelVisibility(order: number){
  const topBlock = $("blk_top") as HTMLElement | null;
  const backBlock = $("blk_back") as HTMLElement | null;
  const sidesBlock = $("blk_sides") as HTMLElement | null;
  if(topBlock) topBlock.style.display   = (order>=2) ? "" : "none";
  if(backBlock) backBlock.style.display  = (order>=3) ? "" : "none";
  if(sidesBlock) sidesBlock.style.display = (order>=4) ? "" : "none";
}

/* Reset */
const resetButton = $("btn_reset");
resetButton?.addEventListener("click", ()=>{
  document.querySelectorAll<HTMLInputElement>("input[type=range]").forEach(e => { e.value = e.defaultValue || e.value; });
  const modelOrder = $("model_order") as HTMLInputElement | null;
  const showLabels = $("show_labels") as HTMLInputElement | null;
  if(modelOrder) modelOrder.value = "4";
  if(showLabels) showLabels.checked = true;
  ["ambient_temp","altitude","mass_top","mass_back","mass_sides","mass_air","stiffness_top","stiffness_back","stiffness_sides","damping_top","damping_back","damping_sides","damping_air","area_top","area_back","area_sides","area_hole","volume_air","driving_force"].forEach(id=>{
    const el = $(id) as HTMLInputElement | null;
    const lab = $(`${id}_val`);
    if(el && lab) lab.textContent = formatSliderValue(id, parseFloat(el.value));
  });
  const modelLabel = $("model_label");
  if(modelLabel) modelLabel.textContent = "4‑DOF";
  setModelVisibility(4);
  render();
});

  /* first render */
  const initialOrderEl = $("model_order") as HTMLInputElement | null;
  setModelVisibility(parseInt(initialOrderEl?.value ?? "4",10) || 4);
  render();

  // Expose render for companion scripts (what-if overlays, etc.).
  (globalThis as any).render = render;

  /* canvas API: roundRect polyfill for older browsers */
  if(typeof CanvasRenderingContext2D !== "undefined" && !CanvasRenderingContext2D.prototype.roundRect){
    CanvasRenderingContext2D.prototype.roundRect = function(x:number,y:number,w:number,h:number,r?: number | { tl?: number; tr?: number; br?: number; bl?: number }){
      if(typeof r === "number") r = {tl:r,tr:r,br:r,bl:r};
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
})();

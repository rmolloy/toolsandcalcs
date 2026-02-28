// @ts-nocheck

type DofParams = {
  [key: string]: number;
};

type ModeKey = "air" | "top" | "back";
type TraceName = "Current" | "Target" | "Top" | "Air" | "Back" | "Sides";
type OverlaySegment = { x: number[]; y: number[]; width: number; opacity: number };

type ThumbElements = {
  root: HTMLDivElement;
  label: HTMLDivElement;
  stem: HTMLDivElement;
  dot: HTMLDivElement;
  halo: HTMLDivElement;
};

type ModeCardElements = {
  root: HTMLDivElement;
  freqValue: HTMLDivElement;
  noteName: HTMLSpanElement;
  noteCents: HTMLSpanElement;
  whatIfRow: HTMLDivElement;
  whatIfValue: HTMLSpanElement;
  whatIfDelta: HTMLSpanElement;
  whatIfNoteRow: HTMLDivElement;
  whatIfNoteName: HTMLSpanElement;
  whatIfNoteCents: HTMLSpanElement;
};

const DEFAULT_PARAMS: DofParams = {
  model_order: 4,
  ambient_temp: 20,
  altitude: 0,
  driving_force: 0.4,
  area_hole: 0.0055,
  // Masses are in kg in the solver core.
  // UI shows grams, but we convert g -> kg on input.
  mass_air: 0.0005,
  volume_air: 0.0141,
  damping_air: 0.005,
  mass_top: 0.043,
  stiffness_top: 42700,
  damping_top: 1.5,
  area_top: 0.039,
  mass_back: 0.094,
  stiffness_back: 130000,
  damping_back: 7.0,
  area_back: 0.04,
  mass_sides: 0.8,
  stiffness_sides: 1400000,
  damping_sides: 10.0,
  area_sides: 0.025,
};

type CardField = {
  label: string;
  param: keyof typeof DEFAULT_PARAMS;
  unit?: string;
  step?: number;
  min?: number;
  max?: number;
};
type CardDef = {
  key: string;
  label: string;
  alias: string;
  degree: number;
  color: string;
  fields: CardField[];
  badgeText?: string;
};

const CARD_DEFS: CardDef[] = [
  {
    key: "air",
    label: "Air",
    alias: "T(1,1)1",
    degree: 1,
    color: "var(--purple)",
    badgeText: "DOF 1",
    fields: [
      { label: "Soundhole Area (m²)", param: "area_hole", step: 0.0001, min: 0.003, max: 0.01 },
      { label: "Cavity Volume (m³)", param: "volume_air", step: 0.0005, min: 0.01, max: 0.025 },
      { label: "Moving Air Mass (g)", param: "mass_air", step: 0.01, min: 0.1, max: 2.0 },
      { label: "Air Damping Rₐ", param: "damping_air", step: 0.0005, min: 0.001, max: 0.02 },
    ],
  },
  {
    key: "top",
    label: "Top",
    alias: "T(1,1)2",
    degree: 2,
    color: "var(--blue)",
    badgeText: "DOF 2",
    fields: [
      { label: "Mass mₜ (g)", param: "mass_top", step: 0.1, min: 5, max: 120 },
      { label: "Stiffness kₜ (N/m)", param: "stiffness_top", step: 100, min: 10000, max: 150000 },
      { label: "Damping Rₜ", param: "damping_top", step: 0.1, min: 0.5, max: 6.0 },
      { label: "Radiating Area Aₜ (m²)", param: "area_top", step: 0.0005, min: 0.02, max: 0.06 },
    ],
  },
  {
    key: "back",
    label: "Back",
    alias: "T(1,1)3",
    degree: 3,
    color: "var(--green)",
    badgeText: "DOF 3",
    fields: [
      { label: "Mass mᵦ (g)", param: "mass_back", step: 0.5, min: 40, max: 220 },
      { label: "Stiffness kᵦ (N/m)", param: "stiffness_back", step: 200, min: 80000, max: 400000 },
      { label: "Damping Rᵦ", param: "damping_back", step: 0.1, min: 1.0, max: 15.0 },
      { label: "Radiating Area Aᵦ (m²)", param: "area_back", step: 0.0005, min: 0.02, max: 0.06 },
    ],
  },
  {
    key: "sides",
    label: "Sides",
    alias: "External",
    degree: 4,
    color: "var(--yellow)",
    badgeText: "DOF 4",
    fields: [
      { label: "Sides Mass (g)", param: "mass_sides", step: 5, min: 300, max: 1500 },
      { label: "Sides Stiffness (N/m)", param: "stiffness_sides", step: 500, min: 500000, max: 3000000 },
      { label: "Sides Damping", param: "damping_sides", step: 0.1, min: 1.0, max: 30.0 },
      { label: "Sides Area (m²)", param: "area_sides", step: 0.0005, min: 0.01, max: 0.06 },
    ],
  },
  {
    key: "environment",
    label: "Environment",
    alias: "Inputs",
    degree: 0,
    color: "var(--muted)",
    badgeText: "Always",
    fields: [
      { label: "Ambient Temp (°C)", param: "ambient_temp", step: 0.5, min: -10, max: 40 },
      { label: "Altitude (m)", param: "altitude", step: 10, min: 0, max: 3000 },
      { label: "Driving Force F (N)", param: "driving_force", step: 0.05, min: 0.05, max: 1.0 },
    ],
  },
];

const MODE_META: Record<ModeKey, { label: string; color: string }> = {
  air: { label: "Air", color: "var(--purple)" },
  top: { label: "Top", color: "var(--blue)" },
  back: { label: "Back", color: "var(--green)" },
};

const MODE_BANDS: Record<ModeKey, { low: number; high: number }> = {
  air: { low: 75, high: 115 },
  top: { low: 150, high: 205 },
  back: { low: 210, high: 260 },
};

const MODE_KEYS: ModeKey[] = ["air", "top", "back"];

const TRACE_DEFAULT_VISIBLE: Record<TraceName, boolean> = {
  Current: true,
  Target: true,
  Top: false,
  Air: false,
  Back: false,
  Sides: false,
};

const TARGET_OVERLAY = {
  min: 85,
  max: 260,
  feather: 60,
  widths: { thin: 1.0, mid: 2.0, thick: 3.0 },
  opacities: { thin: 0.25, mid: 0.8, thick: 0.9 },
};

const FIT_BOUNDS: Record<string, { min: number; max: number }> = {
  area_hole: { min: 0.003, max: 0.01 },
  volume_air: { min: 0.01, max: 0.025 },
  mass_top: { min: 0.005, max: 0.12 },
  stiffness_top: { min: 10000, max: 150000 },
  stiffness_back: { min: 80000, max: 400000 },
};

const SOLVE_TWEAK_IDS = ["stiffness_top", "stiffness_back", "volume_air", "area_hole"] as const;

let currentParams: DofParams = { ...DEFAULT_PARAMS };
let currentOrder = 4;
let plotlyRef: typeof Plotly | null = null;
let pendingRender: number | null = null;
let lastResponse: any = null;
let plotListenersBound = false;
const thumbEls: Partial<Record<ModeKey, ThumbElements>> = {};
const modeCardEls: Partial<Record<ModeKey, ModeCardElements>> = {};
const paramInputs: Partial<Record<keyof typeof DEFAULT_PARAMS, HTMLInputElement>> = {};
const paramSliders: Partial<Record<keyof typeof DEFAULT_PARAMS, HTMLInputElement>> = {};
const overlaySliders: Partial<Record<keyof typeof DEFAULT_PARAMS, HTMLInputElement>> = {};
const paramDeltaBars: Partial<Record<keyof typeof DEFAULT_PARAMS, HTMLDivElement>> = {};
const paramGlowDots: Partial<Record<keyof typeof DEFAULT_PARAMS, HTMLDivElement>> = {};
const paramWhatIfRows: Partial<Record<keyof typeof DEFAULT_PARAMS, HTMLDivElement>> = {};
const paramWhatIfValues: Partial<Record<keyof typeof DEFAULT_PARAMS, HTMLSpanElement>> = {};
const paramWhatIfDeltas: Partial<Record<keyof typeof DEFAULT_PARAMS, HTMLSpanElement>> = {};
const overlayLatched = new Set<keyof typeof DEFAULT_PARAMS>();
let lastWhatIfResponse: any = null;
const dragState: { mode: ModeKey | null; freq: number | null; pointerId: number | null } = {
  mode: null,
  freq: null,
  pointerId: null,
};
let pendingDragSolve: number | null = null;
let pendingDragMode: ModeKey | null = null;
let pendingDragFreq: number | null = null;
let dragLockedTargets: Record<ModeKey, number | null> | null = null;
let dragUseWhatIf = false;
const traceVisibilityState: Partial<Record<TraceName, boolean>> = { ...TRACE_DEFAULT_VISIBLE };

function dofParamsFromLocation(): Partial<DofParams> | null {
  const raw = new URLSearchParams(window.location.search).get("params");
  if (!raw) return null;
  try {
    const decoded = decodeURIComponent(raw);
    const parsed = JSON.parse(decoded) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") return null;
    const next: Partial<DofParams> = {};
    Object.keys(DEFAULT_PARAMS).forEach((key) => {
      const value = parsed[key];
      if (Number.isFinite(value)) next[key] = value as number;
    });
    return Object.keys(next).length ? next : null;
  } catch {
    return null;
  }
}

function displayToInternal(param: keyof typeof DEFAULT_PARAMS, displayValue: number): number {
  if (!Number.isFinite(displayValue)) return displayValue;
  if (String(param).startsWith("mass_")) return displayValue / 1000;
  return displayValue;
}

function internalToDisplay(param: keyof typeof DEFAULT_PARAMS, internalValue: number): number {
  if (!Number.isFinite(internalValue)) return internalValue;
  if (String(param).startsWith("mass_")) return internalValue * 1000;
  return internalValue;
}

function getPlotly(): typeof Plotly | null {
  if (plotlyRef) return plotlyRef;
  const ref = (window as any).Plotly;
  plotlyRef = ref || null;
  return plotlyRef;
}

function updateParam(param: keyof typeof DEFAULT_PARAMS, value: number) {
  if (Number.isFinite(value)) {
    currentParams[param] = displayToInternal(param, value);
    scheduleRender();
  }
}

function isTraceName(value: unknown): value is TraceName {
  return typeof value === "string" && value in TRACE_DEFAULT_VISIBLE;
}

function traceVisibleValue(name: TraceName): true | "legendonly" {
  const visible = traceVisibilityState[name];
  const fallback = TRACE_DEFAULT_VISIBLE[name];
  return (visible ?? fallback) ? true : "legendonly";
}

function applyTraceVisibility(trace: Partial<Plotly.PlotData> | null, name: TraceName) {
  if (!trace) return;
  trace.visible = traceVisibleValue(name);
}

function syncTraceVisibilityStateFromPlot(plotEl: HTMLElement) {
  const traces = (plotEl as any).data;
  if (!Array.isArray(traces)) return;
  const nextState: Partial<Record<TraceName, boolean>> = {};
  traces.forEach((trace: any) => {
    const name = trace?.name;
    if (!isTraceName(name)) return;
    const isVisible = trace.visible === undefined || trace.visible === true;
    nextState[name] = (nextState[name] ?? false) || isVisible;
  });
  Object.keys(nextState).forEach((name) => {
    if (!isTraceName(name)) return;
    traceVisibilityState[name] = Boolean(nextState[name]);
  });
}

function tokenColor(token: string, fallbackToken = "--ink") {
  const styles = getComputedStyle(document.documentElement);
  return styles.getPropertyValue(token).trim()
    || styles.getPropertyValue(fallbackToken).trim()
    || "currentColor";
}

function colorWithAlpha(color: string, alpha: number) {
  const hex = color.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(hex)) {
    const r = parseInt(`${hex[0]}${hex[0]}`, 16);
    const g = parseInt(`${hex[1]}${hex[1]}`, 16);
    const b = parseInt(`${hex[2]}${hex[2]}`, 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  if (/^[0-9a-fA-F]{6}$/.test(hex)) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  const rgb = color.match(/^rgb\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)$/i);
  if (rgb) return `rgba(${rgb[1]}, ${rgb[2]}, ${rgb[3]}, ${alpha})`;
  const rgba = color.match(/^rgba\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*[\d.]+\s*\)$/i);
  if (rgba) return `rgba(${rgba[1]}, ${rgba[2]}, ${rgba[3]}, ${alpha})`;
  return color;
}

function plotThemeColors() {
  const blue = tokenColor("--blue");
  const green = tokenColor("--green");
  const purple = tokenColor("--purple");
  const yellow = tokenColor("--yellow");
  const orange = tokenColor("--orange");
  const ink = tokenColor("--ink");
  return {
    current: blue,
    top: blue,
    air: purple,
    back: green,
    sides: yellow,
    whatIf: colorWithAlpha(orange, 0.9),
    ink,
    grid: colorWithAlpha(ink, 0.08),
  };
}

function sliderFillPercent(slider: HTMLInputElement, value: number) {
  const min = parseFloat(slider.min);
  const max = parseFloat(slider.max);
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return 0;
  const normalized = (value - min) / (max - min);
  return Math.max(0, Math.min(100, normalized * 100));
}

function decimalPlacesFromStep(stepValue: number) {
  if (!Number.isFinite(stepValue) || stepValue <= 0) return 0;
  const text = stepValue.toString();
  const decimal = text.split(".")[1];
  return decimal ? decimal.length : 0;
}

function formatOverlayDisplayValue(value: number, stepValue: number) {
  if (!Number.isFinite(value)) return "--";
  const decimals = Math.min(4, decimalPlacesFromStep(stepValue));
  return value.toFixed(decimals);
}

function overlayRangeFillGradient(start: number, end: number) {
  const overlayBand = "color-mix(in srgb, var(--orange) 48%, transparent)";
  return `linear-gradient(90deg, transparent 0%, transparent ${start}%, ${overlayBand} ${start}%, ${overlayBand} ${end}%, transparent ${end}%, transparent 100%)`;
}

function baseRangeFillGradient(end: number) {
  const fill = "color-mix(in srgb, var(--ink) 28%, transparent)";
  const track = "color-mix(in srgb, var(--ink) 8%, transparent)";
  return `linear-gradient(90deg, ${fill} 0%, ${fill} ${end}%, ${track} ${end}%, ${track} 100%)`;
}

function buildCards() {
  const container = document.getElementById("dof_cards");
  if (!container) return;
  container.innerHTML = "";
  CARD_DEFS.forEach((card) => {
    const cardEl = document.createElement("div");
    cardEl.className = `mode-card mode-${card.key}`;
    cardEl.dataset.degree = String(card.degree);
    if (isModeKey(card.key)) cardEl.dataset.mode = card.key;

    const title = document.createElement("div");
    title.className = "dof-card-title";
    const badge = card.badgeText || `DOF ${card.degree}`;
    const aliasInline = card.alias ? `<span class="mode-label-alias">${card.alias}</span>` : "";
    title.innerHTML = `<div class="mode-label">${card.label}${aliasInline}</div><span class="badge" style="background:${card.color};">${badge}</span>`;
    cardEl.appendChild(title);

    if (isModeKey(card.key)) {
      const modeKey = card.key as ModeKey;
      const meta = document.createElement("div");
      meta.className = "mode-meta";

      const freqRow = document.createElement("div");
      freqRow.className = "mode-value-row";
      const freqValue = document.createElement("div");
      freqValue.className = "mode-value";
      freqValue.textContent = "--";
      const freqUnit = document.createElement("span");
      freqUnit.className = "mode-unit";
      freqUnit.textContent = "Hz";
      freqRow.append(freqValue, freqUnit);

      const noteRow = document.createElement("div");
      noteRow.className = "mode-note";
      const noteName = document.createElement("span");
      noteName.className = "mode-note-name";
      noteName.textContent = "--";
      const noteCents = document.createElement("span");
      noteCents.className = "mode-note-cents";
      noteCents.textContent = "--";
      noteRow.append(noteName, noteCents);

      const whatIfRow = document.createElement("div");
      whatIfRow.className = "mode-whatif-row";
      whatIfRow.style.display = "none";
      const whatIfLabel = document.createElement("span");
      whatIfLabel.className = "mode-whatif-label";
      whatIfLabel.textContent = "Target";
      const whatIfValue = document.createElement("span");
      whatIfValue.className = "mode-whatif-value";
      whatIfValue.textContent = "--";
      const whatIfDelta = document.createElement("span");
      whatIfDelta.className = "mode-whatif-delta";
      whatIfDelta.textContent = "";
      whatIfRow.append(whatIfLabel, whatIfValue, whatIfDelta);

      const whatIfNoteRow = document.createElement("div");
      whatIfNoteRow.className = "mode-whatif-note";
      whatIfNoteRow.style.display = "none";
      const whatIfNoteName = document.createElement("span");
      whatIfNoteName.className = "mode-whatif-note-name";
      whatIfNoteName.textContent = "--";
      const whatIfNoteCents = document.createElement("span");
      whatIfNoteCents.className = "mode-whatif-note-cents";
      whatIfNoteCents.textContent = "--";
      whatIfNoteRow.append(whatIfNoteName, whatIfNoteCents);

      meta.append(freqRow, noteRow, whatIfRow, whatIfNoteRow);
      cardEl.appendChild(meta);

      modeCardEls[modeKey] = {
        root: cardEl,
        freqValue,
        noteName,
        noteCents,
        whatIfRow,
        whatIfValue,
        whatIfDelta,
        whatIfNoteRow,
        whatIfNoteName,
        whatIfNoteCents,
      };
    }

    const grid = document.createElement("div");
    grid.className = "param-grid";

    card.fields.forEach((field) => {
      const row = document.createElement("div");
      row.className = "param-row";

      const label = document.createElement("div");
      label.className = "param-label";
      label.textContent = field.label;

      const input = document.createElement("input");
      input.type = "number";
      input.className = "param-number";
      input.step = field.step != null ? String(field.step) : "any";
      if (field.min != null) input.min = String(field.min);
      if (field.max != null) input.max = String(field.max);
      input.value = String(internalToDisplay(field.param, currentParams[field.param]));
      input.dataset.param = field.param;

      const slider = document.createElement("input");
      slider.type = "range";
      slider.className = "param-slider";
      if (field.min != null) slider.min = String(field.min);
      if (field.max != null) slider.max = String(field.max);
      slider.step = field.step != null ? String(field.step) : "any";
      slider.value = input.value;
      slider.dataset.param = field.param;

      input.addEventListener("input", (event) => {
        const val = parseFloat((event.target as HTMLInputElement).value);
        if (Number.isFinite(val)) slider.value = String(val);
        updateParam(field.param, val);
        syncOverlayToBase(field.param);
        updateOverlayLatch(field.param);
      });
      slider.addEventListener("input", (event) => {
        const val = parseFloat((event.target as HTMLInputElement).value);
        if (Number.isFinite(val)) input.value = String(val);
        updateParam(field.param, val);
        syncOverlayToBase(field.param);
        updateOverlayLatch(field.param);
      });

      const sliderWrap = document.createElement("div");
      sliderWrap.className = "param-slider-stack";
      sliderWrap.appendChild(slider);

      const overlay = document.createElement("input");
      overlay.type = "range";
      overlay.className = "param-slider param-slider-overlay";
      if (field.min != null) overlay.min = String(field.min);
      if (field.max != null) overlay.max = String(field.max);
      overlay.step = field.step != null ? String(field.step) : "any";
      overlay.value = input.value;
      overlay.dataset.param = field.param;
      overlay.addEventListener("input", () => {
        updateOverlayLatch(field.param);
        scheduleRender();
      });
      sliderWrap.appendChild(overlay);

      const deltaBar = document.createElement("div");
      deltaBar.className = "param-slider-delta";
      sliderWrap.appendChild(deltaBar);

      const glowDot = document.createElement("div");
      glowDot.className = "param-slider-glow";
      sliderWrap.appendChild(glowDot);

      const whatIfRow = document.createElement("div");
      whatIfRow.className = "param-whatif-row";
      const whatIfValue = document.createElement("span");
      whatIfValue.className = "param-whatif-value";
      whatIfValue.textContent = "--";
      const whatIfDelta = document.createElement("span");
      whatIfDelta.className = "param-whatif-delta";
      whatIfDelta.textContent = "";
      whatIfRow.append(whatIfValue, whatIfDelta);

      paramInputs[field.param] = input;
      paramSliders[field.param] = slider;
      overlaySliders[field.param] = overlay;
      paramDeltaBars[field.param] = deltaBar;
      paramGlowDots[field.param] = glowDot;
      paramWhatIfRows[field.param] = whatIfRow;
      paramWhatIfValues[field.param] = whatIfValue;
      paramWhatIfDeltas[field.param] = whatIfDelta;

      row.append(label, input, sliderWrap, whatIfRow);
      grid.appendChild(row);
    });

    cardEl.appendChild(grid);
    container.appendChild(cardEl);
  });
  applyCardVisibility();
}

function applyCardVisibility() {
  const cards = document.querySelectorAll<HTMLElement>(".mode-card");
  cards.forEach((card) => {
    const degree = Number(card.dataset.degree || 4);
    card.classList.toggle("card-hidden", degree > currentOrder);
  });
}

function getActiveModes(): ModeKey[] {
  if (currentOrder <= 1) return ["air"];
  if (currentOrder === 2) return ["air", "top"];
  return ["air", "top", "back"];
}

function isModeKey(key: string): key is ModeKey {
  return key === "air" || key === "top" || key === "back";
}

function isWhatIfEnabled() {
  const toggle = document.getElementById("toggle_overlay") as HTMLInputElement | null;
  return Boolean(toggle?.checked);
}

function hasActiveOverlays() {
  return overlayLatched.size > 0;
}

function syncOverlayToBase(param: keyof typeof DEFAULT_PARAMS) {
  const overlay = overlaySliders[param];
  if (!overlay || overlayLatched.has(param)) return;
  const baseValue = internalToDisplay(param, currentParams[param]);
  if (Number.isFinite(baseValue)) overlay.value = String(baseValue);
}

function updateOverlayLatch(param: keyof typeof DEFAULT_PARAMS) {
  const slider = paramSliders[param];
  const overlay = overlaySliders[param];
  const deltaBar = paramDeltaBars[param];
  const glowDot = paramGlowDots[param];
  const whatIfRow = paramWhatIfRows[param];
  const whatIfValue = paramWhatIfValues[param];
  const whatIfDelta = paramWhatIfDeltas[param];
  if (!slider || !overlay) return;
  const baseValue = internalToDisplay(param, currentParams[param]);
  const overlayValue = parseFloat(overlay.value);
  const step = parseFloat(overlay.step || "0.0001");
  const epsilon = Math.max(1e-6, step * 0.5);
  const isActive = Number.isFinite(baseValue) && Number.isFinite(overlayValue)
    ? Math.abs(overlayValue - (baseValue as number)) > epsilon
    : false;
  if (isActive) overlayLatched.add(param);
  else overlayLatched.delete(param);
  overlay.classList.toggle("overlay-active", isActive);

  const baseFill = sliderFillPercent(slider, baseValue as number);
  const overlayFill = sliderFillPercent(overlay, overlayValue);
  const start = Math.min(baseFill, overlayFill);
  const end = Math.max(baseFill, overlayFill);
  slider.style.background = baseRangeFillGradient(baseFill);
  overlay.style.background = overlayRangeFillGradient(start, end);

  if (deltaBar) {
    const width = Math.max(0, end - start);
    deltaBar.style.left = `${start}%`;
    deltaBar.style.width = `${width}%`;
    deltaBar.classList.toggle("active", isActive && width > 0);
  }
  if (glowDot) {
    glowDot.style.left = `${overlayFill}%`;
    glowDot.classList.toggle("active", isActive);
  }

  if (whatIfRow && whatIfValue && whatIfDelta) {
    const showMode = isWhatIfEnabled();
    const delta = overlayValue - (baseValue as number);
    whatIfRow.classList.toggle("active", showMode && isActive);
    whatIfValue.textContent = formatOverlayDisplayValue(overlayValue, step);
    whatIfDelta.textContent = isActive ? formatSigned(delta, decimalPlacesFromStep(step)) : "";
  }
}

function refreshOverlayVisuals() {
  Object.keys(overlaySliders).forEach((key) => {
    updateOverlayLatch(key as keyof typeof DEFAULT_PARAMS);
  });
}

function resetWhatIf() {
  overlayLatched.clear();
  Object.keys(overlaySliders).forEach((key) => {
    const param = key as keyof typeof DEFAULT_PARAMS;
    const overlay = overlaySliders[param];
    if (!overlay) return;
    const baseValue = internalToDisplay(param, currentParams[param]);
    if (Number.isFinite(baseValue)) overlay.value = String(baseValue);
    overlay.classList.remove("overlay-active");
  });
  refreshOverlayVisuals();
  lastWhatIfResponse = null;
  updateModeCards(lastResponse, null);
}

function getWhatIfParams(): DofParams | null {
  if (!isWhatIfEnabled() || !hasActiveOverlays()) return null;
  const out: DofParams = { ...currentParams };
  overlayLatched.forEach((param) => {
    const overlay = overlaySliders[param];
    if (!overlay) return;
    const value = parseFloat(overlay.value);
    if (!Number.isFinite(value)) return;
    out[param] = displayToInternal(param, value);
  });
  return out;
}

function computeResponseForParams(raw: DofParams) {
  return computeResponseSafe(adaptParamsToSolver(raw));
}

function getDragLockResponse(useWhatIf: boolean) {
  if (useWhatIf) {
    const whatParams = getWhatIfParams() || currentParams;
    return lastWhatIfResponse || computeResponseForParams(whatParams);
  }
  return lastResponse || computeResponseForParams(currentParams);
}

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function freqToNoteCents(freq: number | null | undefined) {
  if (!Number.isFinite(freq) || (freq as number) <= 0) {
    return { name: "--", cents: "--", centsNum: null };
  }
  const midi = 69 + 12 * Math.log2((freq as number) / 440);
  const nearest = Math.round(midi);
  const cents = Math.round((midi - nearest) * 100);
  const name = `${NOTE_NAMES[(nearest + 1200) % 12]}${Math.floor(nearest / 12) - 1}`;
  const centsStr = `${cents >= 0 ? "+" : ""}${cents}c`;
  return { name, cents: centsStr, centsNum: cents };
}

function formatSigned(value: number, digits = 1) {
  if (!Number.isFinite(value)) return "--";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}`;
}

function getModeDisplayFreq(mode: ModeKey, peaks: Record<ModeKey, number | null> | null) {
  if (!dragUseWhatIf && dragState.mode === mode && Number.isFinite(dragState.freq)) return dragState.freq as number;
  const freq = peaks?.[mode];
  return Number.isFinite(freq) ? (freq as number) : null;
}

function updateModeCards(baseResponse = lastResponse, whatIfResponse = lastWhatIfResponse) {
  const basePeaks = baseResponse ? modelPeaksFromResponse(baseResponse) : null;
  const whatIfPeaks = whatIfResponse ? modelPeaksFromResponse(whatIfResponse) : null;
  const showWhatIf = false;
  MODE_KEYS.forEach((mode) => {
    const els = modeCardEls[mode];
    if (!els) return;
    const baseFreq = getModeDisplayFreq(mode, basePeaks || { air: null, top: null, back: null });
    els.freqValue.textContent = Number.isFinite(baseFreq) ? (baseFreq as number).toFixed(1) : "--";

    const baseNote = freqToNoteCents(baseFreq);
    els.noteName.textContent = baseNote.name;
    els.noteCents.textContent = baseNote.cents;
    els.noteCents.classList.toggle("positive", typeof baseNote.centsNum === "number" && baseNote.centsNum > 0);
    els.noteCents.classList.toggle("negative", typeof baseNote.centsNum === "number" && baseNote.centsNum < 0);

    els.whatIfRow.style.display = showWhatIf ? "" : "none";
    els.whatIfNoteRow.style.display = showWhatIf ? "" : "none";
    if (!showWhatIf) {
      els.whatIfValue.textContent = "--";
      els.whatIfDelta.textContent = "";
      els.whatIfNoteName.textContent = "--";
      els.whatIfNoteCents.textContent = "--";
      els.whatIfNoteCents.classList.remove("positive", "negative");
      return;
    }

    const whatIfFreq = whatIfPeaks?.[mode];
    els.whatIfValue.textContent = Number.isFinite(whatIfFreq) ? `${(whatIfFreq as number).toFixed(1)} Hz` : "--";
    if (Number.isFinite(baseFreq) && Number.isFinite(whatIfFreq)) {
      const hzDelta = (whatIfFreq as number) - (baseFreq as number);
      els.whatIfDelta.textContent = `(${formatSigned(hzDelta, 1)} Hz)`;
    } else {
      els.whatIfDelta.textContent = "";
    }

    const whatNote = freqToNoteCents(whatIfFreq);
    els.whatIfNoteName.textContent = whatNote.name;
    els.whatIfNoteCents.textContent = whatNote.cents;
    els.whatIfNoteCents.classList.toggle("positive", typeof whatNote.centsNum === "number" && whatNote.centsNum > 0);
    els.whatIfNoteCents.classList.toggle("negative", typeof whatNote.centsNum === "number" && whatNote.centsNum < 0);
  });
}

function syncCardInputs() {
  Object.entries(paramInputs).forEach(([key, input]) => {
    const param = key as keyof typeof DEFAULT_PARAMS;
    const next = internalToDisplay(param, currentParams[param]);
    if (Number.isFinite(next)) {
      input.value = String(next);
      const slider = paramSliders[param];
      if (slider) slider.value = String(next);
    }
    syncOverlayToBase(param);
    updateOverlayLatch(param);
  });
}

function setOrder(order: number) {
  currentOrder = order;
  currentParams.model_order = order;
  const label = document.getElementById("model_order_label");
  if (label) label.textContent = String(order);
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    const isActive = Number((btn as HTMLElement).dataset.order) === order;
    btn.classList.toggle("tab-btn-active", isActive);
  });
  applyCardVisibility();
  scheduleRender();
}

function scheduleRender() {
  if (pendingRender !== null) cancelAnimationFrame(pendingRender);
  pendingRender = requestAnimationFrame(() => {
    pendingRender = null;
    dofRenderExecute();
  });
}

function dofPipelineEnabledRead() {
  return Boolean((window as any).DofPipelineEnabled);
}

function dofPipelineEmitBuild() {
  return (event: any) => {
    console.info("[DOF Pipeline]", event.eventType, event.stageId || "-", event.payload || {});
  };
}

function dofPipelineRunnerRead() {
  return (window as any).DofPipelineRunner;
}

function dofRenderExecute() {
  if (!dofPipelineEnabledRead()) {
    renderPlot();
    return;
  }
  const runner = dofPipelineRunnerRead();
  if (!runner?.run) {
    renderPlot();
    return;
  }
  void runner.run(
    { trigger: "render.schedule" },
    { useStageList: true, stages: ["refresh"] },
    dofPipelineEmitBuild(),
  );
}

function sharedDofSolverAdapterRead() {
  const adapter = (window as any).dof_solver_adapter;
  if (!adapter) return null;
  const adapt = adapter.adaptParamsToSolver;
  const compute = adapter.computeResponseSafe;
  if (typeof adapt !== "function" || typeof compute !== "function") return null;
  return { adaptParamsToSolver: adapt, computeResponseSafe: compute };
}

function computeResponseSafeLegacy(params: DofParams) {
  try {
    const fn = (window as any).computeResponse || (window as any).ModelCore?.computeResponse;
    if (typeof fn === "function") return fn(params);
  } catch (err) {
    console.warn("computeResponse failed", err);
  }
  return null;
}

function adaptParamsToSolverLegacy(raw: DofParams): Record<string, any> {
  const out: Record<string, any> = { ...raw };

  const AtmosphereLib = (window as any).Atmosphere;
  const deriveAtmosphere = AtmosphereLib?.deriveAtmosphere;
  const referenceRho = AtmosphereLib?.REFERENCE_RHO ?? 1.205;
  const altitude = typeof out.altitude === "number" && Number.isFinite(out.altitude) ? out.altitude : 0;
  const temp = typeof out.ambient_temp === "number" && Number.isFinite(out.ambient_temp) ? out.ambient_temp : 20;

  if (typeof deriveAtmosphere === "function") {
    const atm = deriveAtmosphere(altitude, temp);
    out.air_density = atm.rho;
    out.speed_of_sound = atm.c;
    out.air_pressure = atm.pressure;
    out.air_temp_k = atm.tempK;
    const baseMassAirKg = typeof out.mass_air === "number" && Number.isFinite(out.mass_air) ? out.mass_air : null;
    if (baseMassAirKg !== null) {
      const densityScale = atm.rho / referenceRho;
      out.mass_air = baseMassAirKg * densityScale;
    }
    out._atm = atm;
  }

  return out;
}

function computeResponseSafe(params: DofParams) {
  const sharedAdapter = sharedDofSolverAdapterRead();
  if (sharedAdapter) return sharedAdapter.computeResponseSafe(params);
  return computeResponseSafeLegacy(params);
}

function adaptParamsToSolver(raw: DofParams): Record<string, any> {
  const sharedAdapter = sharedDofSolverAdapterRead();
  if (sharedAdapter) return sharedAdapter.adaptParamsToSolver(raw);
  return adaptParamsToSolverLegacy(raw);
}

function sharedSeriesSamplerRead() {
  const sampler = (window as any).series_sampling;
  const sample = sampler?.seriesValueSampleAtFrequency;
  if (typeof sample !== "function") return null;
  return { seriesValueSampleAtFrequency: sample };
}

function clampToBounds(id: string, value: number) {
  const bounds = FIT_BOUNDS[id];
  if (!bounds || !Number.isFinite(value)) return value;
  return Math.max(bounds.min, Math.min(bounds.max, value));
}

function peakFreqInBand(series: Array<{ x: number; y: number }>, band: { low: number; high: number }) {
  let bestX: number | null = null;
  let bestY = -Infinity;
  for (let i = 0; i < series.length; i += 1) {
    const point = series[i];
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) continue;
    if (point.x < band.low || point.x > band.high) continue;
    if (point.y > bestY) {
      bestY = point.y;
      bestX = point.x;
    }
  }
  return bestX;
}

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function refineParabolicPeak(xs: number[], ys: number[], idx: number) {
  if (idx <= 0 || idx >= ys.length - 1) return null;
  const a = ys[idx - 1];
  const b = ys[idx];
  const c = ys[idx + 1];
  if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(c)) return null;
  const bw = xs.length > 1 ? Math.abs(xs[1] - xs[0]) : null;
  if (!bw || !Number.isFinite(bw) || bw <= 0) return null;
  const denom = a - (2 * b) + c;
  if (!Number.isFinite(denom) || Math.abs(denom) < 1e-12) return null;
  const delta = 0.5 * (a - c) / denom;
  if (!Number.isFinite(delta)) return null;
  const clamped = Math.max(-1, Math.min(1, delta));
  const freq = xs[idx] + clamped * bw;
  const y = b - ((a - c) * clamped) / 4;
  return { freq, y, delta: clamped };
}

type LocalPeak = { idx: number; freq: number; db: number; prominence: number };

function collectLocalPeaks(series: Array<{ x: number; y: number }>, band?: { low: number; high: number }) {
  if (!Array.isArray(series) || series.length < 3) return [];
  const xs = series.map((pt) => pt?.x);
  const ys = series.map((pt) => pt?.y);
  const peaks: LocalPeak[] = [];
  for (let i = 1; i < series.length - 1; i += 1) {
    const y = ys[i];
    const yPrev = ys[i - 1];
    const yNext = ys[i + 1];
    if (!Number.isFinite(y) || !Number.isFinite(yPrev) || !Number.isFinite(yNext)) continue;
    if (!(y > yPrev && y > yNext)) continue;
    const x = xs[i];
    if (!Number.isFinite(x)) continue;
    if (band && ((x as number) < band.low || (x as number) > band.high)) continue;
    const start = Math.max(0, i - 6);
    const end = Math.min(ys.length - 1, i + 6);
    const neighbors: number[] = [];
    for (let j = start; j <= end; j += 1) {
      if (j === i) continue;
      const v = ys[j];
      if (Number.isFinite(v)) neighbors.push(v as number);
    }
    const baseline = neighbors.length ? median(neighbors) : (y as number);
    const prominence = (y as number) - baseline;
    const refined = refineParabolicPeak(xs as number[], ys as number[], i);
    peaks.push({
      idx: i,
      freq: refined?.freq ?? (x as number),
      db: refined?.y ?? (y as number),
      prominence,
    });
  }
  return peaks;
}

function pickDominantPeak(series: Array<{ x: number; y: number }>, band: { low: number; high: number }) {
  const peaks = collectLocalPeaks(series, band);
  if (!peaks.length) return null;
  peaks.sort((a, b) => b.prominence - a.prominence);
  return peaks[0];
}

function assignPeaksToModes(totalPeaks: LocalPeak[], targets: Record<ModeKey, number | null>) {
  const modes: ModeKey[] = ["air", "top", "back"];
  const out: Record<ModeKey, number | null> = { air: null, top: null, back: null };
  if (!totalPeaks.length) return out;

  if (totalPeaks.length >= modes.length) {
    const perms: number[][] = [
      [0, 1, 2],
      [0, 2, 1],
      [1, 0, 2],
      [1, 2, 0],
      [2, 0, 1],
      [2, 1, 0],
    ];
    let best = perms[0];
    let bestCost = Infinity;
    perms.forEach((perm) => {
      let cost = 0;
      modes.forEach((mode, i) => {
        const target = targets[mode];
        const peak = totalPeaks[perm[i]];
        if (!Number.isFinite(target)) {
          cost += 1e6;
          return;
        }
        cost += Math.abs(peak.freq - (target as number));
      });
      if (cost < bestCost) {
        bestCost = cost;
        best = perm;
      }
    });
    modes.forEach((mode, i) => {
      out[mode] = totalPeaks[best[i]]?.freq ?? null;
    });
    return out;
  }

  const remaining = totalPeaks.slice();
  modes.forEach((mode) => {
    if (!remaining.length) return;
    const target = targets[mode];
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i += 1) {
      const dist = Number.isFinite(target) ? Math.abs(remaining[i].freq - (target as number)) : 0;
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }
    const chosen = remaining.splice(bestIdx, 1)[0];
    out[mode] = chosen?.freq ?? null;
  });
  return out;
}

function modelPeaksFromResponse(resp: any) {
  const total = resp?.total;
  if (!Array.isArray(total) || !total.length) return null;
  const totalPeaks = collectLocalPeaks(total).sort((a, b) => b.prominence - a.prominence).slice(0, 3);
  if (!totalPeaks.length) {
    return {
      air: peakFreqInBand(total, MODE_BANDS.air),
      top: peakFreqInBand(total, MODE_BANDS.top),
      back: peakFreqInBand(total, MODE_BANDS.back),
    };
  }
  const bandCenter = (mode: ModeKey) => (MODE_BANDS[mode].low + MODE_BANDS[mode].high) / 2;
  const componentPeaks = {
    air: pickDominantPeak(resp?.air || [], MODE_BANDS.air),
    top: pickDominantPeak(resp?.top || [], MODE_BANDS.top),
    back: pickDominantPeak(resp?.back || [], MODE_BANDS.back),
  };
  const targets = {
    air: componentPeaks.air?.freq ?? bandCenter("air"),
    top: componentPeaks.top?.freq ?? bandCenter("top"),
    back: componentPeaks.back?.freq ?? bandCenter("back"),
  };
  return assignPeaksToModes(totalPeaks, targets);
}

function sampleSeriesAtFreqLegacy(series: Array<{ x: number; y: number }>, freq: number | null) {
  if (!Array.isArray(series) || !series.length || !Number.isFinite(freq)) return null;
  let i = 0;
  while (i + 1 < series.length && series[i + 1].x < (freq as number)) i += 1;
  const a = series[i];
  const b = series[Math.min(i + 1, series.length - 1)];
  if (!Number.isFinite(a?.x) || !Number.isFinite(a?.y)) return Number.isFinite(b?.y) ? b.y : null;
  if (!Number.isFinite(b?.x) || !Number.isFinite(b?.y) || a.x === b.x) return a.y;
  const t = ((freq as number) - a.x) / (b.x - a.x);
  return a.y + t * (b.y - a.y);
}

function sampleSeriesAtFreq(series: Array<{ x: number; y: number }>, freq: number | null) {
  const sharedSampler = sharedSeriesSamplerRead();
  if (sharedSampler) return sharedSampler.seriesValueSampleAtFrequency(series, freq);
  return sampleSeriesAtFreqLegacy(series, freq);
}

function fit4DofFromTargets(
  targets: Record<string, number | null | undefined>,
  opts: { maxIter?: number; tweakIds?: string[]; baseParams?: Record<string, any> } = {},
) {
  const maxIter = opts.maxIter ?? 12;
  const baseParams = opts.baseParams || DEFAULT_PARAMS;
  const tweakIds = opts.tweakIds || Array.from(SOLVE_TWEAK_IDS);
  const desired = {
    air: Number.isFinite(targets.air) ? (targets.air as number) : null,
    top: Number.isFinite(targets.top) ? (targets.top as number) : null,
    back: Number.isFinite(targets.back) ? (targets.back as number) : null,
    mass_top: Number.isFinite(targets.mass_top) ? (targets.mass_top as number) : null,
    stiffness_top: Number.isFinite(targets.stiffness_top) ? (targets.stiffness_top as number) : null,
  };
  if (!desired.air && !desired.top && !desired.back && !desired.mass_top && !desired.stiffness_top) return null;

  const baselineResp = computeResponseSafe(adaptParamsToSolver(baseParams));
  const baselinePeaks = baselineResp ? modelPeaksFromResponse(baselineResp) : null;

  const clampCandidate = (id: string, value: number) => clampToBounds(id, value);

  const warm = { ...baseParams };
  if (tweakIds.includes("stiffness_top") || tweakIds.includes("stiffness_back")) {
    (["top", "back"] as const).forEach((k) => {
      const tgt = desired[k];
      const base = baselinePeaks?.[k];
      if (Number.isFinite(tgt) && Number.isFinite(base) && (base as number) > 0) {
        const ratio = (tgt as number) / (base as number);
        const id = k === "top" ? "stiffness_top" : "stiffness_back";
        if (tweakIds.includes(id)) warm[id] = clampCandidate(id, warm[id] * ratio * ratio);
      }
    });
  }
  if (tweakIds.includes("volume_air") && Number.isFinite(desired.air) && Number.isFinite(baselinePeaks?.air) && (baselinePeaks!.air as number) > 0) {
    const ratio = (desired.air as number) / (baselinePeaks!.air as number);
    warm.volume_air = clampCandidate("volume_air", warm.volume_air / (ratio * ratio));
  }
  if (tweakIds.includes("mass_top") && Number.isFinite(desired.mass_top)) {
    warm.mass_top = clampCandidate("mass_top", desired.mass_top as number);
  }
  if (tweakIds.includes("stiffness_top") && Number.isFinite(desired.stiffness_top)) {
    warm.stiffness_top = clampCandidate("stiffness_top", desired.stiffness_top as number);
  }

  const evaluate = (rawParams: Record<string, any>) => {
    const resp = computeResponseSafe(adaptParamsToSolver(rawParams));
    const peaks = resp ? modelPeaksFromResponse(resp) : null;
    if (!peaks) return { cost: Infinity, peaks: null };
    let cost = 0;
    (["air", "top", "back"] as const).forEach((k) => {
      const target = desired[k];
      const predicted = peaks[k];
      if (!Number.isFinite(target) || !Number.isFinite(predicted) || !(target as number)) return;
      const diff = ((predicted as number) - (target as number)) / (target as number);
      cost += diff * diff;
    });
    if (Number.isFinite(desired.mass_top) && Number.isFinite(rawParams.mass_top) && (desired.mass_top as number) > 0) {
      const diff = (rawParams.mass_top - (desired.mass_top as number)) / (desired.mass_top as number);
      cost += diff * diff;
    }
    if (Number.isFinite(desired.stiffness_top) && Number.isFinite(rawParams.stiffness_top) && (desired.stiffness_top as number) > 0) {
      const diff = (rawParams.stiffness_top - (desired.stiffness_top as number)) / (desired.stiffness_top as number);
      cost += diff * diff;
    }
    return { cost, peaks };
  };

  let best = { ...warm };
  let bestEval = evaluate(best);
  const steps: Record<string, number> = {};
  tweakIds.forEach((id) => {
    if (id.startsWith("stiffness_")) steps[id] = 0.2;
    else if (id === "volume_air") steps[id] = 0.15;
    else if (id === "area_hole") steps[id] = 0.12;
    else steps[id] = 0.15;
  });
  const ids = tweakIds.slice();

  for (let iter = 0; iter < maxIter; iter += 1) {
    let improved = false;
    for (const id of ids) {
      const baseVal = best[id];
      if (!Number.isFinite(baseVal)) continue;
      const delta = steps[id];
      const tryFactor = (factor: number) => {
        const candidate = { ...best, [id]: clampCandidate(id, baseVal * factor) };
        return { candidate, eval: evaluate(candidate) };
      };
      const plus = tryFactor(1 + delta);
      const minus = tryFactor(1 - delta);
      let next = null;
      if (plus.eval.cost < bestEval.cost) next = plus;
      if (minus.eval.cost < (next?.eval.cost ?? bestEval.cost)) next = minus;
      if (next) {
        best = next.candidate;
        bestEval = next.eval;
        improved = true;
      }
    }
    ids.forEach((k) => {
      steps[k] *= improved ? 0.85 : 0.65;
    });
    if (Object.values(steps).every((s) => s < 0.02)) break;
  }
  return { raw: best, evaluation: bestEval };
}

function toTrace(points: Array<{x:number; y:number}>, name: string, color: string, opts: Partial<Plotly.PlotData["line"]> = {}): Partial<Plotly.PlotData> | null {
  if (!Array.isArray(points) || points.length === 0) return null;
  return {
    x: points.map(p=>p.x),
    y: points.map(p=>p.y),
    mode: "lines",
    name,
    line: { color, ...(opts || {}) },
    hovertemplate: "%{x:.1f} Hz · %{y:.1f} dB<extra>" + name + "</extra>"
  };
}

function buildTargetOverlaySegments(points: Array<{ x: number; y: number }>): OverlaySegment[] {
  const shared = (window as any).overlay_segments;
  const buildShared = shared?.overlaySegmentsBuildFromPoints;
  if (typeof buildShared === "function") {
    return buildShared(points, TARGET_OVERLAY) as OverlaySegment[];
  }
  const { min, max, feather, widths, opacities } = TARGET_OVERLAY;
  const pickBucket = (weight: number) => {
    if (weight > 0.66) return { width: widths.thick, opacity: opacities.thick };
    if (weight > 0.33) return { width: widths.mid, opacity: opacities.mid };
    return { width: widths.thin, opacity: opacities.thin };
  };
  const segments: OverlaySegment[] = [];
  let current: OverlaySegment | null = null;
  points.forEach((point) => {
    const frequency = point?.x;
    const level = point?.y;
    if (!Number.isFinite(frequency) || !Number.isFinite(level)) {
      current = null;
      return;
    }
    let weight = 0;
    if (frequency >= min && frequency <= max) weight = 1;
    else if (frequency >= min - feather && frequency < min) weight = 1 - (min - frequency) / feather;
    else if (frequency > max && frequency <= max + feather) weight = 1 - (frequency - max) / feather;
    if (weight <= 0) {
      current = null;
      return;
    }
    const bucket = pickBucket(weight);
    const isSameBucket = current && current.width === bucket.width && current.opacity === bucket.opacity;
    if (!isSameBucket) {
      current = { x: [], y: [], width: bucket.width, opacity: bucket.opacity };
      segments.push(current);
    }
    current!.x.push(frequency);
    current!.y.push(level);
  });
  return segments;
}

function buildTargetOverlayTraces(points: Array<{ x: number; y: number }>, color: string): Partial<Plotly.PlotData>[] {
  const segments = buildTargetOverlaySegments(points);
  return segments.map((segment, index) => ({
    x: segment.x,
    y: segment.y,
    mode: "lines",
    name: "Target",
    legendgroup: "target",
    showlegend: index === 0,
    line: {
      color: colorWithAlpha(color, segment.opacity),
      width: segment.width,
      dash: "dash",
    },
    hovertemplate: "%{x:.1f} Hz · %{y:.1f} dB<extra>Target</extra>",
  }));
}

function computeYRange(series: Array<{ x: number; y: number }>, pad = 6, minX?: number, maxX?: number) {
  if (!Array.isArray(series) || !series.length) return null;
  let min = Infinity;
  let max = -Infinity;
  series.forEach((pt) => {
    if (!Number.isFinite(pt?.y)) return;
    if (Number.isFinite(minX) && Number.isFinite(maxX)) {
      if (!Number.isFinite(pt?.x)) return;
      if (pt.x < (minX as number) || pt.x > (maxX as number)) return;
    }
    min = Math.min(min, pt.y);
    max = Math.max(max, pt.y);
  });
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  const padding = Math.max(2, pad);
  return [min - padding, max + padding];
}

function getPlotAxes(plotEl: HTMLElement) {
  const layout = (plotEl as any)._fullLayout;
  const xaxis = layout?.xaxis;
  const yaxis = layout?.yaxis;
  if (!xaxis || !yaxis || typeof xaxis.l2p !== "function" || typeof yaxis.l2p !== "function") return null;
  return { xaxis, yaxis };
}

function getAxisRange(xaxis: any) {
  if (Array.isArray(xaxis?.range) && xaxis.range.length === 2) {
    const min = Math.min(xaxis.range[0], xaxis.range[1]);
    const max = Math.max(xaxis.range[0], xaxis.range[1]);
    return [min, max];
  }
  return [50, 500];
}

function pointerEventToFreq(event: PointerEvent, plotEl: HTMLElement) {
  const axes = getPlotAxes(plotEl);
  if (!axes || typeof axes.xaxis.p2l !== "function") return null;
  const rect = plotEl.getBoundingClientRect();
  const localX = event.clientX - rect.left;
  const xPix = localX - (axes.xaxis._offset || 0);
  const clampedPix = Math.max(0, Math.min(axes.xaxis._length || 0, xPix));
  const raw = axes.xaxis.p2l(clampedPix);
  if (!Number.isFinite(raw)) return null;
  const [min, max] = getAxisRange(axes.xaxis);
  return Math.max(min, Math.min(max, raw));
}

function ensureThumb(mode: ModeKey) {
  if (thumbEls[mode]) return thumbEls[mode] as ThumbElements;
  const overlay = document.getElementById("plot_overlay");
  if (!overlay) return null;
  const root = document.createElement("div");
  root.className = "dof-thumb";
  root.dataset.mode = mode;
  root.style.setProperty("--thumb-color", MODE_META[mode].color);

  const label = document.createElement("div");
  label.className = "dof-thumb-label";
  const stem = document.createElement("div");
  stem.className = "dof-thumb-stem";
  const halo = document.createElement("div");
  halo.className = "dof-thumb-halo";
  const dot = document.createElement("div");
  dot.className = "dof-thumb-dot";

  root.append(label, stem, halo, dot);
  root.addEventListener("pointerdown", handleThumbPointerDown);
  overlay.appendChild(root);

  const entry = { root, label, stem, dot, halo };
  thumbEls[mode] = entry;
  return entry;
}

function positionThumb(thumb: ThumbElements, freq: number | null, db: number | null, axes: { xaxis: any; yaxis: any }) {
  if (!Number.isFinite(freq) || !Number.isFinite(db)) {
    thumb.root.style.display = "none";
    return;
  }
  const x = axes.xaxis.l2p(freq) + (axes.xaxis._offset || 0);
  const y = axes.yaxis.l2p(db) + (axes.yaxis._offset || 0);
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    thumb.root.style.display = "none";
    return;
  }
  thumb.root.style.display = "";
  thumb.root.style.left = `${x}px`;
  thumb.root.style.top = `${y}px`;
}

function updateThumbs(response = lastResponse) {
  const plotEl = document.getElementById("plot_dof");
  const overlay = document.getElementById("plot_overlay");
  if (!plotEl || !overlay) return;
  const axes = getPlotAxes(plotEl);
  const activeResponse = isWhatIfEnabled() && lastWhatIfResponse?.total?.length
    ? lastWhatIfResponse
    : response;
  if (!axes || !activeResponse?.total?.length) {
    Object.values(thumbEls).forEach((thumb) => {
      if (thumb) thumb.root.style.display = "none";
    });
    updateModeCards(response, lastWhatIfResponse);
    return;
  }
  const peaks = modelPeaksFromResponse(activeResponse) || { air: null, top: null, back: null };
  const activeModes = getActiveModes();
  (["air", "top", "back"] as ModeKey[]).forEach((mode) => {
    const thumb = ensureThumb(mode);
    if (!thumb) return;
    const isActive = activeModes.includes(mode);
    thumb.root.classList.toggle("thumb-hidden", !isActive);
    if (!isActive) return;
    let freq = dragState.mode === mode && Number.isFinite(dragState.freq) ? (dragState.freq as number) : peaks[mode];
    if (!Number.isFinite(freq)) {
      const band = MODE_BANDS[mode];
      freq = (band.low + band.high) / 2;
    }
    const db = sampleSeriesAtFreq(activeResponse.total, freq as number);
    positionThumb(thumb, freq as number, db as number, axes);
    thumb.label.innerHTML = `${MODE_META[mode].label}<br><span>${(freq as number).toFixed(1)} Hz</span>`;
    thumb.root.classList.toggle("dragging", dragState.mode === mode);
  });
  updateModeCards(response, lastWhatIfResponse);
}

function applyWhatIfParams(raw: DofParams) {
  if (!isWhatIfEnabled()) return;
  (SOLVE_TWEAK_IDS as readonly (keyof typeof DEFAULT_PARAMS)[]).forEach((id) => {
    const overlay = overlaySliders[id];
    if (!overlay || !Number.isFinite(raw[id])) return;
    const displayValue = internalToDisplay(id, raw[id]);
    if (!Number.isFinite(displayValue)) return;
    overlay.value = String(displayValue);
    updateOverlayLatch(id);
  });
  scheduleRender();
}

function solveTargets(
  targets: Record<ModeKey, number | null | undefined> & Record<string, number | null | undefined>,
  opts: { useWhatIf?: boolean; tweakIds?: string[] } = {},
) {
  const useWhatIf = Boolean(opts.useWhatIf && isWhatIfEnabled());
  const baseParams = useWhatIf ? (getWhatIfParams() || currentParams) : currentParams;
  const fit = fit4DofFromTargets(targets, {
    maxIter: 12,
    tweakIds: opts.tweakIds || Array.from(SOLVE_TWEAK_IDS),
    baseParams: { ...baseParams },
  });
  if (fit?.raw) {
    if (useWhatIf) {
      applyWhatIfParams(fit.raw as DofParams);
    } else {
      currentParams = { ...currentParams, ...fit.raw };
      syncCardInputs();
      scheduleRender();
    }
  }
}

function solveTargetsMeasured(
  targets: Record<ModeKey, number | null | undefined> & Record<string, number | null | undefined>,
  opts: { useWhatIf?: boolean } = {},
) {
  const useWhatIf = Boolean(opts.useWhatIf && isWhatIfEnabled());
  const baseParams = useWhatIf ? (getWhatIfParams() || currentParams) : currentParams;
  const constrainedBase = { ...baseParams };

  if (Number.isFinite(targets.mass_top)) {
    constrainedBase.mass_top = clampToBounds("mass_top", targets.mass_top as number);
  }
  if (Number.isFinite(targets.stiffness_top)) {
    constrainedBase.stiffness_top = clampToBounds("stiffness_top", targets.stiffness_top as number);
  }

  const tweakIds = ["stiffness_back", "volume_air", "area_hole"];
  if (!Number.isFinite(targets.stiffness_top)) tweakIds.push("stiffness_top");

  const fit = fit4DofFromTargets(targets, {
    maxIter: 14,
    tweakIds,
    baseParams: constrainedBase,
  });

  if (fit?.raw) {
    if (useWhatIf) {
      applyWhatIfParams(fit.raw as DofParams);
    } else {
      currentParams = { ...currentParams, ...fit.raw };
      syncCardInputs();
      scheduleRender();
    }
  }
}

function fitTargetFromInput(elementId: string): number | null {
  const element = document.getElementById(elementId) as HTMLInputElement | null;
  if (!element) return null;
  const value = parseFloat(element.value);
  return Number.isFinite(value) ? value : null;
}

function fitTargetsFromInputs(): Record<string, number | null> {
  const massTopDisplay = fitTargetFromInput("fit_target_mass_top");
  return {
    air: fitTargetFromInput("fit_target_air"),
    top: fitTargetFromInput("fit_target_top"),
    back: fitTargetFromInput("fit_target_back"),
    mass_top: Number.isFinite(massTopDisplay) ? displayToInternal("mass_top", massTopDisplay as number) : null,
    stiffness_top: fitTargetFromInput("fit_target_stiffness_top"),
  };
}

function fitStatusSet(message: string) {
  const status = document.getElementById("fit_status");
  if (!status) return;
  status.textContent = message;
}

function bindFitMyGuitarActions() {
  const fitButton = document.getElementById("btn_fit_guitar");
  const fitFastButton = document.getElementById("btn_fit_guitar_fast");
  const fitMeasuredButton = document.getElementById("btn_fit_guitar_measured");
  const clearButton = document.getElementById("btn_fit_clear");
  if (!fitButton || !fitFastButton || !fitMeasuredButton || !clearButton) return;

  fitButton.addEventListener("click", () => {
    const targets = fitTargetsFromInputs();
    const hasTarget = MODE_KEYS.some((mode) => Number.isFinite(targets[mode]))
      || Number.isFinite(targets.mass_top)
      || Number.isFinite(targets.stiffness_top);
    if (!hasTarget) {
      fitStatusSet("Enter at least one target frequency.");
      return;
    }
    const tweakIds = Array.from(SOLVE_TWEAK_IDS);
    if (Number.isFinite(targets.mass_top)) tweakIds.push("mass_top");
    solveTargets(targets as Record<ModeKey, number | null>, {
      useWhatIf: isWhatIfEnabled(),
      tweakIds,
    });
    fitStatusSet("Fit applied.");
  });

  fitFastButton.addEventListener("click", () => {
    const targets = fitTargetsFromInputs();
    const hasFrequencyTarget = MODE_KEYS.some((mode) => Number.isFinite(targets[mode]));
    if (!hasFrequencyTarget) {
      fitStatusSet("Fit 2 needs at least one Air/Top/Back target.");
      return;
    }
    solveTargetsFast(targets as Record<ModeKey, number | null>, {
      useWhatIf: isWhatIfEnabled(),
    });
    fitStatusSet("Fit 2 applied (fast).");
  });

  fitMeasuredButton.addEventListener("click", () => {
    const targets = fitTargetsFromInputs();
    const hasFrequencyTarget = MODE_KEYS.some((mode) => Number.isFinite(targets[mode]));
    if (!hasFrequencyTarget) {
      fitStatusSet("Fit 3 needs at least one Air/Top/Back target.");
      return;
    }
    solveTargetsMeasured(targets as Record<ModeKey, number | null> & Record<string, number | null>, {
      useWhatIf: isWhatIfEnabled(),
    });
    fitStatusSet("Fit 3 applied (measured-constrained).");
  });

  clearButton.addEventListener("click", () => {
    [
      "fit_target_air",
      "fit_target_top",
      "fit_target_back",
      "fit_target_mass_top",
      "fit_target_stiffness_top",
    ].forEach((elementId) => {
      const input = document.getElementById(elementId) as HTMLInputElement | null;
      if (!input) return;
      input.value = "";
    });
    fitStatusSet("");
  });
}

function solveTargetsFast(targets: Record<ModeKey, number | null | undefined>, opts: { useWhatIf?: boolean } = {}) {
  const useWhatIf = Boolean(opts.useWhatIf && isWhatIfEnabled());
  const baseParams = useWhatIf ? (getWhatIfParams() || currentParams) : currentParams;
  const response = useWhatIf
    ? (lastWhatIfResponse || computeResponseForParams(baseParams))
    : lastResponse;
  const peaks = response ? modelPeaksFromResponse(response) : null;
  if (!peaks) {
    const fit = fit4DofFromTargets(targets, {
      maxIter: 2,
      tweakIds: Array.from(SOLVE_TWEAK_IDS),
      baseParams: { ...baseParams },
    });
    if (fit?.raw) {
      if (useWhatIf) applyWhatIfParams(fit.raw as DofParams);
      else {
        currentParams = { ...currentParams, ...fit.raw };
        scheduleRender();
      }
    }
    return;
  }
  const desired = {
    air: Number.isFinite(targets.air) ? (targets.air as number) : null,
    top: Number.isFinite(targets.top) ? (targets.top as number) : null,
    back: Number.isFinite(targets.back) ? (targets.back as number) : null,
  };
  const warm = { ...baseParams };
  (["top", "back"] as const).forEach((k) => {
    const target = desired[k];
    const base = peaks[k];
    if (!Number.isFinite(target) || !Number.isFinite(base) || (base as number) <= 0) return;
    const ratio = (target as number) / (base as number);
    const id = k === "top" ? "stiffness_top" : "stiffness_back";
    warm[id] = clampToBounds(id, warm[id] * ratio * ratio);
  });
  if (Number.isFinite(desired.air) && Number.isFinite(peaks.air) && (peaks.air as number) > 0) {
    const ratio = (desired.air as number) / (peaks.air as number);
    warm.volume_air = clampToBounds("volume_air", warm.volume_air / (ratio * ratio));
  }
  if (useWhatIf) applyWhatIfParams(warm);
  else {
    currentParams = { ...currentParams, ...warm };
    scheduleRender();
  }
}

function scheduleDragSolve(mode: ModeKey, freq: number) {
  pendingDragMode = mode;
  pendingDragFreq = freq;
  if (pendingDragSolve !== null) return;
  pendingDragSolve = requestAnimationFrame(() => {
    pendingDragSolve = null;
    if (pendingDragMode && Number.isFinite(pendingDragFreq)) {
      const locked = dragLockedTargets || { air: null, top: null, back: null };
      const targets = { ...locked, [pendingDragMode]: pendingDragFreq } as Record<ModeKey, number>;
      solveTargetsFast(targets, { useWhatIf: dragUseWhatIf });
    }
  });
}

function handleThumbPointerDown(event: PointerEvent) {
  const target = event.currentTarget as HTMLElement | null;
  const mode = target?.dataset?.mode as ModeKey | undefined;
  if (!mode) return;
  const plotEl = document.getElementById("plot_dof") as HTMLElement | null;
  if (!plotEl) return;
  event.preventDefault();
  dragUseWhatIf = isWhatIfEnabled();
  const lockResponse = getDragLockResponse(dragUseWhatIf);
  dragLockedTargets = lockResponse ? modelPeaksFromResponse(lockResponse) : { air: null, top: null, back: null };
  dragState.mode = mode;
  dragState.pointerId = event.pointerId;
  const freq = pointerEventToFreq(event, plotEl);
  if (Number.isFinite(freq)) dragState.freq = freq as number;
  target.setPointerCapture?.(event.pointerId);
  updateThumbs();
}

function handleThumbPointerMove(event: PointerEvent) {
  if (!dragState.mode || dragState.pointerId !== event.pointerId) return;
  const plotEl = document.getElementById("plot_dof") as HTMLElement | null;
  if (!plotEl) return;
  const freq = pointerEventToFreq(event, plotEl);
  if (!Number.isFinite(freq)) return;
  dragState.freq = freq as number;
  updateThumbs();
  scheduleDragSolve(dragState.mode, dragState.freq);
}

function handleThumbPointerUp(event: PointerEvent) {
  if (!dragState.mode || dragState.pointerId !== event.pointerId) return;
  const mode = dragState.mode;
  const freq = dragState.freq;
  dragState.mode = null;
  dragState.freq = null;
  dragState.pointerId = null;
  pendingDragMode = null;
  pendingDragFreq = null;
  if (pendingDragSolve !== null) {
    cancelAnimationFrame(pendingDragSolve);
    pendingDragSolve = null;
  }
  updateThumbs();
  if (Number.isFinite(freq)) {
    const locked = dragLockedTargets || { air: null, top: null, back: null };
    const targets = { ...locked, [mode]: freq as number } as Record<ModeKey, number>;
    solveTargets(targets, { useWhatIf: dragUseWhatIf });
  }
  dragLockedTargets = null;
  dragUseWhatIf = false;
}

function bindPlotInteractions(plotEl: HTMLElement) {
  if (plotListenersBound || typeof (plotEl as any).on !== "function") return;
  plotListenersBound = true;
  (plotEl as any).on("plotly_relayout", () => updateThumbs());
  (plotEl as any).on("plotly_restyle", () => syncTraceVisibilityStateFromPlot(plotEl));
  (plotEl as any).on("plotly_legendclick", () => {
    requestAnimationFrame(() => syncTraceVisibilityStateFromPlot(plotEl));
  });
  window.addEventListener("resize", () => updateThumbs());
  window.addEventListener("pointermove", handleThumbPointerMove);
  window.addEventListener("pointerup", handleThumbPointerUp);
  window.addEventListener("pointercancel", handleThumbPointerUp);
}

function renderPlot() {
  const plotEl = document.getElementById("plot_dof");
  if (!plotEl) return;
  const solverParams = adaptParamsToSolver(currentParams);
  const response = computeResponseSafe(solverParams);
  lastResponse = response;
  const whatIfParams = getWhatIfParams();
  const whatIfResponse = whatIfParams ? computeResponseSafe(adaptParamsToSolver(whatIfParams)) : null;
  lastWhatIfResponse = whatIfResponse;
  updateModeCards(response, whatIfResponse);
  if (!response || !Array.isArray(response.total)) {
    (plotEl as HTMLElement).innerHTML = `<div class="muted small">Model response unavailable.</div>`;
    updateThumbs(null);
    return;
  }
  const colors = plotThemeColors();
  const traces: Array<Partial<Plotly.PlotData>> = [];
  const totalTrace = toTrace(response.total, "Current", colors.current, { width: 3 });
  applyTraceVisibility(totalTrace, "Current");
  if (totalTrace) traces.push(totalTrace);
  if (whatIfResponse?.total?.length) {
    const targetTraces = buildTargetOverlayTraces(whatIfResponse.total, colors.whatIf);
    targetTraces.forEach((trace) => {
      applyTraceVisibility(trace, "Target");
      traces.push(trace);
    });
  }
  const topTrace = toTrace(response.top, "Top", colors.top, { width: 1.5, dash: "dot" });
  const airTrace = toTrace(response.air, "Air", colors.air, { width: 1.5, dash: "dot" });
  const backTrace = toTrace(response.back, "Back", colors.back, { width: 1.5, dash: "dot" });
  const sidesTrace = toTrace(response.sides, "Sides", colors.sides, { width: 1, dash: "dot" });
  applyTraceVisibility(topTrace, "Top");
  applyTraceVisibility(airTrace, "Air");
  applyTraceVisibility(backTrace, "Back");
  applyTraceVisibility(sidesTrace, "Sides");
  [topTrace, airTrace, backTrace, sidesTrace].forEach((t)=>{ if(t) traces.push(t); });
  const xRange = [50, 300];
  const layout: Partial<Plotly.Layout> = {
    margin: { l: 40, r: 20, t: 20, b: 50 },
    paper_bgcolor: "transparent",
    plot_bgcolor: "transparent",
    font: { color: colors.ink },
    xaxis: {
      title: "Frequency (Hz)",
      range: xRange,
      gridcolor: colors.grid,
      zeroline: false,
    },
    yaxis: {
      title: "Level (dB)",
      gridcolor: colors.grid,
      autorange: false,
      zeroline: false,
    },
    showlegend: true,
  };
  const yRange = computeYRange(response.total, 6, xRange[0], xRange[1]);
  if (yRange) layout.yaxis = { ...layout.yaxis, range: yRange };
  const plotly = getPlotly();
  if (!plotly) return;
  plotly.react(plotEl, traces, layout, { displayModeBar: true, displaylogo: false })
    .then(() => {
      syncTraceVisibilityStateFromPlot(plotEl as HTMLElement);
      bindPlotInteractions(plotEl as HTMLElement);
      updateThumbs(response);
    })
    .catch((err: any) => {
      console.error("Plotly render failed", err);
    });
}

function bindTabs() {
  document.querySelectorAll<HTMLButtonElement>(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const order = Number(btn.dataset.order || "4");
      setOrder(order);
    });
  });
}

function dofPipelineRunnerExpose() {
  const sharedRunner = (window as any).dof_pipeline_runner?.dofPipelineRunnerRun;
  (window as any).DofPipelineRunner = {
    run: (
      input: Record<string, unknown>,
      config: Record<string, unknown>,
      emit: (event: any) => void,
    ) => {
      if (typeof sharedRunner === "function") {
        return sharedRunner(input || {}, config || {}, emit, {
          refresh: async () => {
            renderPlot();
          },
        });
      }
      return dofPipelineFallbackRun(input || {}, config || {}, emit);
    },
  };
}

function dofPipelineFallbackRun(
  input: Record<string, unknown>,
  config: Record<string, unknown>,
  emit: ((event: any) => void) | undefined,
) {
  const runId = `dof_fallback_${Date.now()}`;
  dofPipelineFallbackStartedEmit(emit, runId, input, config);
  dofPipelineFallbackRefreshStartedEmit(emit, runId);
  renderPlot();
  dofPipelineFallbackRefreshCompletedEmit(emit, runId);
  dofPipelineFallbackCompletedEmit(emit, runId, input?.trigger || null);
  return Promise.resolve();
}

function dofPipelineFallbackStartedEmit(
  emit: ((event: any) => void) | undefined,
  runId: string,
  input: Record<string, unknown>,
  config: Record<string, unknown>,
) {
  emit?.({
    eventType: "pipeline.started",
    stageId: undefined,
    payload: { input, config },
    runId,
  });
}

function dofPipelineFallbackRefreshStartedEmit(
  emit: ((event: any) => void) | undefined,
  runId: string,
) {
  emit?.({
    eventType: "stage.started",
    stageId: "refresh",
    payload: { stage: "refresh" },
    runId,
  });
}

function dofPipelineFallbackRefreshCompletedEmit(
  emit: ((event: any) => void) | undefined,
  runId: string,
) {
  emit?.({
    eventType: "stage.completed",
    stageId: "refresh",
    payload: { stage: "refresh" },
    runId,
  });
}

function dofPipelineFallbackCompletedEmit(
  emit: ((event: any) => void) | undefined,
  runId: string,
  trigger: unknown,
) {
  emit?.({
    eventType: "pipeline.completed",
    stageId: undefined,
    payload: { summary: { trigger } },
    runId,
  });
}

function init() {
  const fromUrl = dofParamsFromLocation();
  if (fromUrl) {
    currentParams = { ...currentParams, ...fromUrl };
    if (Number.isFinite(fromUrl.model_order)) currentOrder = fromUrl.model_order as number;
  }
  bindTabs();
  bindFitMyGuitarActions();
  buildCards();
  setOrder(currentOrder);
  dofPipelineRunnerExpose();
  if (fromUrl) syncCardInputs();
  scheduleRender();
  const overlayToggle = document.getElementById("toggle_overlay") as HTMLInputElement | null;
  if (overlayToggle) {
    overlayToggle.addEventListener("change", () => {
      document.body.classList.toggle("whatif-mode", overlayToggle.checked);
      if (!overlayToggle.checked) resetWhatIf();
      refreshOverlayVisuals();
      scheduleRender();
    });
    document.body.classList.toggle("whatif-mode", overlayToggle.checked);
    refreshOverlayVisuals();
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

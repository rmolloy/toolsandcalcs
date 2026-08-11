// @ts-nocheck

import {
  buildDofOverlayPresentation,
  colorWithAlpha,
} from "./dof_display_format";
import {
  DOF_MODE_BANDS as MODE_BANDS,
  modelPeaksFromResponse,
} from "./dof_peak_detection";
import {
  buildDofTargetOverlayTraces,
  buildDofTrace,
  computeDofYRange,
} from "./dof_plot_data";
import {
  buildDofFastTargetWarmParams,
  fitDofFromTargets,
} from "./dof_target_fit";
import {
  buildDofTaskCards,
  restoreDofFitTaskControls,
  restoreDofSolveTaskControls,
  type DofTaskCardDefinition,
} from "./dof_task_cards";
import {
  adaptDofLegacyParams,
  computeDofLegacyResponse,
} from "./dof_legacy_solver";
import { sampleDofSeriesAtFrequency } from "./dof_series_sampling";
import {
  readDofPlotAxes,
  readDofPointerFrequency,
} from "./dof_plot_pointer";
import { applyDofPlotResize } from "./dof_plot_resize";
import {
  applyDofTraceVisibility,
  DOF_TRACE_DEFAULT_VISIBLE,
  DofTraceVisibilityState,
  syncDofTraceVisibilityStateFromPlot,
} from "./dof_trace_visibility";
import {
  buildDofFitInputTargets,
  dofFitIncreaseOnlyFactorAllowed,
  dofFitSolveTweakIdsFromTargets,
  dofFitTargetsHaveAnyValue,
  readDofRestrictedTweakIds,
} from "./dof_fit_input_policy";
import {
  applyDofModeCardPresentation,
  buildDofModeCardPresentation,
  formatDofSigned,
} from "./dof_mode_card_presentation";
import {
  dofDisplayValueToInternal as displayToInternal,
  dofInternalValueToDisplay as internalToDisplay,
  isDofUncommittedDecimalInput as isUncommittedDecimalInput,
  readDofParamsFromSearch,
} from "./dof_parameter_input_policy";

type DofParams = {
  [key: string]: number;
};

type ModeKey = "air" | "top" | "back";
type TaskMode = "edit" | "fit" | "solve";
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
type TaskModeCopy = {
  cardsTitle: string;
  cardsCopy: string;
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

const FIT_TASK_CARD_DEFS: DofTaskCardDefinition[] = [
  {
    key: "air",
    label: "Air",
    alias: "Measured mode + body",
    badgeText: "Fit",
    copy: "Match the air resonance from the measured mode and the body inputs you already know.",
    fieldIds: ["fit_target_air", "fit_target_volume_air", "fit_target_area_hole_diam"],
  },
  {
    key: "top",
    label: "Top",
    alias: "Measured mode + plate",
    badgeText: "Fit",
    copy: "Anchor the top mode with the observed frequency and the effective top properties you trust.",
    fieldIds: ["fit_target_top", "fit_target_mass_top", "fit_target_stiffness_top"],
  },
  {
    key: "back",
    label: "Back",
    alias: "Measured mode + plate",
    badgeText: "Fit",
    copy: "Anchor the back mode with the observed frequency and the effective back properties you trust.",
    fieldIds: ["fit_target_back", "fit_target_mass_back", "fit_target_stiffness_back"],
  },
  {
    key: "environment",
    label: "Environment",
    alias: "Atmosphere + actions",
    badgeText: "Fit",
    copy: "Set the measurement altitude, run the fitter, and clear the inputs when you want to start over.",
    fieldIds: ["fit_altitude"],
    actionIds: ["btn_fit_guitar", "btn_fit_clear"],
    statusId: "fit_status",
  },
];

const SOLVE_TASK_CARD_DEFS: DofTaskCardDefinition[] = [
  {
    key: "air",
    label: "Air",
    alias: "Target mode + body",
    badgeText: "Solve",
    copy: "Set the air goal first, then shape the body inputs that most directly move it.",
    fieldIds: ["fit_target_air", "fit_target_volume_air", "fit_target_area_hole_diam"],
  },
  {
    key: "top",
    label: "Top",
    alias: "Target mode + plate",
    badgeText: "Solve",
    copy: "Set the top target and the effective top properties that define the move you want.",
    fieldIds: ["fit_target_top", "fit_target_mass_top", "fit_target_stiffness_top"],
  },
  {
    key: "back",
    label: "Back",
    alias: "Target mode + plate",
    badgeText: "Solve",
    copy: "Set the back target and the effective back properties you want the solver to respect.",
    fieldIds: ["fit_target_back", "fit_target_mass_back", "fit_target_stiffness_back"],
  },
  {
    key: "environment",
    label: "Environment",
    alias: "Recipe actions",
    badgeText: "Solve",
    copy: "Constrain the recipe, solve the what-if, and review the suggested structural moves.",
    optionIds: ["fit_restrict_simple"],
    actionIds: ["btn_solve_targets", "btn_reset_whatif"],
    panelIds: ["whatif_summary"],
  },
];

const TASK_MODE_COPY: Record<TaskMode, TaskModeCopy> = {
  edit: {
    cardsTitle: "Current Model",
    cardsCopy: "Direct parameter editing for each degree of freedom.",
  },
  fit: {
    cardsTitle: "Fit by System",
    cardsCopy: "Use measured modes and known inputs to infer the current model.",
  },
  solve: {
    cardsTitle: "Solve by System",
    cardsCopy: "Set goals and constraints, then review the suggested moves.",
  },
};

function cardDefsForTaskMode(taskMode: TaskMode) {
  if (taskMode === "edit") return CARD_DEFS;
  if (taskMode === "fit") return CARD_DEFS;
  return CARD_DEFS;
}

function fitTaskControlGridRead() {
  return fitPanelSection()?.querySelector(".dof-fit-controls") as HTMLDivElement | null;
}

function solveTaskActionsGroupRead() {
  return solvePanelSection()?.querySelector(".dof-guided-actions") as HTMLDivElement | null;
}

function solveTaskControlsRestoreHome() {
  restoreDofSolveTaskControls(
    document,
    solvePanelSection(),
    solveTaskActionsGroupRead(),
    SOLVE_TASK_CARD_DEFS,
  );
}

const MODE_META: Record<ModeKey, { label: string; color: string }> = {
  air: { label: "Air", color: "var(--purple)" },
  top: { label: "Top", color: "var(--blue)" },
  back: { label: "Back", color: "var(--green)" },
};

const MODE_KEYS: ModeKey[] = ["air", "top", "back"];

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
let currentTaskMode: TaskMode = "edit";
const dofPerTabSession = dofPerTabSessionRead();
let plotlyRef: typeof Plotly | null = null;
let pendingRender: number | null = null;
let lastResponse: any = null;
let plotListenersBound = false;
let plotResizeObserver: ResizeObserver | null = null;
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
const traceVisibilityState: DofTraceVisibilityState = { ...DOF_TRACE_DEFAULT_VISIBLE };
const DOF_FIT_FIELD_IDS = [
  "fit_target_air",
  "fit_target_top",
  "fit_target_back",
  "fit_target_mass_top",
  "fit_target_stiffness_top",
  "fit_target_mass_back",
  "fit_target_stiffness_back",
  "fit_target_volume_air",
  "fit_target_area_hole_diam",
] as const;

function dofParamsFromLocation(): Partial<DofParams> | null {
  return readDofParamsFromSearch(
    window.location.search,
    Object.keys(DEFAULT_PARAMS),
  ) as Partial<DofParams> | null;
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

function updateParamFromCommittedInput(
  param: keyof typeof DEFAULT_PARAMS,
  input: HTMLInputElement,
  slider: HTMLInputElement,
) {
  if (isUncommittedDecimalInput(input.value)) return;
  const value = parseFloat(input.value);
  if (Number.isFinite(value)) slider.value = String(value);
  updateParam(param, value);
}

function commitParamInput(
  param: keyof typeof DEFAULT_PARAMS,
  input: HTMLInputElement,
  slider: HTMLInputElement,
) {
  const value = parseFloat(input.value);
  if (Number.isFinite(value)) {
    input.value = String(value);
    slider.value = String(value);
  }
  updateParam(param, value);
}

function tokenColor(token: string, fallbackToken = "--ink") {
  const styles = getComputedStyle(document.documentElement);
  return styles.getPropertyValue(token).trim()
    || styles.getPropertyValue(fallbackToken).trim()
    || "currentColor";
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

function cssPercentValue(value: number) {
  return `${value}%`;
}

function cssPixelValue(value: number) {
  return `${value}px`;
}

function styleVariableWrite(element: HTMLElement, name: string, value: string) {
  element.style.setProperty(name, value);
}

function stylePercentVariableWrite(element: HTMLElement, name: string, value: number) {
  styleVariableWrite(element, name, cssPercentValue(value));
}

function stylePixelVariableWrite(element: HTMLElement, name: string, value: number) {
  styleVariableWrite(element, name, cssPixelValue(value));
}

function sliderStackElementRead(slider: HTMLInputElement) {
  return slider.parentElement as HTMLElement | null;
}

function sliderPresentationSync(
  slider: HTMLInputElement,
  start: number,
  end: number,
  baseFill: number,
  overlayFill: number,
) {
  const sliderStack = sliderStackElementRead(slider);
  if (!sliderStack) return;
  stylePercentVariableWrite(sliderStack, "--param-slider-fill-end", baseFill);
  stylePercentVariableWrite(sliderStack, "--param-overlay-start", start);
  stylePercentVariableWrite(sliderStack, "--param-overlay-end", end);
  stylePercentVariableWrite(sliderStack, "--param-overlay-width", Math.max(0, end - start));
  stylePercentVariableWrite(sliderStack, "--param-overlay-fill", overlayFill);
}

function buildCards() {
  const container = document.getElementById("dof_cards");
  if (!container) return;
  restoreDofFitTaskControls(
    document,
    fitPanelSection(),
    fitTaskControlGridRead(),
    FIT_TASK_CARD_DEFS,
  );
  solveTaskControlsRestoreHome();
  container.innerHTML = "";
  if (currentTaskMode === "fit") {
    buildDofTaskCards(document, container, FIT_TASK_CARD_DEFS);
    return;
  }
  if (currentTaskMode === "solve") {
    buildDofTaskCards(document, container, SOLVE_TASK_CARD_DEFS);
    return;
  }
  cardDefsForTaskMode(currentTaskMode).forEach((card) => {
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

      input.addEventListener("input", () => {
        updateParamFromCommittedInput(field.param, input, slider);
        syncOverlayToBase(field.param);
        updateOverlayLatch(field.param);
      });
      input.addEventListener("change", () => {
        commitParamInput(field.param, input, slider);
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
  if (currentTaskMode !== "edit") return;
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
  const presentation = buildDofOverlayPresentation({
    baseSlider: slider,
    overlaySlider: overlay,
    baseValue,
    overlayValue,
    showWhatIf: isWhatIfEnabled(),
  });
  if (presentation.isActive) overlayLatched.add(param);
  else overlayLatched.delete(param);
  overlay.classList.toggle("overlay-active", presentation.isActive);

  sliderPresentationSync(
    slider,
    presentation.start,
    presentation.end,
    presentation.baseFill,
    presentation.overlayFill,
  );

  if (deltaBar) {
    deltaBar.classList.toggle("active", presentation.deltaBarActive);
  }
  if (glowDot) {
    glowDot.classList.toggle("active", presentation.isActive);
  }

  if (whatIfRow && whatIfValue && whatIfDelta) {
    whatIfRow.classList.toggle("active", presentation.whatIfActive);
    whatIfValue.textContent = presentation.overlayValueText;
    whatIfDelta.textContent = presentation.delta == null
      ? ""
      : formatDofSigned(presentation.delta, presentation.deltaDigits);
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
  whatIfSummarySet(null);
}

function resetWhatIfComparison() {
  const toggle = document.getElementById("toggle_overlay") as HTMLInputElement | null;
  if (!toggle?.checked) {
    resetWhatIf();
    return;
  }
  toggle.checked = false;
  toggle.dispatchEvent(new Event("change"));
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

function updateModeCards(baseResponse = lastResponse, whatIfResponse = lastWhatIfResponse) {
  const basePeaks = baseResponse ? modelPeaksFromResponse(baseResponse) : null;
  const whatIfPeaks = whatIfResponse ? modelPeaksFromResponse(whatIfResponse) : null;
  MODE_KEYS.forEach((mode) => {
    const els = modeCardEls[mode];
    if (!els) return;
    const presentation = buildDofModeCardPresentation({
      mode,
      basePeaks,
      whatIfPeaks,
      drag: {
        mode: dragState.mode,
        frequency: dragState.freq,
        useWhatIf: dragUseWhatIf,
      },
    });
    applyDofModeCardPresentation(els, presentation);
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
  fitAltitudeControlSync();
}

function fitAltitudeControlSync() {
  const slider = document.getElementById("fit_altitude") as HTMLInputElement | null;
  const value = document.getElementById("fit_altitude_value");
  if (!slider || !value) return;
  const altitude = internalToDisplay("altitude", currentParams.altitude);
  if (!Number.isFinite(altitude)) return;
  slider.value = String(altitude);
  value.textContent = `${Math.round(altitude)} m`;
}

function fitAltitudeControlBind() {
  const slider = document.getElementById("fit_altitude") as HTMLInputElement | null;
  if (!slider) return;
  fitAltitudeControlSync();
  slider.addEventListener("input", () => {
    const altitude = parseFloat(slider.value);
    if (!Number.isFinite(altitude)) return;
    updateParam("altitude", altitude);
    fitAltitudeControlSync();
  });
}

function setOrder(order: number) {
  currentOrder = order;
  currentParams.model_order = order;
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    const isActive = Number((btn as HTMLElement).dataset.order) === order;
    btn.classList.toggle("tab-btn-active", isActive);
  });
  applyCardVisibility();
  scheduleRender();
}

function taskModeCopyRead(mode: TaskMode) {
  return TASK_MODE_COPY[mode];
}

function taskModeCopyApply(mode: TaskMode) {
  const copy = taskModeCopyRead(mode);
  const cardsTitle = document.getElementById("dof_cards_title");
  const cardsCopy = document.getElementById("dof_cards_copy");
  if (cardsTitle) cardsTitle.textContent = copy.cardsTitle;
  if (cardsCopy) cardsCopy.textContent = copy.cardsCopy;
}

function fitPanelSection() {
  return document.getElementById("dof_fit_panel");
}

function solvePanelSection() {
  return document.getElementById("dof_solve_panel");
}

function setTaskMode(mode: TaskMode) {
  currentTaskMode = mode;
  document.querySelectorAll(".task-tab-btn").forEach((btn) => {
    const isActive = String((btn as HTMLElement).dataset.taskMode || "") === mode;
    btn.classList.toggle("task-tab-btn-active", isActive);
  });
  taskModeCopyApply(mode);
  buildCards();
}

function scheduleRender() {
  dofPerTabSessionPersist();

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
  return computeDofLegacyResponse(window, params);
}

function adaptParamsToSolverLegacy(raw: DofParams): Record<string, any> {
  return adaptDofLegacyParams(window, raw);
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

function sampleSeriesAtFreq(series: Array<{ x: number; y: number }>, freq: number | null) {
  const sharedSampler = sharedSeriesSamplerRead();
  if (sharedSampler) return sharedSampler.seriesValueSampleAtFrequency(series, freq);
  return sampleDofSeriesAtFrequency(series, freq);
}

function fit4DofFromTargets(
  targets: Record<string, number | null | undefined>,
  opts: { maxIter?: number; tweakIds?: string[]; baseParams?: Record<string, any>; factorAllowed?: (id: string, factor: number) => boolean } = {},
) {
  return fitDofFromTargets(targets, opts, {
    defaultParams: DEFAULT_PARAMS,
    defaultTweakIds: SOLVE_TWEAK_IDS,
    clampToBounds,
    computeResponse: computeResponseSafe,
    adaptParams: adaptParamsToSolver,
    peaksFromResponse: modelPeaksFromResponse,
  });
}

function targetOverlaySharedBuilderRead() {
  const shared = (window as any).overlay_segments;
  const buildShared = shared?.overlaySegmentsBuildFromPoints;
  return typeof buildShared === "function" ? buildShared : undefined;
}

function buildTargetOverlayTraces(points: Array<{ x: number; y: number }>, color: string): Partial<Plotly.PlotData>[] {
  return buildDofTargetOverlayTraces(
    points,
    color,
    TARGET_OVERLAY,
    colorWithAlpha,
    targetOverlaySharedBuilderRead(),
  );
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
    thumb.root.classList.add("thumb-hidden");
    return;
  }
  const x = axes.xaxis.l2p(freq) + (axes.xaxis._offset || 0);
  const y = axes.yaxis.l2p(db) + (axes.yaxis._offset || 0);
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    thumb.root.classList.add("thumb-hidden");
    return;
  }
  thumb.root.classList.remove("thumb-hidden");
  stylePixelVariableWrite(thumb.root, "--thumb-x", x);
  stylePixelVariableWrite(thumb.root, "--thumb-y", y);
}

function updateThumbs(response = lastResponse) {
  const plotEl = document.getElementById("plot_dof");
  const overlay = document.getElementById("plot_overlay");
  if (!plotEl || !overlay) return;
  const axes = readDofPlotAxes(plotEl);
  const activeResponse = isWhatIfEnabled() && lastWhatIfResponse?.total?.length
    ? lastWhatIfResponse
    : response;
  if (!axes || !activeResponse?.total?.length) {
    Object.values(thumbEls).forEach((thumb) => {
      if (thumb) thumb.root.classList.add("thumb-hidden");
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
  opts: { useWhatIf?: boolean; tweakIds?: string[]; factorAllowed?: (id: string, factor: number) => boolean } = {},
) {
  const useWhatIf = Boolean(opts.useWhatIf && isWhatIfEnabled());
  const baseParams = useWhatIf ? (getWhatIfParams() || currentParams) : currentParams;
  const fit = fit4DofFromTargets(targets, {
    maxIter: 12,
    tweakIds: opts.tweakIds || Array.from(SOLVE_TWEAK_IDS),
    baseParams: { ...baseParams },
    factorAllowed: opts.factorAllowed,
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

function fitTargetsFromInputs(): Record<string, number | null> {
  return buildDofFitInputTargets(readDofInputValue, displayToInternal);
}

function fitTargetsHaveAnyValue(targets: Record<string, number | null>) {
  return dofFitTargetsHaveAnyValue(targets);
}

function fitSolveTweakIdsFromTargets(targets: Record<string, number | null>) {
  return dofFitSolveTweakIdsFromTargets(targets);
}

function fitRecipeRestrictSimpleEnabled() {
  const toggle = document.getElementById("fit_restrict_simple") as HTMLInputElement | null;
  return Boolean(toggle?.checked);
}

function fitRecipeRestrictedTweakIds() {
  return readDofRestrictedTweakIds();
}

function fitRecipeIncreaseOnlyFactorAllowed(id: string, factor: number) {
  return dofFitIncreaseOnlyFactorAllowed(id, factor);
}

function fitStatusSet(message: string) {
  const status = document.getElementById("fit_status");
  if (!status) return;
  status.textContent = message;
}

function whatIfSummarySet(lines: string[] | null) {
  const panel = document.getElementById("whatif_summary");
  if (!panel) return;
  const body = panel.querySelector(".delta-summary__body");
  if (!body) return;
  if (!lines || !lines.length) {
    body.textContent = "Run Solve Targets to see suggested adjustments.";
    return;
  }
  body.innerHTML = `<ul>${lines.map((line) => `<li>${line}</li>`).join("")}</ul>`;
}

function whatIfToggleEnsureEnabled() {
  const toggle = document.getElementById("toggle_overlay") as HTMLInputElement | null;
  if (!toggle) return false;
  if (toggle.checked) return true;
  toggle.checked = true;
  toggle.dispatchEvent(new Event("change"));
  return true;
}

function whatIfSummaryRefreshFromCurrentRecipe() {
  const recipeParams = getWhatIfParams();
  const lines = window.buildWhatIfRecipeSummaryLines?.(
    currentParams as Record<string, number>,
    recipeParams as Record<string, number> | null,
  ) ?? null;
  whatIfSummarySet(lines);
}

function solveRecipeTargetsFromFitInputs() {
  const targets = fitTargetsFromInputs();
  const hasTarget = fitTargetsHaveAnyValue(targets);
  if (!hasTarget) {
    fitStatusSet("Enter at least one target frequency.");
    return;
  }
  if (!whatIfToggleEnsureEnabled()) {
    fitStatusSet("Compare mode is unavailable.");
    return;
  }
  const restrictSimple = fitRecipeRestrictSimpleEnabled();
  solveTargets(targets as Record<ModeKey, number | null>, {
    useWhatIf: true,
    tweakIds: restrictSimple ? fitRecipeRestrictedTweakIds() : fitSolveTweakIdsFromTargets(targets),
    factorAllowed: restrictSimple ? fitRecipeIncreaseOnlyFactorAllowed : undefined,
  });
  whatIfSummaryRefreshFromCurrentRecipe();
  fitStatusSet("Solve Targets applied as a What-If recipe.");
}

function bindSolveRecipeActions() {
  const solveButton = document.getElementById("btn_solve_targets");
  const resetButton = document.getElementById("btn_reset_whatif");
  if (!solveButton || !resetButton) return;
  solveButton.addEventListener("click", () => {
    solveRecipeTargetsFromFitInputs();
  });
  resetButton.addEventListener("click", () => {
    resetWhatIfComparison();
    fitStatusSet("What-If comparison reset.");
  });
}

function bindFitMyGuitarActions() {
  const fitButton = document.getElementById("btn_fit_guitar");
  const clearButton = document.getElementById("btn_fit_clear");
  if (!fitButton || !clearButton) return;

  fitButton.addEventListener("click", () => {
    const targets = fitTargetsFromInputs();
    const hasTarget = fitTargetsHaveAnyValue(targets);
    if (!hasTarget) {
      fitStatusSet("Enter at least one target frequency.");
      return;
    }
    solveTargets(targets as Record<ModeKey, number | null>, {
      useWhatIf: isWhatIfEnabled(),
      tweakIds: fitSolveTweakIdsFromTargets(targets),
    });
    fitStatusSet("Fit applied.");
  });

  clearButton.addEventListener("click", () => {
    [
      "fit_target_air",
      "fit_target_top",
      "fit_target_back",
      "fit_target_mass_top",
      "fit_target_stiffness_top",
      "fit_target_mass_back",
      "fit_target_stiffness_back",
      "fit_target_volume_air",
      "fit_target_area_hole_diam",
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
  const warm = buildDofFastTargetWarmParams({
    baseParams,
    targets,
    peaks,
    clampToBounds,
  });
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
  const freq = readDofPointerFrequency(event, plotEl);
  if (Number.isFinite(freq)) dragState.freq = freq as number;
  target.setPointerCapture?.(event.pointerId);
  updateThumbs();
}

function handleThumbPointerMove(event: PointerEvent) {
  if (!dragState.mode || dragState.pointerId !== event.pointerId) return;
  const plotEl = document.getElementById("plot_dof") as HTMLElement | null;
  if (!plotEl) return;
  const freq = readDofPointerFrequency(event, plotEl);
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
  (plotEl as any).on("plotly_restyle", () => syncDofTraceVisibilityStateFromPlot(plotEl, traceVisibilityState));
  (plotEl as any).on("plotly_legendclick", () => {
    requestAnimationFrame(() => syncDofTraceVisibilityStateFromPlot(plotEl, traceVisibilityState));
  });
  bindPlotResizeSync(plotEl);
  window.addEventListener("pointermove", handleThumbPointerMove);
  window.addEventListener("pointerup", handleThumbPointerUp);
  window.addEventListener("pointercancel", handleThumbPointerUp);
}

function readCurrentDofSaveSnapshot() {
  return {
    params: { ...currentParams },
    modelOrder: currentOrder,
    taskMode: currentTaskMode,
    overlayEnabled: isWhatIfEnabled(),
    fitInputs: readCurrentDofFitInputs(),
    solveOptions: readCurrentDofSolveOptions(),
  };
}

function dofPerTabSessionRead() {
  return (window as any).PerTabToolSession?.perTabToolSessionCreate
    ? (window as any).PerTabToolSession.perTabToolSessionCreate({ toolId: "dof_model", version: 1 })
    : null;
}

function dofPerTabSessionPersist() {
  dofPerTabSession?.write(readCurrentDofSaveSnapshot());
}

function dofPerTabSessionSnapshotRead() {
  return dofPerTabSession?.read() || null;
}

function readCurrentDofFitInputs() {
  return Object.fromEntries(
    DOF_FIT_FIELD_IDS.map((id) => [id, readDofInputValue(id)]),
  );
}

function readCurrentDofSolveOptions() {
  return {
    fit_restrict_simple: Boolean((document.getElementById("fit_restrict_simple") as HTMLInputElement | null)?.checked),
  };
}

function readDofInputValue(id: string) {
  return String((document.getElementById(id) as HTMLInputElement | null)?.value || "");
}

function writeDofInputValue(id: string, value: unknown) {
  const input = document.getElementById(id) as HTMLInputElement | null;
  if (!input) return;
  input.value = String(value || "");
}

function applyLoadedDofSnapshot(snapshot: Record<string, any>) {
  const plan = (window as any).DofSaveSnapshot.buildDofSnapshotApplyPlan(snapshot, {
    params: DEFAULT_PARAMS,
    modelOrder: 4,
  });
  currentParams = { ...plan.params };
  DOF_FIT_FIELD_IDS.forEach((id) => writeDofInputValue(id, plan.fitInputs?.[id]));
  const solveToggle = document.getElementById("fit_restrict_simple") as HTMLInputElement | null;
  if (solveToggle) solveToggle.checked = Boolean(plan.solveOptions?.fit_restrict_simple);
  const overlayToggle = document.getElementById("toggle_overlay") as HTMLInputElement | null;
  if (overlayToggle) {
    overlayToggle.checked = Boolean(plan.overlayEnabled);
    overlayToggle.dispatchEvent(new Event("change"));
  }
  syncCardInputs();
  setTaskMode(plan.taskMode);
  setOrder(plan.modelOrder);
  fitStatusSet("");
  whatIfSummarySet(null);
  scheduleRender();
}

async function loadResults() {
  const loadFileInput = document.getElementById("load_model_file") as HTMLInputElement | null;
  const file = loadFileInput?.files?.[0];
  if (!file) return;

  try {
    const snapshot = await (window as any).DofSaveSurface.readDofSavePackageFile(file);
    applyLoadedDofSnapshot(snapshot);
    fitStatusSet("Loaded JSON package.");
  } catch (_error) {
    fitStatusSet("Unable to load JSON package.");
  } finally {
    if (loadFileInput) loadFileInput.value = "";
  }
}

async function saveResults() {
  await readDofSaveRunner().runDofSaveAction({
    readSnapshot: readCurrentDofSaveSnapshot,
    setStatus: fitStatusSet,
  });
}

function readDofSaveRunner() {
  if ((window as any).DofSaveTarget?.dofSaveRunnerCreate) {
    return (window as any).DofSaveTarget.dofSaveRunnerCreate();
  }

  return {
    readDofSaveSurface() {
      return Promise.resolve({
        mode: "offline",
        label: "Download JSON",
        hint: "",
      });
    },
    runDofSaveAction(request: {
      readSnapshot: () => ReturnType<typeof readCurrentDofSaveSnapshot>;
      setStatus: (message: string) => void;
    }) {
      const savePackage = (window as any).DofSaveSurface.buildDofSavePackage(
        request.readSnapshot(),
      );
      (window as any).DofSaveSurface.downloadDofSavePackage(window, savePackage);
      request.setStatus("JSON package downloaded.");
      return Promise.resolve(true);
    },
  };
}

function readDofNotebookRestoreApi() {
  return (window as any).DofNotebookRestore?.restoreDofNotebookEventIntoUi
    ? (window as any).DofNotebookRestore
    : null;
}

async function applyDofSaveSurface() {
  const saveButton = document.getElementById("save_model") as HTMLButtonElement | null;
  const saveSurface = await readDofSaveRunner().readDofSaveSurface();
  if (!saveButton) return;
  saveButton.textContent = saveSurface.label || "Download JSON";
  saveButton.title = saveSurface.hint || "";
}

async function initializeDofSaveSurface() {
  if (await restoreNotebookEventIntoUi()) return;
  await applyDofSaveSurface();
}

async function restoreNotebookEventIntoUi() {
  const restoreApi = readDofNotebookRestoreApi();
  if (!restoreApi) return false;

  const restored = await restoreApi.restoreDofNotebookEventIntoUi({
    runtime: window,
    applySnapshot(snapshot: Record<string, any>) {
      applyLoadedDofSnapshot(snapshot);
    },
  });

  if (restored) {
    fitStatusSet("Notebook event restored.");
  }

  return restored;
}

function bindPlotResizeSync(plotEl: HTMLElement) {
  const sync = () => syncPlotWidthToContainer(plotEl);
  window.addEventListener("resize", sync);
  const plotShell = plotEl.closest(".plot-shell") as Element | null;
  if (typeof ResizeObserver !== "function" || plotResizeObserver) return;
  plotResizeObserver = new ResizeObserver(() => sync());
  plotResizeObserver.observe(plotShell || plotEl);
}

function syncPlotWidthToContainer(plotEl: HTMLElement) {
  Promise.resolve(applyDofPlotResize(getPlotly(), plotEl)).finally(() => updateThumbs());
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
  const totalTrace = buildDofTrace(response.total, "Current", colors.current, { width: 3 });
  applyDofTraceVisibility(totalTrace, "Current", traceVisibilityState);
  if (totalTrace) traces.push(totalTrace);
  if (whatIfResponse?.total?.length) {
    const targetTraces = buildTargetOverlayTraces(whatIfResponse.total, colors.whatIf);
    targetTraces.forEach((trace) => {
      applyDofTraceVisibility(trace, "Target", traceVisibilityState);
      traces.push(trace);
    });
  }
  const topTrace = buildDofTrace(response.top, "Top", colors.top, { width: 1.5, dash: "dot" });
  const airTrace = buildDofTrace(response.air, "Air", colors.air, { width: 1.5, dash: "dot" });
  const backTrace = buildDofTrace(response.back, "Back", colors.back, { width: 1.5, dash: "dot" });
  const sidesTrace = buildDofTrace(response.sides, "Sides", colors.sides, { width: 1, dash: "dot" });
  applyDofTraceVisibility(topTrace, "Top", traceVisibilityState);
  applyDofTraceVisibility(airTrace, "Air", traceVisibilityState);
  applyDofTraceVisibility(backTrace, "Back", traceVisibilityState);
  applyDofTraceVisibility(sidesTrace, "Sides", traceVisibilityState);
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
  const yRange = computeDofYRange(response.total, 6, xRange[0], xRange[1]);
  if (yRange) layout.yaxis = { ...layout.yaxis, range: yRange };
  const plotly = getPlotly();
  if (!plotly) return;
  plotly.react(plotEl, traces, layout, { displayModeBar: true, displaylogo: false })
    .then(() => {
      syncDofTraceVisibilityStateFromPlot(plotEl as HTMLElement, traceVisibilityState);
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

function bindTaskModeTabs() {
  document.querySelectorAll<HTMLButtonElement>(".task-tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const mode = String(btn.dataset.taskMode || "edit") as TaskMode;
      setTaskMode(mode);
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
  const saveButton = document.getElementById("save_model") as HTMLButtonElement | null;
  const loadButton = document.getElementById("load_model") as HTMLButtonElement | null;
  const loadFileInput = document.getElementById("load_model_file") as HTMLInputElement | null;
  const perTabSnapshot = dofPerTabSessionSnapshotRead();
  const fromUrl = dofParamsFromLocation();
  bindTabs();
  bindTaskModeTabs();
  bindFitMyGuitarActions();
  fitAltitudeControlBind();
  bindSolveRecipeActions();
  if (saveButton) saveButton.addEventListener("click", () => void saveResults());
  if (loadButton && loadFileInput) loadButton.addEventListener("click", () => loadFileInput.click());
  if (loadFileInput) loadFileInput.addEventListener("change", loadResults);
  setTaskMode(currentTaskMode);
  setOrder(currentOrder);
  if (perTabSnapshot) applyLoadedDofSnapshot(perTabSnapshot);
  if (fromUrl) {
    currentParams = { ...currentParams, ...fromUrl };
    if (Number.isFinite(fromUrl.model_order)) currentOrder = fromUrl.model_order as number;
    syncCardInputs();
    setOrder(currentOrder);
  }
  void initializeDofSaveSurface();
  dofPipelineRunnerExpose();
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

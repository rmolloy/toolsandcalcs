// Orchestrate resonance reader runtime wiring.

import { renderWaveform } from "./resonate_waveform_view.js";
import { modeProfileResolveFromMeasureMode } from "./resonate_mode_config.js";
import { FFT_MAX_HZ, spectrumViewRangeResolveFromMeasureMode } from "./resonate_spectrum_config.js";
import { type ModeDetection } from "./resonate_mode_detection.js";
import { renderEnergyTransferFromState, renderModesFromState, renderSpectrumFromConfig, setStatusText } from "./resonate_ui_render.js";
import { fullWaveFromState, sliceCurrentWaveFromState } from "./resonate_wave_slices.js";
import { computeOverlayCurveFromState } from "./resonate_overlay_controller.js";
import { resonanceBoundaryDefaults } from "./resonate_boundary_defaults.js";
import { resonanceBoundaryResolveFromState, type ResonanceBoundarySet } from "./resonate_boundary_resolver.js";
import type { ResonanceBoundaryState } from "./resonate_boundary_state.js";
import { resonanceBoundarySeedIntoState } from "./resonate_boundary_seed.js";
import { overlayToggleShouldRender } from "./resonate_overlay_gate.js";
import { renderTryPanel } from "./resonate_try_panel.js";
import { refreshFftFromState } from "./resonate_fft_refresh.js";
import { stageSolveDofRun } from "./resonate_stage_solve_dof.js";
import { resonatePipelineRefreshAllFromState } from "./resonate_pipeline_refresh.js";
import { resonanceReaderBootstrap } from "./resonate_bootstrap_entry.js";
import type { ModeCard, SpectrumPayload } from "./resonate_types.js";
import { customMeasurementModeMetaBuildFromState } from "./resonate_custom_measurements.js";
import { externalModelDestinationResolveFromMeasureMode } from "./resonate_model_destination.js";
import { plateThicknessHrefBuildFromModes } from "./resonate_plate_thickness_link.js";

const state = (window as any).FFTState as ResonanceBoundaryState & Record<string, any>;
let pipelineRunActive = false;
let pipelineRunQueuedTrigger: string | null = null;

type SpectrumPayloadLocal = SpectrumPayload & { modes?: ModeDetection[] };

function computeOverlayCurve(
  freqs: number[],
  dbs: number[],
  modesDetected: ModeDetection[],
  boundaries: ResonanceBoundarySet,
): number[] | undefined {
  return computeOverlayCurveFromState(
    state,
    freqs,
    dbs,
    modesDetected,
    overlayBoundaryFromSet(boundaries),
  );
}

function boundariesResolveFromState(): ResonanceBoundarySet {
  return resonanceBoundaryResolveFromState(state);
}

function overlayBoundaryFromSet(boundaries: ResonanceBoundarySet) {
  return boundaries.overlay;
}

function sliceCurrentWave() {
  return sliceCurrentWaveFromState(state);
}

function fullWave() {
  return fullWaveFromState(state);
}

function renderModes(modes: ModeCard[]) {
  renderModesFromState(modes, renderModesConfigBuild());
}

function renderModesConfigBuild() {
  return { state, modeMeta: modeMetaBuildFromState() };
}

function setStatus(text: string) {
  setStatusText(text);
}

function renderSpectrum(payload: SpectrumPayloadLocal) {
  renderSpectrumFromConfig(payload, renderSpectrumConfigBuild());
}

function renderSpectrumConfigBuild() {
  const range = spectrumViewRangeResolveFromMeasureMode(state.measureMode);
  return { modeMeta: modeMetaBuildFromState(), freqMin: range.freqMin, freqAxisMax: range.freqAxisMax };
}

function modeMetaBuildFromState() {
  const profile = modeProfileResolveFromMeasureMode(state.measureMode);
  return {
    ...profile.meta,
    ...customMeasurementModeMetaBuildFromState(state),
  };
}

async function refreshFft(boundaries: ResonanceBoundarySet = boundariesResolveFromState()) {
  const computeOverlayCurveBound = overlayCurveBoundBuild(boundaries);
  return refreshFftFromState(
    refreshFftArgsBuild({
      boundaries,
      computeOverlayCurve: computeOverlayCurveBound,
    }),
  );
}

function overlayCurveBoundBuild(boundaries: ResonanceBoundarySet) {
  return (freqs: number[], dbs: number[], modesDetected: ModeDetection[]) => {
    if (!overlayToggleShouldRender(document.getElementById("toggle_overlay") as HTMLInputElement | null)) {
      renderTryPanel([], [], false);
      return undefined;
    }
    return computeOverlayCurve(freqs, dbs, modesDetected, boundaries);
  };
}

function refreshFftArgsBuild({
  boundaries,
  computeOverlayCurve,
}: {
  boundaries: ResonanceBoundarySet;
  computeOverlayCurve: (freqs: number[], dbs: number[], modesDetected: ModeDetection[]) => number[] | undefined;
}) {
  return {
    ...refreshFftStaticArgsBuild(),
    computeOverlayCurve,
    ...refreshFftBoundaryArgsBuild(boundaries),
  };
}

function refreshFftStaticArgsBuild() {
  return {
    state,
    setStatus,
    modeMeta: modeMetaBuildFromState(),
    fftMaxHz: FFT_MAX_HZ,
    sliceCurrentWave,
    solveDofFromState: () => stageSolveDofRun({ state }),
  };
}

function refreshFftBoundaryArgsBuild(boundaries: ResonanceBoundarySet) {
  return {
    analysisBoundary: boundaries.analysis,
    signalBoundary: boundaries.signal,
  };
}

async function resonatePipelineRefreshAll() {
  const boundaries = boundariesResolveFromState();
  const seedBoundaries = pipelineBoundariesSeedBuild(boundaries);
  return resonatePipelineRefreshAllFromState(
    pipelineRefreshArgsBuild({
      refreshFft: pipelineRefreshFftBoundBuild(boundaries),
      prepareBoundaries: seedBoundaries,
    }),
  );
}

function pipelineBoundariesSeedBuild(boundaries: ResonanceBoundarySet) {
  return () => resonanceBoundarySeedIntoState(state, boundaries);
}

function pipelineRefreshFftBoundBuild(boundaries: ResonanceBoundarySet): () => Promise<void> {
  return () => refreshFft(boundaries) as Promise<void>;
}

function pipelineRefreshArgsBuild({
  refreshFft,
  prepareBoundaries,
}: {
  refreshFft: () => Promise<void>;
  prepareBoundaries: () => void;
}) {
  return {
    ...pipelineRefreshStaticArgsBuild(),
    refreshFft,
    prepareBoundaries,
  };
}

function pipelineRefreshStaticArgsBuild() {
  return {
    state,
    setStatus,
    fullWave,
  };
}

export async function resonatePipelineRunnerRun(trigger: string) {
  const runner = (window as any).ResonatePipelineRunner;
  if (!runner?.run) {
    console.warn("[Resonance Reader] Pipeline runner missing while event rendering is enabled.");
    return;
  }
  if (pipelineRunActive) {
    pipelineRunQueuedTrigger = trigger;
    return;
  }
  pipelineRunActive = true;
  try {
    await runner.run({ trigger }, { version: "v1", stages: ["refresh"] });
    const queuedTrigger = pipelineRunQueuedTrigger;
    pipelineRunQueuedTrigger = null;
    if (!queuedTrigger) return;
    await runner.run({ trigger: queuedTrigger }, { version: "v1", stages: ["refresh"] });
  } finally {
    pipelineRunActive = false;
  }
}

function resonanceStatusExpose(setStatusFn: (text: string) => void) {
  (window as any).ResonateStatus = { setStatus: setStatusFn };
}

function resonanceUiExpose() {
  (window as any).ResonateUiRender = {
    renderSpectrum,
    renderModes,
    renderWaveform: renderWaveformBoundBuild(),
    renderEnergyTransferFromState: (nextState: Record<string, any>) => renderEnergyTransferFromState(nextState),
    setStatus,
  };
}

function overlayToggleActionsElementGet() {
  return document.querySelector<HTMLElement>(".dof-model-actions");
}

function overlayToggleInputElementGet() {
  return document.getElementById("toggle_overlay") as HTMLInputElement | null;
}

function viewModelCopyElementGet() {
  return document.querySelector<HTMLElement>(".dof-model-copy");
}

function viewModelRowElementGet() {
  return document.querySelector<HTMLElement>(".dof-model-row");
}

function viewModelMeasureModeElementGet() {
  return document.getElementById("measure_mode") as HTMLSelectElement | null;
}

function viewModelMeasureModeResolve() {
  const selectValue = viewModelMeasureModeElementGet()?.value;
  return selectValue || state.measureMode;
}

function viewModelDestinationApplyToUi(link: HTMLAnchorElement) {
  const destination = externalModelDestinationResolveFromMeasureMode(viewModelMeasureModeResolve());
  const overlayToggle = overlayToggleInputElementGet();
  if (overlayToggle && !destination.showModelRow) overlayToggle.checked = false;
  const row = viewModelRowElementGet();
  if (row) row.style.display = destination.showModelRow ? "" : "none";
  link.textContent = destination.label;
  link.href = destination.href;
  const actions = overlayToggleActionsElementGet();
  if (actions) actions.style.display = destination.showOverlayToggle ? "inline-flex" : "none";
  const copy = viewModelCopyElementGet();
  if (copy) copy.style.display = destination.kind === "dof" ? "" : "none";
}

function viewModelLinkAttach() {
  const link = document.querySelector<HTMLAnchorElement>('a[data-view-model]');
  if (!link) return;
  viewModelDestinationApplyToUi(link);
  viewModelMeasureModeElementGet()?.addEventListener("change", () => viewModelDestinationApplyToUi(link));
  link.addEventListener("click", (e) => {
    const destination = externalModelDestinationResolveFromMeasureMode(viewModelMeasureModeResolve());
    if (destination.kind === "plate-thickness") {
      const modesDetected = Array.isArray(state.lastModesDetected) ? state.lastModesDetected as ModeDetection[] : [];
      const href = plateThicknessHrefBuildFromModes(link.href, modesDetected);
      e.preventDefault();
      window.location.href = href;
      return;
    }
    const href = viewModelHrefBuildFromState(link.href);
    if (!href) return;
    e.preventDefault();
    window.location.href = href;
  });
}

function viewModelHrefBuildFromState(baseHref: string) {
  const params = viewModelParamsBuildFromState();
  if (!params) return baseHref;
  const encoded = encodeURIComponent(JSON.stringify(params));
  const url = new URL(baseHref, window.location.href);
  url.searchParams.set("params", encoded);
  return url.toString();
}

function viewModelParamsBuildFromState() {
  const raw = state.whatIfFittedParams || state.lastFittedParams;
  if (!raw) return null;
  return viewModelParamsNormalize(raw);
}

function viewModelParamsNormalize(raw: Record<string, number>) {
  const out = { ...raw };
  ["mass_air", "mass_top", "mass_back", "mass_sides"].forEach((key) => {
    const val = out[key];
    if (Number.isFinite(val)) out[key] = (val as number) / 1000;
  });
  return out;
}

export function resonanceReaderRuntimeStart() {
  if (typeof window === "undefined") return;
  const boundaries: ResonanceBoundarySet = boundariesResolveFromState();
  resonanceStatusExpose(setStatus);
  resonanceUiExpose();
  viewModelLinkAttach();
  resonanceReaderBootstrap(runtimeBootstrapArgsBuild(boundaries));
}

function renderWaveformBoundBuild() {
  return (wave: any) => renderWaveform(wave, renderWaveformConfigBuild());
}

function runtimeBootstrapArgsBuild(boundaries: ResonanceBoundarySet) {
  return {
    state,
    refreshPipeline: resonatePipelineRefreshAll,
    runPipelineRunner: resonatePipelineRunnerRun,
    setStatus,
    renderSpectrum,
    renderModes,
    renderWaveform: renderWaveformBoundBuild(),
    ...runtimeBoundaryArgsBuild(boundaries),
  };
}

function renderWaveformConfigBuild() {
  return { state, setStatus, runResonatePipeline: resonatePipelineRunnerRun };
}

function runtimeBoundaryArgsBuild(boundaries: ResonanceBoundarySet) {
  return {
    analysisBoundary: boundaries.analysis,
    signalBoundary: boundaries.signal,
    overlayBoundary: boundaries.overlay,
  };
}

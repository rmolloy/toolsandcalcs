// Orchestrate resonance reader runtime wiring.
import { renderWaveform } from "./resonate_waveform_view.js";
import { MODE_META } from "./resonate_mode_config.js";
import { FREQ_AXIS_MAX, FREQ_MIN, FFT_MAX_HZ } from "./resonate_spectrum_config.js";
import { renderModesFromState, renderSpectrumFromConfig, setStatusText } from "./resonate_ui_render.js";
import { fullWaveFromState, sliceCurrentWaveFromState } from "./resonate_wave_slices.js";
import { computeOverlayCurveFromState } from "./resonate_overlay_controller.js";
import { resonanceBoundaryResolveFromState } from "./resonate_boundary_resolver.js";
import { resonanceBoundarySeedIntoState } from "./resonate_boundary_seed.js";
import { overlayToggleShouldRender } from "./resonate_overlay_gate.js";
import { renderTryPanel } from "./resonate_try_panel.js";
import { refreshFftFromState } from "./resonate_fft_refresh.js";
import { stageSolveDofRun } from "./resonate_stage_solve_dof.js";
import { resonatePipelineRefreshAllFromState } from "./resonate_pipeline_refresh.js";
import { resonanceReaderBootstrap } from "./resonate_bootstrap_entry.js";
import { customMeasurementModeMetaBuildFromState } from "./resonate_custom_measurements.js";
const state = window.FFTState;
function computeOverlayCurve(freqs, dbs, modesDetected, boundaries) {
    return computeOverlayCurveFromState(state, freqs, dbs, modesDetected, overlayBoundaryFromSet(boundaries));
}
function boundariesResolveFromState() {
    return resonanceBoundaryResolveFromState(state);
}
function overlayBoundaryFromSet(boundaries) {
    return boundaries.overlay;
}
function sliceCurrentWave() {
    return sliceCurrentWaveFromState(state);
}
function fullWave() {
    return fullWaveFromState(state);
}
function renderModes(modes) {
    renderModesFromState(modes, renderModesConfigBuild());
}
function renderModesConfigBuild() {
    return { state, modeMeta: modeMetaBuildFromState() };
}
function setStatus(text) {
    setStatusText(text);
}
function renderSpectrum(payload) {
    renderSpectrumFromConfig(payload, renderSpectrumConfigBuild());
}
function renderSpectrumConfigBuild() {
    return { modeMeta: modeMetaBuildFromState(), freqMin: FREQ_MIN, freqAxisMax: FREQ_AXIS_MAX };
}
function modeMetaBuildFromState() {
    return {
        ...MODE_META,
        ...customMeasurementModeMetaBuildFromState(state),
    };
}
async function refreshFft(boundaries = boundariesResolveFromState()) {
    const computeOverlayCurveBound = overlayCurveBoundBuild(boundaries);
    return refreshFftFromState(refreshFftArgsBuild({
        boundaries,
        computeOverlayCurve: computeOverlayCurveBound,
    }));
}
function overlayCurveBoundBuild(boundaries) {
    return (freqs, dbs, modesDetected) => {
        if (!overlayToggleShouldRender(document.getElementById("toggle_overlay"))) {
            renderTryPanel([], [], false);
            return undefined;
        }
        return computeOverlayCurve(freqs, dbs, modesDetected, boundaries);
    };
}
function refreshFftArgsBuild({ boundaries, computeOverlayCurve, }) {
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
        modeMeta: MODE_META,
        fftMaxHz: FFT_MAX_HZ,
        sliceCurrentWave,
        solveDofFromState: () => stageSolveDofRun({ state }),
    };
}
function refreshFftBoundaryArgsBuild(boundaries) {
    return {
        analysisBoundary: boundaries.analysis,
        signalBoundary: boundaries.signal,
    };
}
async function resonatePipelineRefreshAll() {
    const boundaries = boundariesResolveFromState();
    const seedBoundaries = pipelineBoundariesSeedBuild(boundaries);
    return resonatePipelineRefreshAllFromState(pipelineRefreshArgsBuild({
        refreshFft: pipelineRefreshFftBoundBuild(boundaries),
        prepareBoundaries: seedBoundaries,
    }));
}
function pipelineBoundariesSeedBuild(boundaries) {
    return () => resonanceBoundarySeedIntoState(state, boundaries);
}
function pipelineRefreshFftBoundBuild(boundaries) {
    return () => refreshFft(boundaries);
}
function pipelineRefreshArgsBuild({ refreshFft, prepareBoundaries, }) {
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
async function resonatePipelineRunnerRun(trigger) {
    const runner = window.ResonatePipelineRunner;
    if (!runner?.run) {
        console.warn("[Resonance Reader] Pipeline runner missing while event rendering is enabled.");
        return;
    }
    const input = { trigger };
    const config = { version: "v1", stages: ["refresh"] };
    await runner.run(input, config);
}
function resonanceStatusExpose(setStatusFn) {
    window.ResonateStatus = { setStatus: setStatusFn };
}
function resonanceUiExpose() {
    window.ResonateUiRender = {
        renderSpectrum,
        renderModes,
        renderWaveform: renderWaveformBoundBuild(),
        setStatus,
    };
}
function viewModelLinkAttach() {
    const link = document.querySelector('a[data-view-model]');
    if (!link)
        return;
    link.addEventListener("click", (e) => {
        const href = viewModelHrefBuildFromState(link.href);
        if (!href)
            return;
        e.preventDefault();
        window.location.href = href;
    });
}
function viewModelHrefBuildFromState(baseHref) {
    const params = viewModelParamsBuildFromState();
    if (!params)
        return baseHref;
    const encoded = encodeURIComponent(JSON.stringify(params));
    const url = new URL(baseHref, window.location.href);
    url.searchParams.set("params", encoded);
    return url.toString();
}
function viewModelParamsBuildFromState() {
    const raw = state.whatIfFittedParams || state.lastFittedParams;
    if (!raw)
        return null;
    return viewModelParamsNormalize(raw);
}
function viewModelParamsNormalize(raw) {
    const out = { ...raw };
    ["mass_air", "mass_top", "mass_back", "mass_sides"].forEach((key) => {
        const val = out[key];
        if (Number.isFinite(val))
            out[key] = val / 1000;
    });
    return out;
}
export function resonanceReaderRuntimeStart() {
    if (typeof window === "undefined")
        return;
    const boundaries = boundariesResolveFromState();
    resonanceStatusExpose(setStatus);
    resonanceUiExpose();
    viewModelLinkAttach();
    resonanceReaderBootstrap(runtimeBootstrapArgsBuild(boundaries));
}
function renderWaveformBoundBuild() {
    return (wave) => renderWaveform(wave, renderWaveformConfigBuild());
}
function runtimeBootstrapArgsBuild(boundaries) {
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
function runtimeBoundaryArgsBuild(boundaries) {
    return {
        analysisBoundary: boundaries.analysis,
        signalBoundary: boundaries.signal,
        overlayBoundary: boundaries.overlay,
    };
}

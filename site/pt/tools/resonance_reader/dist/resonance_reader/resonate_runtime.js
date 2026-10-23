// Orchestrate resonance reader runtime wiring.
import { renderWaveform } from "./resonate_waveform_view.js?rev=bd81c33a8408";
import { measureModeNormalize, modeProfileResolveFromState, peakAnalysisSourceMeasureModeResolve } from "./resonate_mode_config.js?rev=bd81c33a8408";
import { spectrumFftMaxHzResolve, spectrumViewRangeResolveFromMeasureMode } from "./resonate_spectrum_config.js?rev=bd81c33a8408";
import { renderEnergyTransferFromState, renderModesFromState, renderSpectrumFromConfig, setStatusText } from "./resonate_ui_render.js?rev=bd81c33a8408";
import { fullWaveFromState, sliceCurrentWaveFromState } from "./resonate_wave_slices.js?rev=bd81c33a8408";
import { computeOverlayCurveFromState } from "./resonate_overlay_controller.js?rev=bd81c33a8408";
import { resonanceBoundaryResolveFromState } from "./resonate_boundary_resolver.js?rev=bd81c33a8408";
import { resonanceBoundarySeedIntoState } from "./resonate_boundary_seed.js?rev=bd81c33a8408";
import { overlayToggleShouldRender } from "./resonate_overlay_gate.js?rev=bd81c33a8408";
import { renderTryPanel } from "./resonate_try_panel.js?rev=bd81c33a8408";
import { refreshFftFromState } from "./resonate_fft_refresh.js?rev=bd81c33a8408";
import { stageSolveDofRun } from "./resonate_stage_solve_dof.js?rev=bd81c33a8408";
import { resonatePipelineRefreshAllFromState } from "./resonate_pipeline_refresh.js?rev=bd81c33a8408";
import { resonanceReaderBootstrap } from "./resonate_bootstrap_entry.js?rev=bd81c33a8408";
import { customMeasurementModeMetaBuildFromState } from "./resonate_custom_measurements.js?rev=bd81c33a8408";
import { externalModelDestinationResolveFromMeasureMode } from "./resonate_model_destination.js?rev=bd81c33a8408";
import { braceCalculatorHrefBuildFromModes } from "./resonate_brace_calculator_link.js?rev=bd81c33a8408";
import { stockKindResolve } from "./resonate_stock_measurements.js?rev=bd81c33a8408";
import { stockMeasurementsPanelInitialize, stockMeasurementsPanelRender } from "./resonate_stock_measurements_panel.js?rev=bd81c33a8408";
import { braceStockEstimateResolveFromState } from "./resonate_brace_stock_estimate.js?rev=bd81c33a8408";
import { flexuralRigidityBaseHrefResolve, flexuralRigidityOpenFromBraceStock } from "./resonate_flexural_rigidity_link.js?rev=bd81c33a8408";
import { analysisTabsInitialize, analysisTabsRenderFromState } from "./resonate_analysis_tabs.js?rev=bd81c33a8408";
import { peakAnalysisPanelInitialize, peakAnalysisPanelRenderFromState, peakAnalysisCompletedQRenderFromState, peakAnalysisSelectionSyncFromState, peakAnalysisRingdownDataBuild } from "./resonate_peak_analysis_panel.js?rev=bd81c33a8408";
import { plateThicknessHrefBuildFromModes } from "./resonate_plate_thickness_link.js?rev=bd81c33a8408";
import { plateStockTransferModesBuild } from "./resonate_plate_stock_transfer.js?rev=bd81c33a8408";
import { takeOverlayCurrentPayloadBuild } from "./resonate_take_overlays.js?rev=bd81c33a8408";
import { pipelineRunCoalescedTriggerBuild } from "../common/pipeline_run_coalescer.js?rev=bd81c33a8408";
import { resonanceToolNavigate } from "./resonate_tool_navigation.js?rev=bd81c33a8408";
import { installRingdownWorkerProvider } from "./resonate_ringdown_worker_provider.js?rev=bd81c33a8408";
import { refreshModeCardQValues } from "./resonate_q_card_update.js?rev=bd81c33a8408";
import { resolveQForViewModeCards } from "./resonate_q_view_policy.js?rev=bd81c33a8408";
const state = window.FFTState;
const resonatePipelineTriggerRun = pipelineRunCoalescedTriggerBuild(async (trigger) => {
    const runner = window.ResonatePipelineRunner;
    if (!runner?.run) {
        console.warn("[Resonance Reader] Pipeline runner missing while event rendering is enabled.");
        return;
    }
    await runner.run({ trigger }, { version: "v1", stages: ["refresh"] });
});
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
    const link = document.querySelector('a[data-view-model]');
    if (link) {
        viewModelDestinationApplyToUi(link);
        return;
    }
    analysisSurfaceRenderFromState();
}
function renderModesConfigBuild() {
    return { state, modeMeta: modeMetaBuildFromState() };
}
function renderCompletedQResults() {
    refreshModeCardQValues(state.lastModeCards || []);
    if (peakAnalysisShouldRender())
        peakAnalysisCompletedQRenderFromState(state);
}
function renderSelectedTapQResults() {
    state.lastModeCards = resolveQForViewModeCards(state, state.lastModeCards || [], peakAnalysisRingdownDataBuild);
    renderCompletedQResults();
}
function setStatus(text) {
    setStatusText(text);
}
function renderSpectrum(payload) {
    renderSpectrumFromConfig({ ...payload, takeOverlays: payload.takeOverlays || takeOverlayCurrentPayloadBuild(state) }, renderSpectrumConfigBuild());
}
function renderSpectrumConfigBuild() {
    const range = spectrumViewRangeResolveFromMeasureMode(peakAnalysisSourceMeasureModeResolve(state));
    return { modeMeta: modeMetaBuildFromState(), freqMin: range.freqMin, freqAxisMax: range.freqAxisMax };
}
function modeMetaBuildFromState() {
    const profile = modeProfileResolveFromState(state);
    return {
        ...profile.meta,
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
        modeMeta: modeMetaBuildFromState(),
        resolveModeMeta: modeMetaBuildFromState,
        fftMaxHz: spectrumFftMaxHzResolve(),
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
export async function resonatePipelineRunnerRun(trigger) {
    await resonatePipelineTriggerRun(trigger);
}
function resonanceStatusExpose(setStatusFn) {
    window.ResonateStatus = { setStatus: setStatusFn };
}
function resonanceUiExpose() {
    window.ResonateUiRender = {
        renderSpectrum,
        renderModes,
        renderWaveform: renderWaveformBoundBuild(),
        renderEnergyTransferFromState: (nextState) => renderEnergyTransferFromState(nextState),
        setStatus,
    };
}
function overlayToggleActionsElementGet() {
    return document.querySelector(".dof-model-actions");
}
function overlayToggleInputElementGet() {
    return document.getElementById("toggle_overlay");
}
function viewModelCopyElementGet() {
    return document.querySelector(".dof-model-copy");
}
function viewModelRowElementGet() {
    return document.querySelector(".dof-model-row");
}
function viewModelMeasureModeElementGet() {
    return document.getElementById("measure_mode");
}
function viewModelMeasureModeResolve() {
    const selectValue = viewModelMeasureModeElementGet()?.value;
    return selectValue || state.measureMode;
}
function viewModelDestinationApplyToUi(link) {
    const measureMode = viewModelMeasureModeResolve();
    const destination = externalModelDestinationResolveFromMeasureMode(viewModelDestinationMeasureModeResolve(measureMode));
    const overlayToggle = overlayToggleInputElementGet();
    if (overlayToggle && !destination.showOverlayToggle)
        overlayToggle.checked = false;
    const row = viewModelRowElementGet();
    if (row)
        row.style.display = destination.showModelRow ? "" : "none";
    link.textContent = destination.label;
    link.href = destination.href;
    const actions = overlayToggleActionsElementGet();
    if (actions)
        actions.style.display = destination.showOverlayToggle ? "inline-flex" : "none";
    const copy = viewModelCopyElementGet();
    if (copy)
        copy.style.display = destination.kind === "dof" ? "" : "none";
    state.measureMode = measureMode;
    analysisSurfaceRenderFromState();
}
function viewModelDestinationMeasureModeResolve(measureMode) {
    if (["plate_stock", "brace_stock", "peak_analysis"].includes(String(measureMode))) {
        return stockKindResolve(state) || peakAnalysisSourceMeasureModeResolve(state);
    }
    return measureMode === "peak_analysis" ? peakAnalysisSourceMeasureModeResolve(state) : measureMode;
}
function viewModelLinkAttach() {
    const link = document.querySelector('a[data-view-model]');
    if (!link)
        return;
    viewModelDestinationApplyToUi(link);
    viewModelMeasureModeElementGet()?.addEventListener("change", () => viewModelDestinationApplyToUi(link));
    link.addEventListener("click", async (e) => {
        const destination = externalModelDestinationResolveFromMeasureMode(viewModelDestinationMeasureModeResolve(viewModelMeasureModeResolve()));
        if (destination.kind === "plate-thickness") {
            e.preventDefault();
            await plateThicknessTransferOpen(link.href);
            return;
        }
        if (destination.kind === "brace-calculator") {
            e.preventDefault();
            await braceCalculatorTransferOpen(link.href);
            return;
        }
        const href = viewModelHrefBuildFromState(link.href);
        if (!href)
            return;
        e.preventDefault();
        await perTabStatePersistBeforeNavigation();
        resonanceToolNavigate(href);
    });
}
async function perTabStatePersistBeforeNavigation() {
    const persist = window.ResonatePerTabState?.persist;
    if (typeof persist !== "function")
        return;
    await persist();
}
async function braceCalculatorTransferOpen(baseHref) {
    const modesDetected = transferModesDetectedFromState();
    const estimate = braceStockEstimateResolveFromState(state);
    const measurements = estimate.status === "ready" ? estimate.measurements : undefined;
    const modes = estimate.status === "ready"
        ? [{ mode: "long", peakFreq: estimate.confirmation.frequencyHz }]
        : modesDetected;
    await perTabStatePersistBeforeNavigation();
    resonanceToolNavigate(braceCalculatorHrefBuildFromModes(baseHref, modes, measurements));
}
async function plateThicknessTransferOpen(baseHref) {
    const modesDetected = plateStockTransferModesBuild(state, transferModesDetectedFromState());
    const measurements = state.stockMeasurementKind === "plate_stock" ? state.plateMaterialMeasurements : undefined;
    await perTabStatePersistBeforeNavigation();
    resonanceToolNavigate(plateThicknessHrefBuildFromModes(baseHref, modesDetected, measurements));
}
function transferModesDetectedFromState() {
    const kind = stockKindResolve(state);
    if (kind && kind !== peakAnalysisSourceMeasureModeResolve(state))
        return [];
    return Array.isArray(state.lastModesDetected) ? state.lastModesDetected : [];
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
    installRingdownWorkerProvider(state, renderCompletedQResults);
    stockMeasurementsPanelInitialize(state, {
        selectedPeak: () => state.measureMode === "peak_analysis" ? peakAnalysisSelectionSyncFromState(state) : null,
        render: () => {
            renderModesFromState(state.lastModeCards || [], renderModesConfigBuild());
            const link = document.querySelector('a[data-view-model]');
            if (link)
                viewModelDestinationApplyToUi(link);
            else
                analysisSurfaceRenderFromState();
        },
        transfer: () => {
            void perTabStatePersistBeforeNavigation().then(() => {
                flexuralRigidityOpenFromBraceStock(flexuralRigidityBaseHrefResolve(), state);
            });
        },
    });
    peakAnalysisPanelInitialize(state);
    analysisTabsInitialize(state);
    viewModelLinkAttach();
    resonanceReaderBootstrap(runtimeBootstrapArgsBuild(boundaries));
}
function analysisSurfaceRenderFromState() {
    if (peakAnalysisShouldRender()) {
        peakAnalysisPanelRenderFromState(state);
    }
    if (state.measureMode !== "peak_analysis")
        stockMeasurementsPanelRender(state);
    analysisTabsRenderFromState(state);
}
function peakAnalysisShouldRender() {
    return measureModeNormalize(state.measureMode) === "peak_analysis" || typeof state.peakAnalysisSelectedKey === "string";
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
    return {
        state,
        setStatus,
        runResonatePipeline: resonatePipelineRunnerRun,
        renderPeakAnalysis: renderSelectedTapQResults,
    };
}
function runtimeBoundaryArgsBuild(boundaries) {
    return {
        analysisBoundary: boundaries.analysis,
        signalBoundary: boundaries.signal,
        overlayBoundary: boundaries.overlay,
    };
}

import { computeOverlayCurveFromState } from "./resonate_overlay_controller.js?rev=a9c4c0145336";
import { overlayBoundaryDefault } from "./resonate_overlay_boundary.js?rev=a9c4c0145336";
import { overlayToggleShouldRender } from "./resonate_overlay_gate.js?rev=a9c4c0145336";
import { emitArtifactEventFromState } from "./resonate_artifact_emit.js?rev=a9c4c0145336";
import { renderTryPanel } from "./resonate_try_panel.js?rev=a9c4c0145336";
import { measureModeNormalize } from "./resonate_mode_config.js?rev=a9c4c0145336";
export function stageSolveDofRun(args) {
    const spectrum = args.state.lastSpectrum;
    if (!spectrum?.freqs?.length)
        return;
    const modesDetected = Array.isArray(args.state.lastModesDetected) ? args.state.lastModesDetected : [];
    if (!modesDetected.length)
        return;
    const freqs = Array.from(spectrum.freqs, (v) => Number(v));
    const dbs = Array.from((spectrum.dbs || spectrum.mags || []), (v) => Number(v));
    const toggle = document.getElementById("toggle_overlay");
    const overlayVisible = overlayToggleShouldRender(toggle);
    const refitRequested = args.state.dofRefitRequested === true;
    if (!dofFitComputationShouldRun(args.state, overlayVisible, refitRequested)) {
        renderTryPanel([], [], false);
        args.state.lastOverlay = undefined;
        emitArtifactEventFromState(args.state);
        return;
    }
    const boundary = args.state.overlayBoundary || overlayBoundaryDefault;
    const fitMaxIter = args.fitMaxIter ?? 18;
    const overlay = computeOverlayCurveFromState(args.state, freqs, dbs, modesDetected, boundary, { fitMaxIter });
    delete args.state.dofRefitRequested;
    if (!overlayVisible) {
        renderTryPanel([], [], false);
        args.state.lastOverlay = undefined;
        emitArtifactEventFromState(args.state);
        return;
    }
    args.state.lastOverlay = overlay;
    emitArtifactEventFromState(args.state);
}
function dofFitComputationShouldRun(state, overlayVisible, refitRequested) {
    return overlayVisible || refitRequested || measureModeNormalize(state.measureMode) === "guitar";
}

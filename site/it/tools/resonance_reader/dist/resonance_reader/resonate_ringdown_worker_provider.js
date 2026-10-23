import { createRingdownWorkerClient } from "./resonate_ringdown_worker_client.js?rev=37b595148646";
import { peakAnalysisRingdownDataBuild, peakAnalysisRingdownRequestBuild, peakAnalysisWidthHzResolveFromMode } from "./resonate_peak_analysis_panel.js?rev=37b595148646";
import { resolveQForViewModeCards } from "./resonate_q_view_policy.js?rev=37b595148646";
import { qSettingsResolve } from "./resonate_q_settings.js?rev=37b595148646";
const spectrumFrameIds = new WeakMap();
let nextSpectrumFrameId = 1;
export function installRingdownWorkerProvider(state, render, options = {}) {
    let disposed = false;
    let scheduled = false;
    const schedule = options.scheduleRender || ((callback) => requestAnimationFrame(callback));
    const client = (options.createClient || createRingdownWorkerClient)({ onResult: scheduleCompletedFitsRender });
    state.ringdownDataRead = readRingdownForMode;
    return { dispose: () => { disposed = true; client.dispose(); } };
    function scheduleCompletedFitsRender() {
        if (disposed || scheduled)
            return;
        scheduled = true;
        schedule(() => {
            scheduled = false;
            if (disposed)
                return;
            state.lastModeCards = resolveQForViewModeCards(state, state.lastModeCards || [], peakAnalysisRingdownDataBuild);
            render();
        });
    }
    function readRingdownForMode(requestState, mode) {
        if (disposed || mode?.isPeak === false)
            return null;
        const request = peakAnalysisRingdownRequestBuild(requestState, mode);
        if (!request)
            return null;
        client.setContext(currentRingdownContext(state));
        const key = JSON.stringify([request.input.targetFrequencyHz, request.input.selectedStart]);
        const fit = client.readOrQueue(request.wave, request.provenance.sampleRate, key, request.input);
        if (fit.status === "ready")
            return fit.result ? { result: fit.result, provenance: request.provenance } : null;
        const pending = fit.status === "pending";
        return { result: unavailableRingdownResult(request.provenance.sampleRate, pending ? [] : ["worker_failed"]),
            provenance: request.provenance, ...(pending ? { pending: true } : {}) };
    }
}
function currentRingdownContext(state) {
    return JSON.stringify([state.measureMode, state.peakAnalysisSelectedKey, qSettingsResolve(state).method,
        state.qAnalysisWindowMs, state.viewRangeMs, state.tapSegments,
        (state.lastModeCards || []).map(ringdownCardInputs),
        spectrumFrameIdentity(state.lastSpectrum), spectrumFrameIdentity(state.lastSpectrumRaw)]);
}
function ringdownCardInputs(card) {
    return [card.key, card.freq, card.isPeak, peakAnalysisWidthHzResolveFromMode(card)];
}
function spectrumFrameIdentity(frame) {
    if (!frame || typeof frame !== "object")
        return 0;
    if (!spectrumFrameIds.has(frame))
        spectrumFrameIds.set(frame, nextSpectrumFrameId++);
    return spectrumFrameIds.get(frame);
}
function unavailableRingdownResult(sampleRate, flags) {
    return { f0: null, tau: null, Q: null, deltaF: null, envelopeR2: null, slope: null,
        flags, envelope: [], sampleRate, attackSkipMs: 40, smoothWindowMs: 5 };
}

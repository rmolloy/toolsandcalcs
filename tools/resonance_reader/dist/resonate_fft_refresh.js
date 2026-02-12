import { analysisBoundaryDefault } from "./resonate_analysis_boundary.js";
import { signalBoundaryDefault } from "./resonate_signal_boundary.js";
import { stageDetectModesFromSpectrum } from "./resonate_stage_detect.js";
import { stageRefreshPreRun } from "./resonate_stage_refresh_pre.js";
import { stageRefreshPostApply } from "./resonate_stage_refresh_post.js";
import { emitArtifactEventFromState } from "./resonate_artifact_emit.js";
export async function refreshFftFromState(deps) {
    const analysis = deps.analysisBoundary ?? analysisBoundaryDefault;
    const signal = deps.signalBoundary ?? signalBoundaryDefault;
    const slice = deps.sliceCurrentWave();
    if (!slice) {
        deps.setStatus("Load or record to view the waveform.");
        return;
    }
    const fftFactory = window.createFftEngine;
    if (typeof fftFactory !== "function")
        return;
    const { spectrum } = await stageRefreshPreRun({
        wave: slice.wave,
        sampleRate: slice.sampleRate,
        fftMaxHz: deps.fftMaxHz,
        signal,
        fftFactory,
    });
    const freqsRaw = Array.from(spectrum.freqs || [], (v) => Number(v));
    const magsRaw = Array.from(spectrum.mags || [], (v) => Number(v));
    const magsSmoothed = analysis.smoothSpectrumFast(freqsRaw, magsRaw, 1.5);
    const withDb = window.FFTPlot.applyDb({ freqs: freqsRaw, mags: magsSmoothed });
    deps.state.lastSpectrum = withDb;
    const freqs = Array.from(withDb.freqs || [], (v) => Number(v));
    const dbs = Array.from(withDb.dbs || withDb.mags || [], (v) => Number(v));
    const modesDetected = stageDetectModesFromSpectrum(deps.state, analysis, { freqs, dbs });
    stageRefreshPostApply({
        state: deps.state,
        analysis,
        modeMeta: deps.modeMeta,
        modesDetected,
        freqs,
        dbs,
    });
    deps.state.rerenderFromLastSpectrum = (options) => {
        const last = deps.state.lastSpectrum;
        if (!last?.freqs?.length)
            return;
        const freqs2 = Array.from(last.freqs || [], (v) => Number(v));
        const dbs2 = Array.from(last.dbs || last.mags || [], (v) => Number(v));
        const det = stageDetectModesFromSpectrum(deps.state, analysis, { freqs: freqs2, dbs: dbs2 });
        if (!det.length)
            return;
        stageRefreshPostApply({
            state: deps.state,
            analysis,
            modeMeta: deps.modeMeta,
            modesDetected: det,
            freqs: freqs2,
            dbs: dbs2,
        });
        if (options?.skipDof) {
            emitArtifactEventFromState(deps.state);
            return;
        }
        deps.solveDofFromState?.();
    };
}

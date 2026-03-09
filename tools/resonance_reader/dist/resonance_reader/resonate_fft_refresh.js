import { analysisBoundaryDefault } from "./resonate_analysis_boundary.js";
import { signalBoundaryDefault } from "./resonate_signal_boundary.js";
import { stageDetectModesFromSpectrum } from "./resonate_stage_detect.js";
import { stageRefreshPreRun } from "./resonate_stage_refresh_pre.js";
import { stageRefreshPostApply } from "./resonate_stage_refresh_post.js";
import { emitArtifactEventFromState } from "./resonate_artifact_emit.js";
import { measureModeNormalize } from "./resonate_mode_config.js";
import { resonancePolymaxValidationEnabled, resonanceSpectrumSmoothingEnabled, resonanceSpectrumSmoothingHzResolve, } from "./resonate_debug_flags.js";
import { polymaxStableCandidatesFromWave } from "./resonate_polymax.js";
const FFT_SMOOTH_HZ = 0.05;
function spectrumMaybeSmooth(analysis, freqsRaw, magsRaw) {
    if (!resonanceSpectrumSmoothingEnabled())
        return magsRaw;
    return analysis.smoothSpectrumFast(freqsRaw, magsRaw, resonanceSpectrumSmoothingHzResolve(FFT_SMOOTH_HZ));
}
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
    const magsSmoothed = spectrumMaybeSmooth(analysis, freqsRaw, magsRaw);
    const withDb = window.FFTPlot.applyDb({ freqs: freqsRaw, mags: magsSmoothed });
    deps.state.lastSpectrum = withDb;
    deps.state.lastSpectrumNoteSelection = await secondarySpectrumBuildFromNoteSelectionRange({
        state: deps.state,
        fftMaxHz: deps.fftMaxHz,
        signal,
        fftFactory,
        analysis,
    });
    const freqs = Array.from(withDb.freqs || [], (v) => Number(v));
    const dbs = Array.from(withDb.dbs || withDb.mags || [], (v) => Number(v));
    const modesDetectedRaw = stageDetectModesFromSpectrum(deps.state, analysis, { freqs, dbs });
    const polymaxCandidates = polymaxCandidatesResolveFromSlice(slice.wave, slice.sampleRate, deps.fftMaxHz);
    deps.state.lastPolymaxCandidates = polymaxCandidates;
    const modesDetected = modesDetectedRaw.map((mode) => {
        const peakFreq = Number(mode.peakFreq);
        const poly = polymaxCandidates.find((candidate) => Number.isFinite(peakFreq) && Math.abs(candidate.freqHz - peakFreq) <= 2.5) || null;
        return { ...mode, polymaxStable: Boolean(poly), polymaxStability: poly?.stability ?? null };
    });
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
        const detRaw = stageDetectModesFromSpectrum(deps.state, analysis, { freqs: freqs2, dbs: dbs2 });
        if (!detRaw.length)
            return;
        const polymaxCandidates = Array.isArray(deps.state.lastPolymaxCandidates) ? deps.state.lastPolymaxCandidates : [];
        const det = detRaw.map((mode) => {
            const peakFreq = Number(mode.peakFreq);
            const poly = polymaxCandidates.find((candidate) => Number.isFinite(peakFreq) && Math.abs(Number(candidate?.freqHz) - peakFreq) <= 2.5) || null;
            return { ...mode, polymaxStable: Boolean(poly), polymaxStability: poly?.stability ?? null };
        });
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
function polymaxCandidatesResolveFromSlice(wave, sampleRate, fftMaxHz) {
    if (!resonancePolymaxValidationEnabled())
        return [];
    return polymaxStableCandidatesFromWave(wave, sampleRate, { freqMin: 40, freqMax: fftMaxHz });
}
async function secondarySpectrumBuildFromNoteSelectionRange(args) {
    if (measureModeNormalize(args.state.measureMode) !== "played_note")
        return null;
    const range = args.state.noteSelectionRangeMs;
    if (!range || !Number.isFinite(range.start) || !Number.isFinite(range.end) || range.end <= range.start)
        return null;
    const source = args.state.currentWave;
    if (!source)
        return null;
    const slicer = window.FFTWaveform?.sliceWaveRange;
    if (typeof slicer !== "function")
        return null;
    const noteSlice = slicer(source, range.start, range.end);
    if (!noteSlice?.wave?.length || !Number.isFinite(noteSlice?.sampleRate))
        return null;
    const { spectrum } = await stageRefreshPreRun({
        wave: noteSlice.wave,
        sampleRate: noteSlice.sampleRate,
        fftMaxHz: args.fftMaxHz,
        signal: args.signal,
        fftFactory: args.fftFactory,
    });
    const freqsRaw = Array.from(spectrum.freqs || [], (v) => Number(v));
    const magsRaw = Array.from(spectrum.mags || [], (v) => Number(v));
    const magsSmoothed = spectrumMaybeSmooth(args.analysis, freqsRaw, magsRaw);
    const withDb = window.FFTPlot.applyDb({ freqs: freqsRaw, mags: magsSmoothed });
    return {
        freqs: Array.from(withDb.freqs || [], (v) => Number(v)),
        mags: Array.from(withDb.dbs || withDb.mags || [], (v) => Number(v)),
    };
}

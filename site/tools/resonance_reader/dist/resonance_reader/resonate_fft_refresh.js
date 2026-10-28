import { analysisBoundaryDefault } from "./resonate_analysis_boundary.js?rev=093b6a20873d";
import { signalBoundaryDefault } from "./resonate_signal_boundary.js?rev=093b6a20873d";
import { stageDetectModesFromSpectrum } from "./resonate_stage_detect.js?rev=093b6a20873d";
import { stageRefreshPreRun } from "./resonate_stage_refresh_pre.js?rev=093b6a20873d";
import { stageRefreshPostApply } from "./resonate_stage_refresh_post.js?rev=093b6a20873d";
import { emitArtifactEventFromState } from "./resonate_artifact_emit.js?rev=093b6a20873d";
import { measureModeNormalize } from "./resonate_mode_config.js?rev=093b6a20873d";
import { resonancePeakHoldEnabled, resonanceFftInputScopeResolve, resonancePolymaxValidationEnabled, resonanceSpectrumAveragingModeResolve, resonanceSpectrumSmoothingBinsResolve, resonanceSpectrumSmoothingHzResolve, resonanceSpectrumSmoothingModeResolve, } from "./resonate_debug_flags.js?rev=093b6a20873d";
import { polymaxStableCandidatesFromWave } from "./resonate_polymax.js?rev=093b6a20873d";
import { spectrumDbApply } from "./resonate_spectrum_db_scale.js?rev=093b6a20873d";
import { resonanceLocalizedMessages } from "./resonate_localized_messages.js?rev=093b6a20873d";
import { peakAnalysisRingdownDataBuild } from "./resonate_peak_analysis_panel.js?rev=093b6a20873d";
import { captureSpectrumInputs, rememberSpectrumFrame } from "./resonate_spectrum_cache.js?rev=093b6a20873d";
const FFT_SMOOTH_GAUSSIAN_BINS = 8;
const SPECTRUM_AVERAGING_LIMITS = {
    "avg-4": 4,
    "avg-8": 8,
};
export function tapAveragingAllowedForState(state) {
    void state;
    return true;
}
export function refreshSpectrumVariantsBuild(args) {
    const displayMags = spectrumMaybeSmooth(args.analysis, args.displaySpectrum.freqs, args.displaySpectrum.mags);
    return {
        rawSpectrum: spectrumDbApply(args.rawSpectrum, args.applyDb),
        displaySpectrum: spectrumDbApply({ freqs: args.displaySpectrum.freqs, mags: displayMags }, args.applyDb),
    };
}
export function spectrumAveragedMagsResolveForState(state, freqs, mags) {
    const mode = resonanceSpectrumAveragingModeResolve();
    if (mode === "off") {
        delete state.spectrumAveragingState;
        return mags;
    }
    const nextState = spectrumAveragingStateResolve(state, freqs, mode);
    nextState.frames.push(mags.slice());
    nextState.frames = spectrumAveragingFramesTrim(nextState.frames, mode);
    state.spectrumAveragingState = nextState;
    if (mode === "exp-80")
        return spectrumExponentialAverageResolve(nextState.frames, 0.8);
    return spectrumMeanAverageResolve(nextState.frames);
}
export function peakHoldSpectrumResolveForState(state, freqs, dbs) {
    if (!state.__livePreviewActive || !resonancePeakHoldEnabled()) {
        delete state.peakHoldSpectrumState;
        return null;
    }
    const peakDbs = peakHoldDbsResolve(state.peakHoldSpectrumState, freqs, dbs);
    const nextState = { freqs: freqs.slice(), dbs: peakDbs };
    state.peakHoldSpectrumState = nextState;
    return nextState;
}
function spectrumMaybeSmooth(analysis, freqsRaw, magsRaw) {
    const smoothingMode = resonanceSpectrumSmoothingModeResolve();
    if (smoothingMode === "off")
        return magsRaw;
    if (smoothingMode === "triangular-hz") {
        return analysis.smoothSpectrumFast(freqsRaw, magsRaw, resonanceSpectrumSmoothingHzResolve(1));
    }
    return analysis.smoothSpectrumGaussianBins(magsRaw, resonanceSpectrumSmoothingBinsResolve(FFT_SMOOTH_GAUSSIAN_BINS));
}
function spectrumAveragingStateResolve(state, freqs, mode) {
    const current = state.spectrumAveragingState;
    if (spectrumAveragingStateMatches(current, freqs, mode))
        return current;
    return { freqs: freqs.slice(), frames: [], mode };
}
function spectrumAveragingStateMatches(current, freqs, mode) {
    if (!current || current.mode !== mode || !Array.isArray(current.freqs))
        return false;
    if (current.freqs.length !== freqs.length)
        return false;
    return current.freqs.every((freq, index) => freq === freqs[index]);
}
function spectrumAveragingFramesTrim(frames, mode) {
    const limit = SPECTRUM_AVERAGING_LIMITS[mode];
    if (!limit)
        return frames;
    return frames.slice(Math.max(0, frames.length - limit));
}
function spectrumMeanAverageResolve(frames) {
    if (!frames.length)
        return [];
    return frames[0].map((_value, index) => {
        const total = frames.reduce((sum, frame) => sum + Number(frame[index] || 0), 0);
        return total / frames.length;
    });
}
function spectrumExponentialAverageResolve(frames, retainedWeight) {
    if (!frames.length)
        return [];
    let averaged = frames[0].slice();
    frames.slice(1).forEach((frame) => {
        averaged = averaged.map((value, index) => (value * retainedWeight) + (Number(frame[index] || 0) * (1 - retainedWeight)));
    });
    return averaged;
}
function peakHoldDbsResolve(current, freqs, dbs) {
    if (!peakHoldStateMatches(current, freqs))
        return dbs.slice();
    return dbs.map((db, index) => Math.max(Number(db), Number(current.dbs[index])));
}
function peakHoldStateMatches(current, freqs) {
    if (!current || !Array.isArray(current.freqs) || !Array.isArray(current.dbs))
        return false;
    if (current.freqs.length !== freqs.length || current.dbs.length !== freqs.length)
        return false;
    return current.freqs.every((freq, index) => freq === freqs[index]);
}
export async function refreshFftFromState(deps) {
    const analysis = deps.analysisBoundary ?? analysisBoundaryDefault;
    const signal = deps.signalBoundary ?? signalBoundaryDefault;
    const slice = deps.sliceCurrentWave();
    if (!slice) {
        deps.setStatus(resonanceLocalizedMessages.saveIdleStatus);
        return;
    }
    deps.state.qAnalysisWindowMs = resonanceFftInputScopeResolve() === "full-file"
        ? null
        : deps.state.viewRangeMs || { start: 0, end: 1000 * slice.wave.length / slice.sampleRate };
    const fftFactory = window.createFftEngine;
    if (typeof fftFactory !== "function")
        return;
    const spectrumInputs = captureSpectrumInputs(deps.state, deps.fftMaxHz);
    const { directSpectrum, spectrum } = await stageRefreshPreRun({
        wave: slice.wave,
        sampleRate: slice.sampleRate,
        fftMaxHz: deps.fftMaxHz,
        allowTapAveraging: tapAveragingAllowedForState(deps.state),
        signal,
        fftFactory,
    });
    const averagedDisplayMags = spectrumAveragedMagsResolveForState(deps.state, Array.from(spectrum.freqs || [], (v) => Number(v)), Array.from(spectrum.mags || [], (v) => Number(v)));
    const spectra = refreshSpectrumVariantsBuild({
        analysis,
        rawSpectrum: {
            freqs: Array.from(directSpectrum.freqs || [], (v) => Number(v)),
            mags: Array.from(directSpectrum.mags || [], (v) => Number(v)),
        },
        displaySpectrum: {
            freqs: Array.from(spectrum.freqs || [], (v) => Number(v)),
            mags: averagedDisplayMags,
        },
        applyDb: window.FFTPlot.applyDb,
    });
    deps.state.lastSpectrumRaw = spectra.rawSpectrum;
    deps.state.lastSpectrum = spectra.displaySpectrum;
    deps.state.lastPeakHoldSpectrum = peakHoldSpectrumResolveForState(deps.state, Array.from(spectra.displaySpectrum.freqs || [], (v) => Number(v)), Array.from(spectra.displaySpectrum.dbs || spectra.displaySpectrum.mags || [], (v) => Number(v)));
    deps.state.lastSpectrumNoteSelection = await secondarySpectrumBuildFromNoteSelectionRange({
        state: deps.state,
        fftMaxHz: deps.fftMaxHz,
        signal,
        fftFactory,
        analysis,
    });
    const freqs = Array.from(spectra.displaySpectrum.freqs || [], (v) => Number(v));
    const dbs = Array.from(spectra.displaySpectrum.dbs || spectra.displaySpectrum.mags || [], (v) => Number(v));
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
        modeMeta: deps.resolveModeMeta?.() || deps.modeMeta,
        modesDetected,
        freqs,
        dbs,
        measureDecayQ: peakAnalysisRingdownDataBuild,
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
            modeMeta: deps.resolveModeMeta?.() || deps.modeMeta,
            modesDetected: det,
            freqs: freqs2,
            dbs: dbs2,
            measureDecayQ: peakAnalysisRingdownDataBuild,
        });
        if (options?.skipDof) {
            emitArtifactEventFromState(deps.state);
            return;
        }
        deps.solveDofFromState?.();
    };
    rememberSpectrumFrame(deps.state, spectrumInputs);
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
    const withDb = spectrumDbApply({ freqs: freqsRaw, mags: magsSmoothed }, window.FFTPlot.applyDb);
    return {
        freqs: Array.from(withDb.freqs || [], (v) => Number(v)),
        mags: Array.from(withDb.dbs || withDb.mags || [], (v) => Number(v)),
    };
}

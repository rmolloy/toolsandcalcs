// The Resonance Reader's analysis of one recording, apart from its page: the taps it finds, the run of taps
// it selects, the spectrum it detects on, and the peak it picks in each band of the measure mode. The steps
// are the ones the page runs on an imported recording before the luthier changes anything, and the result
// is the page's own mode cards, with the Q the page shows for that measure mode. A page that is not the Resonance Reader, such as a Guitar Lab connector panel, calculates
// through this file.
import { analysisBoundaryDefault } from "./resonate_analysis_boundary.js?rev=b5eb48ee890e";
import { resonanceCaptureStateJsonBuild, resonanceCaptureWaveBlobBuild } from "./resonate_capture_package.js?rev=b5eb48ee890e";
import { measureModeNormalize, modeProfileResolveFromMeasureMode } from "./resonate_mode_config.js?rev=b5eb48ee890e";
import { restoreResonanceSavedStateDocument } from "./resonate_notebook_connect_draft.js?rev=b5eb48ee890e";
import { peakAnalysisRingdownDataBuild } from "./resonate_peak_analysis_panel.js?rev=b5eb48ee890e";
import { primaryRangeAutoSelectFromState } from "./resonate_primary_range_auto.js?rev=b5eb48ee890e";
import { resonanceSaveTitleBuild } from "./resonate_save_title.js?rev=b5eb48ee890e";
import { signalBoundaryDefault } from "./resonate_signal_boundary.js?rev=b5eb48ee890e";
import { spectrumFftMaxHzResolve, spectrumViewRangeResolveFromMeasureMode } from "./resonate_spectrum_config.js?rev=b5eb48ee890e";
import { refreshSpectrumVariantsBuild } from "./resonate_spectrum_variants.js?rev=b5eb48ee890e";
import { stageDetectModesFromSpectrum } from "./resonate_stage_detect.js?rev=b5eb48ee890e";
import { stageRefreshPostApply } from "./resonate_stage_refresh_post.js?rev=b5eb48ee890e";
import { stageRefreshPreRun } from "./resonate_stage_refresh_pre.js?rev=b5eb48ee890e";
import { resonanceSubjectDraftDefaultsFromMeasureMode } from "./resonate_subject_taxonomy.js?rev=b5eb48ee890e";
export const RESONANCE_RECORDING_MEASURE_MODES = ["guitar", "plate_stock", "brace_stock"];
export async function resonanceRecordingAnalyze(args) {
    const measureMode = measureModeNormalize(args.measureMode);
    const durationMs = (args.wave.length / args.sampleRate) * 1000;
    const taps = signalBoundaryDefault.detectTaps(args.wave, args.sampleRate) || [];
    // The page selects from the last sample's time, as its waveform slice gives it.
    const analysedRangeMs = primaryRangeAutoSelectFromState({ sampleRate: args.sampleRate, timeMs: [((args.wave.length - 1) / args.sampleRate) * 1000] }, { tapSegments: taps }) ?? { start: 0, end: durationMs };
    const selected = args.sliceWaveRange({ wave: args.wave, sampleRate: args.sampleRate }, analysedRangeMs.start, analysedRangeMs.end);
    if (!selected)
        throw new Error("The recording has no samples to analyse.");
    const { spectrum } = await stageRefreshPreRun({
        wave: selected.wave,
        sampleRate: selected.sampleRate,
        fftMaxHz: spectrumFftMaxHzResolve(),
        signal: signalBoundaryDefault,
        fftFactory: args.fftFactory,
    });
    const freqs = Array.from(spectrum.freqs || [], (value) => Number(value));
    const detectedOn = refreshSpectrumVariantsBuild({
        analysis: analysisBoundaryDefault,
        rawSpectrum: { freqs, mags: Array.from(spectrum.mags || [], (value) => Number(value)) },
        displaySpectrum: { freqs, mags: Array.from(spectrum.mags || [], (value) => Number(value)) },
        applyDb: args.applyDb,
    }).displaySpectrum;
    const dbs = Array.from(detectedOn.dbs || detectedOn.mags || [], (value) => Number(value));
    const profile = modeProfileResolveFromMeasureMode(measureMode);
    // What the page's state holds for this recording when it builds its cards.
    const state = {
        measureMode,
        currentWave: { wave: args.wave, sampleRate: args.sampleRate, fullLengthMs: durationMs },
        tapSegments: taps,
        viewRangeMs: analysedRangeMs,
        qAnalysisWindowMs: analysedRangeMs,
        lastSpectrum: detectedOn,
    };
    const detected = stageDetectModesFromSpectrum(state, analysisBoundaryDefault, { freqs, dbs });
    stageRefreshPostApply({
        state,
        analysis: analysisBoundaryDefault,
        modeMeta: profile.meta,
        modesDetected: detected,
        freqs,
        dbs,
        measureDecayQ: peakAnalysisRingdownDataBuild,
    });
    const cardOf = (key) => state.lastModeCards.find((card) => card.key === key);
    return {
        measureMode,
        sampleRate: args.sampleRate,
        durationSeconds: args.wave.length / args.sampleRate,
        tapCount: taps.length,
        analysedRangeMs,
        // The spectrum the peaks were detected on, and the frequency range the page shows for this measure mode.
        spectrum: { freqs, dbs },
        spectrumViewRange: spectrumViewRangeResolveFromMeasureMode(measureMode),
        modes: detected.map((mode) => ({
            mode: mode.mode,
            label: profile.meta[mode.mode]?.label ?? mode.mode,
            band: profile.bands[mode.mode] ?? null,
            peakFreq: mode.peakFreq,
            peakDb: mode.peakDb,
            prominenceDb: mode.prominenceDb,
            note: cardOf(mode.mode)?.note ?? null,
            cents: cardOf(mode.mode)?.cents ?? null,
            q: cardOf(mode.mode)?.q ?? null,
            // How the page measured that Q: from each tap's decay for stock, from the peak's width otherwise.
            qMethod: cardOf(mode.mode)?.qEvidence?.method ?? "spectral",
        })),
        // The page's state for this recording, which its own save code writes from.
        pageState: state,
    };
}
// The Resonance Reader's own save of an analysed recording: the state document and the recording as a WAV,
// written by the code the page saves with, and the entry title and kind of subject the page's save offers.
// The plot image, the third file of the page's save, is drawn by whoever shows the graph.
export function resonanceRecordingSaveBuild(args) {
    const state = { ...args.analysis.pageState, recordingLabel: args.recordingLabel };
    return {
        stateJson: JSON.stringify(resonanceCaptureStateJsonBuild({
            toolVersion: args.toolVersion,
            savedAtIso: args.savedAtIso,
            recordingLabel: args.recordingLabel,
            state,
        }), null, 2),
        wavBlob: resonanceCaptureWaveBlobBuild(state),
        title: resonanceSaveTitleBuild(args.analysis.measureMode),
        newSubjectDefaults: resonanceSubjectDraftDefaultsFromMeasureMode(args.analysis.measureMode),
    };
}
// A saved recording read back by the page's own restore: the recording, what it was called, the measure
// mode it was read in, and the frequency the save holds for each mode, for a caller to analyse again.
// Null when the document is not a Resonance Reader save or holds no recording.
export function resonanceRecordingFromSave(document) {
    const state = {};
    if (!restoreResonanceSavedStateDocument(state, document) || !state.currentWave?.wave)
        return null;
    return {
        wave: state.currentWave.wave,
        sampleRate: Number(state.currentWave.sampleRate),
        measureMode: String(state.measureMode || ""),
        recordingLabel: String(state.recordingLabel || ""),
        savedModes: (state.lastModeCards || [])
            .filter((card) => Number.isFinite(card?.freq))
            .map((card) => ({ mode: String(card.key), label: String(card.label ?? card.key), peakFreq: Number(card.freq) })),
    };
}

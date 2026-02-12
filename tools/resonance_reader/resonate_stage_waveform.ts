import { detectTaps } from "./resonate_transient_detection.js";

type WaveformStageDeps = {
  state: Record<string, any>;
};

type PipelineEventEmit = (
  eventType: string,
  runId: string,
  payload: Record<string, unknown>,
  stageId?: string,
) => void;

function waveformSliceBuildFromState(state: Record<string, any>) {
  const src = state?.currentWave;
  if (!src) return null;
  const FFTWaveform = (window as any).FFTWaveform;
  if (typeof FFTWaveform?.sliceWaveRange !== "function") return null;
  const sampleRate = src.sampleRate;
  const wave = src.wave || src.samples;
  if (!wave || !Number.isFinite(sampleRate)) return null;
  const endBySamples = wave.length ? (wave.length / sampleRate) * 1000 : 0;
  const end = src.fullLengthMs || (src.timeMs?.[src.timeMs.length - 1]) || endBySamples;
  if (!Number.isFinite(end) || end <= 0) return null;
  return FFTWaveform.sliceWaveRange({ wave, sampleRate }, 0, end);
}

function waveformTapSegmentsBuild(slice: any, sampleRate: number) {
  if (!slice?.wave || !Number.isFinite(sampleRate)) return [];
  try {
    return detectTaps(slice.wave, sampleRate) || [];
  } catch (err) {
    console.warn("[Resonance Reader] waveform tap detect failed", err);
    return [];
  }
}

export function waveformStageRun(
  runId: string,
  emitEvent: PipelineEventEmit,
  deps: WaveformStageDeps,
) {
  emitEvent("stage.started", runId, { stage: "waveform" }, "waveform");
  const slice = waveformSliceBuildFromState(deps.state);
  if (!slice) {
    emitEvent("stage.completed", runId, { stage: "waveform", skipped: true }, "waveform");
    return;
  }
  const sampleRate = slice.sampleRate || deps.state?.currentWave?.sampleRate;
  const taps = waveformTapSegmentsBuild(slice, sampleRate);
  deps.state.tapSegments = taps;
  deps.state.lastWaveSlice = slice;
  const waveLen = slice?.wave?.length || 0;
  const endMs = Number.isFinite(sampleRate) && waveLen ? (waveLen / sampleRate) * 1000 : null;
  let maxAbs = 0;
  if (slice?.wave && waveLen) {
    for (let i = 0; i < waveLen; i += 1) {
      const v = Math.abs(Number(slice.wave[i]));
      if (Number.isFinite(v) && v > maxAbs) maxAbs = v;
    }
  }
  deps.state.waveDebug = { sampleRate, waveLen, endMs, maxAbs };
  emitEvent("waveform.ready", runId, { wave: slice }, "waveform");
  emitEvent("stage.completed", runId, { stage: "waveform", tapCount: taps.length }, "waveform");
}

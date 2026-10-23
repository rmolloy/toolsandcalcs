import { createRingdownWorkerClient } from "./resonate_ringdown_worker_client.js";
import { peakAnalysisRingdownDataBuild, peakAnalysisRingdownRequestBuild, peakAnalysisWidthHzResolveFromMode, type PeakAnalysisRingdownData } from "./resonate_peak_analysis_panel.js";
import { resolveQForModeCards } from "./resonate_q_measurement.js";
import { qSettingsResolve } from "./resonate_q_settings.js";
import type { ModeCard } from "./resonate_types.js";

type ProviderOptions = {
  createClient?: typeof createRingdownWorkerClient;
  scheduleRender?: (render: () => void) => void;
};
const spectrumFrameIds = new WeakMap<object, number>();
let nextSpectrumFrameId = 1;

export function installRingdownWorkerProvider(state: Record<string, any>, render: () => void, options: ProviderOptions = {}) {
  let disposed = false;
  let scheduled = false;
  const schedule = options.scheduleRender || ((callback) => requestAnimationFrame(callback));
  const client = (options.createClient || createRingdownWorkerClient)({ onResult: scheduleCompletedFitsRender });
  state.ringdownDataRead = readRingdownForMode;
  return { dispose: () => { disposed = true; client.dispose(); } };

  function scheduleCompletedFitsRender() {
    if (disposed || scheduled) return;
    scheduled = true;
    schedule(() => {
      scheduled = false;
      if (disposed) return;
      state.lastModeCards = resolveQForModeCards(state, state.lastModeCards || [], peakAnalysisRingdownDataBuild);
      render();
    });
  }

  function readRingdownForMode(requestState: Record<string, any>, mode: ModeCard | null): PeakAnalysisRingdownData | null {
    if (disposed || mode?.isPeak === false) return null;
    const request = peakAnalysisRingdownRequestBuild(requestState, mode);
    if (!request) return null;
    client.setContext(currentRingdownContext(state));
    const key = JSON.stringify([request.input.targetFrequencyHz, request.input.selectedStart]);
    const fit = client.readOrQueue(request.wave, request.provenance.sampleRate, key, request.input);
    if (fit.status === "ready") return fit.result ? { result: fit.result, provenance: request.provenance } : null;
    const pending = fit.status === "pending";
    return { result: unavailableRingdownResult(request.provenance.sampleRate, pending ? [] : ["worker_failed"]),
      provenance: request.provenance, ...(pending ? { pending: true } : {}) };
  }
}

function currentRingdownContext(state: Record<string, any>) {
  return JSON.stringify([state.measureMode, state.peakAnalysisSelectedKey, qSettingsResolve(state).method,
    state.qAnalysisWindowMs, state.viewRangeMs, state.tapSegments,
    (state.lastModeCards || []).map(ringdownCardInputs),
    spectrumFrameIdentity(state.lastSpectrum), spectrumFrameIdentity(state.lastSpectrumRaw)]);
}

function ringdownCardInputs(card: ModeCard) {
  return [card.key, card.freq, card.isPeak, peakAnalysisWidthHzResolveFromMode(card)];
}

function spectrumFrameIdentity(frame: unknown): number {
  if (!frame || typeof frame !== "object") return 0;
  if (!spectrumFrameIds.has(frame)) spectrumFrameIds.set(frame, nextSpectrumFrameId++);
  return spectrumFrameIds.get(frame)!;
}

function unavailableRingdownResult(sampleRate: number, flags: string[]): PeakAnalysisRingdownData["result"] {
  return { f0: null, tau: null, Q: null, deltaF: null, envelopeR2: null, slope: null,
    flags, envelope: [], sampleRate, attackSkipMs: 40, smoothWindowMs: 5 };
}

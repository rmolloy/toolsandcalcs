import type { ModeDetection } from "./resonate_mode_detection.js";

type ModeKey = string;
type OverrideMap = Record<ModeKey, number>;

export function modeOverrideStateGetOrInit(state: Record<string, any>) {
  return (state.modePeakOverrides || (state.modePeakOverrides = {})) as OverrideMap;
}

export function modeOverrideStateSet(
  state: Record<string, any>,
  modeKey: ModeKey,
  freqHz: number,
) {
  const map = modeOverrideStateGetOrInit(state);
  map[modeKey] = freqHz;
}

export function modeOverrideStateReset(
  state: Record<string, any>,
  modeKey: ModeKey,
) {
  const map = modeOverrideStateGetOrInit(state);
  delete map[modeKey];
}

export function modeOverrideStateApplyToModes(
  modes: ModeDetection[],
  freqs: number[],
  dbs: number[],
  overrides: OverrideMap,
) {
  return modes.map((mode) => {
    const overrideHz = overrides[mode.mode as ModeKey];
    if (!Number.isFinite(overrideHz)) return mode;
    const idx = nearestSpectrumIndexFromFreq(freqs, overrideHz as number);
    if (!Number.isFinite(idx)) return mode;
    return {
      ...mode,
      peakFreq: freqs[idx as number],
      peakDb: dbs[idx as number],
      peakIdx: idx as number,
    };
  });
}

function nearestSpectrumIndexFromFreq(freqs: number[], targetHz: number) {
  if (!freqs.length || !Number.isFinite(targetHz)) return null;
  let bestIdx = 0;
  for (let i = 1; i < freqs.length; i += 1) {
    if (Math.abs(freqs[i] - targetHz) < Math.abs(freqs[bestIdx] - targetHz)) bestIdx = i;
  }
  return bestIdx;
}

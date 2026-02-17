/**
 * Energy-series computation helpers (pure math, no DOM/Plotly).
 */

import { ENERGY_DB_FLOOR, clamp01 } from "./state.js";
import { WolfNoteCore } from "./core.js";

type EnergyMode = { id: string; label?: string; peakFreq: number | null; color?: string; isExtra?: boolean };
type EnergySeriesView = {
  t: number[];
  partialShares: Record<string, number[]>;
  bodyShares: Record<string, number[]>;
  partialRaw: Record<string, number[]>;
  bodyRaw: Record<string, number[]>;
  partialNorm: Record<string, number[]>;
  bodyNorm: Record<string, number[]>;
  levelScale: number[];
  bodyModes: EnergyMode[];
  dominanceTime: number | null;
  exchangeDepthDb: number | null;
};

const ENERGY_STRIDE_TARGET = 360;

const { demodulatePartial, modeBandWidth, partialBandWidth, normalizeEnvelope } = WolfNoteCore;

function buildBodyEnvelopes(slice: any, modeList: EnergyMode[]) {
  const bodyEnvs: Record<string, Float64Array> = {};
  modeList.forEach((mode) => {
    bodyEnvs[mode.id] = demodulatePartial(
      slice.wave,
      slice.sampleRate,
      mode.peakFreq as number,
      modeBandWidth(mode.peakFreq as number),
      20,
    );
  });
  return bodyEnvs;
}

function accumulateEnergyShares(
  slice: any,
  fundEnv: Float64Array,
  harm2Env: Float64Array,
  harm3Env: Float64Array,
  bodyEnvs: Record<string, Float64Array>,
  modeList: EnergyMode[],
) {
  const len = fundEnv.length;
  const stride = Math.max(1, Math.ceil(len / ENERGY_STRIDE_TARGET));
  const t: number[] = [];
  const partialRaw: Record<string, number[]> = { f0: [], h2: [], h3: [] };
  const partialShares: Record<string, number[]> = { f0: [], h2: [], h3: [] };
  const bodyRaw: Record<string, number[]> = {};
  const bodyShares: Record<string, number[]> = {};
  modeList.forEach((m) => {
    bodyRaw[m.id] = [];
    bodyShares[m.id] = [];
  });
  const totalRaw: number[] = [];

  for (let i = 0; i < len; i += stride) {
    const f = fundEnv[i] || 0;
    const h2 = harm2Env[i] || 0;
    const h3 = harm3Env[i] || 0;
    const bodyVals: Record<string, number> = {};
    let total = f + h2 + h3;
    modeList.forEach((mode) => {
      const env = bodyEnvs[mode.id];
      const val = env ? (env[i] || 0) : 0;
      bodyVals[mode.id] = val;
      total += val;
    });
    total = Math.max(1e-9, total);
    t.push(i / slice.sampleRate);
    partialRaw.f0.push(f);
    partialRaw.h2.push(h2);
    partialRaw.h3.push(h3);
    partialShares.f0.push(f / total);
    partialShares.h2.push(h2 / total);
    partialShares.h3.push(h3 / total);
    modeList.forEach((mode) => {
      const val = bodyVals[mode.id] || 0;
      bodyRaw[mode.id].push(val);
      bodyShares[mode.id].push(val / total);
    });
    totalRaw.push(total);
  }

  return { t, partialRaw, partialShares, bodyRaw, bodyShares, totalRaw };
}

function normalizeEnergyLevels(
  partialRaw: Record<string, number[]>,
  bodyRaw: Record<string, number[]>,
  modeList: EnergyMode[],
) {
  const partialNorm: Record<string, number[]> = {
    f0: normalizeEnvelope(partialRaw.f0),
    h2: normalizeEnvelope(partialRaw.h2),
    h3: normalizeEnvelope(partialRaw.h3),
  };
  const bodyNorm: Record<string, number[]> = {};
  modeList.forEach((mode) => {
    bodyNorm[mode.id] = normalizeEnvelope(bodyRaw[mode.id] || []);
  });
  return { partialNorm, bodyNorm };
}

function computeLevelScale(totalRaw: number[]): number[] {
  const maxTotal = Math.max(...totalRaw, 1e-9);
  return totalRaw.map((val) => {
    const db = 20 * Math.log10(val / maxTotal);
    if (!Number.isFinite(db)) return 0;
    return clamp01((db - ENERGY_DB_FLOOR) / -ENERGY_DB_FLOOR);
  });
}

function composeEnergySeries(
  modeList: EnergyMode[],
  t: number[],
  partialRaw: Record<string, number[]>,
  partialShares: Record<string, number[]>,
  bodyRaw: Record<string, number[]>,
  bodyShares: Record<string, number[]>,
  totalRaw: number[],
): EnergySeriesView {
  const levelScale = computeLevelScale(totalRaw);
  const { partialNorm, bodyNorm } = normalizeEnergyLevels(partialRaw, bodyRaw, modeList);
  return {
    t,
    partialShares,
    bodyShares,
    partialRaw,
    bodyRaw,
    partialNorm,
    bodyNorm,
    levelScale,
    bodyModes: modeList,
    dominanceTime: null,
    exchangeDepthDb: null,
  };
}

export function computeEnergySeries(
  slice: any,
  f0: number | null,
  modes: any[],
): EnergySeriesView | null {
  if (!slice || !Number.isFinite(f0)) return null;
  const modeList: EnergyMode[] = (modes || []).filter((m: any) => Number.isFinite(m?.peakFreq));
  const fundEnv = demodulatePartial(slice.wave, slice.sampleRate, f0 as number, partialBandWidth("f0", f0 as number), 20);
  const harm2Env = demodulatePartial(slice.wave, slice.sampleRate, (f0 as number) * 2, partialBandWidth("h2", (f0 as number) * 2), 20);
  const harm3Env = demodulatePartial(slice.wave, slice.sampleRate, (f0 as number) * 3, partialBandWidth("h3", (f0 as number) * 3), 20);

  const bodyEnvs = buildBodyEnvelopes(slice, modeList);
  const {
    t, partialRaw, partialShares, bodyRaw, bodyShares, totalRaw,
  } = accumulateEnergyShares(slice, fundEnv, harm2Env, harm3Env, bodyEnvs, modeList);

  return composeEnergySeries(modeList, t, partialRaw, partialShares, bodyRaw, bodyShares, totalRaw);
}

if (typeof window !== "undefined") {
  (window as any).computeEnergySeries = computeEnergySeries;
}

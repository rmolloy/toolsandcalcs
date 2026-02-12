import { measureModeNormalize, modeProfileResolveFromMeasureMode } from "./resonate_mode_config.js";

type MockRenderDeps = {
  renderSpectrum: (payload: { freqs: number[]; mags: number[]; overlay?: number[]; modes?: any[] }) => void;
  renderModes: (modes: any[]) => void;
};

type ModeCard = {
  key: string;
  label: string;
  freq: number | null;
  note: string | null;
  cents: number | null;
  q: number | null;
  wolfRisk: "None" | "Low" | "Med" | "High" | null;
  deltaHz?: number | null;
  targetHz?: number | null;
};

export function renderMock(deps: MockRenderDeps) {
  const measureMode = measureModeNormalize((window as any).FFTState?.measureMode);
  const mockModes = mockModesBuildFromMeasureMode(measureMode);
  deps.renderModes(mockModes);
  const freqs: number[] = [];
  const mags: number[] = [];
  const peaks = mockModes
    .map((mode) => mode.freq)
    .filter((freq): freq is number => Number.isFinite(freq));
  for (let f = 50; f <= 400; f += 2) {
    freqs.push(f);
    const p0 = Math.exp(-Math.abs(f - (peaks[0] ?? 83)) / 18) * 14;
    const p1 = Math.exp(-Math.abs(f - (peaks[1] ?? 196)) / 12) * 22;
    const p2 = Math.exp(-Math.abs(f - (peaks[2] ?? 232)) / 10) * 18;
    const noise = Math.sin(f / 6) * 0.6;
    mags.push(-50 + p0 + p1 + p2 + noise);
  }
  const overlay = mags.map((m, i) => m + (Math.sin(i / 30) * 4.5));
  const mockDetections = mockModes.map((m) => {
    const f0 = Number.isFinite(m.freq) ? (m.freq as number) : null;
    if (!Number.isFinite(f0)) return { mode: m.key, peakFreq: null, peakDb: null, peakIdx: null, prominenceDb: null };
    let bestIdx = 0;
    for (let i = 1; i < freqs.length; i += 1) {
      if (Math.abs(freqs[i] - f0) < Math.abs(freqs[bestIdx] - f0)) bestIdx = i;
    }
    return { mode: m.key, peakFreq: f0, peakDb: mags[bestIdx] ?? null, peakIdx: bestIdx, prominenceDb: 10 };
  });
  deps.renderSpectrum({ freqs, mags, overlay, modes: mockDetections });
}

function mockModesBuildFromMeasureMode(measureMode: "guitar" | "top" | "back"): ModeCard[] {
  const profile = modeProfileResolveFromMeasureMode(measureMode);
  const keys = Object.keys(profile.meta);
  const freqs = mockModeFrequenciesForMeasureMode(measureMode);
  return keys.map((key, idx) => mockModeBuildFromKeyAndFreq(key, profile.meta[key]?.label || key, freqs[idx] ?? null));
}

function mockModeFrequenciesForMeasureMode(measureMode: "guitar" | "top" | "back") {
  if (measureMode === "top") return [182.0, 278.0, 372.0];
  if (measureMode === "back") return [196.0, 294.0, 386.0];
  return [83.4, 196.5, 231.5];
}

function mockModeBuildFromKeyAndFreq(key: string, label: string, freq: number | null): ModeCard {
  return {
    key,
    label,
    freq,
    note: null,
    cents: null,
    q: 90,
    wolfRisk: "Low",
    deltaHz: null,
    targetHz: null,
  };
}

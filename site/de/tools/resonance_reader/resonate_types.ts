export type PolymaxCandidate = {
  freqHz: number;
  zeta: number;
  orderCount: number;
  stability: number;
};

export type ModeCard = {
  key: string;
  kind?: "built-in" | "custom";
  label: string;
  freq: number | null;
  isPeak?: boolean | null;
  note: string | null;
  cents: number | null;
  q: number | null;
  qEvidence?: {
    method: "decay";
    aggregation: "median" | "max" | "p75" | "selected_tap";
    spectralQ: number | null;
    pending?: boolean;
    taps: Array<{ tapIndex: number; q: number | null; flags: string[]; pending?: boolean }>;
  };
  wolfRisk: "None" | "Low" | "Med" | "High" | null;
  deltaHz?: number | null;
  targetHz?: number | null;
  peakOverrideHz?: number | null;
};

export type SpectrumPayload = {
  freqs: number[];
  mags: number[];
  overlay?: number[];
  modes?: any[];
  secondarySpectrum?: { freqs: number[]; mags: number[] } | null;
  peakHoldSpectrum?: { freqs: number[]; mags: number[] } | null;
  takeOverlays?: Array<{ id: string; label: string; freqs: number[]; mags: number[]; visible: boolean }>;
  polymaxCandidates?: PolymaxCandidate[];
};

export type Spectrum = { freqs: number[]; dbs: number[] };
export type ModeBand = { low: number; high: number };
export type ModeBands = Record<string, ModeBand>;
export type ModeResult = {
  mode: string;
  peakFreq: number | null;
  peakDb: number | null;
  peakIdx: number | null;
  prominenceDb: number | null;
};
export type EnergySeries = {
  t?: number[];
  partialShares?: Record<string, number[]>;
  partialRaw?: Record<string, number[]>;
  partialNorm?: Record<string, number[]>;
  bodyShares?: Record<string, number[]>;
  bodyRaw?: Record<string, number[]>;
  bodyNorm?: Record<string, number[]>;
};
export type PartialEntry = { key: string; label: string; freq: number };
export type ModeEntry = { id: string; peakFreq: number | null; q?: number | null; source?: string | null };
export type DriverState = "wolf" | "sink" | "normal";

export type BiquadCoeffs = { b0: number; b1: number; b2: number; a1: number; a2: number };
export type BiquadState = { z1: number; z2: number };
export type PeakRefinement = { freq: number; y: number; delta: number };
export type RegressionResult = { slope: number; intercept: number; r2: number };
export type LateStats = { mean: number; cv: number; stable: boolean };
export type CouplingTier = "strong" | "possible" | "none";
export type ConfidenceTier = "Low" | "Medium" | "High";
export type ModeCandidate = {
  mode: ModeEntry;
  cents: number;
  centsAbs: number;
  tier: CouplingTier;
  overlap: number;
  late: LateStats;
  slopeIndependent: boolean;
};
export type FitTwoModeResult = {
  deltaF: number;
  wobbleDepth: number;
  alpha: number;
  r2: number;
  residualVar: number;
  wolfScore: number;
  category: "None" | "Mild" | "Moderate" | "Strong" | "Severe";
};
export type PartialInstabilityEntry = {
  unstable: boolean;
  beatRate: number | null;
  wobbleDepth: number | null;
  stability: number | null;
};
export type DriverEntry = {
  partial: PartialEntry;
  driver: ModeCandidate | null;
  nearest: ModeCandidate | null;
  confidence: ConfidenceTier;
  dominanceTime: number | null;
  exchangeDepthDb: number | null;
  sharedBand: boolean;
  slopeIndependent: boolean;
  instability: boolean;
  state: DriverState;
  sinkFlavor: string | null;
  bodySlope: number | null;
  partialSlope: number | null;
};

export type PeakCandidate = { idx: number; db: number; prominence: number };

export type PreparedEnvelope = { env: number[]; tArr: number[] };
export type DecayFit = { alpha: number; A0: number; detrended: number[] };
export type WobbleWindow = { env: number[]; tArr: number[]; detrended: number[]; peakDet: number };
export type FitScore = { r2: number; residualVar: number };

export type WolfRisk = "None" | "Mild" | "Moderate" | "High";

export type InstabilityInput = {
  beatRate?: number | null;
  wobbleDepth?: number | null;
} | null;

export type WolfNoteCoreApi = {
  analyzeModes: (spectrum: Spectrum, bands: ModeBands) => ModeResult[];
  bandOverlapRatio: (f1: number, bw1: number, f2: number, bw2: number) => number;
  buildPartialDriverMap: (
    partials: PartialEntry[],
    modes: ModeEntry[],
    energy: EnergySeries,
    partialInstability?: Record<string, PartialInstabilityEntry>,
  ) => DriverEntry[];
  centsBetween: (freq: number, ref: number) => number;
  demodulatePartial: (
    wave: ArrayLike<number>,
    sampleRate: number,
    freq: number,
    bwHz: number,
    envLpHz: number,
  ) => Float64Array;
  estimateQFromDb: (freqs: number[], dbs: number[], peak: { freq: number; db: number }) => number | null;
  classifyWolfRisk: (score: number | null) => WolfRisk;
  computePartialInstabilityMap: (energy: EnergySeries) => Record<string, PartialInstabilityEntry>;
  confidenceFrom: (
    centsAbs: number | null,
    lateStable: boolean,
    overlapRatio: number | null,
    source: string | null,
  ) => ConfidenceTier;
  couplingTier: (centsAbs: number) => CouplingTier;
  fitTwoModeEnvelopeAndComputeWolfMetrics: (
    envelope: number[],
    dt: number,
    opts?: { attackSkipMs?: number; maxAnalysisMs?: number },
  ) => FitTwoModeResult;
  fitTwoMode: (envelope: number[], dt: number, opts?: { attackSkipMs?: number; maxAnalysisMs?: number }) => FitTwoModeResult;
  isUnstableDecay: (result: InstabilityInput) => boolean;
  lateTimeSlope: (env: number[], t: number[]) => number | null;
  lateTimeStats: (env: number[], t: number[]) => LateStats;
  lateWindowIndices: (t: number[]) => { startIdx: number; endIdx: number };
  modeBandWidth: (freq: number) => number;
  normalizeEnvelope: (env: ArrayLike<number>) => number[];
  partialBandWidth: (partialKey: string, freq: number) => number;
  pickNearestCandidate: (drivers: DriverEntry[]) => DriverEntry | null;
  pickPrimaryDriver: (drivers: DriverEntry[]) => DriverEntry | null;
  refineParabolicPeak: (freqs: number[], ys: number[], idx: number) => PeakRefinement | null;
};

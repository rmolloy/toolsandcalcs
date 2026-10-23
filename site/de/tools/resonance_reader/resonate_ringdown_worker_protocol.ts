import type { RingdownTap } from "./resonate_ringdown_noise.js";
import type { analyzeAdaptiveRingdown } from "./resonate_ringdown_adaptive.js";

export type RingdownFitInput = {
  method: "adaptive" | "legacy";
  targetFrequencyHz: number;
  spectralWidthHz: number | null;
  neighborFrequencies: number[];
  taps: RingdownTap[];
  selectedStart: number;
  onsetSec: number;
  startSample: number;
  sampleCount: number;
  spectrum?: { freqs?: number[]; dbs?: number[]; mags?: number[] } | null;
};

export type RingdownFitResult = {
  f0: number | null;
  tau: number | null;
  Q: number | null;
  deltaF: number | null;
  envelopeR2: number | null;
  slope: number | null;
  flags: string[];
  envelope: number[];
  response?: number[];
  timeAxis?: number[];
  sampleRate: number;
  attackSkipMs: number;
  smoothWindowMs: number;
  fitStartSec?: number | null;
  fitEndSec?: number | null;
  fitMethod?: "envelope" | "damped_sinusoid";
  isolationBandwidthHz?: number | null;
  evidence?: ReturnType<typeof analyzeAdaptiveRingdown>["evidence"];
};

export type RingdownWorkerRequest =
  | { type: "dataset"; datasetId: number; wave: ArrayLike<number>; sampleRate: number }
  | { type: "fit"; datasetId: number; id: number; key: string; input: RingdownFitInput };

export type RingdownWorkerResponse = {
  type: "result";
  datasetId: number;
  id: number;
  key: string;
  result: RingdownFitResult | null;
  error?: string;
};

export type RingdownReadResult =
  | { status: "pending" }
  | { status: "ready"; result: RingdownFitResult | null }
  | { status: "failed"; error: string };

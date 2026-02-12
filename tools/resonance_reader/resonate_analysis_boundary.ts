import { analyzeModes, smoothSpectrumFast, type ModeDetection } from "./resonate_mode_detection.js";
import {
  computeSeverity,
  estimateQFromDb,
  noteAndCentsFromFreq,
  wolfRiskFromSeverity,
} from "./resonate_mode_metrics.js";

export type AnalysisBoundary = {
  smoothSpectrumFast: (freqs: number[], mags: number[], smoothHz: number) => number[];
  analyzeModes: (spectrum: { freqs: number[]; dbs: number[] }) => ModeDetection[];
  noteAndCentsFromFreq: (freq: number | null) => { note: string | null; cents: number | null };
  estimateQFromDb: (freqs: number[], dbs: number[], peak: { freq: number; db: number }) => number | null;
  computeSeverity: (prominence: number, centsAbs: number) => "Low" | "Medium" | "High";
  wolfRiskFromSeverity: (sev: "Low" | "Medium" | "High" | null) => "None" | "Low" | "Med" | "High" | null;
};

export const analysisBoundaryDefault: AnalysisBoundary = {
  smoothSpectrumFast,
  analyzeModes,
  noteAndCentsFromFreq,
  estimateQFromDb,
  computeSeverity,
  wolfRiskFromSeverity,
};

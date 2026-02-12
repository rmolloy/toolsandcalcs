export type ModeCard = {
  key: string;
  kind?: "built-in" | "custom";
  label: string;
  freq: number | null;
  note: string | null;
  cents: number | null;
  q: number | null;
  wolfRisk: "None" | "Low" | "Med" | "High" | null;
  deltaHz?: number | null;
  targetHz?: number | null;
  peakOverrideHz?: number | null;
};

export type SpectrumPayload = { freqs: number[]; mags: number[]; overlay?: number[]; modes?: any[] };

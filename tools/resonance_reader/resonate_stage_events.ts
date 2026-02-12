type StageEventFlag = {
  name: string;
  owner: string;
  defaultValue: boolean;
  rolloutMode: "off" | "on" | "percentage" | "cohort" | "input-class";
  removalCondition: string;
  removalTask: string;
};

type StageEventSummary = {
  hasWave: boolean;
  tapCount: number;
  spectrumPoints: number;
};

export const RESONATE_STAGE_EVENT_FLAG: StageEventFlag = {
  name: "resonate_stage_event",
  owner: "resonate",
  defaultValue: true,
  rolloutMode: "on",
  removalCondition: "after parity is proven",
  removalTask: "remove stage event flag once stage events are default",
};

export function stageEventSummaryBuildFromState(
  state: { currentWave?: any; tapSegments?: any[]; lastSpectrum?: any } | null | undefined,
): StageEventSummary {
  const hasWave = Boolean(state?.currentWave);
  const tapCount = Array.isArray(state?.tapSegments) ? state?.tapSegments.length : 0;
  const freqs = Array.isArray(state?.lastSpectrum?.freqs) ? state?.lastSpectrum?.freqs : [];
  return {
    hasWave,
    tapCount,
    spectrumPoints: freqs.length,
  };
}

if (typeof window !== "undefined") {
  (window as any).ResonateStageEvents = {
    RESONATE_STAGE_EVENT_FLAG,
    stageEventSummaryBuildFromState,
  };
}

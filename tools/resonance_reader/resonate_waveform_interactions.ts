type WaveformInteractionFlag = {
  name: string;
  owner: string;
  defaultValue: boolean;
  rolloutMode: "off" | "on" | "percentage" | "cohort" | "input-class";
  removalCondition: string;
  removalTask: string;
};

export const RESONATE_PLOTLY_WAVE_TOOLS_FLAG: WaveformInteractionFlag = {
  name: "resonate_plotly_wave_tools",
  owner: "resonate",
  defaultValue: false,
  rolloutMode: "off",
  removalCondition: "after parity is proven",
  removalTask: "remove plotly wave tools flag once interaction mode is finalized",
};

export function plotlyWaveToolsEnabledResolve(
  runtimeValue: unknown,
  fallback = RESONATE_PLOTLY_WAVE_TOOLS_FLAG.defaultValue,
) {
  if (typeof runtimeValue === "boolean") return runtimeValue;
  return fallback;
}

if (typeof window !== "undefined") {
  (window as any).ResonateWaveformInteractions = {
    RESONATE_PLOTLY_WAVE_TOOLS_FLAG,
    plotlyWaveToolsEnabledResolve,
  };
}

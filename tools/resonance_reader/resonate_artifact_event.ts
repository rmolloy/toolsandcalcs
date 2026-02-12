type ArtifactEventFlag = {
  name: string;
  owner: string;
  defaultValue: boolean;
  rolloutMode: "off" | "on" | "percentage" | "cohort" | "input-class";
  removalCondition: string;
  removalTask: string;
};

type ArtifactSummary = {
  spectrumPoints: number;
  modeCount: number;
  hasSpectrum: boolean;
};

export const RESONATE_ARTIFACT_EVENT_FLAG: ArtifactEventFlag = {
  name: "resonate_artifact_event",
  owner: "resonate",
  defaultValue: true,
  rolloutMode: "on",
  removalCondition: "after parity is proven",
  removalTask: "remove artifact event flag once event is default",
};

export function artifactSummaryBuildFromState(state: { lastSpectrum?: any; lastModeCards?: any[] } | null | undefined): ArtifactSummary {
  const spectrum = state?.lastSpectrum;
  const freqs = Array.isArray(spectrum?.freqs) ? spectrum.freqs : [];
  const modeCards = Array.isArray(state?.lastModeCards) ? state?.lastModeCards : [];
  return {
    spectrumPoints: freqs.length,
    modeCount: modeCards.length,
    hasSpectrum: freqs.length > 0,
  };
}

if (typeof window !== "undefined") {
  (window as any).ResonateArtifactEvent = {
    RESONATE_ARTIFACT_EVENT_FLAG,
    artifactSummaryBuildFromState,
  };
}

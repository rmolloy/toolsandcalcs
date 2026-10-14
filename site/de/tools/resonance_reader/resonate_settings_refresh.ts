import { resonanceLocalizedMessages } from "./resonate_localized_messages.js";

export type SettingsRefreshDeps = {
  state: Record<string, any>;
  runResonatePipeline: (trigger: string) => Promise<void>;
  setStatus: (text: string) => void;
};

export function settingsPipelineRefresh(deps: SettingsRefreshDeps) {
  if (!deps.state.currentWave) {
    deps.setStatus(resonanceLocalizedMessages.settingsUpdatedStatus);
    return;
  }

  deps.runResonatePipeline("settings")
    .then(() => deps.setStatus(resonanceLocalizedMessages.settingsUpdatedStatus))
    .catch((error) => {
      console.warn("[Resonance Reader] settings refresh failed", error);
      deps.setStatus(resonanceLocalizedMessages.settingsRefreshFailedStatus);
    });
}

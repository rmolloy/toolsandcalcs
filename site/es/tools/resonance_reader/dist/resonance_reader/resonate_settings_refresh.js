import { resonanceLocalizedMessages } from "./resonate_localized_messages.js?rev=ad8911223a7b";
export function settingsPipelineRefresh(deps) {
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

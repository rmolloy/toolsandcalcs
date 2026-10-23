import { resonanceLocalizedMessages } from "./resonate_localized_messages.js?rev=c40b9f2c1b26";
import { rerenderFromCachedSpectrumIfCurrent } from "./resonate_spectrum_cache.js?rev=c40b9f2c1b26";
export function settingsPipelineRefresh(deps) {
    if (!deps.state.currentWave) {
        deps.setStatus(resonanceLocalizedMessages.settingsUpdatedStatus);
        return;
    }
    refreshSettingsFromCurrentSpectrum(deps)
        .then(() => deps.setStatus(resonanceLocalizedMessages.settingsUpdatedStatus))
        .catch((error) => {
        console.warn("[Resonance Reader] settings refresh failed", error);
        deps.setStatus(resonanceLocalizedMessages.settingsRefreshFailedStatus);
    });
}
function refreshSettingsFromCurrentSpectrum(deps) {
    try {
        if (rerenderFromCachedSpectrumIfCurrent(deps.state))
            return Promise.resolve();
        return deps.runResonatePipeline("settings");
    }
    catch (error) {
        return Promise.reject(error);
    }
}

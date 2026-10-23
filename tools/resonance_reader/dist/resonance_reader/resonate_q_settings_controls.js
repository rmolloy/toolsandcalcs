import { qSettingsResolve } from "./resonate_q_settings.js";
import { settingsPipelineRefresh } from "./resonate_settings_refresh.js";
const Q_FIELDS = { method: "settings_q_method", aggregation: "settings_q_aggregation" };
export function qSettingsControlsBind(deps) {
    Object.entries(Q_FIELDS).forEach(([field, id]) => {
        const select = document.getElementById(id);
        select?.addEventListener("change", () => qSettingsSelectionApply(deps, field, select.value));
    });
}
export function qSettingsControlsSync(state) {
    const settings = qSettingsResolve(state);
    Object.entries(Q_FIELDS).forEach(([field, id]) => {
        const select = document.getElementById(id);
        if (select)
            select.value = settings[field];
    });
}
export function qSettingsControlsReset(state) {
    delete state.qSettings;
    qSettingsControlsSync(state);
    qSettingsPersist();
}
function qSettingsSelectionApply(deps, field, value) {
    deps.state.qSettings = qSettingsResolve({ qSettings: { ...qSettingsResolve(deps.state), [field]: value } });
    qSettingsControlsSync(deps.state);
    qSettingsPersist();
    settingsPipelineRefresh(deps);
}
function qSettingsPersist() {
    void window.ResonatePerTabState?.persist?.();
}

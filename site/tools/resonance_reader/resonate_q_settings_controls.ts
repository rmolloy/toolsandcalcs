import { qSettingsResolve, type QSettings } from "./resonate_q_settings.js";
import { settingsPipelineRefresh, type SettingsRefreshDeps } from "./resonate_settings_refresh.js";
import { stockQSettingsAreApplicable } from "./resonate_q_view_policy.js";

const Q_FIELDS = { method: "settings_q_method", aggregation: "settings_q_aggregation" } as const;

export function qSettingsControlsBind(deps: SettingsRefreshDeps): void {
  Object.entries(Q_FIELDS).forEach(([field, id]) => {
    const select = document.getElementById(id) as HTMLSelectElement | null;
    select?.addEventListener("change", () => qSettingsSelectionApply(deps, field as keyof QSettings, select.value));
  });
}

export function qSettingsControlsSync(state: Record<string, any>): void {
  const settings = qSettingsResolve(state);
  Object.entries(Q_FIELDS).forEach(([field, id]) => {
    const select = document.getElementById(id) as HTMLSelectElement | null;
    if (select) select.value = settings[field as keyof QSettings];
    const row = select?.closest<HTMLElement>(".settings-field");
    if (row) row.style.display = stockQSettingsAreApplicable(state) ? "" : "none";
  });
}

export function qSettingsControlsReset(state: Record<string, any>): void {
  delete state.qSettings;
  qSettingsControlsSync(state);
  qSettingsPersist();
}

function qSettingsSelectionApply(deps: SettingsRefreshDeps, field: keyof QSettings, value: string): void {
  deps.state.qSettings = qSettingsResolve({ qSettings: { ...qSettingsResolve(deps.state), [field]: value } });
  qSettingsControlsSync(deps.state);
  qSettingsPersist();
  settingsPipelineRefresh(deps);
}

function qSettingsPersist(): void {
  void (window as any).ResonatePerTabState?.persist?.();
}

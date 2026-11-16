import { demoWaveBuildFromMeasureMode } from "./resonate_demo_wave.js?rev=e0bd2386cdc0";
import { resonanceLocalizedMessages } from "./resonate_localized_messages.js?rev=e0bd2386cdc0";
export async function resonatePipelineRefreshAllFromState(deps) {
    deps.prepareBoundaries?.();
    if (!deps.state.currentWave) {
        deps.state.currentWave = demoWaveBuildFromMeasureMode(deps.state.measureMode, 1500);
    }
    const waveAll = deps.fullWave();
    if (!waveAll) {
        deps.setStatus(resonanceLocalizedMessages.saveIdleStatus);
        return;
    }
    await deps.refreshFft();
}

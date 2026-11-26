import { demoWaveBuildFromMeasureMode } from "./resonate_demo_wave.js?rev=9c88a314891c";
import { resonanceLocalizedMessages } from "./resonate_localized_messages.js?rev=9c88a314891c";
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

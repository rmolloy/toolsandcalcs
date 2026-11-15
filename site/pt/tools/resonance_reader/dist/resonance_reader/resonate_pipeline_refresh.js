import { demoWaveBuildFromMeasureMode } from "./resonate_demo_wave.js?rev=69c2b05b3eb6";
import { resonanceLocalizedMessages } from "./resonate_localized_messages.js?rev=69c2b05b3eb6";
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

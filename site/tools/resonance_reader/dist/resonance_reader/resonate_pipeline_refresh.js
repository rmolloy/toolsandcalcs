import { demoWaveBuildFromMeasureMode } from "./resonate_demo_wave.js?rev=ad8911223a7b";
import { resonanceLocalizedMessages } from "./resonate_localized_messages.js?rev=ad8911223a7b";
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

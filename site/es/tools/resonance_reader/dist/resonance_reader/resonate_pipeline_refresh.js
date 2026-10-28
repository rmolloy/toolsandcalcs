import { demoWaveBuildFromMeasureMode } from "./resonate_demo_wave.js?rev=093b6a20873d";
import { resonanceLocalizedMessages } from "./resonate_localized_messages.js?rev=093b6a20873d";
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

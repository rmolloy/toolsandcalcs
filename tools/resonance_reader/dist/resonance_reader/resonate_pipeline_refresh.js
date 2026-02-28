import { demoWaveBuildFromMeasureMode } from "./resonate_demo_wave.js";
export async function resonatePipelineRefreshAllFromState(deps) {
    deps.prepareBoundaries?.();
    if (!deps.state.currentWave) {
        deps.state.currentWave = demoWaveBuildFromMeasureMode(deps.state.measureMode, 1500);
    }
    const waveAll = deps.fullWave();
    if (!waveAll) {
        deps.setStatus("Load or record to view the waveform.");
        return;
    }
    await deps.refreshFft();
}

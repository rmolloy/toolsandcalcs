export async function resonatePipelineRefreshAllFromState(deps) {
    deps.prepareBoundaries?.();
    if (!deps.state.currentWave) {
        deps.state.currentWave = window.FFTAudio.generateDemoWave(1500);
    }
    const waveAll = deps.fullWave();
    if (!waveAll) {
        deps.setStatus("Load or record to view the waveform.");
        return;
    }
    await deps.refreshFft();
}

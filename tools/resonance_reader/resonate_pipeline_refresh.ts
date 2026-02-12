export async function resonatePipelineRefreshAllFromState(deps: {
  state: Record<string, any>;
  setStatus: (text: string) => void;
  fullWave: () => any;
  refreshFft: () => Promise<void>;
  prepareBoundaries?: () => void;
}) {
  deps.prepareBoundaries?.();
  if (!deps.state.currentWave) {
    deps.state.currentWave = (window as any).FFTAudio.generateDemoWave(1500);
  }
  const waveAll = deps.fullWave();
  if (!waveAll) {
    deps.setStatus("Load or record to view the waveform.");
    return;
  }
  await deps.refreshFft();
}

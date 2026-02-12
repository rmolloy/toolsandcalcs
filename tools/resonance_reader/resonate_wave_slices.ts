export function sliceCurrentWaveFromState(state: Record<string, any>) {
  const src = state.currentWave;
  if (!src) return null;
  if (state.viewRangeMs) {
    return (window as any).FFTWaveform.sliceWaveRange(src, state.viewRangeMs.start, state.viewRangeMs.end);
  }
  const desired = Math.min(5000, src.fullLengthMs || 5000);
  return (window as any).FFTWaveform.sliceWave(src, desired);
}

export function fullWaveFromState(state: Record<string, any>) {
  const src = state.currentWave;
  if (!src) return null;
  const end = src.fullLengthMs || (src.timeMs?.[src.timeMs.length - 1]) || 0;
  return (window as any).FFTWaveform.sliceWaveRange(src, 0, end);
}

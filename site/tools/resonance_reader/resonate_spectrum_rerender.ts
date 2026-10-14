export function rerenderFromLastSpectrumIfPossible(state: Record<string, any>) {
  if (typeof state?.rerenderFromLastSpectrum !== "function") return;
  state.preserveSpectrumRangesOnNextRender = true;
  state.rerenderFromLastSpectrum({ skipDof: true });
}

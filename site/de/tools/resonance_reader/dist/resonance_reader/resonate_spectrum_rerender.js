export function rerenderFromLastSpectrumIfPossible(state) {
    if (typeof state?.rerenderFromLastSpectrum !== "function")
        return;
    state.preserveSpectrumRangesOnNextRender = true;
    state.rerenderFromLastSpectrum({ skipDof: true });
}

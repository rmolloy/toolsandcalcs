export function toneControllerCreateFromWindow(scope) {
    const audio = toneAudioResolveFromScope(scope);
    return {
        toneEnableSet: (enabled) => toneEnableSetOnAudio(audio, enabled),
        toneFrequencySetHz: (freqHz) => toneFrequencySetOnAudio(audio, freqHz),
        toneStop: () => toneStopOnAudio(audio),
    };
}
function toneAudioResolveFromScope(scope) {
    return scope.FFTAudio ?? null;
}
function toneEnableSetOnAudio(audio, enabled) {
    audio?.setToneEnabled?.(enabled);
}
function toneFrequencySetOnAudio(audio, freqHz) {
    if (!Number.isFinite(freqHz))
        return;
    audio?.updateToneFreq?.(freqHz);
}
function toneStopOnAudio(audio) {
    audio?.stopTone?.();
}

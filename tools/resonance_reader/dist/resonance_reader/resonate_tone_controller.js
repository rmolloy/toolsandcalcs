export function toneControllerCreateFromWindow(scope) {
    return {
        toneEnableSet: (enabled) => toneEnableSetOnAudio(toneAudioResolveFromScope(scope), enabled),
        toneFrequencySetHz: (freqHz) => toneFrequencySetOnAudio(toneAudioResolveFromScope(scope), freqHz),
        toneStop: () => toneStopOnAudio(toneAudioResolveFromScope(scope)),
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

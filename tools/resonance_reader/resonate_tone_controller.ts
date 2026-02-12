type FftAudioLike = {
  setToneEnabled?: (enabled: boolean) => void;
  updateToneFreq?: (freq: number) => void;
  stopTone?: () => void;
};

export type ToneController = {
  toneEnableSet: (enabled: boolean) => void;
  toneFrequencySetHz: (freqHz: number) => void;
  toneStop: () => void;
};

export function toneControllerCreateFromWindow(scope: Window & typeof globalThis): ToneController {
  const audio = toneAudioResolveFromScope(scope);
  return {
    toneEnableSet: (enabled: boolean) => toneEnableSetOnAudio(audio, enabled),
    toneFrequencySetHz: (freqHz: number) => toneFrequencySetOnAudio(audio, freqHz),
    toneStop: () => toneStopOnAudio(audio),
  };
}

function toneAudioResolveFromScope(scope: Window & typeof globalThis): FftAudioLike | null {
  return (scope as any).FFTAudio ?? null;
}

function toneEnableSetOnAudio(audio: FftAudioLike | null, enabled: boolean) {
  audio?.setToneEnabled?.(enabled);
}

function toneFrequencySetOnAudio(audio: FftAudioLike | null, freqHz: number) {
  if (!Number.isFinite(freqHz)) return;
  audio?.updateToneFreq?.(freqHz);
}

function toneStopOnAudio(audio: FftAudioLike | null) {
  audio?.stopTone?.();
}

(() => {
  interface FFTWave {
    wave: Float64Array | number[];
    timeMs: number[];
    sampleRate: number;
    fullLengthMs?: number;
  }

  interface FFTDebug {
    useStft: boolean;
    stftSize: number | "auto" | string;
    stftOverlap: number;
    stftMaxFreq: number;
    flipStftAxes: boolean;
  }

  interface FFTStateShape {
    annotations: unknown[];
    fftHoverShapeApplied: boolean;
    waveRelayoutApplied: boolean;
    viewRangeMs: { start: number; end: number } | null;
    currentWave: FFTWave | null;
    currentBuffer: AudioBuffer | null;
    currentSampleRate: number | null;
    mediaRecorder: MediaRecorder | null;
    recordedChunks: Blob[];
    lastSpectrum: unknown;
    playbackCtx: AudioContext | null;
    playbackSource: AudioBufferSourceNode | null;
    playbackActive: boolean;
    recordingActive: boolean;
    useNoteAxis: boolean;
    fftDefaultRanges: unknown;
    resetZoomBound: boolean;
    ringdown: unknown;
    lastSpectrogram: unknown;
    debug: FFTDebug;
    noteSlices: unknown[];
  }

  const state: FFTStateShape = {
    annotations: [],
    fftHoverShapeApplied: false,
    waveRelayoutApplied: false,
    viewRangeMs: null,
    currentWave: null,
    currentBuffer: null,
    currentSampleRate: null,
    mediaRecorder: null,
    recordedChunks: [],
    lastSpectrum: null,
    playbackCtx: null,
    playbackSource: null,
    playbackActive: false,
    recordingActive: false,
    useNoteAxis: false,
    fftDefaultRanges: null,
    resetZoomBound: false,
    ringdown: null,
    lastSpectrogram: null,
    debug: {
      useStft: false,
      stftSize: "auto",
      stftOverlap: 0.5,
      stftMaxFreq: 1000,
      flipStftAxes: true,
    },
    noteSlices: [],
  };

  const scope = (typeof window !== "undefined" ? window : globalThis) as typeof globalThis & {
    FFTState?: FFTStateShape;
  };

  scope.FFTState = state;
})();

// @ts-nocheck
(() => {
  const state = {
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
    },
    noteSlices: [],
  };

  window.FFTState = state;
})();

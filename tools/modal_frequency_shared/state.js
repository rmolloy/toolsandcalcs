"use strict";
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
            stftOverlap: 0.5,
            stftMaxFreq: 1000,
            flipStftAxes: true,
        },
        noteSlices: [],
    };
    const scope = (typeof window !== "undefined" ? window : globalThis);
    scope.FFTState = state;
})();

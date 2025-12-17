(() => {
  type SamplesInput = Float32Array | number[] | ReadonlyArray<number>;

  interface SegmentOptions {
    minSilenceMs?: number;
    thresholdDb?: number;
    windowMs?: number;
    minDurationMs?: number;
    minRelativeRms?: number;
  }

  interface SegmentedNote {
    id: number;
    samples: Float32Array;
    sampleRate: number;
    startIndex: number;
    endIndex: number;
  }

  function rms(buffer: ArrayLike<number>): number {
    let acc = 0;
    for (let i = 0; i < buffer.length; i += 1) acc += buffer[i] * buffer[i];
    return buffer.length ? Math.sqrt(acc / buffer.length) : 0;
  }

  function toBuffer(samples: SamplesInput): Float32Array {
    return "subarray" in samples ? samples : Float32Array.from(samples);
  }

  function segmentNotesFromBuffer(
    samples: SamplesInput,
    sampleRate: number,
    opts: SegmentOptions = {},
  ): SegmentedNote[] {
    if (!samples || samples.length === 0 || !sampleRate) return [];
    const buf = toBuffer(samples);
    const minSilenceMs = opts.minSilenceMs ?? 180;
    const thresholdDb = opts.thresholdDb ?? -40;
    const windowMs = opts.windowMs ?? 20;
    const minDurationMs = opts.minDurationMs ?? 0;
    const silenceSamples = Math.round((minSilenceMs / 1000) * sampleRate);
    const win = Math.max(8, Math.round((windowMs / 1000) * sampleRate));
    const hop = Math.max(4, Math.round(win / 2));
    const threshLin = 10 ** (thresholdDb / 20);
    const minSamples = Math.round((minDurationMs / 1000) * sampleRate);

    const markers: { start: number; end: number }[] = [];
    let inNote = false;
    let noteStart = 0;
    let silenceRun = 0;
    for (let start = 0; start < buf.length; start += hop) {
      const end = Math.min(buf.length, start + win);
      const slice = buf.subarray(start, end);
      const val = rms(slice);
      if (val >= threshLin) {
        if (!inNote) {
          inNote = true;
          noteStart = start;
        }
        silenceRun = 0;
      } else if (inNote) {
        silenceRun += end - start;
        if (silenceRun >= silenceSamples) {
          inNote = false;
          const noteEnd = Math.max(noteStart + hop, start);
          markers.push({ start: noteStart, end: noteEnd });
          silenceRun = 0;
        }
      }
    }
    if (inNote) markers.push({ start: noteStart, end: buf.length });

    const notes = markers
      .filter(({ start, end }) => (end - start) >= minSamples)
      .map(({ start, end }, idx): SegmentedNote => ({
        id: idx + 1,
        samples: buf.slice(start, end),
        sampleRate,
        startIndex: start,
        endIndex: end,
      }));

    const rmsValues = notes.map((n) => rms(n.samples));
    const maxRms = rmsValues.reduce((m, v) => Math.max(m, v), 0);
    const minRel = opts.minRelativeRms ?? 0.1;
    return notes.filter((n, i) => rmsValues[i] >= maxRms * minRel);
  }

  type ModalSegmentationApi = {
    segmentNotesFromBuffer: typeof segmentNotesFromBuffer;
  };

  const scope = (typeof window !== "undefined" ? window : globalThis) as typeof globalThis & {
    ModalSegmentation?: ModalSegmentationApi;
  };

  scope.ModalSegmentation = {
    segmentNotesFromBuffer,
  };
})();

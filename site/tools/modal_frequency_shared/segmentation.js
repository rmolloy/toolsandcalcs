"use strict";
(() => {
    function rms(buffer) {
        let acc = 0;
        for (let i = 0; i < buffer.length; i += 1)
            acc += buffer[i] * buffer[i];
        return buffer.length ? Math.sqrt(acc / buffer.length) : 0;
    }
    function toBuffer(samples) {
        return "subarray" in samples ? samples : Float32Array.from(samples);
    }
    function segmentNotesFromBuffer(samples, sampleRate, opts = {}) {
        var _a, _b, _c, _d, _e;
        if (!samples || samples.length === 0 || !sampleRate)
            return [];
        const buf = toBuffer(samples);
        const minSilenceMs = (_a = opts.minSilenceMs) !== null && _a !== void 0 ? _a : 180;
        const thresholdDb = (_b = opts.thresholdDb) !== null && _b !== void 0 ? _b : -40;
        const windowMs = (_c = opts.windowMs) !== null && _c !== void 0 ? _c : 20;
        const minDurationMs = (_d = opts.minDurationMs) !== null && _d !== void 0 ? _d : 0;
        const silenceSamples = Math.round((minSilenceMs / 1000) * sampleRate);
        const win = Math.max(8, Math.round((windowMs / 1000) * sampleRate));
        const hop = Math.max(4, Math.round(win / 2));
        const threshLin = 10 ** (thresholdDb / 20);
        const minSamples = Math.round((minDurationMs / 1000) * sampleRate);
        const markers = [];
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
            }
            else if (inNote) {
                silenceRun += end - start;
                if (silenceRun >= silenceSamples) {
                    inNote = false;
                    const noteEnd = Math.max(noteStart + hop, start);
                    markers.push({ start: noteStart, end: noteEnd });
                    silenceRun = 0;
                }
            }
        }
        if (inNote)
            markers.push({ start: noteStart, end: buf.length });
        const notes = markers
            .filter(({ start, end }) => (end - start) >= minSamples)
            .map(({ start, end }, idx) => ({
            id: idx + 1,
            samples: buf.slice(start, end),
            sampleRate,
            startIndex: start,
            endIndex: end,
        }));
        const rmsValues = notes.map((n) => rms(n.samples));
        const maxRms = rmsValues.reduce((m, v) => Math.max(m, v), 0);
        const minRel = (_e = opts.minRelativeRms) !== null && _e !== void 0 ? _e : 0.1;
        return notes.filter((n, i) => rmsValues[i] >= maxRms * minRel);
    }
    const scope = (typeof window !== "undefined" ? window : globalThis);
    scope.ModalSegmentation = {
        segmentNotesFromBuffer,
    };
})();

const MOCK_MODES = [
    { key: "air", label: "Air", freq: 83.4, note: "E2", cents: +18, q: 52, wolfRisk: "None", deltaHz: null, targetHz: null },
    { key: "top", label: "Top", freq: 196.5, note: "G3", cents: +5, q: 120, wolfRisk: "Med", deltaHz: 12.0, targetHz: 184.5 },
    { key: "back", label: "Back", freq: 231.5, note: "A#3", cents: -12, q: 98, wolfRisk: "Low", deltaHz: null, targetHz: null },
];
export function renderMock(deps) {
    deps.renderModes(MOCK_MODES);
    const freqs = [];
    const mags = [];
    for (let f = 50; f <= 400; f += 2) {
        freqs.push(f);
        const air = Math.exp(-Math.abs(f - 83) / 18) * 14;
        const top = Math.exp(-Math.abs(f - 196) / 12) * 22;
        const back = Math.exp(-Math.abs(f - 232) / 10) * 18;
        const noise = Math.sin(f / 6) * 0.6;
        mags.push(-50 + air + top + back + noise);
    }
    const overlay = mags.map((m, i) => m + (Math.sin(i / 30) * 4.5));
    const mockDetections = MOCK_MODES.map((m) => {
        const f0 = Number.isFinite(m.freq) ? m.freq : null;
        if (!Number.isFinite(f0))
            return { mode: m.key, peakFreq: null, peakDb: null, peakIdx: null, prominenceDb: null };
        let bestIdx = 0;
        for (let i = 1; i < freqs.length; i += 1) {
            if (Math.abs(freqs[i] - f0) < Math.abs(freqs[bestIdx] - f0))
                bestIdx = i;
        }
        return { mode: m.key, peakFreq: f0, peakDb: mags[bestIdx] ?? null, peakIdx: bestIdx, prominenceDb: 10 };
    });
    deps.renderSpectrum({ freqs, mags, overlay, modes: mockDetections });
}

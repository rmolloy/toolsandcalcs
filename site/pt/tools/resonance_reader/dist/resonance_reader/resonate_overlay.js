import { adaptParamsToSolver, computeResponseSafe } from "./resonate_solver_fit.js";
import { seriesValuesSampleAtFrequencies } from "../common/series_sampling.js";
export function responseOverlayFromSolver(rawParams, freqs) {
    const resp = computeResponseSafe(adaptParamsToSolver(rawParams));
    if (!resp?.total?.length)
        return null;
    return seriesValuesSampleAtFrequencies(resp.total, freqs);
}
export function buildOverlayFromModes(freqs, dbs, modes) {
    const baseline = Math.min(...dbs, -90);
    const overlay = freqs.map(() => baseline);
    modes.forEach((m) => {
        if (!Number.isFinite(m.peakFreq))
            return;
        const f0 = m.peakFreq;
        const width = Math.max(6, f0 * 0.06);
        let peakDb = baseline;
        let bestIdx = 0;
        freqs.forEach((f, idx) => {
            const d = Math.abs(f - f0);
            if (d < Math.abs(freqs[bestIdx] - f0))
                bestIdx = idx;
        });
        peakDb = dbs[bestIdx] ?? baseline;
        overlay.forEach((_, i) => {
            const d = Math.abs(freqs[i] - f0);
            const val = peakDb - ((d / width) ** 2) * 8;
            if (val > overlay[i])
                overlay[i] = val;
        });
    });
    return overlay;
}

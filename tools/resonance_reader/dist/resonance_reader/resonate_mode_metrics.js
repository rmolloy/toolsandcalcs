export function median(arr) {
    if (!arr.length)
        return 0;
    const s = arr.slice().sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
export function noteAndCentsFromFreq(freq) {
    if (!Number.isFinite(freq))
        return { note: null, cents: null };
    const FFTUtils = window.FFTUtils;
    const f = freq;
    if (FFTUtils?.freqToNoteCents) {
        try {
            const out = FFTUtils.freqToNoteCents(f);
            const note = typeof out?.name === "string" ? out.name : null;
            const centsNum = Number.isFinite(out?.centsNum) ? out.centsNum : null;
            return { note, cents: centsNum !== null ? Math.round(centsNum) : null };
        }
        catch {
            return { note: null, cents: null };
        }
    }
    return { note: null, cents: null };
}
function severityFromProminence(prom) {
    if (!Number.isFinite(prom))
        return "Low";
    if (prom >= 14)
        return "High";
    if (prom >= 9)
        return "Medium";
    return "Low";
}
function severityFromNoteProximity(centsAbs) {
    if (!Number.isFinite(centsAbs))
        return "Low";
    if (centsAbs <= 7)
        return "High";
    if (centsAbs < 15)
        return "Medium";
    return "Low";
}
function pickSeverity(a, b) {
    const rank = { Low: 1, Medium: 2, High: 3 };
    return rank[a] >= rank[b] ? a : b;
}
export function computeSeverity(prominence, centsAbs) {
    return pickSeverity(severityFromProminence(prominence), severityFromNoteProximity(centsAbs));
}
export function estimateQFromDb(freqs, dbs, peak) {
    if (freqs.length !== dbs.length || freqs.length < 3)
        return null;
    const { freq: f0, db: peakDb } = peak;
    if (!Number.isFinite(f0) || !Number.isFinite(peakDb))
        return null;
    const cutoff = peakDb - 3;
    let idx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < freqs.length; i += 1) {
        const d = Math.abs(freqs[i] - f0);
        if (d < bestDist) {
            bestDist = d;
            idx = i;
        }
    }
    const interpCrossing = (i0, i1) => {
        const fA = freqs[i0];
        const fB = freqs[i1];
        const yA = dbs[i0];
        const yB = dbs[i1];
        if (!Number.isFinite(fA) || !Number.isFinite(fB) || !Number.isFinite(yA) || !Number.isFinite(yB))
            return null;
        if (yA === yB)
            return fA;
        const t = (cutoff - yA) / (yB - yA);
        if (!Number.isFinite(t))
            return null;
        const tt = Math.max(0, Math.min(1, t));
        return fA + tt * (fB - fA);
    };
    let left = idx;
    while (left > 0 && dbs[left] > cutoff)
        left -= 1;
    const leftF = left === idx ? null : interpCrossing(left, Math.min(left + 1, freqs.length - 1));
    let right = idx;
    while (right < dbs.length - 1 && dbs[right] > cutoff)
        right += 1;
    const rightF = right === idx ? null : interpCrossing(Math.max(0, right - 1), right);
    if (!Number.isFinite(leftF) || !Number.isFinite(rightF))
        return null;
    const bw = Math.max(1e-6, Math.abs(rightF - leftF));
    const q = f0 / bw;
    if (!Number.isFinite(q) || q <= 0)
        return null;
    return q;
}
export function wolfRiskFromSeverity(sev) {
    if (!sev)
        return null;
    if (sev === "High")
        return "High";
    if (sev === "Medium")
        return "Med";
    return "Low";
}

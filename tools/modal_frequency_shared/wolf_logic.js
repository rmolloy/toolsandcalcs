"use strict";
(() => {
    const WOLF_THRESHOLDS = {
        prominence: { high: 12, medium: 7 },
        cents: { high: 10, medium: 25 },
    };
    const ORDER = { High: 3, Medium: 2, Low: 1 };
    const clamp = (v) => (typeof v === "number" && Number.isFinite(v) ? v : NaN);
    function severityFromProminence(prom) {
        const p = clamp(prom);
        if (!Number.isFinite(p))
            return "Low";
        if (p >= WOLF_THRESHOLDS.prominence.high)
            return "High";
        if (p >= WOLF_THRESHOLDS.prominence.medium)
            return "Medium";
        return "Low";
    }
    function severityFromNoteProximity(centsAbs) {
        const c = clamp(centsAbs);
        if (!Number.isFinite(c))
            return "Low";
        if (c <= WOLF_THRESHOLDS.cents.high)
            return "High";
        if (c < WOLF_THRESHOLDS.cents.medium)
            return "Medium";
        return "Low";
    }
    function pickSeverity(a, b) {
        return ORDER[a] >= ORDER[b] ? a : b;
    }
    function computeSeverity(params) {
        return pickSeverity(severityFromProminence(params.prominence), severityFromNoteProximity(params.centsAbs));
    }
    function noteBonus(centsAbs) {
        const c = clamp(centsAbs);
        if (!Number.isFinite(c))
            return 0;
        if (c <= 7)
            return 4;
        if (c <= 15)
            return 2;
        if (c <= 30)
            return 1;
        return 0;
    }
    const scope = (typeof window !== "undefined" ? window : globalThis);
    scope.WolfLogic = {
        WOLF_THRESHOLDS,
        severityFromProminence,
        severityFromNoteProximity,
        pickSeverity,
        computeSeverity,
        noteBonus,
    };
})();

(() => {
  type WolfSeverity = "Low" | "Medium" | "High";

  interface WolfThresholds {
    prominence: { high: number; medium: number };
    cents: { high: number; medium: number };
  }

  const WOLF_THRESHOLDS: WolfThresholds = {
    prominence: { high: 12, medium: 7 },
    cents: { high: 10, medium: 25 },
  };

  const ORDER: Record<WolfSeverity, number> = { High: 3, Medium: 2, Low: 1 };

  const clamp = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : NaN);

  function severityFromProminence(prom: number | null | undefined): WolfSeverity {
    const p = clamp(prom);
    if (!Number.isFinite(p)) return "Low";
    if (p >= WOLF_THRESHOLDS.prominence.high) return "High";
    if (p >= WOLF_THRESHOLDS.prominence.medium) return "Medium";
    return "Low";
  }

  function severityFromNoteProximity(centsAbs: number | null | undefined): WolfSeverity {
    const c = clamp(centsAbs);
    if (!Number.isFinite(c)) return "Low";
    if (c <= WOLF_THRESHOLDS.cents.high) return "High";
    if (c < WOLF_THRESHOLDS.cents.medium) return "Medium";
    return "Low";
  }

  function pickSeverity(a: WolfSeverity, b: WolfSeverity): WolfSeverity {
    return ORDER[a] >= ORDER[b] ? a : b;
  }

  function computeSeverity(params: { prominence?: number | null; centsAbs?: number | null }): WolfSeverity {
    return pickSeverity(
      severityFromProminence(params.prominence),
      severityFromNoteProximity(params.centsAbs),
    );
  }

  function noteBonus(centsAbs: number | null | undefined): number {
    const c = clamp(centsAbs);
    if (!Number.isFinite(c)) return 0;
    if (c <= 7) return 4;
    if (c <= 15) return 2;
    if (c <= 30) return 1;
    return 0;
  }

  type WolfLogicApi = {
    WOLF_THRESHOLDS: WolfThresholds;
    severityFromProminence: typeof severityFromProminence;
    severityFromNoteProximity: typeof severityFromNoteProximity;
    pickSeverity: typeof pickSeverity;
    computeSeverity: typeof computeSeverity;
    noteBonus: typeof noteBonus;
  };

  const scope = (typeof window !== "undefined" ? window : globalThis) as typeof globalThis & {
    WolfLogic?: WolfLogicApi;
  };

  scope.WolfLogic = {
    WOLF_THRESHOLDS,
    severityFromProminence,
    severityFromNoteProximity,
    pickSeverity,
    computeSeverity,
    noteBonus,
  };
})();

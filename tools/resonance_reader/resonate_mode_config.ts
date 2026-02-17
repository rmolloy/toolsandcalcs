import { resolveColorHexFromRole } from "./resonate_color_roles.js";

export type ModeMeta = { label: string; aliasHtml: string; aliasText: string; tooltip: string; color: string };

export type MeasureMode = "guitar" | "played_note" | "top" | "back";
export type ModeBand = { low: number; high: number };
export type ModeBandMap = Record<string, ModeBand>;
export type ModeProfile = { bands: ModeBandMap; meta: Record<string, ModeMeta> };

const GUITAR_BANDS: ModeBandMap = {
  air: { low: 75, high: 115 },
  top: { low: 150, high: 205 },
  back: { low: 210, high: 260 },
};

const GUITAR_META: Record<string, ModeMeta> = {
  air: {
    label: "Air",
    aliasHtml: "T(1,1)<sub>1</sub>",
    aliasText: "T(1,1)₁",
    tooltip: "Air (T(1,1)₁)\nHelmholtz air resonance of the cavity.",
    color: resolveColorHexFromRole("airMode"),
  },
  top: {
    label: "Top",
    aliasHtml: "T(1,1)<sub>2</sub>",
    aliasText: "T(1,1)₂",
    tooltip: "Top (T(1,1)₂)\nPrimary top-plate low-frequency mode.",
    color: resolveColorHexFromRole("topMode"),
  },
  back: {
    label: "Back",
    aliasHtml: "T(1,1)<sub>3</sub>",
    aliasText: "T(1,1)₃",
    tooltip: "Back (T(1,1)₃)\nPrimary back-plate low-frequency mode.",
    color: resolveColorHexFromRole("backMode"),
  },
};

const TOP_PLATE_BANDS: ModeBandMap = {
  transverse: { low: 24, high: 55 },
  long: { low: 65, high: 100 },
  cross: { low: 110, high: 140 },
};

const TOP_PLATE_META: Record<string, ModeMeta> = {
  transverse: {
    label: "Transverse",
    aliasHtml: "T",
    aliasText: "T",
    tooltip: "Transverse\nTransverse/twisting plate mode.",
    color: resolveColorHexFromRole("plateTransverseMode"),
  },
  long: {
    label: "Long",
    aliasHtml: "L",
    aliasText: "L",
    tooltip: "Long\nLong-grain plate mode.",
    color: resolveColorHexFromRole("plateLongMode"),
  },
  cross: {
    label: "Cross",
    aliasHtml: "C",
    aliasText: "C",
    tooltip: "Cross\nCross-grain plate mode.",
    color: resolveColorHexFromRole("plateCrossMode"),
  },
};

const BACK_PLATE_BANDS: ModeBandMap = {
  transverse: { low: 24, high: 55 },
  long: { low: 65, high: 100 },
  cross: { low: 110, high: 140 },
};

const BACK_PLATE_META: Record<string, ModeMeta> = {
  transverse: {
    label: "Transverse",
    aliasHtml: "T",
    aliasText: "T",
    tooltip: "Transverse\nTransverse/twisting plate mode.",
    color: resolveColorHexFromRole("plateTransverseMode"),
  },
  long: {
    label: "Long",
    aliasHtml: "L",
    aliasText: "L",
    tooltip: "Long\nLong-grain plate mode.",
    color: resolveColorHexFromRole("plateLongMode"),
  },
  cross: {
    label: "Cross",
    aliasHtml: "C",
    aliasText: "C",
    tooltip: "Cross\nCross-grain plate mode.",
    color: resolveColorHexFromRole("plateCrossMode"),
  },
};

const MODE_PROFILES: Record<MeasureMode, ModeProfile> = {
  guitar: { bands: GUITAR_BANDS, meta: GUITAR_META },
  played_note: { bands: GUITAR_BANDS, meta: GUITAR_META },
  top: { bands: TOP_PLATE_BANDS, meta: TOP_PLATE_META },
  back: { bands: BACK_PLATE_BANDS, meta: BACK_PLATE_META },
};

export const modeBands = GUITAR_BANDS;
export const MODE_META = GUITAR_META;

export function measureModeNormalize(input: unknown): MeasureMode {
  if (input === "played_note") return "played_note";
  if (input === "top") return "top";
  if (input === "back") return "back";
  return "guitar";
}

export function modeProfileResolveFromMeasureMode(measureMode: unknown): ModeProfile {
  return MODE_PROFILES[measureModeNormalize(measureMode)];
}

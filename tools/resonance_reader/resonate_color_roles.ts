export type PaletteColorName =
  | "black"
  | "orange"
  | "skyBlue"
  | "bluishGreen"
  | "yellow"
  | "blue"
  | "vermillion"
  | "reddishPurple";

type RgbTriplet = readonly [number, number, number];

export type ColorRoleName =
  | "fftLine"
  | "modelOverlay"
  | "stringFundamental"
  | "secondPartial"
  | "thirdPartial"
  | "airMode"
  | "topMode"
  | "backMode"
  | "plateTransverseMode"
  | "plateLongMode"
  | "plateCrossMode"
  | "customMode"
  | "wavePrimarySelection"
  | "waveNoteSelection"
  | "waveTapMarker";

const COLOR_PALETTE_OKABE_ITO: Record<PaletteColorName, RgbTriplet> = {
  black: [0, 0, 0],
  orange: [230, 159, 0],
  skyBlue: [86, 180, 233],
  bluishGreen: [0, 158, 115],
  yellow: [240, 228, 66],
  blue: [0, 114, 178],
  vermillion: [213, 94, 0],
  reddishPurple: [204, 121, 167],
};

const COLOR_ROLE_TO_PALETTE: Record<ColorRoleName, PaletteColorName> = {
  fftLine: "skyBlue",
  modelOverlay: "orange",
  stringFundamental: "skyBlue",
  secondPartial: "orange",
  thirdPartial: "yellow",
  airMode: "vermillion",
  topMode: "bluishGreen",
  backMode: "reddishPurple",
  plateTransverseMode: "vermillion",
  plateLongMode: "bluishGreen",
  plateCrossMode: "reddishPurple",
  customMode: "blue",
  wavePrimarySelection: "orange",
  waveNoteSelection: "bluishGreen",
  waveTapMarker: "reddishPurple",
};

function resolvePaletteRgbFromName(colorName: PaletteColorName): RgbTriplet {
  return COLOR_PALETTE_OKABE_ITO[colorName];
}

function resolvePaletteColorNameFromRole(roleName: ColorRoleName): PaletteColorName {
  return COLOR_ROLE_TO_PALETTE[roleName];
}

function clampAlpha(alpha: number) {
  if (!Number.isFinite(alpha)) return 1;
  return Math.max(0, Math.min(1, alpha));
}

function toHex2(value: number) {
  return Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0");
}

export function resolveColorHexFromRole(roleName: ColorRoleName) {
  const paletteName = resolvePaletteColorNameFromRole(roleName);
  const [r, g, b] = resolvePaletteRgbFromName(paletteName);
  return `#${toHex2(r)}${toHex2(g)}${toHex2(b)}`;
}

export function resolveColorRgbaFromRole(roleName: ColorRoleName, alpha = 1) {
  const paletteName = resolvePaletteColorNameFromRole(roleName);
  const [r, g, b] = resolvePaletteRgbFromName(paletteName);
  return `rgba(${r}, ${g}, ${b}, ${clampAlpha(alpha)})`;
}

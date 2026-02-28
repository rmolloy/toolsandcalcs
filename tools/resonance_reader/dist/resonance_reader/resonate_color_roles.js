const COLOR_PALETTE_OKABE_ITO = {
    black: [0, 0, 0],
    orange: [230, 159, 0],
    skyBlue: [86, 180, 233],
    bluishGreen: [0, 158, 115],
    yellow: [240, 228, 66],
    blue: [0, 114, 178],
    vermillion: [213, 94, 0],
    reddishPurple: [204, 121, 167],
};
const COLOR_ROLE_TO_PALETTE = {
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
function resolvePaletteRgbFromName(colorName) {
    return COLOR_PALETTE_OKABE_ITO[colorName];
}
function resolvePaletteColorNameFromRole(roleName) {
    return COLOR_ROLE_TO_PALETTE[roleName];
}
function clampAlpha(alpha) {
    if (!Number.isFinite(alpha))
        return 1;
    return Math.max(0, Math.min(1, alpha));
}
function toHex2(value) {
    return Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0");
}
export function resolveColorHexFromRole(roleName) {
    const paletteName = resolvePaletteColorNameFromRole(roleName);
    const [r, g, b] = resolvePaletteRgbFromName(paletteName);
    return `#${toHex2(r)}${toHex2(g)}${toHex2(b)}`;
}
export function resolveColorRgbaFromRole(roleName, alpha = 1) {
    const paletteName = resolvePaletteColorNameFromRole(roleName);
    const [r, g, b] = resolvePaletteRgbFromName(paletteName);
    return `rgba(${r}, ${g}, ${b}, ${clampAlpha(alpha)})`;
}

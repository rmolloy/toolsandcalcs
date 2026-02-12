export const modeBands = {
    air: { low: 75, high: 115 },
    top: { low: 150, high: 205 },
    back: { low: 210, high: 260 },
};
export const MODE_META = {
    air: {
        label: "Air",
        aliasHtml: "T(1,1)<sub>1</sub>",
        aliasText: "T(1,1)₁",
        tooltip: "Air (T(1,1)₁)\nHelmholtz air resonance of the cavity.",
        color: "#8ecbff",
    },
    top: {
        label: "Top",
        aliasHtml: "T(1,1)<sub>2</sub>",
        aliasText: "T(1,1)₂",
        tooltip: "Top (T(1,1)₂)\nPrimary top-plate low-frequency mode.",
        color: "#f5c46f",
    },
    back: {
        label: "Back",
        aliasHtml: "T(1,1)<sub>3</sub>",
        aliasText: "T(1,1)₃",
        tooltip: "Back (T(1,1)₃)\nPrimary back-plate low-frequency mode.",
        color: "#7ce3b1",
    },
};

import { measureModeNormalize } from "./resonate_mode_config.js";
const SUBJECT_TYPE_OPTIONS = [
    { key: "GUITAR", label: "Guitar", subtypes: [{ key: "", label: "General" }] },
    { key: "MATERIAL", label: "Material", subtypes: [{ key: "PLATE_STOCK", label: "Plate Stock" }, { key: "BRACE_STOCK", label: "Brace Stock" }] },
    { key: "BLANK", label: "Blank", subtypes: [{ key: "", label: "General" }] },
    { key: "PART", label: "Part", subtypes: [{ key: "", label: "General" }] },
    { key: "PLATE", label: "Plate", subtypes: [{ key: "", label: "General" }] },
    { key: "BRACE", label: "Brace", subtypes: [{ key: "", label: "General" }] },
    { key: "ASSEMBLY", label: "Assembly", subtypes: [{ key: "", label: "General" }] },
    { key: "INSTRUMENT", label: "Instrument", subtypes: [{ key: "", label: "General" }] },
    { key: "SETUP_COMPONENT", label: "Setup Component", subtypes: [{ key: "", label: "General" }] },
    { key: "JIG", label: "Jig", subtypes: [{ key: "", label: "General" }] },
    { key: "FIXTURE", label: "Fixture", subtypes: [{ key: "", label: "General" }] },
    { key: "GENERIC", label: "Generic", subtypes: [{ key: "", label: "General" }] },
];
export function resonanceSubjectTypeOptionsRead() {
    return SUBJECT_TYPE_OPTIONS.map((option) => ({
        ...option,
        subtypes: option.subtypes.map((subtype) => ({ ...subtype })),
    }));
}
export function resonanceSubjectDraftDefaultsFromMeasureMode(measureMode) {
    const normalized = measureModeNormalize(measureMode);
    if (normalized === "plate_stock") {
        return { typeKey: "MATERIAL", subtypeKey: "PLATE_STOCK" };
    }
    if (normalized === "brace_stock") {
        return { typeKey: "MATERIAL", subtypeKey: "BRACE_STOCK" };
    }
    return { typeKey: "GUITAR", subtypeKey: "" };
}
export function resonanceSubjectSubtypeOptionsRead(typeKey) {
    return resonanceSubjectTypeOptionsRead().find((option) => option.key === typeKey)?.subtypes ?? [{ key: "", label: "General" }];
}

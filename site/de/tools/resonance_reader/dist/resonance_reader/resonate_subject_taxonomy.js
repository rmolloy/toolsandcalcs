import { measureModeNormalize } from "./resonate_mode_config.js?rev=b5b8fa4adb00";
import { resonanceLocalizedMessages } from "./resonate_localized_messages.js?rev=b5b8fa4adb00";
const SUBJECT_TYPE_OPTIONS = [
    { key: "GUITAR", label: resonanceLocalizedMessages.subjectGuitar, subtypes: [{ key: "", label: resonanceLocalizedMessages.subjectGeneral }] },
    { key: "MATERIAL", label: resonanceLocalizedMessages.subjectMaterial, subtypes: [{ key: "PLATE_STOCK", label: resonanceLocalizedMessages.subjectPlateStock }, { key: "BRACE_STOCK", label: resonanceLocalizedMessages.subjectBraceStock }] },
    { key: "BLANK", label: resonanceLocalizedMessages.subjectBlank, subtypes: [{ key: "", label: resonanceLocalizedMessages.subjectGeneral }] },
    { key: "PART", label: resonanceLocalizedMessages.subjectPart, subtypes: [{ key: "", label: resonanceLocalizedMessages.subjectGeneral }] },
    { key: "PLATE", label: resonanceLocalizedMessages.subjectPlate, subtypes: [{ key: "", label: resonanceLocalizedMessages.subjectGeneral }] },
    { key: "BRACE", label: resonanceLocalizedMessages.subjectBrace, subtypes: [{ key: "", label: resonanceLocalizedMessages.subjectGeneral }] },
    { key: "ASSEMBLY", label: resonanceLocalizedMessages.subjectAssembly, subtypes: [{ key: "", label: resonanceLocalizedMessages.subjectGeneral }] },
    { key: "INSTRUMENT", label: resonanceLocalizedMessages.subjectInstrument, subtypes: [{ key: "", label: resonanceLocalizedMessages.subjectGeneral }] },
    { key: "SETUP_COMPONENT", label: resonanceLocalizedMessages.subjectSetupComponent, subtypes: [{ key: "", label: resonanceLocalizedMessages.subjectGeneral }] },
    { key: "JIG", label: resonanceLocalizedMessages.subjectJig, subtypes: [{ key: "", label: resonanceLocalizedMessages.subjectGeneral }] },
    { key: "FIXTURE", label: resonanceLocalizedMessages.subjectFixture, subtypes: [{ key: "", label: resonanceLocalizedMessages.subjectGeneral }] },
    { key: "GENERIC", label: resonanceLocalizedMessages.subjectGeneric, subtypes: [{ key: "", label: resonanceLocalizedMessages.subjectGeneral }] },
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
    return resonanceSubjectTypeOptionsRead().find((option) => option.key === typeKey)?.subtypes ?? [{ key: "", label: resonanceLocalizedMessages.subjectGeneral }];
}

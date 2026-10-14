type WhatIfRecipeField = {
  id: string;
  label: string;
  unit: string;
  precision?: number;
  threshold?: number;
  transform?: (value: number) => number;
  extra?: (
    baseValue: number,
    targetValue: number,
    deltaValue: number,
    messages: WhatIfRecipeMessages | undefined,
  ) => string | null | undefined;
};

type WhatIfRecipeMessages = {
  decreaseTemplate?: string;
  fieldLabels?: Record<string, string>;
  increaseTemplate?: string;
  soundholeAreaDeltaTemplate?: string;
};

interface Window {
  buildWhatIfRecipeSummaryLines?: (
    baseRaw: Record<string, number> | null,
    targetRaw: Record<string, number> | null,
    messages?: WhatIfRecipeMessages,
  ) => string[] | null;
}

const WHAT_IF_RECIPE_FIELDS: WhatIfRecipeField[] = [
  { id: "mass_top", label: "top plate mass", unit: "g", precision: 1, threshold: 0.1 },
  { id: "stiffness_top", label: "top plate stiffness", unit: "N/m", precision: 0, threshold: 50 },
  { id: "mass_back", label: "back plate mass", unit: "g", precision: 1, threshold: 0.1 },
  { id: "stiffness_back", label: "back plate stiffness", unit: "N/m", precision: 0, threshold: 50 },
  { id: "volume_air", label: "cavity volume", unit: "m³", precision: 4, threshold: 0.00005 },
  {
    id: "area_hole",
    label: "soundhole diameter",
    unit: "mm",
    precision: 1,
    threshold: 0.1,
    transform: whatIfRecipeAreaToDiameterMm,
    extra: function (
      baseValue: number,
      targetValue: number,
      _deltaValue: number,
      messages: WhatIfRecipeMessages | undefined,
    ) {
      var deltaArea = targetValue - baseValue;
      var sign = deltaArea >= 0 ? "+" : "-";
      return messageValueRead(
        messages?.soundholeAreaDeltaTemplate,
        " ({sign}{area} m²)",
      )
        .replace("{sign}", sign)
        .replace("{area}", Math.abs(deltaArea).toFixed(5));
    }
  }
];

function whatIfRecipeAreaToDiameterMm(area: number) {
  if (!Number.isFinite(area) || area <= 0) return NaN;
  return Math.sqrt((4 * area) / Math.PI) * 1000;
}

function buildWhatIfRecipeDeltaLine(
  field: WhatIfRecipeField,
  baseRaw: Record<string, number>,
  targetRaw: Record<string, number>,
  messages: WhatIfRecipeMessages | undefined,
) {
  var baseValue = baseRaw[field.id];
  var targetValue = targetRaw[field.id];
  if (!Number.isFinite(baseValue) || !Number.isFinite(targetValue)) return null;

  var baseDisplay = baseValue;
  var targetDisplay = targetValue;
  if (typeof field.transform === "function") {
    baseDisplay = field.transform(baseValue);
    targetDisplay = field.transform(targetValue);
  }
  if (!Number.isFinite(baseDisplay) || !Number.isFinite(targetDisplay)) return null;

  var deltaDisplay = targetDisplay - baseDisplay;
  if (Math.abs(deltaDisplay) < (field.threshold ?? 0)) return null;

  var precision = typeof field.precision === "number" ? field.precision : 2;
  var amount = Math.abs(deltaDisplay).toFixed(precision);
  var line = whatIfRecipeLineBuild(field, amount, deltaDisplay, messages);
  if (field.extra) {
    line += field.extra(baseValue, targetValue, deltaDisplay, messages) || "";
  }
  return line;
}

function whatIfRecipeLineBuild(
  field: WhatIfRecipeField,
  amount: string,
  delta: number,
  messages: WhatIfRecipeMessages | undefined,
) {
  var template = delta >= 0
    ? messageValueRead(messages?.increaseTemplate, "Increase {field} by {amount} {unit}")
    : messageValueRead(messages?.decreaseTemplate, "Decrease {field} by {amount} {unit}");
  return template
    .replace("{field}", whatIfRecipeFieldLabelRead(field, messages))
    .replace("{amount}", amount)
    .replace("{unit}", field.unit);
}

function whatIfRecipeFieldLabelRead(
  field: WhatIfRecipeField,
  messages: WhatIfRecipeMessages | undefined,
) {
  return messageValueRead(messages?.fieldLabels?.[field.id], field.label);
}

function messageValueRead(candidate: unknown, fallback: string) {
  return typeof candidate === "string" && candidate.trim() ? candidate : fallback;
}

function buildWhatIfRecipeSummaryLines(
  baseRaw: Record<string, number> | null,
  targetRaw: Record<string, number> | null,
  messages?: WhatIfRecipeMessages,
) {
  if (!baseRaw || !targetRaw) return null;

  var lines = WHAT_IF_RECIPE_FIELDS
    .map(function (field) {
      return buildWhatIfRecipeDeltaLine(field, baseRaw, targetRaw, messages);
    })
    .filter(function (line): line is string {
      return Boolean(line);
    });

  return lines.length ? lines : null;
}

window.buildWhatIfRecipeSummaryLines = buildWhatIfRecipeSummaryLines;

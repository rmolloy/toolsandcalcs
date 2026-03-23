/*
© 2025 Rick Molloy. All rights reserved.

Plate thickness query-string import helpers.
*/

(() => {
  type PlateThicknessFieldMap = Record<string, HTMLInputElement>;

  type PlateThicknessQueryParamsApi = {
    applyToFields: (
      fields: PlateThicknessFieldMap,
      search: string,
      formatNumber: (value: number) => string,
    ) => boolean;
  };

  const PARAM_TO_FIELD: Record<string, string> = {
    long: "long_freq",
    cross: "cross_freq",
    twisting: "twist_freq",
    panel_length: "panel_length",
    panel_width: "panel_width",
    panel_height: "panel_height",
    panel_mass: "panel_mass",
  };

  function applyToFields(
    fields: PlateThicknessFieldMap,
    search: string,
    formatNumber: (value: number) => string,
  ) {
    const params = new URLSearchParams(search);
    let changed = false;
    Object.entries(PARAM_TO_FIELD).forEach(([paramKey, fieldKey]) => {
      const raw = params.get(paramKey);
      if (!raw) return;
      const numeric = Number.parseFloat(raw);
      if (!Number.isFinite(numeric) || numeric <= 0) return;
      const field = fields[fieldKey];
      if (!field) return;
      field.value = formatNumber(numeric);
      changed = true;
    });
    return changed;
  }

  const PlateThicknessQueryParams: PlateThicknessQueryParamsApi = {
    applyToFields,
  };

  (typeof window !== "undefined" ? window : (globalThis as any)).PlateThicknessQueryParams = PlateThicknessQueryParams;
  if (typeof module !== "undefined" && (module as any).exports) {
    (module as any).exports = PlateThicknessQueryParams;
  }
})();

export function createSetupFormController({
  applyTensionCatalogToSetup,
  document,
  estimateStringMechanicalProperties,
  form,
  getSetup,
  lengthUnits,
  profileEditor,
  setSetup,
  sparseActionEditor,
  tensionSourceOptions,
}) {
  function writeSetupToForm() {
    const setup = getSetup();
    profileEditor.renderInstrumentProfileOptions();
    setValue("instrument_profile", setup.instrumentProfileId);
    setLengthValue("simple_radius_mm", radiusValueFor("simple"));
    setLengthValue("nut_radius_mm", setup.radiusProfile.nutRadiusMm ?? 304.8);
    setLengthValue("bridge_radius_mm", setup.radiusProfile.bridgeRadiusMm ?? 406.4);
    setLengthValue("relief_amount_mm", setup.reliefAmountMm);
    setValue("relief_peak_fret", setup.reliefPeakFret);
    setLengthValue(
      "action_first_string_mm",
      setup.benchActionTargets.actionAtMeasurementWithCapoMm.firstStringMm,
    );
    setLengthValue(
      "action_last_string_mm",
      setup.benchActionTargets.actionAtMeasurementWithCapoMm.lastStringMm,
    );
    setLengthValue(
      "nut_action_first_string_mm",
      setup.benchActionTargets.nutActionAtFirstFretMm.firstStringMm,
    );
    setLengthValue(
      "nut_action_last_string_mm",
      setup.benchActionTargets.nutActionAtFirstFretMm.lastStringMm,
    );
    setValue("fret_count", setup.fretCount);
    setValue("fan_neutral_fret", setup.fanNeutralFret);
    setLengthValue("extra_string_length_mm", setup.extraStringLengthMm);
    setValue("tension_data_source", tensionSourceIdForSetup());
    for (const input of form.querySelectorAll("[data-string-index]")) {
      const string = setup.strings[Number(input.dataset.stringIndex)];
      const field = input.dataset.stringField;
      input.value = lengthUnits.isStringField(field)
        ? lengthUnits.display(string[field])
        : string[field];
    }
    form.querySelector(`input[name="radius_kind"][value="${radiusKindForSetup()}"]`).checked = true;
    profileEditor.renderOuterStringLabels();
    sparseActionEditor.render(setup);
    lengthUnits.updatePresentation();
    updateRadiusFields();
  }

  function readInputIntoSetup(input) {
    const setup = getSetup();
    if (input.name === "radius_kind") {
      selectRadiusKind(input.value);
      return;
    }
    if (input.id === "tension_data_source") {
      setSetup(applyTensionCatalogToSetup(
        setup,
        setup.tensionCatalog,
        tensionSourceOptions[input.value],
      ));
      return;
    }
    if (input.dataset.stringIndex !== undefined) {
      const string = setup.strings[Number(input.dataset.stringIndex)];
      const field = input.dataset.stringField;
      string[field] = input.type === "number"
        ? lengthUnits.isStringField(field) ? lengthUnits.read(input.value) : Number(input.value)
        : input.value;
      if (field === "gaugeMm" || field === "construction") {
        const mechanical = estimateStringMechanicalProperties(string);
        string.unitMassKgPerMeter = mechanical.unitMassKgPerMeter;
        string.axialStiffnessN = mechanical.axialStiffnessN;
        setSetup(applyTensionCatalogToSetup(
          setup,
          setup.tensionCatalog,
          setup.tensionDataSource,
        ));
      }
      return;
    }
    const numericFields = {
      simple_radius_mm: (value) => { setup.radiusProfile.radiusMm = value; },
      nut_radius_mm: (value) => { setup.radiusProfile.nutRadiusMm = value; },
      bridge_radius_mm: (value) => { setup.radiusProfile.bridgeRadiusMm = value; },
      relief_amount_mm: (value) => { setup.reliefAmountMm = value; },
      relief_peak_fret: (value) => { setup.reliefPeakFret = value; },
      action_first_string_mm: (value) => {
        setup.benchActionTargets.actionAtMeasurementWithCapoMm.firstStringMm = value;
      },
      action_last_string_mm: (value) => {
        setup.benchActionTargets.actionAtMeasurementWithCapoMm.lastStringMm = value;
      },
      nut_action_first_string_mm: (value) => {
        setup.benchActionTargets.nutActionAtFirstFretMm.firstStringMm = value;
      },
      nut_action_last_string_mm: (value) => {
        setup.benchActionTargets.nutActionAtFirstFretMm.lastStringMm = value;
      },
      fret_count: (value) => { setup.fretCount = value; },
      fan_neutral_fret: (value) => { setup.fanNeutralFret = value; },
      extra_string_length_mm: (value) => { setup.extraStringLengthMm = value; },
    };
    const update = numericFields[input.id];
    if (update) {
      update(lengthUnits.isLengthInput(input) ? lengthUnits.read(input.value) : Number(input.value));
    }
  }

  function changesMechanicalLookup(input) {
    return input.id === "tension_data_source"
      || input.dataset.stringField === "gaugeMm"
      || input.dataset.stringField === "construction";
  }

  function writeMechanicalPropertiesToStringCards() {
    getSetup().strings.forEach((string, stringIndex) => {
      const massInput = form.querySelector(
        `[data-string-index="${stringIndex}"][data-string-field="unitMassKgPerMeter"]`,
      );
      const stiffnessInput = form.querySelector(
        `[data-string-index="${stringIndex}"][data-string-field="axialStiffnessN"]`,
      );
      const sourceLabel = form.querySelector(`[data-unit-mass-source="${stringIndex}"]`);
      if (massInput) massInput.value = String(string.unitMassKgPerMeter);
      if (stiffnessInput) stiffnessInput.value = String(string.axialStiffnessN);
      if (sourceLabel) {
        sourceLabel.textContent = string.tensionSource ? "Manufacturer" : "Gauge estimate";
      }
    });
  }

  function updateRadiusFields() {
    const radiusKind = radiusKindForSetup();
    const isSimple = radiusKind === "simple";
    const isCompound = radiusKind === "compound";
    document.getElementById("simple_radius_field").hidden = !isSimple;
    document.getElementById("nut_radius_field").hidden = !isCompound;
    document.getElementById("bridge_radius_field").hidden = !isCompound;
  }

  function radiusValueFor(kind) {
    const setup = getSetup();
    if (kind === "simple") {
      return Number.isFinite(setup.radiusProfile.radiusMm) ? setup.radiusProfile.radiusMm : 304.8;
    }
    return setup.radiusProfile.nutRadiusMm ?? 304.8;
  }

  function radiusKindForSetup() {
    const radiusProfile = getSetup().radiusProfile;
    if (radiusProfile.kind === "compound") return "compound";
    return radiusProfile.radiusMm === Infinity ? "none" : "simple";
  }

  function selectRadiusKind(radiusKind) {
    const setup = getSetup();
    if (radiusKind === "none") {
      setup.radiusProfile = { kind: "simple", radiusMm: Infinity };
      return;
    }
    if (radiusKind === "simple") {
      setup.radiusProfile = {
        kind: "simple",
        radiusMm: lengthUnits.read(document.getElementById("simple_radius_mm").value),
      };
      return;
    }
    setup.radiusProfile = {
      kind: "compound",
      nutRadiusMm: lengthUnits.read(document.getElementById("nut_radius_mm").value),
      bridgeRadiusMm: lengthUnits.read(document.getElementById("bridge_radius_mm").value),
    };
  }

  function tensionSourceIdForSetup() {
    const tensionDataSource = getSetup().tensionDataSource;
    if (!tensionDataSource) return "estimate";
    const dAddarioOptions = {
      EJ16: "daddario_ej16",
      EXL110: "daddario_exl110",
      EJ38: "daddario_ej38",
      EXL170: "daddario_exl170",
      EJ45: "daddario_ej45",
      EJ65T: "daddario_ej65t",
      EJ74: "daddario_ej74",
    };
    if (tensionDataSource.manufacturer === "D'Addario") {
      return dAddarioOptions[tensionDataSource.setCode] || "estimate";
    }
    if (tensionDataSource.setCodes?.includes("bronze")) return "stringjoy_bronze";
    return "stringjoy_nickel";
  }

  function setValue(id, value) {
    document.getElementById(id).value = String(value);
  }

  function setLengthValue(id, valueMm) {
    document.getElementById(id).value = String(lengthUnits.display(valueMm));
  }

  return {
    changesMechanicalLookup,
    readInputIntoSetup,
    tensionSourceIdForSetup,
    updateRadiusFields,
    writeMechanicalPropertiesToStringCards,
    writeSetupToForm,
  };
}

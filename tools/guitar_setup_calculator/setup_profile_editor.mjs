export function createSetupProfileEditor({
  document,
  getSetup,
  instrumentProfiles,
  lengthUnits,
}) {
  const stringInputs = document.getElementById("string_inputs");
  const instrumentProfile = document.getElementById("instrument_profile");
  const customProfileBuilder = document.getElementById("custom_profile_builder");
  const customCourseCount = document.getElementById("custom_course_count");
  const customCourseMembers = document.getElementById("custom_course_members");

  function renderStringInputs() {
    const setup = getSetup();
    stringInputs.innerHTML = setup.strings.map((string, index) => `
      <fieldset class="string-card">
        <legend>Course ${string.courseIndex + 1} · ${string.name}</legend>
        <div class="string-card-fields">
          ${setup.instrumentProfileId === "custom" ? `
            <label><span>Name</span><input data-string-index="${index}" data-string-field="name" type="text"></label>
            <label><span>MIDI note</span><input data-string-index="${index}" data-string-field="openMidiNote" type="number" min="0" max="127" step="1"></label>
          ` : ""}
          <label><span>Length (${lengthUnits.label()})</span><input data-string-index="${index}" data-string-field="scaleLengthMm" type="number" min="${lengthUnits.display(1)}" step="${lengthUnits.inputStep("scale")}"></label>
          <label><span>Gauge (${lengthUnits.label()})</span><input data-string-index="${index}" data-string-field="gaugeMm" type="number" min="${lengthUnits.display(0.05)}" step="${lengthUnits.inputStep("fine")}"></label>
          <label><span>Build</span><select data-string-index="${index}" data-string-field="construction"><option value="plain">Plain</option><option value="wound">Wound</option></select></label>
        </div>
        <details class="string-data-details">
          <summary>Calculation data</summary>
          <div class="string-calculation-fields">
            <label><span>Unit mass (kg/m)<small class="field-source" data-unit-mass-source="${index}">${string.tensionSource ? "Manufacturer" : "Gauge estimate"}</small></span><input data-string-index="${index}" data-string-field="unitMassKgPerMeter" type="number" min="0" step="any"></label>
            <label><span>Axial stiffness (N)<small class="field-source">Estimated core</small></span><input data-string-index="${index}" data-string-field="axialStiffnessN" type="number" min="0" step="1"></label>
          </div>
        </details>
      </fieldset>
    `).join("");
  }

  function renderInstrumentProfileOptions() {
    const setup = getSetup();
    instrumentProfile.innerHTML = instrumentProfiles.map((profile) => (
      `<option value="${profile.id}">${profile.label}</option>`
    )).join("");
    if (setup.instrumentProfileId === "custom") {
      instrumentProfile.insertAdjacentHTML("beforeend", '<option value="custom">Custom</option>');
    }
  }

  function renderOuterStringLabels() {
    const setup = getSetup();
    const firstStringName = setup.strings[0].name;
    const lastStringName = setup.strings.at(-1).name;
    document.getElementById("action_first_string_label").textContent = `First · ${firstStringName} (${lengthUnits.label()})`;
    document.getElementById("action_last_string_label").textContent = `Last · ${lastStringName} (${lengthUnits.label()})`;
    document.getElementById("nut_action_first_string_label").textContent = `First · ${firstStringName} (${lengthUnits.label()})`;
    document.getElementById("nut_action_last_string_label").textContent = `Last · ${lastStringName} (${lengthUnits.label()})`;
  }

  function showCustomProfileBuilder() {
    const setup = getSetup();
    customProfileBuilder.hidden = false;
    customCourseCount.value = String(setup.courseCount);
    renderCustomCourseMembers(setup.courseCount, membersByCourseFromSetup(setup));
  }

  function renderCustomCourseMembers(courseCount, memberCounts = []) {
    const boundedCourseCount = Math.max(1, Math.min(8, courseCount));
    customCourseCount.value = String(boundedCourseCount);
    customCourseMembers.innerHTML = Array.from({ length: boundedCourseCount }, (_, courseIndex) => `
      <label><span>Course ${courseIndex + 1}</span><select data-course-member-count="${courseIndex}">
        <option value="1" ${(memberCounts[courseIndex] ?? 1) === 1 ? "selected" : ""}>1 string</option>
        <option value="2" ${memberCounts[courseIndex] === 2 ? "selected" : ""}>2 strings</option>
      </select></label>
    `).join("");
  }

  function readCustomCourseMembers() {
    return [...customCourseMembers.querySelectorAll("[data-course-member-count]")]
      .map((select) => Number(select.value));
  }

  function hideCustomProfileBuilder() {
    customProfileBuilder.hidden = true;
  }

  return {
    hideCustomProfileBuilder,
    readCustomCourseMembers,
    renderCustomCourseMembers,
    renderInstrumentProfileOptions,
    renderOuterStringLabels,
    renderStringInputs,
    showCustomProfileBuilder,
  };
}

function membersByCourseFromSetup(setup) {
  return Array.from({ length: setup.courseCount }, (_, courseIndex) => (
    setup.strings.filter((string) => string.courseIndex === courseIndex).length || 1
  ));
}

export function createSetupProfileReference({ document, instrumentProfiles, lengthUnits }) {
  const reference = document.getElementById("profile_reference");
  const unavailable = document.getElementById("profile_reference_unavailable");

  function render(profileId) {
    const profile = instrumentProfiles.find((candidate) => candidate.id === profileId);
    presentAvailability(profile);
    if (profile) presentProfileDefaults(profile);
  }

  function presentAvailability(profile) {
    reference.hidden = !profile;
    unavailable.hidden = Boolean(profile);
  }

  function presentProfileDefaults(profile) {
    presentStructure(profile);
    presentRelief(profile);
    presentOuterAction("profile_reference_bridge", profile.actionAtFret12WithCapo1Mm);
    presentOuterAction("profile_reference_nut", profile.nutActionAtFret1Mm);
  }

  function presentStructure(profile) {
    document.getElementById("profile_reference_structure").textContent = reference.dataset.structure
      .replace("{stringCount}", String(profile.strings.length))
      .replace("{courseCount}", String(profile.courseCount));
  }

  function presentRelief(profile) {
    document.getElementById("profile_reference_relief").textContent = reference.dataset.relief
      .replace("{relief}", lengthUnits.format(profile.reliefMm))
      .replace("{fretNumber}", String(profile.reliefFretNumber));
  }

  function presentOuterAction(elementId, action) {
    document.getElementById(elementId).textContent = reference.dataset.outerAction
      .replace("{first}", lengthUnits.format(action.firstStringMm))
      .replace("{last}", lengthUnits.format(action.lastStringMm));
  }

  return { render };
}

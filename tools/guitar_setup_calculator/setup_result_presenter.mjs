export function createSetupResultPresenter({
  document,
  lengthUnits,
  calculateMaximumAbsoluteCentsError,
  escapeMarkup,
}) {
  const resultRows = document.getElementById("result_rows");
  const mobileResultCards = document.getElementById("mobile_result_cards");
  const railAction = document.getElementById("rail_action");
  const railNutAction = document.getElementById("rail_nut_action");
  const railRelief = document.getElementById("rail_relief");
  const railError = document.getElementById("rail_error");
  const railNutCompensation = document.getElementById("rail_nut_compensation");
  const railSaddleCompensation = document.getElementById("rail_saddle_compensation");
  const railScaleLength = document.getElementById("rail_scale_length");

  function render({ setup, result }) {
    resultRows.innerHTML = result.strings.map(renderResultRow).join("");
    mobileResultCards.innerHTML = renderMobileResultsByCourse(result.strings);
    renderMeasurementRail(setup, result);
  }

  function clear() {
    resultRows.innerHTML = "";
    mobileResultCards.innerHTML = "";
    [
      railAction,
      railNutAction,
      railRelief,
      railError,
      railNutCompensation,
      railSaddleCompensation,
      railScaleLength,
    ].forEach((element) => { element.textContent = "—"; });
  }

  function renderMeasurementRail(setup, result) {
    const targetAction = setup.benchActionTargets.actionAtMeasurementWithCapoMm;
    const nutAction = setup.benchActionTargets.nutActionAtFirstFretMm;
    const errors = result.strings.map((stringResult) => calculateMaximumAbsoluteCentsError(
      stringResult.intonation.centsErrorByFret,
    ));
    const nutCompensations = result.strings.map(
      (stringResult) => stringResult.intonation.nutCompensationMm,
    );
    const saddleCompensations = result.strings.map(
      (stringResult) => stringResult.intonation.saddleCompensationMm,
    );

    railAction.textContent = `${setup.strings[0].name} ${lengthUnits.format(targetAction.firstStringMm)} · ${setup.strings.at(-1).name} ${lengthUnits.format(targetAction.lastStringMm)} · capo 1, fret 12`;
    railNutAction.textContent = `${setup.strings[0].name} ${lengthUnits.format(nutAction.firstStringMm)} · ${setup.strings.at(-1).name} ${lengthUnits.format(nutAction.lastStringMm)} · open, fret 1`;
    railRelief.textContent = setup.reliefAmountMm === 0
      ? "Off"
      : `${lengthUnits.format(setup.reliefAmountMm)} @ fret ${setup.reliefPeakFret}`;
    railError.textContent = `${Math.max(...errors).toFixed(1)}¢`;
    railNutCompensation.textContent = lengthUnits.formatSignedRange(nutCompensations);
    railSaddleCompensation.textContent = lengthUnits.formatSignedRange(saddleCompensations);
    railScaleLength.textContent = lengthUnits.formatRange(
      result.strings.map(({ string }) => string.scaleLengthMm),
    );
  }

  function renderResultRow(result) {
    const nutAction = result.actionByFret[Math.min(1, result.actionByFret.length - 1)];
    const twelfthFret = result.actionByFret[Math.min(12, result.actionByFret.length - 1)];
    const peakErrorCents = calculateMaximumAbsoluteCentsError(
      result.intonation.centsErrorByFret,
    );
    return `<tr>
      <th scope="row">C${result.string.courseIndex + 1} · ${escapeMarkup(result.string.name)}</th>
      <td>${lengthUnits.format(result.string.gaugeMm)}</td>
      <td>${lengthUnits.format(result.string.scaleLengthMm)}</td>
      <td>${lengthUnits.format(nutAction.clearanceAboveFretMm)}</td>
      <td>${lengthUnits.format(twelfthFret.clearanceAboveFretMm)}</td>
      <td>${lengthUnits.format(result.intonation.nutCompensationMm)}</td>
      <td>${lengthUnits.format(result.intonation.saddleCompensationMm)}</td>
      <td>${peakErrorCents.toFixed(1)}¢</td>
      <td>${escapeMarkup(result.string.tensionSource?.manufacturer || "Gauge estimate")}</td>
    </tr>`;
  }

  function renderMobileResultsByCourse(stringResults) {
    const resultsByCourse = new Map();
    for (const result of stringResults) {
      const courseResults = resultsByCourse.get(result.string.courseIndex) || [];
      courseResults.push(result);
      resultsByCourse.set(result.string.courseIndex, courseResults);
    }
    return [...resultsByCourse.entries()].map(([courseIndex, courseResults]) => `
      <article class="mobile-result-course">
        <header><strong>Course ${courseIndex + 1}</strong><small>${courseResults.length} ${courseResults.length === 1 ? "string" : "strings"}</small></header>
        ${courseResults.map(renderMobileResultString).join("")}
      </article>
    `).join("");
  }

  function renderMobileResultString(result) {
    const nutAction = result.actionByFret[Math.min(1, result.actionByFret.length - 1)];
    const twelfthFret = result.actionByFret[Math.min(12, result.actionByFret.length - 1)];
    const peakErrorCents = calculateMaximumAbsoluteCentsError(
      result.intonation.centsErrorByFret,
    );
    const source = result.string.tensionSource?.manufacturer || "Gauge estimate";
    return `<section class="mobile-result-string">
      <header><strong>${escapeMarkup(result.string.name)}</strong><small>${lengthUnits.format(result.string.gaugeMm)} · ${lengthUnits.format(result.string.scaleLengthMm)} · ${escapeMarkup(source)}</small></header>
      <dl>
        <div><dt>Nut comp.</dt><dd>${lengthUnits.formatSigned(result.intonation.nutCompensationMm)}</dd></div>
        <div><dt>Saddle comp.</dt><dd>${lengthUnits.formatSigned(result.intonation.saddleCompensationMm)}</dd></div>
        <div><dt>Peak error</dt><dd>${peakErrorCents.toFixed(1)}¢</dd></div>
        <div><dt>Nut action</dt><dd>${lengthUnits.format(nutAction.clearanceAboveFretMm)}</dd></div>
        <div><dt>Open @ 12</dt><dd>${lengthUnits.format(twelfthFret.clearanceAboveFretMm)}</dd></div>
      </dl>
    </section>`;
  }

  return { clear, render };
}

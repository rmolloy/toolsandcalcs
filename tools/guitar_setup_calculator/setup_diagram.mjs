const SVG_WIDTH = 1000;
const STRING_TOP_Y = 88;
const MINIMUM_STRING_BOTTOM_Y = 302;
const PREFERRED_COURSE_GAP_PX = 24;
const NUT_ZERO_X = 170;
const NUT_THICKNESS_PX = 30;
const FRET_ONE_X = 424;
const FRET_TWELVE_X = 604;
const SADDLE_THEORETICAL_X = 835;
const SADDLE_THICKNESS_PX = 36;
const COMPENSATION_PX_PER_MM = 6;

export function renderSetupDiagram({ setup, result }) {
  const strings = result.strings;
  const layout = calculateDiagramLayout(strings);
  const yPositions = calculateStringYPositions(strings, layout);
  const scaleOffsets = calculateScaleOffsets(strings);
  const geometry = strings.map((stringResult, index) => calculateStringGeometry({
    stringResult,
    y: yPositions[index],
    scaleOffsetPx: scaleOffsets[index],
    neutralFret: setup.fanNeutralFret,
  }));
  const scaleMode = scaleOffsets.some((offset) => Math.abs(offset) > 0.01)
    ? "per-string"
    : "single-scale";
  const artwork = renderDiagramArtwork({ setup, strings, geometry, layout, scaleMode });
  const mobileNutArtwork = renderMobileNutArtwork({ setup, strings, geometry, layout });
  const mobileSaddleArtwork = renderMobileSaddleArtwork({ setup, strings, geometry, layout });

  return `
    <div class="geometry-diagram-set" data-string-count="${strings.length}" data-scale-mode="${scaleMode}" data-neutral-fret="${setup.fanNeutralFret}">
      <svg class="geometry-symbols" aria-hidden="true" width="0" height="0">
        <symbol id="setup-geometry-artwork" viewBox="0 0 ${SVG_WIDTH} ${layout.svgHeight}">${artwork}</symbol>
      </svg>
      <svg class="geometry-desktop-diagram" viewBox="0 0 ${SVG_WIDTH} ${layout.svgHeight}" role="img"
        aria-labelledby="geometry-svg-title geometry-svg-desc">
        <title id="geometry-svg-title">Calculated nut and saddle geometry</title>
        <desc id="geometry-svg-desc">A broken-scale top view of ${strings.length} strings, with calculated nut and saddle compensation for every physical string. Unequal string lengths fan around fret ${setup.fanNeutralFret}.</desc>
        <use href="#setup-geometry-artwork" width="${SVG_WIDTH}" height="${layout.svgHeight}" />
      </svg>
      <div class="geometry-mobile-diagrams">
        <svg viewBox="0 0 480 ${layout.svgHeight}" role="img" aria-label="Calculated nut compensation and first-fret geometry">
          ${mobileNutArtwork}
        </svg>
        <svg viewBox="520 0 480 ${layout.svgHeight}" role="img" aria-label="Calculated saddle compensation and twelfth-fret geometry">
          ${mobileSaddleArtwork}
        </svg>
      </div>
    </div>`;
}

function renderDiagramArtwork({ setup, strings, geometry, layout, scaleMode }) {
  return `
    <rect x="1" y="1" width="${SVG_WIDTH - 2}" height="${layout.svgHeight - 2}" rx="10" class="geometry-canvas" />
    ${renderWindowLabels(setup, scaleMode)}
    ${renderFingerboardWindows(layout)}
    ${renderScaleBreak(layout)}
    ${renderFretReferences(geometry, layout)}
    ${renderNut(geometry, layout)}
    ${renderSaddle(geometry, layout)}
    ${renderStrings(strings, geometry)}
    ${renderActionLabels(setup, layout)}
    ${renderInsertLabels(layout)}`;
}

function renderMobileNutArtwork({ setup, strings, geometry, layout }) {
  return `
    <rect x="1" y="1" width="478" height="${layout.svgHeight - 2}" rx="10" class="geometry-canvas" />
    <text x="126" y="30" class="geometry-window-label">NUT → FRET 1</text>
    ${renderNutFingerboardWindow(layout)}
    ${renderNutFretReference(geometry, layout)}
    ${renderNut(geometry, layout, false)}
    ${renderNutStrings(strings, geometry)}
    ${renderNutActionLabel(setup, layout)}
    ${renderNutInsertLabel(layout)}`;
}

function renderMobileSaddleArtwork({ setup, strings, geometry, layout }) {
  return `
    <rect x="521" y="1" width="478" height="${layout.svgHeight - 2}" rx="10" class="geometry-canvas" />
    <text x="880" y="30" text-anchor="end" class="geometry-window-label">12TH FRET → SADDLE</text>
    ${renderSaddleFingerboardWindow(layout)}
    ${renderSaddleFretReference(geometry, layout)}
    ${renderSaddle(geometry, layout, false)}
    ${renderSaddleStrings(strings, geometry)}
    ${renderSaddleActionLabel(setup, layout)}
    ${renderSaddleInsertLabel(layout)}`;
}

function renderNutFingerboardWindow(layout) {
  const windowBottomY = layout.stringBottomY + 28;
  return `<path d="M160 60 L446 60 L446 ${windowBottomY} L120 ${windowBottomY} Z" class="geometry-fingerboard" />`;
}

function renderSaddleFingerboardWindow(layout) {
  const windowBottomY = layout.stringBottomY + 28;
  return `<path d="M560 60 L824 60 L890 ${windowBottomY} L560 ${windowBottomY} Z" class="geometry-fingerboard" />`;
}

function renderNutFretReference(geometry, layout) {
  const labelY = layout.stringBottomY + 45;
  return `
    <polyline points="${pointsFor(geometry, "fretOneX")}" class="geometry-fret-reference" />
    <text x="421" y="${labelY}" text-anchor="middle" class="geometry-reference-label">FRET 1</text>`;
}

function renderSaddleFretReference(geometry, layout) {
  const labelY = layout.stringBottomY + 45;
  return `
    <polyline points="${pointsFor(geometry, "fretTwelveX")}" class="geometry-fret-reference" />
    <text x="604" y="${labelY}" text-anchor="middle" class="geometry-reference-label">FRET 12</text>`;
}

export function calculateStringYPositions(strings, layout = calculateDiagramLayout(strings)) {
  if (strings.length === 1) return [(layout.stringTopY + layout.stringBottomY) / 2];
  const gaps = calculateCourseGapWeights(strings);
  const totalGap = gaps.reduce((total, gap) => total + gap, 0);
  const availableHeight = layout.stringBottomY - layout.stringTopY;
  const positions = [layout.stringTopY];
  for (const gap of gaps) {
    positions.push(positions.at(-1) + availableHeight * gap / totalGap);
  }
  return positions;
}

function calculateDiagramLayout(strings) {
  const gapWeights = calculateCourseGapWeights(strings);
  const preferredPlotHeight = gapWeights.reduce((total, gap) => total + gap, 0)
    * PREFERRED_COURSE_GAP_PX;
  const stringBottomY = Math.max(
    MINIMUM_STRING_BOTTOM_Y,
    STRING_TOP_Y + preferredPlotHeight,
  );
  return {
    stringTopY: STRING_TOP_Y,
    stringBottomY,
    svgHeight: stringBottomY + 128,
  };
}

function calculateCourseGapWeights(strings) {
  return strings.slice(1).map((stringResult, index) => (
    stringResult.string.courseIndex === strings[index].string.courseIndex ? 0.65 : 1
  ));
}

function calculateScaleOffsets(strings) {
  const scaleLengths = strings.map(({ string }) => string.scaleLengthMm);
  const minimum = Math.min(...scaleLengths);
  const maximum = Math.max(...scaleLengths);
  const middle = (minimum + maximum) / 2;
  const range = maximum - minimum;
  if (range < 0.01) return scaleLengths.map(() => 0);
  const pixelsPerMm = Math.min(1.2, 70 / range);
  return scaleLengths.map((scaleLength) => (scaleLength - middle) * pixelsPerMm);
}

function calculateStringGeometry({ stringResult, y, scaleOffsetPx, neutralFret }) {
  const nutCompensationMm = stringResult.intonation.nutCompensationMm;
  const saddleCompensationMm = stringResult.intonation.saddleCompensationMm;
  const neutralPosition = calculateNormalizedFretPosition(neutralFret);
  const nutZeroX = NUT_ZERO_X - scaleOffsetPx * neutralPosition;
  const saddleTheoreticalX = SADDLE_THEORETICAL_X + scaleOffsetPx * (1 - neutralPosition);
  return {
    y,
    nutZeroX,
    nutX: nutZeroX + nutCompensationMm * COMPENSATION_PX_PER_MM,
    fretOneX: FRET_ONE_X + scaleOffsetPx * (calculateNormalizedFretPosition(1) - neutralPosition),
    fretTwelveX: FRET_TWELVE_X + scaleOffsetPx * (0.5 - neutralPosition),
    saddleTheoreticalX,
    saddleX: saddleTheoreticalX + saddleCompensationMm * COMPENSATION_PX_PER_MM,
    nutCompensationMm,
    saddleCompensationMm,
  };
}

function calculateNormalizedFretPosition(fretNumber) {
  if (!Number.isInteger(fretNumber) || fretNumber < 0) {
    throw new RangeError("fanNeutralFret must be a non-negative integer");
  }
  return 1 - 2 ** (-fretNumber / 12);
}

function renderWindowLabels(setup, scaleMode) {
  const scaleLengths = setup.strings.map(({ scaleLengthMm }) => scaleLengthMm);
  const scaleLabel = scaleMode === "per-string"
    ? `${Math.min(...scaleLengths).toFixed(1)}–${Math.max(...scaleLengths).toFixed(1)} mm · neutral fret ${setup.fanNeutralFret}`
    : `${scaleLengths[0].toFixed(1)} mm scale`;
  return `
    <text x="126" y="30" class="geometry-window-label">NUT → FRET 1</text>
    <text x="880" y="30" text-anchor="end" class="geometry-window-label">12TH FRET → SADDLE</text>
    <text x="500" y="30" text-anchor="middle" class="geometry-scale-label">${scaleLabel}</text>`;
}

function renderFingerboardWindows(layout) {
  const windowBottomY = layout.stringBottomY + 28;
  return `
    <path d="M160 60 L446 60 L446 ${windowBottomY} L120 ${windowBottomY} Z" class="geometry-fingerboard" />
    <path d="M560 60 L824 60 L890 ${windowBottomY} L560 ${windowBottomY} Z" class="geometry-fingerboard" />`;
}

function renderScaleBreak(layout) {
  const middleY = (layout.stringTopY + layout.stringBottomY) / 2;
  const topY = middleY - 43;
  return `
    <path d="M496 ${topY} l-16 18 16 18 -16 18 16 18 M522 ${topY} l-16 18 16 18 -16 18 16 18" class="geometry-break" />
    <text x="501" y="${middleY + 57}" text-anchor="middle" class="geometry-scale-label">scale continues</text>`;
}

function renderFretReferences(geometry, layout) {
  const labelY = layout.stringBottomY + 45;
  return `
    <polyline points="${pointsFor(geometry, "fretOneX")}" class="geometry-fret-reference" />
    <polyline points="${pointsFor(geometry, "fretTwelveX")}" class="geometry-fret-reference" />
    <text x="421" y="${labelY}" text-anchor="middle" class="geometry-reference-label">FRET 1</text>
    <text x="604" y="${labelY}" text-anchor="middle" class="geometry-reference-label">FRET 12</text>`;
}

function renderNut(geometry, layout, includeDataAttributes = true) {
  const nutY = layout.stringTopY - 15;
  const nutHeight = layout.stringBottomY - layout.stringTopY + 30;
  const fittedCenter = fitLineToPoints(geometry.map(({ y, nutZeroX }) => ({ x: nutZeroX, y })));
  const bottomY = nutY + nutHeight;
  const halfThickness = NUT_THICKNESS_PX / 2;
  const topX = fittedCenter(nutY);
  const bottomX = fittedCenter(bottomY);
  const insertPoints = [
    `${topX - halfThickness},${nutY}`,
    `${topX + halfThickness},${nutY}`,
    `${bottomX + halfThickness},${bottomY}`,
    `${bottomX - halfThickness},${bottomY}`,
  ].join(" ");
  return `
    <g class="geometry-nut-model" aria-label="5 millimetre nut insert">
      <polygon points="${insertPoints}" class="geometry-insert-surface" />
      <polyline points="${pointsFor(geometry, "nutZeroX")}" class="geometry-zero-reference" />
      <text x="${geometry[0].nutZeroX}" y="${nutY - 13}" text-anchor="middle" class="geometry-zero-label">0</text>
      <text x="${geometry[0].nutZeroX + 12}" y="${nutY - 13}" class="geometry-direction-label">+ toward fret 1 →</text>
      ${geometry.map(({ y, nutZeroX, nutX: compensatedX, nutCompensationMm }, index) => `
        <line x1="${nutZeroX}" y1="${y}" x2="${compensatedX}" y2="${y}" class="geometry-compensation"${dataAttribute("nut-compensation", index, includeDataAttributes)} />
        <circle cx="${compensatedX}" cy="${y}" r="2.6" class="geometry-break-point" />
        <text x="${Math.min(nutZeroX, compensatedX) - halfThickness - 7}" y="${y + 3.5}" text-anchor="end" class="geometry-value-label">${formatSignedMm(nutCompensationMm)}</text>
      `).join("")}
      <polygon points="${insertPoints}" class="geometry-insert-outline" />
    </g>`;
}

function renderSaddle(geometry, layout, includeDataAttributes = true) {
  const fittedCenter = fitLineToPoints(geometry.map(({ y, saddleX }) => ({ x: saddleX, y })));
  const topY = layout.stringTopY - 15;
  const bottomY = layout.stringBottomY + 15;
  const halfThickness = SADDLE_THICKNESS_PX / 2;
  const topX = fittedCenter(topY);
  const bottomX = fittedCenter(bottomY);
  const insertPoints = [
    `${topX - halfThickness},${topY}`,
    `${topX + halfThickness},${topY}`,
    `${bottomX + halfThickness},${bottomY}`,
    `${bottomX - halfThickness},${bottomY}`,
  ].join(" ");
  return `
    <g class="geometry-saddle-model" aria-label="6 millimetre saddle insert">
      <polygon points="${insertPoints}" class="geometry-insert-surface" />
      <polyline points="${pointsFor(geometry, "saddleTheoreticalX")}" class="geometry-zero-reference" />
      <text x="${geometry[0].saddleTheoreticalX + 7}" y="${topY - 13}" class="geometry-direction-label">+ lengthen →</text>
      ${geometry.map(({ y, saddleTheoreticalX, saddleX, saddleCompensationMm }, index) => `
        <line x1="${saddleTheoreticalX}" y1="${y}" x2="${saddleX}" y2="${y}" class="geometry-compensation"${dataAttribute("saddle-compensation", index, includeDataAttributes)} />
        <circle cx="${saddleX}" cy="${y}" r="2.6" class="geometry-break-point" />
        <text x="${Math.max(saddleTheoreticalX, saddleX) + 8}" y="${y + 3.5}" class="geometry-value-label">${formatSignedMm(saddleCompensationMm)}</text>
      `).join("")}
      <polygon points="${insertPoints}" class="geometry-insert-outline" />
    </g>`;
}

function renderStrings(strings, geometry) {
  return `<g class="geometry-strings">${strings.map((stringResult, index) => {
    const stringGeometry = geometry[index];
    return `
      <g data-string-index="${index}" data-course-index="${stringResult.string.courseIndex}">
        <text x="22" y="${stringGeometry.y + 3.5}" class="geometry-course-label">C${stringResult.string.courseIndex + 1}</text>
        <text x="49" y="${stringGeometry.y + 3.5}" class="geometry-string-label">${escapeMarkup(stringResult.string.name)}</text>
        <text x="528" y="${stringGeometry.y + 3.5}" class="geometry-mobile-only geometry-course-label">C${stringResult.string.courseIndex + 1}</text>
        <text x="554" y="${stringGeometry.y + 3.5}" class="geometry-mobile-only geometry-string-label">${escapeMarkup(stringResult.string.name)}</text>
        <path d="M${stringGeometry.nutX} ${stringGeometry.y} L${stringGeometry.fretOneX} ${stringGeometry.y}" style="stroke-width:${stringStrokeWidth(stringResult)}" />
        <path d="M${stringGeometry.fretTwelveX} ${stringGeometry.y} L${stringGeometry.saddleX} ${stringGeometry.y}" style="stroke-width:${stringStrokeWidth(stringResult)}" />
      </g>`;
  }).join("")}</g>`;
}

function renderNutStrings(strings, geometry) {
  return `<g class="geometry-strings">${strings.map((stringResult, index) => {
    const stringGeometry = geometry[index];
    return `
      <g>
        <text x="22" y="${stringGeometry.y + 3.5}" class="geometry-course-label">C${stringResult.string.courseIndex + 1}</text>
        <text x="49" y="${stringGeometry.y + 3.5}" class="geometry-string-label">${escapeMarkup(stringResult.string.name)}</text>
        <path d="M${stringGeometry.nutX} ${stringGeometry.y} L${stringGeometry.fretOneX} ${stringGeometry.y}" style="stroke-width:${stringStrokeWidth(stringResult)}" />
      </g>`;
  }).join("")}</g>`;
}

function renderSaddleStrings(strings, geometry) {
  return `<g class="geometry-strings">${strings.map((stringResult, index) => {
    const stringGeometry = geometry[index];
    return `
      <g>
        <text x="528" y="${stringGeometry.y + 3.5}" class="geometry-course-label">C${stringResult.string.courseIndex + 1}</text>
        <text x="554" y="${stringGeometry.y + 3.5}" class="geometry-string-label">${escapeMarkup(stringResult.string.name)}</text>
        <path d="M${stringGeometry.fretTwelveX} ${stringGeometry.y} L${stringGeometry.saddleX} ${stringGeometry.y}" style="stroke-width:${stringStrokeWidth(stringResult)}" />
      </g>`;
  }).join("")}</g>`;
}

function stringStrokeWidth(stringResult) {
  return Math.min(4.2, 1.1 + stringResult.string.gaugeMm * 1.55);
}

function renderActionLabels(setup, layout) {
  const nutAction = setup.benchActionTargets.nutActionAtFirstFretMm;
  const bridgeAction = setup.benchActionTargets.actionAtMeasurementWithCapoMm;
  const headingY = layout.stringBottomY + 80;
  const valueY = layout.stringBottomY + 99;
  return `
    <g class="geometry-action-labels">
      <text x="282" y="${headingY}" text-anchor="middle">NUT ACTION @ FRET 1 · OPEN</text>
      <text x="282" y="${valueY}" text-anchor="middle" class="geometry-action-value">first ${nutAction.firstStringMm.toFixed(2)} · last ${nutAction.lastStringMm.toFixed(2)} mm</text>
      <text x="718" y="${headingY}" text-anchor="middle">ACTION @ FRET 12 · CAPO 1</text>
      <text x="718" y="${valueY}" text-anchor="middle" class="geometry-action-value">first ${bridgeAction.firstStringMm.toFixed(2)} · last ${bridgeAction.lastStringMm.toFixed(2)} mm</text>
    </g>`;
}

function renderNutActionLabel(setup, layout) {
  const nutAction = setup.benchActionTargets.nutActionAtFirstFretMm;
  const headingY = layout.stringBottomY + 80;
  return `
    <g class="geometry-action-labels">
      <text x="282" y="${headingY}" text-anchor="middle">NUT ACTION @ FRET 1 · OPEN</text>
      <text x="282" y="${headingY + 19}" text-anchor="middle" class="geometry-action-value">first ${nutAction.firstStringMm.toFixed(2)} · last ${nutAction.lastStringMm.toFixed(2)} mm</text>
    </g>`;
}

function renderSaddleActionLabel(setup, layout) {
  const bridgeAction = setup.benchActionTargets.actionAtMeasurementWithCapoMm;
  const headingY = layout.stringBottomY + 80;
  return `
    <g class="geometry-action-labels">
      <text x="718" y="${headingY}" text-anchor="middle">ACTION @ FRET 12 · CAPO 1</text>
      <text x="718" y="${headingY + 19}" text-anchor="middle" class="geometry-action-value">first ${bridgeAction.firstStringMm.toFixed(2)} · last ${bridgeAction.lastStringMm.toFixed(2)} mm</text>
    </g>`;
}

function renderInsertLabels(layout) {
  const labelY = layout.stringBottomY + 45;
  return `
    <text x="170" y="${labelY}" text-anchor="middle" class="geometry-insert-label">NUT · 5 MM</text>
    <text x="838" y="${labelY}" text-anchor="middle" class="geometry-insert-label">SADDLE · 6 MM</text>`;
}

function renderNutInsertLabel(layout) {
  return `<text x="170" y="${layout.stringBottomY + 45}" text-anchor="middle" class="geometry-insert-label">NUT · 5 MM</text>`;
}

function renderSaddleInsertLabel(layout) {
  return `<text x="838" y="${layout.stringBottomY + 45}" text-anchor="middle" class="geometry-insert-label">SADDLE · 6 MM</text>`;
}

function dataAttribute(name, index, isIncluded) {
  return isIncluded ? ` data-${name}="${index}"` : "";
}

function pointsFor(geometry, xField) {
  return geometry.map((point) => `${point[xField]},${point.y}`).join(" ");
}

function fitLineToPoints(points) {
  if (points.length === 1) return () => points[0].x;
  const meanY = average(points.map(({ y }) => y));
  const meanX = average(points.map(({ x }) => x));
  const denominator = points.reduce((total, { y }) => total + (y - meanY) ** 2, 0);
  const slope = denominator === 0 ? 0 : points.reduce(
    (total, { x, y }) => total + (y - meanY) * (x - meanX),
    0,
  ) / denominator;
  return (y) => meanX + slope * (y - meanY);
}

function average(values) {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function formatSignedMm(value) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}`;
}

function escapeMarkup(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

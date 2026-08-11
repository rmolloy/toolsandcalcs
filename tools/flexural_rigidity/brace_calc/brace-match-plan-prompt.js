(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.BraceMatchPlanPrompt = void 0;
    exports.braceMatchPlanPromptOpen = braceMatchPlanPromptOpen;
    exports.braceMatchPlanStockDisclosureStartsOpen = braceMatchPlanStockDisclosureStartsOpen;
    exports.braceMatchPlanModulusCalculate = braceMatchPlanModulusCalculate;
    function braceMatchPlanPromptOpen(config) {
        const modal = document.createElement("div");
        modal.className = "save-modal brace-match-plan-modal";
        modal.innerHTML = braceMatchPlanPromptMarkupBuild(config.material, config.materialOrigin, config.top);
        document.body.appendChild(modal);
        braceMatchPlanPromptControllerAttach(modal, config);
        return modal;
    }
    function braceMatchPlanPromptMarkupBuild(material, materialOrigin, top) {
        const initialMaterialLabel = braceMatchPlanInitialMaterialLabel(materialOrigin);
        const restoreMaterialLabel = materialOrigin === "transferred"
            ? "Restore transferred values"
            : "Restore starter values";
        return `
    <div class="save-modal__backdrop" data-match-plan-close></div>
    <div class="save-modal__panel brace-match-plan-modal__panel" role="dialog" aria-modal="true" aria-label="Match brace plan">
      <header class="brace-match-plan-header">
        <div>
          <h2>Match braces to stock</h2>
          <p class="muted small">Cut this brace stock to recover the plan's total rigidity with your actual top.</p>
        </div>
        <button type="button" class="ghost-btn brace-match-plan-close" data-match-plan-close aria-label="Close" title="Close">×</button>
      </header>
      ${braceMatchPlanSystemStatusMarkupBuild(top)}
      <div class="brace-match-plan-workbench">
        ${braceMatchPlanResultsMarkupBuild()}
        <aside class="brace-match-plan-inputs" aria-label="Match inputs">
          ${braceMatchPlanTopMarkupBuild(top)}
          ${braceMatchPlanStockMarkupBuild(material, initialMaterialLabel, restoreMaterialLabel)}
          ${braceMatchPlanSettingsMarkupBuild()}
        </aside>
      </div>
      <footer class="save-modal__footer brace-match-plan-footer">
        <div>
          <button type="button" class="ghost-btn" data-match-plan-revert hidden>Revert preview</button>
        </div>
        <div class="brace-match-plan-footer-actions">
          <button type="button" class="ghost-btn" data-match-plan-close>Cancel</button>
          <button type="button" class="ghost-btn" data-match-plan-preview>Preview</button>
          <button type="button" class="primary-btn" data-match-plan-apply>Apply to braces</button>
        </div>
      </footer>
    </div>
  `;
    }
    function braceMatchPlanResultsMarkupBuild() {
        return `
      <section class="brace-match-plan-results">
        <div class="brace-match-plan-results-heading">
          <h3>Brace cuts</h3>
        </div>
        <div class="brace-match-plan-rows" data-match-plan-rows></div>
      </section>`;
    }
    function braceMatchPlanStockMarkupBuild(material, initialMaterialLabel, restoreMaterialLabel) {
        const modulusGPa = braceMatchPlanModulusCalculate(material.densityKgM3, material.longFrequencyHz, material.specimenLengthMm, material.specimenHeightMm);
        const soundSpeedMps = Math.sqrt((modulusGPa * 1e9) / material.densityKgM3);
        return `
      <details class="brace-match-plan-disclosure" data-match-plan-stock-disclosure open>
        <summary>
          <span>Brace stock</span>
          <span class="brace-match-plan-provenance" data-match-plan-provenance>${initialMaterialLabel}</span>
        </summary>
        <section class="save-modal__section brace-match-plan-disclosure-content">
          <div>
            <p class="muted small">Long frequency and specimen measurements determine the stock used for the proposed cuts.</p>
          </div>
          <div class="brace-match-plan-material-grid">
            <label class="stack-field">
              <span>Density (kg/m³)</span>
              <input name="match-plan-density" type="number" inputmode="decimal" min="1" step="1" value="${material.densityKgM3}">
            </label>
            <label class="stack-field">
              <span>Long mode (Hz)</span>
              <input name="match-plan-long-frequency" type="number" inputmode="decimal" min="0.01" step="0.1" value="${material.longFrequencyHz}">
            </label>
            <label class="stack-field">
              <span>Specimen length (mm)</span>
              <input name="match-plan-specimen-length" type="number" inputmode="decimal" min="0.1" step="0.1" value="${material.specimenLengthMm}">
            </label>
            <label class="stack-field">
              <span>Specimen width (mm)</span>
              <input name="match-plan-specimen-width" type="number" inputmode="decimal" min="0.1" step="0.1" value="${material.specimenWidthMm}">
            </label>
            <label class="stack-field">
              <span>Specimen height (mm)</span>
              <input name="match-plan-specimen-height" type="number" inputmode="decimal" min="0.1" step="0.1" value="${material.specimenHeightMm}">
            </label>
            <label class="stack-field">
              <span>Specimen mass (g)</span>
              <input name="match-plan-specimen-mass" type="number" inputmode="decimal" min="0.01" step="0.01" value="${material.specimenMassG}">
            </label>
          </div>
          <div class="brace-match-plan-evidence brace-match-plan-stock-evidence">
            <div><span>Method</span><strong>Free-free</strong></div>
            <div><span>Long-grain E</span><strong data-match-plan-modulus>${modulusGPa.toFixed(2)} GPa</strong></div>
            <div><span>Sound speed</span><strong data-match-plan-sound-speed>${Math.round(soundSpeedMps).toLocaleString()} m/s</strong></div>
          </div>
          <button type="button" class="ghost-btn btn-small" data-match-plan-restore-material>${restoreMaterialLabel}</button>
        </section>
      </details>`;
    }
    function braceMatchPlanSettingsMarkupBuild() {
        return `
      <details class="brace-match-plan-disclosure">
        <summary>
          <span>Match settings</span>
          <span class="small muted">0.10 mm · stiffness and weight</span>
        </summary>
        <section class="save-modal__section brace-match-plan-controls brace-match-plan-disclosure-content">
          <label class="stack-field">
            <span>Cut increment</span>
            <select name="match-plan-increment">
              <option value="0.05">0.05 mm</option>
              <option value="0.1" selected>0.10 mm</option>
              <option value="0.5">0.50 mm</option>
            </select>
          </label>
          <label class="stack-field">
            <span>Match policy</span>
            <select name="match-plan-policy">
              <option value="match-stiffness-and-weight">Stiffness and weight</option>
              <option value="keep-width">Keep width</option>
            </select>
          </label>
          <label class="stack-field" data-match-plan-fixed-width hidden>
            <span>Fixed width</span>
            <input type="number" name="match-plan-fixed-breadth" value="6" min="0.1" step="0.1">
          </label>
          <label class="stack-field">
            <span>Minimum width</span>
            <input type="number" name="match-plan-minimum-breadth" value="0" min="0" step="0.1">
          </label>
          <label class="stack-field">
            <span>Minimum height</span>
            <input type="number" name="match-plan-minimum-height" value="0" min="0" step="0.1">
          </label>
        </section>
      </details>`;
    }
    function braceMatchPlanSystemStatusMarkupBuild(top) {
        if (!top)
            return "";
        return `
      <section class="save-modal__section" data-match-plan-system-status>
        <div class="brace-match-plan-evidence">
          <div><span>Plan target</span><strong data-match-plan-target-ei>—</strong></div>
          <div><span>Proposed system</span><strong data-match-plan-proposed-ei>—</strong></div>
          <div><span>Difference</span><strong data-match-plan-system-difference>—</strong></div>
        </div>
        <p class="small muted" data-match-plan-system-message></p>
      </section>`;
    }
    function braceMatchPlanTopMarkupBuild(top) {
        if (!top)
            return "";
        return `
      <section class="save-modal__section brace-match-plan-top" data-match-plan-top>
        <div class="brace-match-plan-section-heading">
          <div>
            <h3>Actual top</h3>
            <p class="small muted">Held fixed while the braces are resized to recover the plan system rigidity.</p>
          </div>
        </div>
        <div class="brace-match-plan-material-grid">
          <label class="stack-field">
            <span>Top thickness (mm)</span>
            <input name="match-plan-top-thickness" type="number" inputmode="decimal" min="0.01" step="0.01" value="${top.thicknessMm}">
          </label>
          <label class="stack-field">
            <span>Top modulus E (GPa)</span>
            <input name="match-plan-top-modulus" type="number" inputmode="decimal" min="0.01" step="0.01" value="${top.modulusGPa}">
          </label>
        </div>
      </section>`;
    }
    function braceMatchPlanPromptControllerAttach(modal, config) {
        var _a, _b, _c, _d, _e, _f, _g;
        braceMatchPlanDisclosureDefaultsSet(modal);
        const increment = modal.querySelector('[name="match-plan-increment"]');
        const policy = modal.querySelector('[name="match-plan-policy"]');
        const fixedBreadth = modal.querySelector('[name="match-plan-fixed-breadth"]');
        const minimumBreadth = modal.querySelector('[name="match-plan-minimum-breadth"]');
        const minimumHeight = modal.querySelector('[name="match-plan-minimum-height"]');
        const fixedWidthField = modal.querySelector("[data-match-plan-fixed-width]");
        const revert = modal.querySelector("[data-match-plan-revert]");
        const restoreMaterial = modal.querySelector("[data-match-plan-restore-material]");
        const preview = modal.querySelector("[data-match-plan-preview]");
        const apply = modal.querySelector("[data-match-plan-apply]");
        const transferredMaterial = structuredClone(config.material);
        const includedBraceIds = new Set();
        let material = braceMatchPlanMaterialRead(modal, transferredMaterial);
        let top = braceMatchPlanTopRead(modal, config.top);
        let plans = braceMatchPlanPromptPlansResolve(config, modal, material, top);
        plans.forEach((plan) => includedBraceIds.add(plan.id));
        let previewActive = false;
        braceMatchPlanRowsRender(modal, plans, includedBraceIds, Boolean(config.systemStateRead));
        braceMatchPlanApplyLabelWrite(apply, includedBraceIds.size, Boolean(config.systemStateRead));
        braceMatchPlanSystemStateWrite(modal, (_b = (_a = config.systemStateRead) === null || _a === void 0 ? void 0 : _a.call(config)) !== null && _b !== void 0 ? _b : null, preview, apply);
        const refresh = () => {
            var _a, _b;
            material = braceMatchPlanMaterialRead(modal, transferredMaterial);
            top = braceMatchPlanTopRead(modal, config.top);
            plans = braceMatchPlanPromptPlansResolve(config, modal, material, top, config.systemStateRead ? [...includedBraceIds] : undefined);
            braceMatchPlanRowsRender(modal, plans, includedBraceIds, Boolean(config.systemStateRead));
            braceMatchPlanMaterialEvidenceWrite(modal, material, transferredMaterial, config.materialOrigin);
            braceMatchPlanApplyLabelWrite(apply, includedBraceIds.size, Boolean(config.systemStateRead));
            braceMatchPlanSystemStateWrite(modal, (_b = (_a = config.systemStateRead) === null || _a === void 0 ? void 0 : _a.call(config)) !== null && _b !== void 0 ? _b : null, preview, apply);
            if (previewActive)
                braceMatchPlanPreview(config, plans, includedBraceIds, top);
        };
        [increment, fixedBreadth, minimumBreadth, minimumHeight].forEach((control) => {
            control.addEventListener("change", refresh);
        });
        policy.addEventListener("change", () => {
            fixedWidthField.hidden = policy.value !== "keep-width";
            refresh();
        });
        (_c = modal.querySelector('[name="match-plan-top-thickness"]')) === null || _c === void 0 ? void 0 : _c.addEventListener("change", refresh);
        (_d = modal.querySelector('[name="match-plan-top-modulus"]')) === null || _d === void 0 ? void 0 : _d.addEventListener("change", refresh);
        (_e = modal.querySelector('[name="match-plan-long-frequency"]')) === null || _e === void 0 ? void 0 : _e.addEventListener("change", refresh);
        (_f = modal.querySelector('[name="match-plan-density"]')) === null || _f === void 0 ? void 0 : _f.addEventListener("change", () => {
            braceMatchPlanSpecimenMassWriteFromDensity(modal);
            refresh();
        });
        modal.querySelectorAll([
            '[name="match-plan-specimen-length"]',
            '[name="match-plan-specimen-width"]',
            '[name="match-plan-specimen-height"]',
            '[name="match-plan-specimen-mass"]',
        ].join(", ")).forEach((control) => {
            control.addEventListener("change", () => {
                braceMatchPlanDensityWriteFromSpecimen(modal);
                refresh();
            });
        });
        restoreMaterial.addEventListener("click", () => {
            braceMatchPlanMaterialWrite(modal, transferredMaterial);
            refresh();
        });
        modal.addEventListener("click", (event) => {
            var _a, _b;
            const option = event.target
                .closest("[data-match-plan-action-value]");
            if (!option)
                return;
            const action = option.closest("[data-match-plan-action]");
            if (!action)
                return;
            if (option.dataset.matchPlanActionValue === "resize") {
                includedBraceIds.add((_a = action.dataset.braceId) !== null && _a !== void 0 ? _a : "");
            }
            else {
                includedBraceIds.delete((_b = action.dataset.braceId) !== null && _b !== void 0 ? _b : "");
            }
            refresh();
        });
        modal.addEventListener("change", (event) => {
            const checkbox = event.target
                .closest("[data-match-plan-include]");
            if (!checkbox)
                return;
            if (checkbox.checked)
                includedBraceIds.add(checkbox.value);
            else
                includedBraceIds.delete(checkbox.value);
            braceMatchPlanApplyLabelWrite(apply, includedBraceIds.size, false);
            if (previewActive)
                braceMatchPlanPreview(config, plans, includedBraceIds, top);
        });
        preview.addEventListener("click", () => {
            braceMatchPlanPreview(config, plans, includedBraceIds, top);
            previewActive = true;
            revert.hidden = false;
        });
        revert.addEventListener("click", () => {
            config.revert();
            previewActive = false;
            revert.hidden = true;
        });
        (_g = modal.querySelector("[data-match-plan-apply]")) === null || _g === void 0 ? void 0 : _g.addEventListener("click", () => {
            const includedPlans = braceMatchPlanPlansFilter(plans, includedBraceIds);
            if (top)
                config.commit(includedPlans, previewActive, top);
            else
                config.commit(includedPlans, previewActive);
            previewActive = false;
            modal.remove();
        });
        modal.querySelectorAll("[data-match-plan-close]").forEach((element) => {
            element.addEventListener("click", () => {
                if (previewActive)
                    config.revert();
                modal.remove();
            });
        });
    }
    function braceMatchPlanDisclosureDefaultsSet(modal) {
        const stock = modal.querySelector("[data-match-plan-stock-disclosure]");
        if (stock)
            stock.open = braceMatchPlanStockDisclosureStartsOpen(window.innerWidth);
    }
    function braceMatchPlanStockDisclosureStartsOpen(viewportWidth) {
        return viewportWidth > 1100;
    }
    function braceMatchPlanPreview(config, plans, includedBraceIds, top) {
        const includedPlans = braceMatchPlanPlansFilter(plans, includedBraceIds);
        if (top)
            config.preview(includedPlans, top);
        else
            config.preview(includedPlans);
    }
    function braceMatchPlanSystemStateWrite(modal, state, preview, apply) {
        if (!state)
            return;
        const write = (selector, value) => {
            const element = modal.querySelector(selector);
            if (element)
                element.textContent = value;
        };
        write("[data-match-plan-target-ei]", `${state.targetEINm2.toFixed(3)} N·m²`);
        write("[data-match-plan-proposed-ei]", `${state.proposedEINm2.toFixed(3)} N·m²`);
        write("[data-match-plan-system-difference]", `${state.systemDifferencePercent >= 0 ? "+" : ""}${state.systemDifferencePercent.toFixed(2)}%`);
        write("[data-match-plan-system-message]", state.message);
        preview.disabled = !state.feasible;
        apply.disabled = !state.feasible;
    }
    function braceMatchPlanPromptPlansResolve(config, modal, material, top, adjustableBraceIds) {
        const options = braceMatchPlanPromptOptionsRead(modal);
        if (!top)
            return config.plansResolve(options, material);
        return adjustableBraceIds
            ? config.plansResolve(options, material, top, adjustableBraceIds)
            : config.plansResolve(options, material, top);
    }
    function braceMatchPlanTopRead(modal, fallback) {
        if (!fallback)
            return undefined;
        return {
            thicknessMm: braceMatchPlanPositiveNumberRead(modal, "match-plan-top-thickness"),
            modulusGPa: braceMatchPlanPositiveNumberRead(modal, "match-plan-top-modulus"),
        };
    }
    function braceMatchPlanMaterialRead(modal, evidence) {
        const densityKgM3 = braceMatchPlanPositiveNumberRead(modal, "match-plan-density");
        const longFrequencyHz = braceMatchPlanPositiveNumberRead(modal, "match-plan-long-frequency");
        const specimenLengthMm = braceMatchPlanPositiveNumberRead(modal, "match-plan-specimen-length");
        const specimenHeightMm = braceMatchPlanPositiveNumberRead(modal, "match-plan-specimen-height");
        const modulusGPa = braceMatchPlanModulusCalculate(densityKgM3, longFrequencyHz, specimenLengthMm, specimenHeightMm);
        return {
            ...evidence,
            densityKgM3,
            modulusGPa,
            longFrequencyHz,
            specimenLengthMm,
            specimenWidthMm: braceMatchPlanPositiveNumberRead(modal, "match-plan-specimen-width"),
            specimenHeightMm,
            specimenMassG: braceMatchPlanPositiveNumberRead(modal, "match-plan-specimen-mass"),
            soundSpeedMps: Math.sqrt((modulusGPa * 1e9) / densityKgM3),
        };
    }
    function braceMatchPlanDensityWriteFromSpecimen(modal) {
        const volumeM3 = braceMatchPlanSpecimenVolumeCalculate(modal);
        const massKg = braceMatchPlanPositiveNumberRead(modal, "match-plan-specimen-mass") / 1000;
        const density = modal.querySelector('[name="match-plan-density"]');
        if (density)
            density.value = String(massKg / volumeM3);
    }
    function braceMatchPlanSpecimenMassWriteFromDensity(modal) {
        const densityKgM3 = braceMatchPlanPositiveNumberRead(modal, "match-plan-density");
        const mass = modal.querySelector('[name="match-plan-specimen-mass"]');
        if (mass)
            mass.value = String(densityKgM3 * braceMatchPlanSpecimenVolumeCalculate(modal) * 1000);
    }
    function braceMatchPlanSpecimenVolumeCalculate(modal) {
        const lengthM = braceMatchPlanPositiveNumberRead(modal, "match-plan-specimen-length") / 1000;
        const widthM = braceMatchPlanPositiveNumberRead(modal, "match-plan-specimen-width") / 1000;
        const heightM = braceMatchPlanPositiveNumberRead(modal, "match-plan-specimen-height") / 1000;
        return lengthM * widthM * heightM;
    }
    function braceMatchPlanModulusCalculate(densityKgM3, longFrequencyHz, specimenLengthMm, specimenHeightMm) {
        const lengthM = specimenLengthMm / 1000;
        const heightM = specimenHeightMm / 1000;
        const correctionFactor = 1 + 6.585 * Math.pow(heightM / lengthM, 2);
        return 0.9465
            * densityKgM3
            * Math.pow(longFrequencyHz, 2)
            * Math.pow(lengthM, 4)
            / Math.pow(heightM, 2)
            * correctionFactor
            / 1000000000;
    }
    function braceMatchPlanMaterialWrite(modal, material) {
        const values = {
            "match-plan-density": String(material.densityKgM3),
            "match-plan-long-frequency": String(material.longFrequencyHz),
            "match-plan-specimen-length": String(material.specimenLengthMm),
            "match-plan-specimen-width": String(material.specimenWidthMm),
            "match-plan-specimen-height": String(material.specimenHeightMm),
            "match-plan-specimen-mass": String(material.specimenMassG),
        };
        Object.entries(values).forEach(([name, value]) => {
            const input = modal.querySelector(`[name="${name}"]`);
            if (input)
                input.value = value;
        });
    }
    function braceMatchPlanMaterialEvidenceWrite(modal, material, transferred, materialOrigin) {
        const modulus = modal.querySelector("[data-match-plan-modulus]");
        const soundSpeed = modal.querySelector("[data-match-plan-sound-speed]");
        const provenance = modal.querySelector("[data-match-plan-provenance]");
        if (modulus)
            modulus.textContent = `${material.modulusGPa.toFixed(2)} GPa`;
        if (soundSpeed)
            soundSpeed.textContent = `${Math.round(material.soundSpeedMps).toLocaleString()} m/s`;
        if (provenance) {
            provenance.textContent = braceMatchPlanMaterialMatches(material, transferred)
                ? braceMatchPlanInitialMaterialLabel(materialOrigin)
                : "Edited here";
        }
    }
    function braceMatchPlanInitialMaterialLabel(materialOrigin) {
        return materialOrigin === "transferred" ? "Transferred" : "Starter values";
    }
    function braceMatchPlanMaterialMatches(left, right) {
        return left.densityKgM3 === right.densityKgM3
            && left.longFrequencyHz === right.longFrequencyHz
            && left.specimenLengthMm === right.specimenLengthMm
            && left.specimenWidthMm === right.specimenWidthMm
            && left.specimenHeightMm === right.specimenHeightMm
            && left.specimenMassG === right.specimenMassG;
    }
    function braceMatchPlanPositiveNumberRead(modal, name) {
        var _a;
        const value = Number((_a = modal.querySelector(`[name="${name}"]`)) === null || _a === void 0 ? void 0 : _a.value);
        return Number.isFinite(value) && value > 0 ? value : 0.01;
    }
    function braceMatchPlanApplyLabelWrite(button, count, systemMatch) {
        if (!systemMatch) {
            button.textContent = `Apply to ${count} ${count === 1 ? "brace" : "braces"}`;
            return;
        }
        button.textContent = count === 0
            ? "Apply top only"
            : `Apply ${count} ${count === 1 ? "change" : "changes"}`;
    }
    function braceMatchPlanRowsRender(modal, plans, includedBraceIds, systemMatch) {
        const rows = modal.querySelector("[data-match-plan-rows]");
        if (!rows)
            return;
        rows.innerHTML = plans
            .map((plan) => braceMatchPlanRowMarkupBuild(plan, includedBraceIds, systemMatch))
            .join("");
    }
    function braceMatchPlanRowMarkupBuild(plan, includedBraceIds, systemMatch) {
        return `
    <article class="brace-match-plan-row" data-match-plan-row data-brace-id="${braceMatchPlanTextEscape(plan.id)}">
      <div class="brace-match-plan-row-name">
        <strong>${braceMatchPlanTextEscape(plan.name)}</strong>
      </div>
      <div class="brace-match-plan-row-dimensions">
        <strong>${braceMatchPlanSegmentsFormat(plan.planned.segments)}</strong>
        <span class="brace-match-plan-row-arrow" aria-hidden="true">→</span>
        <strong class="brace-match-plan-row-proposed" data-match-plan-proposed-cut>${braceMatchPlanProposedCutFormat(plan, includedBraceIds, systemMatch)}</strong>
        <small>EI ${braceMatchPlanDifferenceFormat(plan.rigidityDifferencePercent)} · mass ${braceMatchPlanDifferenceFormat(plan.massDifferencePercent)}</small>
      </div>
      <div class="brace-match-plan-row-action">
        ${braceMatchPlanActionMarkupBuild(plan, includedBraceIds, systemMatch)}
      </div>
    </article>`;
    }
    function braceMatchPlanActionMarkupBuild(plan, includedBraceIds, systemMatch) {
        const id = braceMatchPlanTextEscape(plan.id);
        const name = braceMatchPlanTextEscape(plan.name);
        if (!systemMatch) {
            return `<input type="checkbox" data-match-plan-include value="${id}" ${includedBraceIds.has(plan.id) ? "checked" : ""} aria-label="Include ${name}">`;
        }
        return `
    <div class="brace-match-plan-action" data-match-plan-action data-brace-id="${id}" role="group" aria-label="Action for ${name}">
      <button type="button" data-match-plan-action-value="resize" aria-pressed="${includedBraceIds.has(plan.id)}">Resize</button>
      <button type="button" data-match-plan-action-value="fixed" aria-pressed="${!includedBraceIds.has(plan.id)}">Keep plan</button>
    </div>`;
    }
    function braceMatchPlanProposedCutFormat(plan, includedBraceIds, systemMatch) {
        if (systemMatch && !includedBraceIds.has(plan.id)) {
            return `<span class="brace-match-plan-unchanged">Keep plan · ${braceMatchPlanSegmentsFormat(plan.planned.segments)}</span>`;
        }
        return `${braceMatchPlanSegmentsFormat(plan.proposed.segments)}${braceMatchPlanConstraintFormat(plan.constraintNotices)}`;
    }
    function braceMatchPlanPromptOptionsRead(modal) {
        var _a;
        const value = (name) => {
            var _a;
            return Number((_a = modal.querySelector(`[name="${name}"]`)) === null || _a === void 0 ? void 0 : _a.value);
        };
        return {
            incrementMm: value("match-plan-increment"),
            policy: ((_a = modal.querySelector('[name="match-plan-policy"]')) === null || _a === void 0 ? void 0 : _a.value) === "keep-width"
                ? "keep-width"
                : "match-stiffness-and-weight",
            fixedBreadthMm: value("match-plan-fixed-breadth"),
            minimumBreadthMm: value("match-plan-minimum-breadth"),
            minimumHeightMm: value("match-plan-minimum-height"),
        };
    }
    function braceMatchPlanPlansFilter(plans, includedBraceIds) {
        return plans.filter((plan) => includedBraceIds.has(plan.id));
    }
    function braceMatchPlanConstraintFormat(notices = []) {
        if (notices.length === 0)
            return "";
        return `<small class="brace-match-plan-constraint">${notices.map(braceMatchPlanTextEscape).join(" ")}</small>`;
    }
    function braceMatchPlanSegmentsFormat(segments) {
        return segments.map((segment) => `${segment.breadth.toFixed(1)} × ${segment.height.toFixed(1)} mm`).join(" + ");
    }
    function braceMatchPlanDifferenceFormat(value) {
        const prefix = value > 0 ? "+" : "";
        return `${prefix}${value.toFixed(1)}%`;
    }
    function braceMatchPlanTextEscape(value) {
        const span = document.createElement("span");
        span.textContent = value;
        return span.innerHTML;
    }
    exports.BraceMatchPlanPrompt = {
        open: braceMatchPlanPromptOpen,
    };
    if (typeof window !== "undefined") {
        window.BraceMatchPlanPrompt = exports.BraceMatchPlanPrompt;
    }
});

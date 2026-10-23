import assert from "node:assert/strict";
import test from "node:test";
import { Window } from "happy-dom";
import { createSetupStepNavigation } from "./setup_step_navigation.mjs?rev=37b595148646";

test("step navigation changes visibility and focus without changing entered measurements", () => {
  const window = new Window();
  const { document } = window;
  document.body.innerHTML = navigationFixture();
  const navigation = createSetupStepNavigation(document);
  const next = document.getElementById("setup_next");
  const previous = document.getElementById("setup_previous");

  assertCurrentStep(document, 0);
  assert.equal(previous.disabled, true);
  assert.equal(next.textContent, "Continue");
  navigation.select(-1);
  assertCurrentStep(document, 0);

  for (let index = 1; index < 6; index += 1) {
    next.click();
    assertCurrentStep(document, index);
    assert.equal(document.activeElement.id, `heading_${index}`);
    assert.equal(previous.disabled, false);
    assert.equal(next.hidden, index === 5);
    if (index === 4) assert.equal(next.textContent, "Review results");
  }

  navigation.select(6);
  assertCurrentStep(document, 5);
  previous.click();
  assertCurrentStep(document, 4);
  document.querySelector('[data-setup-step="0"]').click();
  assertCurrentStep(document, 0);
  assert.equal(next.hidden, false);
  assert.equal(document.getElementById("measurement").value, "648.25");
  window.happyDOM.abort();
});

function assertCurrentStep(document, index) {
  assert.equal(document.querySelectorAll("section:not([hidden])").length, 1);
  assert.equal(document.getElementById(`panel_${index}`).hidden, false);
  assert.equal(document.querySelectorAll('[aria-current="step"]').length, 1);
  assert.equal(document.querySelector('[aria-current="step"]').dataset.setupStep, String(index));
}

function navigationFixture() {
  const steps = Array.from({ length: 6 }, (_, index) => index);
  return `<nav>${steps.map((index) => `<button data-setup-step="${index}" aria-controls="panel_${index}">${index}</button>`).join("")}</nav>
    <form id="setup_form">${steps.map((index) => `<section id="panel_${index}"><h2 role="heading" tabindex="-1" id="heading_${index}">${index}</h2></section>`).join("")}
    <input id="measurement" value="648.25">
    <button type="button" id="setup_previous">Back</button>
    <button type="button" id="setup_next" data-continue-label="Continue" data-review-label="Review results"></button></form>`;
}

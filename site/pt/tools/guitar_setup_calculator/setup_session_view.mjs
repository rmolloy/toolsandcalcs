export function readSetupSessionView(document) {
  return {
    fields: Object.fromEntries(readControls(document).map(readControlEntry)),
    details: [...document.querySelectorAll('#setup_form details')].map((details) => details.open),
    customBuilderOpen: !document.getElementById('custom_profile_builder').hidden,
    scaleMode: document.getElementById('setup_scale_controls')?.dataset.scaleMode,
    scaleConfirmationOpen: document.getElementById('single_scale_confirmation')?.hidden === false,
    courseMembers: [...document.querySelectorAll('[data-course-member-count]')].map((field) => Number(field.value)),
  };
}

export function restoreSetupSessionView(document, view, profileEditor) {
  if (!view) return;
  restoreCustomBuilder(view, profileEditor);
  readControls(document).forEach((control) => restoreControl(control, view.fields));
  document.querySelectorAll('#setup_form details').forEach((details, index) => { details.open = Boolean(view.details?.[index]); });
}

function restoreCustomBuilder(view, profileEditor) {
  if (!view.customBuilderOpen) return;
  profileEditor.showCustomProfileBuilder();
  const members = view.courseMembers || [];
  profileEditor.renderCustomCourseMembers(members.length || 1, members);
}

function readControls(document) {
  return [...document.querySelectorAll('#setup_form input, #setup_form select')];
}

function readControlEntry(control) {
  return [readControlKey(control), control.type === 'radio' ? control.checked : control.value];
}

function restoreControl(control, fields) {
  const value = fields?.[readControlKey(control)];
  if (value === undefined) return;
  if (control.type === 'radio') control.checked = Boolean(value);
  else control.value = String(value);
}

function readControlKey(control) {
  if (control.id) return control.id;
  if (control.dataset.stringField) return `string:${control.dataset.stringIndex}:${control.dataset.stringField}`;
  if (control.dataset.courseMemberCount) return `course:${control.dataset.courseMemberCount}`;
  return `${control.name}:${control.value}`;
}

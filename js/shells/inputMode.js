/**
 * Lab vs microscope input isolation.
 * Catalog shortcuts (undo edge, Esc drawer) must not fire on the WebGL stage,
 * and microscope chrome must not route through shared catalog controls.
 */
export const INPUT_LAB = 'lab';
export const INPUT_MICROSCOPE = 'microscope';

export function setInputMode(mode) {
  const next = mode === INPUT_MICROSCOPE ? INPUT_MICROSCOPE : INPUT_LAB;
  try {
    document.documentElement.dataset.inputMode = next;
  } catch { /* ignore */ }
  return next;
}

export function getInputMode() {
  try {
    return document.documentElement.dataset.inputMode === INPUT_MICROSCOPE
      ? INPUT_MICROSCOPE
      : INPUT_LAB;
  } catch {
    return INPUT_LAB;
  }
}

export function isMicroscopeInput() {
  return getInputMode() === INPUT_MICROSCOPE;
}

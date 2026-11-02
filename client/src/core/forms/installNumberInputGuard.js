// A focused number field changes value when the mouse wheel scrolls over it or an arrow key is pressed,
// so a fee of 25000 can be saved as 24999.75 without anyone noticing. Across the app, as FloatingInput
// already does for its own fields, scrolling leaves the field and arrow keys do not change the number.
const isNumberField = (target) => target instanceof HTMLInputElement && target.type === 'number';

let installed = false;

export function installNumberInputGuard(root = document) {
  if (installed) return;
  installed = true;
  root.addEventListener('wheel', (event) => {
    if (isNumberField(event.target) && event.target === document.activeElement) event.target.blur();
  }, { capture: true, passive: true });
  root.addEventListener('keydown', (event) => {
    if (isNumberField(event.target) && ['ArrowUp', 'ArrowDown'].includes(event.key)) event.preventDefault();
  }, { capture: true });
}

export default installNumberInputGuard;

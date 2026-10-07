/**
 * Sizes a textarea to fit its text: it grows as lines are added and shrinks as
 * they are removed. With `maxRows` it stops growing there and scrolls instead.
 * Exported for textareas React does not render, such as SweetAlert popups.
 */
export function fitTextarea(node, { minRows = 1, maxRows } = {}) {
  if (!node) return;
  const style = window.getComputedStyle(node);
  const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.5 || 24;
  const padding = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom) || 0;
  const border = style.boxSizing === 'border-box'
    ? (parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth) || 0)
    : 0;
  const rowsHeight = (rows) => rows * lineHeight + padding + border;

  node.style.height = 'auto';
  const content = node.scrollHeight + border;
  const max = maxRows ? rowsHeight(maxRows) : Infinity;
  node.style.height = `${Math.min(Math.max(content, rowsHeight(minRows)), max)}px`;
  node.style.overflowY = content > max ? 'auto' : 'hidden';
}

/** Makes a textarea React does not render grow with its text. Returns a cleanup function. */
export function autoGrow(node, options) {
  if (!node) return () => {};
  const fit = () => fitTextarea(node, options);
  fit();
  node.addEventListener('input', fit);
  return () => node.removeEventListener('input', fit);
}

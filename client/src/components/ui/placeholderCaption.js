// A box with only a placeholder loses its name once text is typed in. The placeholder then rises onto the box's top
// border as a small caption, so a filled form still says what each box holds. Boxes inside a <label>, or given
// caption={false} because they already show a label, keep just their label (styles in index.css).

// Classes that place the box in its row or grid move to the wrapper, so the box sits exactly where it did.
const LAYOUT = /^(?:[a-z0-9]+:)*-?(?:col-|row-|w-|min-w-|max-w-|flex-(?:1|auto|none|initial|grow|shrink)|basis-|grow|shrink|self-|order-|justify-self-|place-self-|m[trblxyse]?-|hidden$|block$|inline-block$)/;

export function splitLayoutClasses(className = '') {
  const layout = [];
  const control = [];
  String(className).split(/\s+/).filter(Boolean).forEach((name) => (LAYOUT.test(name) ? layout : control).push(name));
  return { layout: layout.join(' '), control: control.join(' ') };
}

// A controlled box shows the caption once it has text; an uncontrolled one is left to CSS (:placeholder-shown).
export const showsCaption = (placeholder, value, caption = true) => Boolean(caption && placeholder)
  && (value === undefined || (value !== null && String(value) !== ''));

// A form-control box, or one given a width, fills its wrapper; any other box keeps its own width.
export const fillsRow = (className, layout) => /(?:^|\s)form-control(?:\s|$)/.test(className) || /(?:^|\s)(?:[a-z0-9]+:)*-?(?:w-|flex-1|grow)/.test(layout);

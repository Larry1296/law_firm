// The look shared by section links and the page tabs that sit with them, so both read as navigation.
export const sectionLinkClass = (active) => `block w-full rounded-lg border px-3 py-2 text-center text-base font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${active
  ? 'border-brand-primary bg-brand-primary text-white shadow-sm'
  : 'border-brand-primary/30 bg-brand-primary/5 text-brand-primary underline-offset-4 hover:border-brand-primary/60 hover:bg-brand-primary/10 hover:underline'}`;

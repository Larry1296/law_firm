import { splitLayoutClasses } from '@/components/ui/placeholderCaption';

// Wraps a box so its placeholder can rise above it as a caption. Used by CaptionedInput and AutoGrowTextarea.
// The caption is drawn by CSS from data-caption, so it adds no text to the page, the box's name or a <label>.
export default function PlaceholderField({ className, placeholder, show, fullWidth, children }) {
  const { layout } = splitLayoutClasses(className);
  return (
    <span className={`placeholder-field ${fullWidth ? 'block' : 'inline-block'} ${layout}`} data-caption={show ? placeholder : undefined}>
      {children}
    </span>
  );
}

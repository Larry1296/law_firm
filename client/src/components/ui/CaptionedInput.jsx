import { forwardRef } from 'react';

import PlaceholderField from '@/components/ui/PlaceholderField';
import { fillsRow, showsCaption, splitLayoutClasses } from '@/components/ui/placeholderCaption';

/**
 * A single-line input whose placeholder rises to a caption on its top border once text is typed in,
 * so the box keeps its name. Takes every native input prop, plus caption={false} for a box that already
 * has a visible label outside a <label> element.
 */
const CaptionedInput = forwardRef(function CaptionedInput({ className = '', placeholder, value, caption = true, ...props }, ref) {
  if (!(caption && placeholder)) {
    return <input ref={ref} className={className} placeholder={placeholder} value={value} {...props} />;
  }
  const { control, layout } = splitLayoutClasses(className);
  const fullWidth = fillsRow(className, layout);
  return (
    <PlaceholderField className={className} placeholder={placeholder} show={showsCaption(placeholder, value, caption)} fullWidth={fullWidth}>
      <input ref={ref} className={`${control}${fullWidth ? ' w-full' : ''}`} placeholder={placeholder} value={value} {...props} />
    </PlaceholderField>
  );
});

export default CaptionedInput;

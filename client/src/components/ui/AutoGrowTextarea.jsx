import { forwardRef, useCallback, useLayoutEffect, useRef } from 'react';

import { fitTextarea } from '@/components/ui/autoGrow';

/**
 * The textarea used across the app. It starts as a single line and grows as
 * text is entered. It takes every native textarea prop, plus `minRows` and
 * `maxRows`; `rows` is ignored so every box starts the same way.
 */
const AutoGrowTextarea = forwardRef(function AutoGrowTextarea(
  { minRows = 1, rows: _rows, maxRows, value, onInput, className = '', style, ...props },
  forwardedRef,
) {
  const localRef = useRef(null);
  const startRows = Number(minRows);

  const setRef = useCallback((node) => {
    localRef.current = node;
    if (typeof forwardedRef === 'function') forwardedRef(node);
    else if (forwardedRef) forwardedRef.current = node;
  }, [forwardedRef]);

  const fit = useCallback(
    () => fitTextarea(localRef.current, { minRows: startRows, maxRows }),
    [startRows, maxRows],
  );

  // Controlled: refit whenever the value changes, including when it is cleared.
  useLayoutEffect(fit, [fit, value]);

  // Text wraps differently when the box gets narrower or wider.
  useLayoutEffect(() => {
    const node = localRef.current;
    if (!node || typeof ResizeObserver === 'undefined') return undefined;
    let width = node.offsetWidth;
    const observer = new ResizeObserver(() => {
      if (node.offsetWidth !== width) {
        width = node.offsetWidth;
        fit();
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [fit]);

  return (
    <textarea
      ref={setRef}
      rows={startRows}
      value={value}
      onInput={(event) => {
        // A controlled box refits from its value; an uncontrolled one refits here.
        if (value === undefined) fit();
        onInput?.(event);
      }}
      className={`resize-none ${className}`}
      style={style}
      {...props}
    />
  );
});

export default AutoGrowTextarea;

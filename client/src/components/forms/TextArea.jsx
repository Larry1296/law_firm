import { forwardRef, useEffect, useRef } from 'react';
import FormField from './FormField';
import { controlClass, invalidControlClass } from './formStyles';

const TextArea = forwardRef(function TextArea({ label, name, id = name, required, optional, help, error, className = '', textareaClassName = '', autoGrow = true, value, onInput, ...props }, forwardedRef) {
  const localRef = useRef(null);
  const setRef = (node) => { localRef.current = node; if (typeof forwardedRef === 'function') forwardedRef(node); else if (forwardedRef) forwardedRef.current = node; };
  const resize = () => { const node = localRef.current; if (!node || !autoGrow) return; node.style.height = 'auto'; node.style.height = `${Math.max(112, node.scrollHeight)}px`; };
  useEffect(resize, [value, autoGrow]);
  return <FormField id={id} label={label} required={required} optional={optional} help={help} error={error} className={className}>{({ describedBy, invalid }) => <textarea ref={setRef} id={id} name={name} required={required} value={value} spellCheck aria-invalid={invalid} aria-describedby={describedBy} onInput={(event) => { resize(); onInput?.(event); }} className={`${controlClass} min-h-28 resize-y overflow-hidden leading-6 ${invalid ? invalidControlClass : ''} ${textareaClassName}`} {...props} />}</FormField>;
});
export default TextArea;


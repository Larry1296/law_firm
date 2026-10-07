import { forwardRef } from 'react';

import AutoGrowTextarea from '@/components/ui/AutoGrowTextarea';
import FormField from './FormField';
import { controlClass, invalidControlClass } from './formStyles';

const TextArea = forwardRef(function TextArea({ label, name, id = name, required, optional, help, error, className = '', textareaClassName = '', minRows = 1, maxRows, ...props }, ref) {
  return <FormField id={id} label={label} required={required} optional={optional} help={help} error={error} className={className}>{({ describedBy, invalid }) => <AutoGrowTextarea ref={ref} id={id} name={name} required={required} minRows={minRows} maxRows={maxRows} spellCheck aria-invalid={invalid} aria-describedby={describedBy} className={`${controlClass} leading-6 ${invalid ? invalidControlClass : ''} ${textareaClassName}`} {...props} />}</FormField>;
});
export default TextArea;

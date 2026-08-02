import { forwardRef } from 'react';
import FormField from './FormField';
import { controlClass, invalidControlClass } from './formStyles';

const TextInput = forwardRef(function TextInput({ label, name, id = name, required, optional, help, error, className = '', inputClassName = '', ...props }, ref) {
  return <FormField id={id} label={label} required={required} optional={optional} help={help} error={error} className={className}>{({ describedBy, invalid }) => <input ref={ref} id={id} name={name} required={required} aria-invalid={invalid} aria-describedby={describedBy} className={`${controlClass} ${invalid ? invalidControlClass : ''} ${inputClassName}`} {...props} />}</FormField>;
});
export default TextInput;


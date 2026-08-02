import { forwardRef } from 'react';
import FormField from './FormField';
import { controlClass, invalidControlClass } from './formStyles';

const SelectInput = forwardRef(function SelectInput({ label, name, id = name, required, optional, help, error, options = [], placeholder = 'Select an option', className = '', selectClassName = '', children, ...props }, ref) {
  return <FormField id={id} label={label} required={required} optional={optional} help={help} error={error} className={className}>{({ describedBy, invalid }) => <select ref={ref} id={id} name={name} required={required} aria-invalid={invalid} aria-describedby={describedBy} className={`${controlClass} ${invalid ? invalidControlClass : ''} ${selectClassName}`} {...props}>{placeholder !== null && <option value=''>{placeholder}</option>}{children || options.map((option) => <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>)}</select>}</FormField>;
});
export default SelectInput;


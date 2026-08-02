import Button from './FormButton';

export default function FormActions({ primaryLabel, primaryProps = {}, secondaryLabel = 'Cancel', onSecondary, children, sticky = false, className = '' }) { return <div className={`${sticky ? 'sticky bottom-0 z-20 -mx-5 border-t border-border-light bg-surface-light/95 px-5 py-4 backdrop-blur dark:border-border-dark dark:bg-surface-dark/95 sm:-mx-6 sm:px-6' : 'border-t border-border-light pt-5 dark:border-border-dark'} flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end ${className}`}>{children}{secondaryLabel && <Button type='button' variant='secondary' onClick={onSecondary}>{secondaryLabel}</Button>}{primaryLabel && <Button type='submit' {...primaryProps}>{primaryLabel}</Button>}</div>; }


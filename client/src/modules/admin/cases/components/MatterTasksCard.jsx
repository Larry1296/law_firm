import { useState } from 'react';

import Card from '@/components/ui/Card';
import {
  FormButton,
  FormGrid,
  ReadOnlyField,
  SelectInput,
  TextArea,
  TextInput,
} from '@/components/forms';
import { formatDateTime } from '@/core/utils/dateFormatter';
import { displayEnum } from '@/core/utils/textFormatter';

const PRIORITIES = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
];

const emptyDraft = {
  title: '',
  description: '',
  due_date: '',
  priority: 'MEDIUM',
  is_client_visible: false,
};

export default function MatterTasksCard({
  caseId,
  tasks = [],
  assignedLawyerName,
  createTask,
  isCreating,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState(emptyDraft);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    try {
      await createTask({
        caseId,
        payload: {
          title: draft.title,
          description: draft.description,
          task_type: 'DOCUMENT_PREPARATION',
          priority: draft.priority,
          due_at: draft.due_date ? `${draft.due_date}T17:00:00+03:00` : null,
          is_client_visible: draft.is_client_visible,
        },
      });
      setDraft(emptyDraft);
      setIsOpen(false);
    } catch (requestError) {
      const response = requestError?.response?.data;
      const detail = response?.detail || response?.title || response?.due_at;
      setError(Array.isArray(detail) ? detail.join(' ') : detail || 'The task could not be created. Check the fields and try again.');
    }
  };

  return (
    <Card id='matter-tasks' className='scroll-mt-24 border-l-4 border-l-brand-primary p-5 md:p-6'>
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div>
          <p className='text-xs font-semibold uppercase tracking-[0.16em] text-brand-primary'>Priority work</p>
          <h2 className='mt-1 text-xl font-semibold text-text-primary-light dark:text-text-primary-dark'>Tasks and deadlines</h2>
          <p className='mt-1 max-w-2xl text-sm text-text-muted-light dark:text-text-muted-dark'>
            Work that requires attention on this matter. Internal tasks do not create court events.
          </p>
        </div>
        {!isOpen && <FormButton type='button' onClick={() => setIsOpen(true)}>Create internal task</FormButton>}
      </div>

      {isOpen && (
        <form onSubmit={handleSubmit} className='mt-5 space-y-4 rounded-xl border border-border-light bg-slate-50/70 p-4 dark:border-border-dark dark:bg-slate-900/40'>
          <FormGrid>
            <TextInput label='Title' name='task_title' value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder='Example: Review debt-recovery supporting records' required />
            <ReadOnlyField label='Assigned to' value={assignedLawyerName || 'No advocate assigned'} />
            <TextInput label='Due date' name='task_due_date' type='date' value={draft.due_date} onChange={(event) => setDraft((current) => ({ ...current, due_date: event.target.value }))} required />
            <SelectInput label='Priority' name='task_priority' value={draft.priority} onChange={(event) => setDraft((current) => ({ ...current, priority: event.target.value }))} options={PRIORITIES} placeholder={null} required />
            <TextArea label='Description' name='task_description' value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} placeholder='Describe the work and the checks to complete.' rows={5} spellCheck required className='md:col-span-2' />
          </FormGrid>
          <label className='flex cursor-pointer items-start gap-3 rounded-lg border border-border-light bg-surface-light p-3 dark:border-border-dark dark:bg-surface-dark'>
            <input type='checkbox' checked={draft.is_client_visible} onChange={(event) => setDraft((current) => ({ ...current, is_client_visible: event.target.checked }))} className='mt-0.5 h-4 w-4 rounded border-border-light text-brand-primary focus:ring-brand-primary/30 dark:border-border-dark' />
            <span><span className='block text-sm font-semibold text-text-primary-light dark:text-text-primary-dark'>Client visibility</span><span className='block text-xs text-text-muted-light dark:text-text-muted-dark'>Leave off for internal advocate work.</span></span>
          </label>
          {error && <p role='alert' className='rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200'>{error}</p>}
          <div className='flex justify-end gap-3'>
            <FormButton type='button' variant='secondary' onClick={() => { setIsOpen(false); setError(''); }} disabled={isCreating}>Cancel</FormButton>
            <FormButton type='submit' loading={isCreating} loadingText='Creating task…'>Create task</FormButton>
          </div>
        </form>
      )}

      <div className='mt-5'>
        {tasks.length === 0 ? (
          <div className='rounded-xl border border-dashed border-border-light px-4 py-6 text-center text-sm text-text-muted-light dark:border-border-dark dark:text-text-muted-dark'>No tasks or deadlines recorded.</div>
        ) : (
          <div className='grid gap-3 lg:grid-cols-2'>
            {tasks.map((task, index) => (
              <article key={task.id || index} className='rounded-xl border border-border-light bg-surface-light p-4 dark:border-border-dark dark:bg-surface-dark'>
                <div className='flex items-start justify-between gap-3'>
                  <h3 className='font-semibold text-text-primary-light dark:text-text-primary-dark'>{task.title || task.action || 'Task'}</h3>
                  <span className='rounded-full bg-brand-primary/10 px-2.5 py-1 text-xs font-semibold text-brand-primary'>{task.priority_label || displayEnum(task.priority)}</span>
                </div>
                <p className='mt-2 text-sm text-text-muted-light dark:text-text-muted-dark'>Due {task.due_at ? formatDateTime(task.due_at) : 'date not set'} · {task.assigned_to_name || 'Responsible advocate'}</p>
                <p className='mt-1 text-xs font-medium text-text-muted-light dark:text-text-muted-dark'>{task.is_client_visible ? 'Client visible' : 'Internal only'}</p>
                {task.description && <p className='mt-3 whitespace-pre-wrap text-sm text-text-primary-light dark:text-text-primary-dark'>{task.description}</p>}
              </article>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

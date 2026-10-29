import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, FolderOpen, Lock, Pencil, Plus, RotateCcw, Warehouse } from 'lucide-react';

import { getApiErrorMessage } from '@/core/utils/errorMessages';
import adminFirmService from '@/modules/admin/firm/services/adminFirmService';

// What can be added inside each kind, matching the physical nesting.
const CHILD_KINDS = {
  ROOM: ['CABINET', 'SAFE', 'SHELF'],
  CABINET: ['DRAWER', 'SHELF'],
  SAFE: ['DRAWER', 'SHELF'],
  DRAWER: [],
  SHELF: [],
};
const KIND_ICON = { ROOM: Warehouse, CABINET: Archive, SAFE: Lock, DRAWER: FolderOpen, SHELF: FolderOpen };
const EXAMPLE_LABEL = { ROOM: 'Registry', CABINET: 'Cabinet B', SAFE: 'Safe 1', DRAWER: 'Drawer 3', SHELF: 'Shelf 2' };

function LocationForm({ kinds, purposes, initial, submitLabel, onSubmit, onCancel, busy }) {
  const [kind, setKind] = useState(initial?.kind || kinds[0]);
  const [label, setLabel] = useState(initial?.label || '');
  const [purpose, setPurpose] = useState(initial?.purpose || '');
  return (
    <form
      className='mt-2 flex flex-wrap items-end gap-2 rounded-lg bg-background-light p-3 dark:bg-background-dark'
      onSubmit={(event) => { event.preventDefault(); onSubmit({ kind, label, ...(purpose ? { purpose } : {}) }); }}
    >
      {!initial && kinds.length > 1 && (
        <label className='text-sm'>
          <span className='block font-semibold'>Type</span>
          <select className='form-control mt-1' value={kind} onChange={(event) => setKind(event.target.value)}>
            {kinds.map((value) => <option key={value} value={value}>{value[0] + value.slice(1).toLowerCase()}</option>)}
          </select>
        </label>
      )}
      <label className='min-w-40 flex-1 text-sm'>
        <span className='block font-semibold'>Label, as written on it</span>
        <input required maxLength={80} autoFocus className='form-control mt-1 w-full' value={label} onChange={(event) => setLabel(event.target.value)} placeholder={`e.g. ${EXAMPLE_LABEL[kind]}`} />
      </label>
      <label className='text-sm'>
        <span className='block font-semibold'>Holds</span>
        <select className='form-control mt-1' value={purpose} onChange={(event) => setPurpose(event.target.value)}>
          <option value=''>{initial ? 'No change' : 'Same as where it sits'}</option>
          {purposes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
      </label>
      <button type='submit' disabled={busy} className='rounded-lg bg-brand-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-60 dark:bg-sky-600'>{submitLabel}</button>
      <button type='button' onClick={onCancel} className='rounded-lg border border-[color:var(--border)] px-4 py-2 text-sm'>Cancel</button>
    </form>
  );
}

/** The owner lays out the records room once, so every KYC and matter file has an exact place. */
export default function RecordsRoomSection() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(null); // { mode: 'add' | 'edit', id }
  const [error, setError] = useState(null);
  const { data, isLoading } = useQuery({ queryKey: ['records-room'], queryFn: adminFirmService.getRecordsRoom });
  const done = () => { setOpen(null); setError(null); queryClient.invalidateQueries({ queryKey: ['records-room'] }); };
  const fail = (failure) => setError(getApiErrorMessage(failure, 'Could not save this place.'));
  const create = useMutation({ mutationFn: (payload) => adminFirmService.createStorageLocation(payload), onSuccess: done, onError: fail });
  const update = useMutation({ mutationFn: ({ id, ...payload }) => adminFirmService.updateStorageLocation(id, payload), onSuccess: done, onError: fail });
  const busy = create.isPending || update.isPending;
  const locations = data?.locations || [];
  const purposes = data?.purposes || [];

  return (
    <div className='space-y-3'>
      <div>
        <h2 className='text-xl font-bold'>Records room</h2>
        <p className='text-sm text-[color:var(--text-muted)]'>
          Lay out the rooms, cabinets, safes, drawers and shelves exactly as they are labelled in the office. Each client&apos;s KYC
          file and each matter file is then placed in a drawer or shelf, so anyone can find the paper. No documents are stored here,
          only where they are.
        </p>
        {data?.next_kyc_reference && <p className='mt-1 text-sm'>The next client KYC file will be <strong>{data.next_kyc_reference}</strong>.</p>}
      </div>
      {error && <p role='alert' className='rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200'>{error}</p>}
      {isLoading && <p role='status'>Loading the records room…</p>}
      {!isLoading && locations.length === 0 && <p className='text-sm'>Nothing laid out yet. Start with a room, such as the registry.</p>}

      <ul className='space-y-1'>
        {locations.map((item) => {
          const Icon = KIND_ICON[item.kind] || FolderOpen;
          const holds = [item.kyc_files && `${item.kyc_files} KYC file${item.kyc_files === 1 ? '' : 's'}`, item.matter_files && `${item.matter_files} matter file${item.matter_files === 1 ? '' : 's'}`, item.documents_held && `${item.documents_held} original${item.documents_held === 1 ? '' : 's'}`].filter(Boolean);
          return (
            <li key={item.id} style={{ marginLeft: `${item.depth * 1.5}rem` }} className={item.is_active ? '' : 'opacity-60'}>
              <div className='flex flex-wrap items-center gap-2 rounded-lg border border-[color:var(--border)] px-3 py-2'>
                <Icon size={16} aria-hidden='true' />
                <span className='font-semibold'>{item.label}</span>
                <span className='text-xs text-[color:var(--text-muted)]'>{item.kind_label} · {item.purpose_label}{holds.length ? ` · ${holds.join(', ')}` : ''}{item.is_active ? '' : ' · retired'}</span>
                <span className='ml-auto flex gap-1'>
                  {item.is_active && CHILD_KINDS[item.kind].length > 0 && (
                    <button type='button' onClick={() => setOpen({ mode: 'add', id: item.id })} className='inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold hover:bg-background-light dark:hover:bg-background-dark' aria-label={`Add inside ${item.path}`}><Plus size={14} /> Add inside</button>
                  )}
                  <button type='button' onClick={() => setOpen({ mode: 'edit', id: item.id })} className='rounded-md p-1 hover:bg-background-light dark:hover:bg-background-dark' aria-label={`Rename ${item.path}`}><Pencil size={14} /></button>
                  <button type='button' disabled={busy} onClick={() => update.mutate({ id: item.id, is_active: !item.is_active })} className='rounded-md p-1 hover:bg-background-light dark:hover:bg-background-dark' aria-label={item.is_active ? `Retire ${item.path}` : `Restore ${item.path}`}>
                    {item.is_active ? <Archive size={14} /> : <RotateCcw size={14} />}
                  </button>
                </span>
              </div>
              {open?.id === item.id && open.mode === 'add' && (
                <LocationForm kinds={CHILD_KINDS[item.kind]} purposes={purposes} submitLabel='Add' busy={busy} onCancel={() => setOpen(null)} onSubmit={(payload) => create.mutate({ ...payload, parent_id: item.id })} />
              )}
              {open?.id === item.id && open.mode === 'edit' && (
                <LocationForm kinds={[item.kind]} purposes={purposes} initial={item} submitLabel='Save' busy={busy} onCancel={() => setOpen(null)} onSubmit={({ label, purpose }) => update.mutate({ id: item.id, label, ...(purpose ? { purpose } : {}) })} />
              )}
            </li>
          );
        })}
      </ul>

      {open?.mode === 'add' && open.id === null ? (
        <LocationForm kinds={['ROOM']} purposes={purposes} submitLabel='Add room' busy={busy} onCancel={() => setOpen(null)} onSubmit={(payload) => create.mutate(payload)} />
      ) : (
        <button type='button' onClick={() => setOpen({ mode: 'add', id: null })} className='inline-flex items-center gap-2 rounded-lg border border-[color:var(--border)] px-4 py-2 text-sm font-semibold'>
          <Plus size={16} aria-hidden='true' /> Add a room
        </button>
      )}
    </div>
  );
}

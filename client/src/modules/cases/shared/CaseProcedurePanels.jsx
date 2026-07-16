import Card from '@/components/ui/Card';
import { renderDateTime, renderEnum } from '@/modules/cases/shared/casePresentation';

const emptyText = 'No records yet.';

const ProcedureList = ({ title, items, renderItem }) => (
  <Card className='p-6'>
    <h3 className='mb-4 text-lg font-semibold text-text-primary-light dark:text-text-primary-dark'>
      {title}
    </h3>

    {items?.length ? (
      <div className='space-y-3'>
        {items.slice(0, 5).map(renderItem)}
      </div>
    ) : (
      <p className='text-sm text-text-muted-light dark:text-text-muted-dark'>
        {emptyText}
      </p>
    )}
  </Card>
);

export default function CaseProcedurePanels({ caseData }) {
  return (
    <div className='grid gap-4 lg:grid-cols-2'>
      <ProcedureList
        title='Court Events and Hearings'
        items={caseData.events || []}
        renderItem={(event) => (
          <div key={event.id} className='rounded-xl border border-border-light p-4 dark:border-border-dark'>
            <p className='font-semibold text-text-primary-light dark:text-text-primary-dark'>
              {event.title || renderEnum(event.event_type)}
            </p>
            <p className='text-sm text-text-muted-light dark:text-text-muted-dark'>
              {renderEnum(event.event_type)} • {renderEnum(event.status)} • {renderDateTime(event.starts_at)}
            </p>
            <p className='mt-1 text-sm text-text-muted-light dark:text-text-muted-dark'>
              {event.court_station || event.courtroom || event.judicial_officer || 'Court details not set'}
            </p>
          </div>
        )}
      />

      <ProcedureList
        title='Filings and Court Documents'
        items={caseData.filings || []}
        renderItem={(filing) => (
          <div key={filing.id} className='rounded-xl border border-border-light p-4 dark:border-border-dark'>
            <p className='font-semibold text-text-primary-light dark:text-text-primary-dark'>
              {filing.title || renderEnum(filing.filing_type)}
            </p>
            <p className='text-sm text-text-muted-light dark:text-text-muted-dark'>
              {renderEnum(filing.filing_type)} • {renderEnum(filing.status)}
            </p>
            <p className='mt-1 text-sm text-text-muted-light dark:text-text-muted-dark'>
              eFiling: {filing.efiling_reference || 'Not Set'} • Receipt: {filing.receipt_number || 'Not Set'}
            </p>
          </div>
        )}
      />

      <ProcedureList
        title='Deadlines and Tasks'
        items={caseData.tasks || []}
        renderItem={(task) => (
          <div key={task.id} className='rounded-xl border border-border-light p-4 dark:border-border-dark'>
            <p className='font-semibold text-text-primary-light dark:text-text-primary-dark'>
              {task.title}
            </p>
            <p className='text-sm text-text-muted-light dark:text-text-muted-dark'>
              {renderEnum(task.task_type)} • {renderEnum(task.status)} • Due {renderDateTime(task.due_at)}
            </p>
          </div>
        )}
      />

      <ProcedureList
        title='Notes and Updates'
        items={caseData.notes || []}
        renderItem={(note) => (
          <div key={note.id} className='rounded-xl border border-border-light p-4 dark:border-border-dark'>
            <p className='font-semibold text-text-primary-light dark:text-text-primary-dark'>
              {note.title || renderEnum(note.note_type)}
            </p>
            <p className='text-sm text-text-muted-light dark:text-text-muted-dark'>
              {renderEnum(note.note_type)} • {renderDateTime(note.created_at)}
            </p>
            <p className='mt-1 line-clamp-2 text-sm text-text-muted-light dark:text-text-muted-dark'>
              {note.body}
            </p>
          </div>
        )}
      />
    </div>
  );
}

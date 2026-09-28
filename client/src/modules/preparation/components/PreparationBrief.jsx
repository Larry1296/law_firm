import { CheckCircle2, CircleAlert, MessageSquareQuote, Sparkles } from 'lucide-react';

const List = ({ title, items }) => (items?.length ? (
  <div>
    <h4 className='text-sm font-bold'>{title}</h4>
    <ul className='mt-1 list-disc space-y-1 pl-5 text-sm'>{items.map((item) => <li key={item}>{item}</li>)}</ul>
  </div>
) : null);

function Readiness({ value }) {
  const tone = value >= 80 ? 'bg-emerald-500' : value >= 50 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div>
      <div className='flex items-center justify-between text-sm'>
        <span className='font-semibold'>Preparation readiness</span>
        <span className='font-bold'>{value}%</span>
      </div>
      <div className='mt-1 h-2 rounded-full bg-slate-200 dark:bg-slate-700' role='progressbar' aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
        <div className={`h-2 rounded-full ${tone}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function Checks({ checks }) {
  if (!checks?.length) return null;
  return (
    <ul className='space-y-2'>
      {checks.map((item) => (
        <li key={item.key} className='flex gap-2 text-sm'>
          {item.passed
            ? <CheckCircle2 size={18} className='mt-0.5 shrink-0 text-emerald-600' aria-label='Done' />
            : <CircleAlert size={18} className='mt-0.5 shrink-0 text-amber-600' aria-label='Outstanding' />}
          <span>
            <span className={item.passed ? '' : 'font-semibold'}>{item.label}</span>
            {!item.passed && item.detail && <span className='block text-text-muted-light dark:text-text-muted-dark'>{item.detail}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Questions({ title, questions }) {
  if (!questions?.length) return null;
  return (
    <div>
      <h4 className='flex items-center gap-2 text-sm font-bold'><MessageSquareQuote size={16} />{title}</h4>
      <div className='mt-2 space-y-2'>
        {questions.map((item) => (
          <div key={`${item.from}-${item.question}`} className='rounded-lg border border-border-light p-3 text-sm dark:border-border-dark'>
            <p><span className='font-semibold'>{item.from}:</span> {item.question}</p>
            <p className='mt-1 text-text-muted-light dark:text-text-muted-dark'>Have ready: {item.prepare}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdvocateBrief({ brief }) {
  const { guidance = {}, tailored = {} } = brief;
  return (
    <div className='space-y-4'>
      <Readiness value={brief.readiness} />
      <p className='text-sm'>{guidance.purpose}</p>
      {guidance.last_directions && (
        <p className='rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-900'><span className='font-semibold'>Last directions:</span> {guidance.last_directions}</p>
      )}
      <Checks checks={brief.checks} />
      <List title='Preparation checklist' items={guidance.checklist} />
      <Questions title='Questions to expect' questions={guidance.anticipated_questions} />
      {tailored.focus && (
        <div className='space-y-3 rounded-xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-900 dark:bg-violet-950/40'>
          <h4 className='flex items-center gap-2 text-sm font-bold'><Sparkles size={16} />Tailored to this matter</h4>
          <p className='text-sm'>{tailored.focus}</p>
          <Questions title='Matter-specific questions' questions={tailored.anticipated_questions} />
          <List title='Risks to address' items={tailored.risks} />
          <p className='text-xs text-text-muted-light dark:text-text-muted-dark'>{tailored.label}</p>
        </div>
      )}
      <p className='text-sm'>{guidance.form_of_address}</p>
      <List title='After the sitting' items={guidance.after_the_sitting} />
      <p className='text-xs text-text-muted-light dark:text-text-muted-dark'>{guidance.disclaimer}</p>
    </div>
  );
}

export function ClientBrief({ brief }) {
  const { guidance = {} } = brief;
  return (
    <div className='space-y-4'>
      <p className='text-sm'>{guidance.purpose}</p>
      <p className='text-sm font-semibold'>{guidance.your_role}</p>
      <Checks checks={brief.checks} />
      <List title='Before the day' items={guidance.before} />
      <List title='In court' items={guidance.in_court} />
      <List title='If you give evidence' items={guidance.if_you_give_evidence} />
      <List title='Afterwards' items={guidance.after} />
      <p className='text-xs text-text-muted-light dark:text-text-muted-dark'>{guidance.disclaimer}</p>
    </div>
  );
}

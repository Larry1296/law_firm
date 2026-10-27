import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronRight, Info, RefreshCw, Search, Sparkles } from 'lucide-react';

import { FormButton as Button3D } from '@/components/forms';
import ElasticTextInput from '@/components/ui/ElasticTextInput';
import { Input3D } from '@/components/ui/Input3D';
import { formatDateTime } from '@/core/utils/dateFormatter';

const SEARCH_UNDER_WAY = ['IN_PROGRESS', 'POTENTIAL_CONFLICT', 'ESCALATED_FOR_REVIEW'];
const emptyFinding = { matched_name: '', relationship_to_firm: '', details: '' };

const chipClass = 'inline-flex items-center gap-1.5 rounded-full border border-border-light bg-surface-light px-3 py-1 text-xs text-text-primary-light dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark';

function Field({ label, value, onChange, required = false }) {
  return <ElasticTextInput label={label} value={value} onChange={(event) => onChange(event.target.value)} required={required} alwaysShowLabel wrapperClassName='mb-0' />;
}

function MatchCard({ match }) {
  const risk = match.conflict_risk;
  return (
    <li className={`rounded-xl border p-3 text-sm ${risk ? 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30' : 'border-border-light bg-surface-light dark:border-border-dark dark:bg-surface-dark'}`}>
      <p className='font-semibold'>
        {match.searched_name} <ChevronRight size={14} className='inline' /> {match.matched_name}
      </p>
      <p className='mt-1'>{match.relationship}</p>
      <p className='mt-1 text-xs text-text-muted-light dark:text-text-muted-dark'>
        {match.reason} · searched as {match.searched_role}{match.found_by === 'AI' ? ' · found by AI review' : ''}
      </p>
    </li>
  );
}

// Where the firm stands: searched automatically, or learning from guided checks.
function ModeBadge({ search }) {
  if (search.mode === 'AUTOMATIC') {
    const learned = search.reason === 'LEARNED_FROM_GUIDED_CHECKS';
    return <span className='rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200'>{learned ? 'Automatic search · learned from guided checks' : 'Automatic search'}</span>;
  }
  return <span className='rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-900 dark:bg-blue-950/50 dark:text-blue-200'>Guided search</span>;
}

function LearningProgress({ search }) {
  if (search.mode !== 'GUIDED') return null;
  const percent = Math.round((search.clean_streak / search.required) * 100);
  return (
    <div className='mt-4 rounded-xl border border-border-light p-3 text-sm dark:border-border-dark'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <span>Your firm keeps records outside this system, so each source is confirmed by an advocate.</span>
        <span className='font-semibold'>{search.clean_streak} of {search.required} clean checks</span>
      </div>
      <div className='mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800' role='progressbar' aria-valuenow={search.clean_streak} aria-valuemin={0} aria-valuemax={search.required} aria-label='Progress toward automatic searches'>
        <div className='h-full rounded-full bg-brand-primary transition-all' style={{ width: `${percent}%` }} />
      </div>
      <p className='mt-2 text-xs text-text-muted-light dark:text-text-muted-dark'>
        Searches become automatic after {search.required} checks in a row where the advocate finds nothing the system missed. A missed match restarts the count.
      </p>
    </div>
  );
}

function SourceStep({ step, review, matches, active, editable, onOpen, onReview, busy }) {
  const [recordingMatch, setRecordingMatch] = useState(false);
  const [finding, setFinding] = useState(emptyFinding);
  const done = Boolean(review);
  const matchFound = review?.outcome === 'MATCH_FOUND';
  const icon = matchFound
    ? <AlertTriangle size={18} className='text-amber-600' />
    : done ? <CheckCircle2 size={18} className='text-emerald-600' /> : <span className={`grid h-5 w-5 place-items-center rounded-full border text-[10px] ${active ? 'border-brand-primary text-brand-primary' : 'border-border-light dark:border-border-dark'}`} />;

  const submitMatch = (event) => {
    event.preventDefault();
    onReview({ source: step.source, outcome: 'MATCH_FOUND', ...finding }, () => { setFinding(emptyFinding); setRecordingMatch(false); });
  };

  return (
    <li className={`rounded-xl border ${active ? 'border-brand-primary shadow-soft' : 'border-border-light dark:border-border-dark'}`}>
      <button type='button' onClick={onOpen} className='flex w-full items-center gap-3 px-4 py-3 text-left' aria-expanded={active}>
        {icon}
        <span className='flex-1 font-semibold'>{step.label}</span>
        <span className='text-xs text-text-muted-light dark:text-text-muted-dark'>
          {matchFound ? `Match: ${review.matched_name}` : done ? 'No match confirmed' : step.system_match_count ? `${step.system_match_count} found by the system` : 'To confirm'}
        </span>
      </button>
      {active && (
        <div className='space-y-3 border-t border-border-light px-4 py-3 text-sm dark:border-border-dark'>
          <p>{step.guidance}</p>
          {matches.length > 0
            ? <ul className='space-y-2'>{matches.map((match) => <MatchCard key={`${match.record_id}-${match.searched_name}`} match={match} />)}</ul>
            : <p className='text-text-muted-light dark:text-text-muted-dark'>The system found nothing here in its own records. Check what the firm keeps outside the system.</p>}
          {review && <p className='text-xs text-text-muted-light dark:text-text-muted-dark'>Confirmed by {review.reviewed_by_name} on {formatDateTime(review.reviewed_at)}{review.details ? ` · ${review.details}` : ''}</p>}
          {editable && !recordingMatch && (
            <div className='flex flex-wrap gap-2'>
              <Button3D type='button' size='sm' variant='success' disabled={busy} onClick={() => onReview({ source: step.source, outcome: 'NO_MATCH' })}>No match in this source</Button3D>
              <Button3D type='button' size='sm' variant='secondary' disabled={busy} onClick={() => setRecordingMatch(true)}>Record a match</Button3D>
            </div>
          )}
          {editable && recordingMatch && (
            <form className='grid gap-3 md:grid-cols-2' onSubmit={submitMatch}>
              <Input3D label='Name found' value={finding.matched_name} onChange={(event) => setFinding((value) => ({ ...value, matched_name: event.target.value }))} required />
              <Input3D label='Relationship to the firm' placeholder='e.g. Former client, 2019 paper register' value={finding.relationship_to_firm} onChange={(event) => setFinding((value) => ({ ...value, relationship_to_firm: event.target.value }))} required />
              <div className='md:col-span-2'><Field label='Details' value={finding.details} onChange={(value) => setFinding((current) => ({ ...current, details: value }))} /></div>
              <div className='flex gap-2 md:col-span-2'>
                <Button3D type='submit' size='sm' disabled={busy}>Save match</Button3D>
                <Button3D type='button' size='sm' variant='ghost' onClick={() => setRecordingMatch(false)}>Cancel</Button3D>
              </div>
            </form>
          )}
        </div>
      )}
    </li>
  );
}

export default function ConflictSearchPanel({ check, onRunSearch, onReviewSource, onClear, onRecordPotential, onRequestInformation, busy = false }) {
  const search = check.system_search || {};
  const [openSource, setOpenSource] = useState(null);
  const [summary, setSummary] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const editable = SEARCH_UNDER_WAY.includes(check.status);
  if (!search.ran_at) {
    if (!editable) return null;
    return (
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='flex items-center gap-2'>
          <Search size={18} className='text-brand-primary' />
          <h3 className='text-lg font-semibold'>Conflict search</h3>
        </div>
        <Button3D type='button' disabled={busy} onClick={onRunSearch}>Run the conflict search</Button3D>
      </div>
    );
  }

  const inProgress = check.status === 'IN_PROGRESS';
  const matches = search.matches || [];
  const riskMatches = matches.filter((match) => match.conflict_risk);
  const infoMatches = matches.filter((match) => !match.conflict_risk);
  const reviews = Object.fromEntries((check.source_reviews || []).map((review) => [review.source, review]));
  const steps = check.search_checklist || [];
  const guided = search.mode === 'GUIDED';
  const confirmedCount = steps.filter((step) => reviews[step.source]).length;
  const recordedMatch = Object.values(reviews).some((review) => review.outcome === 'MATCH_FOUND');
  const nextStep = steps.find((step) => !reviews[step.source]);
  const activeSource = openSource ?? nextStep?.source;
  const readyToClear = inProgress && !riskMatches.length && !recordedMatch && (!guided || confirmedCount === steps.length);
  const findingsText = [
    ...riskMatches.map((match) => `${match.searched_name} matches ${match.matched_name}: ${match.relationship}.`),
    ...Object.values(reviews).filter((review) => review.outcome === 'MATCH_FOUND').map((review) => `${review.matched_name}: ${review.relationship_to_firm} (${review.source_label}).`),
  ].join('\n');

  const review = (payload, done) => onReviewSource(payload, () => { setOpenSource(null); done?.(); });

  return (
    <div className='space-y-5'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div>
          <div className='flex flex-wrap items-center gap-2'>
            <Search size={18} className='text-brand-primary' />
            <h3 className='text-lg font-semibold'>Conflict search</h3>
            <ModeBadge search={search} />
          </div>
          <p className='mt-1 text-sm text-text-muted-light dark:text-text-muted-dark'>
            {search.names_searched.length} name(s) searched against {search.record_count} firm record(s) in {search.sources_searched.length} sources · {formatDateTime(search.ran_at)}
            {search.ai?.used ? ' · AI review included' : search.ai?.enabled ? ' · AI review unavailable, rules only' : ''}
          </p>
        </div>
        {editable && <Button3D type='button' size='sm' variant='secondary' disabled={busy} onClick={onRunSearch}><RefreshCw size={14} />Search again</Button3D>}
      </div>

      <div className='flex flex-wrap gap-2'>
        {search.names_searched.map((item) => <span key={item.name} className={chipClass}>{item.name}<span className='text-text-muted-light dark:text-text-muted-dark'>· {item.role}</span></span>)}
      </div>

      {(search.unlisted_parties || []).length > 0 && (
        <div className='rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm dark:border-violet-900 dark:bg-violet-950/30'>
          <p className='flex items-center gap-2 font-semibold'><Sparkles size={16} />The facts mention people who are not listed as parties</p>
          <ul className='mt-2 list-disc pl-5'>{search.unlisted_parties.map((item) => <li key={item.name}>{item.name}{item.mentioned_as ? ` (${item.mentioned_as})` : ''}</li>)}</ul>
          {inProgress && <Button3D type='button' size='sm' variant='secondary' className='mt-3' onClick={() => onRequestInformation(`Add as parties and search again: ${search.unlisted_parties.map((item) => item.name).join(', ')}.`)}>Hold the check to add them</Button3D>}
        </div>
      )}

      {riskMatches.length > 0 && (
        <section>
          <h4 className='mb-2 flex items-center gap-2 font-semibold text-amber-800 dark:text-amber-300'><AlertTriangle size={16} />Possible conflicts</h4>
          <ul className='space-y-2'>{riskMatches.map((match) => <MatchCard key={`${match.record_id}-${match.searched_name}`} match={match} />)}</ul>
        </section>
      )}
      {infoMatches.length > 0 && (
        <section>
          <h4 className='mb-2 flex items-center gap-2 font-semibold'><Info size={16} />For information: same side as before</h4>
          <ul className='space-y-2'>{infoMatches.map((match) => <MatchCard key={`${match.record_id}-${match.searched_name}`} match={match} />)}</ul>
        </section>
      )}

      <LearningProgress search={search} />

      {guided && steps.length > 0 && (
        <section>
          <h4 className='mb-2 font-semibold'>Confirm each source · {confirmedCount} of {steps.length} done</h4>
          <ol className='space-y-2'>
            {steps.map((step) => (
              <SourceStep
                key={step.source}
                step={step}
                review={reviews[step.source]}
                matches={matches.filter((match) => match.source === step.source)}
                active={activeSource === step.source}
                editable={inProgress}
                busy={busy}
                onOpen={() => setOpenSource(activeSource === step.source ? '' : step.source)}
                onReview={review}
              />
            ))}
          </ol>
        </section>
      )}

      {inProgress && (riskMatches.length > 0 || recordedMatch) && (
        <div className='rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-800 dark:bg-amber-950/30'>
          <p className='font-semibold'>These matches need an advocate's review before the firm can act.</p>
          <Button3D type='button' size='sm' className='mt-3' onClick={() => onRecordPotential(findingsText)}>Record potential conflict</Button3D>
        </div>
      )}

      {readyToClear && (
        <form className='space-y-3 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm dark:border-emerald-800 dark:bg-emerald-950/30' onSubmit={(event) => { event.preventDefault(); onClear(summary.trim()); }}>
          <p className='flex items-center gap-2 font-semibold'><CheckCircle2 size={18} className='text-emerald-600' />No conflict found{guided ? ' in the system or in the sources you confirmed' : ''}</p>
          <Field label='Clearance note (optional; the system records what was searched)' value={summary} onChange={setSummary} />
          <label className='flex items-center gap-2'>
            <input type='checkbox' checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
            I confirm this professional conflict decision for these proposed instructions only.
          </label>
          <Button3D type='submit' variant='success' disabled={!confirmed || busy}>Confirm clearance</Button3D>
        </form>
      )}
    </div>
  );
}

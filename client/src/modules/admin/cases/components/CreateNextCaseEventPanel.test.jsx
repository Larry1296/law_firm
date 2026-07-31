import '@testing-library/jest-dom/vitest';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import CreateNextCaseEventPanel from './CreateNextCaseEventPanel';

vi.mock('@/core/utils/themedSwal', () => ({
  default: { fire: vi.fn() },
}));
vi.mock('@/components/ui/Select3D', () => ({
  default: ({ label, value, onChange, options }) => (
    <label>
      {label}
      <select aria-label={label} value={value} onChange={onChange}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  ),
}));

describe('CreateNextCaseEventPanel', () => {
  const caseData = {
    id: 'case-1',
    court_stage: 'AWAITING_HEARING',
    court_stage_label: 'Awaiting hearing',
    court_name: 'High Court',
    court_station: 'Milimani',
  };

  it('uses the selected event label as the title and keeps it read-only', async () => {
    const onCreateEvent = vi.fn().mockResolvedValue({});
    render(
      <CreateNextCaseEventPanel
        caseData={caseData}
        onCreateEvent={onCreateEvent}
        isCreating={false}
      />,
    );

    fireEvent.change(screen.getByLabelText('Event Type *'), { target: { value: 'MENTION' } });
    const title = screen.getByPlaceholderText('Mention');
    expect(title).toHaveValue('Mention');
    expect(title).toHaveAttribute('readonly');

    fireEvent.change(document.querySelector('input[type="datetime-local"]'), {
      target: { value: '2030-01-02T09:00' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create event/i }));

    await vi.waitFor(() => expect(onCreateEvent).toHaveBeenCalled());
    expect(onCreateEvent.mock.calls[0][0].payload.title).toBe('Mention');
  });

  it('allows a custom title only for an internal event', () => {
    render(
      <CreateNextCaseEventPanel
        caseData={{ ...caseData, court_stage: 'NOT_FILED' }}
        onCreateEvent={vi.fn()}
        isCreating={false}
      />,
    );

    fireEvent.change(screen.getByLabelText('Event Type *'), { target: { value: 'INTERNAL' } });
    expect(screen.getByPlaceholderText('Describe the internal event')).not.toHaveAttribute('readonly');
  });
});

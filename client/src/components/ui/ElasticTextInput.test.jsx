import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ElasticTextInput from './ElasticTextInput';

const longScopeConfirmation = `The firm accepts instructions from Daniel Mutua Mwangi to pursue recovery of KES 750,000 allegedly owed by Apex Skyline Developers Limited for completed renovation and construction work.

The accepted scope includes reviewing the supplied documents, providing legal advice, issuing a formal demand, conducting settlement negotiations and, if necessary, commencing appropriate debt-recovery proceedings.

Appeals, enforcement proceedings, counterclaims and unrelated disputes are excluded unless separately agreed in writing.`;

function setScrollHeight(height) {
  Object.defineProperty(HTMLTextAreaElement.prototype, 'scrollHeight', {
    configurable: true,
    get: () => height,
  });
}

function ControlledElasticTextInput({ initialValue = '' }) {
  const [value, setValue] = React.useState(initialValue);

  return (
    <ElasticTextInput
      label='Scope confirmation'
      value={value}
      onChange={(event) => setValue(event.target.value)}
      minRows={1}
      alwaysShowLabel
    />
  );
}

describe('ElasticTextInput', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setScrollHeight(24);
  });

  it('starts at approximately one line', () => {
    render(<ControlledElasticTextInput />);

    const field = screen.getByLabelText('Scope confirmation');
    expect(field).toHaveAttribute('rows', '1');
    expect(field.style.height).toBe('24px');
  });

  it('expands after multiline text is entered', async () => {
    const user = userEvent.setup();
    render(<ControlledElasticTextInput />);

    const field = screen.getByLabelText('Scope confirmation');
    setScrollHeight(96);
    await user.type(field, 'Line one{enter}Line two{enter}Line three');

    expect(field.style.height).toBe('96px');
    expect(field).toHaveValue(`Line one\nLine two\nLine three`);
  });

  it('expands when long text wraps', async () => {
    const user = userEvent.setup();
    render(<ControlledElasticTextInput />);

    const field = screen.getByLabelText('Scope confirmation');
    setScrollHeight(144);
    await user.type(field, 'The firm accepts instructions from Daniel Mutua Mwangi to pursue recovery of KES 750,000 allegedly owed by Apex Skyline Developers Limited for completed renovation and construction work.');

    expect(field.style.height).toBe('144px');
  });

  it('resizes for a prefilled value', () => {
    setScrollHeight(216);

    render(
      <ControlledElasticTextInput
        initialValue={longScopeConfirmation}
      />,
    );

    const field = screen.getByLabelText('Scope confirmation');
    expect(field.style.height).toBe('216px');
    expect(field).toHaveValue(longScopeConfirmation);
  });

  it('shrinks after text is removed', async () => {
    const user = userEvent.setup();
    setScrollHeight(160);
    render(<ControlledElasticTextInput initialValue={`Long paragraph\n\nAnother paragraph.`} />);

    const field = screen.getByLabelText('Scope confirmation');
    expect(field.style.height).toBe('160px');

    setScrollHeight(24);
    await user.clear(field);

    expect(field.style.height).toBe('24px');
  });

  it('does not show an internal vertical scrollbar', () => {
    render(<ControlledElasticTextInput />);

    expect(screen.getByLabelText('Scope confirmation')).toHaveClass('overflow-y-hidden');
  });
});

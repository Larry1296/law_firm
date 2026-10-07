import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import AutoGrowTextarea from './AutoGrowTextarea';

// jsdom does no layout, so give the textarea a 24px line and 8px padding top and
// bottom, and a scrollHeight that follows the number of lines typed.
function mockLayout(node) {
  vi.spyOn(window, 'getComputedStyle').mockReturnValue({
    lineHeight: '24px', fontSize: '16px', paddingTop: '8px', paddingBottom: '8px',
    boxSizing: 'content-box', borderTopWidth: '0px', borderBottomWidth: '0px',
  });
  Object.defineProperty(node, 'scrollHeight', {
    configurable: true, get: () => node.value.split('\n').length * 24 + 16,
  });
}

function Controlled(props) {
  const [value, setValue] = useState('');
  return <AutoGrowTextarea aria-label='Notes' value={value} onChange={(event) => setValue(event.target.value)} {...props} />;
}

function setup(props) {
  const view = render(<Controlled {...props} />);
  const box = screen.getByLabelText('Notes');
  mockLayout(box);
  fireEvent.change(box, { target: { value: ' ' } });
  fireEvent.change(box, { target: { value: '' } });
  return { box, view };
}

describe('AutoGrowTextarea', () => {
  it('starts as a single line, ignoring rows', () => {
    const { box } = setup({ rows: 5 });
    expect(box).toHaveAttribute('rows', '1');
    expect(box.style.height).toBe('40px');
  });

  it('grows as lines are typed and shrinks when they are removed', () => {
    const { box } = setup();
    fireEvent.change(box, { target: { value: 'one\ntwo\nthree' } });
    expect(box.style.height).toBe('88px');
    fireEvent.change(box, { target: { value: 'one' } });
    expect(box.style.height).toBe('40px');
  });

  it('stops at maxRows and scrolls beyond it', () => {
    const { box } = setup({ maxRows: 2 });
    fireEvent.change(box, { target: { value: '1\n2\n3\n4' } });
    expect(box.style.height).toBe('64px');
    expect(box.style.overflowY).toBe('auto');
  });
});

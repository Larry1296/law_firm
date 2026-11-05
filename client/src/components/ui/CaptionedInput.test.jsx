import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import AutoGrowTextarea from '@/components/ui/AutoGrowTextarea';
import CaptionedInput from '@/components/ui/CaptionedInput';
import { splitLayoutClasses } from '@/components/ui/placeholderCaption';

function Box({ as: Control }) {
  const [value, setValue] = useState('');
  return <div className='grid md:grid-cols-2'><Control className='form-control md:col-span-2 mt-2' placeholder='Appearances' value={value} onChange={(event) => setValue(event.target.value)} /></div>;
}

describe('placeholder captions', () => {
  it.each([['input', CaptionedInput], ['textarea', AutoGrowTextarea]])('raises the %s placeholder to a caption once text is typed, keeping focus', async (_, Control) => {
    const user = userEvent.setup();
    render(<Box as={Control} />);
    const box = screen.getByPlaceholderText('Appearances');
    const field = box.closest('.placeholder-field');
    expect(field).not.toHaveAttribute('data-caption');
    // The grid placement moves to the wrapper, so the box sits where it did.
    expect(field).toHaveClass('md:col-span-2', 'mt-2');
    expect(box).not.toHaveClass('md:col-span-2');
    await user.type(box, 'Daniel Mutiso');
    expect(field).toHaveAttribute('data-caption', 'Appearances');
    expect(box).toHaveFocus();
    expect(box).toHaveValue('Daniel Mutiso');
  });

  it('leaves a box with a visible label, or no placeholder, as it was', () => {
    render(<><AutoGrowTextarea caption={false} placeholder='Outcome' value='x' onChange={() => {}} /><CaptionedInput value='y' onChange={() => {}} /></>);
    expect(document.querySelector('.placeholder-field')).toBeNull();
  });

  it('splits placement classes from the box\'s own look', () => {
    expect(splitLayoutClasses('form-control h-12 text-sm lg:col-span-2 w-full flex-1 -mt-1')).toEqual({ layout: 'lg:col-span-2 w-full flex-1 -mt-1', control: 'form-control h-12 text-sm' });
  });
});

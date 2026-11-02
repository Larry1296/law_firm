import { describe, expect, it } from 'vitest';
import { installNumberInputGuard } from './installNumberInputGuard';

describe('installNumberInputGuard', () => {
  installNumberInputGuard();

  it('leaves a focused number field when the wheel scrolls over it', () => {
    const input = document.createElement('input');
    input.type = 'number';
    input.value = '25000';
    document.body.appendChild(input);
    input.focus();
    input.dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaY: 100 }));
    expect(document.activeElement).not.toBe(input);
    expect(input.value).toBe('25000');
    input.remove();
  });

  it('stops arrow keys from changing a number but not other fields', () => {
    const amount = document.createElement('input');
    amount.type = 'number';
    const name = document.createElement('input');
    document.body.append(amount, name);
    const arrow = () => new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true });
    const onAmount = arrow();
    amount.dispatchEvent(onAmount);
    const onName = arrow();
    name.dispatchEvent(onName);
    expect(onAmount.defaultPrevented).toBe(true);
    expect(onName.defaultPrevented).toBe(false);
    amount.remove(); name.remove();
  });
});

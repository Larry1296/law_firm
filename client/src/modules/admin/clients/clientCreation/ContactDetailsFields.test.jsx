import '@testing-library/jest-dom/vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { AddressFields } from './ContactDetailsFields';
import { freshAddress } from './contactDetailsDefaults';

function Harness() {
  const [values, setValues] = useState(() => freshAddress(true));
  return <AddressFields values={values} set={(changes) => setValues((current) => ({ ...current, ...changes }))} isIndividual />;
}

describe('AddressFields', () => {
  it('writes the full address from its parts until it is typed by hand', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(screen.getByLabelText(/Street \/ locality/), 'Ngei Road');
    await user.type(screen.getByLabelText(/City \/ town/), 'Machakos');
    await user.type(screen.getByLabelText(/P\.O\. Box/), '123');
    await user.type(screen.getByLabelText(/Postal code/), '90100');
    const full = screen.getByLabelText(/Full formatted address/);
    expect(full).toHaveValue('Ngei Road, Machakos, P.O. Box 123-90100');

    await user.clear(full);
    await user.type(full, 'Opposite Machakos Law Courts');
    await user.type(screen.getByLabelText(/Building \/ plot/), 'Plot 4');
    expect(full).toHaveValue('Opposite Machakos Law Courts');
  });
});

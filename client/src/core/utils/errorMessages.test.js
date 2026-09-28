import { describe, expect, it } from 'vitest';

import { getApiErrorMessage } from './errorMessages';

describe('getApiErrorMessage', () => {
  it('never shows an HTML error page as the message', () => {
    const error = { response: { status: 404, data: '<!DOCTYPE html><html><title>Page not found</title></html>' } };
    expect(getApiErrorMessage(error)).toBe('This service is not available right now. Please try again later.');
  });

  it('still uses the API message when there is one', () => {
    expect(getApiErrorMessage({ response: { status: 400, data: { message: 'Enter your National ID.' } } })).toBe('Enter your National ID.');
  });
});

import {afterEach, describe, expect, it, vi} from 'vitest';
import {cleanup, fireEvent, render, screen} from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import StaffPermissionPicker from './StaffPermissionPicker';
import {permissionCodesFor} from '../staffPermissionOptions';

afterEach(cleanup);

describe('staff permission picker', () => {
  it('offers the intake, closing and client-money grants the create form used to leave out', () => {
    expect(permissionCodesFor('LAWYER')).toEqual(expect.arrayContaining([
      'PERFORM_CONFLICT_CHECK', 'ACCEPT_DECLINE_INSTRUCTIONS', 'OPEN_MATTER', 'REQUEST_MATTER_CLOSURE', 'ARCHIVE_MATTER',
    ]));
    expect(permissionCodesFor('ACCOUNTANT')).toEqual(expect.arrayContaining([
      'RECORD_RECEIPTS', 'MANAGE_CLIENT_MONEY', 'APPROVE_INVOICES', 'APPROVE_CLIENT_MONEY_PAYMENTS', 'RECONCILE_ACCOUNTS', 'MANAGE_TAX_RECORDS',
    ]));
    expect(permissionCodesFor('LAWYER')).not.toContain('USE_AI_TOOLS');
  });

  it('toggles one grant and selects a whole group without touching others', () => {
    const onChange = vi.fn();
    render(<StaffPermissionPicker role='LAWYER' selected={['VIEW_BILLING']} onChange={onChange} />);

    fireEvent.click(screen.getByLabelText('Run conflict checks'));
    expect(onChange).toHaveBeenLastCalledWith(['VIEW_BILLING', 'PERFORM_CONFLICT_CHECK']);

    fireEvent.click(screen.getAllByRole('button', {name: 'Select all'})[2]);
    const closing = onChange.mock.lastCall[0];
    expect(closing).toContain('VIEW_BILLING');
    expect(closing).toEqual(expect.arrayContaining(['REQUEST_MATTER_CLOSURE', 'APPROVE_DESTRUCTION']));
  });
});

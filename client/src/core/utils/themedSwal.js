import Swal from 'sweetalert2';
import { issueConfirmation } from './confirmationContext';

const getThemeValues = () => {
  const root = document.documentElement;
  const styles = getComputedStyle(root);
  const isDark = root.classList.contains('dark');

  return {
    isDark,
    background: styles.getPropertyValue('--surface').trim() || '#ffffff',
    color: styles.getPropertyValue('--text-primary').trim() || '#0f172a',
    muted: styles.getPropertyValue('--text-muted').trim() || '#64748b',
    border: styles.getPropertyValue('--border').trim() || '#e2e8f0',
    // The form action colour: navy in light mode, gold in dark mode.
    primary: styles.getPropertyValue('--form-primary').trim() || styles.getPropertyValue('--brand-primary').trim() || '#0a2540',
    error: styles.getPropertyValue('--error').trim() || '#ef4444',
    warning: styles.getPropertyValue('--warning').trim() || '#b87503',
  };
};

const withTheme = (options = {}) => {
  const theme = getThemeValues();
  const customClass = options.customClass || {};

  return {
    background: theme.background,
    color: theme.color,
    confirmButtonColor: options.confirmButtonColor || theme.primary,
    cancelButtonColor: options.cancelButtonColor || theme.muted,
    ...options,
    customClass: {
      container: `app-swal-container ${theme.isDark ? 'app-swal-container-dark' : 'app-swal-container-light'} ${customClass.container || ''}`,
      popup: `app-swal-popup ${theme.isDark ? 'app-swal-dark' : 'app-swal-light'} ${customClass.popup || ''}`,
      title: `app-swal-title ${customClass.title || ''}`,
      htmlContainer: `app-swal-html ${customClass.htmlContainer || ''}`,
      actions: `app-swal-actions ${customClass.actions || ''}`,
      input: `app-swal-input ${customClass.input || ''}`,
      confirmButton: `app-swal-confirm ${options.confirmButtonColor ? '' : 'app-swal-confirm-default'} ${customClass.confirmButton || ''}`,
      cancelButton: `app-swal-cancel ${customClass.cancelButton || ''}`,
      validationMessage: `app-swal-validation ${customClass.validationMessage || ''}`,
    },
  };
};

const themedSwal = {
  // Accepts SweetAlert2's shorthand too: fire(title, text, icon).
  async fire(options = {}, text, icon) {
    const args = typeof options === 'string' ? { title: options, text, icon } : { ...options };
    // Cancellation is a normal choice, not an error notification.
    if (args.icon === 'error' && ('text' in args) && (!args.text || args.text === 'Action cancelled. No changes were made.')) return { isConfirmed: false, isDismissed: true };
    const preConfirm = args.preConfirm;
    if (preConfirm) args.preConfirm = (value) => preConfirm(value, issueConfirmation());
    const result = await Swal.fire(withTheme(args));
    if (result.isConfirmed && (args.showCancelButton || args.input || preConfirm)) return { ...result, confirmation: issueConfirmation() };
    return result;
  },

  mixin(options = {}) {
    return Swal.mixin(withTheme(options));
  },

  getPopup: Swal.getPopup,
  showValidationMessage: Swal.showValidationMessage,
};

/**
 * Resolves to a one-use request capability when confirmed, or false on cancel.
 * `tone` colours the confirm button from the current theme: 'danger' for what cannot be
 * undone, 'warning' for what changes a record others rely on, 'primary' otherwise.
 */
export async function confirmAction({ title, text, html, confirmText = 'Confirm', cancelText = 'Cancel', tone = 'primary' }) {
  const theme = getThemeValues();
  const toneColor = { danger: theme.error, warning: theme.warning }[tone];
  const result = await themedSwal.fire({
    icon: tone === 'primary' ? 'question' : 'warning',
    titleText: title,
    text,
    html,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    reverseButtons: true,
    focusCancel: tone !== 'primary',
    ...(toneColor ? { confirmButtonColor: toneColor } : {}),
  });
  return result.isConfirmed ? result.confirmation : false;
}

/** The theme colour for a destructive or cautionary confirm button, for prompts built by hand. */
export const toneColor = (tone) => ({ danger: getThemeValues().error, warning: getThemeValues().warning }[tone]);

export default themedSwal;

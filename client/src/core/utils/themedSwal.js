import Swal from 'sweetalert2';

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
    primary: styles.getPropertyValue('--brand-primary').trim() || '#0a2540',
    error: styles.getPropertyValue('--error').trim() || '#ef4444',
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
      confirmButton: `app-swal-confirm ${customClass.confirmButton || ''}`,
      cancelButton: `app-swal-cancel ${customClass.cancelButton || ''}`,
      validationMessage: `app-swal-validation ${customClass.validationMessage || ''}`,
    },
  };
};

const themedSwal = {
  fire(options = {}) {
    return Swal.fire(withTheme(options));
  },

  mixin(options = {}) {
    return Swal.mixin(withTheme(options));
  },

  getPopup: Swal.getPopup,
  showValidationMessage: Swal.showValidationMessage,
};

export default themedSwal;

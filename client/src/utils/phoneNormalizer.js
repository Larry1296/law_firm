export function normalizeKenyanPhone(input) {
  if (!input) return null;

  // remove spaces, dashes, brackets
  let phone = input.replace(/[\s\-()]/g, '');

  // handle formats
  if (phone.startsWith('+254')) {
    return phone;
  }

  if (phone.startsWith('254')) {
    return `+${phone}`;
  }

  if (phone.startsWith('0')) {
    return `+254${phone.slice(1)}`;
  }

  // local format like 712345678
  if (/^7\d{8}$/.test(phone)) {
    return `+254${phone}`;
  }

  return phone; // fallback
}

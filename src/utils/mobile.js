// Mobile number rules shared by every mobile field in the student portal.
// - digits only, and the number can never start with 0
// - India (+91): exactly 10 digits; other countries: 6 to 15 digits

export const mobileMaxLength = (countryCode) => (countryCode === '+91' ? 10 : 15);

/**
 * Clean what the user types or pastes: digits only, no leading 0, cut to the country's maximum.
 * A pasted number that includes the selected country code ("+91 98765 43210", "0091 98765 43210",
 * "919876543210") has the code removed.
 */
export function sanitizeMobileInput(value, countryCode) {
  const raw = String(value || '').trim();
  const max = mobileMaxLength(countryCode);
  const cc = String(countryCode || '').replace(/\D/g, '');
  let digits = raw.replace(/\D/g, '').replace(/^0+/, '');
  const hasCountryCode =
    cc && digits.startsWith(cc) && (raw.startsWith('+') || raw.startsWith('00') || digits.length === max + cc.length);
  if (hasCountryCode) digits = digits.slice(cc.length).replace(/^0+/, '');
  return digits.slice(0, max);
}

/** Returns an error message, or '' when the number is valid. */
export function mobileProblem(mobile, countryCode) {
  const digits = String(mobile || '').replace(/\D/g, '');
  if (!digits) return 'Please enter your registered mobile number.';
  if (digits.startsWith('0')) return 'Mobile number cannot start with 0.';
  if (countryCode === '+91') {
    return digits.length === 10 ? '' : 'Please enter a valid 10-digit mobile number.';
  }
  return digits.length >= 6 && digits.length <= 15 ? '' : 'Please enter a valid mobile number.';
}

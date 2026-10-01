const E164 = /^\\+[1-9]\\d{7,14}$/;

export function normalizePhoneNumber(value, { defaultCountryCode = '44', assumeNational = false } = {}) {
  let raw = String(value || '').trim();
  if (!raw) return '';

  const hadInternationalPrefix = raw.startsWith('+') || raw.startsWith('00');
  let digits = raw.replace(/\\D/g, '');
  if (!digits) return '';

  if (digits.startsWith('00')) digits = digits.slice(2);
  if (!digits) return '';

  if (hadInternationalPrefix) return `+${digits}`;
  if (digits.startsWith(defaultCountryCode)) return `+${digits}`;
  if (digits.startsWith('0')) return `+${defaultCountryCode}${digits.slice(1)}`;
  if (assumeNational) return `+${defaultCountryCode}${digits}`;
  return `+${digits}`;
}

export function isE164PhoneNumber(value) {
  return E164.test(normalizePhoneNumber(value));
}

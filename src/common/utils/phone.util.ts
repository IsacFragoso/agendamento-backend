const PHONE_DIGITS_REGEX = /^\d{11}$/;

export function sanitizePhoneNumber(value: string | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  const digits = String(value).replace(/\D/g, '');
  return digits.length > 0 ? digits : null;
}

export function isValidPhoneNumber(value: string | null | undefined) {
  if (!value) {
    return false;
  }

  return PHONE_DIGITS_REGEX.test(value);
}

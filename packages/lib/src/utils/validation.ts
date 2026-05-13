/** Validate Indian mobile number (10 digits, starts with 6–9) */
export function isValidPhone(phone: string): boolean {
  return /^[6-9]\d{9}$/.test(phone.replace(/\s/g, ''))
}

/** Normalise phone to E.164 format for MSG91 (+91XXXXXXXXXX) */
export function toE164(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('91') && digits.length === 12) return `+${digits}`
  if (digits.length === 10) return `+91${digits}`
  return `+${digits}`
}

/** Validate 6-digit OTP */
export function isValidOtp(otp: string): boolean {
  return /^\d{6}$/.test(otp)
}

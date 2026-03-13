export function normalizePhone(phone: string): string | null {
  let cleaned = phone.replace(/[^\d+]/g, '')

  if (cleaned.startsWith('00962')) {
    cleaned = '+962' + cleaned.slice(5)
  } else if (cleaned.startsWith('962')) {
    cleaned = '+962' + cleaned.slice(3)
  } else if (cleaned.startsWith('0')) {
    cleaned = '+962' + cleaned.slice(1)
  } else if (!cleaned.startsWith('+')) {
    cleaned = '+962' + cleaned
  }

  const jordanRegex = /^\+962[0-9]{9}$/
  if (!jordanRegex.test(cleaned)) {
    return null
  }

  return cleaned
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function isPhone(value: string): boolean {
  return /^[\+]?[0-9\s\-\(\)]{7,}$/.test(value)
}

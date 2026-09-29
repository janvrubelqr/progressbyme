export function digitsOnly(value: string): string {
  return value.replace(/[^0-9]/g, '')
}

// Allows digits and a single decimal separator (comma or dot) — for fields
// like weight where fractional values are expected.
export function decimalDigitsOnly(value: string): string {
  const cleaned = value.replace(/[^0-9.,]/g, '')
  const firstSeparator = cleaned.search(/[.,]/)
  if (firstSeparator === -1) return cleaned

  const before = cleaned.slice(0, firstSeparator + 1)
  const after = cleaned.slice(firstSeparator + 1).replace(/[.,]/g, '')
  return before + after
}

export function formatCharacterCount(value: string, maximum: number): string {
  const safeMaximum = Math.max(0, maximum)
  const current = Math.min(Math.max(0, value.length), safeMaximum)
  return `${current}/${safeMaximum} caracteres`
}

/**
 * Maps a caret position in formatted text to a raw digit index.
 * @param {string} formatted
 * @param {number} caret
 * @returns {number}
 */
export function getRawCaretIndex(formatted, caret) {
  return sanitizeNumericInput(formatted.slice(0, caret)).length
}

/**
 * Maps a raw digit index to a caret position in formatted text.
 * @param {string} formatted
 * @param {number} rawIndex
 * @returns {number}
 */
export function getFormattedCaretIndex(formatted, rawIndex) {
  if (rawIndex <= 0) return 0

  let count = 0
  for (let i = 0; i < formatted.length; i++) {
    if (formatted[i] !== ' ') count++
    if (count >= rawIndex) return i + 1
  }

  return formatted.length
}

/**
 * Inserts or replaces digits in a raw numeric string.
 * @param {string} raw
 * @param {number} start
 * @param {number} end
 * @param {string} [insert='']
 * @returns {string}
 */
export function editRawDigits(raw, start, end, insert = '') {
  return `${raw.slice(0, start)}${insert}${raw.slice(end)}`
}

/**
 * Strips all non-digit characters from a string.
 * @param {string} raw
 * @returns {string}
 */
export function sanitizeNumericInput(raw) {
  return raw.replace(/\D/g, '')
}

/**
 * @param {KeyboardEvent} event
 * @returns {boolean}
 */
export function isAllowedPriceKey(event) {
  if (event.ctrlKey || event.metaKey || event.altKey) return true

  const allowed = [
    'Backspace',
    'Delete',
    'ArrowLeft',
    'ArrowRight',
    'ArrowUp',
    'ArrowDown',
    'Tab',
    'Home',
    'End',
    'Enter',
    'Escape',
  ]

  if (allowed.includes(event.key)) return true
  return /^\d$/.test(event.key)
}

/**
 * Formats a numeric value with space as thousands separator.
 * @param {number | null | undefined} value
 * @returns {string}
 */
export function formatPrice(value) {
  if (value == null || Number.isNaN(value)) return ''
  return Math.trunc(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

/**
 * Parses a formatted price string back to a number.
 * @param {string} raw
 * @returns {number | null}
 */
export function parsePrice(raw) {
  const digits = sanitizeNumericInput(raw)
  if (digits === '') return null
  const parsed = Number.parseInt(digits, 10)
  return Number.isNaN(parsed) ? null : parsed
}

/**
 * Syncs stable digit item keys when formatted text changes.
 * @param {{ id: number, char: string }[]} prevItems
 * @param {string} newText
 * @param {{ current: number }} nextIdRef
 * @returns {{ id: number, char: string }[]}
 */
export function syncAnimatedDigitItems(prevItems, newText, nextIdRef) {
  const prevText = prevItems.map((item) => item.char).join('')
  if (prevText === newText) return prevItems

  let start = 0
  while (
    start < prevText.length &&
    start < newText.length &&
    prevText[start] === newText[start]
  ) {
    start++
  }

  let prevEnd = prevText.length
  let newEnd = newText.length
  while (
    prevEnd > start &&
    newEnd > start &&
    prevText[prevEnd - 1] === newText[newEnd - 1]
  ) {
    prevEnd--
    newEnd--
  }

  const kept = prevItems.slice(0, start)
  const newMiddle = newText
    .slice(start, newEnd)
    .split('')
    .map((char) => ({ id: nextIdRef.current++, char }))
  const oldSuffix = prevItems.slice(prevEnd)
  const newSuffix = newText
    .slice(newEnd)
    .split('')
    .map((char, index) => ({
      id: oldSuffix[index]?.id ?? nextIdRef.current++,
      char,
    }))

  return [...kept, ...newMiddle, ...newSuffix]
}

/**
 * Returns adaptive font size based on formatted display length.
 * Shrinks after 5 characters to keep long values on screen.
 * @param {string} displayValue
 * @returns {number}
 */
export function getAdaptiveFontSize(displayValue) {
  const length = displayValue.length

  if (length <= 5) return 64
  if (length <= 9) return 48
  return 36
}

/**
 * Resolves visual state for the price input.
 * @param {object} params
 * @returns {'default' | 'focused' | 'filled' | 'error' | 'disabled' | 'loading'}
 */
export function resolvePriceInputState({
  disabled,
  loading,
  error,
  isFocused,
  hasValue,
}) {
  if (disabled) return 'disabled'
  if (loading) return 'loading'
  if (error) return 'error'
  if (isFocused) return 'focused'
  if (hasValue) return 'filled'
  return 'default'
}

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
 * @param {string} rawDigits
 * @returns {string}
 */
export function formatAmountDisplay(rawDigits) {
  if (!rawDigits) return '0'
  return rawDigits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

/**
 * @param {string} displayText
 * @returns {number}
 */
export function getWiseAdaptiveFontSize(displayText) {
  const length = displayText.length

  if (length <= 1) return 88
  if (length <= 2) return 80
  if (length <= 3) return 72
  if (length <= 5) return 60
  if (length <= 7) return 50
  return 42
}

/**
 * @param {string} raw
 * @param {number} start
 * @param {number} end
 * @param {string} [insert='']
 * @returns {string}
 */
export function editRawDigits(raw, start, end, insert = '') {
  return `${raw.slice(0, start)}${insert}${raw.slice(end)}`
}

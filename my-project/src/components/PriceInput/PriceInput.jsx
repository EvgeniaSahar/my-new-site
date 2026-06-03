import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  editRawDigits,
  formatPrice,
  getAdaptiveFontSize,
  getFormattedCaretIndex,
  getRawCaretIndex,
  isAllowedPriceKey,
  parsePrice,
  resolvePriceInputState,
  sanitizeNumericInput,
  syncAnimatedDigitItems,
} from './utils'
import { scaleDownFadeDigitVariants } from './scaleDownFadeMotion'
import './PriceInput.css'

function ErrorIcon() {
  return (
    <svg
      className="price-input__error-icon"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M8 4.5v4.25M8 10.75h.01"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

function AnimatedDigits({ text, color, fontSize, isPlaceholder, animateFromIndex }) {
  const nextIdRef = useRef(0)
  const [items, setItems] = useState([])

  useLayoutEffect(() => {
    setItems((prev) => {
      const prevText = prev.map((item) => item.char).join('')
      if (prevText === text) return prev
      return syncAnimatedDigitItems(prev, text, nextIdRef)
    })
  }, [text])

  return (
    <motion.span
      className="price-input__digits"
      animate={{ fontSize, color }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      style={{ fontSize, color }}
      aria-hidden="true"
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {items.map((item, index) => {
          const shouldEnterAnimate = !isPlaceholder && index >= animateFromIndex

          return (
            <motion.span
              key={item.id}
              layout
              className="price-input__digit"
              variants={scaleDownFadeDigitVariants}
              initial={shouldEnterAnimate ? 'initial' : false}
              animate="animate"
              exit="exit"
            >
              {item.char === ' ' ? '\u00A0' : item.char}
            </motion.span>
          )
        })}
      </AnimatePresence>
    </motion.span>
  )
}

/**
 * Wise-style numeric price input with adaptive typography and animated states.
 */
export function PriceInput({
  value: valueProp,
  defaultValue = null,
  onChange,
  disabled = false,
  loading = false,
  readOnly = false,
  autoFocus = false,
  error = null,
  max = null,
  hint = 'No discounts or markups',
  loadingHint = 'Fetching rate...',
  placeholder = '0',
  className = '',
  'aria-label': ariaLabel = 'Amount',
}) {
  const inputRef = useRef(null)
  const pendingCaretRef = useRef(null)
  const isControlled = valueProp !== undefined
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue)
  const [isFocused, setIsFocused] = useState(false)
  const [isRejected, setIsRejected] = useState(false)
  const [animateFromIndex, setAnimateFromIndex] = useState(Number.POSITIVE_INFINITY)

  const value = isControlled ? valueProp : uncontrolledValue
  const formattedValue = formatPrice(value)
  const hasValue = value != null && formattedValue !== ''
  const limitError =
    max != null && value != null && value > max
      ? 'Amount exceeds your daily limit'
      : null
  const resolvedError = error ?? limitError
  const isEditable = !disabled && !loading && !readOnly

  const state = resolvePriceInputState({
    disabled,
    loading,
    error: resolvedError,
    isFocused,
    hasValue,
  })

  const displayText = formattedValue || (!isFocused ? placeholder : '')
  const isPlaceholder = !formattedValue && !isFocused
  const fontSize = getAdaptiveFontSize(displayText || placeholder)

  const updateValue = useCallback(
    (parsed, caretRawIndex = null) => {
      const nextFormatted = formatPrice(parsed)

      setAnimateFromIndex(
        nextFormatted.length >= formattedValue.length
          ? formattedValue.length
          : nextFormatted.length,
      )

      if (caretRawIndex != null) {
        pendingCaretRef.current = getFormattedCaretIndex(
          nextFormatted,
          caretRawIndex,
        )
      }

      if (!isControlled) {
        setUncontrolledValue(parsed)
      }

      onChange?.(parsed)
    },
    [formattedValue.length, isControlled, onChange],
  )

  useLayoutEffect(() => {
    if (pendingCaretRef.current == null || !inputRef.current) return

    const caret = pendingCaretRef.current
    pendingCaretRef.current = null
    inputRef.current.setSelectionRange(caret, caret)
  }, [formattedValue])

  const textColor =
    state === 'error'
      ? '#EF4444'
      : state === 'filled' || (hasValue && state !== 'disabled')
        ? '#1A2B4C'
        : '#94A3B8'

  const rejectInput = useCallback(() => {
    setIsRejected(true)
    window.setTimeout(() => setIsRejected(false), 420)
  }, [])

  const applyRawDigits = useCallback(
    (nextRaw, caretRawIndex) => {
      updateValue(parsePrice(nextRaw), caretRawIndex)
    },
    [updateValue],
  )

  const getSelection = useCallback(
    (input) => {
      const start = input.selectionStart ?? formattedValue.length
      const end = input.selectionEnd ?? formattedValue.length
      const raw = sanitizeNumericInput(formattedValue)

      return {
        raw,
        rawStart: getRawCaretIndex(formattedValue, start),
        rawEnd: getRawCaretIndex(formattedValue, end),
      }
    },
    [formattedValue],
  )

  const handleChange = useCallback(
    (event) => {
      if (!isEditable) return

      const sanitized = sanitizeNumericInput(event.target.value)
      if (sanitized !== event.target.value.replace(/\s/g, '')) {
        rejectInput()
      }

      updateValue(parsePrice(sanitized), sanitized.length)
    },
    [isEditable, rejectInput, updateValue],
  )

  const handleKeyDown = useCallback(
    (event) => {
      if (!isEditable) return

      const input = event.currentTarget

      if (/^\d$/.test(event.key)) {
        event.preventDefault()
        const { raw, rawStart, rawEnd } = getSelection(input)
        const nextRaw = editRawDigits(raw, rawStart, rawEnd, event.key)
        applyRawDigits(nextRaw, rawStart + 1)
        return
      }

      if (event.key === 'Backspace') {
        event.preventDefault()
        const { raw, rawStart, rawEnd } = getSelection(input)

        if (rawStart === rawEnd && rawStart > 0) {
          applyRawDigits(editRawDigits(raw, rawStart - 1, rawStart), rawStart - 1)
          return
        }

        if (rawStart !== rawEnd) {
          applyRawDigits(editRawDigits(raw, rawStart, rawEnd), rawStart)
        }

        return
      }

      if (event.key === 'Delete') {
        event.preventDefault()
        const { raw, rawStart, rawEnd } = getSelection(input)

        if (rawStart === rawEnd && rawStart < raw.length) {
          applyRawDigits(editRawDigits(raw, rawStart, rawStart + 1), rawStart)
          return
        }

        if (rawStart !== rawEnd) {
          applyRawDigits(editRawDigits(raw, rawStart, rawEnd), rawStart)
        }

        return
      }

      if (isAllowedPriceKey(event)) return

      event.preventDefault()
      rejectInput()
    },
    [applyRawDigits, getSelection, isEditable, rejectInput],
  )

  const handleBeforeInput = useCallback(
    (event) => {
      if (!isEditable) return
      if (!event.data) return
      if (!/\D/.test(event.data)) return
      event.preventDefault()
      rejectInput()
    },
    [isEditable, rejectInput],
  )

  const handlePaste = useCallback(
    (event) => {
      if (!isEditable) return

      event.preventDefault()
      const pasted = event.clipboardData.getData('text')
      const digits = sanitizeNumericInput(pasted)

      if (!digits) {
        rejectInput()
        return
      }

      const input = event.currentTarget
      const { raw, rawStart, rawEnd } = getSelection(input)
      const nextRaw = editRawDigits(raw, rawStart, rawEnd, digits)
      applyRawDigits(nextRaw, rawStart + digits.length)
    },
    [applyRawDigits, getSelection, isEditable, rejectInput],
  )

  const handleFocus = () => setIsFocused(true)

  const handleBlur = () => {
    setIsFocused(false)
    pendingCaretRef.current = null
  }

  const focusInput = () => {
    if (!isEditable) return
    inputRef.current?.focus()
  }

  return (
    <div
      className={[
        'price-input',
        `price-input--${state}`,
        isRejected ? 'price-input--rejected' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="price-input__field" onClick={focusInput}>
        {loading ? (
          <div className="price-input__skeleton" aria-hidden="true" />
        ) : (
          <>
            <div className="price-input__display">
              <AnimatedDigits
                text={displayText}
                color={textColor}
                fontSize={fontSize}
                isPlaceholder={isPlaceholder}
                animateFromIndex={animateFromIndex}
              />
            </div>

            <motion.input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9 ]*"
              autoComplete="off"
              className="price-input__input"
              value={formattedValue}
              placeholder=""
              disabled={disabled}
              readOnly={readOnly}
              autoFocus={autoFocus}
              aria-label={ariaLabel}
              aria-invalid={Boolean(resolvedError)}
              aria-describedby={
                resolvedError ? 'price-input-error' : 'price-input-hint'
              }
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onBeforeInput={handleBeforeInput}
              onPaste={handlePaste}
              onFocus={handleFocus}
              onBlur={handleBlur}
              animate={{ fontSize }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              style={{ fontSize }}
            />
          </>
        )}
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.p
            key="loading"
            className="price-input__hint"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
          >
            {loadingHint}
          </motion.p>
        ) : resolvedError ? (
          <motion.p
            key="error"
            id="price-input-error"
            className="price-input__error"
            role="alert"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
          >
            <ErrorIcon />
            {resolvedError}
          </motion.p>
        ) : (
          <motion.p
            key="hint"
            id="price-input-hint"
            className="price-input__hint"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
          >
            {hint}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}

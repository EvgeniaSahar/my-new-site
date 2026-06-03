import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { formatAmountDisplay, getWiseAdaptiveFontSize } from './utils'
import './WiseAmountInputStates.css'

const STATE_CARDS = [
  { id: 'default', label: 'Default', desc: 'Пустое поле', value: '' },
  { id: 'focused', label: 'Focused', desc: 'Активный ввод', value: '' },
  { id: 'filled', label: 'Filled', desc: 'Валидное значение', value: '4500' },
  { id: 'error', label: 'Error', desc: 'Превышен лимит', value: '99999' },
  { id: 'disabled', label: 'Disabled', desc: 'Неактивно', value: '500' },
  { id: 'loading', label: 'Loading', desc: 'Загрузка курса', value: '' },
]

const ADAPTIVE_VALUES = [
  { label: 'Short', value: '100' },
  { label: 'Medium', value: '12345' },
  { label: 'Long', value: '9876543' },
]

function getStateColor(state) {
  if (state === 'error') return '#C2122D'
  if (state === 'disabled') return '#B1BAD2'
  return '#152242'
}

function StateInput({
  state,
  rawValue,
  showSuffix = true,
  suffixSymbol = '₽',
  alignment = 'center',
}) {
  const isLoading = state === 'loading'
  const hasValue = rawValue !== ''
  const text = hasValue ? formatAmountDisplay(rawValue) : '0'
  const fontSize = getWiseAdaptiveFontSize(text)
  const color = getStateColor(state)
  const suffixColor =
    state === 'error' ? '#C2122D' : state === 'disabled' ? '#B1BAD2' : '#152242'
  const showCaret = state === 'focused'

  return (
    <div
      className={`wise-states__input wise-states__input--${state} wise-states__input--align-${alignment}`}
    >
      {isLoading ? (
        <div className="wise-states__skeleton" aria-hidden="true" />
      ) : (
        <div className="wise-states__value-wrap">
          <motion.span
            className="wise-states__value"
            animate={{ fontSize, color }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            style={{ fontSize, color }}
          >
            {text}
          </motion.span>
          {showCaret ? <span className="wise-states__caret" aria-hidden="true" /> : null}
          {showSuffix ? (
            <span
              className="wise-states__suffix"
              style={{ color: suffixColor, fontSize }}
              aria-hidden="true"
            >
              {suffixSymbol}
            </span>
          ) : null}
        </div>
      )}

      {state === 'error' ? (
        <p className="wise-states__message wise-states__message--error">
          Amount exceeds your daily limit
        </p>
      ) : state === 'loading' ? (
        <p className="wise-states__message">Fetching rate...</p>
      ) : (
        <p className="wise-states__message">No discounts or markups</p>
      )}
    </div>
  )
}

const CONTROL_KEYS = new Set([
  'Backspace',
  'Delete',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Home',
  'End',
  'Tab',
  'Enter',
  'Escape',
])

const KEYBOARD_MAX_AMOUNT = 50000

function KeyboardNumericInput({
  showSuffix = true,
  suffixSymbol = '₽',
  alignment = 'center',
}) {
  const [rawDigits, setRawDigits] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [errorPulse, setErrorPulse] = useState(false)
  const inputRef = useRef(null)
  const pulseTimeoutRef = useRef(null)

  const display = rawDigits === '' ? '0' : formatAmountDisplay(rawDigits)
  const amountValue = rawDigits === '' ? 0 : Number(rawDigits)
  const hasError = amountValue > KEYBOARD_MAX_AMOUNT
  const color = hasError ? '#C2122D' : '#152242'
  const suffixColor = hasError ? '#C2122D' : '#152242'
  const fontSize = getWiseAdaptiveFontSize(display)

  const focusField = () => inputRef.current?.focus()

  const triggerErrorPulse = useCallback(() => {
    setErrorPulse(true)
    if (pulseTimeoutRef.current) window.clearTimeout(pulseTimeoutRef.current)
    pulseTimeoutRef.current = window.setTimeout(() => {
      setErrorPulse(false)
      pulseTimeoutRef.current = null
    }, 420)
  }, [])

  useEffect(
    () => () => {
      if (pulseTimeoutRef.current) window.clearTimeout(pulseTimeoutRef.current)
    },
    [],
  )

  const commitRawDigits = useCallback(
    (nextRaw) => {
      setRawDigits(nextRaw)
      const nextValue = nextRaw === '' ? 0 : Number(nextRaw)
      if (nextValue > KEYBOARD_MAX_AMOUNT) triggerErrorPulse()
    },
    [triggerErrorPulse],
  )

  const handleKeyDown = useCallback((event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return

    if (/^\d$/.test(event.key)) {
      event.preventDefault()
      setRawDigits((prev) => {
        const nextRaw = `${prev}${event.key}`
        const nextValue = Number(nextRaw)
        if (nextValue > KEYBOARD_MAX_AMOUNT) triggerErrorPulse()
        return nextRaw
      })
      return
    }

    if (event.key === 'Backspace') {
      event.preventDefault()
      commitRawDigits(rawDigits.slice(0, -1))
      return
    }

    if (event.key === 'Delete') {
      event.preventDefault()
      commitRawDigits('')
      return
    }

    if (CONTROL_KEYS.has(event.key)) return

    event.preventDefault()
    triggerErrorPulse()
  }, [commitRawDigits, rawDigits, triggerErrorPulse])

  const handlePaste = useCallback((event) => {
    event.preventDefault()
    const pasted = event.clipboardData.getData('text')
    if (/\D/.test(pasted)) triggerErrorPulse()
    const onlyDigits = pasted.replace(/\D/g, '')
    if (!onlyDigits) return
    commitRawDigits(`${rawDigits}${onlyDigits}`)
  }, [commitRawDigits, rawDigits, triggerErrorPulse])

  const handleBeforeInput = useCallback((event) => {
    if (!event.data) return
    if (/^\d+$/.test(event.data)) return
    event.preventDefault()
    triggerErrorPulse()
  }, [triggerErrorPulse])

  const handleDrop = useCallback((event) => {
    event.preventDefault()
    triggerErrorPulse()
  }, [triggerErrorPulse])

  return (
    <div
      className={`wise-states__input wise-states__input--interactive wise-states__input--align-${alignment}${isFocused ? ' wise-states__input--active' : ''}${hasError ? ' wise-states__input--error' : ''}${errorPulse ? ' wise-states__input--error-pulse' : ''}`}
      onClick={focusField}
    >
      <div className="wise-states__value-wrap">
        <motion.span
          className="wise-states__value"
          animate={{ fontSize, color }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          style={{ fontSize, color }}
        >
          {display}
        </motion.span>
        {isFocused ? <span className="wise-states__caret" aria-hidden="true" /> : null}
        {showSuffix ? (
          <span
            className="wise-states__suffix"
            style={{ color: suffixColor, fontSize }}
            aria-hidden="true"
          >
            {suffixSymbol}
          </span>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        className="wise-states__keyboard-input"
        value={rawDigits}
        readOnly
        onKeyDown={handleKeyDown}
        onBeforeInput={handleBeforeInput}
        onPaste={handlePaste}
        onDrop={handleDrop}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        aria-label="Amount keyboard input"
      />

      {hasError ? (
        <p className="wise-states__message wise-states__message--error">
          Amount exceeds your daily limit
        </p>
      ) : (
        <p className="wise-states__message">Ввод с клавиатуры: только цифры</p>
      )}
    </div>
  )
}

export function WiseAmountInputStates({
  showSuffix = true,
  suffixSymbol = '₽',
}) {
  const [settingsShowSuffix, setSettingsShowSuffix] = useState(showSuffix)
  const [settingsSuffixSymbol, setSettingsSuffixSymbol] = useState(suffixSymbol)
  const [settingsAlignment, setSettingsAlignment] = useState('center')

  const resolvedSuffixSymbol = settingsSuffixSymbol || '₽'

  return (
    <main className="wise-states">
      <header className="wise-states__header">
        <h1 className="wise-states__title">Amount Input</h1>
        <p className="wise-states__subtitle">All states · React + Motion</p>
      </header>

      <section className="wise-states__settings">
        <label className="wise-states__settings-item">
          <input
            type="checkbox"
            checked={settingsShowSuffix}
            onChange={(event) => setSettingsShowSuffix(event.target.checked)}
          />
          <span>showSuffix</span>
        </label>

        <label className="wise-states__settings-item">
          <span>suffixSymbol</span>
          <input
            type="text"
            value={settingsSuffixSymbol}
            maxLength={2}
            onChange={(event) => setSettingsSuffixSymbol(event.target.value)}
          />
        </label>

        <label className="wise-states__settings-item">
          <span>alignment</span>
          <select
            value={settingsAlignment}
            onChange={(event) => setSettingsAlignment(event.target.value)}
          >
            <option value="center">center</option>
            <option value="right">right</option>
          </select>
        </label>
      </section>

      <section className="wise-states__grid">
        {STATE_CARDS.map((card) => (
          <article key={card.id} className="wise-states__card">
            <header className="wise-states__card-head">
              <span className={`wise-states__badge wise-states__badge--${card.id}`}>
                {card.label}
              </span>
              <span className="wise-states__card-desc">{card.desc}</span>
            </header>
            <StateInput
              state={card.id}
              rawValue={card.value}
              showSuffix={settingsShowSuffix}
              suffixSymbol={resolvedSuffixSymbol}
              alignment={settingsAlignment}
            />
          </article>
        ))}
      </section>

      <section className="wise-states__card wise-states__adaptive">
        <header className="wise-states__card-head">
          <span className="wise-states__badge wise-states__badge--adaptive">Adaptive font</span>
          <span className="wise-states__card-desc">Масштаб шрифта от длины числа</span>
        </header>
        <div className="wise-states__adaptive-row">
          {ADAPTIVE_VALUES.map(({ label, value }) => (
            <div key={label} className="wise-states__adaptive-item">
              <StateInput
                state="filled"
                rawValue={value}
                showSuffix={settingsShowSuffix}
                suffixSymbol={resolvedSuffixSymbol}
                alignment={settingsAlignment}
              />
              <span className="wise-states__adaptive-label">{label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="wise-states__card wise-states__adaptive">
        <header className="wise-states__card-head">
          <span className="wise-states__badge wise-states__badge--focused">Keyboard input</span>
          <span className="wise-states__card-desc">Можно вводить с физической клавиатуры</span>
        </header>
        <KeyboardNumericInput
          showSuffix={settingsShowSuffix}
          suffixSymbol={resolvedSuffixSymbol}
          alignment={settingsAlignment}
        />
      </section>
    </main>
  )
}

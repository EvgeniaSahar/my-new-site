import { useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  scaleDownFadeDigitVariants,
  scaleDownFadeLayoutTransition,
} from './scaleDownFadeMotion'
import {
  formatAmountDisplay,
  getWiseAdaptiveFontSize,
  syncAnimatedDigitItems,
} from './utils'
import './WiseAmountInput.css'

function AnimatedAmountDigits({
  text,
  color,
  fontSize,
  isPlaceholder,
  animateFromIndex,
}) {
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
      className="wise-amount__digits"
      animate={{ fontSize, color }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
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
              className="wise-amount__digit"
              variants={scaleDownFadeDigitVariants}
              initial={shouldEnterAnimate ? 'initial' : false}
              animate="animate"
              exit="exit"
              transition={scaleDownFadeLayoutTransition}
            >
              {item.char}
            </motion.span>
          )
        })}
      </AnimatePresence>
    </motion.span>
  )
}

function KeypadButton({ children, subLabel, onClick, className = '', icon = false }) {
  return (
    <button type="button" className={`wise-keypad__key ${className}`} onClick={onClick}>
      {icon ? children : <span className="wise-keypad__key-label">{children}</span>}
      {subLabel ? <span className="wise-keypad__key-sub">{subLabel}</span> : null}
    </button>
  )
}

function BackspaceIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="wise-keypad__backspace-icon">
      <path
        d="M19 7H8.8l-.9-1.4A1.5 1.5 0 0 0 6.7 5H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h2.7c.4 0 .8-.2 1-.5l.9-1.5H19a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="m14.5 10.5-3 3m0-3 3 3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

const KEYPAD_ROWS = [
  [
    { digit: '1', sub: '' },
    { digit: '2', sub: 'А Б В Г' },
    { digit: '3', sub: 'Д Е Ж З' },
  ],
  [
    { digit: '4', sub: 'И Й К Л' },
    { digit: '5', sub: 'М Н О П' },
    { digit: '6', sub: 'Р С Т У' },
  ],
  [
    { digit: '7', sub: 'Ф Х Ц Ч' },
    { digit: '8', sub: 'Ш Щ Ъ Ы' },
    { digit: '9', sub: 'Ь Э Ю Я' },
  ],
]

export function WiseAmountInput() {
  const [rawDigits, setRawDigits] = useState('')
  const [animateFromIndex, setAnimateFromIndex] = useState(Number.POSITIVE_INFINITY)

  const displayText = formatAmountDisplay(rawDigits)
  const isPlaceholder = rawDigits === ''
  const fontSize = getWiseAdaptiveFontSize(displayText)
  const textColor = isPlaceholder ? '#8E918A' : '#9FE870'

  const updateDigits = (nextRaw) => {
    const nextDisplay = formatAmountDisplay(nextRaw)
    const currentDisplay = formatAmountDisplay(rawDigits)

    let prefix = 0
    while (
      prefix < currentDisplay.length &&
      prefix < nextDisplay.length &&
      currentDisplay[prefix] === nextDisplay[prefix]
    ) {
      prefix++
    }

    setAnimateFromIndex(
      nextDisplay.length > prefix ? prefix : Number.POSITIVE_INFINITY,
    )
    setRawDigits(nextRaw)
  }

  const appendDigit = (digit) => {
    updateDigits(`${rawDigits}${digit}`)
  }

  const backspace = () => {
    if (!rawDigits) return
    updateDigits(rawDigits.slice(0, -1))
  }

  return (
    <div className="wise-shell">
      <div className="wise-phone">
        <div className="wise-amount">
          <button type="button" className="wise-amount__close" aria-label="Close">
            ×
          </button>

          <div className="wise-amount__row">
            <div className="wise-amount__meta">
              <span className="wise-amount__label">Вы вносите</span>
              <button type="button" className="wise-amount__currency">
                <span className="wise-amount__flag" aria-hidden="true">
                  🇪🇺
                </span>
                EUR
              </button>
            </div>

            <div className="wise-amount__value-wrap" style={{ fontSize }}>
              <AnimatedAmountDigits
                text={displayText}
                color={textColor}
                fontSize={fontSize}
                isPlaceholder={isPlaceholder}
                animateFromIndex={animateFromIndex}
              />
              <span className="wise-amount__caret" aria-hidden="true" />
            </div>
          </div>

          <div className="wise-amount__toolbar">
            <button type="button" className="wise-amount__done">
              Понятно
            </button>
          </div>

          <div className="wise-keypad">
            {KEYPAD_ROWS.map((row) => (
              <div key={row.map((item) => item.digit).join('-')} className="wise-keypad__row">
                {row.map(({ digit, sub }) => (
                  <KeypadButton
                    key={digit}
                    subLabel={sub}
                    onClick={() => appendDigit(digit)}
                  >
                    {digit}
                  </KeypadButton>
                ))}
              </div>
            ))}

            <div className="wise-keypad__row">
              <KeypadButton onClick={() => {}} className="wise-keypad__key--muted">
                .
              </KeypadButton>
              <KeypadButton onClick={() => appendDigit('0')}>0</KeypadButton>
              <KeypadButton onClick={backspace} className="wise-keypad__key--icon" icon>
                <BackspaceIcon />
              </KeypadButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

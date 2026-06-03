# Amount Input Specification

Component: `WiseAmountInputStates`

Purpose: amount entry with thousands formatting, validation, and design-system states.

## 1. Public API

### Props

- `showSuffix?: boolean` (default: `true`)
  - Show or hide currency suffix.
- `suffixSymbol?: string` (default: `₽`)
  - Suffix symbol (for example `₽`, `$`, `€`).

### Interactive demo controls

- `showSuffix`: checkbox
- `suffixSymbol`: text input (max 2 chars)
- `alignment`: `center | right`

## 2. Supported States

- `default` - empty field (`0`)
- `focused` - active input + caret
- `filled` - valid non-empty value
- `error` - value exceeds max limit
- `disabled` - non-interactive visual state
- `loading` - skeleton + loading text
- `adaptive` - typography scaling examples
- `keyboard input` - physical keyboard input demo

## 3. Input and Validation Rules

### Allowed input

- Digits only: `0-9`

### Blocked input

- Letters and special symbols are blocked across:
  - keyboard typing
  - beforeinput
  - paste (non-digit filtered)
  - drop

### Key behavior

- `Backspace`: removes the last digit
- `Delete`: clears the whole value

### Formatting

- Thousands separator is a space: `1 000`, `12 345`
- Empty value is displayed as `0`

### Error rule

- Max amount: `value > 50 000`
- Error message:
  - `Amount exceeds your daily limit`

## 4. Visual Rules

### Color tokens

- Main: `#152242`
- Disabled: `#B1BAD2`
- Active indicator: `#006CFD`
- Error: `#C2122D`

### Suffix behavior

- Suffix color is always main (`#152242`) except:
  - disabled state -> disabled color
  - error state -> error color
- Suffix typography matches main numeric value.

### Focus and border

- No focus glow/border accent
- Focus is indicated by caret only
- No red error border

### Animations

- Caret blink
- Error shake (`0.42s ease`) on:
  - invalid character input
  - invalid paste/drop
  - values above max limit

## 5. Current UI Parameters

### Input container (`.wise-states__input`)

- `position: relative`
- `min-height: 118px`
- `padding: 14px 14px 12px`
- `background: #F9FBFF`
- `border: 1px solid #E6EBF4`
- `border-radius: 12px`

### Value row (`.wise-states__value-wrap`)

- `min-height: 66px`
- center aligned by default
- right aligned in `alignment = right`

### Numeric value (`.wise-states__value`)

- `font-weight: 700`
- `line-height: 0.95`
- `letter-spacing: -0.03em`
- dynamic font-size via `getWiseAdaptiveFontSize()`

### Suffix (`.wise-states__suffix`)

- `margin-left: 8px`
- same typography as numeric value
- dynamic `font-size` equal to numeric value font size

### Caret (`.wise-states__caret`)

- `width: 2px`
- `height: 4.08em`
- `margin-left: 4px`
- `margin-bottom: -0.02em`
- `border-radius: 999px`

## 6. Usage Guidelines

### Do

- Use for integer amount entry.
- Use `suffixSymbol` for locale/currency adaptation.
- Use `alignment = right` for money-heavy forms.

### Don't

- Do not use for decimal/fractional input (not supported).
- Do not layer custom formatting on top of this component.
- Do not introduce extra error/focus borders if caret-only UX is required.


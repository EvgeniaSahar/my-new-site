import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { PIN_LAYOUTS } from './layouts'
import './PinDaisy.css'

const LAYOUT_BOX_W = 220
const LAYOUT_BOX_H = 220
const DEFAULT_BOX_W = 260
const DEFAULT_BOX_H = 260
const MIN_BOX_W = 100
const MAX_BOX_W = 400
const MIN_BOX_H = 100
const MAX_BOX_H = 400
const MAX_PINS = 28
const SPACING_TYPES = [1, 2]
const SPACING_TYPE_LABELS = {
  1: 'compact',
  2: 'spacious',
}
const PIN_HALF_H = 14
const TYPE1_CENTER_GAP = 4
const TYPE2_CENTER_GAP = 6
const TYPE1_EDGE_Y = PIN_HALF_H + TYPE1_CENTER_GAP + PIN_HALF_H
const TYPE2_EDGE_Y = PIN_HALF_H + TYPE2_CENTER_GAP + PIN_HALF_H
const TYPE1_PIN18_Y = -TYPE1_EDGE_Y - PIN_HALF_H - TYPE1_CENTER_GAP - PIN_HALF_H
const TYPE1_PIN19_Y = TYPE1_EDGE_Y + PIN_HALF_H + TYPE1_CENTER_GAP + PIN_HALF_H
const TYPE2_PIN18_Y = -TYPE2_EDGE_Y - PIN_HALF_H - TYPE2_CENTER_GAP - PIN_HALF_H
const TYPE2_PIN19_Y = TYPE2_EDGE_Y + PIN_HALF_H + TYPE2_CENTER_GAP + PIN_HALF_H
const PIN18_INDEX = 17
const PIN19_INDEX = 18
const TYPE1_PAIR_GAP = 4
const TYPE1_PIN45_EDGE_GAP = TYPE1_PAIR_GAP * 2
const TYPE2_PIN45_EDGE_GAP = 12
const TYPE1_PIN67_EDGE_GAP = 8
const TYPE2_PIN67_EDGE_GAP = 12
const TYPE1_PIN89_GAP = 68
const TYPE2_PIN89_GAP = 80
const TYPE1_PIN2021_GAP = 48
const TYPE2_PIN2021_GAP = 60
const PIN45_INDEXES = new Set([3, 4])
const PIN67_INDEXES = new Set([5, 6])
const PIN8_INDEX = 7
const PIN9_INDEX = 8
const PIN10_INDEX = 9
const PIN11_INDEX = 10
const PIN12_INDEX = 11
const PIN13_INDEX = 12
const PIN14_INDEX = 13
const PIN15_INDEX = 14
const PIN16_INDEX = 15
const PIN17_INDEX = 16
const PIN20_INDEX = 19
const PIN21_INDEX = 20
const PIN22_INDEX = 21
const PIN23_INDEX = 22
const PIN24_INDEX = 23
const PIN25_INDEX = 24
const PIN26_INDEX = 25
const PIN27_INDEX = 26
const PIN28_INDEX = 27
const PIN1011_ROW_Y = -32
const PIN2021_ROW_Y = -64
const PIN2223_ROW_Y = 64
const PIN1213_ROW_Y = 32
const PIN1415_ROW_Y = -48
const PIN2425_ROW_Y = -80
const PIN2627_ROW_Y = 80
const PIN1617_ROW_Y = 48
const PIN4_ROW_Y = -16
const PIN6_ROW_Y = 16
const TYPE1_PIN6_PIN16_GAP = 4
const TYPE1_PIN16_BELOW_PIN6_Y =
  PIN6_ROW_Y + PIN_HALF_H + TYPE1_PIN6_PIN16_GAP + PIN_HALF_H
const TYPE1_PIN4_PIN14_GAP = 4
const TYPE1_PIN14_ABOVE_PIN4_Y =
  PIN4_ROW_Y - PIN_HALF_H - TYPE1_PIN4_PIN14_GAP - PIN_HALF_H
const TYPE1_PIN28_Y = 92
const TYPE2_PIN28_Y = 98
const TYPE2_RIGHT_COL_GAP = 6
const TYPE2_RIGHT_COL_STEP = PIN_HALF_H + TYPE2_RIGHT_COL_GAP + PIN_HALF_H
const RIGHT_COL_STACK_INDEXES = new Set([
  3, 4, 5, 6, 13, 14, 15, 16, 23, 24, 25, 26,
])
const RIGHT_INSET_STACK_INDEXES = new Set([
  7, 8, 9, 10, 11, 12, 19, 20, 21, 22,
])
const TYPE1_PIN1415_EDGE_GAP = 8
const TYPE2_PIN1415_EDGE_GAP = 12

function type2RightInsetColumnY(layoutY) {
  switch (layoutY) {
    case 0:
      return 0
    case PIN1011_ROW_Y:
      return -TYPE2_EDGE_Y
    case PIN1213_ROW_Y:
      return TYPE2_EDGE_Y
    case PIN2021_ROW_Y:
      return -TYPE2_EDGE_Y * 2
    case PIN2223_ROW_Y:
      return TYPE2_EDGE_Y * 2
    default:
      return null
  }
}

function type2RightColumnY(layoutY) {
  switch (layoutY) {
    case PIN4_ROW_Y:
      return PIN4_ROW_Y
    case PIN6_ROW_Y:
      return PIN4_ROW_Y + TYPE2_RIGHT_COL_STEP
    case PIN1415_ROW_Y:
      return PIN4_ROW_Y - TYPE2_RIGHT_COL_STEP
    case PIN1617_ROW_Y:
      return PIN4_ROW_Y + TYPE2_RIGHT_COL_STEP * 2
    case PIN2425_ROW_Y:
      return PIN4_ROW_Y - TYPE2_RIGHT_COL_STEP * 2
    case PIN2627_ROW_Y:
      return PIN4_ROW_Y + TYPE2_RIGHT_COL_STEP * 3
    default:
      return null
  }
}

function insetRowY(rowY, spacingType) {
  if (spacingType === 2) {
    const nextY = type2RightInsetColumnY(rowY)
    if (nextY != null) return nextY
  }
  return rowY
}

function isCenteredPinRow(p, i, rightIndex, leftIndex, rowY, spacingType) {
  const y = insetRowY(rowY, spacingType)
  return (
    (i === rightIndex && p.xRightInset != null && p.y === y) ||
    (i === leftIndex && p.xGapFrom === rightIndex && p.y === y)
  )
}

function isPin89Row(p, i, spacingType) {
  return isCenteredPinRow(p, i, PIN8_INDEX, PIN9_INDEX, 0, spacingType)
}

function isPin1011Row(p, i, spacingType) {
  return isCenteredPinRow(
    p,
    i,
    PIN10_INDEX,
    PIN11_INDEX,
    PIN1011_ROW_Y,
    spacingType,
  )
}

function isPin1213Row(p, i, spacingType) {
  return isCenteredPinRow(
    p,
    i,
    PIN12_INDEX,
    PIN13_INDEX,
    PIN1213_ROW_Y,
    spacingType,
  )
}

function isPin14Type1AbovePin4(p, i) {
  return i === PIN14_INDEX && p.xPairGap && !p.mirror
}

function isPin1415Row() {
  return false
}

function isPin2425Row(p, i) {
  return (
    (i === PIN24_INDEX && p.xPairGap && !p.mirror) ||
    (i === PIN25_INDEX && p.xGapFrom === PIN24_INDEX)
  )
}

function isPin2627Row(p, i) {
  return (
    (i === PIN26_INDEX && p.xPairGap && !p.mirror) ||
    (i === PIN27_INDEX && p.xGapFrom === PIN26_INDEX)
  )
}

function isPin1617Row(p, i) {
  return (
    (i === PIN16_INDEX && p.xHalfPin && !p.mirror) ||
    (i === PIN17_INDEX && p.xGapFrom === PIN16_INDEX)
  )
}

function isPin1617LayoutRow(p, i) {
  return (
    (i === PIN16_INDEX &&
      p.xHalfPin &&
      !p.mirror &&
      p.y === PIN1617_ROW_Y) ||
    (i === PIN17_INDEX &&
      p.xGapFrom === PIN16_INDEX &&
      p.y === PIN1617_ROW_Y)
  )
}

function isPin2021Row(p, i, spacingType) {
  return isCenteredPinRow(
    p,
    i,
    PIN20_INDEX,
    PIN21_INDEX,
    PIN2021_ROW_Y,
    spacingType,
  )
}

function isPin2223Row(p, i, spacingType) {
  return isCenteredPinRow(
    p,
    i,
    PIN22_INDEX,
    PIN23_INDEX,
    PIN2223_ROW_Y,
    spacingType,
  )
}

function isCenteredRowPin(p, i, spacingType) {
  return (
    isPin89Row(p, i, spacingType) ||
    isPin1011Row(p, i, spacingType) ||
    isPin1213Row(p, i, spacingType) ||
    isPin1415Row(p, i) ||
    isPin2425Row(p, i) ||
    isPin2627Row(p, i) ||
    isPin1617Row(p, i) ||
    isPin2021Row(p, i, spacingType) ||
    isPin2223Row(p, i, spacingType)
  )
}

function pin1415EdgeGap(spacingType) {
  return spacingType === 2 ? TYPE2_PIN1415_EDGE_GAP : TYPE1_PIN1415_EDGE_GAP
}

function centeredRowEdgeGap(spacingType) {
  return spacingType === 2 ? TYPE2_PIN89_GAP : TYPE1_PIN89_GAP
}

function pin2021EdgeGap(spacingType) {
  return spacingType === 2 ? TYPE2_PIN2021_GAP : TYPE1_PIN2021_GAP
}

function resolveGap(i, p, spacingType) {
  if (
    (i === PIN9_INDEX && p.xGapFrom === PIN8_INDEX && p.gap === TYPE1_PIN89_GAP) ||
    (i === PIN11_INDEX &&
      p.xGapFrom === PIN10_INDEX &&
      p.gap === TYPE1_PIN89_GAP) ||
    (i === PIN13_INDEX &&
      p.xGapFrom === PIN12_INDEX &&
      p.gap === TYPE1_PIN89_GAP) ||
    (i === PIN21_INDEX &&
      p.xGapFrom === PIN20_INDEX &&
      p.gap === TYPE1_PIN2021_GAP) ||
    (i === PIN23_INDEX &&
      p.xGapFrom === PIN22_INDEX &&
      p.gap === TYPE1_PIN2021_GAP)
  ) {
    if (
      (i === PIN21_INDEX && p.xGapFrom === PIN20_INDEX) ||
      (i === PIN23_INDEX && p.xGapFrom === PIN22_INDEX)
    ) {
      return pin2021EdgeGap(spacingType)
    }
    return centeredRowEdgeGap(spacingType)
  }
  if (
    (i === PIN15_INDEX &&
      p.xGapFrom === PIN14_INDEX &&
      p.gap === TYPE1_PIN1415_EDGE_GAP) ||
    (i === PIN17_INDEX &&
      p.xGapFrom === PIN16_INDEX &&
      p.gap === TYPE1_PIN1415_EDGE_GAP) ||
    (i === PIN25_INDEX &&
      p.xGapFrom === PIN24_INDEX &&
      p.gap === TYPE1_PIN1415_EDGE_GAP) ||
    (i === PIN27_INDEX &&
      p.xGapFrom === PIN26_INDEX &&
      p.gap === TYPE1_PIN1415_EDGE_GAP)
  ) {
    return pin1415EdgeGap(spacingType)
  }
  return p.gap
}

const PRICES = [
  5600, 5600, 5600, 5600, 25600, 5600, 5600, 5600, 5600, 5600, 5600, 5600, 5600, 5600, 5600, 5600, 5600, 5600, 5600, 5600, 5600, 5600, 5600, 5600, 5600, 5600, 5600, 5600,
  3990, 5540, 14200, 6890, 17300, 4680, 8740, 11015, 15600, 13340,
  4870, 9500, 18200, 7110, 16990, 5320, 12780, 19450,
]

function formatRub(value) {
  return `${value.toLocaleString('ru-RU').replace(/,/g, ' ')} ₽`
}

function isCenterColumnPin(p, i) {
  return i === 0 || p.x === 0
}

function PinDaisy() {
  const [count, setCount] = useState(1)
  const [boxW, setBoxW] = useState(DEFAULT_BOX_W)
  const [boxH, setBoxH] = useState(DEFAULT_BOX_H)
  const [spacingType, setSpacingType] = useState(1)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [halfPinW, setHalfPinW] = useState(42)
  const [pairOffset, setPairOffset] = useState(50)
  const [pairOffset45, setPairOffset45] = useState(50)
  const [halfPinOffset67, setHalfPinOffset67] = useState(50)
  const [pin89Offset, setPin89Offset] = useState(50)
  const [pin1011Offset, setPin1011Offset] = useState(50)
  const [pin1213Offset, setPin1213Offset] = useState(50)
  const [pin1415Offset, setPin1415Offset] = useState(50)
  const [pin2425Offset, setPin2425Offset] = useState(50)
  const [pin2627Offset, setPin2627Offset] = useState(50)
  const [pin1617Offset, setPin1617Offset] = useState(50)
  const [pin2021Offset, setPin2021Offset] = useState(50)
  const [pin2223Offset, setPin2223Offset] = useState(50)
  const [rightInsetXs, setRightInsetXs] = useState({})
  const [gapFromXs, setGapFromXs] = useState({})
  const pinRefs = useRef([])

  const positions = useMemo(() => {
    const layout = PIN_LAYOUTS[count]
    const base =
      layout ??
      PIN_LAYOUTS[Math.max(...Object.keys(PIN_LAYOUTS).map(Number))].slice(
        0,
        count,
      )
    return base.map((p, i) => {
      if (spacingType === 2 && i === 1 && p.y === -TYPE1_EDGE_Y) {
        return { ...p, y: -TYPE2_EDGE_Y }
      }
      if (spacingType === 2 && i === 2 && p.y === TYPE1_EDGE_Y) {
        return { ...p, y: TYPE2_EDGE_Y }
      }
      if (
        spacingType === 2 &&
        i === PIN18_INDEX &&
        p.x === 0 &&
        p.y === TYPE1_PIN18_Y
      ) {
        return { ...p, y: TYPE2_PIN18_Y }
      }
      if (
        spacingType === 2 &&
        i === PIN19_INDEX &&
        p.x === 0 &&
        p.y === TYPE1_PIN19_Y
      ) {
        return { ...p, y: TYPE2_PIN19_Y }
      }
      if (spacingType === 2 && RIGHT_COL_STACK_INDEXES.has(i)) {
        const nextY = type2RightColumnY(p.y)
        if (nextY != null) return { ...p, y: nextY }
      }
      if (spacingType === 2 && RIGHT_INSET_STACK_INDEXES.has(i)) {
        const nextY = type2RightInsetColumnY(p.y)
        if (nextY != null) return { ...p, y: nextY }
      }
      if (isPin1617LayoutRow(p, i) && spacingType === 1) {
        return { ...p, y: TYPE1_PIN16_BELOW_PIN6_Y, z: 50 }
      }
      if (isPin14Type1AbovePin4(p, i) && spacingType === 1) {
        return { ...p, y: TYPE1_PIN14_ABOVE_PIN4_Y, z: 50 }
      }
      if (i === PIN28_INDEX && spacingType === 2) {
        return { ...p, y: TYPE2_PIN28_Y }
      }
      if (i === PIN28_INDEX) {
        return { ...p, y: TYPE1_PIN28_Y }
      }
      return p
    })
  }, [count, spacingType])

  useLayoutEffect(() => {
    const ref0 = pinRefs.current[0]
    if (ref0) setHalfPinW(ref0.offsetWidth / 2)

    const ref3 = pinRefs.current[3]
    const ref4 = pinRefs.current[4]
    const ref5 = pinRefs.current[5]
    const ref6 = pinRefs.current[6]
    const ref7 = pinRefs.current[7]
    const ref8 = pinRefs.current[8]
    const ref9 = pinRefs.current[9]
    const ref10 = pinRefs.current[10]
    const ref11 = pinRefs.current[11]
    const ref12 = pinRefs.current[12]
    const ref13 = pinRefs.current[13]
    const ref14 = pinRefs.current[14]
    const ref15 = pinRefs.current[15]
    const ref16 = pinRefs.current[16]
    const ref19 = pinRefs.current[19]
    const ref20 = pinRefs.current[20]
    const ref21 = pinRefs.current[21]
    const ref22 = pinRefs.current[22]
    const pin45EdgeGap =
      spacingType === 2 ? TYPE2_PIN45_EDGE_GAP : TYPE1_PIN45_EDGE_GAP
    const pin67EdgeGap =
      spacingType === 2 ? TYPE2_PIN67_EDGE_GAP : TYPE1_PIN67_EDGE_GAP
    let currentPairOffset = TYPE1_PAIR_GAP + halfPinW
    let currentPairOffset45 = pin45EdgeGap / 2 + halfPinW
    let currentHalfPinOffset67 = pin67EdgeGap / 2 + halfPinW
    if (ref3 && ref4) {
      const halfWidths = (ref3.offsetWidth + ref4.offsetWidth) / 4
      currentPairOffset = TYPE1_PAIR_GAP + halfWidths
      currentPairOffset45 = pin45EdgeGap / 2 + halfWidths
      setPairOffset(currentPairOffset)
      setPairOffset45(currentPairOffset45)
    }
    if (ref5 && ref6) {
      const halfWidths = (ref5.offsetWidth + ref6.offsetWidth) / 4
      currentHalfPinOffset67 = pin67EdgeGap / 2 + halfWidths
      setHalfPinOffset67(currentHalfPinOffset67)
    }

    const centeredRowGap = centeredRowEdgeGap(spacingType)
    let currentPin89Offset = centeredRowGap / 2 + halfPinW
    let currentPin1011Offset = centeredRowGap / 2 + halfPinW
    let currentPin1213Offset = centeredRowGap / 2 + halfPinW
    if (ref7 && ref8) {
      const halfWidths = (ref7.offsetWidth + ref8.offsetWidth) / 4
      currentPin89Offset = centeredRowGap / 2 + halfWidths
      setPin89Offset(currentPin89Offset)
    } else if (ref7) {
      currentPin89Offset = centeredRowGap / 2 + ref7.offsetWidth / 2
      setPin89Offset(currentPin89Offset)
    }
    if (ref9 && ref10) {
      const halfWidths = (ref9.offsetWidth + ref10.offsetWidth) / 4
      currentPin1011Offset = centeredRowGap / 2 + halfWidths
      setPin1011Offset(currentPin1011Offset)
    } else if (ref9) {
      currentPin1011Offset = centeredRowGap / 2 + ref9.offsetWidth / 2
      setPin1011Offset(currentPin1011Offset)
    }
    if (ref11 && ref12) {
      const halfWidths = (ref11.offsetWidth + ref12.offsetWidth) / 4
      currentPin1213Offset = centeredRowGap / 2 + halfWidths
      setPin1213Offset(currentPin1213Offset)
    } else if (ref11) {
      currentPin1213Offset = centeredRowGap / 2 + ref11.offsetWidth / 2
      setPin1213Offset(currentPin1213Offset)
    }

    const pin1415Gap = pin1415EdgeGap(spacingType)
    let currentPin1415Offset = pin1415Gap / 2 + halfPinW
    if (ref13 && ref14) {
      const halfWidths = (ref13.offsetWidth + ref14.offsetWidth) / 4
      currentPin1415Offset = pin1415Gap / 2 + halfWidths
      setPin1415Offset(currentPin1415Offset)
    } else if (ref13) {
      setPin1415Offset(0)
    }

    const pin2425Gap = pin1415EdgeGap(spacingType)
    let currentPin2425Offset = pin2425Gap / 2 + halfPinW
    const ref23 = pinRefs.current[23]
    const ref24 = pinRefs.current[24]
    if (ref23 && ref24) {
      const halfWidths = (ref23.offsetWidth + ref24.offsetWidth) / 4
      currentPin2425Offset = pin2425Gap / 2 + halfWidths
      setPin2425Offset(currentPin2425Offset)
    } else if (ref23) {
      currentPin2425Offset = pin2425Gap / 2 + ref23.offsetWidth / 2
      setPin2425Offset(currentPin2425Offset)
    }

    const pin2627Gap = pin1415EdgeGap(spacingType)
    let currentPin2627Offset = pin2627Gap / 2 + halfPinW
    const ref25 = pinRefs.current[25]
    const ref26 = pinRefs.current[26]
    if (ref25 && ref26) {
      const halfWidths = (ref25.offsetWidth + ref26.offsetWidth) / 4
      currentPin2627Offset = pin2627Gap / 2 + halfWidths
      setPin2627Offset(currentPin2627Offset)
    } else if (ref25) {
      currentPin2627Offset = pin2627Gap / 2 + ref25.offsetWidth / 2
      setPin2627Offset(currentPin2627Offset)
    }

    const pin1617Gap = pin1415EdgeGap(spacingType)
    let currentPin1617Offset = pin1617Gap / 2 + halfPinW
    if (ref15 && ref16) {
      const halfWidths = (ref15.offsetWidth + ref16.offsetWidth) / 4
      currentPin1617Offset = pin1617Gap / 2 + halfWidths
      setPin1617Offset(currentPin1617Offset)
    } else if (ref15) {
      currentPin1617Offset = currentHalfPinOffset67
      setPin1617Offset(currentHalfPinOffset67)
    }

    const pin2021Gap = pin2021EdgeGap(spacingType)
    let currentPin2021Offset = pin2021Gap / 2 + halfPinW
    if (ref19 && ref20) {
      const halfWidths = (ref19.offsetWidth + ref20.offsetWidth) / 4
      currentPin2021Offset = pin2021Gap / 2 + halfWidths
      setPin2021Offset(currentPin2021Offset)
    } else if (ref19) {
      currentPin2021Offset = pin2021Gap / 2 + ref19.offsetWidth / 2
      setPin2021Offset(currentPin2021Offset)
    }

    const pin2223Gap = pin2021EdgeGap(spacingType)
    let currentPin2223Offset = pin2223Gap / 2 + halfPinW
    if (ref21 && ref22) {
      const halfWidths = (ref21.offsetWidth + ref22.offsetWidth) / 4
      currentPin2223Offset = pin2223Gap / 2 + halfWidths
      setPin2223Offset(currentPin2223Offset)
    } else if (ref21) {
      currentPin2223Offset = pin2223Gap / 2 + ref21.offsetWidth / 2
      setPin2223Offset(currentPin2223Offset)
    }

    const resolvedXs = {}
    positions.forEach((p, i) => {
      const el = pinRefs.current[i]
      if (isPin89Row(p, i, spacingType)) {
        if (i === PIN8_INDEX) {
          resolvedXs[i] = currentPin89Offset
        } else {
          resolvedXs[i] = -currentPin89Offset
        }
      } else if (isPin1011Row(p, i, spacingType)) {
        if (i === PIN10_INDEX) {
          resolvedXs[i] = currentPin1011Offset
        } else {
          resolvedXs[i] = -currentPin1011Offset
        }
      } else if (isPin1213Row(p, i, spacingType)) {
        if (i === PIN12_INDEX) {
          resolvedXs[i] = currentPin1213Offset
        } else {
          resolvedXs[i] = -currentPin1213Offset
        }
      } else if (isPin14Type1AbovePin4(p, i)) {
        resolvedXs[i] = currentPairOffset45
      } else if (isPin1415Row(p, i)) {
        if (i === PIN14_INDEX) {
          resolvedXs[i] = ref14 ? currentPin1415Offset : 0
        } else {
          resolvedXs[i] = -currentPin1415Offset
        }
      } else if (isPin2425Row(p, i)) {
        if (i === PIN24_INDEX) {
          resolvedXs[i] = currentPin2425Offset
        } else {
          resolvedXs[i] = -currentPin2425Offset
        }
      } else if (isPin2627Row(p, i)) {
        if (i === PIN26_INDEX) {
          resolvedXs[i] = currentPin2627Offset
        } else {
          resolvedXs[i] = -currentPin2627Offset
        }
      } else if (isPin1617Row(p, i)) {
        if (i === PIN16_INDEX) {
          resolvedXs[i] = currentPin1617Offset
        } else {
          resolvedXs[i] = -currentPin1617Offset
        }
      } else if (isPin2021Row(p, i, spacingType)) {
        if (i === PIN20_INDEX) {
          resolvedXs[i] = currentPin2021Offset
        } else {
          resolvedXs[i] = -currentPin2021Offset
        }
      } else if (isPin2223Row(p, i, spacingType)) {
        if (i === PIN22_INDEX) {
          resolvedXs[i] = currentPin2223Offset
        } else {
          resolvedXs[i] = -currentPin2223Offset
        }
      } else if (p.xRightInset != null && el) {
        resolvedXs[i] = LAYOUT_BOX_W / 2 - p.xRightInset - el.offsetWidth / 2
      } else if (p.xPairGap) {
        const offset = PIN45_INDEXES.has(i)
          ? currentPairOffset45
          : currentPairOffset
        resolvedXs[i] = (p.mirror ? -1 : 1) * offset
      } else if (p.xHalfPin) {
        if (PIN67_INDEXES.has(i)) {
          resolvedXs[i] = (p.mirror ? -1 : 1) * currentHalfPinOffset67
        } else {
          const hw = el ? el.offsetWidth / 2 : halfPinW
          resolvedXs[i] = (p.mirror ? -1 : 1) * (hw + (p.xHalfGap ?? 0))
        }
      } else if (p.x != null) {
        resolvedXs[i] = p.x
      }
    })

    const insetXs = {}
    Object.entries(resolvedXs).forEach(([i, x]) => {
      const pos = positions[i]
      if (
        pos?.xRightInset != null &&
        !isCenteredRowPin(pos, Number(i), spacingType)
      ) {
        insetXs[i] = x
      }
    })

    const gapXs = {}
    positions.forEach((p, i) => {
      if (p.xGapFrom == null || isCenteredRowPin(p, i, spacingType)) return
      const fromEl = pinRefs.current[p.xGapFrom]
      const selfEl = pinRefs.current[i]
      const fromX = resolvedXs[p.xGapFrom] ?? gapXs[p.xGapFrom]
      if (fromEl && selfEl && fromX != null) {
        gapXs[i] =
          fromX -
          fromEl.offsetWidth / 2 -
          resolveGap(i, p, spacingType) -
          selfEl.offsetWidth / 2
      }
    })
    if (Object.keys(insetXs).length) setRightInsetXs(insetXs)
    if (Object.keys(gapXs).length) setGapFromXs(gapXs)
  }, [count, positions, halfPinW, spacingType])

  const maxDist =
    positions.reduce((m, pos, j) => {
      if (j === 0) return m
      return Math.max(m, Math.hypot(pos.x ?? 0, pos.y ?? 0))
    }, 0) || 1

  return (
    <div className="daisy-stage">
      <div className="daisy-workspace">
        <div
          className="daisy-box"
          style={{ width: boxW, height: boxH }}
          onMouseLeave={() => setActiveIndex(-1)}
        >
          <div className="daisy-group">
            {positions.map((p, i) => {
              const isCenter = i === 0
              const centerColumn = isCenterColumnPin(p, i)
              const x = centerColumn
                ? 0
                : isPin89Row(p, i, spacingType)
                  ? i === PIN8_INDEX
                    ? pin89Offset
                    : -pin89Offset
                  : isPin1011Row(p, i, spacingType)
                    ? i === PIN10_INDEX
                      ? pin1011Offset
                      : -pin1011Offset
                    : isPin1213Row(p, i, spacingType)
                      ? i === PIN12_INDEX
                        ? pin1213Offset
                        : -pin1213Offset
                      : isPin14Type1AbovePin4(p, i)
                        ? pairOffset45
                        : isPin1415Row(p, i)
                          ? i === PIN14_INDEX
                            ? count > PIN15_INDEX
                              ? pin1415Offset
                              : 0
                            : -pin1415Offset
                        : isPin2425Row(p, i)
                          ? i === PIN24_INDEX
                            ? pin2425Offset
                            : -pin2425Offset
                          : isPin2627Row(p, i)
                            ? i === PIN26_INDEX
                              ? pin2627Offset
                              : -pin2627Offset
                            : isPin1617Row(p, i)
                          ? i === PIN16_INDEX
                            ? pin1617Offset
                            : -pin1617Offset
                          : isPin2021Row(p, i, spacingType)
                            ? i === PIN20_INDEX
                              ? pin2021Offset
                              : -pin2021Offset
                            : isPin2223Row(p, i, spacingType)
                              ? i === PIN22_INDEX
                                ? pin2223Offset
                                : -pin2223Offset
                              : p.xGapFrom != null
                  ? gapFromXs[i]
                  : p.xRightInset != null
                    ? (rightInsetXs[i] ??
                      LAYOUT_BOX_W / 2 - p.xRightInset - halfPinW)
                    : p.xPairGap
                      ? (p.mirror ? -1 : 1) *
                        (PIN45_INDEXES.has(i) ? pairOffset45 : pairOffset)
                      : p.xHalfPin
                        ? (p.mirror ? -1 : 1) *
                          (PIN67_INDEXES.has(i)
                            ? halfPinOffset67
                            : halfPinW + (p.xHalfGap ?? 0))
                        : p.x != null
                          ? p.x
                          : 0
              const y = isCenter ? 0 : (p.y ?? 0)
              const dist = Math.hypot(x ?? 0, y ?? 0)
              const zIndex =
                i === activeIndex
                  ? 1500
                  : p.z ??
                    (isCenter
                      ? 2000
                      : 100 + Math.round(((maxDist - dist) / maxDist) * 100))
              return (
                <button
                  key={i}
                  type="button"
                  ref={(el) => (pinRefs.current[i] = el)}
                  className={`daisy-pin${i === activeIndex ? ' is-active' : ''}`}
                  style={{
                    transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
                    zIndex,
                  }}
                  onMouseEnter={() => setActiveIndex(i)}
                  onFocus={() => setActiveIndex(i)}
                >
                  {formatRub(PRICES[i])}
                </button>
              )
            })}
          </div>
        </div>

        <div className="daisy-controls">
          <label htmlFor="pin-count">Пинов в ромашке</label>
          <div className="daisy-controls-row">
            <input
              id="pin-count"
              type="range"
              min={1}
              max={MAX_PINS}
              value={count}
              onChange={(e) => {
                const next = Number(e.target.value)
                setCount(next)
                setActiveIndex((prev) => Math.min(prev, next - 1))
              }}
            />
            <span className="daisy-count">{count}</span>
          </div>
          <label htmlFor="box-width">Ширина области</label>
          <div className="daisy-controls-row">
            <input
              id="box-width"
              type="range"
              min={MIN_BOX_W}
              max={MAX_BOX_W}
              value={boxW}
              onChange={(e) => setBoxW(Number(e.target.value))}
            />
            <span className="daisy-count">{boxW}</span>
          </div>
          <label htmlFor="box-height">Высота области</label>
          <div className="daisy-controls-row">
            <input
              id="box-height"
              type="range"
              min={MIN_BOX_H}
              max={MAX_BOX_H}
              value={boxH}
              onChange={(e) => setBoxH(Number(e.target.value))}
            />
            <span className="daisy-count">{boxH}</span>
          </div>
          <label>Отступы в кластере</label>
          <div
            className="daisy-spacing-group"
            role="group"
            aria-label="Отступы в кластере"
          >
            {SPACING_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                className={`daisy-spacing-btn${spacingType === type ? ' is-active' : ''}`}
                onClick={() => setSpacingType(type)}
              >
                {SPACING_TYPE_LABELS[type]}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default PinDaisy

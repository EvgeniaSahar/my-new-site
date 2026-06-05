import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import './PinDaisy.css'

const BOX_W = 220
const BOX_H = 220
const PADDING = 2
const MAX_PINS = 28

const PRICES = [
  2350, 4120, 5890, 3275, 7640, 9300, 6450, 8120, 10750, 12480,
  3990, 5540, 14200, 6890, 17300, 4680, 8740, 11015, 15600, 13340,
  4870, 9500, 18200, 7110, 16990, 5320, 12780, 19450,
]

function formatRub(value) {
  return `${value.toLocaleString('ru-RU').replace(/,/g, ' ')} ₽`
}

function PinDaisy() {
  const [count, setCount] = useState(MAX_PINS)
  const [activeIndex, setActiveIndex] = useState(0)
  const [layout, setLayout] = useState({ step: 30, dx: 0, dy: 0 })
  const pinRefs = useRef([])

  // Staggered-grid "stack" layout (like the reference picture): pins sit on an
  // offset lattice with wide horizontal overlap and tightly stacked rows. The
  // center pin is filled first and stays on top; the lattice is filled from the
  // center outward, so reducing `count` drops the outermost pins first.
  const positions = useMemo(() => {
    const COL = 1.0 // horizontal spacing unit (pins overlap heavily side-to-side)
    const ROW = 0.62 // vertical spacing unit (rows stacked with slight overlap)
    const candidates = []
    for (let r = -6; r <= 6; r++) {
      const offset = Math.abs(r) % 2 === 1 ? 0.5 : 0
      for (let c = -6; c <= 6; c++) {
        const ux = (c + offset) * COL
        const uy = r * ROW
        candidates.push({ ux, uy, dist: Math.hypot(ux, uy) })
      }
    }
    candidates.sort((a, b) => a.dist - b.dist)
    return candidates.slice(0, count)
  }, [count])

  const maxDist = positions.reduce((m, p) => Math.max(m, p.dist), 0) || 1

  // Largest radius step that still keeps every pin inside the fixed box.
  useLayoutEffect(() => {
    const halves = positions.map((_, i) => {
      const el = pinRefs.current[i]
      return el
        ? { hw: el.offsetWidth / 2, hh: el.offsetHeight / 2 }
        : { hw: 0, hh: 0 }
    })

    const bounds = (step) => {
      let minX = Infinity
      let maxX = -Infinity
      let minY = Infinity
      let maxY = -Infinity
      positions.forEach((p, i) => {
        const { hw, hh } = halves[i]
        minX = Math.min(minX, p.ux * step - hw)
        maxX = Math.max(maxX, p.ux * step + hw)
        minY = Math.min(minY, p.uy * step - hh)
        maxY = Math.max(maxY, p.uy * step + hh)
      })
      return { minX, maxX, minY, maxY }
    }

    const fits = (step) => {
      const b = bounds(step)
      return (
        b.maxX - b.minX <= BOX_W - PADDING * 2 &&
        b.maxY - b.minY <= BOX_H - PADDING * 2
      )
    }

    let lo = 0
    let hi = 200
    for (let k = 0; k < 40; k++) {
      const mid = (lo + hi) / 2
      if (fits(mid)) lo = mid
      else hi = mid
    }

    const step = lo
    const b = bounds(step)
    setLayout({
      step,
      dx: -(b.minX + b.maxX) / 2,
      dy: -(b.minY + b.maxY) / 2,
    })
  }, [positions])

  return (
    <div className="daisy-stage">
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
      </div>

      <div
        className="daisy-box"
        style={{ width: BOX_W, height: BOX_H }}
        onMouseLeave={() => setActiveIndex(0)}
      >
        <div
          className="daisy-group"
          style={{ transform: `translate(${layout.dx}px, ${layout.dy}px)` }}
        >
          {positions.map((p, i) => {
            const isCenter = i === 0
            const zIndex = isCenter
              ? 2000
              : i === activeIndex
                ? 1500
                : 100 + Math.round(((maxDist - p.dist) / maxDist) * 100)
            return (
              <button
                key={i}
                type="button"
                ref={(el) => (pinRefs.current[i] = el)}
                className={`daisy-pin${i === activeIndex ? ' is-active' : ''}`}
                style={{
                  transform: `translate(-50%, -50%) translate(${p.ux * layout.step}px, ${p.uy * layout.step}px)`,
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
    </div>
  )
}

export default PinDaisy

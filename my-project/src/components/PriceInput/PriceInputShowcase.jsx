import { PriceInput } from './PriceInput'
import './PriceInputShowcase.css'

const STATES = [
  {
    badge: 'Default',
    badgeVariant: 'default',
    description: 'Empty idle',
    props: { defaultValue: null },
  },
  {
    badge: 'Focused',
    badgeVariant: 'focused',
    description: 'Active / typing',
    props: { defaultValue: null, autoFocus: true },
  },
  {
    badge: 'Filled',
    badgeVariant: 'filled',
    description: 'Has a valid value',
    props: { value: 4500, readOnly: true },
  },
  {
    badge: 'Error',
    badgeVariant: 'error',
    description: 'Exceeds limit',
    props: { value: 99999, max: 50000, readOnly: true },
  },
  {
    badge: 'Disabled',
    badgeVariant: 'disabled',
    description: 'Non-interactive',
    props: { value: 500, disabled: true },
  },
  {
    badge: 'Loading',
    badgeVariant: 'loading',
    description: 'Fetching rate',
    props: { value: null, loading: true, readOnly: true },
  },
]

const ADAPTIVE_EXAMPLES = [
  { label: 'Short', value: 100 },
  { label: 'Medium', value: 12345 },
  { label: 'Long', value: 9876543 },
]

function StateCard({ badge, badgeVariant, description, children }) {
  return (
    <article className="price-showcase__card">
      <header className="price-showcase__card-header">
        <span
          className={`price-showcase__badge price-showcase__badge--${badgeVariant}`}
        >
          {badge}
        </span>
        <span className="price-showcase__description">{description}</span>
      </header>
      <div className="price-showcase__card-body">{children}</div>
    </article>
  )
}

export function PriceInputShowcase() {
  return (
    <div className="price-showcase">
      <header className="price-showcase__header">
        <h1 className="price-showcase__title">Price Input</h1>
        <p className="price-showcase__subtitle">Wise-style · React + Framer Motion</p>
      </header>

      <section className="price-showcase__grid">
        {STATES.map((state) => (
          <StateCard key={state.badge} {...state}>
            <PriceInput {...state.props} />
          </StateCard>
        ))}
      </section>

      <section className="price-showcase__adaptive">
        <StateCard
          badge="Adaptive font"
          badgeVariant="default"
          description="Scales with number length"
        >
          <div className="price-showcase__adaptive-row">
            {ADAPTIVE_EXAMPLES.map(({ label, value }) => (
              <div key={label} className="price-showcase__adaptive-item">
                <span className="price-showcase__adaptive-label">{label}</span>
                <PriceInput value={value} readOnly aria-label={label} />
              </div>
            ))}
          </div>
        </StateCard>
      </section>

      <section className="price-showcase__interactive">
        <StateCard
          badge="Interactive"
          badgeVariant="focused"
          description="Try typing a value"
        >
          <PriceInput defaultValue={null} max={50000} />
        </StateCard>
      </section>
    </div>
  )
}

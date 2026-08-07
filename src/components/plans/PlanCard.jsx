import { useDispatch, useSelector } from 'react-redux';
import { selectPlan } from '../../store/slices/plansSlice';
import { useEffect, useState, useMemo } from 'react';

// "Most Popular" is no longer decided here — it comes from the backend's
// per-plan `isPopular` flag (admin-configurable), not the tier name.
const TIER_META = {
  free:     { label: 'STARTER',      button: 'Join for Free', variant: 'outline' },
  gold:     { label: 'INFLUENCER',   button: 'Get Gold',      variant: 'wave'    },
  platinum: { label: 'PROFESSIONAL', button: 'Go Platinum',   variant: 'outline' },
};

const COUNTER_DELAYS = [500, 680, 860];
const CARD_DELAYS    = ['0.1s', '0.28s', '0.46s'];

const AURORA_COLORS = ['#5534f0', '#00e5c0', '#ff6ef7', '#ff9900', '#60a5fa'];

const TIER_SELECTED_COLOR = {
  free:     '#3b82f6',
  gold:     '#a855f7',
  platinum: '#a78bfa',
};

function rand(min, max) { return min + Math.random() * (max - min); }

function CheckIcon() {
  return (
    <svg className="check-icon" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="9" fill="rgba(37,99,235,0.15)" />
      <path d="M5.5 9l2.5 2.5 4.5-4.5" stroke="#3b82f6" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Spinner() {
  return <span className="btn-spinner" aria-hidden="true" />;
}

export default function PlanCard({ plan, index = 0, isSelected = false, onCardClick }) {
  const dispatch   = useDispatch();
  const { selecting } = useSelector((state) => state.plans);
  const [displayPrice, setDisplayPrice] = useState(0);

  const meta        = TIER_META[plan.tier] ?? { label: plan.tier.toUpperCase(), button: 'Select Plan', variant: 'outline' };
  const isPopular   = plan.isPopular ?? false;
  const tierName    = plan.tier.charAt(0).toUpperCase() + plan.tier.slice(1) + ' Tier';
  const isGold      = plan.tier === 'gold';
  const isPlatinum  = plan.tier === 'platinum';
  const featureList = plan.features.flatMap((f) => f.split('\n')).filter(Boolean);
  const isSelecting = selecting === plan._id;
  const isDisabled  = !!selecting;

  /* ── Price counter ── */
  useEffect(() => {
    const target = Number(plan.price) || 0;
    const delay  = COUNTER_DELAYS[index] ?? 500;
    const t = setTimeout(() => {
      if (!target) { setDisplayPrice(0); return; }
      const steps = 32;
      let step = 0;
      const iv = setInterval(() => {
        step++;
        setDisplayPrice(Math.round((target / steps) * step));
        if (step >= steps) { setDisplayPrice(target); clearInterval(iv); }
      }, 22);
      return () => clearInterval(iv);
    }, delay);
    return () => clearTimeout(t);
  }, [plan.price, index]);

  /* ── Particles (gold only) ── */
  const particles = useMemo(() =>
    Array.from({ length: 18 }, (_, i) => ({
      id: i,
      size:     rand(2, 5),
      left:     rand(5, 90),
      delay:    rand(0, 3),
      duration: rand(2.5, 4.5),
      dx:       rand(-20, 20),
      color:    AURORA_COLORS[Math.floor(Math.random() * AURORA_COLORS.length)],
    }))
  , []);

  /* ── Ripple ── */
  function handleRipple(e) {
    const btn  = e.currentTarget;
    const rect = btn.getBoundingClientRect();
    const span = document.createElement('span');
    span.className = 'btn-ripple';
    span.style.cssText = `left:${e.clientX - rect.left}px;top:${e.clientY - rect.top}px`;
    btn.appendChild(span);
    setTimeout(() => span.remove(), 700);
  }

  function handleSelect(e) {
    handleRipple(e);
    dispatch(selectPlan(plan._id));
  }

  const cardDelay = CARD_DELAYS[index] ?? '0.1s';

  const tierColor = TIER_SELECTED_COLOR[plan.tier] ?? '#3b82f6';

  const cardEl = (
    <div
      className={`plan-card plan-card--${plan.tier}${isPopular ? ' plan-card--popular' : ''}${isSelected ? ' plan-card--selected' : ''}`}
      style={{ '--card-delay': isGold ? undefined : cardDelay, '--tier-color': tierColor }}
      onClick={onCardClick}
    >
      {isPopular && <div className="popular-badge">Most Popular</div>}

      <p className="plan-label">{meta.label}</p>
      <h3 className="plan-name">{tierName}</h3>

      <div className="plan-price">
        <span className="price-dollar">$</span>
        <span className={`price-amount${isPlatinum ? ' price-amount--plat' : ''}`}>
          {displayPrice}
        </span>
        <span className="price-period">/mo</span>
      </div>

      <ul className="plan-features">
        {featureList.map((feature, i) => (
          <li key={i} className="plan-feature-item" style={{ '--fi': i }}>
            <CheckIcon />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        className={`plan-btn plan-btn--${meta.variant}`}
        onClick={handleSelect}
        disabled={isDisabled}
      >
        {isSelecting ? <><Spinner /> Selecting…</> : meta.button}
      </button>

      {isGold && (
        <div className="gold-particles" aria-hidden="true">
          {particles.map(p => (
            <span
              key={p.id}
              className="gold-particle"
              style={{
                width:             `${p.size}px`,
                height:            `${p.size}px`,
                left:              `${p.left}%`,
                bottom:            '-8px',
                background:        p.color,
                animationDelay:    `${p.delay}s`,
                animationDuration: `${p.duration}s`,
                '--dx':            `${p.dx}px`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );

  if (isGold) {
    return (
      <div
        className={`gold-aurora-wrap${isSelected ? ' gold-aurora-wrap--selected' : ''}`}
        style={{ '--card-delay': cardDelay }}
      >
        {cardEl}
      </div>
    );
  }

  return cardEl;
}

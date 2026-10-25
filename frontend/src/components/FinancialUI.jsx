const money = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(n) || 0);

export function Metric({ label, value, note, dark = false }) {
  return <article className={`metric-card ${dark ? 'metric-dark' : ''}`}><div className="metric-head">{label}<span>↗</span></div><strong className="metric-value">{value}</strong><p>{note}</p></article>;
}

export function CashRow({ label, value, kind }) {
  return <div className="cash-row"><span><i className={`cash-dot ${kind}`} />{label}</span><strong className={value < 0 ? 'negative' : ''}>{value < 0 ? '−' : ''}{money(Math.abs(value))}</strong></div>;
}

export function NumberField({ value, onChange }) {
  return <div className="number-field"><span>₹</span><input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} /></div>;
}

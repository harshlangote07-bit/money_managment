import React from 'react';
import { Metric, CashRow, NumberField } from '../components/FinancialUI.jsx';

export default function DashboardPage({ data }) {
  const { money, profile, goals, income, expenses, debt, reserve, surplus, goalTotal, goalSaved, nav } = data;

  return (
<div className="page-content">
            <section className="page-heading"><div><div className="eyebrow"><span className="eyebrow-dot" /> YOUR FINANCIAL SNAPSHOT</div><h1>Good plans start with <em>clarity.</em></h1><p>Your current goals, progress, and monthly financial capacity.</p></div><button className="button button-primary" onClick={() => nav('planner')}>Explore a what-if <span>→</span></button></section>
            <section className="metrics-grid">
              <Metric label="MONTHLY SURPLUS" value={money(surplus)} note="Income less expenses and debt" dark />
              <Metric label="GOAL SAVINGS" value={money(goalSaved)} note={`${goals.length} goals in your workspace`} />
              <Metric label="GOAL TARGETS" value={money(goalTotal)} note={`${Math.round(goalTotal ? (goalSaved / goalTotal) * 100 : 0)}% of total target saved`} />
              <Metric label="MONTHLY COMMITMENTS" value={money(Number(expenses) + Number(debt))} note="Expenses plus debt payments" />
            </section>
            <section className="dashboard-columns">
              <div className="panel">
                <div className="panel-heading"><div><span className="section-kicker">GOAL PROGRESS</span><h2>What you're working toward</h2><p>Track each target and how much remains.</p></div><button className="text-button" onClick={() => nav('profile')}>Manage goals ↗</button></div>
                <div className="goal-list">{goals.map((g, i) => { const pct = g.target ? Math.min(100, g.saved / g.target * 100) : 0; return <div className="goal-row" key={g.id}><div className={`goal-icon goal-color-${i % 3}`}>{g.status === 'Achieved' ? '✓' : ['◎', '↗', '⌂'][i % 3]}</div><div className="goal-details"><div className="goal-title-line"><strong>{g.name}</strong><span className={`status-pill ${g.status === 'Achieved' ? 'done' : ''}`}>{g.status}</span></div><div className="goal-progress-track"><span style={{width:`${pct}%`}} /></div><div className="goal-foot"><span>{Math.round(pct)}% funded</span><span>{money(Math.max(0, g.target - g.saved))} remaining</span></div></div><div className="goal-total"><strong>{money(g.saved)}</strong><small>of {money(g.target)}</small></div></div>; })}</div>
                <button className="button button-outline full-button" onClick={() => nav('profile')}>View goal history and details <span>→</span></button>
              </div>
              <div className="dashboard-side">
                <div className="panel capacity-panel"><span className="section-kicker">MONTHLY CAPACITY</span><h2>Where you stand</h2><div className={`capacity-number ${surplus < 0 ? 'negative' : ''}`}>{money(surplus)}</div><p>Estimated surplus before goal contributions and reserve adjustments.</p><div className="cashflow-list"><CashRow label="Monthly income" value={income} kind="income"/><CashRow label="Monthly expenses" value={-expenses} kind="expense"/><CashRow label="Debt payments" value={-debt} kind="debt"/></div><button className="text-button" onClick={() => nav('planner')}>Plan with these numbers ↗</button></div>
                <div className="insight-panel"><span className="section-kicker">NEXT STEP</span><h3>What happens if life changes?</h3><p>Test an unexpected expense or a change in income before adjusting your goals.</p><button onClick={() => nav('planner')}>Open Plan <span>→</span></button></div>
              </div>
            </section>
            <p className="demo-note">Demo values are shown here until your account and financial data are connected to the backend.</p>
          </div>
  );
}

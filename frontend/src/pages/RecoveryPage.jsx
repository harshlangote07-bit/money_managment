import React from 'react';
import { Metric, CashRow, NumberField } from '../components/FinancialUI.jsx';

export default function RecoveryPage({ data }) {
  const { money, goals, expenses, debt, reserve, surplus, nav } = data;

  return (
<div className="page-content">
            <section className="page-heading">
              <div>
                <div className="eyebrow"><span className="eyebrow-dot" /> FINANCIAL RECOVERY</div>
                <h1>Find a steadier path <em>forward.</em></h1>
                <p>Review illustrative options if an emergency or cash-flow shortfall puts your plan under pressure.</p>
              </div>
            </section>
            <section className="metrics-grid">
              <Metric label="MONTHLY SURPLUS" value={money(surplus)} note="Current demo estimate" dark />
              <Metric label="EMERGENCY RESERVE" value={money(reserve)} note="Demo reserve balance" />
              <Metric label="MONTHLY COMMITMENTS" value={money(Number(expenses) + Number(debt))} note="Expenses plus debt payments" />
              <Metric label="SHORTFALL STATUS" value={surplus < 0 ? 'Shortfall' : 'Positive'} note={surplus < 0 ? 'Review recovery options' : 'No current monthly shortfall'} />
            </section>
            <section className="panel">
              <div className="panel-heading"><div><span className="section-kicker">RECOVERY OPTIONS</span><h2>Possible actions to evaluate</h2><p>Illustrative options only; choose based on your real obligations and circumstances.</p></div></div>
              <div className="recommendation-grid">
                <article><span className="rec-dot" /><div><strong>Protect essential spending</strong><p>Prioritize housing, food, utilities, healthcare, and required payments.</p></div></article>
                <article><span className="rec-dot" /><div><strong>Temporarily reduce flexible costs</strong><p>Review non-essential spending before making changes to important long-term goals.</p></div></article>
                <article><span className="rec-dot" /><div><strong>Use reserves deliberately</strong><p>Estimate the emergency amount needed and preserve a minimum cash buffer where possible.</p></div></article>
                <article><span className="rec-dot" /><div><strong>Revisit goal timelines</strong><p>Consider extending a deadline or adjusting contributions rather than abandoning every goal.</p></div></article>
              </div>
              <div className="notice">These are general planning prompts, not personalized financial, debt, or investment advice. No recovery recommendation engine is connected yet.</div>
              <button className="button button-outline" onClick={() => nav('planner')}>Review financial assumptions <span>→</span></button>
            </section>
          </div>
  );
}

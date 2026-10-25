import React from 'react';
import { Metric, CashRow, NumberField } from '../components/FinancialUI.jsx';

export default function RecommendationsPage({ data }) {
  const { money, goals, income, expenses, debt, surplus, activeGoals, achievedGoals, simulatedSurplus, adjustedSurplus, nav } = data;

  return (
<div className="page-content">
            <section className="page-heading">
              <div>
                <div className="eyebrow"><span className="eyebrow-dot" /> DECISIONS &amp; HISTORY</div>
                <h1>Make choices with <em>context.</em></h1>
                <p>Review demo recommendations and compare your current financial position with a hypothetical scenario.</p>
              </div>
            </section>
            <section className="metrics-grid">
              <Metric label="CURRENT SURPLUS" value={money(surplus)} note="Baseline monthly capacity" dark />
              <Metric label="SCENARIO SURPLUS" value={money(adjustedSurplus)} note="Current what-if assumptions" />
              <Metric label="ACTIVE GOALS" value={String(activeGoals.length)} note="Goals still in progress" />
              <Metric label="ACHIEVED GOALS" value={String(achievedGoals.length)} note="Goals marked achieved" />
            </section>
            <section className="panel">
              <div className="panel-heading"><div><span className="section-kicker">EXPLAINABLE NEXT STEPS</span><h2>Recommendations to consider</h2><p>These suggestions are based on simple demo rules and can be explained.</p></div></div>
              <div className="recommendation-grid">
                <article><span className="rec-dot" /><div><strong>{surplus <= 0 ? 'Address the monthly shortfall first' : 'Protect a positive monthly buffer'}</strong><p>{surplus <= 0 ? 'Your demo income does not cover expenses and debt payments. Review essential costs and obligations before increasing goal contributions.' : `Your demo monthly surplus is ${money(surplus)}. Check that emergency savings are adequate before increasing long-term commitments.`}</p></div></article>
                <article><span className="rec-dot" /><div><strong>{adjustedSurplus < 0 ? 'Rework the scenario before committing' : 'Check goal contributions against scenario capacity'}</strong><p>{adjustedSurplus < 0 ? 'The selected what-if assumptions produce a negative monthly capacity estimate.' : 'Compare the baseline and scenario surplus to make sure planned contributions remain realistic.'}</p></div></article>
                <article><span className="rec-dot" /><div><strong>Review goals and deadlines</strong><p>{activeGoals.length} active goals and {achievedGoals.length} achieved goals are currently represented in the demo workspace.</p></div></article>
              </div>
              <div className="notice">Reasoning is displayed for transparency. These are rule-based demo suggestions, not model-generated advice.</div>
            </section>
            <section className="panel">
              <div className="panel-heading"><div><span className="section-kicker">PLAN COMPARISON</span><h2>Baseline vs. current scenario</h2><p>Compare the monthly capacity before and after the assumptions you entered in Planner &amp; Optimizer.</p></div></div>
              <div className="cashflow-list">
                <CashRow label="Baseline monthly surplus" value={surplus} kind="income" />
                <CashRow label="Scenario monthly surplus" value={simulatedSurplus} kind="debt" />
                <CashRow label="Scenario after one-time expense estimate" value={adjustedSurplus} kind="expense" />
              </div>
              <button className="button button-outline" onClick={() => nav('planner')}>Edit scenario <span>→</span></button>
            </section>
            <p className="demo-note">Plan version history and saved comparisons will be added when persistence is implemented.</p>
          </div>
  );
}

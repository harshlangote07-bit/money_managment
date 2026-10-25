import React from 'react';
import { Metric, CashRow, NumberField } from '../components/FinancialUI.jsx';

export default function SimulatorPage({ data }) {
  const { money, profile, goals, income, expenses, reserve, surplus, activeGoals, adjustedSurplus, nav } = data;

  return (
<div className="page-content">
            <section className="page-heading">
              <div>
                <div className="eyebrow"><span className="eyebrow-dot" /> SCENARIO TESTING</div>
                <h1>Test your plan against <em>change.</em></h1>
                <p>Explore income changes, rising expenses, and unexpected costs using your demo financial profile.</p>
              </div>
              <button className="button button-primary" onClick={() => nav('planner')}>Open planner <span>→</span></button>
            </section>
            <section className="metrics-grid">
              <Metric label="CURRENT MONTHLY SURPLUS" value={money(surplus)} note="Based on current demo values" dark />
              <Metric label="SCENARIO SURPLUS" value={money(adjustedSurplus)} note="Based on your current what-if assumptions" />
              <Metric label="EMERGENCY RESERVE" value={money(reserve)} note="Available reserve in demo data" />
              <Metric label="ACTIVE GOALS" value={String(activeGoals.length)} note="Goals currently in progress" />
            </section>
            <section className="panel">
              <div className="panel-heading"><div><span className="section-kicker">RESILIENCE CHECK</span><h2>Current scenario assessment</h2><p>These figures use the assumptions entered on Planner &amp; Optimizer.</p></div></div>
              <div className="notice">{adjustedSurplus < 0 ? 'This scenario creates a monthly shortfall. Consider reducing discretionary expenses, revising goal contributions, or reviewing reserve use.' : adjustedSurplus < surplus ? 'Your monthly capacity is lower under this scenario. Check whether current goals remain affordable.' : 'Your current scenario does not reduce monthly surplus. You can test more severe assumptions in the planner.'}</div>
              <button className="button button-outline" onClick={() => nav('planner')}>Adjust scenario assumptions <span>→</span></button>
            </section>
            <p className="demo-note">This is a frontend demonstration, not a forecast from a connected financial model.</p>
          </div>
  );
}

import React from 'react';
import { Metric, CashRow, NumberField } from '../components/FinancialUI.jsx';

export default function PlannerPage({ data }) {
  const { money, profile, setProfile, goals, setGoals, income, setIncome, expenses, setExpenses, debt, setDebt, reserve, setReserve, planAnswers, setPlanAnswers, whatIf, setWhatIf, question, setQuestion, showPlan, setShowPlan, plannerFinancials, setPlannerFinancials, plannerSaveMessage, plannerSaveError, surplus, activeGoals, simulatedSurplus, adjustedSurplus, changeGoal, addGoal, handleSavePlanner } = data;

  return (
<div className="page-content">
            <section className="page-heading"><div><div className="eyebrow"><span className="eyebrow-dot" /> YOUR FINANCIAL DECISION ENGINE</div><h1>Plan for the <em>unexpected.</em></h1><p>Tell us what matters, explore alternatives, and understand the trade-offs before you decide.</p></div></section>
            <section className="panel planner-financial-panel">
              <div className="panel-heading"><div><span className="section-kicker">YOUR FINANCIAL BASELINE</span><h2>Start with your real numbers</h2><p>Enter monthly amounts and savings so your plan reflects your current situation.</p></div><span className="step-badge">BASELINE</span></div>
              <div className="planner-input-grid" style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))',gap:'16px'}}>
                <label className="form-field">Monthly take-home income (₹)<input type="number" min="0" value={income} onChange={(e) => { const v = Math.max(0, Number(e.target.value)); setIncome(v); setProfile({...profile, monthlyIncome:v}); }} /></label>
                <label className="form-field">Other monthly income (₹)<input type="number" min="0" value={plannerFinancials.other_monthly_income} onChange={(e) => setPlannerFinancials({...plannerFinancials, other_monthly_income:Math.max(0, Number(e.target.value))})} /></label>
                <label className="form-field">Essential expenses / month (₹)<input type="number" min="0" value={plannerFinancials.essential_expenses} onChange={(e) => { const v = Math.max(0, Number(e.target.value)); setPlannerFinancials({...plannerFinancials, essential_expenses:v}); setExpenses(v + plannerFinancials.discretionary_expenses); }} /></label>
                <label className="form-field">Discretionary expenses / month (₹)<input type="number" min="0" value={plannerFinancials.discretionary_expenses} onChange={(e) => { const v = Math.max(0, Number(e.target.value)); setPlannerFinancials({...plannerFinancials, discretionary_expenses:v}); setExpenses(plannerFinancials.essential_expenses + v); }} /></label>
                <label className="form-field">Monthly EMI payments (₹)<input type="number" min="0" value={debt} onChange={(e) => setDebt(Math.max(0, Number(e.target.value)))} /></label>
                <label className="form-field">Other recurring commitments / month (₹)<input type="number" min="0" value={plannerFinancials.monthly_recurring_commitments} onChange={(e) => setPlannerFinancials({...plannerFinancials, monthly_recurring_commitments:Math.max(0, Number(e.target.value))})} /></label>
                <label className="form-field">Current savings (₹)<input type="number" min="0" value={plannerFinancials.current_savings} onChange={(e) => setPlannerFinancials({...plannerFinancials, current_savings:Math.max(0, Number(e.target.value))})} /></label>
                <label className="form-field">Minimum emergency reserve (₹)<input type="number" min="0" value={reserve} onChange={(e) => { const v = Math.max(0, Number(e.target.value)); setReserve(v); setPlannerFinancials({...plannerFinancials, minimum_emergency_reserve:v}); }} /></label>
                <label className="form-field">Outstanding debt balance (₹)<input type="number" min="0" value={plannerFinancials.outstanding_debt} onChange={(e) => setPlannerFinancials({...plannerFinancials, outstanding_debt:Math.max(0, Number(e.target.value))})} /></label>
                <label className="form-field">Emergency fund target (months)<input type="number" min="1" max="24" value={plannerFinancials.target_emergency_months} onChange={(e) => setPlannerFinancials({...plannerFinancials, target_emergency_months:Math.min(24, Math.max(1, Number(e.target.value)))})} /></label>
                <label className="form-field">Minimum monthly surplus (₹)<input type="number" min="0" value={plannerFinancials.minimum_monthly_surplus} onChange={(e) => setPlannerFinancials({...plannerFinancials, minimum_monthly_surplus:Math.max(0, Number(e.target.value))})} /></label>
                <label className="form-field">Income stability<select value={plannerFinancials.income_stability} onChange={(e) => setPlannerFinancials({...plannerFinancials, income_stability:e.target.value})}><option value="stable">Stable</option><option value="variable">Variable</option><option value="uncertain">Uncertain</option></select></label>
                <label className="form-field">Maximum goal horizon (months)<input type="number" min="1" max="600" value={plannerFinancials.maximum_goal_horizon_months} onChange={(e) => setPlannerFinancials({...plannerFinancials, maximum_goal_horizon_months:Math.min(600, Math.max(1, Number(e.target.value)))})} /></label>
                <label className="form-field">Projection period (months)<input type="number" min="1" max="600" value={plannerFinancials.projection_months} onChange={(e) => setPlannerFinancials({...plannerFinancials, projection_months:Math.min(600, Math.max(1, Number(e.target.value)))})} /></label>
              </div>
              <div className="planner-baseline-summary" style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))',gap:'16px',marginTop:'20px',padding:'16px',background:'#f5f7f2',borderRadius:'12px'}}><div><span>Combined monthly income</span><strong>{money(Number(income) + Number(plannerFinancials.other_monthly_income))}</strong></div><div><span>Expenses + EMI + commitments</span><strong>{money(Number(plannerFinancials.essential_expenses) + Number(plannerFinancials.discretionary_expenses) + Number(debt) + Number(plannerFinancials.monthly_recurring_commitments))}</strong></div><div><span>Estimated monthly surplus</span><strong className={(Number(income) + Number(plannerFinancials.other_monthly_income) - Number(plannerFinancials.essential_expenses) - Number(plannerFinancials.discretionary_expenses) - Number(debt) - Number(plannerFinancials.monthly_recurring_commitments)) < 0 ? 'negative' : 'positive'}>{money(Number(income) + Number(plannerFinancials.other_monthly_income) - Number(plannerFinancials.essential_expenses) - Number(plannerFinancials.discretionary_expenses) - Number(debt) - Number(plannerFinancials.monthly_recurring_commitments))}</strong></div></div>
              <p className="demo-note">These values are currently held in frontend state. They are not sent to the backend yet.</p>
            </section>

            <style>{`
              .planner-goal-list { display: grid; gap: 16px; }
              .planner-goal-card { border: 1px solid #e3e9df; border-radius: 16px; padding: 18px; background: #fff; }
              .planner-goal-card-heading { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 16px; }
              .planner-goal-card-heading strong { display: block; font-size: 1.05rem; margin-top: 5px; color: #263b2d; }
              .planner-goal-input-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px 16px; }
              .planner-goal-progress { margin-top: 14px; }
              .planner-goal-progress .goal-progress-track { margin-bottom: 8px; }
              @media (max-width: 560px) { .planner-goal-card { padding: 14px; } .planner-goal-input-grid { grid-template-columns: 1fr; } }
            `}</style>
            <section className="panel goal-management planner-goal-management">
              <div className="panel-heading">
                <div>
                  <span className="section-kicker">YOUR FINANCIAL GOALS</span>
                  <h2>What are you planning for?</h2>
                  <p>Add and prioritize goals. These same goals are shared with your Dashboard and Profile.</p>
                </div>
                <button className="button button-outline" type="button" onClick={addGoal}>＋ Add goal</button>
              </div>
              <div className="planner-goal-list">
                {goals.map((g) => {
                  const remaining = Math.max(0, Number(g.target || 0) - Number(g.saved || 0));
                  const today = new Date();
                  const deadline = g.deadline ? new Date(`${g.deadline}T00:00:00`) : null;
                  const monthsRemaining = deadline && !Number.isNaN(deadline.getTime())
                    ? Math.max(1, (deadline.getFullYear() - today.getFullYear()) * 12 + deadline.getMonth() - today.getMonth())
                    : 1;
                  const requiredMonthly = remaining / monthsRemaining;
                  const progress = Number(g.target) > 0 ? Math.min(100, Number(g.saved || 0) / Number(g.target) * 100) : 0;
                  return (
                    <article className="planner-goal-card" key={g.id}>
                      <div className="planner-goal-card-heading">
                        <div>
                          <span className="section-kicker">GOAL · PRIORITY {g.priority || 1}</span>
                          <strong>{g.name || 'Untitled goal'}</strong>
                        </div>
                        <button className="delete-goal" type="button" onClick={() => setGoals((all) => all.filter((item) => item.id !== g.id))} aria-label={`Delete ${g.name || 'goal'}`}>×</button>
                      </div>
                      <div className="planner-goal-input-grid">
                        <label className="form-field">Goal name
                          <input value={g.name} onChange={(e) => changeGoal(g.id, 'name', e.target.value)} placeholder="e.g. Buy a car" />
                        </label>
                        <label className="form-field">Goal category
                          <select value={g.category || 'Personal'} onChange={(e) => changeGoal(g.id, 'category', e.target.value)}>
                            <option>Security</option><option>Education</option><option>Property</option><option>Technology</option><option>Travel</option><option>Debt repayment</option><option>Retirement</option><option>Personal</option><option>Other</option>
                          </select>
                        </label>
                        <label className="form-field">Target amount (₹)
                          <input type="number" min="1" value={g.target} onChange={(e) => changeGoal(g.id, 'target', Math.max(1, Number(e.target.value)))} />
                        </label>
                        <label className="form-field">Already saved (₹)
                          <input type="number" min="0" value={g.saved} onChange={(e) => changeGoal(g.id, 'saved', Math.max(0, Number(e.target.value)))} />
                        </label>
                        <label className="form-field">Target date
                          <input type="date" value={g.deadline || ''} onChange={(e) => changeGoal(g.id, 'deadline', e.target.value)} />
                        </label>
                        <label className="form-field">Priority
                          <select value={String(g.priority || 1)} onChange={(e) => changeGoal(g.id, 'priority', Number(e.target.value))}>
                            <option value="1">1 — Highest</option><option value="2">2 — High</option><option value="3">3 — Medium</option><option value="4">4 — Low</option><option value="5">5 — Lowest</option>
                          </select>
                        </label>
                        <label className="form-field">Deadline / target flexibility
                          <select value={g.flexibility || 'medium'} onChange={(e) => changeGoal(g.id, 'flexibility', e.target.value)}>
                            <option value="low">Low — prefer not to change</option><option value="medium">Medium — some flexibility</option><option value="high">High — can be adjusted</option>
                          </select>
                        </label>
                        <label className="form-field">Minimum monthly contribution (₹)
                          <input type="number" min="0" value={g.minimumContribution ?? 0} onChange={(e) => changeGoal(g.id, 'minimumContribution', Math.max(0, Number(e.target.value)))} />
                        </label>
                        <label className="form-field">Status
                          <select value={g.status} onChange={(e) => changeGoal(g.id, 'status', e.target.value)}>
                            <option>Active</option><option>Achieved</option><option>Paused</option><option>Missed</option>
                          </select>
                        </label>
                      </div>
                      <div className="planner-goal-progress">
                        <div className="goal-progress-track"><span style={{ width: `${progress}%` }} /></div>
                        <div className="goal-foot"><span>{Math.round(progress)}% funded · {money(remaining)} remaining</span><span>Approx. {money(requiredMonthly)}/month to target</span></div>
                      </div>
                    </article>
                  );
                })}
              </div>
              <p className="demo-note">Monthly contribution estimates are simple target-gap calculations; they exclude investment returns and inflation. Goal changes are shared across frontend pages but are not saved to the backend yet.</p>
            </section>

            <section className="panel planner-save-panel">
              <form onSubmit={handleSavePlanner}>
                <div className="panel-heading">
                  <div>
                    <span className="section-kicker">SAVE YOUR PLAN INPUTS</span>
                    <h2>Keep your financial details</h2>
                    <p>Save the financial baseline and all goal details so they remain available when you return in this browser.</p>
                  </div>
                  <button className="button button-primary" type="submit">Save financial details &amp; goals <span>✓</span></button>
                </div>
                {plannerSaveMessage && <p role="status" className="notice">{plannerSaveMessage}</p>}
                {plannerSaveError && <p role="alert" className="notice" style={{ color: '#b42318' }}>{plannerSaveError}</p>}
                <p className="demo-note">This saves to browser storage (localStorage), not to the backend or a cloud account yet.</p>
              </form>
            </section>

            <section className="plan-layout">
              <div className="panel plan-questions"><div className="panel-heading"><div><span className="section-kicker">STEP 01 · YOUR CONTEXT</span><h2>What should your plan prioritize?</h2><p>Your answers guide the planning discussion.</p></div><span className="step-badge">01 / 02</span></div>
                <label className="form-field">What matters most right now?<select value={planAnswers.priority} onChange={(e) => setPlanAnswers({...planAnswers, priority:e.target.value})}><option>Balanced progress</option><option>Build emergency savings first</option><option>Reach my nearest goal sooner</option><option>Reduce financial pressure</option></select></label>
                <label className="form-field">How comfortable are you with uncertainty?<select value={planAnswers.risk} onChange={(e) => setPlanAnswers({...planAnswers, risk:e.target.value})}><option>Conservative</option><option>Moderate</option><option>Flexible</option></select></label>
                <label className="form-field">What are you most concerned about?<select value={planAnswers.concern} onChange={(e) => setPlanAnswers({...planAnswers, concern:e.target.value})}><option>Unexpected expenses</option><option>Income changes</option><option>Rising costs and inflation</option><option>Multiple goals competing</option><option>Debt payments</option></select></label>
                <label className="form-field">Anything else you want the plan to consider?<textarea value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="For example, I want to pay for education while keeping an emergency reserve..." rows="3" /></label>
                <button className="button button-primary" onClick={() => setShowPlan(true)}>Review my planning priorities <span>→</span></button>
                {showPlan && <div className="notice"><strong>Your planning context</strong><br/>Priority: {planAnswers.priority}. Comfort with uncertainty: {planAnswers.risk}. Main concern: {planAnswers.concern}. Income stability: {plannerFinancials.income_stability}.{question ? ` Additional context: ${question}` : ''}<br/><small>Your financial baseline is captured in frontend state only. Next, we'll map it to the backend request payload and connect the planning endpoint.</small></div>}
              </div>
              <div className="panel whatif-panel"><div className="panel-heading"><div><span className="section-kicker">STEP 02 · WHAT-IF SIMULATOR</span><h2>Change one thing. See the impact.</h2><p>Try a hypothetical change to your finances.</p></div><span className="scenario-icon">⌁</span></div>
                <label className="form-field">Monthly income change <span className="field-sub">Positive for a raise, negative for a reduction</span><NumberField value={whatIf.incomeChange} onChange={(v) => setWhatIf({...whatIf,incomeChange:v})} /></label>
                <label className="form-field">Monthly expense change <span className="field-sub">Extra spending or a cost reduction</span><NumberField value={whatIf.expenseChange} onChange={(v) => setWhatIf({...whatIf,expenseChange:v})} /></label>
                <label className="form-field">Unexpected one-time expense <span className="field-sub">Medical cost, repair, or other emergency</span><NumberField value={whatIf.oneTimeExpense} onChange={(v) => setWhatIf({...whatIf,oneTimeExpense:v})} /></label>
                <div className="scenario-result"><div><span>Current monthly surplus</span><strong>{money(surplus)}</strong></div><div><span>After monthly changes</span><strong>{money(simulatedSurplus)}</strong></div><div><span>After emergency repayment estimate</span><strong className={adjustedSurplus < 0 ? 'negative' : 'positive'}>{money(adjustedSurplus)}</strong></div><p>{adjustedSurplus < 0 ? 'This scenario creates a shortfall. Review expenses, reserve usage, or goal contributions.' : adjustedSurplus < surplus ? 'Your surplus decreases. Check whether your goal contributions and deadlines remain realistic.' : adjustedSurplus > surplus ? 'Your surplus improves. Consider whether the extra capacity could support your priorities.' : 'Your monthly capacity is unchanged under these assumptions.'}</p></div>
                <button className="button button-outline full-button" onClick={() => setWhatIf({incomeChange:0,expenseChange:0,oneTimeExpense:0})}>Reset assumptions</button>
              </div>
            </section>
            <section className="panel recommendations"><div className="panel-heading"><div><span className="section-kicker">YOUR GOALS</span><h2>Trade-offs to consider</h2><p>The engine should compare the baseline with the scenario and show how each goal changes.</p></div></div><div className="recommendation-grid">{activeGoals.map((g) => <article key={g.id}><span className="rec-dot" /><div><strong>{g.name}</strong><p>{money(Math.max(0,g.target-g.saved))} remaining · target {new Date(g.deadline+'T00:00:00').toLocaleDateString('en-IN',{month:'short',year:'numeric'})}</p></div></article>)}</div><div className="notice">The current what-if numbers are illustrative frontend calculations. The next integration step will connect this screen to the existing <code>POST /api/v1/plans/scenario</code> endpoint so recommendations and comparisons come from the backend engine.</div></section>
          </div>
  );
}

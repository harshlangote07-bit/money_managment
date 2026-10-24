# Money Management — Path Engine v2

A dependency-free Node.js engine for generating and comparing multi-goal financial plans. Requires Node.js 18+.

## What is included

- Strict input validation and sensible defaults.
- Multiple income sources, essential/discretionary expenses, recurring commitments, one-off future commitments and month-specific expense forecasts.
- Multiple debts with balances, annual rates, mandatory minimum payments and optional per-month payment schedules.
- Multiple goals with current earmarked funding, priorities, target dates, flexibility, inflation and optional target adjustment.
- Monthly cash-flow projection, debt interest and amortization, cash return, reserve gaps, goal allocations, target-date shortfalls and completion estimates.
- Six deterministic candidate strategies: balanced, goal-first, emergency-first, deadline-flexible, spending-adjusted and hybrid.
- Hard-constraint violations, transparent lexicographic ranking, duplicate-outcome detection and best-effort compromise reporting.
- CLI demo and HTTP API to generate plans, activate a feasible plan, and retrieve the active plan.
- Automated tests and a multi-goal sample profile.

## Important accounting semantics

1. `currentCash` is liquid, unallocated cash. `goals[].currentAmount` is already earmarked for that goal and is **not** included in `currentCash`. Do not enter the same money in both places.
2. `expenses` should contain normal monthly/periodic spending. A recurring commitment with `includedInExpenses: true` is not added again. Known one-off commitments use `knownFutureCommitments[].date`.
3. Income and expense amounts are assumed to be in the same currency. Rates are decimals: `0.08` means 8% annually.
4. `targetAmountIsInTodayMoney: true` means goal target costs inflate from the plan start date. Set false if target amounts already represent future nominal costs.
5. `reserveTopUpMonths` sets a reserve floor of that many months of projected essential expenses, but never below `minimumEmergencyReserve`. `hardReserveConstraint: true` makes falling below that reserve a hard violation.
6. `feasible` means no modeled hard constraint was violated. Deadline misses are reported separately: a plan can be cash-feasible yet fail to meet one or more goals by their target dates.
7. The engine is deterministic and heuristic. It is not a mathematical global optimizer and does not model taxes, tax-advantaged accounts, investment volatility, intra-month payment timing, credit limits, or legal lending rules. Review and extend these assumptions before real-world use.

## Install and test

No external npm dependencies are needed.

```powershell
npm test
npm run demo
```

Demo defaults to `examples/multi-goal-input.json`. You can supply another input file:

```powershell
node src/demo.js examples/multi-goal-input.json
```

The demo prints strategy comparisons and lets you save a selected plan to `data/active-plan.json`. An infeasible plan requires explicitly typing `COMPROMISE`.

## HTTP API

```powershell
npm run server
```

- `GET /health`
- `POST /api/paths/generate` — request body is the financial input JSON.
- `POST /api/paths/activate` — `{ "input": { ... }, "strategy": "balanced" }`. Only feasible paths can be activated by default. Set `allowInfeasible: true` only to explicitly store a compromise.
- `GET /api/paths/active`

The API is intentionally dependency-free for a hackathon prototype. Add authentication and user-scoped storage before exposing it publicly.

## Strategies

- `balanced`: priority/urgency-weighted water-filling across goals.
- `goal-first`: fully fund higher-priority goals before lower-priority goals.
- `emergency-first`: prioritize goals whose names identify an emergency/reserve fund, then priority.
- `deadline-flexible`: protect fixed goals and extend flexible goals by the configured extension; original deadline outcomes remain visible.
- `spending-adjusted`: reduce discretionary spending within the configured cap and can reduce goals explicitly marked adjustable to their configured minimum target.
- `hybrid`: weighted goal allocation plus a share of cash above the reserve used for extra payments on eligible high-interest debt.

The engine deduplicates truly identical monthly outcomes. It returns fewer than six paths when strategies produce identical results rather than presenting duplicate plans as distinct. If constraints make all plans infeasible, they are returned as `best-effort-compromise` paths and no feasible recommendation is made.

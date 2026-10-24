/**
 * F2 PLANNER TEST DATA
 *
 * Contains 10 fictional financial profiles.
 *
 * Purpose:
 * - Test complete and partial inputs.
 * - Test different financial situations.
 * - Test goals, constraints, and optional fields.
 * - Test valid inputs, validation failures, and warnings.
 *
 * This file does not connect to MongoDB or insert data.
 */

export const plannerTestCases = [

  // TEST 1: Standard profile with all fields
  {
    test_id: "F2-T01",
    name: "Stable Income - Balanced Finances",
    expected_valid: true,

    input: {
      monthly_income: 85000,
      other_monthly_income: 5000,
      essential_expenses: 25000,
      discretionary_expenses: 10000,
      monthly_emi: 8000,
      monthly_recurring_commitments: 2000,
      current_savings: 250000,
      minimum_emergency_reserve: 100000,
      outstanding_debt: 300000,
      target_emergency_months: 6,
      minimum_monthly_surplus: 10000,
      maximum_goal_horizon_months: 120,
      projection_months: 60,
      risk_tolerance: "moderate",
      income_stability: "stable",

      goals: [
        {
          goal_id: "goal_001",
          name: "Buy a car",
          target_amount: 800000,
          current_amount: 100000,
          target_date: "2029-10-25",
          priority: 1,
          flexibility: "medium"
        },
        {
          goal_id: "goal_002",
          name: "Home down payment",
          target_amount: 1500000,
          current_amount: 300000,
          target_date: "2032-01-01",
          priority: 2,
          flexibility: "high"
        }
      ]
    }
  },

  // TEST 2: High income and multiple goals
  {
    test_id: "F2-T02",
    name: "High Income - Multiple Goals",
    expected_valid: true,

    input: {
      monthly_income: 250000,
      other_monthly_income: 50000,
      essential_expenses: 45000,
      discretionary_expenses: 30000,
      monthly_emi: 25000,
      monthly_recurring_commitments: 10000,
      current_savings: 2500000,
      minimum_emergency_reserve: 300000,
      outstanding_debt: 1200000,
      target_emergency_months: 6,
      minimum_monthly_surplus: 50000,
      maximum_goal_horizon_months: 240,
      projection_months: 120,
      risk_tolerance: "aggressive",
      income_stability: "stable",

      goals: [
        {
          goal_id: "goal_101",
          name: "Property purchase",
          target_amount: 8000000,
          current_amount: 2000000,
          target_date: "2032-01-01",
          priority: 1,
          flexibility: "medium"
        },
        {
          goal_id: "goal_102",
          name: "Retirement fund",
          target_amount: 20000000,
          current_amount: 3000000,
          target_date: "2045-01-01",
          priority: 2,
          flexibility: "high"
        },
        {
          goal_id: "goal_103",
          name: "Education fund",
          target_amount: 3000000,
          current_amount: 500000,
          target_date: "2035-01-01",
          priority: 3,
          flexibility: "low"
        }
      ]
    }
  },

  // TEST 3: Negative monthly surplus; should remain valid with warnings
  {
    test_id: "F2-T03",
    name: "Financial Stress - Expenses Exceed Income",
    expected_valid: true,

    input: {
      monthly_income: 40000,
      other_monthly_income: 0,
      essential_expenses: 25000,
      discretionary_expenses: 10000,
      monthly_emi: 8000,
      monthly_recurring_commitments: 3000,
      current_savings: 20000,
      minimum_emergency_reserve: 100000,
      outstanding_debt: 500000,
      target_emergency_months: 6,
      minimum_monthly_surplus: 5000,
      maximum_goal_horizon_months: 120,
      projection_months: 60,
      risk_tolerance: "conservative",
      income_stability: "stable",

      goals: [
        {
          goal_id: "goal_201",
          name: "Emergency savings",
          target_amount: 100000,
          current_amount: 20000,
          target_date: "2028-01-01",
          priority: 1,
          flexibility: "low"
        }
      ]
    }
  },

  // TEST 4: Variable income
  {
    test_id: "F2-T04",
    name: "Freelancer - Variable Income",
    expected_valid: true,

    input: {
      monthly_income: 65000,
      other_monthly_income: 15000,
      essential_expenses: 22000,
      discretionary_expenses: 8000,
      monthly_emi: 5000,
      monthly_recurring_commitments: 2500,
      current_savings: 400000,
      minimum_emergency_reserve: 150000,
      outstanding_debt: 180000,
      target_emergency_months: 9,
      minimum_monthly_surplus: 15000,
      maximum_goal_horizon_months: 180,
      projection_months: 120,
      risk_tolerance: "moderate",
      income_stability: "variable",

      goals: [
        {
          goal_id: "goal_301",
          name: "Business equipment",
          target_amount: 250000,
          current_amount: 50000,
          target_date: "2028-12-01",
          priority: 1,
          flexibility: "medium"
        }
      ]
    }
  },

  // TEST 5: Partial input; required fields are missing
  {
    test_id: "F2-T05",
    name: "Incomplete Profile",
    expected_valid: false,

    input: {
      monthly_income: 70000,
      essential_expenses: 20000,
      current_savings: 150000
    }
  },

  // TEST 6: Invalid negative amounts
  {
    test_id: "F2-T06",
    name: "Negative Financial Values",
    expected_valid: false,

    input: {
      monthly_income: -50000,
      other_monthly_income: 0,
      essential_expenses: 20000,
      discretionary_expenses: -5000,
      monthly_emi: 5000,
      monthly_recurring_commitments: 1000,
      current_savings: 100000,
      minimum_emergency_reserve: 50000,
      outstanding_debt: 200000,
      target_emergency_months: 6,
      minimum_monthly_surplus: 5000,
      maximum_goal_horizon_months: 120,
      projection_months: 60,
      risk_tolerance: "moderate",
      income_stability: "stable",
      goals: []
    }
  },

  // TEST 7: Optional fields omitted
  {
    test_id: "F2-T07",
    name: "Profile Without Optional Preferences",
    expected_valid: true,

    input: {
      monthly_income: 60000,
      other_monthly_income: 0,
      essential_expenses: 18000,
      discretionary_expenses: 7000,
      monthly_emi: 3000,
      monthly_recurring_commitments: 1000,
      current_savings: 300000,
      minimum_emergency_reserve: 75000,
      outstanding_debt: 100000,
      target_emergency_months: 3,
      minimum_monthly_surplus: 5000,
      maximum_goal_horizon_months: 120,
      projection_months: 36,
      goals: []
    }
  },

  // TEST 8: Duplicate goal identifiers and priorities
  {
    test_id: "F2-T08",
    name: "Duplicate Goal Identifiers",
    expected_valid: false,

    input: {
      monthly_income: 90000,
      other_monthly_income: 10000,
      essential_expenses: 25000,
      discretionary_expenses: 10000,
      monthly_emi: 5000,
      monthly_recurring_commitments: 2000,
      current_savings: 500000,
      minimum_emergency_reserve: 100000,
      outstanding_debt: 250000,
      target_emergency_months: 6,
      minimum_monthly_surplus: 10000,
      maximum_goal_horizon_months: 120,
      projection_months: 60,
      risk_tolerance: "moderate",
      income_stability: "stable",

      goals: [
        {
          goal_id: "duplicate_goal",
          name: "Goal A",
          target_amount: 300000,
          current_amount: 50000,
          target_date: "2028-01-01",
          priority: 1,
          flexibility: "medium"
        },
        {
          goal_id: "duplicate_goal",
          name: "Goal B",
          target_amount: 500000,
          current_amount: 100000,
          target_date: "2029-01-01",
          priority: 1,
          flexibility: "high"
        }
      ]
    }
  },

  // TEST 9: Zero income and savings
  {
    test_id: "F2-T09",
    name: "Zero Income - No Savings",
    expected_valid: true,

    input: {
      monthly_income: 0,
      other_monthly_income: 0,
      essential_expenses: 0,
      discretionary_expenses: 0,
      monthly_emi: 0,
      monthly_recurring_commitments: 0,
      current_savings: 0,
      minimum_emergency_reserve: 0,
      outstanding_debt: 0,
      target_emergency_months: 0,
      minimum_monthly_surplus: 0,
      maximum_goal_horizon_months: 60,
      projection_months: 12,
      risk_tolerance: "conservative",
      income_stability: "irregular",
      goals: []
    }
  },

  // TEST 10: Invalid goal date and out-of-range horizon
  {
    test_id: "F2-T10",
    name: "Invalid Goal Date and Planning Horizon",
    expected_valid: false,

    input: {
      monthly_income: 100000,
      other_monthly_income: 10000,
      essential_expenses: 25000,
      discretionary_expenses: 10000,
      monthly_emi: 5000,
      monthly_recurring_commitments: 2000,
      current_savings: 500000,
      minimum_emergency_reserve: 100000,
      outstanding_debt: 200000,
      target_emergency_months: 6,
      minimum_monthly_surplus: 10000,
      maximum_goal_horizon_months: 900,
      projection_months: 60,
      risk_tolerance: "moderate",
      income_stability: "stable",

      goals: [
        {
          goal_id: "goal_1001",
          name: "Invalid Date Goal",
          target_amount: 500000,
          current_amount: 100000,
          target_date: "2029-02-30",
          priority: 1,
          flexibility: "medium"
        }
      ]
    }
  }

];

/**
 * Display a concise overview of all test cases.
 */
export function printPlannerTestDataSummary() {
  console.log("\n========== F2 PLANNER TEST DATA ==========\n");

  for (const testCase of plannerTestCases) {
    console.log(
      `${testCase.test_id} | ${testCase.name} | ` +
      `Expected valid: ${testCase.expected_valid}`
    );
  }

  console.log(`\nTotal test cases: ${plannerTestCases.length}`);
  console.log("==========================================\n");
}


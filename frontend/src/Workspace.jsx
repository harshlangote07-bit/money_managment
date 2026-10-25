import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar.jsx';
import Topbar from './components/Topbar.jsx';
import AuthPage from './components/AuthPage.jsx';
import WelcomePage from './pages/WelcomePage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import PlannerPage from './pages/PlannerPage.jsx';
import SimulatorPage from './pages/SimulatorPage.jsx';
import RecoveryPage from './pages/RecoveryPage.jsx';
import RecommendationsPage from './pages/RecommendationsPage.jsx';
import './App.css';

const seedGoals = [
  { id: 1, name: 'Emergency fund', category: 'Security', target: 150000, saved: 90000, deadline: '2027-04-01', status: 'Active', priority: 1, flexibility: 'low', minimumContribution: 5000 },
  { id: 2, name: 'Higher education', category: 'Education', target: 300000, saved: 120000, deadline: '2028-04-01', status: 'Active', priority: 2, flexibility: 'medium', minimumContribution: 5000 },
  { id: 3, name: 'Dream home', category: 'Property', target: 1200000, saved: 250000, deadline: '2030-10-01', status: 'Active', priority: 3, flexibility: 'high', minimumContribution: 10000 },
  { id: 4, name: 'New laptop', category: 'Technology', target: 90000, saved: 90000, deadline: '2026-08-01', status: 'Achieved', priority: 4, flexibility: 'high', minimumContribution: 0 }
];

const money = (n) => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 0,
}).format(Number(n) || 0);

const pages = [
  { id: 'dashboard', label: 'Dashboard', icon: '▦' },
  { id: 'planner', label: 'Planner & Optimizer', icon: '⌁' },
  { id: 'simulator', label: 'Simulator & Resilience', icon: '↗' },
  { id: 'recovery', label: 'Emergency Recovery', icon: '✳' },
  { id: 'recommendations', label: 'Recommendations', icon: '◉' },
];

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const routeToPage = {'/':'welcome','/login':'login','/verify-email':'login','/reset-password':'login','/dashboard':'dashboard','/planner':'planner','/simulator':'simulator','/recovery':'recovery','/recommendations':'recommendations','/profile':'profile'};
  const pageToRoute = {welcome:'/',login:'/login',dashboard:'/dashboard',planner:'/planner',simulator:'/simulator',recovery:'/recovery',recommendations:'/recommendations',profile:'/profile'};
  const page = routeToPage[location.pathname] || 'not-found';
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  const [profile, setProfile] = useState({ name: 'Gaurav Gowda', email: 'gaurav@example.com', occupation: 'Student', monthlyIncome: 80000 });
  const [goals, setGoals] = useState(() => {
    try {
      const saved = localStorage.getItem('foresight-planner-data');
      return saved ? (JSON.parse(saved).goals || seedGoals) : seedGoals;
    } catch {
      return seedGoals;
    }
  });
  const [income, setIncome] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('foresight-planner-data') || 'null');
      return saved?.income ?? 80000;
    } catch { return 80000; }
  });
  const [expenses, setExpenses] = useState(() => {
    try { return JSON.parse(localStorage.getItem('foresight-planner-data') || 'null')?.expenses ?? 35000; }
    catch { return 35000; }
  });
  const [debt, setDebt] = useState(() => {
    try { return JSON.parse(localStorage.getItem('foresight-planner-data') || 'null')?.debt ?? 5000; }
    catch { return 5000; }
  });
  const [reserve, setReserve] = useState(() => {
    try { return JSON.parse(localStorage.getItem('foresight-planner-data') || 'null')?.reserve ?? 90000; }
    catch { return 90000; }
  });
  const [monthlySavings, setMonthlySavings] = useState(10000);
  const [planAnswers, setPlanAnswers] = useState({ priority: 'Balanced progress', risk: 'Moderate', concern: 'Unexpected expenses' });
  const [whatIf, setWhatIf] = useState({ incomeChange: 0, expenseChange: 0, oneTimeExpense: 0 });
  const [question, setQuestion] = useState('');
  const [showPlan, setShowPlan] = useState(false);
  const defaultPlannerFinancials = {
    other_monthly_income: 5000,
    essential_expenses: 25000,
    discretionary_expenses: 10000,
    monthly_recurring_commitments: 2000,
    current_savings: 250000,
    minimum_emergency_reserve: 100000,
    outstanding_debt: 300000,
    target_emergency_months: 6,
    minimum_monthly_surplus: 10000,
    maximum_goal_horizon_months: 120,
    projection_months: 60,
    income_stability: 'stable',
  };
  const [plannerFinancials, setPlannerFinancials] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('foresight-planner-data') || 'null');
      return { ...defaultPlannerFinancials, ...(saved?.plannerFinancials || {}) };
    } catch { return defaultPlannerFinancials; }
  });
  const [plannerSaveMessage, setPlannerSaveMessage] = useState('');
  const [plannerSaveError, setPlannerSaveError] = useState('');
  const [planHistory, setPlanHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('foresight-plan-history') || '[]');
    } catch {
      return [];
    }
  });

  const surplus = Number(income) - Number(expenses) - Number(debt);
  const goalTotal = goals.reduce((sum, g) => sum + Number(g.target), 0);
  const goalSaved = goals.reduce((sum, g) => sum + Number(g.saved), 0);
  const activeGoals = goals.filter((g) => g.status !== 'Achieved');
  const achievedGoals = goals.filter((g) => g.status === 'Achieved');
  const simulatedSurplus = useMemo(() =>
    Number(income) + Number(whatIf.incomeChange) - Number(expenses) - Number(whatIf.expenseChange) - Number(debt),
    [income, expenses, debt, whatIf],
  );
  const oneTimeAfterReserve = Math.max(0, Number(whatIf.oneTimeExpense) - Number(reserve));
  const adjustedSurplus = simulatedSurplus - Math.ceil(oneTimeAfterReserve / 6);
  const profileInitials = profile.name.trim().split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'U';
  const protectedRouteIds = ['dashboard', 'profile', 'planner', 'simulator', 'recovery', 'recommendations'];
  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      try {
        const response = await fetch('/api/v1/auth/me', {
          credentials: 'same-origin',
        });

        if (response.ok) {
          const result = await response.json();
          const user = result?.data?.user;

          if (!cancelled && result.success && user) {
            setIsLoggedIn(true);
            setProfile((current) => ({
              ...current,
              name: user.name,
              email: user.email,
            }));
          }
        }
      } catch (error) {
        console.error('Could not restore authentication session:', error);
      } finally {
        if (!cancelled) setAuthReady(true);
      }
    }

    restoreSession();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    async function handleCrossTabAuthentication(event) {
      if (event.key !== 'foresight-auth-changed' || !event.newValue) return;

      try {
        const response = await fetch('/api/v1/auth/me', {
          credentials: 'same-origin',
        });

        if (!response.ok) return;

        const result = await response.json();
        const user = result?.data?.user;

        if (!result.success || !user) return;

        setProfile((current) => ({
          ...current,
          name: user.name,
          email: user.email,
        }));
        setIsLoggedIn(true);
        navigate('/dashboard', { replace: true });
      } catch (error) {
        console.error('Could not sync authentication across tabs:', error);
      }
    }

    window.addEventListener('storage', handleCrossTabAuthentication);
    return () => {
      window.removeEventListener('storage', handleCrossTabAuthentication);
    };
  }, [navigate]);

  useEffect(() => {
    if (!authReady) return;

    if (
      protectedRouteIds.includes(page) &&
      !isLoggedIn &&
      location.pathname !== '/login'
    ) {
      navigate('/login', { replace: true });
    } else if (page === 'login' && isLoggedIn) {
      navigate('/dashboard', { replace: true });
    }
  }, [authReady, page, isLoggedIn, location.pathname, navigate]);

  function changeGoal(id, key, value) {
    setGoals((current) => current.map((g) => g.id === id ? { ...g, [key]: value } : g));
  }

  function addGoal() {
    setGoals((current) => [...current, {
      id: Date.now(), name: 'New goal', category: 'Personal', target: 100000,
      saved: 0, deadline: '2027-10-25', status: 'Active', priority: current.length + 1,
      flexibility: 'medium', minimumContribution: 0,
    }]);
  }

  function handleSavePlanner(e) {
    e.preventDefault();
    setPlannerSaveMessage('');
    setPlannerSaveError('');
    const activeGoalsToSave = goals.filter((goal) => goal.status !== 'Achieved');
    if (activeGoalsToSave.some((goal) => !goal.name?.trim() || Number(goal.target) <= 0 || !goal.deadline)) {
      setPlannerSaveError('Please give every active goal a name, a positive target amount, and a target date.');
      return;
    }
    const payload = {
      saved_at: new Date().toISOString(),
      income: Number(income),
      expenses: Number(expenses),
      debt: Number(debt),
      reserve: Number(reserve),
      plannerFinancials,
      goals: goals.map((goal) => ({
        ...goal,
        name: goal.name.trim(),
        target: Number(goal.target),
        saved: Number(goal.saved),
        priority: Number(goal.priority || 1),
        minimumContribution: Number(goal.minimumContribution || 0),
      })),
      planAnswers,
      question,
    };
    try {
      localStorage.setItem('foresight-planner-data', JSON.stringify(payload));
      const historyEntry = {
        id: `${Date.now()}`,
        savedAt: payload.saved_at,
        income: payload.income,
        expenses: payload.expenses,
        debt: payload.debt,
        reserve: payload.reserve,
        surplus: payload.income - payload.expenses - payload.debt,
        goalCount: payload.goals.length,
      };
      const nextHistory = [historyEntry, ...planHistory].slice(0, 20);
      localStorage.setItem('foresight-plan-history', JSON.stringify(nextHistory));
      setPlanHistory(nextHistory);
      setPlannerSaveMessage('Your financial baseline and goals have been saved in this browser.');
    } catch {
      setPlannerSaveError('Could not save your data in this browser. Check available browser storage and try again.');
    }
  }

  function nav(id) {
    const protectedPages = ['dashboard', 'profile', 'planner', 'simulator', 'recovery', 'recommendations'];
    const destination = protectedPages.includes(id) && !isLoggedIn ? 'login' : id;
    navigate(pageToRoute[destination] || '/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleAuthenticated(user) {
    setIsLoggedIn(true);
    setProfile((current) => ({
      ...current,
      name: user.name,
      email: user.email,
    }));
    navigate('/dashboard', { replace: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleLogout() {
    try {
      await fetch('/api/v1/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
      });
    } catch (error) {
      console.error('Logout request failed:', error);
    } finally {
      setIsLoggedIn(false);
      localStorage.removeItem('foresight-demo-session');
      navigate('/', { replace: true });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  const pageData = {
    money,
    profile,
    setProfile,
    goals,
    setGoals,
    income,
    setIncome,
    expenses,
    setExpenses,
    debt,
    setDebt,
    reserve,
    setReserve,
    monthlySavings,
    setMonthlySavings,
    planAnswers,
    setPlanAnswers,
    whatIf,
    setWhatIf,
    question,
    setQuestion,
    showPlan,
    setShowPlan,
    plannerFinancials,
    setPlannerFinancials,
    plannerSaveMessage,
    setPlannerSaveMessage,
    plannerSaveError,
    setPlannerSaveError,
    planHistory,
    surplus,
    goalTotal,
    goalSaved,
    activeGoals,
    achievedGoals,
    simulatedSurplus,
    oneTimeAfterReserve,
    adjustedSurplus,
    profileInitials,
    nav,
    changeGoal,
    addGoal,
    handleSavePlanner
  };

  return (
    <div className={`app-shell ${page === 'welcome' ? 'welcome-shell' : ''}`}>
      {page !== 'welcome' && page !== 'login' && (
        <Sidebar pages={pages} page={page} nav={nav} profileInitials={profileInitials} profile={profile} />
      )}

      <main className="main-area">
        {page !== 'welcome' && page !== 'login' && (
          <Topbar page={page} pages={pages} profileInitials={profileInitials} nav={nav} onLogout={handleLogout} />
        )}

        {page === 'not-found' && <div className="page-content"><h1>Page not found</h1><button className="button button-primary" onClick={() => nav('dashboard')}>Go to dashboard</button></div>}

        {page === 'login' && (
          <AuthPage
            onAuthenticated={handleAuthenticated}
            onBack={() => nav('welcome')}
          />
        )}

        {page === 'welcome' && <WelcomePage data={pageData} />}

        {page === 'dashboard' && <DashboardPage data={pageData} />}

        {page === 'profile' && <ProfilePage data={pageData} />}

        {page === 'planner' && <PlannerPage data={pageData} />}

        {page === 'simulator' && <SimulatorPage data={pageData} />}

        {page === 'recovery' && <RecoveryPage data={pageData} />}

        {page === 'recommendations' && <RecommendationsPage data={pageData} />}

        </main>
    </div>
  );
}

export default App;
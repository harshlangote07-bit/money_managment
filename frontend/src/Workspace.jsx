import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar.jsx';
import Topbar from './components/Topbar.jsx';
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
  { id: 'recommendations', label: 'Recommendations & History', icon: '◉' },
];

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const routeToPage = {'/':'welcome','/login':'login','/dashboard':'dashboard','/planner':'planner','/simulator':'simulator','/recovery':'recovery','/recommendations':'recommendations','/profile':'profile'};
  const pageToRoute = {welcome:'/',login:'/login',dashboard:'/dashboard',planner:'/planner',simulator:'/simulator',recovery:'/recovery',recommendations:'/recommendations',profile:'/profile'};
  const page = routeToPage[location.pathname] || 'not-found';
  const [isLoggedIn, setIsLoggedIn] = useState(
    () => localStorage.getItem('foresight-demo-session') === 'active'
  );
  const [loginEmail, setLoginEmail] = useState('');
  const [loginError, setLoginError] = useState('');

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
    if (protectedRouteIds.includes(page) && !isLoggedIn && location.pathname !== '/login') {
      navigate('/login', { replace: true });
    }
  }, [page, isLoggedIn, location.pathname, navigate]);

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

  function handleDemoLogin(e) {
    e.preventDefault();
    if (!loginEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginEmail.trim())) {
      setLoginError('Please enter a valid email address.');
      return;
    }
    localStorage.setItem('foresight-demo-session', 'active');
    setIsLoggedIn(true);
    setLoginError('');
    navigate('/dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleLogout() {
    localStorage.removeItem('foresight-demo-session');
    setIsLoggedIn(false);
    setLoginEmail('');
    navigate('/', { replace: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
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
          <section className="login-page" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '32px 20px', background: 'linear-gradient(135deg, #f5f7f2 0%, #eef3eb 100%)' }}>
            <div className="login-card" style={{ width: '100%', maxWidth: '460px', padding: 'clamp(28px, 5vw, 48px)', background: '#fff', border: '1px solid #e3e9df', borderRadius: '24px', boxShadow: '0 24px 70px rgba(39, 66, 48, 0.10)' }}>
              <button className="brand" onClick={() => nav('welcome')} aria-label="Foresight home" style={{ marginBottom: '36px' }}>
                <img src="/foresight-logo.png" alt="Foresight Logo" className="brand-logo" style={{ height: '30px', width: 'auto' }} />
                <span>foresight<span className="brand-dot">.</span></span>
              </button>
              <div className="eyebrow"><span className="eyebrow-dot" /> PERSONAL FINANCIAL PLANNING</div>
              <h1 style={{ fontSize: 'clamp(2rem, 6vw, 2.8rem)', lineHeight: 1.1, margin: '18px 0 14px', color: '#263b2d' }}>Welcome to <em>Foresight.</em></h1>
              <p style={{ color: '#68756a', lineHeight: 1.7, marginBottom: '28px' }}>Explore your financial goals, test scenarios, and prepare for life's unexpected changes.</p>
              <form onSubmit={handleDemoLogin}>
                <label className="form-field">Email address
                  <input type="email" value={loginEmail} onChange={(e) => { setLoginEmail(e.target.value); setLoginError(''); }} placeholder="you@example.com" autoComplete="email" required />
                </label>
                {loginError && <p role="alert" style={{ color: '#b42318', fontSize: '0.9rem', margin: '8px 0 14px' }}>{loginError}</p>}
                <button className="button button-primary full-button" type="submit" style={{ marginTop: '12px' }}>Enter demo workspace <span>→</span></button>
              </form>
              <p style={{ color: '#7a857b', fontSize: '0.82rem', lineHeight: 1.6, margin: '20px 0' }}>Demo access only. No password or real account is required. This is not secure authentication.</p>
              <button className="text-button" onClick={() => nav('welcome')}>← Back to home</button>
            </div>
          </section>
        )}

        {page === 'welcome' && (
          <section className="landing">
            <header className="landing-nav">
              <button className="brand" onClick={() => nav('welcome')}>
                <img src="/foresight-logo.png" alt="Foresight Logo" className="brand-logo" style={{ height: '32px', width: 'auto' }} />
                <span>foresight<span className="brand-dot">.</span></span>
              </button>
              <div className="landing-nav-links">
                <button onClick={() => nav('planner')}>Plan</button>
                <button onClick={() => nav('dashboard')}>Dashboard</button>
                <button onClick={() => nav('planner')}>Simulate <span className="nav-whatif">(What if)</span></button>
              </div>
              <button className="landing-profile-button" onClick={() => nav('profile')} aria-label="Open profile" title="Open profile">
                <span className="landing-profile-image">{profileInitials}</span>
              </button>
            </header>
            <div className="hero">
              <div className="hero-copy">
                <div className="eyebrow"><span className="eyebrow-dot" /> PERSONAL FINANCIAL PLANNING</div>
                <h1>Your goals deserve<br />more than <em>guesswork.</em></h1>
                <p>Foresight helps you understand where you stand, plan for what matters, and explore how life's unexpected changes could affect your future.</p>
                <div className="hero-actions"><button className="button button-primary" onClick={() => nav('dashboard')}>Explore your dashboard <span>→</span></button><button className="button button-quiet" onClick={() => nav('planner')}>Try a what-if scenario <span>↗</span></button></div>
                <div className="hero-footnote"><span className="mini-check">✓</span> Your goals. Your choices. A clearer path forward.</div>
              </div>
              <div className="hero-visual" aria-label="Illustration of financial goals">
                <div className="visual-orbit orbit-one" /><div className="visual-orbit orbit-two" />
                <div className="visual-card visual-main"><div className="visual-card-top"><span>YOUR GOALS</span><span className="visual-chip">● On track</span></div><div className="visual-number">₹4,60,000</div><small>Total saved across goals</small><div className="visual-chart"><span style={{height:'27%'}}/><span style={{height:'38%'}}/><span style={{height:'33%'}}/><span style={{height:'51%'}}/><span style={{height:'47%'}}/><span style={{height:'66%'}}/><span style={{height:'58%'}}/><span style={{height:'78%'}}/><span style={{height:'70%'}}/><span style={{height:'94%'}}/></div><div className="visual-progress"><span>Overall progress</span><strong>31%</strong></div><div className="visual-track"><span /></div></div>
                <div className="floating-card float-top"><span className="float-icon">↗</span><div><small>Monthly surplus</small><strong>₹40,000</strong></div></div>
                <div className="floating-card float-bottom"><span className="float-icon star">✳</span><div><small>Planning for</small><strong>What matters next</strong></div></div>
                <div className="floating-card float-left"><span className="float-icon purple">◎</span><div><small>Goal milestone</small><strong>75% complete</strong></div></div>
                <div className="floating-card float-right"><span className="float-icon amber">↗</span><div><small>What-if scenario</small><strong>Compare outcomes</strong></div></div>
                <div className="mini-orbit-card"><span>✦</span><div><small>Prepared for change</small><strong>More than one path</strong></div></div>
                <div className="visual-sparkle sparkle-a">✳</div><div className="visual-sparkle sparkle-b">✦</div>
              </div>
            </div>
            <div className="landing-bottom"><div><span className="bottom-line" /><span>One connected view of your financial life</span></div><div className="landing-feature-list"><span>01 &nbsp; Track goals</span><span>02 &nbsp; Understand progress</span><span>03 &nbsp; Explore possibilities</span></div></div>
            <section className="wisdom-section">
              <div className="wisdom-heading">
                <div className="eyebrow">PERSPECTIVES THAT LAST</div>
                <h2>Good money decisions<br />start with <em>good thinking.</em></h2>
                <p>Timeless reminders from people whose ideas have shaped how we think about money, patience, and investing.</p>
              </div>
              <div className="quote-grid">
                <article className="quote-card quote-card-featured">
                  <span className="quote-mark">“</span>
                  <p>Do not save what is left after spending, but spend what is left after saving.</p>
                  <div className="quote-attribution"><span className="quote-avatar">WB</span><div><strong>Warren Buffett</strong><small>Investor and philanthropist</small></div><span className="quote-number">01</span></div>
                </article>
                <article className="quote-card">
                  <span className="quote-mark">“</span>
                  <p>An investment in knowledge pays the best interest.</p>
                  <div className="quote-attribution"><span className="quote-avatar quote-avatar-gold">BF</span><div><strong>Benjamin Franklin</strong><small>Writer and statesman</small></div><span className="quote-number">02</span></div>
                </article>
                <article className="quote-card">
                  <span className="quote-mark">“</span>
                  <p>The individual investor should act consistently as an investor and not as a speculator.</p>
                  <div className="quote-attribution"><span className="quote-avatar quote-avatar-blue">BG</span><div><strong>Benjamin Graham</strong><small>Economist and investor</small></div><span className="quote-number">03</span></div>
                </article>
              </div>
              <p className="quote-disclaimer">Quotes are included for inspiration and general education, not as personal financial advice.</p>
            </section>

            <footer className="landing-footer">
              <div className="footer-main">
                <div className="footer-brand-wrap">
                  <button className="brand footer-brand-button" onClick={() => nav('welcome')} aria-label="Foresight home">
                    <img src="/foresight-logo.png" alt="" className="brand-logo" />
                    <span>foresight<span className="brand-dot">.</span></span>
                  </button>
                  <p>Make room for your goals. Build a plan for the unexpected.</p>
                  <span className="footer-note"><span className="footer-note-dot" /> A clearer way to plan</span>
                </div>
                <div className="footer-links"><strong>Explore</strong><button onClick={() => nav('planner')}>Plan</button><button onClick={() => nav('dashboard')}>Dashboard</button><button onClick={() => nav('planner')}>Simulate (What if)</button><button onClick={() => nav('profile')}>Your profile</button></div>
                <div className="footer-links contact-links"><strong>Contact &amp; support</strong><span className="contact-label">Customer service</span><a href="tel:+91XXXXXXXXXX">+91 XXXXX XXXXX</a><a href="mailto:support@yourdomain.com">support@yourdomain.com</a><span className="contact-note">Replace these placeholders with your official contact details.</span></div>
                <div className="footer-signoff"><span className="footer-star">✳</span><strong>Plan for today.<br />Prepare for tomorrow.</strong></div>
              </div>
              <div className="footer-bottom"><span>© 2026 Foresight. For educational planning purposes.</span><span>Built around your goals, not guesswork.</span></div>
            </footer>
          </section>
        )}

        {page === 'dashboard' && (
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
        )}

        {page === 'profile' && (
          <div className="page-content">
            <section className="page-heading"><div><div className="eyebrow"><span className="eyebrow-dot" /> YOUR PERSONAL SPACE</div><h1>Your story, your <em>goals.</em></h1><p>Manage your details and look back at the goals you've set for yourself.</p></div></section>
            <section className="profile-grid">
              <div className="panel profile-card"><div className="profile-hero"><div className="profile-photo">{profileInitials}</div><div><span className="section-kicker">YOUR PROFILE</span><h2>{profile.name || 'Your name'}</h2><p>{profile.occupation || 'Occupation not added'}</p></div></div><label className="form-field">Full name<input value={profile.name} onChange={(e) => setProfile({...profile, name:e.target.value})} placeholder="Your full name" /></label><label className="form-field">Email address<input type="email" value={profile.email} onChange={(e) => setProfile({...profile, email:e.target.value})} placeholder="you@example.com" /></label><label className="form-field">Occupation / current stage<input value={profile.occupation} onChange={(e) => setProfile({...profile, occupation:e.target.value})} placeholder="Student, employed, self-employed..." /></label><label className="form-field">Monthly income (₹)<input type="number" min="0" value={income} onChange={(e) => {setIncome(Number(e.target.value)); setProfile({...profile, monthlyIncome:Number(e.target.value)});}} /></label><div className="notice">These edits currently remain in this browser session. Persistent account data will be connected to the backend.</div></div>
              <div className="panel profile-stats"><span className="section-kicker">YOUR JOURNEY</span><h2>Goal history</h2><p>Review what you've achieved and what you're still building toward.</p><div className="history-summary"><div><strong>{activeGoals.length}</strong><span>Active goals</span></div><div><strong>{achievedGoals.length}</strong><span>Achieved</span></div><div><strong>{money(goalSaved)}</strong><span>Total saved</span></div></div><div className="history-list">{[...goals].sort((a,b) => (a.status === 'Achieved' ? 1 : 0) - (b.status === 'Achieved' ? 1 : 0)).map((g) => <div className="history-item" key={g.id}><span className={`history-mark ${g.status === 'Achieved' ? 'achieved' : ''}`}>{g.status === 'Achieved' ? '✓' : '○'}</span><div className="history-copy"><strong>{g.name}</strong><small>{g.category} · Target {new Date(g.deadline + 'T00:00:00').toLocaleDateString('en-IN', {month:'short', year:'numeric'})}</small></div><span className={`status-pill ${g.status === 'Achieved' ? 'done' : ''}`}>{g.status}</span></div>)}</div></div>
            </section>
            <section className="panel goal-management"><div className="panel-heading"><div><span className="section-kicker">GOAL MANAGEMENT</span><h2>Goals and targets</h2><p>Edit the demo goals below. Backend persistence comes in the integration step.</p></div><button className="button button-outline" onClick={addGoal}>＋ Add goal</button></div>{goals.map((g) => <div className="goal-edit" key={g.id}><label>Goal name<input value={g.name} onChange={(e) => changeGoal(g.id,'name',e.target.value)} /></label><label>Target amount<input type="number" min="1" value={g.target} onChange={(e) => changeGoal(g.id,'target',Math.max(1,Number(e.target.value)))} /></label><label>Saved amount<input type="number" min="0" value={g.saved} onChange={(e) => changeGoal(g.id,'saved',Math.max(0,Number(e.target.value)))} /></label><label>Target date<input type="date" value={g.deadline} onChange={(e) => changeGoal(g.id,'deadline',e.target.value)} /></label><label>Status<select value={g.status} onChange={(e) => changeGoal(g.id,'status',e.target.value)}><option>Active</option><option>Achieved</option><option>Paused</option><option>Missed</option></select></label><button className="delete-goal" onClick={() => setGoals((all) => all.filter((item) => item.id !== g.id))} aria-label={`Delete ${g.name}`}>×</button></div>)}</section>
            <p className="demo-note">Profile and goal history are UI prototypes using sample data. They are not yet connected to a signed-in user.</p>
          </div>
        )}

        {page === 'planner' && (
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
        )}
        {page === 'simulator' && (
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
        )}

        {page === 'recovery' && (
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
        )}

        {page === 'recommendations' && (
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
        )}

      </main>
    </div>
  );
}

function Metric({ label, value, note, dark = false }) {
  return <article className={`metric-card ${dark ? 'metric-dark' : ''}`}><div className="metric-head">{label}<span>↗</span></div><strong className="metric-value">{value}</strong><p>{note}</p></article>;
}
function CashRow({ label, value, kind }) { return <div className="cash-row"><span><i className={`cash-dot ${kind}`} />{label}</span><strong className={value < 0 ? 'negative' : ''}>{value < 0 ? '−' : ''}{money(Math.abs(value))}</strong></div>; }
function NumberField({ value, onChange }) { return <div className="number-field"><span>₹</span><input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} /></div>; }

export default App;
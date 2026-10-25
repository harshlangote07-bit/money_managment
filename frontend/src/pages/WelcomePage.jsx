import React from 'react';
import { Metric, CashRow, NumberField } from '../components/FinancialUI.jsx';

export default function WelcomePage({ data }) {
  const { money, profile, goals, surplus, profileInitials, nav } = data;

  return (
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
  );
}

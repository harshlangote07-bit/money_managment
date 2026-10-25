export default function Sidebar({ pages, page, nav, profileInitials, profile }) {
  return <aside className="sidebar">
    <button className="brand" onClick={() => nav('welcome')} aria-label="Money home"><img src="/foresight-logo.png" alt="Foresight Logo" className="brand-logo" style={{height:'28px',width:'auto'}}/><span>foresight<span className="brand-dot">.</span></span></button>
    <p className="side-label">YOUR WORKSPACE</p>
    <nav className="nav-list" aria-label="Main navigation">{pages.map(item => <button key={item.id} className={`nav-item ${page===item.id?'selected':''}`} onClick={() => nav(item.id)}><span className="nav-icon">{item.icon}</span><span>{item.label}</span>{page===item.id && <span className="nav-indicator"/>}</button>)}</nav>
    <div className="sidebar-bottom"><div className="side-tip"><span className="tip-icon">✳</span><strong>Your future, in focus.</strong><p>Understand your choices before making them.</p><button onClick={() => nav('planner')}>Explore your plan <span>↗</span></button></div>
    <button className="sidebar-profile" onClick={() => nav('profile')}><span className="avatar">{profileInitials}</span><span className="sidebar-profile-copy"><strong>{profile.name || 'Your profile'}</strong><small>{profile.occupation || 'Personal workspace'}</small></span><span className="more">···</span></button></div>
  </aside>;
}

export default function Topbar({ page, pages, profileInitials, nav, onLogout }) {
  return <header className="topbar"><div className="crumb">Foresight <span>/</span> <strong>{pages.find(p => p.id===page)?.label || (page==='profile'?'Profile':'Workspace')}</strong></div><div className="topbar-right"><span className="live-dot"/>Personal planning space <button className="top-avatar" onClick={() => nav('profile')}>{profileInitials}</button><button className="text-button" onClick={onLogout}>Log out</button></div></header>;
}

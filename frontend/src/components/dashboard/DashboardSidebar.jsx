import { Link } from 'react-router-dom'

const navItems = [
  { label: 'Dashboard', icon: 'dashboard', active: true },
  { label: 'AI Business Advisor', icon: 'smart_toy' },
  { label: 'Mentoring Sessions', icon: 'video_chat' },
  { label: 'Impact Reports', icon: 'monitoring' },
  { label: 'Financials', icon: 'payments' },
  { label: 'Network', icon: 'group' },
  { label: 'Settings', icon: 'settings' },
]

function DashboardSidebar({ onLogout }) {
  return (
    <aside className="dashboard-sidebar">
      <div>
        <div className="sidebar-brand">
          <h1>MicroFun</h1>
          <p>Empowering Growth</p>
        </div>

        <nav className="sidebar-nav" aria-label="Dashboard navigation">
          {navItems.map((item) => (
            <a
              key={item.label}
              href="#"
              className={item.active ? 'active' : ''}
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </a>
          ))}
        </nav>

        <button type="button" className="sidebar-raise-btn">
          Raise Request
        </button>
      </div>

      <div className="sidebar-footer-links">
        <a href="#">Help Center</a>
        <button type="button" onClick={onLogout}>
          Logout
        </button>
        <Link to="/">Back to Landing</Link>
      </div>
    </aside>
  )
}

export default DashboardSidebar
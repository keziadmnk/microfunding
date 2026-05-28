import { Link } from 'react-router-dom'
import './DashboardSidebar.css'

const defaultNavItems = [
  { label: 'Dashboard', icon: 'dashboard' },
  { label: 'AI Business Advisor', icon: 'smart_toy' },
  { label: 'Mentoring', icon: 'video_chat' },
  { label: 'Financials', icon: 'payments' },
  { label: 'Forum', icon: 'forum' },
  { label: 'Profile', icon: 'storefront' },
]

function DashboardSidebar({
  onLogout,
  activeTab,
  onTabChange,
  navItems = defaultNavItems,
  brandSubtitle = 'Empowering Growth',
  ctaLabel = 'Raise Request',
  children,
}) {
  function handleNavClick(event, item) {
    event.preventDefault()
    onTabChange(item.children?.[0]?.label || item.label)
  }

  function isItemActive(item) {
    if (activeTab === 'Workspace Mentoring' && item.label === 'Mentoring') return true
    if (activeTab === 'Workspace Mentor' && item.label === 'Mentoring') return true
    return item.label === activeTab || item.children?.some((child) => child.label === activeTab)
  }

  function isChildActive(child) {
    if (activeTab === 'Workspace Mentoring' && child.label === 'Mentoring Saya') return true
    if (activeTab === 'Workspace Mentor' && child.label === 'Mentee Saya') return true
    return child.label === activeTab
  }

  return (
    <aside className="dashboard-sidebar">
      <div>
        <div className="sidebar-brand">
          <h1>MicroFun</h1>
          <p>{brandSubtitle}</p>
        </div>

        <nav className="sidebar-nav" aria-label="Dashboard navigation">
          {navItems.map((item) => {
            const active = isItemActive(item)

            return (
              <div key={item.label} className={`sidebar-nav-group ${active ? 'open' : ''}`}>
                <a
                  href="#"
                  className={active && !item.children ? 'active' : active ? 'parent-active' : ''}
                  onClick={(event) => handleNavClick(event, item)}
                >
                  <span className="material-symbols-outlined" aria-hidden="true">
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                  {item.children && (
                    <span className="material-symbols-outlined sidebar-chevron" aria-hidden="true">
                      expand_more
                    </span>
                  )}
                </a>

                {item.children && (
                  <div className="sidebar-subnav">
                    {item.children.map((child) => (
                      <a
                        key={child.label}
                        href="#"
                        className={isChildActive(child) ? 'active' : ''}
                        onClick={(event) => {
                          event.preventDefault()
                          onTabChange(child.label)
                        }}
                      >
                        <span className="material-symbols-outlined" aria-hidden="true">
                          {child.icon}
                        </span>
                        <span>{child.label}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {children}

        <button type="button" className="sidebar-raise-btn">
          {ctaLabel}
        </button>
      </div>

      <div className="sidebar-footer-links">
        <button type="button" onClick={onLogout}>
          Logout
        </button>
        <Link to="/">Back to Landing</Link>
      </div>
    </aside>
  )
}

export default DashboardSidebar

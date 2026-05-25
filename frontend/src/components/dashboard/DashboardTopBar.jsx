function DashboardTopBar({ title, subtitle, avatarUrl }) {
  return (
    <header className="dashboard-topbar">
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>

      <div className="dashboard-topbar-actions">
        <button type="button" className="notification-btn" aria-label="Notifications">
          <span className="material-symbols-outlined" aria-hidden="true">
            notifications
          </span>
          <span className="notification-dot" />
        </button>
        <img alt="User profile" className="dashboard-avatar" src={avatarUrl} />
      </div>
    </header>
  )
}

export default DashboardTopBar
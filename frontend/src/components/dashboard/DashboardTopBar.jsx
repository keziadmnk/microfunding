function DashboardTopBar({ title, subtitle, avatarUrl, avatarAlt = 'User profile' }) {
  return (
    <header className="dashboard-topbar">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>

      <div className="dashboard-topbar-actions">
        <img alt={avatarAlt} className="dashboard-avatar" src={avatarUrl} />
      </div>
    </header>
  )
}

export default DashboardTopBar

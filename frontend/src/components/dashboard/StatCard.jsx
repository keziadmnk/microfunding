function StatCard({ icon, title, description }) {
  return (
    <div className="dashboard-stat-card">
      <div className="dashboard-stat-icon">
        <span className="material-symbols-outlined" aria-hidden="true">
          {icon}
        </span>
      </div>
      <div>
        <p>{title}</p>
        <span>{description}</span>
      </div>
    </div>
  )
}

export default StatCard
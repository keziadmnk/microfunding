function DashboardSection({ title, actionLabel, children, className = '', span = 'auto' }) {
  const spanClass = span === 'full' ? 'span-full' : span === 'wide' ? 'span-wide' : ''

  return (
    <section className={`dashboard-card ${spanClass} ${className}`.trim()}>
      {(title || actionLabel) && (
        <div className="dashboard-card-header">
          {title ? <h3>{title}</h3> : <span />}
          {actionLabel ? <button type="button">{actionLabel}</button> : null}
        </div>
      )}
      {children}
    </section>
  )
}

export default DashboardSection
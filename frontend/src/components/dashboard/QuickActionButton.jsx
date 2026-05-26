function QuickActionButton({ label, icon, variant, onClick }) {
  return (
    <button
      type="button"
      className={`quick-action-btn ${variant === 'primary' ? 'primary' : 'secondary'}`}
      onClick={onClick}
    >
      <span className="quick-action-main">
        <span className="material-symbols-outlined" aria-hidden="true">
          {icon}
        </span>
        <span>{label}</span>
      </span>
      <span className="material-symbols-outlined quick-action-chevron" aria-hidden="true">
        chevron_right
      </span>
    </button>
  )
}

export default QuickActionButton
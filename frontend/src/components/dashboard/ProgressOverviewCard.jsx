function ProgressOverviewCard({ progress, currentAmount, targetAmount, investorAvatars }) {
  return (
    <div className="progress-overview-card">
      <div className="progress-summary">
        <div>
          <span>Funding Goal Reached</span>
          <strong>{progress}%</strong>
        </div>
        <div className="progress-track">
          <span className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="progress-values">
          <p>Current: {currentAmount}</p>
          <p>Target: {targetAmount}</p>
        </div>
      </div>

      <div className="investor-stack">
        {investorAvatars.map((avatar) => (
          <img key={avatar} alt="Investor profile" src={avatar} />
        ))}
        <div className="investor-count">+12</div>
      </div>

      <div className="progress-next-steps">
        <div className="progress-next-steps-head">
          <span className="material-symbols-outlined" aria-hidden="true">
            info
          </span>
          <p>Next Steps for Disbursement</p>
        </div>
        <ul>
          <li>
            <span className="material-symbols-outlined" aria-hidden="true">
              check_circle
            </span>
            Finalize Impact Audit
          </li>
          <li>
            <span className="material-symbols-outlined" aria-hidden="true">
              radio_button_unchecked
            </span>
            Confirm Bank Details
          </li>
        </ul>
      </div>
    </div>
  )
}

export default ProgressOverviewCard
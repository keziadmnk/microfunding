function SessionCard({ title, mentor, schedule, image }) {
  return (
    <article className="session-card">
      <div className="session-card-inner">
        <img alt={title} className="session-card-image" src={image} />
        <div className="session-card-copy">
          <p className="session-card-title">{title}</p>
          <p className="session-card-mentor">with {mentor}</p>
          <div className="session-card-schedule">
            <span className="material-symbols-outlined" aria-hidden="true">
              calendar_today
            </span>
            <span>{schedule}</span>
          </div>
        </div>
        <button type="button" className="session-action-btn" aria-label={`Open ${title} session`}>
          <span className="material-symbols-outlined" aria-hidden="true">
            video_call
          </span>
        </button>
      </div>
    </article>
  )
}

export default SessionCard
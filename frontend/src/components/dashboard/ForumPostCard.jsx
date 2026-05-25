function ForumPostCard({ author, role, time, avatar, content, replies, likes }) {
  return (
    <article className="forum-post-card">
      <img alt={`${author} avatar`} className="forum-post-avatar" src={avatar} />
      <div className="forum-post-body">
        <div className="forum-post-head">
          <div>
            <h4>{author}</h4>
            <p>{role}</p>
          </div>
          <span>{time}</span>
        </div>
        <p className="forum-post-content">{content}</p>
        <div className="forum-post-meta">
          <span>
            <span className="material-symbols-outlined" aria-hidden="true">
              chat_bubble_outline
            </span>
            {replies}
          </span>
          <span>
            <span className="material-symbols-outlined" aria-hidden="true">
              favorite
            </span>
            {likes}
          </span>
        </div>
      </div>
    </article>
  )
}

export default ForumPostCard
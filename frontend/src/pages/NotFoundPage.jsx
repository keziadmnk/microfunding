import { Link } from 'react-router-dom'

function NotFoundPage() {
  return (
    <main style={{ padding: '5rem 1.5rem', textAlign: 'center' }}>
      <h1 style={{ marginBottom: '0.75rem' }}>404 - Page Not Found</h1>
      <p style={{ marginBottom: '1.5rem', color: '#43474b' }}>
        The page you are looking for does not exist.
      </p>
      <Link to="/" style={{ color: '#122937', fontWeight: 700 }}>
        Back to Home
      </Link>
    </main>
  )
}

export default NotFoundPage

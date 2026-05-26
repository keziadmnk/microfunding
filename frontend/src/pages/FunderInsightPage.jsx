import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'

import './FunderInsightPage.css'

function FunderInsightPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { state } = useLocation()
  const insight = state?.insight

  if (!insight) {
    return (
      <main className="funder-insight-page state">
        <span className="material-symbols-outlined">psychology</span>
        <h1>Insight AI Tidak Ditemukan</h1>
        <p>Insight ini berasal dari hasil rekomendasi AI. Jalankan rekomendasi AI terlebih dahulu lalu tekan View Insight.</p>
        <Link to="/dashboard/funder">Kembali ke Dashboard</Link>
      </main>
    )
  }

  return (
    <div className="funder-insight-page">
      <header className="funder-insight-topbar">
        <Link to="/dashboard/funder" className="funder-insight-brand">MicroFun</Link>
        <button type="button" onClick={() => navigate(-1)}>
          <span className="material-symbols-outlined">arrow_back</span>
          Kembali
        </button>
      </header>

      <main className="funder-insight-main">
        <article className="funder-insight-card">
          <header className="funder-insight-hero">
            <div>
              <h1>{insight.name}</h1>
              <p>{insight.category || '-'} • {insight.location || '-'}</p>
              <strong>Goal: {insight.goal || formatCurrency(insight.fundingTarget)}</strong>
            </div>
            {insight.match ? <MatchBadge match={insight.match} /> : null}
          </header>

          <section className="funder-insight-box-page">
            <strong>AI Insight</strong>
            <p>{insight.reason || 'Belum ada insight AI untuk UMKM ini.'}</p>
          </section>

          <div className="funder-insight-two-col">
            <section>
              <h2>Bantuan Relevan</h2>
              <p>{insight.supportFit || 'Belum ada rekomendasi bantuan spesifik.'}</p>
            </section>
            <section>
              <h2>Langkah Lanjut</h2>
              <p>{insight.nextStep || 'Lanjutkan ke proses pendanaan untuk berdiskusi dengan UMKM ini.'}</p>
            </section>
          </div>

          <footer>
            <Link to={`/dashboard/funder/fund/${id}`} className="funder-insight-fund-btn">
              Fund Now
              <span className="material-symbols-outlined">arrow_forward</span>
            </Link>
          </footer>
        </article>
      </main>
    </div>
  )
}

function MatchBadge({ match }) {
  return (
    <div className="funder-insight-match-badge">
      <span className="material-symbols-outlined">bolt</span>
      {match}% Match
    </div>
  )
}

function formatCurrency(value) {
  const number = Number(value || 0)
  if (!number) return 'Belum diisi'

  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(number)
}

export default FunderInsightPage

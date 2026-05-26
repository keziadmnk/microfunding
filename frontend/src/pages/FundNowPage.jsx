import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { getCurrentUser, isAuthenticated, logout } from '../services/authService'
import './FundNowPage.css'

const amountPresets = [100000, 500000, 1000000, 5000000]

function FundNowPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [business, setBusiness] = useState(null)
  const [amount, setAmount] = useState(500000)
  const [paymentMethod, setPaymentMethod] = useState('wallet')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login', { replace: true })
      return
    }

    async function loadPage() {
      try {
        const profile = await getCurrentUser()
        if (profile.role !== 'funder') {
          navigate('/dashboard', { replace: true })
          return
        }

        const token = localStorage.getItem('microfun_auth_token')
        const response = await fetch(`${apiBaseUrl}/api/funding/umkms/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        const payload = await response.json()
        if (!response.ok) throw new Error(payload.message || 'Gagal memuat detail UMKM.')

        setBusiness(normalizeBusiness(payload.data, apiBaseUrl))
      } catch (err) {
        setError(err.message)
        if (err.message === 'No active session') {
          logout()
          navigate('/login', { replace: true })
        }
      } finally {
        setLoading(false)
      }
    }

    loadPage()
  }, [apiBaseUrl, id, navigate])

  const serviceFee = useMemo(() => Math.round(Number(amount || 0) * 0.005), [amount])
  const total = useMemo(() => Number(amount || 0) + serviceFee, [amount, serviceFee])

  async function handleConfirm() {
    const token = localStorage.getItem('microfun_auth_token')
    setSubmitting(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`${apiBaseUrl}/api/funding/umkms/${id}/fund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: Number(amount),
          description: `Metode pembayaran: ${paymentMethod}`,
        }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.message || 'Gagal menyimpan pendanaan.')

      setSuccess(payload.message || 'Pendanaan berhasil dibuat.')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <main className="fund-now-state">
        <span className="material-symbols-outlined funder-spinner-small">hourglass_empty</span>
        <p>Memuat halaman pendanaan...</p>
      </main>
    )
  }

  if (!business) {
    return (
      <main className="fund-now-state">
        <span className="material-symbols-outlined">error</span>
        <p>{error || 'Data UMKM tidak ditemukan.'}</p>
        <Link to="/dashboard/funder">Kembali ke Dashboard</Link>
      </main>
    )
  }

  return (
    <div className="fund-now-page">
      <header className="fund-now-topbar">
        <Link to="/dashboard/funder" className="fund-now-brand">MicroFun</Link>
        <nav>
          <Link to="/dashboard/funder">Funding</Link>
          <Link to="/dashboard/funder">AI Recommendation</Link>
          <Link to="/dashboard/funder">Profile</Link>
        </nav>
      </header>

      <main className="fund-now-main">
        <section className="fund-now-content">
          <div className="fund-now-hero">
            <img src={business.image} alt={business.name} />
            <div>
              <div className="fund-now-profile-row">
                <div className="fund-now-avatar">
                  <img src={business.image} alt={`${business.name} logo`} />
                </div>
                <div>
                  <h1>{business.name}</h1>
                  <p>{business.category} • {business.location || 'Lokasi belum diisi'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="fund-now-stats">
            <StatCard label="Total Goal" value={formatCurrency(business.fundingTarget)} />
            <StatCard label="Amount Raised" value={formatCurrency(business.fundedAmount)}>
              <div className="fund-now-progress">
                <span style={{ width: `${business.progress}%` }} />
              </div>
            </StatCard>
            <StatCard label="Remaining" value={formatCurrency(Math.max(0, business.fundingTarget - business.fundedAmount))} accent />
          </div>

          <section className="fund-now-impact">
            <h2>
              <span className="material-symbols-outlined">handshake</span>
              Impact of Your Investment
            </h2>
            <div>
              <article>
                <span className="material-symbols-outlined">factory</span>
                <div>
                  <strong>{business.fundingPurpose || 'Mendukung kebutuhan operasional UMKM'}</strong>
                  <p>Kontribusi Anda membantu UMKM menjalankan rencana pendanaan yang sudah mereka tuliskan.</p>
                </div>
              </article>
              <article>
                <span className="material-symbols-outlined">trending_up</span>
                <div>
                  <strong>{business.businessGoals || 'Mendorong pertumbuhan bisnis lokal'}</strong>
                  <p>Pendanaan akan memperkuat kapasitas usaha dan kesiapan UMKM untuk berkembang.</p>
                </div>
              </article>
            </div>
          </section>
        </section>

        <aside className="fund-now-checkout">
          <header>
            <h2>Investment Details</h2>
            <p>Complete your funding for {business.name}</p>
          </header>

          {error && <p className="fund-now-alert error">{error}</p>}
          {success && <p className="fund-now-alert success">{success}</p>}

          <div className="fund-now-field">
            <label htmlFor="fund-amount">Select Amount</label>
            <div className="fund-now-amount-input">
              <span>IDR</span>
              <input
                id="fund-amount"
                type="number"
                min="1000"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </div>
            <div className="fund-now-presets">
              {amountPresets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className={Number(amount) === preset ? 'active' : ''}
                  onClick={() => setAmount(preset)}
                >
                  {formatCurrency(preset)}
                </button>
              ))}
            </div>
          </div>

          <div className="fund-now-field">
            <label>Payment Method</label>
            <PaymentOption
              checked={paymentMethod === 'wallet'}
              icon="account_balance_wallet"
              label="Diaspora Wallet"
              meta="Instant • Low Fees"
              onChange={() => setPaymentMethod('wallet')}
            />
            <PaymentOption
              checked={paymentMethod === 'bank_transfer'}
              icon="account_balance"
              label="Bank Transfer"
              meta="Manual Verification"
              onChange={() => setPaymentMethod('bank_transfer')}
            />
          </div>

          <div className="fund-now-summary">
            <div>
              <span>Service Fee (0.5%)</span>
              <strong>{formatCurrency(serviceFee)}</strong>
            </div>
            <div className="total">
              <span>Total Contribution</span>
              <strong>{formatCurrency(total)}</strong>
            </div>
            <button type="button" onClick={handleConfirm} disabled={submitting}>
              {submitting ? 'Menyimpan...' : 'Confirm Investment'}
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
            <p>Dengan konfirmasi ini, data pendanaan akan disimpan dengan status pending untuk verifikasi.</p>
          </div>
        </aside>
      </main>
    </div>
  )
}

function StatCard({ accent = false, children, label, value }) {
  return (
    <article className={`fund-now-stat ${accent ? 'accent' : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {children}
    </article>
  )
}

function PaymentOption({ checked, icon, label, meta, onChange }) {
  return (
    <label className={`fund-now-payment ${checked ? 'active' : ''}`}>
      <span className="material-symbols-outlined">{icon}</span>
      <span>
        <strong>{label}</strong>
        <small>{meta}</small>
      </span>
      <input type="radio" checked={checked} onChange={onChange} />
    </label>
  )
}

function normalizeBusiness(item, apiBaseUrl) {
  const logo = item.logo
  const image = logo
    ? logo.startsWith('http') ? logo : `${apiBaseUrl}${logo.startsWith('/') ? '' : '/'}${logo}`
    : 'https://images.unsplash.com/photo-1556767576-cf0a4a80e5e2?auto=format&fit=crop&w=1200&q=80'

  return {
    ...item,
    image,
  }
}

function formatCurrency(value) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
}

export default FundNowPage

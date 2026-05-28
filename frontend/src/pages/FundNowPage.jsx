import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { getCurrentUser, isAuthenticated, logout } from '../services/authService'
import './FundNowPage.css'

const amountPresets = [50000, 100000, 500000, 1000000]

function FundNowPage() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [business, setBusiness] = useState(null)
  const [amount, setAmount] = useState(1000000)
  const [paymentMethod, setPaymentMethod] = useState('bca')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [step, setStep] = useState('checkout')
  const [countdown, setCountdown] = useState(5)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [paymentCreated, setPaymentCreated] = useState(false)
  const [fundingRequest, setFundingRequest] = useState(location.state?.fundingRequest || null)

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'
  const requestId = searchParams.get('requestId')

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
        const requestResponse = requestId
          ? await fetch(`${apiBaseUrl}/api/funding/requests/${requestId}`, {
              headers: { Authorization: `Bearer ${token}` },
            })
          : null

        if (requestResponse) {
          const requestPayload = await requestResponse.json()
          if (!requestResponse.ok) throw new Error(requestPayload.message || 'Gagal memuat request funding.')
          setFundingRequest(requestPayload.data)
          setAmount(Number(requestPayload.data?.amount || 1000000))
          setBusiness(normalizeBusiness({
            ...requestPayload.data,
            id: requestPayload.data.businessId,
            name: requestPayload.data.businessName,
          }, apiBaseUrl))
          return
        }

        const response = await fetch(`${apiBaseUrl}/api/funding/umkms/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
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
  }, [apiBaseUrl, id, navigate, requestId])

  const serviceFee = useMemo(() => Math.round(Number(amount || 0) * 0.005), [amount])
  const total = useMemo(() => Number(amount || 0) + serviceFee, [amount, serviceFee])
  const remaining = Math.max(0, Number(business?.fundingTarget || 0) - Number(business?.fundedAmount || 0))
  const transactionCode = useMemo(() => {
    const date = new Date()
    const ymd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`
    return `MF-INV-${ymd}-${String(id).padStart(3, '0')}`
  }, [id])
  const paymentInfo = getPaymentInfo(paymentMethod)

  useEffect(() => {
    if (step !== 'payment') return undefined

    setCountdown(5)
    setShowSuccessModal(false)

    const interval = window.setInterval(() => {
      setCountdown((current) => {
        if (current <= 1) {
          window.clearInterval(interval)
          handleAutoSuccess()
          return 0
        }
        return current - 1
      })
    }, 1000)

    return () => window.clearInterval(interval)
  }, [step])

  async function handleConfirm() {
    setStep('payment')
  }

  async function handleAutoSuccess() {
    if (paymentCreated) {
      setShowSuccessModal(true)
      return
    }

    const token = localStorage.getItem('microfun_auth_token')
    setSubmitting(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(
        requestId
          ? `${apiBaseUrl}/api/funding/requests/${requestId}/complete`
          : `${apiBaseUrl}/api/funding/umkms/${id}/fund`,
        {
        method: requestId ? 'PATCH' : 'POST',
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
      setPaymentCreated(true)
      setShowSuccessModal(true)
    } catch (err) {
      setError(err.message)
      setShowSuccessModal(true)
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

  if (step === 'payment') {
    return (
      <main className="fund-now-page payment-step">
        <section className="payment-confirmation-card">
          <header>
            <div>
              <h1>Selesaikan Transfer Bank Anda</h1>
              <p>Silakan tunggu simulasi pembayaran. Sistem akan memverifikasi otomatis dalam beberapa detik.</p>
            </div>
            <span className="payment-status-badge">
              <i />
              Menunggu Pembayaran
            </span>
          </header>

          <div className="payment-confirmation-body">
            <div className="payment-countdown-box">
              <p>Selesaikan Pembayaran Dalam</p>
              <div>
                <TimeUnit value="00" label="Jam" />
                <b>:</b>
                <TimeUnit value="00" label="Menit" />
                <b>:</b>
                <TimeUnit value={String(countdown).padStart(2, '0')} label="Detik" />
              </div>
            </div>

            <div className="payment-detail-grid">
              <PaymentDetail label="Kode Transaksi" value={transactionCode} />
              <PaymentDetail label="Jumlah yang Harus Ditransfer" value={formatCurrency(total)} accent />
            </div>

            <div className="payment-bank-card">
              <div className="payment-bank-head">
                <div>{paymentInfo.shortName}</div>
                <section>
                  <p>Tujuan Transfer</p>
                  <strong>{paymentInfo.name}</strong>
                </section>
              </div>
              <div className="payment-bank-rows">
                <PaymentBankRow label="Nomor Virtual Account" value={paymentInfo.accountNumber} />
                <PaymentBankRow label="Nama Pemilik Rekening" value="MicroFun Escrow Demo" />
                <PaymentBankRow label="Campaign" value={business.name} />
              </div>
            </div>
          </div>

          <footer>
            <button type="button" onClick={() => setStep('checkout')}>Kembali</button>
            <button type="button" onClick={handleAutoSuccess} disabled={submitting}>
              {submitting ? 'Mengecek...' : 'Cek Status Pembayaran'}
            </button>
          </footer>
        </section>

        {showSuccessModal && (
          <PaymentSuccessModal
            amount={Number(amount || 0)}
            businessName={business.name}
            error={error}
            serviceFee={serviceFee}
            onClose={() => {
              setShowSuccessModal(false)
              if (!error) navigate('/dashboard/funder')
            }}
            onFundingHistory={() => navigate('/dashboard/funder', { state: { activeTab: 'Funding History' } })}
            onFundingList={() => navigate('/dashboard/funder')}
            success={success}
            total={total}
          />
        )}
      </main>
    )
  }

  return (
    <main className="fund-now-page">
      <div className="fund-now-main">
        <section className="fund-now-content">
          <section className="fund-now-hero">
            <img src={business.image} alt={business.name} />
            <div className="fund-now-hero-overlay">
              <div>
                <div className="fund-now-hero-meta">
                  <span>{business.category}</span>
                  <p>
                    <span className="material-symbols-outlined">location_on</span>
                    {business.location || 'Lokasi belum diisi'}
                  </p>
                </div>
                <h1>{business.name}</h1>
                <p>{business.description || 'UMKM ini belum menambahkan deskripsi bisnis.'}</p>
              </div>
            </div>
          </section>

          <section className="fund-now-progress-card">
            <div className="fund-now-progress-head">
              <div>
                <p>Total Didanai</p>
                <h3>
                  {formatCurrency(business.fundedAmount)}
                  <span> / {formatCurrency(business.fundingTarget)}</span>
                </h3>
              </div>
              <strong>{business.progress}%</strong>
            </div>
            <div className="fund-now-progress">
              <span style={{ width: `${business.progress}%` }} />
            </div>
            <div className="fund-now-progress-stats">
              <div>
                <span>Sisa</span>
                <strong>{formatCurrency(remaining)}</strong>
              </div>
              <div>
                <span>Status</span>
                <strong>{business.verified ? 'Terverifikasi' : 'Menunggu Verifikasi'}</strong>
              </div>
            </div>
          </section>

          <section className="fund-now-impact">
            <h2>Rencana Pendanaan</h2>
            <article>
              <span className="material-symbols-outlined">factory</span>
              <div>
                <strong>Penggunaan Dana</strong>
                <p>{business.fundingPurpose || 'UMKM ini belum menuliskan rencana penggunaan dana.'}</p>
              </div>
            </article>
            <article>
              <span className="material-symbols-outlined">trending_up</span>
              <div>
                <strong>Target Bisnis</strong>
                <p>{business.businessGoals || 'UMKM ini belum menuliskan target bisnis.'}</p>
              </div>
            </article>
          </section>
        </section>

        <aside className="fund-now-checkout">
          <h2>Detail Investasi</h2>

          {error && <p className="fund-now-alert error">{error}</p>}
          {success && <p className="fund-now-alert success">{success}</p>}

          {fundingRequest && (
            <div className="fund-now-request-note">
              <span>Request UMKM</span>
              <p>{fundingRequest.requestDescription || 'UMKM tidak menambahkan deskripsi permohonan.'}</p>
            </div>
          )}

          <div className="fund-now-field">
            <label htmlFor="fund-amount">Jumlah Kontribusi (IDR)</label>
            <div className="fund-now-amount-input">
              <span>Rp</span>
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
                  {formatCompactAmount(preset)}
                </button>
              ))}
            </div>
          </div>

          <div className="fund-now-field">
            <label>Metode Pembayaran</label>
            <PaymentGroup title="Virtual Account">
              <PaymentChip checked={paymentMethod === 'bca'} label="BCA" onChange={() => setPaymentMethod('bca')} />
              <PaymentChip checked={paymentMethod === 'mandiri'} label="Mandiri" onChange={() => setPaymentMethod('mandiri')} />
              <PaymentChip checked={paymentMethod === 'bni'} label="BNI" onChange={() => setPaymentMethod('bni')} />
              <PaymentChip checked={paymentMethod === 'bri'} label="BRI" onChange={() => setPaymentMethod('bri')} />
            </PaymentGroup>
            <PaymentGroup title="E-Wallet">
              <PaymentChip checked={paymentMethod === 'gopay'} label="GoPay" onChange={() => setPaymentMethod('gopay')} />
              <PaymentChip checked={paymentMethod === 'ovo'} label="OVO" onChange={() => setPaymentMethod('ovo')} />
              <PaymentChip checked={paymentMethod === 'dana'} label="Dana" onChange={() => setPaymentMethod('dana')} />
              <PaymentChip checked={paymentMethod === 'shopeepay'} label="ShopeePay" onChange={() => setPaymentMethod('shopeepay')} />
            </PaymentGroup>
            <PaymentGroup title="QRIS">
              <PaymentChip wide checked={paymentMethod === 'qris'} label="QRIS (Semua Pembayaran)" onChange={() => setPaymentMethod('qris')} />
            </PaymentGroup>
          </div>

          <div className="fund-now-summary">
            <div>
              <span>Kontribusi</span>
              <strong>{formatCurrency(Number(amount || 0))}</strong>
            </div>
            <div>
              <span>Biaya Layanan (0.5%)</span>
              <strong>{formatCurrency(serviceFee)}</strong>
            </div>
            <div className="total">
              <span>Total</span>
              <strong>{formatCurrency(total)}</strong>
            </div>
            <button type="button" onClick={handleConfirm} disabled={submitting}>
              Payment Confirmation
            </button>
            <p>
              <span className="material-symbols-outlined">info</span>
              Pembayaran akan dicatat dengan status pending untuk verifikasi.
            </p>
          </div>

          <div className="fund-now-trust">
            <span>DIPERCAYA OLEH</span>
            <div>
              <span className="material-symbols-outlined">verified_user</span>
              <span className="material-symbols-outlined">security</span>
              <span className="material-symbols-outlined">account_balance</span>
            </div>
          </div>
        </aside>
      </div>
    </main>
  )
}

function PaymentGroup({ children, title }) {
  return (
    <div className="fund-now-payment-group">
      <p>{title}</p>
      <div>{children}</div>
    </div>
  )
}

function PaymentChip({ checked, label, onChange, wide = false }) {
  return (
    <label className={`fund-now-payment-chip ${checked ? 'active' : ''} ${wide ? 'wide' : ''}`}>
      <span>{label}</span>
      <input type="radio" checked={checked} onChange={onChange} />
    </label>
  )
}

function TimeUnit({ label, value }) {
  return (
    <span className="payment-time-unit">
      <strong>{value}</strong>
      <small>{label}</small>
    </span>
  )
}

function PaymentDetail({ accent = false, label, value }) {
  return (
    <div className="payment-detail-item">
      <label>{label}</label>
      <p className={accent ? 'accent' : ''}>
        {value}
        <span className="material-symbols-outlined">content_copy</span>
      </p>
    </div>
  )
}

function PaymentBankRow({ label, value }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function PaymentSuccessModal({
  amount,
  businessName,
  error,
  onClose,
  onFundingHistory,
  onFundingList,
  serviceFee,
  success,
  total,
}) {
  if (error) {
    return (
      <div className="payment-success-backdrop" role="dialog" aria-modal="true">
        <section className="payment-success-modal error-state">
          <div className="payment-success-icon error">
            <span className="material-symbols-outlined">error</span>
          </div>
          <h2>Pembayaran Belum Terverifikasi</h2>
          <p>{error}</p>
          <div className="payment-success-actions single">
            <button type="button" onClick={onClose}>Tutup</button>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="payment-success-backdrop" role="dialog" aria-modal="true">
      <section className="payment-success-modal">
        <header>
          <div className="payment-success-icon">
            <span className="material-symbols-outlined">check_circle</span>
          </div>
          <h2>Pendanaan Tercatat</h2>
          <p>{success || 'Pendanaan berhasil dicatat dan menunggu proses verifikasi akhir.'}</p>
        </header>

        <div className="payment-success-summary">
          <PaymentSuccessRow label="Nama Kampanye" value={businessName} />
          <PaymentSuccessRow label="Jumlah" value={formatCurrency(amount)} />
          <PaymentSuccessRow label="Biaya Layanan" value={formatCurrency(serviceFee)} />
          <PaymentSuccessRow label="Total Pendanaan" value={formatCurrency(total)} strong />
        </div>

        <div className="payment-success-actions">
          <button type="button" onClick={onFundingHistory}>Lihat Pendanaan Saya</button>
          <button type="button" onClick={onFundingList}>Kembali ke Pendanaan</button>
        </div>
      </section>
    </div>
  )
}

function PaymentSuccessRow({ label, strong = false, value }) {
  return (
    <div className={strong ? 'total' : ''}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
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

function formatCompactAmount(value) {
  if (value >= 1000000) return `${value / 1000000}M`
  if (value >= 1000) return `${value / 1000}k`
  return String(value)
}

function getPaymentInfo(method) {
  const map = {
    bca: { shortName: 'BCA', name: 'Bank Central Asia (BCA)', accountNumber: '1234567890' },
    mandiri: { shortName: 'Mandiri', name: 'Bank Mandiri', accountNumber: '880812345678' },
    bni: { shortName: 'BNI', name: 'Bank Negara Indonesia (BNI)', accountNumber: '988012345678' },
    bri: { shortName: 'BRI', name: 'Bank Rakyat Indonesia (BRI)', accountNumber: '777012345678' },
    gopay: { shortName: 'GoPay', name: 'GoPay MicroFun Escrow', accountNumber: '081234567890' },
    ovo: { shortName: 'OVO', name: 'OVO MicroFun Escrow', accountNumber: '081234567890' },
    dana: { shortName: 'DANA', name: 'DANA MicroFun Escrow', accountNumber: '081234567890' },
    shopeepay: { shortName: 'ShopeePay', name: 'ShopeePay MicroFun Escrow', accountNumber: '081234567890' },
    qris: { shortName: 'QRIS', name: 'QRIS MicroFun Escrow', accountNumber: 'MF-QRIS-DEMO' },
  }

  return map[method] || map.bca
}

export default FundNowPage

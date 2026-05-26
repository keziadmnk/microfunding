import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { isAuthenticated } from '../services/authService'
import './UmkmFunderRequestPage.css'

function UmkmFunderRequestPage() {
  const navigate = useNavigate()
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [success, setSuccess] = useState('')

  const funder = useMemo(() => {
    try {
      return JSON.parse(sessionStorage.getItem('microfun_selected_ai_funder') || '{}')
    } catch {
      return {}
    }
  }, [])

  if (!isAuthenticated()) {
    navigate('/login', { replace: true })
    return null
  }

  const hasFunder = Boolean(funder?.name)

  function handleSubmit(event) {
    event.preventDefault()
    setSuccess(`Pengajuan pendanaan ke ${funder.name} berhasil dibuat dan menunggu tindak lanjut.`)
  }

  if (!hasFunder) {
    return (
      <main className="umkm-funder-request-state">
        <span className="material-symbols-outlined">account_balance</span>
        <p>Data funder belum dipilih.</p>
        <Link to="/dashboard/umkm">Kembali ke Dashboard UMKM</Link>
      </main>
    )
  }

  return (
    <div className="umkm-funder-request-page">
      <header className="umkm-funder-request-topbar">
        <Link to="/dashboard/umkm" className="umkm-funder-request-brand">MicroFun</Link>
        <nav>
          <Link to="/dashboard/umkm">Dashboard</Link>
          <Link to="/dashboard/umkm">AI Matching</Link>
        </nav>
      </header>

      <main className="umkm-funder-request-main">
        <section className="umkm-funder-profile-panel">
          <div className="umkm-funder-hero">
            <div className="umkm-funder-avatar">{getInitials(funder.name)}</div>
            <span>
              <span className="material-symbols-outlined">bolt</span>
              {funder.matchScore || 0}% Match
            </span>
          </div>
          <div className="umkm-funder-profile-body">
            <h1>{funder.name}</h1>
            <p className="umkm-funder-role">Rekomendasi Funder dari AI Matching</p>
            <div className="umkm-funder-insight">
              <strong>AI Insight</strong>
              <p>{funder.reason || 'Funder ini dinilai cocok dengan kebutuhan pendanaan UMKM Anda.'}</p>
            </div>
            <div className="umkm-funder-insight">
              <strong>Langkah Lanjut</strong>
              <p>{funder.nextStep || 'Kirim pengajuan pendanaan agar funder dapat meninjau profil UMKM Anda.'}</p>
            </div>
          </div>
        </section>

        <aside className="umkm-funder-form-panel">
          <header>
            <h2>Pengajuan Request Pendanaan</h2>
            <p>Lengkapi nominal dan pesan permohonan untuk funder.</p>
          </header>

          {success && (
            <div className="umkm-funder-alert">
              <span className="material-symbols-outlined">check_circle</span>
              <p>{success}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <label>
              Jumlah Pendanaan (Rupiah) *
              <input
                type="number"
                min="1000"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="Contoh: 10000000"
                required
              />
            </label>
            <label>
              Deskripsi/Permohonan (Opsional)
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Ceritakan kebutuhan pendanaan, rencana penggunaan dana, dan dampak yang ingin dicapai..."
              />
            </label>
            <button type="submit">
              Kirim Request Pendanaan
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </form>
        </aside>
      </main>
    </div>
  )
}

function getInitials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map((word) => word[0]).join('').toUpperCase() || 'FD'
}

export default UmkmFunderRequestPage

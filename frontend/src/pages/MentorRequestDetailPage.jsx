import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { getCurrentUser, isAuthenticated, logout } from '../services/authService'
import './MentorRequestDetailPage.css'

function MentorRequestDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [request, setRequest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login', { replace: true })
      return
    }

    async function loadDetail() {
      try {
        const currentUser = await getCurrentUser()
        if (currentUser.role !== 'mentor') {
          navigate('/dashboard', { replace: true })
          return
        }

        const token = localStorage.getItem('microfun_auth_token')
        const response = await fetch(`${apiBaseUrl}/api/mentor/requests/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const payload = await response.json()
        if (!response.ok) throw new Error(payload.message || 'Gagal memuat detail request mentoring.')

        setRequest(normalizeMentorRequest(payload.data, apiBaseUrl))
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

    loadDetail()
  }, [apiBaseUrl, id, navigate])

  const statusMeta = useMemo(() => getStatusMeta(request?.status), [request?.status])

  async function updateStatus(status) {
    const token = localStorage.getItem('microfun_auth_token')
    setSubmitting(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`${apiBaseUrl}/api/mentor/requests/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.message || 'Gagal mengubah status request.')

      setSuccess(payload.message || 'Status request berhasil diperbarui.')
      setRequest((current) => ({ ...current, status }))
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <main className="mentor-detail-state">
        <span className="material-symbols-outlined">hourglass_empty</span>
        <p>Memuat detail request mentoring...</p>
      </main>
    )
  }

  if (!request) {
    return (
      <main className="mentor-detail-state">
        <span className="material-symbols-outlined">error</span>
        <p>{error || 'Request mentoring tidak ditemukan.'}</p>
        <Link to="/dashboard/mentor">Kembali ke Dashboard Mentor</Link>
      </main>
    )
  }

  return (
    <div className="mentor-detail-page">
      <header className="mentor-detail-topbar">
        <Link to="/dashboard/mentor" className="mentor-detail-brand">MicroFun</Link>
        <nav>
          <Link to="/dashboard/mentor">Dashboard</Link>
          <Link to="/dashboard/mentor">Requests</Link>
          <Link to="/dashboard/mentor">Profile</Link>
        </nav>
      </header>

      <main className="mentor-detail-main">
        <section className="mentor-detail-content">
          <div className="mentor-detail-hero">
            {request.business.image ? (
              <img src={request.business.image} alt={request.business.name} />
            ) : (
              <div className="mentor-detail-hero-fallback" />
            )}
            <div>
              <div className="mentor-detail-profile-row">
                <div className="mentor-detail-avatar">
                  {request.business.image ? (
                    <img src={request.business.image} alt={`${request.business.name} logo`} />
                  ) : (
                    <span>{getInitials(request.business.name)}</span>
                  )}
                </div>
                <div>
                  <h1>{request.business.name}</h1>
                  <p>{request.business.category} - {request.business.location || 'Lokasi belum diisi'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mentor-detail-stats">
            <StatCard label="Pemilik UMKM" value={request.requester.name || '-'} />
            <StatCard label="Target Pendanaan" value={formatCurrency(request.business.fundingTarget)} />
            <StatCard label="Status Request" value={statusMeta.label} accent />
          </div>

          <section className="mentor-detail-business">
            <h2>
              <span className="material-symbols-outlined">storefront</span>
              Informasi UMKM
            </h2>
            <div className="mentor-detail-info-grid">
              <InfoCard title="Deskripsi Usaha" value={request.business.description || 'Deskripsi usaha belum diisi.'} />
              <InfoCard title="Tujuan Bisnis" value={request.business.businessGoals || 'Tujuan bisnis belum diisi.'} />
              <InfoCard title="Kebutuhan Pendanaan" value={request.business.fundingPurpose || 'Kebutuhan pendanaan belum diisi.'} />
              <InfoCard title="Skala Usaha" value={`${request.business.employeeCount || 0} karyawan, omzet ${request.business.monthlyRevenue || 'belum diisi'}`} />
            </div>
          </section>
        </section>

        <aside className="mentor-detail-request">
          <header>
            <span className={`mentor-detail-status ${statusMeta.className}`}>{statusMeta.label}</span>
            <h2>Detail Pengajuan</h2>
            <p>Request mentoring dari {request.requester.name || request.business.name}</p>
          </header>

          {error && <p className="mentor-detail-alert error">{error}</p>}
          {success && <p className="mentor-detail-alert success">{success}</p>}

          <div className="mentor-detail-field">
            <span>Topik Mentoring</span>
            <strong>{request.topic}</strong>
          </div>
          <div className="mentor-detail-field">
            <span>Masalah Bisnis</span>
            <p>{request.businessProblem || 'Belum ada masalah bisnis yang dituliskan.'}</p>
          </div>
          <div className="mentor-detail-field">
            <span>Tujuan Mentoring</span>
            <p>{request.mentoringGoal || 'Belum ada tujuan mentoring yang dituliskan.'}</p>
          </div>
          <div className="mentor-detail-field">
            <span>Preferensi Jadwal</span>
            <strong>{formatDateTime(request.scheduledAt)}</strong>
          </div>
          <div className="mentor-detail-field">
            <span>Pesan Tambahan</span>
            <p>{request.additionalMessage || 'Tidak ada pesan tambahan.'}</p>
          </div>

          <div className="mentor-detail-summary">
            <div>
              <span>Email UMKM</span>
              <strong>{request.requester.email || '-'}</strong>
            </div>
            <div>
              <span>Dikirim</span>
              <strong>{formatDate(request.createdAt)}</strong>
            </div>
          </div>

          {request.status === 'pending' ? (
            <div className="mentor-detail-actions">
              <button type="button" className="accept" disabled={submitting} onClick={() => updateStatus('accepted')}>
                {submitting ? 'Memproses...' : 'Accept Request'}
                <span className="material-symbols-outlined">check</span>
              </button>
              <button type="button" className="decline" disabled={submitting} onClick={() => updateStatus('rejected')}>
                Decline
              </button>
            </div>
          ) : (
            <p className="mentor-detail-note">Request ini sudah berstatus {statusMeta.label}.</p>
          )}
        </aside>
      </main>
    </div>
  )
}

function StatCard({ accent = false, label, value }) {
  return (
    <article className={`mentor-detail-stat ${accent ? 'accent' : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  )
}

function InfoCard({ title, value }) {
  return (
    <article>
      <strong>{title}</strong>
      <p>{value}</p>
    </article>
  )
}

function normalizeMentorRequest(data, apiBaseUrl) {
  const business = data.business || {}
  const logo = business.logo || ''
  const image = logo
    ? logo.startsWith('http') || logo.startsWith('data:image/')
      ? logo
      : `${apiBaseUrl}${logo.startsWith('/') ? '' : '/'}${logo}`
    : ''

  return {
    ...data,
    business: {
      ...business,
      name: business.name || 'UMKM',
      image,
    },
    requester: data.requester || {},
  }
}

function getStatusMeta(status = 'pending') {
  if (status === 'accepted') return { className: 'accepted', label: 'Accepted' }
  if (status === 'completed') return { className: 'completed', label: 'Completed' }
  if (status === 'rejected') return { className: 'rejected', label: 'Declined' }
  return { className: 'pending', label: 'Pending' }
}

function getInitials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map((word) => word[0]).join('').toUpperCase() || 'UM'
}

function formatDateTime(value) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function formatDate(value) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(value))
}

function formatCurrency(value) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
}

export default MentorRequestDetailPage

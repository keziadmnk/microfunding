import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCurrentUser, getStoredUser, isAuthenticated, logout } from '../services/authService'
import DashboardSidebar from '../components/dashboard/DashboardSidebar'
import './AdminDashboardPage.css'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'

const adminNavItems = [
  { label: 'Dashboard', icon: 'dashboard' },
  { label: 'Verifikasi UMKM', icon: 'storefront' },
  { label: 'Verifikasi Mentor', icon: 'school' },
  { label: 'Daftar Funder', icon: 'account_balance' },
]

const roleDashboardMap = {
  umkm_owner: '/dashboard/umkm',
  funder: '/dashboard/funder',
  mentor: '/dashboard/mentor',
  admin: '/dashboard/admin',
}

/* ─── Helpers ─────────────────────────────────── */
function getToken() { return localStorage.getItem('microfun_auth_token') }

function getInitials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('')
}

function formatCurrency(val) {
  const num = Number(val)
  if (!num) return '-'
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num)
}

function formatDate(val) {
  if (!val) return '-'
  return new Date(val).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

function parseLegal(raw) {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  try { return JSON.parse(raw) } catch { return [] }
}

function buildPhotoUrl(photo) {
  if (!photo) return null
  if (photo.startsWith('http')) return photo
  if (photo.startsWith('/uploads')) return `${API_BASE}${photo}`
  return null
}

function getUmkmStatus(verified) {
  const v = Number(verified)
  if (v === 1) return 'approved'
  if (v === 2) return 'declined'
  return 'pending'
}

function getMentorStatus(verified) {
  const v = Number(verified)
  if (v === 1) return 'approved'
  if (v === 2) return 'declined'
  return 'pending'
}

const STATUS_LABEL = { pending: 'Menunggu', approved: 'Terverifikasi', declined: 'Ditolak' }

/* ─── Filter Tabs ──────────────────────────────── */
const UMKM_FILTERS = [
  { key: 'all',      label: 'Semua',               icon: 'grid_view'       },
  { key: 'pending',  label: 'Menunggu Verifikasi',  icon: 'pending_actions' },
  { key: 'approved', label: 'Terverifikasi',         icon: 'verified'        },
  { key: 'declined', label: 'Ditolak',               icon: 'cancel'          },
]

const MENTOR_FILTERS = [
  { key: 'all',      label: 'Semua',               icon: 'grid_view'       },
  { key: 'pending',  label: 'Menunggu Verifikasi',  icon: 'pending_actions' },
  { key: 'approved', label: 'Terverifikasi',         icon: 'verified'        },
  { key: 'declined', label: 'Ditolak',               icon: 'cancel'          },
]

/* ─── Main Page ────────────────────────────────── */
function AdminDashboardPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(getStoredUser())
  const [activeTab, setActiveTab] = useState('Dashboard')

  // UMKM
  const [allUmkms, setAllUmkms] = useState([])
  const [umkmLoading, setUmkmLoading] = useState(false)
  const [umkmError, setUmkmError] = useState('')
  const [umkmFilter, setUmkmFilter] = useState('pending')

  // Mentor
  const [allMentors, setAllMentors] = useState([])
  const [mentorLoading, setMentorLoading] = useState(false)
  const [mentorError, setMentorError] = useState('')
  const [mentorFilter, setMentorFilter] = useState('pending')

  // Funder
  const [allFunders, setAllFunders] = useState([])
  const [funderLoading, setFunderLoading] = useState(false)
  const [funderError, setFunderError] = useState('')

  // Detail modal
  const [detailItem, setDetailItem] = useState(null)
  const [detailType, setDetailType] = useState(null) // 'umkm' | 'mentor'
  const [modalOpen, setModalOpen] = useState(false)

  // Action
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState('')
  const [actionSuccess, setActionSuccess] = useState('')

  // Decline dialog
  const [declineTarget, setDeclineTarget] = useState(null)
  const [declineType, setDeclineType] = useState(null)
  const [declineNotes, setDeclineNotes] = useState('')
  const [declineError, setDeclineError] = useState('')

  const fetchAllUmkms = useCallback(async () => {
    setUmkmLoading(true); setUmkmError('')
    try {
      const res = await fetch(`${API_BASE}/api/admin/umkms`, { headers: { Authorization: `Bearer ${getToken()}` } })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.message || 'Gagal memuat UMKM.')
      setAllUmkms(payload.data || [])
    } catch (err) { setUmkmError(err.message); setAllUmkms([]) }
    finally { setUmkmLoading(false) }
  }, [])

  const fetchAllMentors = useCallback(async () => {
    setMentorLoading(true); setMentorError('')
    try {
      const res = await fetch(`${API_BASE}/api/admin/mentors`, { headers: { Authorization: `Bearer ${getToken()}` } })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.message || 'Gagal memuat mentor.')
      setAllMentors(payload.data || [])
    } catch (err) { setMentorError(err.message); setAllMentors([]) }
    finally { setMentorLoading(false) }
  }, [])

  const fetchAllFunders = useCallback(async () => {
    setFunderLoading(true); setFunderError('')
    try {
      const res = await fetch(`${API_BASE}/api/admin/funders`, { headers: { Authorization: `Bearer ${getToken()}` } })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.message || 'Gagal memuat funder.')
      setAllFunders(payload.data || [])
    } catch (err) { setFunderError(err.message); setAllFunders([]) }
    finally { setFunderLoading(false) }
  }, [])

  useEffect(() => {
    if (!isAuthenticated()) { navigate('/login', { replace: true }); return }
    getCurrentUser()
      .then((profile) => {
        if (profile.role !== 'admin') { navigate(roleDashboardMap[profile.role] || '/login', { replace: true }); return }
        setUser(profile)
        fetchAllUmkms()
        fetchAllMentors()
        fetchAllFunders()
      })
      .catch(() => { logout(); navigate('/login', { replace: true }) })
      .finally(() => setLoading(false))
  }, [fetchAllUmkms, fetchAllMentors, fetchAllFunders, navigate])

  const displayName = useMemo(() => user?.name || 'Administrator', [user])

  const umkmStats = useMemo(() => ({
    total: allUmkms.length,
    pending: allUmkms.filter((u) => getUmkmStatus(u.businessVerified) === 'pending').length,
    approved: allUmkms.filter((u) => getUmkmStatus(u.businessVerified) === 'approved').length,
    declined: allUmkms.filter((u) => getUmkmStatus(u.businessVerified) === 'declined').length,
  }), [allUmkms])

  const mentorStats = useMemo(() => ({
    total: allMentors.length,
    pending: allMentors.filter((m) => getMentorStatus(m.mentorVerified) === 'pending').length,
    approved: allMentors.filter((m) => getMentorStatus(m.mentorVerified) === 'approved').length,
    declined: allMentors.filter((m) => getMentorStatus(m.mentorVerified) === 'declined').length,
  }), [allMentors])

  const filteredUmkms = useMemo(() =>
    umkmFilter === 'all' ? allUmkms : allUmkms.filter((u) => getUmkmStatus(u.businessVerified) === umkmFilter),
    [allUmkms, umkmFilter])

  const filteredMentors = useMemo(() =>
    mentorFilter === 'all' ? allMentors : allMentors.filter((m) => getMentorStatus(m.mentorVerified) === mentorFilter),
    [allMentors, mentorFilter])

  function handleLogout() { logout(); navigate('/login', { replace: true }) }

  function openDetail(item, type) {
    setDetailItem(item); setDetailType(type)
    setActionError(''); setActionSuccess('')
    setModalOpen(true)
  }
  function closeModal() { setModalOpen(false); setDetailItem(null); setDetailType(null); setActionError(''); setActionSuccess('') }

  function openDecline(item, type) {
    closeModal()
    setDeclineTarget(item); setDeclineType(type)
    setDeclineNotes(''); setDeclineError('')
  }
  function closeDecline() { setDeclineTarget(null); setDeclineType(null); setDeclineNotes(''); setDeclineError('') }

  async function handleApprove(id, type) {
    setActionLoading(true); setActionError(''); setActionSuccess('')
    try {
      const url = type === 'umkm' ? `/api/admin/umkms/${id}/approve` : `/api/admin/mentors/${id}/approve`
      const res = await fetch(`${API_BASE}${url}`, { method: 'PUT', headers: { Authorization: `Bearer ${getToken()}` } })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.message || 'Gagal menyetujui.')
      setActionSuccess(type === 'umkm' ? 'UMKM berhasil disetujui!' : 'Mentor berhasil disetujui!')
      if (type === 'umkm') setAllUmkms((prev) => prev.map((u) => u.businessId === id ? { ...u, businessVerified: 1 } : u))
      else setAllMentors((prev) => prev.map((m) => m.mentorId === id ? { ...m, mentorVerified: 1 } : m))
      setTimeout(closeModal, 1400)
    } catch (err) { setActionError(err.message) }
    finally { setActionLoading(false) }
  }

  async function handleDeclineConfirm() {
    if (!declineTarget || !declineType) return
    setActionLoading(true); setDeclineError('')
    try {
      const id = declineType === 'umkm' ? declineTarget.businessId : declineTarget.mentorId
      const url = declineType === 'umkm' ? `/api/admin/umkms/${id}/decline` : `/api/admin/mentors/${id}/decline`
      const res = await fetch(`${API_BASE}${url}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ notes: declineNotes || null }),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.message || 'Gagal menolak.')
      if (declineType === 'umkm') setAllUmkms((prev) => prev.map((u) => u.businessId === id ? { ...u, businessVerified: 2 } : u))
      else setAllMentors((prev) => prev.map((m) => m.mentorId === id ? { ...m, mentorVerified: 2 } : m))
      closeDecline()
    } catch (err) { setDeclineError(err.message) }
    finally { setActionLoading(false) }
  }

  const getPageTitle = () => {
    if (activeTab === 'Dashboard') return `Selamat datang, ${displayName}`
    if (activeTab === 'Verifikasi UMKM') return 'Verifikasi UMKM'
    if (activeTab === 'Verifikasi Mentor') return 'Verifikasi Mentor'
    return 'Daftar Funder'
  }

  if (loading) return (
    <main className="admin-loading">
      <span className="material-symbols-outlined admin-spinner">hourglass_empty</span>
      <p>Memuat dashboard admin...</p>
    </main>
  )

  return (
    <div className="admin-shell">
      <DashboardSidebar
        onLogout={handleLogout}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        navItems={adminNavItems}
        brandSubtitle="Admin Panel"
        ctaLabel="Kelola Platform"
      />

      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <h2>{getPageTitle()}</h2>
            <p>
              {activeTab === 'Dashboard' && 'Kelola seluruh ekosistem platform MicroFun.'}
              {activeTab === 'Verifikasi UMKM' && 'Tinjau dan verifikasi UMKM yang mendaftar.'}
              {activeTab === 'Verifikasi Mentor' && 'Tinjau dan verifikasi mentor yang mendaftar.'}
              {activeTab === 'Daftar Funder' && 'Daftar seluruh funder yang terdaftar di platform.'}
            </p>
          </div>
          <div className="admin-user-chip">
            <div>
              <strong>{displayName}</strong>
              <span>Administrator</span>
            </div>
            <div className="admin-avatar">
              <span className="material-symbols-outlined">admin_panel_settings</span>
            </div>
          </div>
        </header>

        {activeTab === 'Dashboard' && (
          <DashboardOverview
            umkmStats={umkmStats}
            mentorStats={mentorStats}
            funderTotal={allFunders.length}
            loading={umkmLoading || mentorLoading}
            onNavigate={setActiveTab}
          />
        )}
        {activeTab === 'Verifikasi UMKM' && (
          <VerifyUmkmView
            allUmkms={allUmkms}
            filtered={filteredUmkms}
            filterKey={umkmFilter}
            onFilter={setUmkmFilter}
            stats={umkmStats}
            loading={umkmLoading}
            error={umkmError}
            onRefresh={fetchAllUmkms}
            onDetail={(u) => openDetail(u, 'umkm')}
            onDecline={(u) => openDecline(u, 'umkm')}
          />
        )}
        {activeTab === 'Verifikasi Mentor' && (
          <VerifyMentorView
            allMentors={allMentors}
            filtered={filteredMentors}
            filterKey={mentorFilter}
            onFilter={setMentorFilter}
            stats={mentorStats}
            loading={mentorLoading}
            error={mentorError}
            onRefresh={fetchAllMentors}
            onDetail={(m) => openDetail(m, 'mentor')}
            onDecline={(m) => openDecline(m, 'mentor')}
          />
        )}
        {activeTab === 'Daftar Funder' && (
          <FunderListView
            funders={allFunders}
            loading={funderLoading}
            error={funderError}
            onRefresh={fetchAllFunders}
          />
        )}

        <footer className="admin-footer">
          <p>© 2024 MicroFun. Impacting Indonesian MSMEs through Global Connection.</p>
        </footer>
      </main>

      {/* Detail Modal */}
      {modalOpen && detailItem && (
        <DetailModal
          item={detailItem}
          type={detailType}
          onClose={closeModal}
          onApprove={handleApprove}
          onDecline={openDecline}
          actionLoading={actionLoading}
          actionError={actionError}
          actionSuccess={actionSuccess}
        />
      )}

      {/* Decline Dialog */}
      {declineTarget && (
        <DeclineDialog
          item={declineTarget}
          type={declineType}
          notes={declineNotes}
          onNotesChange={setDeclineNotes}
          onCancel={closeDecline}
          onConfirm={handleDeclineConfirm}
          loading={actionLoading}
          error={declineError}
        />
      )}
    </div>
  )
}

/* ─── Dashboard Overview ───────────────────────── */
function DashboardOverview({ umkmStats, mentorStats, funderTotal, loading, onNavigate }) {
  return (
    <div className="admin-overview">
      <div className="admin-stats-grid">
        <StatCard icon="storefront"       label="Total UMKM"   value={loading ? '…' : umkmStats.total}   sub={`${umkmStats.pending} pending`}   color="var(--brand-dark)" soft="#e8edf0" border="#b0c4cd" onClick={() => onNavigate('Verifikasi UMKM')} />
        <StatCard icon="pending_actions"  label="UMKM Pending" value={loading ? '…' : umkmStats.pending}  sub="Menunggu review"                  color="#b45309"          soft="#fff8e1" border="#fcd34d" onClick={() => onNavigate('Verifikasi UMKM')} />
        <StatCard icon="school"           label="Total Mentor"  value={loading ? '…' : mentorStats.total}  sub={`${mentorStats.pending} pending`} color="var(--brand-dark)" soft="#e8edf0" border="#b0c4cd" onClick={() => onNavigate('Verifikasi Mentor')} />
        <StatCard icon="account_balance"  label="Total Funder"  value={loading ? '…' : funderTotal}        sub="Terdaftar"                        color="#1a6b4a"          soft="#e8f5ef" border="#a8d5be" onClick={() => onNavigate('Daftar Funder')} />
      </div>

      <div className="admin-quick-grid">
        <QuickCard icon="storefront" title="Verifikasi UMKM" count={umkmStats.pending} label="UMKM menunggu" onClick={() => onNavigate('Verifikasi UMKM')} />
        <QuickCard icon="school"     title="Verifikasi Mentor" count={mentorStats.pending} label="Mentor menunggu" onClick={() => onNavigate('Verifikasi Mentor')} />
        <QuickCard icon="account_balance" title="Daftar Funder" count={funderTotal} label="Funder terdaftar" onClick={() => onNavigate('Daftar Funder')} />
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, sub, color, soft, border, onClick }) {
  return (
    <div className="admin-stat-card" style={{ '--sc': color, '--ss': soft, '--sb': border }} onClick={onClick} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onClick?.()}>
      <div className="admin-stat-icon"><span className="material-symbols-outlined">{icon}</span></div>
      <div>
        <span className="admin-stat-value">{value}</span>
        <span className="admin-stat-label">{label}</span>
        {sub && <span className="admin-stat-sub">{sub}</span>}
      </div>
    </div>
  )
}

function QuickCard({ icon, title, count, label, onClick }) {
  return (
    <button type="button" className="admin-quick-card" onClick={onClick}>
      <div className="admin-quick-icon"><span className="material-symbols-outlined">{icon}</span></div>
      <div className="admin-quick-copy">
        <h3>{title}</h3>
        <p><strong>{count}</strong> {label}</p>
      </div>
      <span className="material-symbols-outlined admin-quick-arrow">arrow_forward</span>
    </button>
  )
}

/* ─── Filter Bar ───────────────────────────────── */
function FilterBar({ filters, activeKey, stats, loading, onFilter, onRefresh }) {
  const countFor = (key) => {
    if (key === 'all') return stats.total
    return stats[key] ?? 0
  }
  return (
    <div className="admin-filter-bar">
      <div className="admin-filter-tabs">
        {filters.map((f) => (
          <button key={f.key} type="button" className={`admin-filter-tab${activeKey === f.key ? ' active' : ''}`} onClick={() => onFilter(f.key)}>
            <span className="material-symbols-outlined">{f.icon}</span>
            {f.label}
            <span className="admin-tab-count">{loading ? '…' : countFor(f.key)}</span>
          </button>
        ))}
      </div>
      <button type="button" className="admin-refresh-btn" onClick={onRefresh}>
        <span className="material-symbols-outlined">refresh</span>
        Refresh
      </button>
    </div>
  )
}

/* ─── Status Badge ─────────────────────────────── */
function StatusBadge({ status }) {
  return (
    <span className={`admin-status-badge ${status}`}>
      <i />{STATUS_LABEL[status] || status}
    </span>
  )
}

/* ─── Verify UMKM View ─────────────────────────── */
function VerifyUmkmView({ filtered, filterKey, onFilter, stats, loading, error, onRefresh, onDetail, onDecline }) {
  return (
    <section className="admin-verify-section">
      <FilterBar filters={UMKM_FILTERS} activeKey={filterKey} stats={stats} loading={loading} onFilter={onFilter} onRefresh={onRefresh} />
      {error && <div className="admin-error-banner"><span className="material-symbols-outlined">error</span>{error}</div>}
      {loading ? (
        <div className="admin-data-state"><span className="material-symbols-outlined admin-spinner-small">hourglass_empty</span><p>Memuat data...</p></div>
      ) : filtered.length === 0 ? (
        <div className="admin-data-state empty">
          <span className="material-symbols-outlined">inbox</span>
          <h3>Tidak ada data</h3>
          <p>Tidak ada UMKM untuk filter ini.</p>
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Nama Bisnis</th>
                <th>Pemilik</th>
                <th>Kategori</th>
                <th>Lokasi</th>
                <th>Tgl. Daftar</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => {
                const status = getUmkmStatus(u.businessVerified)
                const isPending = status === 'pending'
                return (
                  <tr key={u.businessId}>
                    <td className="admin-td-num">{i + 1}</td>
                    <td>
                      <div className="admin-td-name">
                        <AvatarCell name={u.businessName} photo={null} />
                        <span>{u.businessName}</span>
                      </div>
                    </td>
                    <td>
                      <div className="admin-td-owner">
                        <span>{u.ownerName}</span>
                        <small>{u.email}</small>
                      </div>
                    </td>
                    <td><span className="admin-td-cat">{u.category || '-'}</span></td>
                    <td>{u.location || '-'}</td>
                    <td className="admin-td-date">{formatDate(u.registeredAt)}</td>
                    <td><StatusBadge status={status} /></td>
                    <td>
                      <div className="admin-td-actions">
                        <button type="button" className="admin-btn-detail" onClick={() => onDetail(u)}>
                          <span className="material-symbols-outlined">visibility</span>Detail
                        </button>
                        {isPending && (
                          <button type="button" className="admin-btn-decline" onClick={() => onDecline(u)}>
                            <span className="material-symbols-outlined">cancel</span>Tolak
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

/* ─── Verify Mentor View ───────────────────────── */
function VerifyMentorView({ filtered, filterKey, onFilter, stats, loading, error, onRefresh, onDetail, onDecline }) {
  return (
    <section className="admin-verify-section">
      <FilterBar filters={MENTOR_FILTERS} activeKey={filterKey} stats={stats} loading={loading} onFilter={onFilter} onRefresh={onRefresh} />
      {error && <div className="admin-error-banner"><span className="material-symbols-outlined">error</span>{error}</div>}
      {loading ? (
        <div className="admin-data-state"><span className="material-symbols-outlined admin-spinner-small">hourglass_empty</span><p>Memuat data...</p></div>
      ) : filtered.length === 0 ? (
        <div className="admin-data-state empty">
          <span className="material-symbols-outlined">inbox</span>
          <h3>Tidak ada data</h3>
          <p>Tidak ada mentor untuk filter ini.</p>
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Nama Mentor</th>
                <th>Email</th>
                <th>Pekerjaan / Keahlian</th>
                <th>Lokasi</th>
                <th>Tgl. Daftar</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m, i) => {
                const status = getMentorStatus(m.mentorVerified)
                const isPending = status === 'pending'
                return (
                  <tr key={m.mentorId}>
                    <td className="admin-td-num">{i + 1}</td>
                    <td>
                      <div className="admin-td-name">
                        <AvatarCell name={m.name} photo={buildPhotoUrl(m.profile_photo)} />
                        <span>{m.name}</span>
                      </div>
                    </td>
                    <td className="admin-td-email">{m.email}</td>
                    <td>
                      <div className="admin-td-owner">
                        <span>{m.current_job || '-'}</span>
                        {m.skills && <small>{m.skills}</small>}
                      </div>
                    </td>
                    <td>{m.location || '-'}</td>
                    <td className="admin-td-date">{formatDate(m.registeredAt)}</td>
                    <td><StatusBadge status={status} /></td>
                    <td>
                      <div className="admin-td-actions">
                        <button type="button" className="admin-btn-detail" onClick={() => onDetail(m)}>
                          <span className="material-symbols-outlined">visibility</span>Detail
                        </button>
                        {isPending && (
                          <button type="button" className="admin-btn-decline" onClick={() => onDecline(m)}>
                            <span className="material-symbols-outlined">cancel</span>Tolak
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

/* ─── Funder List View ─────────────────────────── */
function FunderListView({ funders, loading, error, onRefresh }) {
  return (
    <section className="admin-verify-section">
      <div className="admin-filter-bar">
        <div className="admin-filter-tabs">
          <span className="admin-table-info">
            <span className="material-symbols-outlined">account_balance</span>
            <strong>{funders.length}</strong> funder terdaftar
          </span>
        </div>
        <button type="button" className="admin-refresh-btn" onClick={onRefresh}>
          <span className="material-symbols-outlined">refresh</span>Refresh
        </button>
      </div>

      {error && <div className="admin-error-banner"><span className="material-symbols-outlined">error</span>{error}</div>}

      {loading ? (
        <div className="admin-data-state"><span className="material-symbols-outlined admin-spinner-small">hourglass_empty</span><p>Memuat data...</p></div>
      ) : funders.length === 0 ? (
        <div className="admin-data-state empty">
          <span className="material-symbols-outlined">account_balance</span>
          <h3>Belum Ada Funder</h3>
          <p>Belum ada funder yang terdaftar di platform.</p>
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Nama</th>
                <th>Organisasi</th>
                <th>Email</th>
                <th>Lokasi</th>
                <th>Min. Pendanaan</th>
                <th>Max. Pendanaan</th>
                <th>Tgl. Daftar</th>
              </tr>
            </thead>
            <tbody>
              {funders.map((f, i) => (
                <tr key={f.funderId}>
                  <td className="admin-td-num">{i + 1}</td>
                  <td>
                    <div className="admin-td-name">
                      <AvatarCell name={f.name} photo={buildPhotoUrl(f.profile_photo)} />
                      <span>{f.name}</span>
                    </div>
                  </td>
                  <td>{f.organization_name || '-'}</td>
                  <td className="admin-td-email">{f.email}</td>
                  <td>{f.location || '-'}</td>
                  <td>{formatCurrency(f.funding_min)}</td>
                  <td>{formatCurrency(f.funding_max)}</td>
                  <td className="admin-td-date">{formatDate(f.registeredAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

/* ─── Avatar Cell ──────────────────────────────── */
function AvatarCell({ name, photo }) {
  const url = photo
  return (
    <div className="admin-avatar-cell">
      {url ? <img src={url} alt={name} /> : <span>{getInitials(name)}</span>}
    </div>
  )
}

/* ─── Detail Modal ─────────────────────────────── */
function DetailModal({ item, type, onClose, onApprove, onDecline, actionLoading, actionError, actionSuccess }) {
  const isUmkm = type === 'umkm'
  const id = isUmkm ? item.businessId : item.mentorId
  const statusKey = isUmkm ? getUmkmStatus(item.businessVerified) : getMentorStatus(item.mentorVerified)
  const isPending = statusKey === 'pending'
  const legalDocs = isUmkm ? parseLegal(item.legal_documents) : []
  const skills = !isUmkm && item.skills ? item.skills.split(',').map((s) => s.trim()).filter(Boolean) : []

  return (
    <div className="admin-modal-overlay" role="dialog" aria-modal="true">
      <div className="admin-modal">
        <header className="admin-modal-header">
          <div className="admin-modal-title">
            <div className="admin-modal-avatar">
              <span className="material-symbols-outlined">{isUmkm ? 'storefront' : 'school'}</span>
            </div>
            <div>
              <h2>{isUmkm ? item.businessName : item.name}</h2>
              <span className="admin-modal-sub">{isUmkm ? (item.category || 'UMKM') : (item.current_job || 'Mentor')}</span>
              <StatusBadge status={statusKey} />
            </div>
          </div>
          <button type="button" className="admin-modal-close" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>

        <div className="admin-modal-body">
          {isUmkm ? (
            <>
              <ModalSection title="Informasi Bisnis" icon="storefront">
                <div className="admin-detail-grid">
                  <DetailItem label="Nama Bisnis" value={item.businessName} />
                  <DetailItem label="Kategori" value={item.category || '-'} />
                  <DetailItem label="Lokasi" value={item.location || '-'} />
                  <DetailItem label="Tahun Berdiri" value={item.year_established || '-'} />
                  <DetailItem label="Jumlah Karyawan" value={item.employee_count ? `${item.employee_count} orang` : '-'} />
                  <DetailItem label="Omzet Bulanan" value={item.monthly_revenue || '-'} />
                  <DetailItem label="Target Pendanaan" value={formatCurrency(item.funding_target)} />
                  <DetailItem label="Tgl. Daftar" value={formatDate(item.registeredAt)} />
                </div>
                {item.description && <div className="admin-detail-full"><span className="admin-detail-label">Deskripsi</span><p>{item.description}</p></div>}
                {item.funding_purpose && <div className="admin-detail-full"><span className="admin-detail-label">Tujuan Pendanaan</span><p>{item.funding_purpose}</p></div>}
                {item.business_goals && <div className="admin-detail-full"><span className="admin-detail-label">Target Bisnis</span><p>{item.business_goals}</p></div>}
              </ModalSection>
              <ModalSection title="Informasi Pemilik" icon="person">
                <div className="admin-detail-grid">
                  <DetailItem label="Nama" value={item.ownerName || '-'} />
                  <DetailItem label="Email" value={item.email || '-'} />
                  <DetailItem label="Nomor HP" value={item.phone || '-'} />
                  <DetailItem label="Alamat" value={item.address || '-'} />
                  <DetailItem label="NIK" value={item.nik || '-'} />
                  <DetailItem label="NPWP" value={item.npwp || '-'} />
                </div>
              </ModalSection>
              <ModalSection title="Dokumen Legal" icon="description">
                {legalDocs.length > 0 ? (
                  <ul className="admin-legal-list">
                    {legalDocs.map((d, i) => <li key={i}><span className="material-symbols-outlined">article</span>{typeof d === 'string' ? d : (d.name || JSON.stringify(d))}</li>)}
                  </ul>
                ) : <p className="admin-empty-note">Tidak ada dokumen legal yang diunggah.</p>}
              </ModalSection>
            </>
          ) : (
            <>
              <ModalSection title="Informasi Mentor" icon="school">
                <div className="admin-detail-grid">
                  <DetailItem label="Nama" value={item.name || '-'} />
                  <DetailItem label="Email" value={item.email || '-'} />
                  <DetailItem label="Nomor HP" value={item.phone || '-'} />
                  <DetailItem label="Pekerjaan" value={item.current_job || '-'} />
                  <DetailItem label="Lokasi" value={item.location || '-'} />
                  <DetailItem label="Tgl. Daftar" value={formatDate(item.registeredAt)} />
                </div>
                {skills.length > 0 && (
                  <div className="admin-detail-full">
                    <span className="admin-detail-label">Keahlian</span>
                    <div className="admin-skill-chips">
                      {skills.map((s) => <span key={s} className="admin-skill-chip">{s}</span>)}
                    </div>
                  </div>
                )}
                {item.about && <div className="admin-detail-full"><span className="admin-detail-label">Tentang</span><p>{item.about}</p></div>}
                {item.achievements && <div className="admin-detail-full"><span className="admin-detail-label">Prestasi</span><p>{item.achievements}</p></div>}
                {item.experience && <div className="admin-detail-full"><span className="admin-detail-label">Pengalaman</span><p>{item.experience}</p></div>}
              </ModalSection>
            </>
          )}
        </div>

        {actionError && <div className="admin-action-msg error"><span className="material-symbols-outlined">error</span>{actionError}</div>}
        {actionSuccess && <div className="admin-action-msg success"><span className="material-symbols-outlined">check_circle</span>{actionSuccess}</div>}

        {!actionSuccess && isPending && (
          <footer className="admin-modal-footer">
            <button type="button" className="admin-modal-decline-btn" onClick={() => onDecline(item, type)} disabled={actionLoading}>
              <span className="material-symbols-outlined">cancel</span>Tolak
            </button>
            <button type="button" className="admin-modal-approve-btn" onClick={() => onApprove(id, type)} disabled={actionLoading}>
              <span className="material-symbols-outlined">{actionLoading ? 'hourglass_empty' : 'verified'}</span>
              {actionLoading ? 'Memproses...' : 'Setujui'}
            </button>
          </footer>
        )}
      </div>
    </div>
  )
}

function ModalSection({ title, icon, children }) {
  return (
    <section className="admin-modal-section">
      <h3><span className="material-symbols-outlined">{icon}</span>{title}</h3>
      {children}
    </section>
  )
}

function DetailItem({ label, value }) {
  return (
    <div className="admin-detail-item">
      <span className="admin-detail-label">{label}</span>
      <span className="admin-detail-value">{value}</span>
    </div>
  )
}

/* ─── Decline Dialog ───────────────────────────── */
function DeclineDialog({ item, type, notes, onNotesChange, onCancel, onConfirm, loading, error }) {
  const name = type === 'umkm' ? item?.businessName : item?.name
  return (
    <div className="admin-modal-overlay" role="dialog" aria-modal="true">
      <div className="admin-dialog">
        <div className="admin-dialog-icon"><span className="material-symbols-outlined">warning</span></div>
        <h3>Tolak {type === 'umkm' ? 'UMKM' : 'Mentor'}</h3>
        <p>Anda akan menolak <strong>{name}</strong>. Tindakan ini tidak dapat dibatalkan.</p>
        <div className="admin-dialog-field">
          <label htmlFor="decline-notes">Alasan penolakan (opsional)</label>
          <textarea id="decline-notes" rows={3} placeholder="Contoh: Profil tidak lengkap, informasi tidak valid..." value={notes} onChange={(e) => onNotesChange(e.target.value)} />
        </div>
        {error && <div className="admin-action-msg error"><span className="material-symbols-outlined">error</span>{error}</div>}
        <div className="admin-dialog-actions">
          <button type="button" className="admin-dialog-cancel" onClick={onCancel} disabled={loading}>Batal</button>
          <button type="button" className="admin-dialog-confirm" onClick={onConfirm} disabled={loading}>
            <span className="material-symbols-outlined">{loading ? 'hourglass_empty' : 'cancel'}</span>
            {loading ? 'Memproses...' : 'Ya, Tolak'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboardPage

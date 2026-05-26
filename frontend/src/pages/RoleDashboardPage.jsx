import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCurrentUser, getStoredUser, isAuthenticated, logout } from '../services/authService'
import './RoleDashboardPage.css'

const ROLE_CONFIG = {
  funder: {
    icon: 'account_balance',
    label: 'Funder',
    color: '#1a6b4a',
    colorSoft: '#e8f5ef',
    colorBorder: '#a8d5be',
    title: 'Dashboard Funder',
    subtitle: 'Temukan dan dukung UMKM potensial yang membutuhkan pendanaan.',
    features: [
      { icon: 'search', title: 'Temukan UMKM', desc: 'Jelajahi UMKM yang membutuhkan pendanaan sesuai sektor dan lokasi.' },
      { icon: 'psychology', title: 'Rekomendasi AI', desc: 'Dapatkan rekomendasi UMKM terbaik berdasarkan analisis AI.' },
      { icon: 'monitoring', title: 'Laporan Investasi', desc: 'Pantau perkembangan UMKM yang sudah Anda danai.' },
      { icon: 'handshake', title: 'Portofolio Pendanaan', desc: 'Kelola seluruh riwayat pendanaan dan dampak sosial Anda.' },
    ],
  },
  mentor: {
    icon: 'school',
    label: 'Mentor',
    color: '#4a1a6b',
    colorSoft: '#f0e8f5',
    colorBorder: '#c8a8d5',
    title: 'Dashboard Mentor',
    subtitle: 'Bagikan keahlian Anda dan dampingi pertumbuhan UMKM Indonesia.',
    features: [
      { icon: 'video_chat', title: 'Sesi Mentoring', desc: 'Jadwalkan dan kelola sesi mentoring bersama UMKM.' },
      { icon: 'star', title: 'Reputasi & Poin', desc: 'Lihat skor reputasi dan poin yang Anda kumpulkan.' },
      { icon: 'people', title: 'UMKM Binaan', desc: 'Pantau perkembangan UMKM yang pernah Anda mentori.' },
      { icon: 'workspace_premium', title: 'Sertifikat & Badges', desc: 'Raih pengakuan atas kontribusi mentoring Anda.' },
    ],
  },
  admin: {
    icon: 'admin_panel_settings',
    label: 'Administrator',
    color: '#6b1a1a',
    colorSoft: '#f5e8e8',
    colorBorder: '#d5a8a8',
    title: 'Dashboard Administrator',
    subtitle: 'Kelola seluruh ekosistem platform MicroFun.',
    features: [
      { icon: 'manage_accounts', title: 'Manajemen Pengguna', desc: 'Kelola semua akun user, funder, mentor, dan UMKM.' },
      { icon: 'verified_user', title: 'Verifikasi UMKM', desc: 'Tinjau dan verifikasi dokumen legalitas UMKM.' },
      { icon: 'bar_chart', title: 'Statistik Platform', desc: 'Lihat statistik penggunaan dan pertumbuhan platform.' },
      { icon: 'settings', title: 'Konfigurasi Sistem', desc: 'Atur parameter dan konfigurasi platform.' },
    ],
  },
}

function RoleDashboardPage({ role }) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(getStoredUser())

  const config = ROLE_CONFIG[role]

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login', { replace: true })
      return
    }

    getCurrentUser()
      .then((profile) => {
        // If role mismatch, redirect to correct dashboard
        if (profile.role !== role) {
          const roleDashboardMap = {
            umkm_owner: '/dashboard/umkm',
            funder: '/dashboard/funder',
            mentor: '/dashboard/mentor',
            admin: '/dashboard/admin',
          }
          navigate(roleDashboardMap[profile.role] || '/login', { replace: true })
          return
        }
        setUser(profile)
      })
      .catch(() => {
        logout()
        navigate('/login', { replace: true })
      })
      .finally(() => setLoading(false))
  }, [navigate, role])

  const displayName = useMemo(() => user?.name || config.label, [user, config.label])

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  if (loading) {
    return (
      <div className="role-dash-loading">
        <span className="material-symbols-outlined role-dash-spinner">hourglass_empty</span>
        <p>Memuat dashboard...</p>
      </div>
    )
  }

  return (
    <div className="role-dash-shell" style={{ '--role-color': config.color, '--role-soft': config.colorSoft, '--role-border': config.colorBorder }}>
      {/* Sidebar */}
      <aside className="role-dash-sidebar">
        <div>
          <div className="role-dash-brand">
            <h1>MicroFun</h1>
            <p>Empowering Growth</p>
          </div>
          <div className="role-dash-role-badge">
            <span className="material-symbols-outlined">{config.icon}</span>
            <span>{config.label}</span>
          </div>
          <nav className="role-dash-nav">
            <a href="#" className="active">
              <span className="material-symbols-outlined">dashboard</span>
              <span>Dashboard</span>
            </a>
            {config.features.map((f) => (
              <a key={f.title} href="#">
                <span className="material-symbols-outlined">{f.icon}</span>
                <span>{f.title}</span>
              </a>
            ))}
          </nav>
        </div>
        <div className="role-dash-sidebar-footer">
          <button type="button" onClick={handleLogout} className="role-dash-logout-btn">
            <span className="material-symbols-outlined">logout</span>
            <span>Keluar</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="role-dash-main">
        {/* Header */}
        <header className="role-dash-topbar">
          <div>
            <h2>Selamat datang, {displayName}</h2>
            <p>{config.subtitle}</p>
          </div>
          <div className="role-dash-topbar-actions">
            <div className="role-dash-avatar-wrap">
              <span className="material-symbols-outlined role-dash-avatar-icon">{config.icon}</span>
            </div>
          </div>
        </header>

        {/* Coming Soon Banner */}
        <div className="role-dash-coming-soon-card">
          <div className="role-dash-coming-icon-wrap">
            <span className="material-symbols-outlined">{config.icon}</span>
          </div>
          <div className="role-dash-coming-copy">
            <div className="role-dash-pill">
              <span className="material-symbols-outlined">construction</span>
              <span>Dalam Pengembangan</span>
            </div>
            <h2>Dashboard {config.label} Segera Hadir</h2>
            <p>
              Tim kami sedang membangun pengalaman dashboard yang optimal untuk Anda sebagai <strong>{config.label}</strong>.
              Fitur-fitur unggulan sudah disiapkan dan akan segera diluncurkan!
            </p>
          </div>
        </div>

        {/* Feature Preview Grid */}
        <div className="role-dash-features-section">
          <h3 className="role-dash-section-title">Fitur yang Akan Hadir</h3>
          <div className="role-dash-features-grid">
            {config.features.map((feature) => (
              <div key={feature.title} className="role-dash-feature-card">
                <div className="role-dash-feature-icon">
                  <span className="material-symbols-outlined">{feature.icon}</span>
                </div>
                <h4>{feature.title}</h4>
                <p>{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <footer className="role-dash-footer">
          <p>© 2024 MicroFun. Impacting Indonesian MSMEs through Global Connection.</p>
        </footer>
      </main>
    </div>
  )
}

export default RoleDashboardPage

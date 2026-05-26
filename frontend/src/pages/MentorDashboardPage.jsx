import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import DashboardSidebar from '../components/dashboard/DashboardSidebar'
import {
  getCurrentUser,
  getStoredUser,
  isAuthenticated,
  logout,
} from '../services/authService'
import './MentorDashboardPage.css'

const mentorNavItems = [
  { label: 'Dashboard', icon: 'dashboard' },
  { label: 'Requests', icon: 'inbox' },
  {
    label: 'Mentoring Session',
    icon: 'video_chat',
    children: [
      { label: 'Kelola Sesi', icon: 'calendar_month' },
      { label: 'Catatan Mentor', icon: 'edit_note' },
      { label: 'Action Plan', icon: 'task_alt' },
      { label: 'Pantau Progress', icon: 'trending_up' },
    ],
  },
  { label: 'Profile', icon: 'account_circle' },
]

const defaultProfile = {
  name: '',
  email: '',
  current_job: '',
  experience: '',
  achievements: '',
  about: '',
  skills: [],
}

function MentorDashboardPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(getStoredUser())
  const [activeTab, setActiveTab] = useState('Dashboard')
  const [profile, setProfile] = useState(defaultProfile)
  const [requests, setRequests] = useState([])
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const fetchMentorProfile = useCallback(async () => {
    const token = localStorage.getItem('microfun_auth_token')
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'
    const response = await fetch(`${apiBaseUrl}/api/mentor/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.message || 'Gagal memuat profil mentor.')
    setProfile({ ...defaultProfile, ...payload.profile })
  }, [])

  const fetchRequests = useCallback(async () => {
    const token = localStorage.getItem('microfun_auth_token')
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'
    const response = await fetch(`${apiBaseUrl}/api/mentor/requests`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.message || 'Gagal memuat request mentoring.')
    setRequests(payload.data || [])
  }, [])

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login', { replace: true })
      return
    }

    getCurrentUser()
      .then(async (currentUser) => {
        if (currentUser.role !== 'mentor') {
          navigate('/dashboard', { replace: true })
          return
        }

        setUser(currentUser)
        await Promise.all([fetchMentorProfile(), fetchRequests()])
      })
      .catch((err) => {
        setError(err.message)
        logout()
        navigate('/login', { replace: true })
      })
      .finally(() => setLoading(false))
  }, [fetchMentorProfile, fetchRequests, navigate])

  const displayName = useMemo(() => user?.name || profile.name || 'Mentor', [profile.name, user])
  const dashboardStats = useMemo(() => getMentorDashboardStats(requests, profile), [profile, requests])

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  async function handleSaveProfile(nextProfile) {
    const token = localStorage.getItem('microfun_auth_token')
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'
    setMessage('')
    setError('')

    try {
      const response = await fetch(`${apiBaseUrl}/api/mentor/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(nextProfile),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.message || 'Gagal menyimpan profil mentor.')
      setProfile({ ...defaultProfile, ...payload.profile })
      setMessage(payload.message)
    } catch (err) {
      setError(err.message)
    }
  }

  async function updateRequestStatus(requestId, status) {
    const token = localStorage.getItem('microfun_auth_token')
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'
    setMessage('')
    setError('')

    try {
      const response = await fetch(`${apiBaseUrl}/api/mentor/requests/${requestId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.message || 'Gagal mengubah status request.')
      setMessage(payload.message)
      await fetchRequests()
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) {
    return <main className="mentor-loading">Memuat dashboard mentor...</main>
  }

  return (
    <div className="mentor-dashboard-shell">
      <DashboardSidebar
        activeTab={activeTab}
        brandSubtitle="Mentor Portal"
        ctaLabel="Review Requests"
        navItems={mentorNavItems}
        onLogout={handleLogout}
        onTabChange={setActiveTab}
      />

      <main className="mentor-main">
        <header className="mentor-topbar">
          <div>
            <h1>{getMentorPageTitle(activeTab, displayName)}</h1>
            <p>{getMentorPageSubtitle(activeTab)}</p>
          </div>
          <div className="mentor-avatar">{getInitials(displayName)}</div>
        </header>

        {message && <p className="mentor-alert success">{message}</p>}
        {error && <p className="mentor-alert error">{error}</p>}

        {activeTab === 'Profile' ? (
          <MentorProfileForm key={`${profile.id || 'mentor'}-${profile.email}`} profile={profile} onSave={handleSaveProfile} />
        ) : activeTab === 'Dashboard' ? (
          <MentorDashboardHome
            displayName={displayName}
            profile={profile}
            requests={requests}
            stats={dashboardStats}
            onOpenRequests={() => setActiveTab('Requests')}
          />
        ) : isMentorSessionTab(activeTab) ? (
          <MentorSessionSubpage activeTab={activeTab} requests={requests} />
        ) : (
          <MentorRequestsView requests={requests} onStatusChange={updateRequestStatus} />
        )}
      </main>
    </div>
  )
}

function MentorProfileForm({ onSave, profile }) {
  const [form, setForm] = useState(profile)
  const [skillInput, setSkillInput] = useState('')
  const [isEditing, setIsEditing] = useState(false)

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function addSkill() {
    const skill = skillInput.trim()
    if (!skill) return
    setForm((current) => ({
      ...current,
      skills: current.skills.includes(skill) ? current.skills : [...current.skills, skill],
    }))
    setSkillInput('')
  }

  function removeSkill(skill) {
    setForm((current) => ({ ...current, skills: current.skills.filter((item) => item !== skill) }))
  }

  return (
    <div className="mentor-profile-container">
      <div className="mentor-profile-toolbar">
        {!isEditing && (
          <button type="button" className="mentor-edit-btn" onClick={() => setIsEditing(true)}>
            <span className="material-symbols-outlined">edit</span>
            Edit Profil
          </button>
        )}
      </div>

      <form className="mentor-profile-grid" onSubmit={(event) => {
        event.preventDefault()
        onSave(form)
        setIsEditing(false)
      }}>
      <section className="mentor-card mentor-profile-card-main">
        <div className="mentor-card-header">
          <span className="material-symbols-outlined">account_circle</span>
          <div>
            <h2>Informasi Dasar</h2>
            <p>Data identitas mentor yang terlihat oleh UMKM.</p>
          </div>
        </div>
        <label>
          Nama
          <input disabled={!isEditing} value={form.name || ''} onChange={(event) => updateField('name', event.target.value)} />
        </label>
        <label>
          Email
          <input value={form.email || ''} disabled />
        </label>
        <label>
          Bidang Keahlian / Pekerjaan Saat Ini
          <input disabled={!isEditing} value={form.current_job || ''} onChange={(event) => updateField('current_job', event.target.value)} placeholder="Contoh: Marketing strategist, Finance mentor" />
        </label>
        <label>
          Bio Singkat
          <textarea disabled={!isEditing} value={form.about || ''} onChange={(event) => updateField('about', event.target.value)} placeholder="Ceritakan fokus mentoring Anda..." />
        </label>
      </section>

      <section className="mentor-card mentor-profile-card-main">
        <div className="mentor-card-header">
          <span className="material-symbols-outlined">workspace_premium</span>
          <div>
            <h2>Keahlian, Prestasi, Pengalaman</h2>
            <p>Dipakai UMKM untuk memilih mentor yang paling sesuai.</p>
          </div>
        </div>
        <label>
          Bidang Keahlian
          <div className="mentor-skill-input">
            <input disabled={!isEditing} value={skillInput} onChange={(event) => setSkillInput(event.target.value)} placeholder="Tambahkan skill" />
            <button type="button" disabled={!isEditing} onClick={addSkill}>Tambah</button>
          </div>
        </label>
        <div className="mentor-chip-row">
          {form.skills.map((skill) => (
            <button key={skill} type="button" disabled={!isEditing} onClick={() => removeSkill(skill)}>
              {skill}
              <span className="material-symbols-outlined">close</span>
            </button>
          ))}
        </div>
        <label>
          Prestasi
          <textarea disabled={!isEditing} value={form.achievements || ''} onChange={(event) => updateField('achievements', event.target.value)} placeholder="Contoh: Membantu 20+ UMKM naik omzet, award, sertifikasi..." />
        </label>
        <label>
          Pengalaman
          <textarea disabled={!isEditing} value={form.experience || ''} onChange={(event) => updateField('experience', event.target.value)} placeholder="Jelaskan pengalaman profesional atau mentoring Anda..." />
        </label>
      </section>

      {isEditing && (
        <div className="mentor-form-actions">
          <button type="button" className="mentor-cancel-btn" onClick={() => {
            setForm(profile)
            setSkillInput('')
            setIsEditing(false)
          }}>
            Batal
          </button>
          <button type="submit">Simpan Profil</button>
        </div>
      )}
      </form>
    </div>
  )
}

function MentorDashboardHome({ displayName, onOpenRequests, profile, requests, stats }) {
  const upcomingSessions = requests
    .filter((request) => ['accepted', 'pending'].includes(request.status))
    .slice(0, 3)
  const recentActivities = requests.slice(0, 4)
  const menteeProgress = requests.slice(0, 4)

  return (
    <div className="mentor-home">
      <section className="mentor-home-hero">
        <div>
          <h2>Elite Dashboard</h2>
          <p>Welcome back, {displayName}. Pantau request, jadwal mentoring, dan perkembangan UMKM binaan Anda.</p>
        </div>
        <div className="mentor-date-chip">
          <span className="material-symbols-outlined">event</span>
          <span>{formatDateRange()}</span>
        </div>
      </section>

      <section className="mentor-summary-grid">
        <MentorSummaryCard icon="payments" label="Total Earnings" value={formatCurrency(stats.earnings)} trend="+8.4%" />
        <MentorSummaryCard icon="timer" label="Total Hours" value={`${stats.hours} hrs`} meta="This Month" />
        <MentorSummaryCard icon="groups" label="Active Mentees" value={stats.activeMentees} meta={`${stats.capacity} Capacity`} />
        <MentorSummaryCard icon="star" label="Average Rating" value={`${stats.rating} / 5.0`} meta="Elite Tier" featured />
      </section>

      <div className="mentor-home-grid">
        <div className="mentor-home-left">
          <section className="mentor-card mentor-home-panel">
            <div className="mentor-panel-head">
              <h2>Upcoming Sessions</h2>
              <button type="button" onClick={onOpenRequests}>View All Schedule</button>
            </div>
            {upcomingSessions.length === 0 ? (
              <div className="mentor-mini-empty">Belum ada sesi mendatang.</div>
            ) : (
              <div className="mentor-session-list">
                {upcomingSessions.map((session) => (
                  <article key={session.id} className="mentor-session-row">
                    <div className="mentor-session-date">
                      <span>{formatMonth(session.scheduled_at)}</span>
                      <strong>{formatDay(session.scheduled_at)}</strong>
                    </div>
                    <div>
                      <h3>{session.topic}</h3>
                      <p>
                        <span className="material-symbols-outlined">schedule</span>
                        {formatTime(session.scheduled_at)}
                        <span className="material-symbols-outlined">storefront</span>
                        {session.business_name || session.requester_name}
                      </p>
                    </div>
                    <button type="button">{session.status === 'accepted' ? 'Join Meeting' : 'Review'}</button>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="mentor-card mentor-home-panel">
            <div className="mentor-panel-head">
              <h2>Mentee Progress Overview</h2>
              <span className="material-symbols-outlined">more_horiz</span>
            </div>
            {menteeProgress.length === 0 ? (
              <div className="mentor-mini-empty">Belum ada UMKM binaan.</div>
            ) : (
              <div className="mentor-progress-grid">
                {menteeProgress.map((mentee, index) => {
                  const progress = deriveMenteeProgress(mentee, index)
                  return (
                    <article key={`progress-${mentee.id}`} className="mentor-progress-card">
                      <div>
                        <div className="mentor-progress-avatar">{getInitials(mentee.business_name || mentee.requester_name)}</div>
                        <div>
                          <strong>{mentee.requester_name}</strong>
                          <span>{mentee.business_name || 'UMKM'}</span>
                        </div>
                      </div>
                      <div className="mentor-progress-summary">
                        <p><span>Funding Readiness</span><strong>{progress}%</strong></p>
                        <div><span style={{ width: `${progress}%` }} /></div>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </section>
        </div>

        <aside className="mentor-home-right">
          <section className="mentor-ai-insight-card">
            <div>
              <span className="material-symbols-outlined">smart_toy</span>
              <strong>Elite Insight</strong>
            </div>
            <p>
              {stats.pending > 0
                ? `Ada ${stats.pending} request mentoring baru. Prioritaskan request yang sesuai dengan keahlian ${profile.skills?.[0] || profile.current_job || 'utama'} Anda.`
                : 'Profil mentoring Anda aktif. Lengkapi prestasi dan pengalaman agar UMKM lebih mudah menemukan kecocokan.'}
            </p>
            <button type="button" onClick={onOpenRequests}>Action Advice</button>
          </section>

          <section className="mentor-card mentor-home-panel">
            <h2>Recent Activity</h2>
            {recentActivities.length === 0 ? (
              <div className="mentor-mini-empty">Aktivitas terbaru akan muncul di sini.</div>
            ) : (
              <div className="mentor-activity-list">
                {recentActivities.map((activity) => (
                  <article key={`activity-${activity.id}`}>
                    <i />
                    <div>
                      <p><strong>{activity.requester_name}</strong> mengirim request untuk topik <strong>{activity.topic}</strong>.</p>
                      <span>{formatRelativeDate(activity.created_at)}</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  )
}

function MentorSummaryCard({ featured = false, icon, label, meta, trend, value }) {
  return (
    <article className={`mentor-summary-card ${featured ? 'featured' : ''}`}>
      <div>
        <span className="material-symbols-outlined">{icon}</span>
        {trend && <small className="green">{trend} <span className="material-symbols-outlined">trending_up</span></small>}
        {meta && <small>{meta}</small>}
      </div>
      <p>{label}</p>
      <strong>{value}</strong>
    </article>
  )
}

function MentorSessionSubpage({ activeTab, requests }) {
  const acceptedRequests = requests.filter((request) => request.status === 'accepted' || request.status === 'completed')

  if (activeTab === 'Kelola Sesi') {
    return (
      <div className="mentor-session-subpage">
        <MentorSubpageHeader
          eyebrow="Mentoring Session"
          title="Kelola Sesi"
          subtitle="Atur jadwal, agenda, dan status sesi mentoring yang sedang berjalan."
          actionIcon="add"
          actionLabel="Buat Sesi"
        />
        <div className="mentor-session-management-list">
          {(acceptedRequests.length ? acceptedRequests : requests.slice(0, 3)).map((session) => (
            <article key={session.id} className="mentor-session-management-card">
              <div className="mentor-session-date">
                <span>{formatMonth(session.scheduled_at)}</span>
                <strong>{formatDay(session.scheduled_at)}</strong>
              </div>
              <div>
                <h3>{session.topic || 'Sesi mentoring bisnis'}</h3>
                <p>{session.business_name || session.requester_name || 'UMKM'} • {formatTime(session.scheduled_at)}</p>
              </div>
              <button type="button">Detail Sesi</button>
            </article>
          ))}
        </div>
      </div>
    )
  }

  if (activeTab === 'Catatan Mentor') {
    return (
      <div className="mentor-session-subpage">
        <MentorSubpageHeader
          eyebrow="Mentoring Session"
          title="Catatan Mentor"
          subtitle="Simpan evaluasi, insight sesi, dan rekomendasi untuk UMKM."
          actionIcon="edit_note"
          actionLabel="Tambah Catatan"
        />
        <div className="mentor-notes-layout">
          <section className="mentor-note-editor">
            <label>
              Pilih UMKM
              <select>
                <option>{requests[0]?.business_name || requests[0]?.requester_name || 'Pilih UMKM'}</option>
              </select>
            </label>
            <label>
              Evaluasi Kondisi UMKM
              <textarea defaultValue="UMKM menunjukkan progres positif. Fokus berikutnya adalah konsistensi eksekusi action plan dan pengukuran hasil mingguan." />
            </label>
            <label>
              Rekomendasi Mentor
              <textarea placeholder="Tulis rekomendasi strategi berikutnya..." />
            </label>
            <button type="button">Simpan Catatan</button>
          </section>
          <aside className="mentor-note-history">
            <h3>Catatan Terbaru</h3>
            {requests.slice(0, 3).map((request) => (
              <article key={request.id}>
                <strong>{request.business_name || request.requester_name || 'UMKM'}</strong>
                <p>{request.business_problem || request.notes || 'Belum ada catatan mentoring.'}</p>
              </article>
            ))}
          </aside>
        </div>
      </div>
    )
  }

  if (activeTab === 'Action Plan') {
    const plans = [
      ['Riset kompetitor digital', 'Bandingkan 5 kompetitor dan catat pricing, konten, serta promo utama.', 80],
      ['Optimasi katalog produk', 'Lengkapi foto, deskripsi, harga, dan call to action untuk produk unggulan.', 55],
      ['Jadwal konten mingguan', 'Buat kalender konten 4 minggu untuk Instagram dan WhatsApp Business.', 35],
    ]

    return (
      <div className="mentor-session-subpage">
        <MentorSubpageHeader
          eyebrow="Mentoring Session"
          title="Action Plan"
          subtitle="Buat tugas, prioritas, dan target yang perlu dikerjakan UMKM."
          actionIcon="add_task"
          actionLabel="Tambah Task"
        />
        <div className="mentor-action-plan-grid">
          {plans.map(([title, description, progress]) => (
            <article key={title}>
              <span>{progress >= 75 ? 'High Progress' : progress >= 50 ? 'In Progress' : 'New Task'}</span>
              <h3>{title}</h3>
              <p>{description}</p>
              <div>
                <small>{progress}%</small>
                <i><b style={{ width: `${progress}%` }} /></i>
              </div>
            </article>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="mentor-session-subpage">
      <MentorSubpageHeader
        eyebrow="Mentoring Session"
        title="Pantau Progress"
        subtitle="Pantau perkembangan UMKM dari sesi, task, dan update bisnis terbaru."
        actionIcon="analytics"
        actionLabel="Lihat Laporan"
      />
      <div className="mentor-progress-monitor-grid">
        {[
          ['Task selesai', '64%', 64],
          ['Kesiapan pendanaan', '78%', 78],
          ['Konsistensi eksekusi', '52%', 52],
        ].map(([label, value, progress]) => (
          <article key={label}>
            <span className="material-symbols-outlined">trending_up</span>
            <p>{label}</p>
            <strong>{value}</strong>
            <i><b style={{ width: `${progress}%` }} /></i>
          </article>
        ))}
      </div>
    </div>
  )
}

function MentorSubpageHeader({ actionIcon, actionLabel, eyebrow, subtitle, title }) {
  return (
    <div className="mentor-subpage-header">
      <div>
        <span>{eyebrow}</span>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
      <button type="button">
        <span className="material-symbols-outlined">{actionIcon}</span>
        {actionLabel}
      </button>
    </div>
  )
}

function MentorRequestsView({ onStatusChange, requests }) {
  const navigate = useNavigate()
  const pendingRequests = requests.filter((request) => request.status === 'pending')
  const featuredRequest = pendingRequests[0] || requests[0]
  const firstPendingIndex = requests.findIndex((request) => request.status === 'pending')

  return (
    <section className="mentor-requests-page">
      <div className="mentor-requests-header">
        <div>
          <h2>Mentoring Requests</h2>
          <p>
            Review dan kelola request bimbingan dari UMKM. Pilih request yang paling sesuai
            dengan keahlian Anda.
          </p>
        </div>
        <span className="mentor-request-count-pill">
          <i />
          {pendingRequests.length} Pending
        </span>
      </div>

      {requests.length === 0 ? (
        <div className="mentor-empty-state">
          <span className="material-symbols-outlined">inbox</span>
          <p>Belum ada request mentoring dari UMKM.</p>
        </div>
      ) : (
        <>
          <div className="mentor-request-grid-v2">
            {requests.map((request, index) => {
              const businessName = request.business_name || request.requester_name || 'UMKM'
              const category = request.other_category || request.category || 'UMKM'
              const statusMeta = getRequestStatusMeta(request.status)
              const isFeatured = request.status === 'pending' && index === firstPendingIndex

              return (
                <article key={request.id} className={`mentor-request-card-v2 ${isFeatured ? 'featured' : ''}`}>
                  <div className="mentor-request-card-top">
                    <div className="mentor-request-identity">
                      <div className="mentor-request-logo">{getInitials(businessName)}</div>
                      <div>
                        <h3>{businessName}</h3>
                        <div className="mentor-request-badges">
                          <span>{category}</span>
                          <span className={statusMeta.className}>{statusMeta.label}</span>
                        </div>
                      </div>
                    </div>
                    <time>{formatRequestAge(request.created_at || request.scheduled_at)}</time>
                  </div>

                  <div className="mentor-request-message">
                    <p>
                      "{request.business_problem || request.notes || `Saya ingin mendapatkan arahan terkait ${request.topic || 'pengembangan bisnis'} agar UMKM kami bisa berkembang lebih terarah.`}"
                    </p>
                  </div>

                  <dl className="mentor-request-meta-grid">
                    <div>
                      <dt>Topik</dt>
                      <dd>{request.topic || 'Mentoring bisnis'}</dd>
                    </div>
                    <div>
                      <dt>Jadwal</dt>
                      <dd>{formatDateTime(request.scheduled_at)}</dd>
                    </div>
                    <div>
                      <dt>Durasi</dt>
                      <dd>{request.duration_minutes || 60} menit</dd>
                    </div>
                  </dl>

                  <div className="mentor-request-card-actions">
                    {request.status === 'pending' ? (
                      <>
                        <button type="button" className={isFeatured ? 'gold' : 'primary'} onClick={() => onStatusChange(request.id, 'accepted')}>
                          Accept Request
                        </button>
                        <button type="button" className="outline" onClick={() => navigate(`/dashboard/mentor/requests/${request.id}`)}>
                          View Profile
                        </button>
                        <button type="button" className="danger" onClick={() => onStatusChange(request.id, 'rejected')}>
                          Decline
                        </button>
                      </>
                    ) : (
                      <>
                        <button type="button" className="outline" onClick={() => navigate(`/dashboard/mentor/requests/${request.id}`)}>
                          View Profile
                        </button>
                        <span className={`mentor-request-status ${statusMeta.className}`}>{statusMeta.label}</span>
                      </>
                    )}
                  </div>
                </article>
              )
            })}
          </div>

          <div className="mentor-request-insight">
            <div className="mentor-request-insight-icon">
              <span className="material-symbols-outlined">auto_awesome</span>
            </div>
            <div>
              <h3>AI Matching Insight</h3>
              <p>
                {featuredRequest
                  ? `Berdasarkan request masuk, ${featuredRequest.business_name || featuredRequest.requester_name || 'UMKM ini'} berpotensi cocok dengan keahlian mentor Anda pada topik ${featuredRequest.topic || 'pengembangan bisnis'}. Prioritaskan request dengan kebutuhan yang paling dekat dengan pengalaman dan bidang keahlian Anda.`
                  : 'Belum ada request yang bisa dianalisis. Insight akan muncul saat UMKM mulai mengirim permintaan mentoring.'}
              </p>
            </div>
            <button type="button">Enable Auto-Prioritization</button>
          </div>
        </>
      )}
    </section>
  )
}

function getInitials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map((word) => word[0]).join('').toUpperCase() || 'MT'
}

function getRequestStatusMeta(status = 'pending') {
  const normalized = status.toLowerCase()
  if (normalized === 'accepted') return { className: 'accepted', label: 'Accepted' }
  if (normalized === 'completed') return { className: 'completed', label: 'Completed' }
  if (normalized === 'rejected') return { className: 'rejected', label: 'Declined' }
  return { className: 'pending', label: 'New Request' }
}

function getMentorDashboardStats(requests, profile) {
  const acceptedCount = requests.filter((request) => request.status === 'accepted' || request.status === 'completed').length
  const completedCount = requests.filter((request) => request.status === 'completed').length
  const totalMinutes = requests
    .filter((request) => request.status !== 'rejected')
    .reduce((total, request) => total + Number(request.duration_minutes || 0), 0)

  return {
    activeMentees: new Set(requests.map((request) => request.umkm_owner || request.requester_email || request.requester_name)).size,
    capacity: Math.max(8, acceptedCount + 2),
    earnings: completedCount * 250000,
    hours: Math.round((totalMinutes / 60) * 10) / 10,
    pending: requests.filter((request) => request.status === 'pending').length,
    rating: profile.reputation_score ? Number(profile.reputation_score).toFixed(1) : '4.8',
  }
}

function getMentorPageTitle(activeTab, displayName) {
  if (activeTab === 'Profile') return 'Profil Mentor'
  if (activeTab === 'Requests') return 'Request Mentoring'
  if (isMentorSessionTab(activeTab)) return activeTab
  return `Halo, ${displayName}`
}

function getMentorPageSubtitle(activeTab) {
  if (activeTab === 'Profile') return 'Lengkapi keahlian, prestasi, dan pengalaman Anda.'
  if (activeTab === 'Requests') return 'Kelola request mentoring dari UMKM.'
  if (isMentorSessionTab(activeTab)) return 'Kelola proses mentoring aktif bersama UMKM.'
  return 'Ringkasan performa mentoring, jadwal, dan aktivitas terbaru.'
}

function isMentorSessionTab(activeTab) {
  return ['Kelola Sesi', 'Catatan Mentor', 'Action Plan', 'Pantau Progress'].includes(activeTab)
}

function deriveMenteeProgress(mentee, index) {
  if (mentee.status === 'completed') return 92
  if (mentee.status === 'accepted') return 78
  if (mentee.status === 'pending') return 55 + (index % 3) * 8
  return 45
}

function formatDateTime(value) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function formatDateRange() {
  const now = new Date()
  const next = new Date()
  next.setDate(now.getDate() + 7)

  const formatter = new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short' })
  return `${formatter.format(now)} - ${formatter.format(next)}`
}

function formatMonth(value) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('en-US', { month: 'short' }).format(new Date(value))
}

function formatDay(value) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('en-US', { day: '2-digit' }).format(new Date(value))
}

function formatTime(value) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

function formatRelativeDate(value) {
  if (!value) return 'Baru saja'
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(value))
}

function formatRequestAge(value) {
  if (!value) return 'Baru saja'

  const targetDate = new Date(value)
  if (Number.isNaN(targetDate.getTime())) return 'Baru saja'

  const diffMs = Date.now() - targetDate.getTime()
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000))
  if (diffMinutes < 60) return `${diffMinutes || 1}m ago`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`

  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(targetDate)
}

function formatCurrency(value) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
}

export default MentorDashboardPage


import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import DashboardSidebar from '../components/dashboard/DashboardSidebar'
import {
  getCurrentUser,
  getStoredUser,
  isAuthenticated,
  logout,
} from '../services/authService'
import {
  acceptMentoringRequest,
  cancelSession,
  completeSession,
  completeWorkspace,
  createMentorNote,
  createWorkspaceSession,
  createWorkspaceTask,
  deleteTask as deleteMentoringTask,
  getMentorRequests,
  getMentors,
  getMentorWorkspaces,
  getWorkspace,
  getWorkspaceNotes,
  getWorkspaceProgress,
  getWorkspaceSessions,
  getWorkspaceTasks,
  getWorkspaceMessages,
  getWorkspaceFiles,
  rejectMentoringRequest,
  sendWorkspaceMessage,
  uploadWorkspaceFile,
  updateMentorNote,
  updateProgressRecommendation,
  updateSession,
  updateTask,
  upsertMentorProfile,
} from '../services/mentoringService'
import { getMentoringSocket } from '../services/mentoringSocket'
import './MentorDashboardPage.css'

const mentorNavItems = [
  { label: 'Dashboard', icon: 'dashboard' },
  {
    label: 'Mentoring',
    icon: 'video_chat',
    children: [
      { label: 'Request Masuk', icon: 'inbox' },
      { label: 'Mentee Saya', icon: 'groups' },
      { label: 'Jadwal Sesi', icon: 'calendar_month' },
      { label: 'Task & Action Plan', icon: 'task_alt' },
    ],
  },
  { label: 'Messages', icon: 'chat' },
  { label: 'Profile Mentor', icon: 'account_circle' },
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

const mentorTabRoutes = {
  Dashboard: '/dashboard/mentor',
  'Request Masuk': '/dashboard/mentor',
  'Mentee Saya': '/dashboard/mentor/mentees',
  'Jadwal Sesi': '/dashboard/mentor',
  'Task & Action Plan': '/dashboard/mentor/mentoring/tasks',
  Messages: '/dashboard/mentor/messages',
  'Profile Mentor': '/dashboard/mentor',
}

const mentorRouteTabs = {
  '/dashboard/mentor/mentees': 'Mentee Saya',
  '/dashboard/mentor/messages': 'Messages',
  '/dashboard/mentor/mentoring/tasks': 'Task & Action Plan',
}

function getMentorRouteTab(pathname) {
  if (pathname.startsWith('/dashboard/mentor/mentoring/workspace/')) return 'Workspace Mentor'
  if (pathname.startsWith('/dashboard/mentor/messages')) return 'Messages'
  return mentorRouteTabs[pathname]
}

function MentorDashboardPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(getStoredUser())
  const [activeTabState, setActiveTabState] = useState('Dashboard')
  const activeTab = getMentorRouteTab(location.pathname) || activeTabState
  const [profile, setProfile] = useState(defaultProfile)
  const [mentorProfileId, setMentorProfileId] = useState(null)
  const [requests, setRequests] = useState([])
  const [workspaces, setWorkspaces] = useState([])
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [requestModalMode, setRequestModalMode] = useState(null)
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

  const fetchMentoringData = useCallback(async (currentUser) => {
    const profiles = await getMentors()
    const currentMentor = profiles.find((item) => Number(item.userId || item.user_id) === Number(currentUser.id))
    if (!currentMentor) {
      setMentorProfileId(null)
      setRequests([])
      setWorkspaces([])
      return
    }
    setMentorProfileId(currentMentor.id)
    const [incomingRequests, mentorWorkspaces] = await Promise.all([
      getMentorRequests(currentMentor.id),
      getMentorWorkspaces(currentMentor.id),
    ])
    setRequests(incomingRequests)
    setWorkspaces(mentorWorkspaces)
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
        await Promise.all([fetchMentorProfile(), fetchMentoringData(currentUser)])
      })
      .catch((err) => {
        setError(err.message)
        logout()
        navigate('/login', { replace: true })
      })
      .finally(() => setLoading(false))
  }, [fetchMentorProfile, fetchMentoringData, navigate])

  const displayName = useMemo(() => user?.name || profile.name || 'Mentor', [profile.name, user])
  const dashboardStats = useMemo(() => getMentorDashboardStats(requests, profile), [profile, requests])

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  function handleTabChange(tab) {
    setActiveTabState(tab)
    const route = mentorTabRoutes[tab]
    if (route && route !== location.pathname) {
      navigate(route)
    }
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
      const mentoringProfile = await upsertMentorProfile({
        name: nextProfile.name || user?.name || profile.name,
        profession: nextProfile.current_job,
        expertise: nextProfile.skills,
        achievements: nextProfile.achievements,
        experienceYears: parseInt(nextProfile.experience, 10) || null,
        bio: nextProfile.about,
        status: 'Available',
      })
      setMentorProfileId(mentoringProfile?.id || mentorProfileId)
      setProfile({ ...defaultProfile, ...payload.profile })
      setMessage(payload.message)
    } catch (err) {
      setError(err.message)
    }
  }

  async function updateRequestStatus(request, status, metadata = {}) {
    const token = localStorage.getItem('microfun_auth_token')
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'
    setMessage('')
    setError('')

    try {
      const payload = status === 'Rejected'
        ? await rejectMentoringRequest(request.id, { rejectionReason: metadata.rejectionReason })
        : await acceptMentoringRequest(request.id, {
            startDate: metadata.startDate,
            endDate: metadata.endDate,
            acceptanceNote: metadata.acceptanceNote,
            firstSession: metadata.createFirstSession ? {
              title: metadata.firstSessionTitle,
              date: metadata.firstSessionDate,
              startTime: metadata.firstSessionStartTime,
              endTime: metadata.firstSessionEndTime,
              platform: metadata.platform,
              meetingLink: metadata.meetingLink,
              agenda: metadata.firstSessionAgenda,
            } : undefined,
          })
      const nextStatus = status === 'Active' ? 'Active' : status === 'Accepted' ? 'Accepted' : 'Rejected'
      setMessage(nextStatus === 'Rejected' ? 'Request mentoring berhasil ditolak.' : payload.message)
      setRequests((current) => current.map((item) => item.id === request.id ? { ...item, status: nextStatus.toLowerCase(), ...metadata } : item))
      if (mentorProfileId) {
        const [incomingRequests, mentorWorkspaces] = await Promise.all([getMentorRequests(mentorProfileId), getMentorWorkspaces(mentorProfileId)])
        setRequests(incomingRequests)
        setWorkspaces(mentorWorkspaces)
      }
      setSelectedRequest(null)
      setRequestModalMode(null)
    } catch (err) {
      setError(err.message)
    }
  }

  function openRequestModal(request, mode) {
    setSelectedRequest(request)
    setRequestModalMode(mode)
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
        onTabChange={handleTabChange}
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
        ) : activeTab === 'Profile Mentor' ? (
          <MentorProfileForm key={`${profile.id || 'mentor'}-${profile.email}`} profile={profile} onSave={handleSaveProfile} />
        ) : activeTab === 'Dashboard' ? (
          <MentorDashboardHome
            displayName={displayName}
            profile={profile}
            requests={requests}
            stats={dashboardStats}
            onOpenRequests={() => handleTabChange('Request Masuk')}
          />
        ) : activeTab === 'Request Masuk' ? (
          <MentorRequestsView requests={requests} onOpenAccept={(request) => openRequestModal(request, 'accept')} onOpenReject={(request) => openRequestModal(request, 'reject')} />
        ) : activeTab === 'Messages' ? (
          <MentorMessagesView workspaces={workspaces} />
        ) : activeTab === 'Mentee Saya' ? (
          <MentorMenteesView requests={requests} workspaces={workspaces} />
        ) : activeTab === 'Workspace Mentor' ? (
          <MentorWorkspacePlaceholder mentoringId={getMentoringIdFromPath(location.pathname)} onBack={() => navigate('/dashboard/mentor/mentees')} />
        ) : isMentorSessionTab(activeTab) ? (
          <MentorSessionSubpage activeTab={activeTab} requests={requests} workspaces={workspaces} />
        ) : (
          <MentorPlaceholderPage icon="construction" title={activeTab} copy="Halaman ini sedang dipersiapkan." />
        )}

        {selectedRequest && requestModalMode === 'accept' && (
          <AcceptMentoringModal
            request={selectedRequest}
            onClose={() => setSelectedRequest(null)}
            onSubmit={(form) => updateRequestStatus(selectedRequest, form.createFirstSession ? 'Active' : 'Accepted', form)}
          />
        )}

        {selectedRequest && requestModalMode === 'reject' && (
          <RejectMentoringModal
            request={selectedRequest}
            onClose={() => setSelectedRequest(null)}
            onSubmit={(form) => updateRequestStatus(selectedRequest, 'Rejected', form)}
          />
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

function MentorSessionSubpage({ activeTab, requests, workspaces }) {
  const acceptedRequests = requests.filter((request) => request.status === 'accepted' || request.status === 'completed')

  if (activeTab === 'Jadwal Sesi') {
    return <MentorSessionScheduleView workspaces={workspaces} />
  }

  if (activeTab === 'Mentee Saya') {
    return (
      <div className="mentor-session-subpage">
        <MentorSubpageHeader
          eyebrow="Mentoring"
          title="Mentee Saya"
          subtitle="Lihat UMKM yang sudah diterima atau sedang aktif dalam program mentoring."
          actionIcon="groups"
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

  if (activeTab === 'Task & Action Plan') {
    return <MentorTaskActionPlanView workspaces={workspaces} />
  }

  return (
    <div className="mentor-session-subpage">
      <MentorSubpageHeader
        eyebrow="Mentoring"
        title={activeTab}
        subtitle="Fitur ini akan disambungkan ke data mentoring pada tahap berikutnya."
        actionIcon="construction"
        actionLabel="Coming Soon"
      />
      <MentorPlaceholderPage icon="construction" title={activeTab} copy="Detail halaman ini belum dibuat pada tahap ini." />
    </div>
  )
}

function MentorSessionScheduleView({ workspaces }) {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    if (!Array.isArray(workspaces) || workspaces.length === 0) {
      setSessions([])
      setLoading(false)
      return () => { active = false }
    }

    setLoading(true)
    setError('')

    Promise.all(
      workspaces.map(async (workspace) => {
        const sessionRows = await getWorkspaceSessions(workspace.id)
        return sessionRows.map((session) => normalizeMentorAggregatedSession(session, workspace))
      }),
    )
      .then((sessionGroups) => {
        if (!active) return
        const flattened = sessionGroups.flat()
        flattened.sort((a, b) => a.sortKey - b.sortKey)
        setSessions(flattened)
      })
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false))

    return () => { active = false }
  }, [workspaces])

  const groupedSessions = useMemo(() => groupMentorSessionsByDate(sessions), [sessions])
  const workspaceCount = Array.isArray(workspaces) ? workspaces.length : 0

  return (
    <section className="mentor-session-subpage mentor-session-board-page">
      <div className="mentor-session-board-header">
        <div>
          <span>Mentoring</span>
          <h2>Jadwal Sesi</h2>
          <p>Shortcut semua sesi mentoring dari seluruh workspace mentee, diurutkan dari tanggal terdekat.</p>
        </div>
        <div className="mentor-session-board-summary">
          <strong>{workspaceCount}</strong>
          <span>Workspace aktif</span>
        </div>
      </div>

      {error && <p className="mentor-alert error">{error}</p>}

      {loading ? (
        <div className="mentor-session-empty">
          <span className="material-symbols-outlined">hourglass_top</span>
          <h3>Memuat jadwal sesi...</h3>
          <p>Mengambil seluruh sesi dari semua workspace mentee.</p>
        </div>
      ) : sessions.length === 0 ? (
        <div className="mentor-session-empty">
          <span className="material-symbols-outlined">calendar_month</span>
          <h3>Belum ada jadwal sesi</h3>
          <p>Sesi yang dibuat mentor akan tampil di sini sebagai shortcut.</p>
        </div>
      ) : (
        <div className="mentor-session-board-list">
          {groupedSessions.map((group) => (
            <section key={group.key} className="mentor-session-group">
              <header className="mentor-session-group-head">
                <h4>{group.label}</h4>
                <span>{group.sessions.length} sesi</span>
              </header>

              <div className="mentor-session-rows">
                {group.sessions.map((session) => (
                  <article key={session.id} className="mentor-session-row">
                    <div className="mentor-session-row-date">
                      <span>{formatMonth(session.date)}</span>
                      <strong>{formatDay(session.date)}</strong>
                    </div>

                    <div className="mentor-session-row-main">
                      <div className="mentor-session-topline">
                        <span className={`mentor-session-status ${session.status.toLowerCase()}`}>{session.status}</span>
                        <small>{session.timeLabel}</small>
                      </div>
                      <h3>{session.title}</h3>
                      <p>{session.workspaceLabel}</p>
                      <div className="mentor-session-row-meta">
                        <span>{session.platform || 'Platform belum diisi'}</span>
                        {session.meetingLink && session.meetingLink !== '#' && <a href={session.meetingLink} target="_blank" rel="noreferrer">Join Meet</a>}
                      </div>
                    </div>

                    <div className="mentor-session-row-actions">
                      <button type="button" className="secondary" onClick={() => navigate(buildMentorWorkspaceUrl(session.workspaceId, 'sessions'))}>
                        Detail Sesi
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </section>
  )
}

function MentorTaskActionPlanView({ workspaces }) {
  const navigate = useNavigate()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    if (!Array.isArray(workspaces) || workspaces.length === 0) {
      setTasks([])
      setLoading(false)
      return () => { active = false }
    }

    setLoading(true)
    setError('')

    Promise.all(
      workspaces.map(async (workspace) => {
        const taskRows = await getWorkspaceTasks(workspace.id)
        return taskRows.map((task) => normalizeMentorAggregatedTask(task, workspace))
      }),
    )
      .then((taskGroups) => {
        if (!active) return
        const flattened = taskGroups.flat()
        flattened.sort((a, b) => {
          const aDeadline = parseDateOnly(a.deadline)
          const bDeadline = parseDateOnly(b.deadline)
          if (!aDeadline && !bDeadline) return 0
          if (!aDeadline) return 1
          if (!bDeadline) return -1
          return aDeadline.getTime() - bDeadline.getTime()
        })
        setTasks(flattened)
      })
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false))

    return () => { active = false }
  }, [workspaces])

  const groupedTasks = useMemo(() => groupMentorTasksByDeadline(tasks), [tasks])
  const workspaceCount = Array.isArray(workspaces) ? workspaces.length : 0

  return (
    <div className="mentor-task-board-page">
      <div className="mentor-task-board-header">
        <div>
          <span>Mentoring</span>
          <h2>Task Mentee</h2>
          <p>Lihat semua task dari seluruh workspace mentee, diurutkan per deadline agar progres lebih mudah dipantau.</p>
        </div>
        <div className="mentor-task-board-summary">
          <strong>{workspaceCount}</strong>
          <span>Workspace aktif</span>
        </div>
      </div>

      {error && <p className="mentor-alert error">{error}</p>}

      {loading ? (
        <div className="mentor-session-empty">
          <span className="material-symbols-outlined">hourglass_top</span>
          <h3>Memuat task mentee...</h3>
          <p>Menarik task dari semua workspace aktif.</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="mentor-session-empty">
          <span className="material-symbols-outlined">task_alt</span>
          <h3>Belum ada task dari mentee</h3>
          <p>Task yang dibuat di workspace UMKM akan muncul di sini.</p>
        </div>
      ) : (
        <section className="mentor-task-list-panel mentor-task-board-panel">
          <header>
            <div>
              <span>Daftar Task Mentee</span>
              <h3>{tasks.length} task dari {workspaceCount} workspace</h3>
            </div>
            <strong>{tasks.filter((task) => task.status === 'Done').length}/{tasks.length} selesai</strong>
          </header>

          <div className="mentor-task-list mentor-task-list-compact">
            {groupedTasks.map((group) => (
              <section key={group.key} className="mentor-task-group">
                <header className="mentor-task-group-head">
                  <h4>{group.label}</h4>
                  <span>{group.tasks.length} task</span>
                </header>

                <div className="mentor-task-group-list">
                  {group.tasks.map((task) => (
                    <article key={task.id} className="mentor-task-card mentor-task-card-compact">
                      <div className="mentor-task-main">
                        <div className="mentor-task-topline">
                          <span className={`mentor-task-status ${String(task.status).toLowerCase().replace(/\s+/g, '-')}`}>{task.status}</span>
                          <small>{task.deadlineLabel}</small>
                        </div>
                        <h3>{task.title}</h3>
                        <p>{task.instruction}</p>
                        <div className="mentor-task-meta-row">
                          <span>Mentee: {task.workspaceLabel}</span>
                          <span>Priority: {task.priority}</span>
                        </div>
                        <div className={`mentor-task-submission-pill ${task.submission ? String(task.submission.submissionStatus).toLowerCase() : 'empty'}`}>
                          {task.submission ? (
                            <>
                              <span className="material-symbols-outlined">task_alt</span>
                              {task.submission.submissionStatus === 'Late' ? 'Terlambat mengumpulkan' : 'Sudah mengumpulkan'}
                            </>
                          ) : (
                            <>
                              <span className="material-symbols-outlined">schedule</span>
                              Belum mengumpulkan
                            </>
                          )}
                        </div>
                      </div>

                      <aside className="mentor-task-side mentor-task-side-compact">
                        {task.submission ? (
                          <div className={`mentor-task-submission ${String(task.submission.submissionStatus).toLowerCase()}`}>
                            <span>{formatDateOnly(task.submission.submittedAt)}</span>
                            {task.submission.fileName && (
                              <a href={task.submission.fileUrl} target="_blank" rel="noreferrer">
                                <span className="material-symbols-outlined">download</span>
                                {task.submission.fileName}
                              </a>
                            )}
                          </div>
                        ) : null}

                        <button
                          type="button"
                          className="mentor-task-workspace-btn"
                          onClick={() => navigate(buildMentorWorkspaceUrl(task.workspaceId, 'tasks'))}
                        >
                          <span className="material-symbols-outlined" aria-hidden="true">workspaces</span>
                          Go to Workspace
                        </button>
                      </aside>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function MentorMessagesView({ workspaces }) {
  const navigate = useNavigate()
  const [threads, setThreads] = useState([])
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState('')
  const [draftMessage, setDraftMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    if (!Array.isArray(workspaces) || workspaces.length === 0) {
      setThreads([])
      setSelectedWorkspaceId('')
      setLoading(false)
      return () => { active = false }
    }

    setLoading(true)
    setError('')

    Promise.all(
      workspaces.map(async (workspace) => {
        const messageRows = await getWorkspaceMessages(workspace.id)
        const messages = messageRows.map((message) => normalizeMentorChatMessage(message))
        const latestMessage = [...messages].reverse().find(Boolean) || null
        return {
          workspaceId: workspace.id,
          workspaceLabel: workspace.umkm?.businessName || workspace.businessName || workspace.ownerName || 'UMKM',
          ownerName: workspace.umkm?.name || workspace.ownerName || 'Pemilik UMKM',
          topic: workspace.topic || 'Mentoring bisnis',
          status: workspace.status || 'Active',
          messages,
          latestMessage,
          sortKey: latestMessage?.createdAt ? new Date(latestMessage.createdAt).getTime() : 0,
        }
      }),
    )
      .then((threadRows) => {
        if (!active) return
        const nextThreads = threadRows
          .sort((a, b) => b.sortKey - a.sortKey)
        setThreads(nextThreads)
        setSelectedWorkspaceId((current) => current || nextThreads[0]?.workspaceId || '')
      })
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false))

    return () => { active = false }
  }, [workspaces])

  const activeThread = useMemo(() => (
    threads.find((thread) => String(thread.workspaceId) === String(selectedWorkspaceId)) || threads[0] || null
  ), [selectedWorkspaceId, threads])

  useEffect(() => {
    if (!activeThread && threads.length > 0) {
      setSelectedWorkspaceId(threads[0].workspaceId)
    }
  }, [activeThread, threads])

  async function sendMessage(event) {
    event.preventDefault()
    const text = draftMessage.trim()
    if (!text || !activeThread) return

    try {
      setError('')
      setDraftMessage('')
      const message = await sendWorkspaceMessage(activeThread.workspaceId, text)
      const normalizedMessage = normalizeMentorChatMessage(message)
      setThreads((current) => current.map((thread) => {
        if (String(thread.workspaceId) !== String(activeThread.workspaceId)) return thread
        const nextMessages = [...thread.messages, normalizedMessage]
        return {
          ...thread,
          messages: nextMessages,
          latestMessage: normalizedMessage,
          sortKey: normalizedMessage.createdAt ? new Date(normalizedMessage.createdAt).getTime() : thread.sortKey,
        }
      }).sort((a, b) => b.sortKey - a.sortKey))
    } catch (err) {
      setDraftMessage(text)
      setError(err.message)
    }
  }

  return (
    <section className="mentor-message-board-page">
      <div className="mentor-message-board-header">
        <div>
          <span>Mentoring</span>
          <h2>Messages</h2>
          <p>Semua chat dari workspace mentor tampil di sini seperti inbox, jadi Anda bisa pindah antar percakapan tanpa membuka workspace satu per satu.</p>
        </div>
        <div className="mentor-message-board-summary">
          <strong>{threads.length}</strong>
          <span>Workspace chat</span>
        </div>
      </div>

      {error && <p className="mentor-alert error">{error}</p>}

      {loading ? (
        <div className="mentor-session-empty">
          <span className="material-symbols-outlined">hourglass_top</span>
          <h3>Memuat semua chat...</h3>
          <p>Menggabungkan percakapan dari seluruh workspace mentor.</p>
        </div>
      ) : threads.length === 0 ? (
        <div className="mentor-session-empty">
          <span className="material-symbols-outlined">chat</span>
          <h3>Belum ada chat workspace</h3>
          <p>Ketika ada percakapan di workspace UMKM, chat akan muncul di sini.</p>
        </div>
      ) : (
        <div className="mentor-message-board">
          <aside className="mentor-message-thread-list">
            {threads.map((thread) => {
              const isActive = String(thread.workspaceId) === String(activeThread?.workspaceId)
              return (
                <button
                  key={thread.workspaceId}
                  type="button"
                  className={`mentor-message-thread ${isActive ? 'active' : ''}`}
                  onClick={() => setSelectedWorkspaceId(thread.workspaceId)}
                >
                  <div className="mentor-message-thread-avatar">
                    {getInitials(thread.workspaceLabel)}
                  </div>
                  <div className="mentor-message-thread-copy">
                    <div className="mentor-message-thread-topline">
                      <strong>{thread.workspaceLabel}</strong>
                      <small>{thread.status}</small>
                    </div>
                    <p>{thread.latestMessage?.text || 'Belum ada pesan terbaru.'}</p>
                    <span>{thread.topic}</span>
                  </div>
                </button>
              )
            })}
          </aside>

          <section className="mentor-message-chat-panel">
            <div className="mentor-message-chat-head">
              <div>
                <span>Workspace chat</span>
                <h3>{activeThread?.workspaceLabel || '-'}</h3>
                <p>{activeThread?.topic || '-'}</p>
              </div>
              <button type="button" className="secondary" onClick={() => activeThread && navigate(buildMentorWorkspaceUrl(activeThread.workspaceId, 'chat'))}>
                Buka Workspace
              </button>
            </div>

            <div className="mentor-message-chat-history">
              {activeThread?.messages?.length ? activeThread.messages.map((message) => (
                <article key={message.id} className={`mentor-message-bubble ${message.sender === 'Mentor' ? 'me' : ''}`}>
                  <strong>{message.sender}</strong>
                  <p>{message.text}</p>
                  <span>{message.time}</span>
                </article>
              )) : (
                <div className="mentor-session-empty">
                  <span className="material-symbols-outlined">chat_bubble</span>
                  <h3>Belum ada pesan di workspace ini</h3>
                  <p>Mulai percakapan dari composer di bawah.</p>
                </div>
              )}
            </div>

            <form className="mentor-message-composer" onSubmit={sendMessage}>
              <input
                value={draftMessage}
                onChange={(event) => setDraftMessage(event.target.value)}
                placeholder="Tulis pesan untuk UMKM..."
              />
              <button type="submit" disabled={!activeThread}>Kirim</button>
            </form>
          </section>
        </div>
      )}
    </section>
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

function InfoBlockMentor({ title, value }) {
  return (
    <div>
      <strong>{title}</strong>
      <p>{value || '-'}</p>
    </div>
  )
}

function MentorPlaceholderPage({ copy, icon, title }) {
  return (
    <section className="mentor-placeholder-page">
      <span className="material-symbols-outlined">{icon}</span>
      <h2>{title}</h2>
      <p>{copy}</p>
    </section>
  )
}

function MentorRequestsView({ onOpenAccept, onOpenReject, requests }) {
  const navigate = useNavigate()
  const normalizedRequests = requests
  const pendingRequests = normalizedRequests.filter((request) => normalizeMentorRequestStatus(request.status) === 'Pending')
  const featuredRequest = pendingRequests[0] || normalizedRequests[0]

  return (
    <section className="mentor-requests-page">
      <div className="mentor-requests-header">
        <div>
          <h2>Request Masuk</h2>
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

      {normalizedRequests.length === 0 ? (
        <div className="mentor-empty-state">
          <span className="material-symbols-outlined">inbox</span>
          <p>Belum ada request mentoring dari UMKM.</p>
        </div>
      ) : (
        <>
          <div className="mentor-incoming-list">
            {normalizedRequests.map((request) => {
              const normalizedRequest = normalizeIncomingMentorRequest(request)
              const statusMeta = getRequestStatusMeta(normalizedRequest.status)

              return (
                <article key={normalizedRequest.id} className="mentor-incoming-card">
                  <div className="mentor-incoming-main">
                    <div className="mentor-request-card-top">
                      <div className="mentor-request-identity">
                        <div className="mentor-request-logo">{getInitials(normalizedRequest.businessName)}</div>
                        <div>
                          <h3>{normalizedRequest.businessName}</h3>
                          <div className="mentor-request-badges">
                            <span>{normalizedRequest.category}</span>
                            <span className={statusMeta.className}>{statusMeta.label}</span>
                          </div>
                        </div>
                      </div>
                      <time>{formatRequestAge(normalizedRequest.requestDate)}</time>
                    </div>

                    <dl className="mentor-incoming-details">
                      <div><dt>Nama UMKM</dt><dd>{normalizedRequest.businessName}</dd></div>
                      <div><dt>Nama Pemilik</dt><dd>{normalizedRequest.ownerName}</dd></div>
                      <div><dt>Lokasi</dt><dd>{normalizedRequest.location}</dd></div>
                      <div><dt>Bidang Usaha</dt><dd>{normalizedRequest.category}</dd></div>
                      <div><dt>Topik Mentoring</dt><dd>{normalizedRequest.topic}</dd></div>
                      <div><dt>Durasi Mentoring</dt><dd>{normalizedRequest.duration}</dd></div>
                      <div><dt>Preferensi Jadwal</dt><dd>{normalizedRequest.schedulePreference}</dd></div>
                      <div><dt>Tanggal Request</dt><dd>{formatDateOnly(normalizedRequest.requestDate)}</dd></div>
                      <div><dt>Status Request</dt><dd>{statusMeta.label}</dd></div>
                    </dl>

                    <div className="mentor-incoming-story">
                      <InfoBlockMentor title="Masalah Bisnis" value={normalizedRequest.businessProblem} />
                      <InfoBlockMentor title="Tujuan Mentoring" value={normalizedRequest.mentoringGoal} />
                      <InfoBlockMentor title="Pesan Tambahan" value={normalizedRequest.additionalMessage} />
                    </div>
                  </div>

                  <div className="mentor-incoming-actions">
                    <button type="button" className="outline" onClick={() => navigate(`/dashboard/mentor/requests/${request.id}`)}>
                      Lihat Detail
                    </button>
                    {normalizedRequest.status === 'Pending' ? (
                      <>
                        <button type="button" className="primary" onClick={() => onOpenAccept(request)}>
                          Terima
                        </button>
                        <button type="button" className="danger" onClick={() => onOpenReject(request)}>
                          Tolak
                        </button>
                      </>
                    ) : (
                      <span className={`mentor-request-status ${statusMeta.className}`}>{statusMeta.label}</span>
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

function MentorMenteesView({ requests, workspaces }) {
  const navigate = useNavigate()
  const [activeFilter, setActiveFilter] = useState('Aktif')
  const mentees = useMemo(() => getMentorMenteeRecordsFromWorkspaces(workspaces, requests), [requests, workspaces])
  const tabs = useMemo(() => {
    return mentorMenteeTabs.map((tab) => ({
      ...tab,
      count: mentees.filter((mentee) => tab.statuses.includes('all') || tab.statuses.includes(mentee.status)).length,
    }))
  }, [mentees])
  const filteredMentees = useMemo(() => {
    const tab = mentorMenteeTabs.find((item) => item.label === activeFilter)
    if (!tab || tab.statuses.includes('all')) return mentees
    return mentees.filter((mentee) => tab.statuses.includes(mentee.status))
  }, [activeFilter, mentees])

  return (
    <section className="mentor-mentees-page">
      <div className="mentor-mentees-header">
        <div>
          <h2>Mentee Saya</h2>
          <p>Daftar UMKM yang request mentoringnya sudah diterima, aktif, selesai, atau dibatalkan.</p>
        </div>
        <span>{mentees.length} UMKM</span>
      </div>

      <div className="mentor-mentee-tabs" role="tablist" aria-label="Filter mentee mentor">
        {tabs.map((tab) => (
          <button key={tab.label} type="button" className={activeFilter === tab.label ? 'active' : ''} onClick={() => setActiveFilter(tab.label)}>
            {tab.label}
            <span>{tab.count}</span>
          </button>
        ))}
      </div>

      {filteredMentees.length === 0 ? (
        <div className="mentor-empty-state">
          <span className="material-symbols-outlined">groups</span>
          <p>Belum ada mentee pada kategori ini.</p>
        </div>
      ) : (
        <div className="mentor-mentee-grid">
          {filteredMentees.map((mentee) => (
            <article key={mentee.id} className="mentor-mentee-card">
              <header>
                <div className="mentor-request-logo">{getInitials(mentee.businessName)}</div>
                <div>
                  <span className={`mentor-mentee-status ${mentee.status.toLowerCase()}`}>{mentee.status}</span>
                  <h3>{mentee.businessName}</h3>
                  <p>{mentee.ownerName}</p>
                </div>
              </header>

              <dl className="mentor-mentee-details">
                <div><dt>Lokasi</dt><dd>{mentee.location}</dd></div>
                <div><dt>Bidang Usaha</dt><dd>{mentee.category}</dd></div>
                <div><dt>Topik</dt><dd>{mentee.topic}</dd></div>
                <div><dt>Periode</dt><dd>{mentee.period}</dd></div>
                <div><dt>Sesi</dt><dd>{mentee.completedSessions} / {mentee.totalSessions}</dd></div>
                <div><dt>Task</dt><dd>{mentee.completedTasks} / {mentee.totalTasks}</dd></div>
              </dl>

              <div className="mentor-mentee-progress">
                <div>
                  <span>Progress terakhir</span>
                  <strong>{mentee.progress}%</strong>
                </div>
                <i><b style={{ width: `${mentee.progress}%` }} /></i>
                <p>{mentee.lastProgress}</p>
              </div>

              <button type="button" onClick={() => navigate(buildMentorWorkspaceUrl(mentee.id, 'tasks'))}>
                <span className="material-symbols-outlined">workspaces</span>
                Buka Workspace
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

function MentorWorkspacePlaceholder({ mentoringId }) {
  const navigate = useNavigate()
  const location = useLocation()
  const initialWorkspace = useMemo(() => buildMentorWorkspaceData(mentoringId), [mentoringId])
  const [workspace, setWorkspace] = useState(initialWorkspace)
  const activeTab = getWorkspaceTabFromSearch(location.search)
  const [sessions, setSessions] = useState(initialWorkspace.sessions)
  const [tasks, setTasks] = useState(initialWorkspace.tasks)
  const [notes, setNotes] = useState(initialWorkspace.notes)
  const [progressList, setProgressList] = useState(initialWorkspace.progressList)
  const [messages, setMessages] = useState(initialWorkspace.messages)
  const [files, setFiles] = useState(initialWorkspace.files)
  const [fileForm, setFileForm] = useState({ title: '', description: '', file: null, fileName: '' })
  const [sessionForm, setSessionForm] = useState(defaultMentorSessionForm)
  const [noteForm, setNoteForm] = useState(defaultMentorNoteForm)
  const [taskForm, setTaskForm] = useState(defaultMentorTaskForm)
  const [editingTaskId, setEditingTaskId] = useState(null)
  const [commentingTaskId, setCommentingTaskId] = useState(null)
  const [taskCommentDrafts, setTaskCommentDrafts] = useState({})
  const [editingSession, setEditingSession] = useState(null)
  const [sessionEditForm, setSessionEditForm] = useState(defaultMentorSessionForm)
  const [cancellingSession, setCancellingSession] = useState(null)
  const [sessionCancelReason, setSessionCancelReason] = useState('')
  const [chatInput, setChatInput] = useState('')
  const [completionForm, setCompletionForm] = useState(defaultMentorCompletionForm)
  const [loading, setLoading] = useState(true)
  const [workspaceError, setWorkspaceError] = useState('')

  function openWorkspaceTab(tab) {
    navigate({ pathname: location.pathname, search: buildWorkspaceTabSearch(tab) })
  }

  const reloadWorkspaceData = useCallback(async () => {
    setWorkspaceError('')
    const [workspaceData, sessionsData, tasksData, notesData, progressData, messagesData, filesData] = await Promise.all([
      getWorkspace(mentoringId),
      getWorkspaceSessions(mentoringId),
      getWorkspaceTasks(mentoringId),
      getWorkspaceNotes(mentoringId),
      getWorkspaceProgress(mentoringId),
      getWorkspaceMessages(mentoringId),
      getWorkspaceFiles(mentoringId),
    ])
    setWorkspace((current) => ({ ...current, ...normalizeApiMentorWorkspace(workspaceData) }))
    setSessions(sessionsData.map(normalizeMentorApiSession))
    setTasks(tasksData.map(normalizeMentorApiTask))
    setNotes(notesData.map(normalizeMentorApiNote))
    setProgressList(progressData.map(normalizeMentorApiProgress))
    setMessages(messagesData.map(normalizeMentorChatMessage))
    setFiles(filesData.map(normalizeMentorWorkspaceFile))
  }, [mentoringId])

  useEffect(() => {
    let active = true
    setLoading(true)
    reloadWorkspaceData()
      .catch((err) => active && setWorkspaceError(err.message))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [reloadWorkspaceData])

  useEffect(() => {
    const socket = getMentoringSocket()
    if (!socket || !mentoringId) return undefined

    const handleMessage = (message) => {
      if (String(message.workspaceId) !== String(mentoringId)) return
      setMessages((current) => {
        if (current.some((item) => String(item.id) === String(message.id))) return current
        return [...current, normalizeMentorChatMessage(message)]
      })
    }

    socket.emit('mentoring:join', mentoringId)
    socket.on('mentoring:message', handleMessage)
    return () => {
      socket.emit('mentoring:leave', mentoringId)
      socket.off('mentoring:message', handleMessage)
    }
  }, [mentoringId])

  const progress = calculateMentorWorkspaceProgress(tasks, sessions)
  const nextSession = sessions.find((session) => session.status === 'Upcoming' || session.status === 'Rescheduled')
  const activeTasks = tasks.filter((task) => task.status !== 'Done')
  const completedTasks = tasks.filter((task) => task.status === 'Done').length
  const completedSessions = sessions.filter((session) => session.status === 'Completed').length
  const submittedTasks = tasks.filter((task) => task.submission).length
  const isWorkspaceLocked = ['Completed', 'Cancelled'].includes(workspace.status)
  const groupedTasks = useMemo(() => groupMentorTasksByDeadline(tasks), [tasks])

  function updateSessionForm(field, value) {
    setSessionForm((current) => ({ ...current, [field]: value }))
  }

  async function addSession(event) {
    event.preventDefault()
    try {
      await createWorkspaceSession(mentoringId, sessionForm)
      setSessionForm(defaultMentorSessionForm)
      await reloadWorkspaceData()
    } catch (err) {
      setWorkspaceError(err.message)
    }
  }

  async function updateSessionStatus(sessionId, status, reason = '') {
    try {
      if (status === 'Completed') await completeSession(sessionId)
      else if (status === 'Cancelled') await cancelSession(sessionId, reason)
      else await updateSession(sessionId, { status })
      await reloadWorkspaceData()
    } catch (err) {
      setWorkspaceError(err.message)
    }
  }

  function editSession(sessionId) {
    const session = sessions.find((item) => item.id === sessionId)
    if (!session) return
    setEditingSession(session)
    setSessionEditForm({
      title: session.title || '',
      date: toDateInputValue(new Date(session.date || new Date())),
      startTime: normalizeTimeInput(session.startTime || session.timeStart || ''),
      endTime: normalizeTimeInput(session.endTime || session.timeEnd || ''),
      platform: session.platform || 'Google Meet',
      meetingLink: session.meetingLink || '',
      agenda: session.agenda || '',
    })
  }

  function updateSessionEditField(field, value) {
    setSessionEditForm((current) => ({ ...current, [field]: value }))
  }

  async function submitSessionEdit(event) {
    event.preventDefault()
    if (!editingSession) return
    try {
      await updateSession(editingSession.id, sessionEditForm)
      setEditingSession(null)
      await reloadWorkspaceData()
    } catch (err) {
      setWorkspaceError(err.message)
    }
  }

  function openCancelSession(session) {
    setCancellingSession(session)
    setSessionCancelReason('')
  }

  async function submitSessionCancel(event) {
    event.preventDefault()
    if (!cancellingSession) return
    try {
      await cancelSession(cancellingSession.id, sessionCancelReason)
      setCancellingSession(null)
      setSessionCancelReason('')
      await reloadWorkspaceData()
    } catch (err) {
      setWorkspaceError(err.message)
    }
  }

  function updateNoteForm(field, value) {
    setNoteForm((current) => ({ ...current, [field]: value }))
  }

  async function addNote(event) {
    event.preventDefault()
    try {
      await createMentorNote(mentoringId, {
        sessionId: noteForm.sessionId || null,
        evaluation: noteForm.evaluation,
        obstacleFound: noteForm.blocker,
        advice: noteForm.advice,
        nextRecommendation: noteForm.nextRecommendation,
      })
      setNoteForm(defaultMentorNoteForm)
      await reloadWorkspaceData()
    } catch (err) {
      setWorkspaceError(err.message)
    }
  }

  function updateTaskForm(field, value) {
    setTaskForm((current) => ({ ...current, [field]: value }))
  }

  async function addTask(event) {
    event.preventDefault()
    try {
      const payload = {
        title: taskForm.title,
        instruction: taskForm.instruction,
        deadline: taskForm.deadline,
      }
      if (editingTaskId) await updateTask(editingTaskId, payload)
      else await createWorkspaceTask(mentoringId, payload)
      setEditingTaskId(null)
      setTaskForm(defaultMentorTaskForm)
      await reloadWorkspaceData()
    } catch (err) {
      setWorkspaceError(err.message)
    }
  }

  function editTask(taskId) {
    const task = tasks.find((item) => item.id === taskId)
    if (!task) return
    setEditingTaskId(task.id)
    setTaskForm({
      title: task.title || '',
      instruction: task.instruction || '',
      deadline: toDateInputValue(new Date(task.deadline || new Date())),
    })
  }

  function cancelTaskEdit() {
    setEditingTaskId(null)
    setTaskForm(defaultMentorTaskForm)
  }

  async function deleteTask(taskId) {
    if (!window.confirm('Hapus task ini? UMKM tidak akan melihat task ini lagi.')) return
    try {
      await deleteMentoringTask(taskId)
      await reloadWorkspaceData()
    } catch (err) {
      setWorkspaceError(err.message)
    }
  }

  function commentTask(taskId) {
    const task = tasks.find((item) => item.id === taskId)
    setCommentingTaskId((current) => current === taskId ? null : taskId)
    setTaskCommentDrafts((current) => ({
      ...current,
      [taskId]: current[taskId] ?? task?.comment ?? '',
    }))
  }

  async function saveTaskComment(taskId) {
    try {
      await updateTask(taskId, { mentorComment: taskCommentDrafts[taskId] || '' })
      setCommentingTaskId(null)
      await reloadWorkspaceData()
    } catch (err) {
      setWorkspaceError(err.message)
    }
  }

  async function addRecommendation(progressId) {
    try {
      await updateProgressRecommendation(progressId, 'Fokus pada channel dengan order tertinggi dan ulangi eksperimen selama 7 hari.')
      await reloadWorkspaceData()
    } catch (err) {
      setWorkspaceError(err.message)
    }
  }

  async function sendMessage(event) {
    event.preventDefault()
    const text = chatInput.trim()
    if (!text) return
    try {
      setChatInput('')
      const message = await sendWorkspaceMessage(mentoringId, text)
      setMessages((current) => {
        if (current.some((item) => String(item.id) === String(message.id))) return current
        return [...current, normalizeMentorChatMessage(message)]
      })
    } catch (err) {
      setChatInput(text)
      setWorkspaceError(err.message)
    }
  }

  function updateFileForm(field, value) {
    setFileForm((current) => ({ ...current, [field]: value }))
  }

  async function uploadMaterial(event) {
    event.preventDefault()
    if (!fileForm.file) {
      setWorkspaceError('Pilih file materi terlebih dahulu.')
      return
    }

    try {
      setWorkspaceError('')
      await uploadWorkspaceFile(mentoringId, {
        file: fileForm.file,
        title: fileForm.title || fileForm.fileName,
        description: fileForm.description,
      })
      setFileForm({ title: '', description: '', file: null, fileName: '' })
      await reloadWorkspaceData()
    } catch (err) {
      setWorkspaceError(err.message)
    }
  }

  function updateCompletionField(field, value) {
    setCompletionForm((current) => ({ ...current, [field]: value }))
  }

  async function completeMentoring(event) {
    event.preventDefault()
    try {
      await completeWorkspace(mentoringId, {
        finalEvaluation: completionForm.finalEvaluation,
        finalRecommendation: completionForm.nextRecommendation || completionForm.closingNote,
      })
      await reloadWorkspaceData()
    } catch (err) {
      setWorkspaceError(err.message)
    }
  }

  if (loading) return <section className="mentor-placeholder-page"><span className="material-symbols-outlined">hourglass_top</span><h2>Memuat workspace...</h2><p>Data mentoring sedang diambil dari server.</p></section>

  return (
    <section className="mentor-workspace-page">
      <aside className="mentor-workspace-menu">
        <span>Workspace Menu</span>
        <nav className="mentor-workspace-tabs" aria-label="Workspace mentor tabs">
        {mentorWorkspaceTabs.map((tab) => (
          <button key={tab} type="button" className={activeTab === tab ? 'active' : ''} onClick={() => openWorkspaceTab(tab)}>
            <span className="material-symbols-outlined">{getMentorWorkspaceTabIcon(tab)}</span>
            {tab}
          </button>
        ))}
        </nav>
      </aside>

      <div className="mentor-workspace-content">
        {workspaceError && <p className="mentor-alert error">{workspaceError}</p>}
        <header className="mentor-workspace-header">
          <div className="mentor-workspace-business-card">
            <div className="mentor-workspace-avatar">
              <span className="material-symbols-outlined">storefront</span>
            </div>
            <div>
              <span>Workspace Mentoring</span>
              <h2>{workspace.businessName}</h2>
              <p>{workspace.ownerName}</p>
              <strong>{workspace.topic}</strong>
            </div>
          </div>
          <div className="mentor-workspace-stat-card">
            <span>Status</span>
            <strong>{workspace.status}</strong>
            <small>Progress mentoring</small>
            <i><b style={{ width: `${progress}%` }} /></i>
            <em>{progress}%</em>
          </div>
          <div className="mentor-workspace-stat-card">
            <span>Periode Program</span>
            <strong>{workspace.period}</strong>
            <small>Remaining Time</small>
            <em>{getMentorRemainingWorkspaceTime(workspace.endDate, workspace.status)}</em>
          </div>
        </header>

      {activeTab === 'Overview' && (
        <section className="mentor-overview-dashboard">
          <div className="mentor-overview-hero">
            <div>
              <span>Mentoring Snapshot</span>
              <h3>{workspace.topic}</h3>
              <p>{workspace.businessSummary}</p>
            </div>
            <strong>{workspace.status}</strong>
          </div>
          <div className="mentor-overview-metrics">
            <article><span>Sesi selesai</span><strong>{completedSessions}/{sessions.length}</strong><p>{nextSession ? `Next: ${nextSession.title}` : 'Belum ada sesi berikutnya'}</p></article>
            <article><span>Task selesai</span><strong>{completedTasks}/{tasks.length}</strong><p>{submittedTasks} task sudah dikumpulkan UMKM</p></article>
            <article><span>Materi</span><strong>{files.length}</strong><p>File sharing tersedia untuk UMKM</p></article>
            <article><span>Catatan</span><strong>{notes.length}</strong><p>Catatan mentor tersimpan</p></article>
          </div>
          <div className="mentor-overview-columns">
            <article className="mentor-overview-panel">
              <header><span className="material-symbols-outlined">flag</span><h3>Tujuan Mentoring</h3></header>
              <p>{workspace.goal || '-'}</p>
            </article>
            <article className="mentor-overview-panel">
              <header><span className="material-symbols-outlined">event_available</span><h3>Sesi Berikutnya</h3></header>
              <p>{nextSession ? `${nextSession.title} • ${formatDateOnly(nextSession.date)} • ${nextSession.startTime || nextSession.time || '-'}` : 'Belum ada sesi berikutnya.'}</p>
            </article>
            <article className="mentor-overview-panel wide">
              <header><span className="material-symbols-outlined">assignment</span><h3>Task Aktif</h3></header>
              {activeTasks.length ? (
                <ul>{activeTasks.slice(0, 4).map((task) => <li key={task.id}>{task.title}<span>{formatDateOnly(task.deadline)}</span></li>)}</ul>
              ) : <p>Tidak ada task aktif saat ini.</p>}
            </article>
          </div>
        </section>
      )}

      {activeTab === 'Profil UMKM' && (
        <div className="mentor-workspace-grid">
          {workspace.profileItems.map((item) => <WorkspaceInfoCard key={item.label} title={item.label} value={item.value} />)}
        </div>
      )}

      {activeTab === 'Jadwal Sesi' && (
        <div className="mentor-session-workspace">
          <form className="mentor-workspace-form mentor-session-form-wide" onSubmit={addSession}>
            <div className="mentor-session-form-head">
              <div>
                <span>Schedule Builder</span>
                <h3>Tambah Sesi</h3>
                <p>Jadwalkan sesi mentoring dengan informasi yang jelas agar UMKM mudah mengikuti agenda.</p>
              </div>
            </div>
            {isWorkspaceLocked && (
              <div className="mentor-session-lock-note">
                <span className="material-symbols-outlined">lock</span>
                <p>Workspace berstatus {workspace.status}, sehingga sesi baru tidak bisa ditambahkan. Tanggal sesi mendatang tetap tidak dapat disimpan selama workspace belum Active.</p>
              </div>
            )}
            <label>Judul sesi<input value={sessionForm.title} onChange={(event) => updateSessionForm('title', event.target.value)} required /></label>
            <div className="mentor-flow-grid">
              <label>Tanggal<input type="date" value={sessionForm.date} onChange={(event) => updateSessionForm('date', event.target.value)} required /></label>
              <label>Jam mulai<input type="time" value={sessionForm.startTime} onChange={(event) => updateSessionForm('startTime', event.target.value)} required /></label>
              <label>Jam selesai<input type="time" value={sessionForm.endTime} onChange={(event) => updateSessionForm('endTime', event.target.value)} required /></label>
              <label>Platform<select value={sessionForm.platform} onChange={(event) => updateSessionForm('platform', event.target.value)}><option>Google Meet</option><option>Zoom</option><option>Lainnya</option></select></label>
            </div>
            <label>Link meeting<input value={sessionForm.meetingLink} onChange={(event) => updateSessionForm('meetingLink', event.target.value)} /></label>
            <label>Agenda<textarea value={sessionForm.agenda} onChange={(event) => updateSessionForm('agenda', event.target.value)} /></label>
            <button type="submit" disabled={isWorkspaceLocked}>Tambah Sesi</button>
          </form>
          <section className="mentor-session-list-panel">
            <header>
              <div>
                <span>Daftar Sesi</span>
                <h3>{sessions.length} sesi mentoring</h3>
              </div>
              <strong>{sessions.filter((session) => session.status === 'Completed').length}/{sessions.length} selesai</strong>
            </header>
            <div className="mentor-session-list">
              {sessions.length === 0 ? (
                <article className="mentor-session-empty">
                  <span className="material-symbols-outlined">event_busy</span>
                  <h3>Belum ada sesi</h3>
                  <p>Tambahkan sesi pertama agar jadwal mentoring terlihat oleh UMKM.</p>
                </article>
              ) : sessions.map((session) => (
                <article key={session.id} className="mentor-session-card">
                  <div className="mentor-session-card-main">
                    <div className="mentor-session-topline">
                      <span className={`mentor-session-status ${String(session.status).toLowerCase()}`}>{session.status}</span>
                      <small>{session.platform || '-'}</small>
                    </div>
                    <h3>{session.title}</h3>
                    <p>{session.agenda || 'Belum ada agenda sesi.'}</p>
                    {session.cancellationReason && (
                      <div className="mentor-session-cancel-reason">
                        <span className="material-symbols-outlined">info</span>
                        <p>{session.cancellationReason}</p>
                      </div>
                    )}
                  </div>
                  <aside className="mentor-session-card-side">
                    <div className="mentor-session-meta-grid">
                      <div><span>Tanggal</span><strong>{formatDateOnly(session.date)}</strong></div>
                      <div><span>Waktu</span><strong>{formatTimeRange(session)}</strong></div>
                      <div><span>Meeting</span><strong>{session.meetingLink ? 'Link tersedia' : 'Belum ada link'}</strong></div>
                    </div>
                    <div className="mentor-session-actions">
                      <button type="button" onClick={() => editSession(session.id)}>Edit</button>
                      <button type="button" className="danger" onClick={() => openCancelSession(session)} disabled={session.status === 'Cancelled' || session.status === 'Completed'}>Batalkan</button>
                      <button type="button" className="secondary" onClick={() => updateSessionStatus(session.id, 'Completed')} disabled={session.status === 'Completed' || session.status === 'Cancelled'}>Selesai</button>
                    </div>
                  </aside>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}

      {activeTab === 'Catatan Mentor' && (
        <div className="mentor-workspace-two-col">
          <form className="mentor-workspace-form" onSubmit={addNote}>
            <h3>Catatan Mentor</h3>
            <label>Pilih sesi<select value={noteForm.sessionId} onChange={(event) => updateNoteForm('sessionId', event.target.value)}>{sessions.map((session) => <option key={session.id} value={session.id}>{session.title}</option>)}</select></label>
            <label>Evaluasi kondisi UMKM<textarea value={noteForm.evaluation} onChange={(event) => updateNoteForm('evaluation', event.target.value)} required /></label>
            <label>Kendala ditemukan<textarea value={noteForm.blocker} onChange={(event) => updateNoteForm('blocker', event.target.value)} /></label>
            <label>Saran<textarea value={noteForm.advice} onChange={(event) => updateNoteForm('advice', event.target.value)} required /></label>
            <label>Rekomendasi strategi berikutnya<textarea value={noteForm.nextRecommendation} onChange={(event) => updateNoteForm('nextRecommendation', event.target.value)} /></label>
            <button type="submit">Simpan Catatan</button>
          </form>
          <div className="mentor-workspace-list">
            {notes.map((note) => <article key={note.id}><h3>{note.sessionTitle}</h3><p>{note.evaluation}</p><small>{note.advice}</small></article>)}
          </div>
        </div>
      )}

      {activeTab === 'Task & Action Plan' && (
        <div className="mentor-task-workspace">
          <form className="mentor-workspace-form mentor-task-form-wide" onSubmit={addTask}>
            <div className="mentor-task-form-head">
              <div>
                <span>Action Plan</span>
                <h3>{editingTaskId ? 'Edit Task' : 'Tambah Task'}</h3>
                <p>{editingTaskId ? 'Perubahan task akan langsung terlihat di workspace UMKM.' : 'Buat task yang jelas, terukur, dan mudah dikumpulkan oleh UMKM.'}</p>
              </div>
              {editingTaskId && <button type="button" className="secondary" onClick={cancelTaskEdit}>Batal Edit</button>}
            </div>
            <div className="mentor-task-form-grid">
              <label>Judul task<input value={taskForm.title} onChange={(event) => updateTaskForm('title', event.target.value)} required /></label>
              <label>Deadline<input type="date" value={taskForm.deadline} onChange={(event) => updateTaskForm('deadline', event.target.value)} required /></label>
            </div>
            <label>Instruksi detail<textarea value={taskForm.instruction} onChange={(event) => updateTaskForm('instruction', event.target.value)} required /></label>
            <button type="submit">{editingTaskId ? 'Simpan Perubahan' : 'Tambah Task'}</button>
          </form>
          <section className="mentor-task-list-panel">
            <header>
              <div>
                <span>Daftar Task</span>
                <h3>{tasks.length} task mentoring</h3>
              </div>
              <strong>{tasks.filter((task) => task.status === 'Done').length}/{tasks.length} selesai</strong>
            </header>
            <div className="mentor-task-list mentor-task-list-compact">
              {tasks.length === 0 ? (
                <article className="mentor-task-empty">
                  <span className="material-symbols-outlined">assignment</span>
                  <h3>Belum ada task</h3>
                  <p>Tambahkan task pertama agar UMKM punya action plan yang bisa dikerjakan.</p>
                </article>
              ) : groupedTasks.map((group) => (
                <section key={group.key} className="mentor-task-group">
                  <header className="mentor-task-group-head">
                    <h4>{group.label}</h4>
                    <span>{group.tasks.length} task</span>
                  </header>
                  <div className="mentor-task-group-list">
                    {group.tasks.map((task) => (
                      <article key={task.id} className="mentor-task-card mentor-task-card-compact">
                        <div className="mentor-task-main">
                          <div className="mentor-task-topline">
                            <span className={`mentor-task-status ${String(task.status).toLowerCase().replace(/\s+/g, '-')}`}>{task.status}</span>
                            <small>Deadline {formatDateOnly(task.deadline)}</small>
                          </div>
                          <h3>{task.title}</h3>
                          <p>{task.instruction}</p>
                          <div className={`mentor-task-submission-pill ${task.submission ? String(task.submission.submissionStatus).toLowerCase() : 'empty'}`}>
                            {task.submission ? (
                              <>
                                <span className="material-symbols-outlined">task_alt</span>
                                {task.submission.submissionStatus === 'Late' ? 'Terlambat mengumpulkan' : 'Sudah mengumpulkan'}
                              </>
                            ) : (
                              <>
                                <span className="material-symbols-outlined">schedule</span>
                                Belum mengumpulkan
                              </>
                            )}
                          </div>
                          {task.comment && (
                            <div className="mentor-task-comment mentor-task-comment-compact">
                              <span className="material-symbols-outlined">rate_review</span>
                              <p>{task.comment}</p>
                            </div>
                          )}
                        </div>
                        <aside className="mentor-task-side mentor-task-side-compact">
                          {task.submission ? (
                            <div className={`mentor-task-submission ${String(task.submission.submissionStatus).toLowerCase()}`}>
                              <span>{formatDateOnly(task.submission.submittedAt)}</span>
                              {task.submission.fileName && (
                                <a href={task.submission.fileUrl} target="_blank" rel="noreferrer">
                                  <span className="material-symbols-outlined">download</span>
                                  {task.submission.fileName}
                                </a>
                              )}
                            </div>
                          ) : null}
                          <div className="mentor-task-actions mentor-task-actions-compact">
                            <button type="button" onClick={() => editTask(task.id)}>Edit</button>
                            <button type="button" className="danger" onClick={() => deleteTask(task.id)}>Hapus</button>
                            <button type="button" className="secondary" onClick={() => commentTask(task.id)}>Komentari</button>
                          </div>
                        </aside>
                        {commentingTaskId === task.id && (
                          <div className="mentor-task-comment-editor">
                            <label>Komentar untuk UMKM<textarea value={taskCommentDrafts[task.id] || ''} onChange={(event) => setTaskCommentDrafts((current) => ({ ...current, [task.id]: event.target.value }))} placeholder="Contoh: Bukti sudah baik, tambahkan ringkasan hasil implementasi pada submission berikutnya." /></label>
                            <div>
                              <button type="button" onClick={() => saveTaskComment(task.id)}>Simpan Komentar</button>
                              <button type="button" className="secondary" onClick={() => setCommentingTaskId(null)}>Batal</button>
                            </div>
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </section>
        </div>
      )}

      {activeTab === 'Chat' && (
        <div className="mentor-workspace-chat">
          <div>{messages.map((message) => <article key={message.id} className={message.sender === 'Mentor' ? 'me' : ''}><strong>{message.sender}</strong><p>{message.text}</p><span>{message.time}</span></article>)}</div>
          <form onSubmit={sendMessage}><input value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder="Tulis pesan..." /><button type="submit">Kirim</button></form>
        </div>
      )}

      {activeTab === 'File Sharing' && (
        <div className="mentor-file-sharing-workspace">
          <form className="mentor-workspace-form mentor-file-upload-form mentor-file-upload-form-wide" onSubmit={uploadMaterial}>
            <div className="mentor-file-sharing-head">
              <div>
                <span>File Sharing</span>
                <h3>Upload Materi</h3>
                <p>Bagikan materi mentoring yang rapi, mudah diakses, dan siap dipakai oleh UMKM di workspace mereka.</p>
              </div>
              <div className="mentor-file-sharing-note">
                <span className="material-symbols-outlined">folder_shared</span>
                <p>Materi yang diunggah akan langsung tampil di daftar bawah untuk UMKM.</p>
              </div>
            </div>
            <div className="mentor-file-sharing-grid">
              <label>Judul materi<input value={fileForm.title} onChange={(event) => updateFileForm('title', event.target.value)} placeholder="Contoh: Template rencana konten" /></label>
              <label>Catatan untuk UMKM<textarea value={fileForm.description} onChange={(event) => updateFileForm('description', event.target.value)} placeholder="Tambahkan konteks penggunaan materi ini..." /></label>
            </div>
            <label className="mentor-file-picker">
              <span className="material-symbols-outlined">upload_file</span>
              {fileForm.fileName || 'Pilih file PDF, dokumen, gambar, atau catatan'}
              <input
                type="file"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  updateFileForm('file', file || null)
                  updateFileForm('fileName', file?.name || '')
                  if (file && !fileForm.title) updateFileForm('title', file.name)
                }}
              />
            </label>
            <button type="submit">Upload Materi</button>
          </form>
          <div className="mentor-workspace-list mentor-material-list mentor-material-list-below">
            <header className="mentor-material-list-header">
              <div>
                <span>Daftar Materi</span>
                <h3>{files.length} file tersedia</h3>
              </div>
              <p>Semua materi yang diunggah tersusun di bawah form agar alur kerja lebih jelas.</p>
            </header>
            {files.length === 0 ? (
              <article className="mentor-material-empty">
                <span className="material-symbols-outlined">folder_open</span>
                <h3>Belum ada materi</h3>
                <p>Upload buku, PDF, template, atau catatan agar UMKM bisa mengaksesnya dari workspace mereka.</p>
              </article>
            ) : files.map((file) => (
              <article key={file.id} className="mentor-material-card">
                <span className="material-symbols-outlined">description</span>
                <div>
                  <h3>{file.title}</h3>
                  <p>{file.description || file.fileName}</p>
                  <small>{file.fileName} • {file.fileSizeLabel} • Diunggah {file.createdAtLabel}</small>
                </div>
                <a href={file.fileUrl} target="_blank" rel="noreferrer">Download</a>
              </article>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'Selesaikan Mentoring' && (
        <form className="mentor-workspace-form wide" onSubmit={completeMentoring}>
          <h3>Selesaikan Mentoring</h3>
          <label>Evaluasi akhir<textarea value={completionForm.finalEvaluation} onChange={(event) => updateCompletionField('finalEvaluation', event.target.value)} required /></label>
          <label>Hasil mentoring<textarea value={completionForm.result} onChange={(event) => updateCompletionField('result', event.target.value)} required /></label>
          <label>Perkembangan UMKM<textarea value={completionForm.businessGrowth} onChange={(event) => updateCompletionField('businessGrowth', event.target.value)} required /></label>
          <label>Rekomendasi lanjutan<textarea value={completionForm.nextRecommendation} onChange={(event) => updateCompletionField('nextRecommendation', event.target.value)} /></label>
          <label>Catatan penutup<textarea value={completionForm.closingNote} onChange={(event) => updateCompletionField('closingNote', event.target.value)} /></label>
          <button type="submit">Selesaikan Mentoring</button>
        </form>
      )}
      {editingSession && (
        <SessionEditModal
          form={sessionEditForm}
          onClose={() => setEditingSession(null)}
          onSubmit={submitSessionEdit}
          onUpdate={updateSessionEditField}
        />
      )}
      {cancellingSession && (
        <SessionCancelModal
          reason={sessionCancelReason}
          session={cancellingSession}
          onClose={() => setCancellingSession(null)}
          onSubmit={submitSessionCancel}
          onUpdate={setSessionCancelReason}
        />
      )}
      </div>
    </section>
  )
}

function SessionEditModal({ form, onClose, onSubmit, onUpdate }) {
  return (
    <div className="mentor-flow-modal-backdrop" role="dialog" aria-modal="true">
      <form className="mentor-flow-modal mentor-session-modal" onSubmit={onSubmit}>
        <header>
          <div>
            <span>Edit Sesi</span>
            <h2>{form.title || 'Sesi mentoring'}</h2>
            <p>Perubahan jadwal akan terlihat di workspace UMKM.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Tutup modal">
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>
        <div className="mentor-flow-modal-body">
          <label>Judul sesi<input value={form.title} onChange={(event) => onUpdate('title', event.target.value)} required /></label>
          <div className="mentor-flow-grid">
            <label>Tanggal<input type="date" value={form.date} onChange={(event) => onUpdate('date', event.target.value)} required /></label>
            <label>Jam mulai<input type="time" value={form.startTime} onChange={(event) => onUpdate('startTime', event.target.value)} required /></label>
            <label>Jam selesai<input type="time" value={form.endTime} onChange={(event) => onUpdate('endTime', event.target.value)} required /></label>
            <label>Platform<select value={form.platform} onChange={(event) => onUpdate('platform', event.target.value)}><option>Google Meet</option><option>Zoom</option><option>Lainnya</option></select></label>
          </div>
          <label>Link meeting<input value={form.meetingLink} onChange={(event) => onUpdate('meetingLink', event.target.value)} /></label>
          <label>Agenda<textarea value={form.agenda} onChange={(event) => onUpdate('agenda', event.target.value)} /></label>
        </div>
        <footer>
          <button type="button" onClick={onClose}>Batal</button>
          <button type="submit">Simpan Perubahan</button>
        </footer>
      </form>
    </div>
  )
}

function SessionCancelModal({ reason, session, onClose, onSubmit, onUpdate }) {
  return (
    <div className="mentor-flow-modal-backdrop" role="dialog" aria-modal="true">
      <form className="mentor-flow-modal mentor-session-modal" onSubmit={onSubmit}>
        <header>
          <div>
            <span>Batalkan Sesi</span>
            <h2>{session.title}</h2>
            <p>Alasan pembatalan akan tampil di workspace UMKM.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Tutup modal">
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>
        <div className="mentor-flow-modal-body">
          <label>Alasan pembatalan<textarea value={reason} onChange={(event) => onUpdate(event.target.value)} placeholder="Contoh: Jadwal mentor berubah, sesi akan dijadwalkan ulang minggu depan." required /></label>
        </div>
        <footer>
          <button type="button" onClick={onClose}>Batal</button>
          <button type="submit">Batalkan Sesi</button>
        </footer>
      </form>
    </div>
  )
}

function WorkspaceInfoCard({ title, value }) {
  return <article className="mentor-workspace-info"><h3>{title}</h3><p>{value || '-'}</p></article>
}

function AcceptMentoringModal({ onClose, onSubmit, request }) {
  const [form, setForm] = useState({
    startDate: '',
    endDate: '',
    acceptanceNote: '',
    createFirstSession: false,
    firstSessionTitle: '',
    firstSessionDate: '',
    firstSessionStartTime: '',
    firstSessionEndTime: '',
    platform: 'Google Meet',
    meetingLink: '',
    firstSessionAgenda: '',
  })

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    onSubmit(form)
  }

  return (
    <div className="mentor-flow-modal-backdrop" role="dialog" aria-modal="true">
      <form className="mentor-flow-modal" onSubmit={handleSubmit}>
        <header>
          <div>
            <span>Terima Request</span>
            <h2>{request.business_name || request.requester_name || 'UMKM'}</h2>
            <p>{request.topic || 'Request mentoring bisnis'}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Tutup modal">
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>

        <div className="mentor-flow-grid">
          <label>
            Tanggal mulai mentoring
            <input type="date" value={form.startDate} onChange={(event) => updateField('startDate', event.target.value)} required />
          </label>
          <label>
            Tanggal selesai mentoring
            <input type="date" value={form.endDate} onChange={(event) => updateField('endDate', event.target.value)} required />
          </label>
        </div>
        <label>
          Catatan penerimaan untuk UMKM
          <textarea value={form.acceptanceNote} onChange={(event) => updateField('acceptanceNote', event.target.value)} placeholder="Tambahkan catatan awal, ekspektasi, atau persiapan untuk UMKM..." />
        </label>
        <fieldset>
          <legend>Apakah ingin langsung membuat sesi pertama?</legend>
          <div className="mentor-radio-row">
            <label><input type="radio" checked={form.createFirstSession} onChange={() => updateField('createFirstSession', true)} /> Ya</label>
            <label><input type="radio" checked={!form.createFirstSession} onChange={() => updateField('createFirstSession', false)} /> Tidak</label>
          </div>
        </fieldset>

        {form.createFirstSession && (
          <div className="mentor-first-session-fields">
            <label>
              Judul sesi pertama
              <input value={form.firstSessionTitle} onChange={(event) => updateField('firstSessionTitle', event.target.value)} required={form.createFirstSession} />
            </label>
            <div className="mentor-flow-grid">
              <label>
                Tanggal sesi
                <input type="date" value={form.firstSessionDate} onChange={(event) => updateField('firstSessionDate', event.target.value)} required={form.createFirstSession} />
              </label>
              <label>
                Jam mulai
                <input type="time" value={form.firstSessionStartTime} onChange={(event) => updateField('firstSessionStartTime', event.target.value)} required={form.createFirstSession} />
              </label>
              <label>
                Jam selesai
                <input type="time" value={form.firstSessionEndTime} onChange={(event) => updateField('firstSessionEndTime', event.target.value)} required={form.createFirstSession} />
              </label>
              <label>
                Platform
                <select value={form.platform} onChange={(event) => updateField('platform', event.target.value)}>
                  <option>Google Meet</option>
                  <option>Zoom</option>
                  <option>Lainnya</option>
                </select>
              </label>
            </div>
            <label>
              Link meeting
              <input value={form.meetingLink} onChange={(event) => updateField('meetingLink', event.target.value)} placeholder="https://..." required={form.createFirstSession} />
            </label>
            <label>
              Agenda sesi
              <textarea value={form.firstSessionAgenda} onChange={(event) => updateField('firstSessionAgenda', event.target.value)} placeholder="Agenda dan target sesi pertama..." required={form.createFirstSession} />
            </label>
          </div>
        )}

        <footer>
          <button type="button" className="secondary" onClick={onClose}>Batal</button>
          <button type="submit">Terima Request</button>
        </footer>
      </form>
    </div>
  )
}

function RejectMentoringModal({ onClose, onSubmit, request }) {
  const [form, setForm] = useState({
    rejectionReason: 'Jadwal tidak cocok',
    customReason: '',
  })
  const finalReason = form.rejectionReason === 'Alasan lainnya' ? form.customReason.trim() : form.rejectionReason

  function handleSubmit(event) {
    event.preventDefault()
    if (!finalReason) return
    onSubmit({ rejectionReason: finalReason })
  }

  return (
    <div className="mentor-flow-modal-backdrop" role="dialog" aria-modal="true">
      <form className="mentor-flow-modal compact" onSubmit={handleSubmit}>
        <header>
          <div>
            <span>Tolak Request</span>
            <h2>{request.business_name || request.requester_name || 'UMKM'}</h2>
            <p>{request.topic || 'Request mentoring bisnis'}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Tutup modal">
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>

        <label>
          Alasan penolakan
          <select value={form.rejectionReason} onChange={(event) => setForm((current) => ({ ...current, rejectionReason: event.target.value }))} required>
            <option>Jadwal tidak cocok</option>
            <option>Topik di luar bidang keahlian mentor</option>
            <option>Kuota mentoring penuh</option>
            <option>Informasi UMKM belum lengkap</option>
            <option>Alasan lainnya</option>
          </select>
        </label>
        {form.rejectionReason === 'Alasan lainnya' && (
          <label>
            Detail alasan
            <textarea value={form.customReason} onChange={(event) => setForm((current) => ({ ...current, customReason: event.target.value }))} placeholder="Tuliskan alasan penolakan..." required />
          </label>
        )}

        <footer>
          <button type="button" className="secondary" onClick={onClose}>Batal</button>
          <button type="submit" disabled={!finalReason}>Tolak Request</button>
        </footer>
      </form>
    </div>
  )
}

const mentorRequestDummyData = [
  {
    id: 'mentor-dummy-1',
    business_name: 'Kopi Merapi',
    requester_name: 'Siti Aminah',
    location: 'Sleman, Yogyakarta',
    category: 'Food & Beverage',
    topic: 'Strategi marketing digital',
    business_problem: 'Penjualan offline stabil, tetapi pemasaran online belum konsisten dan belum punya funnel pelanggan.',
    mentoring_goal: 'Membuat strategi konten dan promosi digital yang bisa dijalankan tim kecil.',
    duration_type: '1 bulan mentoring',
    schedule_preference: 'Sabtu pagi',
    additional_message: 'Kami sudah punya Instagram dan WhatsApp Business, tapi belum rutin mengukur hasil kampanye.',
    created_at: '2026-05-24T09:30:00',
    status: 'pending',
  },
  {
    id: 'mentor-dummy-2',
    business_name: 'Batik Lestari',
    requester_name: 'Rani Pradipta',
    location: 'Solo, Jawa Tengah',
    category: 'Fashion',
    topic: 'Branding dan positioning produk',
    business_problem: 'Produk sudah punya kualitas baik, tetapi brand belum terasa premium untuk pasar kota besar.',
    mentoring_goal: 'Mendapat arahan rebranding kemasan, tone komunikasi, dan pricing.',
    duration_type: '1 sesi konsultasi',
    schedule_preference: 'Rabu malam',
    additional_message: 'Kami menargetkan reseller butik dan gift corporate.',
    created_at: '2026-05-21T13:00:00',
    status: 'pending',
  },
]

const mentorMenteeTabs = [
  { label: 'Aktif', statuses: ['Accepted', 'Active'] },
  { label: 'Selesai', statuses: ['Completed'] },
  { label: 'Dibatalkan', statuses: ['Cancelled'] },
  { label: 'Semua', statuses: ['all'] },
]

const mentorMenteeFallbackData = [
  {
    id: 'mentee-fallback-active',
    businessName: 'Kopi Merapi',
    ownerName: 'Siti Aminah',
    location: 'Sleman, Yogyakarta',
    category: 'Food & Beverage',
    topic: 'Strategi marketing digital',
    status: 'Active',
    period: '25 Mei 2026 - 25 Jun 2026',
    completedSessions: 1,
    totalSessions: 4,
    completedTasks: 2,
    totalTasks: 5,
    progress: 42,
    lastProgress: 'Konten minggu pertama sudah disusun, menunggu evaluasi performa awal.',
  },
  {
    id: 'mentee-fallback-completed',
    businessName: 'Batik Lestari',
    ownerName: 'Rani Pradipta',
    location: 'Solo, Jawa Tengah',
    category: 'Fashion',
    topic: 'Branding dan positioning produk',
    status: 'Completed',
    period: '18 Mar 2026 - 18 Apr 2026',
    completedSessions: 4,
    totalSessions: 4,
    completedTasks: 6,
    totalTasks: 6,
    progress: 100,
    lastProgress: 'Program selesai. UMKM sudah memiliki arah brand dan prioritas eksekusi.',
  },
  {
    id: 'mentee-fallback-cancelled',
    businessName: 'Tani Subur',
    ownerName: 'Agus Santoso',
    location: 'Malang, Jawa Timur',
    category: 'Agribusiness',
    topic: 'Validasi channel distribusi',
    status: 'Cancelled',
    period: 'Dibatalkan sebelum sesi pertama',
    completedSessions: 0,
    totalSessions: 1,
    completedTasks: 0,
    totalTasks: 2,
    progress: 0,
    lastProgress: 'Program dibatalkan karena jadwal tidak cocok.',
  },
]

const mentorWorkspaceTabs = [
  'Overview',
  'Profil UMKM',
  'Jadwal Sesi',
  'Catatan Mentor',
  'Task & Action Plan',
  'Chat',
  'File Sharing',
  'Selesaikan Mentoring',
]

function getMentorWorkspaceTabIcon(tab) {
  const icons = {
    Overview: 'space_dashboard',
    'Profil UMKM': 'storefront',
    'Jadwal Sesi': 'calendar_month',
    'Catatan Mentor': 'edit_note',
    'Task & Action Plan': 'assignment_turned_in',
    Chat: 'chat_bubble',
    'File Sharing': 'attach_file',
    'Selesaikan Mentoring': 'verified',
  }
  return icons[tab] || 'circle'
}

const defaultMentorSessionForm = {
  title: '',
  date: '',
  startTime: '',
  endTime: '',
  platform: 'Google Meet',
  meetingLink: '',
  agenda: '',
}

const defaultMentorNoteForm = {
  sessionId: '',
  evaluation: '',
  blocker: '',
  advice: '',
  nextRecommendation: '',
}

const defaultMentorTaskForm = {
  title: '',
  instruction: '',
  deadline: '',
}

const defaultMentorCompletionForm = {
  finalEvaluation: '',
  result: '',
  businessGrowth: '',
  nextRecommendation: '',
  closingNote: '',
}

function normalizeIncomingMentorRequest(request) {
  const parsedNotes = parseMentoringNotes(request.notes || request.additional_message || '')
  const status = normalizeMentorRequestStatus(request.status)
  const umkm = request.umkm || {}

  return {
    id: request.id,
    businessName: umkm.businessName || request.business_name || request.businessName || request.requester_name || 'UMKM',
    ownerName: umkm.ownerName || umkm.name || request.requester_name || request.ownerName || 'Pemilik UMKM',
    location: umkm.location || request.location || 'Belum diisi',
    category: umkm.category || request.other_category || request.category || 'UMKM',
    topic: request.topic || 'Mentoring bisnis',
    businessProblem: request.business_problem || request.businessProblem || request.notes || '-',
    mentoringGoal: request.mentoring_goal || request.mentoringGoal || '-',
    duration: request.duration || request.duration_type || parsedNotes.duration || formatDurationMinutes(request.duration_minutes),
    schedulePreference: request.preferredSchedule || request.schedule_preference || parsedNotes.schedulePreference || formatDateTime(request.scheduled_at),
    additionalMessage: request.additional_message || parsedNotes.additionalMessage || '-',
    requestDate: request.requestedAt || request.created_at || request.createdAt || request.scheduled_at,
    startDate: request.startDate,
    endDate: request.endDate,
    status,
  }
}

function getMentorMenteeRecordsFromWorkspaces(workspaces, requests) {
  const workspaceRecords = (workspaces || []).map((workspace, index) => ({
    id: workspace.id,
    businessName: workspace.umkm?.businessName || workspace.umkm?.name || 'UMKM',
    ownerName: workspace.umkm?.name || 'Pemilik UMKM',
    location: workspace.umkm?.location || 'Belum diisi',
    category: workspace.umkm?.category || 'UMKM',
    topic: workspace.topic || 'Mentoring bisnis',
    status: normalizeMentorRequestStatus(workspace.status),
    startDate: workspace.startDate,
    endDate: workspace.endDate,
    period: buildMentoringPeriod(workspace.startDate, workspace.endDate, workspace.status),
    completedSessions: 0,
    totalSessions: 0,
    completedTasks: 0,
    totalTasks: 0,
    progress: workspace.status === 'Completed' ? 100 : 45 + (index * 10) % 40,
    lastProgress: workspace.acceptanceNote || 'Workspace aktif. Progress akan muncul setelah UMKM mengirim update.',
  }))
  if (workspaceRecords.length > 0) return workspaceRecords
  return getMentorMenteeRecords(requests)
}

function parseMentoringNotes(notes = '') {
  const result = {}
  String(notes).split('\n').forEach((line) => {
    const [label, ...rest] = line.split(':')
    const value = rest.join(':').trim()
    if (!value) return
    if (label.trim() === 'Durasi Mentoring') result.duration = value
    if (label.trim() === 'Preferensi Jadwal') result.schedulePreference = value
    if (label.trim() === 'Pesan Tambahan') result.additionalMessage = value
  })
  return result
}

function normalizeMentorRequestStatus(status = 'pending') {
  const normalized = String(status).toLowerCase()
  const statusMap = {
    pending: 'Pending',
    accepted: 'Accepted',
    active: 'Active',
    rejected: 'Rejected',
    completed: 'Completed',
    cancelled: 'Cancelled',
    canceled: 'Cancelled',
  }
  return statusMap[normalized] || 'Pending'
}

function formatDurationMinutes(minutes) {
  const value = Number(minutes || 60)
  if (value >= 720) return '3 bulan mentoring'
  if (value >= 240) return '1 bulan mentoring'
  return '1 sesi konsultasi'
}

function toDateInputValue(date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

function calculateMentorWorkspaceProgress(tasks, sessions) {
  const doneTasks = tasks.filter((task) => task.status === 'Done').length
  const completedSessions = sessions.filter((session) => session.status === 'Completed').length
  const taskScore = tasks.length ? (doneTasks / tasks.length) * 60 : 0
  const sessionScore = sessions.length ? (completedSessions / sessions.length) * 40 : 0
  return Math.round(taskScore + sessionScore)
}

function normalizeApiMentorWorkspace(workspace) {
  const umkm = workspace.umkm || {}
  return {
    id: workspace.id,
    businessName: umkm.businessName || umkm.name || 'UMKM',
    ownerName: umkm.name || 'Pemilik UMKM',
    topic: workspace.topic || 'Mentoring bisnis',
    status: normalizeMentorRequestStatus(workspace.status),
    period: buildMentoringPeriod(workspace.startDate, workspace.endDate, workspace.status),
    goal: workspace.goal || '-',
    businessSummary: umkm.description || `${umkm.businessName || umkm.name || 'UMKM'} sedang mengikuti mentoring.`,
    lastProgress: workspace.acceptanceNote || 'Belum ada progress terbaru.',
    profileItems: [
      ['Nama bisnis', umkm.businessName || umkm.name || 'UMKM'],
      ['Nama pemilik', umkm.name || 'Pemilik UMKM'],
      ['Lokasi', umkm.location || 'Belum diisi'],
      ['Kategori usaha', umkm.category || 'UMKM'],
      ['Deskripsi bisnis', umkm.description || '-'],
      ['Produk utama', '-'],
      ['Target pasar', '-'],
      ['Media sosial', '-'],
      ['Omzet saat ini', '-'],
      ['Kendala utama', '-'],
      ['Tujuan mentoring', workspace.goal || '-'],
    ].map(([label, value]) => ({ label, value })),
  }
}

function normalizeMentorApiSession(session) {
  return {
    id: session.id,
    title: session.title,
    date: session.date,
    startTime: session.start_time || session.startTime,
    endTime: session.end_time || session.endTime,
    platform: session.platform,
    meetingLink: session.meeting_link || session.meetingLink,
    agenda: session.agenda,
    status: session.status || 'Upcoming',
    cancellationReason: session.cancellation_reason || session.cancellationReason || '',
  }
}

function normalizeMentorAggregatedSession(session, workspace) {
  const normalizedSession = normalizeMentorApiSession(session)
  const sessionDate = parseDateOnly(normalizedSession.date)
  const timeLabel = formatTimeRange(normalizedSession)
  const sortKey = sessionDate
    ? new Date(`${normalizedSession.date}T${normalizeTimeInput(normalizedSession.startTime || normalizedSession.timeStart || '') || '00:00'}`).getTime()
    : Number.POSITIVE_INFINITY

  return {
    ...normalizedSession,
    id: `${workspace.id}-${normalizedSession.id}`,
    workspaceId: workspace.id,
    workspaceLabel: workspace.umkm?.businessName || workspace.businessName || workspace.umkm?.name || workspace.ownerName || 'UMKM',
    ownerName: workspace.umkm?.name || workspace.ownerName || 'Pemilik UMKM',
    timeLabel,
    sortKey,
  }
}

function normalizeMentorAggregatedMessage(message, workspace) {
  const createdAt = message.createdAt || message.created_at || new Date().toISOString()
  const senderRole = message.senderRole || message.sender_role
  return {
    id: `${workspace.id}-${message.id}`,
    workspaceId: workspace.id,
    workspaceLabel: workspace.umkm?.businessName || workspace.businessName || workspace.umkm?.name || workspace.ownerName || 'UMKM',
    ownerName: workspace.umkm?.name || workspace.ownerName || 'Pemilik UMKM',
    sender: senderRole === 'mentor' ? 'Mentor' : 'UMKM',
    text: message.message || message.text || '',
    time: formatDateOnly(createdAt),
    sortKey: new Date(createdAt).getTime(),
    createdAt,
  }
}

function normalizeMentorApiTask(task) {
  return {
    id: task.id,
    title: task.title,
    instruction: task.instruction,
    deadline: task.deadline,
    priority: task.priority,
    status: task.status || 'Pending',
    comment: task.mentor_comment || task.mentorComment || task.comment || '',
    submission: normalizeMentorTaskSubmission(task.submission),
  }
}

function normalizeMentorAggregatedTask(task, workspace) {
  const normalizedTask = normalizeMentorApiTask(task)
  return {
    ...normalizedTask,
    id: `${workspace.id}-${normalizedTask.id}`,
    workspaceId: workspace.id,
    workspaceLabel: workspace.umkm?.businessName || workspace.businessName || workspace.umkm?.name || workspace.ownerName || 'UMKM',
    ownerName: workspace.umkm?.name || workspace.ownerName || 'Pemilik UMKM',
    deadlineLabel: formatDateOnly(normalizedTask.deadline),
    priority: normalizedTask.priority || 'Medium',
    rawDeadline: normalizedTask.deadline,
  }
}

function normalizeMentorTaskSubmission(submission) {
  if (!submission) return null
  return {
    id: submission.id,
    note: submission.note || '',
    fileName: submission.fileName || submission.file_name || '',
    fileUrl: buildMentorAssetUrl(submission.fileUrl || submission.file_url || ''),
    submissionStatus: submission.submissionStatus || submission.submission_status || 'Submitted',
    submittedAt: submission.submittedAt || submission.submitted_at,
  }
}

function normalizeMentorChatMessage(message) {
  const role = message.senderRole || message.sender_role
  return {
    id: message.id,
    workspaceId: message.workspaceId || message.workspace_id,
    sender: role === 'mentor' ? 'Mentor' : 'UMKM',
    text: message.message || message.text || '',
    time: formatDateOnly(message.createdAt || message.created_at || new Date().toISOString()),
  }
}

function normalizeMentorWorkspaceFile(file) {
  return {
    id: file.id,
    title: file.title || file.fileName || file.file_name || 'Materi mentoring',
    description: file.description || '',
    fileName: file.fileName || file.file_name || 'file',
    fileUrl: buildMentorAssetUrl(file.fileUrl || file.file_url || ''),
    fileSizeLabel: formatMentorFileSize(file.fileSize || file.file_size || 0),
    createdAtLabel: formatDateOnly(file.createdAt || file.created_at),
  }
}

function buildMentorAssetUrl(path) {
  if (!path) return ''
  if (path.startsWith('http')) return path
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'
  return `${apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`
}

function formatMentorFileSize(size) {
  const value = Number(size || 0)
  if (!value) return 'Ukuran tidak diketahui'
  if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`
  return `${Math.max(1, Math.round(value / 1024))} KB`
}

function normalizeTimeInput(value) {
  if (!value) return ''
  return String(value).slice(0, 5)
}

function formatTimeRange(session) {
  const start = normalizeTimeInput(session.startTime || session.timeStart || '')
  const end = normalizeTimeInput(session.endTime || session.timeEnd || '')
  if (!start && !end) return '-'
  return [start, end].filter(Boolean).join(' - ')
}

function getMentorRemainingWorkspaceTime(endDate, status) {
  if (status === 'Completed') return 'Selesai'
  if (status === 'Cancelled') return 'Dibatalkan'
  if (!endDate) return '-'
  const diff = new Date(endDate).getTime() - new Date().setHours(0, 0, 0, 0)
  const days = Math.ceil(diff / 86400000)
  if (Number.isNaN(days)) return '-'
  if (days <= 0) return 'Berakhir hari ini'
  return `${days} hari lagi`
}

function normalizeMentorApiNote(note) {
  return {
    id: note.id,
    sessionId: note.session_id || note.sessionId,
    sessionTitle: note.session_title || note.sessionTitle || 'Catatan mentor',
    date: note.created_at || note.createdAt,
    evaluation: note.evaluation,
    blocker: note.obstacle_found || note.obstacleFound,
    advice: note.advice,
    nextRecommendation: note.next_recommendation || note.nextRecommendation,
  }
}

function normalizeMentorApiProgress(item) {
  return {
    id: item.id,
    updateDate: item.created_at || item.createdAt,
    revenue: item.omzet || '-',
    orders: item.order_count || item.orderCount || '-',
    followers: item.followers || '-',
    engagement: item.engagement || '-',
    blocker: item.obstacle || '-',
    implementationResult: item.implementation_result || item.implementationResult || '-',
    question: item.question_for_mentor || item.questionForMentor || '-',
    recommendation: item.mentor_recommendation || item.mentorRecommendation || '',
  }
}

function persistMentorWorkspaceCompletion(workspace) {
  const workspaces = getJsonArray('microfun_mentoring_workspaces')
  const nextWorkspace = {
    ...workspace,
    status: 'Completed',
    endDate: workspace.endDate || toDateInputValue(new Date()),
  }
  const workspaceIndex = workspaces.findIndex((item) => String(item.id) === String(workspace.id))
  if (workspaceIndex >= 0) workspaces[workspaceIndex] = { ...workspaces[workspaceIndex], ...nextWorkspace }
  else workspaces.unshift(nextWorkspace)
  localStorage.setItem('microfun_mentoring_workspaces', JSON.stringify(workspaces))

  const umkmRequests = getJsonArray('microfun_umkm_mentoring_requests')
  const requestIndex = umkmRequests.findIndex((item) => String(item.id) === String(workspace.id))
  if (requestIndex >= 0) {
    umkmRequests[requestIndex] = {
      ...umkmRequests[requestIndex],
      status: 'Completed',
      endDate: nextWorkspace.endDate,
      taskProgress: 100,
    }
    localStorage.setItem('microfun_umkm_mentoring_requests', JSON.stringify(umkmRequests))
  }

  saveMentorRequestOverride(workspace.id, 'Completed', { endDate: nextWorkspace.endDate, completion: workspace.completion })
}

function getMentorMenteeRecords(requests) {
  const sourceRequests = (requests.length > 0 ? requests : applyMentorRequestOverrides(mentorRequestDummyData))
    .map(normalizeIncomingMentorRequest)
    .filter((request) => ['Accepted', 'Active', 'Completed', 'Cancelled'].includes(request.status))
  const workspaceRecords = getJsonArray('microfun_mentoring_workspaces').map(normalizeWorkspaceMenteeRecord)
  const requestRecords = sourceRequests.map((request, index) => requestToMenteeRecord(request, index))
  const merged = [...workspaceRecords, ...requestRecords]
  const deduped = Array.from(new Map(merged.map((item) => [String(item.id), item])).values())

  return deduped.length > 0 ? deduped : mentorMenteeFallbackData
}

function buildMentorWorkspaceData(mentoringId) {
  const snapshot = getMentorWorkspaceSnapshot(mentoringId)
  const request = applyMentorRequestOverrides(mentorRequestDummyData)
    .map(normalizeIncomingMentorRequest)
    .find((item) => String(item.id) === String(mentoringId))
  const fallback = mentorMenteeFallbackData.find((item) => String(item.id) === String(mentoringId))
  const businessName = snapshot?.businessName || request?.businessName || fallback?.businessName || 'UMKM'
  const ownerName = snapshot?.ownerName || request?.ownerName || fallback?.ownerName || 'Pemilik UMKM'
  const topic = snapshot?.topic || request?.topic || fallback?.topic || 'Mentoring bisnis'
  const status = normalizeMentorRequestStatus(snapshot?.status || request?.status || fallback?.status || 'Active')
  const firstSession = snapshot?.firstSession

  return {
    id: mentoringId,
    businessName,
    ownerName,
    topic,
    status,
    period: buildMentoringPeriod(snapshot?.startDate, snapshot?.endDate, status),
    businessSummary: `${businessName} sedang mengikuti mentoring untuk memperkuat strategi ${topic.toLowerCase()}.`,
    goal: request?.mentoringGoal || 'Meningkatkan kesiapan bisnis, eksekusi strategi, dan monitoring progres UMKM.',
    lastProgress: fallback?.lastProgress || 'UMKM sudah mengirim progress awal untuk ditinjau mentor.',
    profileItems: [
      ['Nama bisnis', businessName],
      ['Nama pemilik', ownerName],
      ['Lokasi', request?.location || fallback?.location || 'Belum diisi'],
      ['Kategori usaha', request?.category || fallback?.category || 'UMKM'],
      ['Deskripsi bisnis', 'UMKM lokal dengan potensi pertumbuhan melalui pemasaran digital dan operasional yang lebih terukur.'],
      ['Produk utama', 'Produk unggulan UMKM dan paket promosi'],
      ['Target pasar', 'Pelanggan retail, reseller, dan komunitas lokal'],
      ['Media sosial', '@microfun_umkm'],
      ['Omzet saat ini', 'Rp 7.800.000 / bulan'],
      ['Kendala utama', request?.businessProblem || 'Konsistensi eksekusi dan pengukuran hasil.'],
      ['Tujuan mentoring', request?.mentoringGoal || 'Menyusun rencana kerja yang praktis dan terukur.'],
    ].map(([label, value]) => ({ label, value })),
    sessions: firstSession ? [{
      id: 'first-session',
      title: firstSession.title || 'Sesi pertama',
      date: firstSession.date,
      startTime: firstSession.startTime,
      endTime: firstSession.endTime,
      platform: firstSession.platform || 'Google Meet',
      meetingLink: firstSession.meetingLink || '#',
      agenda: firstSession.agenda || 'Agenda sesi pertama.',
      status: 'Upcoming',
    }] : [{
      id: 'session-default',
      title: 'Kickoff mentoring',
      date: '2026-05-29',
      startTime: '19:30',
      endTime: '20:30',
      platform: 'Google Meet',
      meetingLink: 'https://meet.google.com/dummy-session',
      agenda: 'Pemetaan masalah, target, dan action plan awal.',
      status: 'Upcoming',
    }],
    tasks: [
      { id: 'task-default-1', title: 'Audit strategi berjalan', instruction: 'Catat channel penjualan, konten, dan hambatan operasional.', deadline: '2026-06-02', priority: 'Tinggi', status: 'In Progress', comment: '' },
      { id: 'task-default-2', title: 'Susun eksperimen 7 hari', instruction: 'Buat satu eksperimen promosi dan ukur hasilnya.', deadline: '2026-06-07', priority: 'Sedang', status: 'Pending', comment: '' },
    ],
    notes: [
      { id: 'note-default', sessionTitle: 'Kickoff mentoring', date: '2026-05-29', evaluation: 'UMKM siap mulai program mentoring.', advice: 'Mulai dari baseline data dan target sederhana.', nextRecommendation: 'Kirim progress mingguan.' },
    ],
    progressList: [
      { id: 'progress-default', updateDate: '2026-05-25', revenue: 'Rp 7.800.000', orders: '96', followers: '3.840', engagement: '5.8%', blocker: 'Posting belum konsisten.', implementationResult: 'Konten edukasi mulai menghasilkan pesan masuk.', question: 'Bagaimana menentukan CTA terbaik?' },
    ],
    messages: [
      { id: 'message-default-1', sender: 'UMKM', text: 'Saya sudah kirim progress minggu ini.', time: 'Hari ini' },
      { id: 'message-default-2', sender: 'Mentor', text: 'Baik, saya review dan beri rekomendasi di tab Progress.', time: 'Baru saja' },
    ],
    files: [
      { id: 'file-default-1', name: 'Template Action Plan.xlsx', meta: 'Mentor • 240 KB' },
    ],
  }
}

function requestToMenteeRecord(request, index) {
  const status = request.status === 'Accepted' ? 'Active' : request.status
  const totalSessions = request.duration === '3 bulan mentoring' ? 12 : request.duration === '1 bulan mentoring' ? 4 : 1
  const completedSessions = status === 'Completed' ? totalSessions : status === 'Cancelled' ? 0 : Math.min(totalSessions, 1 + (index % 2))
  const totalTasks = request.duration === '1 sesi konsultasi' ? 2 : 6
  const completedTasks = status === 'Completed' ? totalTasks : status === 'Cancelled' ? 0 : Math.min(totalTasks, 1 + (index % 3))
  const progress = status === 'Completed'
    ? 100
    : status === 'Cancelled'
      ? 0
      : Math.round(((completedSessions / Math.max(totalSessions, 1)) * 45) + ((completedTasks / Math.max(totalTasks, 1)) * 55))

  return {
    id: request.id,
    businessName: request.businessName,
    ownerName: request.ownerName,
    location: request.location,
    category: request.category,
    topic: request.topic,
    status,
    period: buildMentoringPeriod(request.startDate, request.endDate, status),
    completedSessions,
    totalSessions,
    completedTasks,
    totalTasks,
    progress,
    lastProgress: getLastProgressCopy(status, progress),
  }
}

function normalizeWorkspaceMenteeRecord(workspace) {
  const totalSessions = workspace.firstSession ? 4 : 1
  const status = workspace.status === 'Accepted' ? 'Active' : normalizeMentorRequestStatus(workspace.status)

  return {
    id: workspace.id,
    businessName: workspace.businessName || 'UMKM',
    ownerName: workspace.ownerName || 'Pemilik UMKM',
    location: workspace.location || 'Belum diisi',
    category: workspace.category || 'UMKM',
    topic: workspace.topic || 'Mentoring bisnis',
    status,
    period: buildMentoringPeriod(workspace.startDate, workspace.endDate, status),
    completedSessions: workspace.firstSession ? 1 : 0,
    totalSessions,
    completedTasks: status === 'Completed' ? 4 : 1,
    totalTasks: 4,
    progress: status === 'Completed' ? 100 : status === 'Cancelled' ? 0 : 35,
    lastProgress: workspace.firstSession?.agenda || workspace.acceptanceNote || getLastProgressCopy(status, 35),
  }
}

function buildMentoringPeriod(startDate, endDate, status) {
  if (status === 'Cancelled' && !startDate) return 'Dibatalkan sebelum sesi pertama'
  if (!startDate && !endDate) return 'Periode belum ditentukan'
  return `${formatDateOnly(startDate)} - ${formatDateOnly(endDate)}`
}

function getLastProgressCopy(status, progress) {
  if (status === 'Completed') return 'Program selesai dan arsip mentoring siap dibuka.'
  if (status === 'Cancelled') return 'Program dibatalkan sebelum seluruh rencana berjalan.'
  if (progress >= 70) return 'UMKM sudah menyelesaikan sebagian besar sesi dan task prioritas.'
  if (progress >= 35) return 'Mentoring berjalan, beberapa task awal sudah mulai dieksekusi.'
  return 'Program baru dimulai, menunggu progress sesi dan task berikutnya.'
}

function syncMentoringStatusForUmkm(request, status, metadata, profile) {
  const storageKey = 'microfun_umkm_mentoring_requests'
  const current = getJsonArray(storageKey)
  const normalized = normalizeIncomingMentorRequest(request)
  const existingIndex = current.findIndex((item) => String(item.id) === String(request.id))
  const nextItem = {
    ...(existingIndex >= 0 ? current[existingIndex] : {}),
    id: request.id,
    mentor: {
      id: profile.id,
      name: profile.name || 'Mentor',
      current_job: profile.current_job || 'Mentor UMKM',
    },
    topic: normalized.topic,
    duration_type: normalized.duration,
    schedule_preference: normalized.schedulePreference,
    status,
    createdAt: normalized.requestDate || new Date().toISOString(),
    startDate: metadata.startDate,
    endDate: metadata.endDate,
    nextSession: metadata.createFirstSession ? formatFirstSessionLabel(metadata) : '',
    rejectionReason: metadata.rejectionReason || '',
    taskProgress: status === 'Active' ? 0 : undefined,
  }

  if (existingIndex >= 0) {
    current[existingIndex] = nextItem
  } else {
    current.unshift(nextItem)
  }
  localStorage.setItem(storageKey, JSON.stringify(current))
}

function createMentoringWorkspaceSnapshot(request, status, metadata, profile) {
  const storageKey = 'microfun_mentoring_workspaces'
  const current = getJsonArray(storageKey)
  const normalized = normalizeIncomingMentorRequest(request)
  const workspace = {
    id: request.id,
    status,
    mentorName: profile.name || 'Mentor',
    mentorProfession: profile.current_job || 'Mentor UMKM',
    businessName: normalized.businessName,
    ownerName: normalized.ownerName,
    topic: normalized.topic,
    startDate: metadata.startDate,
    endDate: metadata.endDate,
    acceptanceNote: metadata.acceptanceNote,
    firstSession: metadata.createFirstSession ? {
      title: metadata.firstSessionTitle,
      date: metadata.firstSessionDate,
      startTime: metadata.firstSessionStartTime,
      endTime: metadata.firstSessionEndTime,
      platform: metadata.platform,
      meetingLink: metadata.meetingLink,
      agenda: metadata.firstSessionAgenda,
    } : null,
    createdAt: new Date().toISOString(),
  }

  const existingIndex = current.findIndex((item) => String(item.id) === String(request.id))
  if (existingIndex >= 0) current[existingIndex] = workspace
  else current.unshift(workspace)
  localStorage.setItem(storageKey, JSON.stringify(current))
}

function saveMentorRequestOverride(requestId, status, metadata) {
  const storageKey = 'microfun_mentor_request_statuses'
  const current = getJsonArray(storageKey).filter((item) => String(item.id) !== String(requestId))
  current.unshift({
    id: requestId,
    status,
    ...metadata,
    updatedAt: new Date().toISOString(),
  })
  localStorage.setItem(storageKey, JSON.stringify(current))
}

function applyMentorRequestOverrides(requests) {
  const overrides = getJsonArray('microfun_mentor_request_statuses')
  return requests.map((request) => {
    const override = overrides.find((item) => String(item.id) === String(request.id))
    if (!override) return request
    return {
      ...request,
      ...override,
      status: String(override.status || request.status).toLowerCase(),
    }
  })
}

function getJsonArray(storageKey) {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function getWorkspaceTabFromSearch(search) {
  const tab = new URLSearchParams(search).get('tab')
  if (!tab) return 'Overview'

  const normalized = tab.toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'and')
  const tabMap = {
    overview: 'Overview',
    profile: 'Profil UMKM',
    session: 'Jadwal Sesi',
    sessions: 'Jadwal Sesi',
    'task-and-action-plan': 'Task & Action Plan',
    tasks: 'Task & Action Plan',
    notes: 'Catatan Mentor',
    chat: 'Chat',
    files: 'File Sharing',
    evaluation: 'Selesaikan Mentoring',
  }

  return tabMap[normalized] || 'Overview'
}

function buildWorkspaceTabSearch(tab) {
  const tabMap = {
    Overview: 'overview',
    'Profil UMKM': 'profile',
    'Jadwal Sesi': 'sessions',
    'Task & Action Plan': 'tasks',
    'Catatan Mentor': 'notes',
    Chat: 'chat',
    'File Sharing': 'files',
    'Selesaikan Mentoring': 'evaluation',
  }

  const value = tabMap[tab] || 'overview'
  return `?tab=${encodeURIComponent(value)}`
}

function buildMentorWorkspaceUrl(mentoringId, tab = 'overview') {
  return `/dashboard/mentor/mentoring/workspace/${mentoringId}${buildWorkspaceTabSearch(tab)}`
}

function groupMentorTasksByDeadline(tasks) {
  const groups = new Map()

  tasks.forEach((task) => {
    const deadline = parseDateOnly(task.deadline)
    const key = deadline ? deadline.toISOString().slice(0, 10) : 'no-deadline'
    const label = deadline ? formatDateOnly(task.deadline) : 'Tanpa deadline'
    const sortKey = deadline ? deadline.getTime() : Number.POSITIVE_INFINITY

    if (!groups.has(key)) {
      groups.set(key, { key, label, sortKey, tasks: [] })
    }

    groups.get(key).tasks.push(task)
  })

  return Array.from(groups.values()).sort((a, b) => a.sortKey - b.sortKey)
}

function groupMentorSessionsByDate(sessions) {
  const groups = new Map()

  sessions.forEach((session) => {
    const sessionDate = parseDateOnly(session.date)
    const key = sessionDate ? sessionDate.toISOString().slice(0, 10) : 'no-date'
    const label = sessionDate ? formatDateOnly(session.date) : 'Tanpa tanggal'
    const sortKey = sessionDate ? sessionDate.getTime() : Number.POSITIVE_INFINITY

    if (!groups.has(key)) {
      groups.set(key, { key, label, sortKey, sessions: [] })
    }

    groups.get(key).sessions.push(session)
  })

  return Array.from(groups.values()).sort((a, b) => a.sortKey - b.sortKey)
}

function getMentorWorkspaceSnapshot(mentoringId) {
  return getJsonArray('microfun_mentoring_workspaces').find((workspace) => String(workspace.id) === String(mentoringId))
}

function parseDateOnly(value) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  date.setHours(23, 59, 59, 999)
  return date
}

function getMentoringIdFromPath(pathname) {
  return pathname.split('/').filter(Boolean).at(-1) || 'new'
}

function formatFirstSessionLabel(metadata) {
  if (!metadata.firstSessionDate || !metadata.firstSessionStartTime) return ''
  const date = new Date(`${metadata.firstSessionDate}T${metadata.firstSessionStartTime}`)
  if (Number.isNaN(date.getTime())) return `${metadata.firstSessionDate} ${metadata.firstSessionStartTime}`
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function getInitials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map((word) => word[0]).join('').toUpperCase() || 'MT'
}

function getRequestStatusMeta(status = 'pending') {
  const normalized = status.toLowerCase()
  if (normalized === 'accepted') return { className: 'accepted', label: 'Accepted' }
  if (normalized === 'active') return { className: 'accepted', label: 'Active' }
  if (normalized === 'completed') return { className: 'completed', label: 'Completed' }
  if (normalized === 'rejected') return { className: 'rejected', label: 'Rejected' }
  return { className: 'pending', label: 'Pending' }
}

function getMentorDashboardStats(requests, profile) {
  const acceptedCount = requests.filter((request) => ['accepted', 'active', 'completed'].includes(String(request.status).toLowerCase())).length
  const completedCount = requests.filter((request) => String(request.status).toLowerCase() === 'completed').length
  const totalMinutes = requests
    .filter((request) => request.status !== 'rejected')
    .reduce((total, request) => total + Number(request.duration_minutes || 0), 0)

  return {
    activeMentees: new Set(requests.map((request) => request.umkm_owner || request.requester_email || request.requester_name)).size,
    capacity: Math.max(8, acceptedCount + 2),
    earnings: completedCount * 250000,
    hours: Math.round((totalMinutes / 60) * 10) / 10,
    pending: requests.filter((request) => String(request.status).toLowerCase() === 'pending').length,
    rating: profile.reputation_score ? Number(profile.reputation_score).toFixed(1) : '4.8',
  }
}

function getMentorPageTitle(activeTab, displayName) {
  if (activeTab === 'Profile' || activeTab === 'Profile Mentor') return 'Profil Mentor'
  if (activeTab === 'Request Masuk' || activeTab === 'Mentee Saya' || activeTab === 'Jadwal Sesi' || activeTab === 'Task & Action Plan' || activeTab === 'Messages') return 'Mentoring'
  if (activeTab === 'Workspace Mentor') return 'Workspace Mentor'
  if (isMentorSessionTab(activeTab)) return activeTab
  return `Halo, ${displayName}`
}

function getMentorPageSubtitle(activeTab) {
  if (activeTab === 'Profile' || activeTab === 'Profile Mentor') return 'Lengkapi keahlian, prestasi, dan pengalaman Anda.'
  if (activeTab === 'Request Masuk') return 'Review dan kelola request bimbingan dari UMKM. Pilih request yang paling sesuai dengan keahlian Anda.'
  if (activeTab === 'Mentee Saya') return 'Daftar UMKM yang request mentoringnya sudah diterima, aktif, selesai, atau dibatalkan.'
  if (activeTab === 'Workspace Mentor') return 'Workspace detail akan dibuat pada tahap berikutnya.'
  if (activeTab === 'Messages') return 'Kelola chat dari semua workspace mentee tanpa harus masuk ke workspace satu per satu.'
  if (activeTab === 'Task & Action Plan') return 'Lihat semua task dari seluruh workspace mentee, diurutkan per deadline agar progres lebih mudah dipantau.'
  if (activeTab === 'Jadwal Sesi') return 'Shortcut semua sesi mentoring dari seluruh workspace mentee, diurutkan dari tanggal terdekat.'
  if (isMentorSessionTab(activeTab)) return 'Kelola proses mentoring aktif bersama UMKM.'
  return 'Ringkasan performa mentoring, jadwal, dan aktivitas terbaru.'
}

function isMentorSessionTab(activeTab) {
  return ['Jadwal Sesi', 'Task & Action Plan'].includes(activeTab)
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

function formatDateOnly(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(date)
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


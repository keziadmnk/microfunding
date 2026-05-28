import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import DashboardSidebar from '../components/dashboard/DashboardSidebar'
import ForumPage from '../components/dashboard/ForumPage'
import { WORLD_CITY_OPTIONS, findCityByLabel } from '../components/dashboard/locationOptions'
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
      { label: 'Incoming Requests', icon: 'inbox' },
      { label: 'My Mentees', icon: 'groups' },
      { label: 'Session Schedule', icon: 'calendar_month' },
      { label: 'Task & Action Plan', icon: 'task_alt' },
    ],
  },
  { label: 'Messages', icon: 'chat' },
  { label: 'Forum', icon: 'forum' },
  { label: 'Profile', icon: 'account_circle' },
]

const defaultProfile = {
  name: '',
  email: '',
  current_job: '',
  experience: '',
  achievements: '',
  about: '',
  location: '',
  address: '',
  latitude: '',
  longitude: '',
  profile_photo: '',
  skills: [],
}

const mentorTabRoutes = {
  Dashboard: '/dashboard/mentor',
  'Incoming Requests': '/dashboard/mentor',
  'My Mentees': '/dashboard/mentor/mentees',
  'Session Schedule': '/dashboard/mentor',
  'Task & Action Plan': '/dashboard/mentor/mentoring/tasks',
  Messages: '/dashboard/mentor/messages',
  Forum: '/dashboard/mentor',
  Profile: '/dashboard/mentor',
}

const mentorRouteTabs = {
  '/dashboard/mentor/mentees': 'My Mentees',
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
    if (!response.ok) throw new Error(payload.message || 'Failed to load mentor profile.')
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
  const mentorAvatarUrl = useMemo(() => {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'
    return getProfilePhotoUrl(profile.profile_photo || user?.profile_photo, apiBaseUrl)
  }, [profile.profile_photo, user])
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
      if (!response.ok) throw new Error(payload.message || 'Failed to save mentor profile.')
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
      setMessage(nextStatus === 'Rejected' ? 'Mentoring request rejected successfully.' : payload.message)
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
    return <main className="mentor-loading">Loading mentor dashboard...</main>
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
          <div className="mentor-avatar">
            {mentorAvatarUrl ? <img src={mentorAvatarUrl} alt={`${displayName} profile`} /> : <span>{getInitials(displayName)}</span>}
          </div>
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
            onOpenRequests={() => handleTabChange('Incoming Requests')}
          />
        ) : activeTab === 'Incoming Requests' ? (
          <MentorRequestsView requests={requests} onOpenAccept={(request) => openRequestModal(request, 'accept')} onOpenReject={(request) => openRequestModal(request, 'reject')} />
        ) : activeTab === 'Messages' ? (
          <MentorMessagesView workspaces={workspaces} />
        ) : activeTab === 'Forum' ? (
          <ForumPage currentUser={user} userLocation={user?.location || user?.address} />
        ) : activeTab === 'My Mentees' ? (
          <MentorMenteesView requests={requests} workspaces={workspaces} />
        ) : activeTab === 'Workspace Mentor' ? (
          <MentorWorkspacePlaceholder mentoringId={getMentoringIdFromPath(location.pathname)} onBack={() => navigate('/dashboard/mentor/mentees')} />
        ) : isMentorSessionTab(activeTab) ? (
          <MentorSessionSubpage activeTab={activeTab} requests={requests} workspaces={workspaces} />
        ) : (
          <MentorPlaceholderPage icon="construction" title={activeTab} copy="This page is being prepared." />
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
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'
  const photoPreview = getProfilePhotoUrl(form.profile_photo, apiBaseUrl)

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function updateLocation(value) {
    const city = findCityByLabel(value)
    setForm((current) => ({
      ...current,
      location: city?.label || '',
      latitude: city?.latitude || '',
      longitude: city?.longitude || '',
    }))
  }

  function handlePhotoChange(event) {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) return

    const reader = new FileReader()
    reader.onloadend = () => {
      updateField('profile_photo', reader.result)
    }
    reader.readAsDataURL(file)
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
            Edit Profile
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
            <h2>Basic Information</h2>
            <p>Mentor identity data visible to MSMEs.</p>
          </div>
        </div>
        <div className="mentor-profile-photo-row">
          <div className="mentor-profile-photo">
            {photoPreview ? <img src={photoPreview} alt="Mentor profile photo" /> : <span>{getInitials(form.name)}</span>}
          </div>
          <label className="mentor-edit-btn">
            <span className="material-symbols-outlined">upload_file</span>
            Upload Profile Photo
            <input type="file" accept="image/png,image/jpeg,image/gif" hidden disabled={!isEditing} onChange={handlePhotoChange} />
          </label>
        </div>
        <label>
          Name
          <input disabled={!isEditing} value={form.name || ''} onChange={(event) => updateField('name', event.target.value)} />
        </label>
        <label>
          Email
          <input value={form.email || ''} disabled />
        </label>
        <label>
          Expertise / Current Job
          <input disabled={!isEditing} value={form.current_job || ''} onChange={(event) => updateField('current_job', event.target.value)} placeholder="Example: Marketing strategist, Finance mentor" />
        </label>
        <label>
          Location
          <select disabled={!isEditing} value={form.location || ''} onChange={(event) => updateLocation(event.target.value)}>
            <option value="">Select mentor city location</option>
            {WORLD_CITY_OPTIONS.map((city) => (
              <option key={city.label} value={city.label}>{city.label}</option>
            ))}
          </select>
        </label>
        <label>
          Detailed Address
          <textarea disabled={!isEditing} value={form.address || ''} onChange={(event) => updateField('address', event.target.value)} placeholder="Example: 12 Merdeka Street, 2nd floor" />
        </label>
        <label>
          Short Bio
          <textarea disabled={!isEditing} value={form.about || ''} onChange={(event) => updateField('about', event.target.value)} placeholder="Describe your mentoring focus..." />
        </label>
      </section>

      <section className="mentor-card mentor-profile-card-main">
        <div className="mentor-card-header">
          <span className="material-symbols-outlined">workspace_premium</span>
          <div>
            <h2>Expertise, Achievements, Experience</h2>
            <p>Used by MSMEs to choose the most suitable mentor.</p>
          </div>
        </div>
        <label>
          Expertise Areas
          <div className="mentor-skill-input">
            <input disabled={!isEditing} value={skillInput} onChange={(event) => setSkillInput(event.target.value)} placeholder="Add skill" />
            <button type="button" disabled={!isEditing} onClick={addSkill}>Add</button>
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
          Achievements
          <textarea disabled={!isEditing} value={form.achievements || ''} onChange={(event) => updateField('achievements', event.target.value)} placeholder="Example: helped 20+ MSMEs increase revenue, awards, certifications..." />
        </label>
        <label>
          Experience
          <textarea disabled={!isEditing} value={form.experience || ''} onChange={(event) => updateField('experience', event.target.value)} placeholder="Describe your professional or mentoring experience..." />
        </label>
      </section>

      {isEditing && (
        <div className="mentor-form-actions">
          <button type="button" className="mentor-cancel-btn" onClick={() => {
            setForm(profile)
            setSkillInput('')
            setIsEditing(false)
          }}>
            Cancel
          </button>
          <button type="submit">Save Profile</button>
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
              <div className="mentor-mini-empty">No upcoming sessions yet.</div>
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
              <div className="mentor-mini-empty">No mentees yet.</div>
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
                          <span>{mentee.business_name || 'MSME'}</span>
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
                ? `There are ${stats.pending} new mentoring requests. Prioritize requests that match your ${profile.skills?.[0] || profile.current_job || 'primary'} expertise.`
                : 'Your mentoring profile is active. Complete achievements and experience so MSMEs can find a better fit.'}
            </p>
            <button type="button" onClick={onOpenRequests}>Action Advice</button>
          </section>

          <section className="mentor-card mentor-home-panel">
            <h2>Recent Activity</h2>
            {recentActivities.length === 0 ? (
              <div className="mentor-mini-empty">Recent activity will appear here.</div>
            ) : (
              <div className="mentor-activity-list">
                {recentActivities.map((activity) => (
                  <article key={`activity-${activity.id}`}>
                    <i />
                    <div>
                      <p><strong>{activity.requester_name}</strong> sent a request for the topic <strong>{activity.topic}</strong>.</p>
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

  if (activeTab === 'Session Schedule') {
    return <MentorSessionScheduleView workspaces={workspaces} />
  }

  if (activeTab === 'My Mentees') {
    return (
      <div className="mentor-session-subpage">
        <MentorSubpageHeader
          eyebrow="Mentoring"
          title="My Mentees"
          subtitle="View MSMEs accepted or active in mentoring programs."
          actionIcon="groups"
          actionLabel="Add Note"
        />
        <div className="mentor-notes-layout">
          <section className="mentor-note-editor">
            <label>
              Select MSME
              <select>
                <option>{requests[0]?.business_name || requests[0]?.requester_name || 'Select MSME'}</option>
              </select>
            </label>
            <label>
              MSME Condition Evaluation
              <textarea defaultValue="The MSME shows positive progress. The next focus is consistent action plan execution and weekly result measurement." />
            </label>
            <label>
              Mentor Recommendation
              <textarea placeholder="Write the next strategy recommendation..." />
            </label>
            <button type="button">Save Note</button>
          </section>
          <aside className="mentor-note-history">
            <h3>Latest Notes</h3>
            {requests.slice(0, 3).map((request) => (
              <article key={request.id}>
                <strong>{request.business_name || request.requester_name || 'MSME'}</strong>
                <p>{request.business_problem || request.notes || 'No mentoring notes yet.'}</p>
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
        subtitle="This feature will be connected to mentoring data in the next stage."
        actionIcon="construction"
        actionLabel="Coming Soon"
      />
      <MentorPlaceholderPage icon="construction" title={activeTab} copy="This page detail has not been built yet." />
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
          <h2>Session Schedule</h2>
          <p>Shortcut to all mentoring sessions from every mentee workspace, sorted by nearest date.</p>
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
          <h3>Loading session schedule...</h3>
          <p>Mengambil seluruh sesi dari semua workspace mentee.</p>
        </div>
      ) : sessions.length === 0 ? (
        <div className="mentor-session-empty">
          <span className="material-symbols-outlined">calendar_month</span>
          <h3>No session schedule yet</h3>
          <p>Sessions created by mentors will appear here as shortcuts.</p>
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
                        Session Details
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
          <p>View all tasks from every mentee workspace, sorted by deadline so progress is easier to monitor.</p>
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
          <h3>Loading mentee tasks...</h3>
          <p>Menarik task dari semua workspace aktif.</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="mentor-session-empty">
          <span className="material-symbols-outlined">task_alt</span>
          <h3>No tasks from mentees yet</h3>
          <p>Tasks created in MSME workspaces will appear here.</p>
        </div>
      ) : (
        <section className="mentor-task-list-panel mentor-task-board-panel">
          <header>
            <div>
              <span>Task List Mentee</span>
              <h3>{tasks.length} task dari {workspaceCount} workspace</h3>
            </div>
            <strong>{tasks.filter((task) => task.status === 'Done').length}/{tasks.length} completed</strong>
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
                              {task.submission.submissionStatus === 'Late' ? 'Submitted late' : 'Submitted'}
                            </>
                          ) : (
                            <>
                              <span className="material-symbols-outlined">schedule</span>
                              Not submitted
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
          workspaceLabel: workspace.umkm?.businessName || workspace.businessName || workspace.ownerName || 'MSME',
          ownerName: workspace.umkm?.name || workspace.ownerName || 'MSME Owner',
          topic: workspace.topic || 'Business mentoring',
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
          <p>All chats from mentor workspaces appear here like an inbox, so you can move between conversations without opening each workspace one by one.</p>
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
          <h3>Loading all chats...</h3>
          <p>Combining conversations from all mentor workspaces.</p>
        </div>
      ) : threads.length === 0 ? (
        <div className="mentor-session-empty">
          <span className="material-symbols-outlined">chat</span>
          <h3>No workspace chats yet</h3>
          <p>When conversations happen in MSME workspaces, chats will appear here.</p>
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
                    <p>{thread.latestMessage?.text || 'No latest message yet.'}</p>
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
                Open Workspace
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
                  <h3>No messages in this workspace yet</h3>
                  <p>Mulai percakapan dari composer di bawah.</p>
                </div>
              )}
            </div>

            <form className="mentor-message-composer" onSubmit={sendMessage}>
              <input
                value={draftMessage}
                onChange={(event) => setDraftMessage(event.target.value)}
                placeholder="Write a message to the MSME..."
              />
              <button type="submit" disabled={!activeThread}>Send</button>
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
          <h2>Incoming Requests</h2>
          <p>
            Review and manage mentoring requests from MSMEs. Choose the most suitable request
            based on your expertise.
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
          <p>No mentoring requests from MSMEs yet.</p>
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
                      <div><dt>MSME Name</dt><dd>{normalizedRequest.businessName}</dd></div>
                      <div><dt>Owner Name</dt><dd>{normalizedRequest.ownerName}</dd></div>
                      <div><dt>Location</dt><dd>{normalizedRequest.location}</dd></div>
                      <div><dt>Business Field</dt><dd>{normalizedRequest.category}</dd></div>
                      <div><dt>Mentoring Topic</dt><dd>{normalizedRequest.topic}</dd></div>
                      <div><dt>Mentoring Duration</dt><dd>{normalizedRequest.duration}</dd></div>
                      <div><dt>Schedule Preference</dt><dd>{normalizedRequest.schedulePreference}</dd></div>
                      <div><dt>Request Date</dt><dd>{formatDateOnly(normalizedRequest.requestDate)}</dd></div>
                      <div><dt>Request Status</dt><dd>{statusMeta.label}</dd></div>
                    </dl>

                    <div className="mentor-incoming-story">
                      <InfoBlockMentor title="Business Problem" value={normalizedRequest.businessProblem} />
                      <InfoBlockMentor title="Mentoring Goal" value={normalizedRequest.mentoringGoal} />
                      <InfoBlockMentor title="Additional Message" value={normalizedRequest.additionalMessage} />
                    </div>
                  </div>

                  <div className="mentor-incoming-actions">
                    <button type="button" className="outline" onClick={() => navigate(`/dashboard/mentor/requests/${request.id}`)}>
                      View Details
                    </button>
                    {normalizedRequest.status === 'Pending' ? (
                      <>
                        <button type="button" className="primary" onClick={() => onOpenAccept(request)}>
                          Accept
                        </button>
                        <button type="button" className="danger" onClick={() => onOpenReject(request)}>
                          Reject
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
                  ? `Based on incoming requests, ${featuredRequest.business_name || featuredRequest.requester_name || 'this MSME'} may match your mentor expertise for ${featuredRequest.topic || 'business development'}. Prioritize requests closest to your experience and expertise.`
                  : 'No requests can be analyzed yet. Insights will appear when MSMEs start sending mentoring requests.'}
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
  const [activeFilter, setActiveFilter] = useState('Active')
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
          <h2>My Mentees</h2>
          <p>List of MSMEs whose mentoring requests have been accepted, active, completed, or cancelled.</p>
        </div>
        <span>{mentees.length} MSME</span>
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
          <p>No mentees in this category yet.</p>
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
                <div><dt>Location</dt><dd>{mentee.location}</dd></div>
                <div><dt>Business Field</dt><dd>{mentee.category}</dd></div>
                <div><dt>Topic</dt><dd>{mentee.topic}</dd></div>
                <div><dt>Period</dt><dd>{mentee.period}</dd></div>
                <div><dt>Sessions</dt><dd>{mentee.completedSessions} / {mentee.totalSessions}</dd></div>
                <div><dt>Task</dt><dd>{mentee.completedTasks} / {mentee.totalTasks}</dd></div>
              </dl>

              <div className="mentor-mentee-progress">
                <div>
                  <span>Latest Progress</span>
                  <strong>{mentee.progress}%</strong>
                </div>
                <i><b style={{ width: `${mentee.progress}%` }} /></i>
                <p>{mentee.lastProgress}</p>
              </div>

              <button type="button" onClick={() => navigate(buildMentorWorkspaceUrl(mentee.id, 'tasks'))}>
                <span className="material-symbols-outlined">workspaces</span>
                Open Workspace
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
    if (!window.confirm('Delete task ini? MSME tidak akan melihat task ini lagi.')) return
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
      await updateProgressRecommendation(progressId, 'Focus on the channel with the highest orders and repeat the experiment for 7 days.')
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

  async function uploadMaterialsal(event) {
    event.preventDefault()
    if (!fileForm.file) {
      setWorkspaceError('Choose a material file first.')
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

  if (loading) return <section className="mentor-placeholder-page"><span className="material-symbols-outlined">hourglass_top</span><h2>Loading workspace...</h2><p>Mentoring data is being fetched from the server.</p></section>

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
            <span>Period Program</span>
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
            <article><span>Completed Sessions</span><strong>{completedSessions}/{sessions.length}</strong><p>{nextSession ? `Next: ${nextSession.title}` : 'No next session yet'}</p></article>
            <article><span>Completed Tasks</span><strong>{completedTasks}/{tasks.length}</strong><p>{submittedTasks} tasks submitted by MSMEs</p></article>
            <article><span>Materials</span><strong>{files.length}</strong><p>File sharing is available for MSMEs</p></article>
            <article><span>Notes</span><strong>{notes.length}</strong><p>Notes mentor notes saved</p></article>
          </div>
          <div className="mentor-overview-columns">
            <article className="mentor-overview-panel">
              <header><span className="material-symbols-outlined">flag</span><h3>Mentoring Goal</h3></header>
              <p>{workspace.goal || '-'}</p>
            </article>
            <article className="mentor-overview-panel">
              <header><span className="material-symbols-outlined">event_available</span><h3>Next Session</h3></header>
              <p>{nextSession ? `${nextSession.title} • ${formatDateOnly(nextSession.date)} • ${nextSession.startTime || nextSession.time || '-'}` : 'No next session yet.'}</p>
            </article>
            <article className="mentor-overview-panel wide">
              <header><span className="material-symbols-outlined">assignment</span><h3>Active Tasks</h3></header>
              {activeTasks.length ? (
                <ul>{activeTasks.slice(0, 4).map((task) => <li key={task.id}>{task.title}<span>{formatDateOnly(task.deadline)}</span></li>)}</ul>
              ) : <p>No active tasks right now.</p>}
            </article>
          </div>
        </section>
      )}

      {activeTab === 'MSME Profile' && (
        <div className="mentor-workspace-grid">
          {workspace.profileItems.map((item) => <WorkspaceInfoCard key={item.label} title={item.label} value={item.value} />)}
        </div>
      )}

      {activeTab === 'Session Schedule' && (
        <div className="mentor-session-workspace">
          <form className="mentor-workspace-form mentor-session-form-wide" onSubmit={addSession}>
            <div className="mentor-session-form-head">
              <div>
                <span>Schedule Builder</span>
                <h3>Add Session</h3>
                <p>Schedule mentoring sessions with clear information so MSMEs can follow the agenda easily.</p>
              </div>
            </div>
            {isWorkspaceLocked && (
              <div className="mentor-session-lock-note">
                <span className="material-symbols-outlined">lock</span>
                <p>This workspace status is {workspace.status}, so new sessions cannot be added. Upcoming session dates cannot be saved until the workspace is Active.</p>
              </div>
            )}
            <label>Session Title<input value={sessionForm.title} onChange={(event) => updateSessionForm('title', event.target.value)} required /></label>
            <div className="mentor-flow-grid">
              <label>Date<input type="date" value={sessionForm.date} onChange={(event) => updateSessionForm('date', event.target.value)} required /></label>
              <label>Start Time<input type="time" value={sessionForm.startTime} onChange={(event) => updateSessionForm('startTime', event.target.value)} required /></label>
              <label>End Time<input type="time" value={sessionForm.endTime} onChange={(event) => updateSessionForm('endTime', event.target.value)} required /></label>
              <label>Platform<select value={sessionForm.platform} onChange={(event) => updateSessionForm('platform', event.target.value)}><option>Google Meet</option><option>Zoom</option><option>Other</option></select></label>
            </div>
            <label>Meeting Link<input value={sessionForm.meetingLink} onChange={(event) => updateSessionForm('meetingLink', event.target.value)} /></label>
            <label>Agenda<textarea value={sessionForm.agenda} onChange={(event) => updateSessionForm('agenda', event.target.value)} /></label>
            <button type="submit" disabled={isWorkspaceLocked}>Add Session</button>
          </form>
          <section className="mentor-session-list-panel">
            <header>
              <div>
                <span>Session List</span>
                <h3>{sessions.length} mentoring sessions</h3>
              </div>
              <strong>{sessions.filter((session) => session.status === 'Completed').length}/{sessions.length} completed</strong>
            </header>
            <div className="mentor-session-list">
              {sessions.length === 0 ? (
                <article className="mentor-session-empty">
                  <span className="material-symbols-outlined">event_busy</span>
                  <h3>No sessions yet</h3>
                  <p>Add the first session so the mentoring schedule is visible to the MSME.</p>
                </article>
              ) : sessions.map((session) => (
                <article key={session.id} className="mentor-session-card">
                  <div className="mentor-session-card-main">
                    <div className="mentor-session-topline">
                      <span className={`mentor-session-status ${String(session.status).toLowerCase()}`}>{session.status}</span>
                      <small>{session.platform || '-'}</small>
                    </div>
                    <h3>{session.title}</h3>
                    <p>{session.agenda || 'No session agenda yet.'}</p>
                    {session.cancellationReason && (
                      <div className="mentor-session-cancel-reason">
                        <span className="material-symbols-outlined">info</span>
                        <p>{session.cancellationReason}</p>
                      </div>
                    )}
                  </div>
                  <aside className="mentor-session-card-side">
                    <div className="mentor-session-meta-grid">
                      <div><span>Date</span><strong>{formatDateOnly(session.date)}</strong></div>
                      <div><span>Time</span><strong>{formatTimeRange(session)}</strong></div>
                      <div><span>Meeting</span><strong>{session.meetingLink ? 'Link available' : 'No link yet'}</strong></div>
                    </div>
                    <div className="mentor-session-actions">
                      <button type="button" onClick={() => editSession(session.id)}>Edit</button>
                      <button type="button" className="danger" onClick={() => openCancelSession(session)} disabled={session.status === 'Cancelled' || session.status === 'Completed'}>Cancel</button>
                      <button type="button" className="secondary" onClick={() => updateSessionStatus(session.id, 'Completed')} disabled={session.status === 'Completed' || session.status === 'Cancelled'}>Complete</button>
                    </div>
                  </aside>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}

      {activeTab === 'Mentor Notes' && (
        <div className="mentor-workspace-two-col">
          <form className="mentor-workspace-form" onSubmit={addNote}>
            <h3>Mentor Notes</h3>
            <label>Select Session<select value={noteForm.sessionId} onChange={(event) => updateNoteForm('sessionId', event.target.value)}>{sessions.map((session) => <option key={session.id} value={session.id}>{session.title}</option>)}</select></label>
            <label>MSME Condition Evaluation<textarea value={noteForm.evaluation} onChange={(event) => updateNoteForm('evaluation', event.target.value)} required /></label>
            <label>Blocker Found<textarea value={noteForm.blocker} onChange={(event) => updateNoteForm('blocker', event.target.value)} /></label>
            <label>Advice<textarea value={noteForm.advice} onChange={(event) => updateNoteForm('advice', event.target.value)} required /></label>
            <label>Next Strategy Recommendation<textarea value={noteForm.nextRecommendation} onChange={(event) => updateNoteForm('nextRecommendation', event.target.value)} /></label>
            <button type="submit">Save Note</button>
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
                <h3>{editingTaskId ? 'Edit Task' : 'Add Task'}</h3>
                <p>{editingTaskId ? 'Task changes will immediately appear in the MSME workspace.' : 'Create clear, measurable tasks that are easy for MSMEs to submit.'}</p>
              </div>
              {editingTaskId && <button type="button" className="secondary" onClick={cancelTaskEdit}>Cancel Edit</button>}
            </div>
            <div className="mentor-task-form-grid">
              <label>Task Title<input value={taskForm.title} onChange={(event) => updateTaskForm('title', event.target.value)} required /></label>
              <label>Deadline<input type="date" value={taskForm.deadline} onChange={(event) => updateTaskForm('deadline', event.target.value)} required /></label>
            </div>
            <label>Detailed Instructions<textarea value={taskForm.instruction} onChange={(event) => updateTaskForm('instruction', event.target.value)} required /></label>
            <button type="submit">{editingTaskId ? 'Save Changes' : 'Add Task'}</button>
          </form>
          <section className="mentor-task-list-panel">
            <header>
              <div>
                <span>Task List</span>
                <h3>{tasks.length} mentoring tasks</h3>
              </div>
              <strong>{tasks.filter((task) => task.status === 'Done').length}/{tasks.length} completed</strong>
            </header>
            <div className="mentor-task-list mentor-task-list-compact">
              {tasks.length === 0 ? (
                <article className="mentor-task-empty">
                  <span className="material-symbols-outlined">assignment</span>
                  <h3>No tasks yet</h3>
                  <p>Add the first task so the MSME has an actionable plan.</p>
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
                                {task.submission.submissionStatus === 'Late' ? 'Submitted late' : 'Submitted'}
                              </>
                            ) : (
                              <>
                                <span className="material-symbols-outlined">schedule</span>
                                Not submitted
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
                            <button type="button" className="danger" onClick={() => deleteTask(task.id)}>Delete</button>
                            <button type="button" className="secondary" onClick={() => commentTask(task.id)}>Comment</button>
                          </div>
                        </aside>
                        {commentingTaskId === task.id && (
                          <div className="mentor-task-comment-editor">
                            <label>Comment for MSME<textarea value={taskCommentDrafts[task.id] || ''} onChange={(event) => setTaskCommentDrafts((current) => ({ ...current, [task.id]: event.target.value }))} placeholder="Example: The evidence is good, add a summary of implementation results in the next submission." /></label>
                            <div>
                              <button type="button" onClick={() => saveTaskComment(task.id)}>Save Comment</button>
                              <button type="button" className="secondary" onClick={() => setCommentingTaskId(null)}>Cancel</button>
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
          <form onSubmit={sendMessage}><input value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder="Write a message..." /><button type="submit">Send</button></form>
        </div>
      )}

      {activeTab === 'File Sharing' && (
        <div className="mentor-file-sharing-workspace">
          <form className="mentor-workspace-form mentor-file-upload-form mentor-file-upload-form-wide" onSubmit={uploadMaterialsal}>
            <div className="mentor-file-sharing-head">
              <div>
                <span>File Sharing</span>
                <h3>Upload Materialals</h3>
                <p>Share neat, accessible mentoring materials ready for MSMEs to use in their workspaces.</p>
              </div>
              <div className="mentor-file-sharing-note">
                <span className="material-symbols-outlined">folder_shared</span>
                <p>Uploaded materials will immediately appear in the list below for MSMEs.</p>
              </div>
            </div>
            <div className="mentor-file-sharing-grid">
              <label>Materialsal Title<input value={fileForm.title} onChange={(event) => updateFileForm('title', event.target.value)} placeholder="Example: Content plan template" /></label>
              <label>Note for MSME<textarea value={fileForm.description} onChange={(event) => updateFileForm('description', event.target.value)} placeholder="Add usage context for this material..." /></label>
            </div>
            <label className="mentor-file-picker">
              <span className="material-symbols-outlined">upload_file</span>
              {fileForm.fileName || 'Choose a PDF, document, image, or note file'}
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
            <button type="submit">Upload Materialals</button>
          </form>
          <div className="mentor-workspace-list mentor-material-list mentor-material-list-below">
            <header className="mentor-material-list-header">
              <div>
                <span>Material Listals</span>
                <h3>{files.length} files available</h3>
              </div>
              <p>All uploaded materials are listed below the form for a clearer workflow.</p>
            </header>
            {files.length === 0 ? (
              <article className="mentor-material-empty">
                <span className="material-symbols-outlined">folder_open</span>
                <h3>No materials yet</h3>
                <p>Upload books, PDFs, templates, or notes so MSMEs can access them from their workspace.</p>
              </article>
            ) : files.map((file) => (
              <article key={file.id} className="mentor-material-card">
                <span className="material-symbols-outlined">description</span>
                <div>
                  <h3>{file.title}</h3>
                  <p>{file.description || file.fileName}</p>
                  <small>{file.fileName} • {file.fileSizeLabel} • Uploaded {file.createdAtLabel}</small>
                </div>
                <a href={file.fileUrl} target="_blank" rel="noreferrer">Download</a>
              </article>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'Complete Mentoring' && (
        <form className="mentor-workspace-form wide" onSubmit={completeMentoring}>
          <h3>Complete Mentoring</h3>
          <label>Final Evaluation<textarea value={completionForm.finalEvaluation} onChange={(event) => updateCompletionField('finalEvaluation', event.target.value)} required /></label>
          <label>Mentoring Result<textarea value={completionForm.result} onChange={(event) => updateCompletionField('result', event.target.value)} required /></label>
          <label>MSME Progress<textarea value={completionForm.businessGrowth} onChange={(event) => updateCompletionField('businessGrowth', event.target.value)} required /></label>
          <label>Next Recommendation<textarea value={completionForm.nextRecommendation} onChange={(event) => updateCompletionField('nextRecommendation', event.target.value)} /></label>
          <label>Closing Note<textarea value={completionForm.closingNote} onChange={(event) => updateCompletionField('closingNote', event.target.value)} /></label>
          <button type="submit">Complete Mentoring</button>
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
            <span>Edit Session</span>
            <h2>{form.title || 'Mentoring session'}</h2>
            <p>Schedule changes will appear in the MSME workspace.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close modal">
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>
        <div className="mentor-flow-modal-body">
          <label>Session Title<input value={form.title} onChange={(event) => onUpdate('title', event.target.value)} required /></label>
          <div className="mentor-flow-grid">
            <label>Date<input type="date" value={form.date} onChange={(event) => onUpdate('date', event.target.value)} required /></label>
            <label>Start Time<input type="time" value={form.startTime} onChange={(event) => onUpdate('startTime', event.target.value)} required /></label>
            <label>End Time<input type="time" value={form.endTime} onChange={(event) => onUpdate('endTime', event.target.value)} required /></label>
            <label>Platform<select value={form.platform} onChange={(event) => onUpdate('platform', event.target.value)}><option>Google Meet</option><option>Zoom</option><option>Other</option></select></label>
          </div>
          <label>Meeting Link<input value={form.meetingLink} onChange={(event) => onUpdate('meetingLink', event.target.value)} /></label>
          <label>Agenda<textarea value={form.agenda} onChange={(event) => onUpdate('agenda', event.target.value)} /></label>
        </div>
        <footer>
          <button type="button" onClick={onClose}>Cancel</button>
          <button type="submit">Save Changes</button>
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
            <span>Cancel Sessions</span>
            <h2>{session.title}</h2>
            <p>The cancellation reason will appear in the MSME workspace.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close modal">
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>
        <div className="mentor-flow-modal-body">
          <label>Cancellation Reason<textarea value={reason} onChange={(event) => onUpdate(event.target.value)} placeholder="Example: The mentor schedule changed, the session will be rescheduled next week." required /></label>
        </div>
        <footer>
          <button type="button" onClick={onClose}>Cancel</button>
          <button type="submit">Cancel Sessions</button>
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
            <span>Accept Request</span>
            <h2>{request.business_name || request.requester_name || 'MSME'}</h2>
            <p>{request.topic || 'Business mentoring request'}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close modal">
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>

        <div className="mentor-flow-grid">
          <label>
            Date mulai mentoring
            <input type="date" value={form.startDate} onChange={(event) => updateField('startDate', event.target.value)} required />
          </label>
          <label>
            Date completed mentoring
            <input type="date" value={form.endDate} onChange={(event) => updateField('endDate', event.target.value)} required />
          </label>
        </div>
        <label>
          Acceptance Note for MSME
          <textarea value={form.acceptanceNote} onChange={(event) => updateField('acceptanceNote', event.target.value)} placeholder="Add catatan awal, ekspektasi, atau persiapan untuk MSME..." />
        </label>
        <fieldset>
          <legend>Do you want to create the first session now?</legend>
          <div className="mentor-radio-row">
            <label><input type="radio" checked={form.createFirstSession} onChange={() => updateField('createFirstSession', true)} /> Yes</label>
            <label><input type="radio" checked={!form.createFirstSession} onChange={() => updateField('createFirstSession', false)} /> No</label>
          </div>
        </fieldset>

        {form.createFirstSession && (
          <div className="mentor-first-session-fields">
            <label>
              Session Title pertama
              <input value={form.firstSessionTitle} onChange={(event) => updateField('firstSessionTitle', event.target.value)} required={form.createFirstSession} />
            </label>
            <div className="mentor-flow-grid">
              <label>
                Date sesi
                <input type="date" value={form.firstSessionDate} onChange={(event) => updateField('firstSessionDate', event.target.value)} required={form.createFirstSession} />
              </label>
              <label>
                Start Time
                <input type="time" value={form.firstSessionStartTime} onChange={(event) => updateField('firstSessionStartTime', event.target.value)} required={form.createFirstSession} />
              </label>
              <label>
                End Time
                <input type="time" value={form.firstSessionEndTime} onChange={(event) => updateField('firstSessionEndTime', event.target.value)} required={form.createFirstSession} />
              </label>
              <label>
                Platform
                <select value={form.platform} onChange={(event) => updateField('platform', event.target.value)}>
                  <option>Google Meet</option>
                  <option>Zoom</option>
                  <option>Other</option>
                </select>
              </label>
            </div>
            <label>
              Meeting Link
              <input value={form.meetingLink} onChange={(event) => updateField('meetingLink', event.target.value)} placeholder="https://..." required={form.createFirstSession} />
            </label>
            <label>
              Session Agenda
              <textarea value={form.firstSessionAgenda} onChange={(event) => updateField('firstSessionAgenda', event.target.value)} placeholder="First session agenda and targets..." required={form.createFirstSession} />
            </label>
          </div>
        )}

        <footer>
          <button type="button" className="secondary" onClick={onClose}>Cancel</button>
          <button type="submit">Accept Request</button>
        </footer>
      </form>
    </div>
  )
}

function RejectMentoringModal({ onClose, onSubmit, request }) {
  const [form, setForm] = useState({
    rejectionReason: 'Schedule does not match',
    customReason: '',
  })
  const finalReason = form.rejectionReason === 'Other reason' ? form.customReason.trim() : form.rejectionReason

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
            <span>Reject Request</span>
            <h2>{request.business_name || request.requester_name || 'MSME'}</h2>
            <p>{request.topic || 'Business mentoring request'}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close modal">
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>

        <label>
          Rejection Reason
          <select value={form.rejectionReason} onChange={(event) => setForm((current) => ({ ...current, rejectionReason: event.target.value }))} required>
            <option>Schedule does not match</option>
            <option>Topic outside mentor expertise</option>
            <option>Mentoring quota is full</option>
            <option>MSME information is incomplete</option>
            <option>Other reason</option>
          </select>
        </label>
        {form.rejectionReason === 'Other reason' && (
          <label>
            Reason Details
            <textarea value={form.customReason} onChange={(event) => setForm((current) => ({ ...current, customReason: event.target.value }))} placeholder="Write the rejection reason..." required />
          </label>
        )}

        <footer>
          <button type="button" className="secondary" onClick={onClose}>Cancel</button>
          <button type="submit" disabled={!finalReason}>Reject Request</button>
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
  { label: 'Active', statuses: ['Accepted', 'Active'] },
  { label: 'Completed', statuses: ['Completed'] },
  { label: 'Cancelled', statuses: ['Cancelled'] },
  { label: 'All', statuses: ['all'] },
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
    lastProgress: 'The first week content has been prepared and is awaiting initial performance evaluation.',
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
    lastProgress: 'Program completed. MSME sudah memiliki arah brand dan prioritas eksekusi.',
  },
  {
    id: 'mentee-fallback-cancelled',
    businessName: 'Tani Subur',
    ownerName: 'Agus Santoso',
    location: 'Malang, Jawa Timur',
    category: 'Agribusiness',
    topic: 'Validasi channel distribusi',
    status: 'Cancelled',
    period: 'Cancelled before the first session',
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
  'MSME Profile',
  'Session Schedule',
  'Mentor Notes',
  'Task & Action Plan',
  'Chat',
  'File Sharing',
  'Complete Mentoring',
]

function getMentorWorkspaceTabIcon(tab) {
  const icons = {
    Overview: 'space_dashboard',
    'MSME Profile': 'storefront',
    'Session Schedule': 'calendar_month',
    'Mentor Notes': 'edit_note',
    'Task & Action Plan': 'assignment_turned_in',
    Chat: 'chat_bubble',
    'File Sharing': 'attach_file',
    'Complete Mentoring': 'verified',
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
    businessName: umkm.businessName || request.business_name || request.businessName || request.requester_name || 'MSME',
    ownerName: umkm.ownerName || umkm.name || request.requester_name || request.ownerName || 'MSME Owner',
    location: umkm.location || request.location || 'Not filled',
    category: umkm.category || request.other_category || request.category || 'MSME',
    topic: request.topic || 'Business mentoring',
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
    businessName: workspace.umkm?.businessName || workspace.umkm?.name || 'MSME',
    ownerName: workspace.umkm?.name || 'MSME Owner',
    location: workspace.umkm?.location || 'Not filled',
    category: workspace.umkm?.category || 'MSME',
    topic: workspace.topic || 'Business mentoring',
    status: normalizeMentorRequestStatus(workspace.status),
    startDate: workspace.startDate,
    endDate: workspace.endDate,
    period: buildMentoringPeriod(workspace.startDate, workspace.endDate, workspace.status),
    completedSessions: 0,
    totalSessions: 0,
    completedTasks: 0,
    totalTasks: 0,
    progress: workspace.status === 'Completed' ? 100 : 45 + (index * 10) % 40,
    lastProgress: workspace.acceptanceNote || 'Workspace is active. Progress will appear after the MSME sends an update.',
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
    if (label.trim() === 'Mentoring Duration') result.duration = value
    if (label.trim() === 'Schedule Preference') result.schedulePreference = value
    if (label.trim() === 'Additional Message') result.additionalMessage = value
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
    businessName: umkm.businessName || umkm.name || 'MSME',
    ownerName: umkm.name || 'MSME Owner',
    topic: workspace.topic || 'Business mentoring',
    status: normalizeMentorRequestStatus(workspace.status),
    period: buildMentoringPeriod(workspace.startDate, workspace.endDate, workspace.status),
    goal: workspace.goal || '-',
    businessSummary: umkm.description || `${umkm.businessName || umkm.name || 'MSME'} sedang mengikuti mentoring.`,
    lastProgress: workspace.acceptanceNote || 'No recent progress yet.',
    profileItems: [
      ['Business Name', umkm.businessName || umkm.name || 'MSME'],
      ['Owner Name', umkm.name || 'MSME Owner'],
      ['Location', umkm.location || 'Not filled'],
      ['Business Category', umkm.category || 'MSME'],
      ['Business Description', umkm.description || '-'],
      ['Main Product', '-'],
      ['Target Market', '-'],
      ['Media sosial', '-'],
      ['Omzet saat ini', '-'],
      ['Main Challenge', '-'],
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
    workspaceLabel: workspace.umkm?.businessName || workspace.businessName || workspace.umkm?.name || workspace.ownerName || 'MSME',
    ownerName: workspace.umkm?.name || workspace.ownerName || 'MSME Owner',
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
    workspaceLabel: workspace.umkm?.businessName || workspace.businessName || workspace.umkm?.name || workspace.ownerName || 'MSME',
    ownerName: workspace.umkm?.name || workspace.ownerName || 'MSME Owner',
    sender: senderRole === 'mentor' ? 'Mentor' : 'MSME',
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
    workspaceLabel: workspace.umkm?.businessName || workspace.businessName || workspace.umkm?.name || workspace.ownerName || 'MSME',
    ownerName: workspace.umkm?.name || workspace.ownerName || 'MSME Owner',
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
    sender: role === 'mentor' ? 'Mentor' : 'MSME',
    text: message.message || message.text || '',
    time: formatDateOnly(message.createdAt || message.created_at || new Date().toISOString()),
  }
}

function normalizeMentorWorkspaceFile(file) {
  return {
    id: file.id,
    title: file.title || file.fileName || file.file_name || 'Materials mentoring',
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
  if (status === 'Completed') return 'Complete'
  if (status === 'Cancelled') return 'Cancelled'
  if (!endDate) return '-'
  const diff = new Date(endDate).getTime() - new Date().setHours(0, 0, 0, 0)
  const days = Math.ceil(diff / 86400000)
  if (Number.isNaN(days)) return '-'
  if (days <= 0) return 'Ends today'
  return `${days} days left`
}

function normalizeMentorApiNote(note) {
  return {
    id: note.id,
    sessionId: note.session_id || note.sessionId,
    sessionTitle: note.session_title || note.sessionTitle || 'Notes mentor',
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
  const businessName = snapshot?.businessName || request?.businessName || fallback?.businessName || 'MSME'
  const ownerName = snapshot?.ownerName || request?.ownerName || fallback?.ownerName || 'MSME Owner'
  const topic = snapshot?.topic || request?.topic || fallback?.topic || 'Business mentoring'
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
    goal: request?.mentoringGoal || 'Improve business readiness, strategy execution, and MSME progress monitoring.',
    lastProgress: fallback?.lastProgress || 'The MSME has sent initial progress for mentor review.',
    profileItems: [
      ['Business Name', businessName],
      ['Owner Name', ownerName],
      ['Location', request?.location || fallback?.location || 'Not filled'],
      ['Business Category', request?.category || fallback?.category || 'MSME'],
      ['Business Description', 'Local MSME with growth potential through digital marketing and more measurable operations.'],
      ['Main Product', 'MSME featured products and promotional packages'],
      ['Target Market', 'Retail customers, resellers, and local communities'],
      ['Media sosial', '@microfun_umkm'],
      ['Omzet saat ini', 'Rp 7.800.000 / bulan'],
      ['Main Challenge', request?.businessProblem || 'Execution consistency and result measurement.'],
      ['Tujuan mentoring', request?.mentoringGoal || 'Menyusun rencana kerja yang praktis dan terukur.'],
    ].map(([label, value]) => ({ label, value })),
    sessions: firstSession ? [{
      id: 'first-session',
      title: firstSession.title || 'First session',
      date: firstSession.date,
      startTime: firstSession.startTime,
      endTime: firstSession.endTime,
      platform: firstSession.platform || 'Google Meet',
      meetingLink: firstSession.meetingLink || '#',
      agenda: firstSession.agenda || 'Session Agenda pertama.',
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
      { id: 'task-default-2', title: 'Create a 7-day experiment', instruction: 'Create one promotion experiment and measure the results.', deadline: '2026-06-07', priority: 'Medium', status: 'Pending', comment: '' },
    ],
    notes: [
      { id: 'note-default', sessionTitle: 'Kickoff mentoring', date: '2026-05-29', evaluation: 'The MSME is ready to start the mentoring program.', advice: 'Start from baseline data and simple targets.', nextRecommendation: 'Send weekly progress.' },
    ],
    progressList: [
      { id: 'progress-default', updateDate: '2026-05-25', revenue: 'Rp 7.800.000', orders: '96', followers: '3.840', engagement: '5.8%', blocker: 'Posting belum konsisten.', implementationResult: 'Konten edukasi mulai menghasilkan pesan masuk.', question: 'Bagaimana menentukan CTA terbaik?' },
    ],
    messages: [
      { id: 'message-default-1', sender: 'MSME', text: 'I have sent this week progress.', time: 'Today' },
      { id: 'message-default-2', sender: 'Mentor', text: 'Sure, I will review it and provide recommendations in the Progress tab.', time: 'Just now' },
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
    businessName: workspace.businessName || 'MSME',
    ownerName: workspace.ownerName || 'MSME Owner',
    location: workspace.location || 'Not filled',
    category: workspace.category || 'MSME',
    topic: workspace.topic || 'Business mentoring',
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
  if (status === 'Cancelled' && !startDate) return 'Cancelled before the first session'
  if (!startDate && !endDate) return 'Period belum ditentukan'
  return `${formatDateOnly(startDate)} - ${formatDateOnly(endDate)}`
}

function getLastProgressCopy(status, progress) {
  if (status === 'Completed') return 'Program completed dan arsip mentoring siap dibuka.'
  if (status === 'Cancelled') return 'Program dibatalkan sebelum seluruh rencana berjalan.'
  if (progress >= 70) return 'The MSME has completed most sessions and priority tasks.'
  if (progress >= 35) return 'Mentoring is ongoing, and several initial tasks have started execution.'
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
      current_job: profile.current_job || 'MSME Mentor',
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
    mentorProfession: profile.current_job || 'MSME Mentor',
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
    profile: 'MSME Profile',
    session: 'Session Schedule',
    sessions: 'Session Schedule',
    'task-and-action-plan': 'Task & Action Plan',
    tasks: 'Task & Action Plan',
    notes: 'Mentor Notes',
    chat: 'Chat',
    files: 'File Sharing',
    evaluation: 'Complete Mentoring',
  }

  return tabMap[normalized] || 'Overview'
}

function buildWorkspaceTabSearch(tab) {
  const tabMap = {
    Overview: 'overview',
    'MSME Profile': 'profile',
    'Session Schedule': 'sessions',
    'Task & Action Plan': 'tasks',
    'Mentor Notes': 'notes',
    Chat: 'chat',
    'File Sharing': 'files',
    'Complete Mentoring': 'evaluation',
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
    const label = deadline ? formatDateOnly(task.deadline) : 'No deadline'
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
    const label = sessionDate ? formatDateOnly(session.date) : 'No date'
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
  return new Intl.DateTimeFormat('en-US', {
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

function getProfilePhotoUrl(photo, apiBaseUrl) {
  if (!photo) return ''
  return String(photo).startsWith('/') ? `${apiBaseUrl}${photo}` : photo
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
  if (activeTab === 'Profile') return 'Profile'
  if (activeTab === 'Forum') return 'Forum'
  if (activeTab === 'Incoming Requests' || activeTab === 'My Mentees' || activeTab === 'Session Schedule' || activeTab === 'Task & Action Plan' || activeTab === 'Messages') return 'Mentoring'
  if (activeTab === 'Workspace Mentor') return 'Workspace Mentor'
  if (isMentorSessionTab(activeTab)) return activeTab
  return `Hello, ${displayName}`
}

function getMentorPageSubtitle(activeTab) {
  if (activeTab === 'Profile') return 'Complete your location, address, profile photo, expertise, achievements, and experience.'
  if (activeTab === 'Forum') return 'Share knowledge, discuss challenges, and build networks across MicroFun.'
  if (activeTab === 'Incoming Requests') return 'Review and manage mentoring requests from MSMEs. Choose the most suitable request based on your expertise.'
  if (activeTab === 'My Mentees') return 'List of MSMEs whose mentoring requests have been accepted, active, completed, or cancelled.'
  if (activeTab === 'Workspace Mentor') return 'Workspace details will be built in the next stage.'
  if (activeTab === 'Messages') return 'Manage chats from all mentee workspaces without opening each workspace one by one.'
  if (activeTab === 'Task & Action Plan') return 'View all tasks from every mentee workspace, sorted by deadline so progress is easier to monitor.'
  if (activeTab === 'Session Schedule') return 'Shortcut to all mentoring sessions from every mentee workspace, sorted by nearest date.'
  if (isMentorSessionTab(activeTab)) return 'Manage active mentoring processes with MSMEs.'
  return 'Summary of mentoring performance, schedule, and recent activity.'
}

function isMentorSessionTab(activeTab) {
  return ['Session Schedule', 'Task & Action Plan'].includes(activeTab)
}

function deriveMenteeProgress(mentee, index) {
  if (mentee.status === 'completed') return 92
  if (mentee.status === 'accepted') return 78
  if (mentee.status === 'pending') return 55 + (index % 3) * 8
  return 45
}

function formatDateTime(value) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function formatDateOnly(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(date)
}

function formatDateRange() {
  const now = new Date()
  const next = new Date()
  next.setDate(now.getDate() + 7)

  const formatter = new Intl.DateTimeFormat('en-US', { day: '2-digit', month: 'short' })
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
  return new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

function formatRelativeDate(value) {
  if (!value) return 'Just now'
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(value))
}

function formatRequestAge(value) {
  if (!value) return 'Just now'

  const targetDate = new Date(value)
  if (Number.isNaN(targetDate.getTime())) return 'Just now'

  const diffMs = Date.now() - targetDate.getTime()
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000))
  if (diffMinutes < 60) return `${diffMinutes || 1}m ago`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`

  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(targetDate)
}

function formatCurrency(value) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
}

export default MentorDashboardPage


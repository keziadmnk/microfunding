import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import {
  getCurrentUser,
  getStoredUser,
  isAuthenticated,
  logout,
} from '../services/authService'
import {
  cancelMentoringRequest,
  createBusinessProgress,
  createMentoringRequest,
  getMentors,
  getUmkmRequests,
  getUmkmTasks,
  getUmkmWorkspaces,
  getWorkspace,
  getWorkspaceNotes,
  getWorkspaceProgress,
  getWorkspaceSessions,
  getWorkspaceTasks,
  getWorkspaceMessages,
  getWorkspaceFiles,
  sendWorkspaceMessage,
  submitTask,
  cancelTaskSubmission as cancelTaskSubmissionApi,
} from '../services/mentoringService'
import { getMentoringSocket } from '../services/mentoringSocket'
import DashboardSection from '../components/dashboard/DashboardSection'
import DashboardSidebar from '../components/dashboard/DashboardSidebar'
import DashboardTopBar from '../components/dashboard/DashboardTopBar'
import ForumPostCard from '../components/dashboard/ForumPostCard'
import ForumPage from '../components/dashboard/ForumPage'
import ProgressOverviewCard from '../components/dashboard/ProgressOverviewCard'
import QuickActionButton from '../components/dashboard/QuickActionButton'
import SessionCard from '../components/dashboard/SessionCard'
import StatCard from '../components/dashboard/StatCard'
import ProfileForm from '../components/dashboard/ProfileForm'
import AiBusinessAdvisor from '../components/dashboard/AiBusinessAdvisor'
import './UmkmDashboardPage.css'

const mentorshipSessions = [
  {
    title: 'Financial Modeling',
    mentor: 'Sarah Jenkins',
    schedule: 'Tomorrow, 10:00 AM',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCYnkVbN9nsqEYf3r_y0BXrgGzX6rKTfDhN4V6RaUfmT1NgK_XttJOKUq3Xk9MnNQz_Zxt1roVbbIcqg8akL-_qdJRi4rYQiVnoBu1ZLsZ-7cpq6S6wcZwAtC5weO2-vn_TdF3VRAF8j4bYDXqT_ISlWlxbFAQbwHCrTtSIVb4NmZTeeJq-TdCQ6ZUb5mUUNr4lyG8g_HcXj4_YcH82mLEmPEERF1DGENp88Dt_4gEjV1yKDDCcgVMtfz-YpHSNtiXe4SsGigYI83Q',
  },
  {
    title: 'Scaling Logistics',
    mentor: 'Marcus Thorne',
    schedule: 'Oct 24, 02:30 PM',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAGyNbvSODQ9xQRNV6FnX1HZ3tJ8dUVfZgSVVkYQFddahRUqvNv-G1SNGJWjYMdSYDXgoChJpHnGj_NWGcLqlvrl2lgPtoboiDfdJheWSO1DBLnTPPesCFgJ4SZUf_5vMuspphiaV1Rx7bHZ8UjdJ6sBfAqeNH4ydjsoHNDzeQmJUPFBZCG-3hG_2Jt4eVR2kVQsX-tUag5sXLQwwz18daVWYQ8dUcsslUhEJj0NL1Bmt_RMVVMHrAXJ-51yDajXoAWtJn76nzMw48',
  },
]

const quickActions = [
  {
    label: 'Submit New Request',
    icon: 'add_circle',
    variant: 'primary',
  },
  {
    label: 'Update Business Profile',
    icon: 'edit',
    variant: 'secondary',
  },
]

const umkmNavItems = [
  { label: 'Dashboard', icon: 'dashboard' },
  { label: 'AI Matching', icon: 'hub' },
  { label: 'AI Business Advisor', icon: 'smart_toy' },
  {
    label: 'Mentoring',
    icon: 'video_chat',
    children: [
      { label: 'Find Mentor', icon: 'person_search' },
      { label: 'My Mentoring', icon: 'groups' },
      { label: 'My Task', icon: 'task_alt' },
    ],
  },
  { label: 'Funding History', icon: 'history' },
  { label: 'Forum', icon: 'forum' },
  { label: 'Profile', icon: 'storefront' },
]

const umkmTabRoutes = {
  Dashboard: '/dashboard/umkm',
  'AI Matching': '/dashboard/umkm',
  'AI Business Advisor': '/dashboard/umkm',
  'Find Mentor': '/dashboard/umkm/mentoring/find',
  'My Mentoring': '/dashboard/umkm/mentoring/my',
  'My Task': '/dashboard/umkm/mentoring/tasks',
  'Funding History': '/dashboard/umkm',
  Forum: '/dashboard/umkm',
  Profile: '/dashboard/umkm',
}

const umkmRouteTabs = {
  '/dashboard/umkm/mentoring/find': 'Find Mentor',
  '/dashboard/umkm/mentoring/my': 'My Mentoring',
  '/dashboard/umkm/mentoring/tasks': 'My Task',
}

const mentoringRequestStorageKey = 'microfun_umkm_mentoring_requests'

function getUmkmRouteTab(pathname) {
  if (pathname.startsWith('/dashboard/umkm/mentoring/workspace/')) return 'Workspace Mentoring'
  return umkmRouteTabs[pathname]
}

function UmkmDashboardPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(getStoredUser())
  const [error, setError] = useState('')
  const [activeTabState, setActiveTabState] = useState('Dashboard')
  const activeTab = getUmkmRouteTab(location.pathname) || activeTabState
  const [aiMatchingLoading, setAiMatchingLoading] = useState(false)
  const [aiMatchingError, setAiMatchingError] = useState('')
  const [aiMatchingResult, setAiMatchingResult] = useState(null)
  const [aiRequestMessage, setAiRequestMessage] = useState('')
  const [mentors, setMentors] = useState([])
  const [mentorsLoading, setMentorsLoading] = useState(false)
  const [mentorsError, setMentorsError] = useState('')
  const [selectedMentor, setSelectedMentor] = useState(null)
  const [requestMessage, setRequestMessage] = useState('')
  const [requestSubmitting, setRequestSubmitting] = useState(false)
  const [fundingHistory, setFundingHistory] = useState({ summary: null, funders: [], pendingRequests: [] })
  const [fundingHistoryLoading, setFundingHistoryLoading] = useState(false)
  const [fundingHistoryError, setFundingHistoryError] = useState('')
  const [availableFunders, setAvailableFunders] = useState([])
  const [fundersLoading, setFundersLoading] = useState(false)
  const [fundersError, setFundersError] = useState('')
  const [selectedFunder, setSelectedFunder] = useState(null)
  const [funderRequestMessage, setFunderRequestMessage] = useState('')
  const [funderRequestSubmitting, setFunderRequestSubmitting] = useState(false)
  const [forumPreviewPosts, setForumPreviewPosts] = useState([])
  const [forumPreviewLoading, setForumPreviewLoading] = useState(false)
  const [forumPreviewError, setForumPreviewError] = useState('')

  const fetchForumPreview = useCallback(async () => {
    const token = localStorage.getItem('microfun_auth_token')
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'

    setForumPreviewLoading(true)
    setForumPreviewError('')

    try {
      const response = await fetch(`${apiBaseUrl}/api/forum/posts`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.message || 'Failed to load forum activity.')

      setForumPreviewPosts((payload.posts || []).slice(0, 2).map((post) => normalizeForumPreviewPost(post, apiBaseUrl)))
    } catch (err) {
      setForumPreviewError(err.message)
      setForumPreviewPosts([])
    } finally {
      setForumPreviewLoading(false)
    }
  }, [])

  const fetchMentors = useCallback(async () => {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'

    setMentorsLoading(true)
    setMentorsError('')

    try {
      const data = await getMentors()
      setMentors(data.map((mentor) => normalizeMentorProfile(mentor, apiBaseUrl)))
    } catch (err) {
      setMentorsError(err.message)
    } finally {
      setMentorsLoading(false)
    }
  }, [])

  const fetchFundingHistory = useCallback(async () => {
    const token = localStorage.getItem('microfun_auth_token')
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'

    setFundingHistoryLoading(true)
    setFundingHistoryError('')

    try {
      const response = await fetch(`${apiBaseUrl}/api/funding/umkm/history`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.message || 'Failed to load funding history.')

      setFundingHistory({
        summary: payload.summary || null,
        funders: payload.funders || [],
        pendingRequests: payload.pendingRequests || [],
      })
    } catch (err) {
      setFundingHistoryError(err.message)
      setFundingHistory({ summary: null, funders: [], pendingRequests: [] })
    } finally {
      setFundingHistoryLoading(false)
    }
  }, [])

  const fetchAvailableFunders = useCallback(async () => {
    const token = localStorage.getItem('microfun_auth_token')
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'

    setFundersLoading(true)
    setFundersError('')

    try {
      const response = await fetch(`${apiBaseUrl}/api/funding/funders`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.message || 'Failed to load funder list.')
      setAvailableFunders((payload.data || []).map(normalizeFunderForUmkm))
    } catch (err) {
      setFundersError(err.message)
      setAvailableFunders([])
    } finally {
      setFundersLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login', { replace: true })
      return
    }

    getCurrentUser()
      .then((profile) => {
        // Redirect non-UMKM roles to their own dashboard
        if (profile.role !== 'umkm_owner') {
          const roleDashboardMap = {
            funder: '/dashboard/funder',
            mentor: '/dashboard/mentor',
            admin: '/dashboard/admin',
          }
          navigate(roleDashboardMap[profile.role] || '/login', { replace: true })
          return
        }
        setUser(profile)
        if (Number(profile.businessVerified ?? profile.ownerVerified ?? 0) !== 1) {
          setActiveTabState('Profile')
        }
        setError('')
        fetchMentors()
        fetchFundingHistory()
        fetchAvailableFunders()
        fetchForumPreview()
      })
      .catch((err) => {
        setError(err.message || 'Session expired, please login again.')
        logout()
        navigate('/login', { replace: true })
      })
      .finally(() => {
        setLoading(false)
      })
  }, [fetchAvailableFunders, fetchForumPreview, fetchFundingHistory, fetchMentors, navigate])

  function handleTabChange(tab) {
    setActiveTabState(tab)
    const route = umkmTabRoutes[tab]
    if (route && route !== location.pathname) {
      navigate(route)
    }
  }

  const displayName = useMemo(() => user?.name || 'MSME', [user])
  const businessAvatarUrl = useMemo(() => getUmkmBusinessAvatar(user), [user])
  const isVerificationLocked = user?.role === 'umkm_owner' && Number(user?.businessVerified ?? user?.ownerVerified ?? 0) !== 1
  const shouldShowLockedFeature = isVerificationLocked && activeTab !== 'Profile'
  const topbarCopy = useMemo(() => {
    if (activeTab === 'Profile') {
      return {
        title: 'MSME Profile Settings',
        subtitle: 'Manage business information, legal documents, and AI funding targets.',
      }
    }

    if (activeTab === 'AI Business Advisor') {
      return {
        title: 'AI Business Advisor',
        subtitle: 'Get business strategy guidance based on your MSME profile and market insights.',
      }
    }

    if (activeTab === 'AI Matching') {
      return {
        title: 'AI Matching',
        subtitle: 'Find funders and mentors that match your MSME business profile.',
      }
    }

    if (activeTab === 'Find Mentor') {
      return {
        title: 'Find Mentor',
        subtitle: 'Choose the mentor that best matches your challenges and business goals.',
      }
    }

    if (activeTab === 'My Mentoring') {
      return {
        title: 'My Mentoring',
        subtitle: 'Monitor your mentoring requests and upcoming or ongoing sessions.',
      }
    }

    if (activeTab === 'My Task') {
      return {
        title: 'My Task',
        subtitle: 'View all mentor-assigned tasks in one place.',
      }
    }

    if (activeTab === 'Funding History') {
      return {
        title: 'Funding History',
        subtitle: 'Track total funds raised and funders who have supported your MSME.',
      }
    }

    if (activeTab === 'Forum') {
      return {
        title: 'Forum',
        subtitle: 'Share knowledge, discuss challenges, and build networks across MicroFun.',
      }
    }

    if (activeTab === 'Workspace Mentoring') {
      return {
        title: 'Workspace Mentoring',
        subtitle: 'Ruang kerja mentoring akan dikembangkan pada tahap berikutnya.',
      }
    }

    return {
      title: `Welcome back, ${displayName} (MSME)`,
      subtitle: "Here's what's happening with your business growth today.",
    }
  }, [activeTab, displayName])

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  async function handleMentorRequest(formData) {
    setRequestMessage('')
    setMentorsError('')
    setRequestSubmitting(true)

    try {
      const payload = await createMentoringRequest({
        mentorId: selectedMentor.id,
        umkmUserId: user?.id,
        topic: formData.topic,
        businessProblem: formData.businessProblem,
        mentoringGoal: formData.mentoringGoal,
        duration: formData.duration,
        preferredSchedule: formData.preferredSchedule,
        additionalMessage: formData.additionalMessage,
      })
      setRequestMessage(payload.message)
      setSelectedMentor(null)
    } catch (err) {
      setMentorsError(err.message)
    } finally {
      setRequestSubmitting(false)
    }
  }

  async function handleFunderRequest(formData) {
    const token = localStorage.getItem('microfun_auth_token')
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'

    setFunderRequestMessage('')
    setFundersError('')
    setFunderRequestSubmitting(true)

    try {
      const response = await fetch(`${apiBaseUrl}/api/funding/funders/${selectedFunder.id}/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.message || 'Failed to send funding request.')

      setFunderRequestMessage(payload.message || 'Funding request sent successfully.')
      setSelectedFunder(null)
      fetchFundingHistory()
    } catch (err) {
      setFundersError(err.message)
    } finally {
      setFunderRequestSubmitting(false)
    }
  }

  async function handleAiMatching() {
    const token = localStorage.getItem('microfun_auth_token')
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'

    setAiMatchingLoading(true)
    setAiMatchingError('')
    setAiRequestMessage('')

    try {
      const response = await fetch(`${apiBaseUrl}/api/ai/umkm-matching`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Failed to run AI analysis.')
      setAiMatchingResult(data)
    } catch (err) {
      setAiMatchingError(err.message)
    } finally {
      setAiMatchingLoading(false)
    }
  }

  if (loading) {
    return <main className="dashboard-loading">Loading dashboard...</main>
  }

  return (
    <div className="dashboard-shell">
      <DashboardSidebar
        onLogout={handleLogout}
        activeTab={activeTab}
        ctaLabel=""
        navItems={umkmNavItems}
        onTabChange={handleTabChange}
      />

      <main className="dashboard-main">
        <DashboardTopBar
          title={topbarCopy.title}
          subtitle={topbarCopy.subtitle}
          avatarAlt={`${user?.businessName || displayName} logo`}
          avatarUrl={businessAvatarUrl}
        />

        {error && <p className="dashboard-error">{error}</p>}

        {shouldShowLockedFeature ? (
          <VerificationLockedView />
        ) : activeTab === 'Profile' ? (
          <ProfileForm onCancel={() => handleTabChange('Dashboard')} />
        ) : activeTab === 'AI Business Advisor' ? (
          <AiBusinessAdvisor userName={displayName} />
        ) : activeTab === 'AI Matching' ? (
          <AiMatchingView
            error={aiMatchingError}
            funders={availableFunders}
            fundersError={fundersError}
            fundersLoading={fundersLoading}
            funderRequestMessage={funderRequestMessage}
            loading={aiMatchingLoading}
            onAnalyze={handleAiMatching}
            onRequestFunder={setSelectedFunder}
            onRequestMentor={(mentor) => {
              setAiRequestMessage(`Please select ${mentor.name} on the Find Mentor page to send a mentoring request.`)
              handleTabChange('Find Mentor')
            }}
            requestMessage={aiRequestMessage}
            result={aiMatchingResult}
          />
        ) : activeTab === 'Find Mentor' ? (
          <FindMentorView
            error={mentorsError}
            loading={mentorsLoading}
            mentors={mentors}
            onRequest={setSelectedMentor}
            requestMessage={requestMessage}
          />
        ) : activeTab === 'My Mentoring' ? (
          <MyMentoringView userId={user?.id} />
        ) : activeTab === 'My Task' ? (
          <UmkmTaskView userId={user?.id} />
        ) : activeTab === 'Funding History' ? (
          <FundingHistoryView
            error={fundingHistoryError}
            funders={fundingHistory.funders}
            loading={fundingHistoryLoading}
            onRefresh={fetchFundingHistory}
            pendingRequests={fundingHistory.pendingRequests}
            summary={fundingHistory.summary}
          />
        ) : activeTab === 'Forum' ? (
          <ForumPage currentUser={user} userLocation={user?.address} />
        ) : activeTab === 'Workspace Mentoring' ? (
          <MentoringWorkspacePlaceholder mentoringId={getMentoringIdFromPath(location.pathname)} onBack={() => navigate('/dashboard/umkm/mentoring/my')} />
        ) : activeTab === 'Dashboard' ? (
          <div className="dashboard-grid">
            <AiMatchingView
              error={aiMatchingError}
              funders={availableFunders}
              fundersError={fundersError}
              fundersLoading={fundersLoading}
              funderRequestMessage={funderRequestMessage}
              loading={aiMatchingLoading}
              onAnalyze={handleAiMatching}
              onRequestFunder={setSelectedFunder}
              onRequestMentor={(mentor) => {
                setAiRequestMessage(`Please select ${mentor.name} on the Find Mentor page to send a mentoring request.`)
                handleTabChange('Find Mentor')
              }}
              requestMessage={aiRequestMessage}
              result={aiMatchingResult}
            />

            <DashboardSection
              className="dashboard-section dashboard-forum-section"
              span="wide"
              title="Forum Activity"
              actionLabel="View All"
              onAction={() => handleTabChange('Forum')}
            >
              <div className="forum-list" id="forum">
                {forumPreviewLoading ? (
                  <p className="dashboard-muted-copy">Loading forum activity...</p>
                ) : forumPreviewPosts.length > 0 ? (
                  forumPreviewPosts.map((post) => (
                    <ForumPostCard key={post.id} {...post} />
                  ))
                ) : (
                  <p className="dashboard-muted-copy">{forumPreviewError || 'No forum activity yet.'}</p>
                )}
              </div>

              <div className="forum-composer">
                <img
                  alt={`${user?.businessName || displayName} logo`}
                  src={businessAvatarUrl}
                />
                <div className="forum-composer-input">
                  <input
                    type="text"
                    placeholder="Share an update or ask a question..."
                  />
                  <button type="button" aria-label="Send forum message">
                    <span className="material-symbols-outlined" aria-hidden="true">
                      send
                    </span>
                  </button>
                </div>
              </div>
            </DashboardSection>

            <DashboardSection className="dashboard-section dashboard-status-section" title="Funding Status">
              <ProgressOverviewCard
                progress={65}
                currentAmount="$32,500"
                targetAmount="$50,000"
                investorAvatars={[
                  'https://lh3.googleusercontent.com/aida-public/AB6AXuDSrYW5kWc6K8OBpO5cBe8wVNZ1qamPVr4ZglIkrb4YPRRR_4UvmpQkNrFJG93dQ4MMOBQcgZpndLgpNoT1gaGeHgBDC87ggmptRpplp3C93Q0nP-tVaxvXu15Qou40Qj8SwgemDkg6Bk_JVRZn56LhGnklVIi4U2xwOZxUjDq4ROoA6jsXF5qlVSXgkEv2YbfydxnrICT_UjrYnuce1d5bhm3Lzk8mt421tP9NeEODtt4A7HKeMP62jPz7LyLxs_7bD18ENrVdnfI',
                  'https://lh3.googleusercontent.com/aida-public/AB6AXuCiisoVElXb4MZr8sivsvP9brGsqu7U_U0HXuUuIVBx9l4HcyLoLaWgNqRz0BjrKbhfb5Xx8H_2QFstmav4RnJDzh8KuuBRc4a8JkEG9zyo_RDffVqpzA32aBwCsucOo4ckn-A54Je_1F5ROiLhCgXfRs31FfUmPx_xoP0s-23y0cfRPDsZdRKZvr4AdUWGS3wPdY8Gr5cLkMcOaYteFA6pp5AEHyvnIB6wdvBBB4aZs2mV8g_n8JIM37u55fi_sIhSeOYJ-WCswIQ',
                  'https://lh3.googleusercontent.com/aida-public/AB6AXuBBDZOIla4haMKp7ecKEOqgiqeJBeO_0TQ2_auutm0eOdpCX55pMoldxFt2NJuut5j_zQW-C9ljekIQnbJxypU4J0XgYN-aDd4VueFPwagk3mjL_VcX4goo30w-4xlicfXFGH_92HybacrI5oLejDTSplQak1Z5uZiisVrfyIak0z4uRXytmxZ8rvsPKUu7CZ83hmzPba6lWpWkGjsCkF0dpZndC3KoadE_pH-peC5qni9w8P9NY-1SB9bpVy_LUKD-0t04Ipo2QeM',
                ]}
              />
            </DashboardSection>

            <DashboardSection className="dashboard-section dashboard-mentorship-section" span="wide" title="Mentorship Sessions" actionLabel="View All">
              <div className="session-grid">
                {mentorshipSessions.map((session) => (
                  <SessionCard key={`${session.title}-${session.mentor}`} {...session} />
                ))}
              </div>
            </DashboardSection>

            <DashboardSection className="dashboard-section dashboard-actions-section" title="Quick Actions">
              <div className="quick-actions-list">
                {quickActions.map((action) => (
                  <QuickActionButton
                    key={action.label}
                    {...action}
                    onClick={
                      action.label === 'Update Business Profile'
                        ? () => handleTabChange('Profile')
                        : undefined
                    }
                  />
                ))}
              </div>

              <div className="growth-card">
                <p className="growth-title">Ready for Growth?</p>
                <p className="growth-copy">Invite business partners to join your MicroFun network.</p>
                <button type="button" className="growth-button">
                  Invite Now
                </button>
                <span className="material-symbols-outlined growth-icon" aria-hidden="true">
                  rocket_launch
                </span>
              </div>
            </DashboardSection>
          </div>
        ) : (
          <div className="profile-card" style={{ padding: '4rem 2rem', textAlign: 'center', margin: '2rem auto', maxWidth: '600px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '3.5rem', color: '#cea761', marginBottom: '1.25rem' }}>
              construction
            </span>
            <h3 style={{ margin: 0, color: '#122937', fontSize: '1.4rem', fontWeight: 800 }}>Feature In Progress</h3>
            <p style={{ color: '#43474b', margin: '0.75rem 0 1.75rem', fontSize: '0.95rem', lineHeight: 1.6 }}>
              The <strong>{activeTab}</strong> page is being prepared and will be available soon to support your business growth.
            </p>
            <button
              type="button"
              className="dashboard-primary-action"
              onClick={() => handleTabChange('Dashboard')}
              style={{ margin: '0 auto', display: 'flex', border: 0 }}
            >
              <span className="material-symbols-outlined">dashboard</span>
              Back to Dashboard
            </button>
          </div>
        )}

        {selectedMentor && (
          <MentorRequestModal
            submitting={requestSubmitting}
            mentor={selectedMentor}
            onClose={() => setSelectedMentor(null)}
            onSubmit={handleMentorRequest}
          />
        )}

        {selectedFunder && (
          <FunderRequestModal
            funder={selectedFunder}
            submitting={funderRequestSubmitting}
            onClose={() => setSelectedFunder(null)}
            onSubmit={handleFunderRequest}
          />
        )}

        {activeTab !== 'Workspace Mentoring' && (
        <footer className="dashboard-footer">
          <p>© 2024 MicroFun. Impacting Indonesian MSMEs through Global Connection.</p>
          <div>
            <a href="#">Forum</a>
            <a href="#">Legal Information</a>
            <a href="#">Privacy Policy</a>
          </div>
        </footer>
        )}
      </main>
    </div>
  )
}

function VerificationLockedView() {
  return (
    <section className="umkm-verification-lock">
      <div className="umkm-verification-lock-icon">
        <span className="material-symbols-outlined">lock</span>
      </div>
      <span>Awaiting Admin Verification</span>
      <h2>Your Features Are Still Locked</h2>
      <p>
        After registration, MSME accounts can only access the Profile page until an admin approves
        their business data and legal documents.
      </p>
    </section>
  )
}

function AiMatchingView({
  error,
  funders,
  fundersError,
  fundersLoading,
  funderRequestMessage,
  loading,
  onAnalyze,
  onRequestFunder,
  onRequestMentor,
  requestMessage,
  result,
}) {
  return (
    <div className="ai-matching-page dashboard-section dashboard-hero-section span-full">
        <div className="dashboard-hero-card">
          <div className="dashboard-hero-icon">
            <span className="material-symbols-outlined" aria-hidden="true">
              lightbulb
            </span>
          </div>
          <div className="dashboard-hero-copy">
            <div className="dashboard-pill">
              <span className="material-symbols-outlined" aria-hidden="true">
                bolt
              </span>
              <span>Powered by AI</span>
            </div>
            <h2>Find Funders and Mentors with AI</h2>
            <p>
              Our AI system analyzes your business profile, industry, and needs
              to find the most suitable funders and mentors.
            </p>
            <div className="dashboard-hero-metrics">
              <StatCard
                icon="analytics"
                title="AI Match Score"
                description="Multi-dimensional analysis based on your business profile"
              />
              <StatCard
                icon="groups_3"
                title="3 Funders + 3 Mentors"
                description="Curated recommendations based on sector and funding needs"
              />
              <StatCard
                icon="forum"
                title="AI Insight Explanation"
                description="Why each recommendation is relevant to your business"
              />
            </div>
            <div className="dashboard-hero-actions">
              <button
                type="button"
                className="dashboard-primary-action"
                onClick={onAnalyze}
                disabled={loading}
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  {loading ? 'hourglass_empty' : 'bolt'}
                </span>
                {loading ? 'Analyzing...' : 'Start AI Analysis'}
              </button>
              <a href="#ai-match-results" className="dashboard-text-action">
                <span className="material-symbols-outlined" aria-hidden="true">
                  search
                </span>
                View Results
              </a>
            </div>
          </div>

          {(error || result) && (
            <AiMatchingPanel
              error={error}
              onRequestFunder={onRequestFunder}
              onRequestMentor={onRequestMentor}
              requestMessage={requestMessage}
              result={result}
            />
          )}
        </div>
        <FunderDirectoryPanel
          error={fundersError}
          funders={funders}
          loading={fundersLoading}
          onRequestFunder={onRequestFunder}
          requestMessage={funderRequestMessage}
        />
    </div>
  )
}

function FunderDirectoryPanel({ error, funders, loading, onRequestFunder, requestMessage }) {
  return (
    <section className="umkm-funder-directory" id="ai-funder-directory">
      <header className="umkm-funder-directory-head">
        <div>
          <span>All Funders</span>
          <h2>Registered Funders</h2>
          <p>Choose funders that match your funding needs and business profile.</p>
        </div>
        <strong>{funders.length} active funders</strong>
      </header>

      {requestMessage && (
        <div className="ai-match-request-alert">
          <span className="material-symbols-outlined">check_circle</span>
          <p>{requestMessage}</p>
        </div>
      )}

      {error && <p className="dashboard-error">{error}</p>}

      {loading ? (
        <div className="umkm-funder-data-state">
          <span className="material-symbols-outlined spinner-icon">hourglass_empty</span>
          <p>Loading funders from the database...</p>
        </div>
      ) : funders.length > 0 ? (
        <div className="umkm-funder-card-grid">
          {funders.map((funder) => (
            <FunderDirectoryCard key={funder.id} funder={funder} onRequest={onRequestFunder} />
          ))}
        </div>
      ) : (
        <div className="umkm-funder-data-state empty">
          <span className="material-symbols-outlined">account_balance</span>
          <h3>No Funders Yet</h3>
          <p>Funders who complete their profiles will appear in this list.</p>
        </div>
      )}
    </section>
  )
}

function FunderDirectoryCard({ funder, onRequest }) {
  return (
    <article className="umkm-funder-card">
      <div className="umkm-funder-card-visual">
        <div className="umkm-funder-card-avatar">
          {funder.photoUrl ? <img src={funder.photoUrl} alt={`Foto profil ${funder.name}`} /> : <span>{funder.initials}</span>}
        </div>
        {funder.verified && (
          <span className="umkm-funder-verified">
            <span className="material-symbols-outlined">verified</span>
            Verified
          </span>
        )}
      </div>

      <div className="umkm-funder-card-body">
        <div className="umkm-funder-card-title">
          <div>
            <h3>{funder.name}</h3>
            <span>{funder.primaryInterest}</span>
          </div>
          <button type="button" aria-label={`Simpan ${funder.name}`}>
            <span className="material-symbols-outlined">bookmark</span>
          </button>
        </div>

        <p className="umkm-funder-card-bio">{funder.bio}</p>

        <div className="umkm-funder-investment-range">
          <div>
            <span>Minimum</span>
            <strong>{formatRupiah(funder.fundingMin)}</strong>
          </div>
          <div>
            <span>Maximum</span>
            <strong>{formatRupiah(funder.fundingMax)}</strong>
          </div>
        </div>

        <div className="umkm-funder-interest-list">
          {funder.interests.slice(0, 4).map((interest) => (
            <span key={interest}>{interest}</span>
          ))}
        </div>

        <button type="button" className="umkm-funder-request-btn" onClick={() => onRequest(funder)}>
          <span className="material-symbols-outlined">send</span>
          Request Funding
        </button>
      </div>
    </article>
  )
}

function FunderRequestModal({ funder, onClose, onSubmit, submitting }) {
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    onSubmit({
      amount: Number(amount),
      description: description.trim(),
    })
  }

  return (
    <div className="umkm-funder-modal-overlay" role="dialog" aria-modal="true">
      <form className="umkm-funder-modal" onSubmit={handleSubmit}>
        <header>
          <div>
            <span>Request Funding</span>
            <h3>{funder.name}</h3>
            <p>Send a funding request to your selected funder.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close modal">
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>

        <label>
          Funding Amount (Rupiah) *
          <input
            type="number"
            min="1000000"
            max="100000000"
            step="100000"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="Example: 50000000"
            required
          />
          <small>Minimum: Rp 1,000,000 | Maximum: Rp 100,000,000</small>
        </label>

        <label>
          Description / Request (Optional)
          <textarea
            maxLength={1000}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Explain your funding request, fund usage plan, and other relevant details..."
          />
          <small>{description.length}/1000 characters</small>
        </label>

        <footer>
          <button type="button" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="submit" disabled={submitting}>
            {submitting ? 'Sending...' : 'Send Request'}
          </button>
        </footer>
      </form>
    </div>
  )
}

function FundingHistoryView({ error, funders, loading, onRefresh, pendingRequests = [], summary }) {
  const fundedAmount = Number(summary?.fundedAmount || 0)
  const fundingTarget = Number(summary?.fundingTarget || 0)
  const progress = Number(summary?.progress || 0)
  const remainingAmount = Math.max(fundingTarget - fundedAmount, 0)
  const funderCount = Number(summary?.funderCount || funders.length || 0)

  if (loading) {
    return (
      <div className="umkm-funding-state">
        <span className="material-symbols-outlined">hourglass_empty</span>
          <p>Loading funding history...</p>
      </div>
    )
  }

  return (
    <section className="umkm-funding-history">
      {error && <p className="dashboard-error">{error}</p>}

      <section className="umkm-funding-summary">
        <div className="umkm-funding-total">
          <span>Raised</span>
          <strong>{formatRupiah(fundedAmount)}</strong>
          <p>
            of <b>{formatRupiah(fundingTarget)}</b>
          </p>
        </div>
        <div className="umkm-funding-meta">
          <span>Total Funder</span>
          <strong>{formatNumber(funderCount)} {funderCount === 1 ? 'Funder' : 'Funders'}</strong>
        </div>
      </section>

      <section className="umkm-funding-progress-card">
        <div>
          <span>Remaining funding need</span>
          <strong>{formatRupiah(remainingAmount)}</strong>
        </div>
        <div className="umkm-funding-progress-track" aria-label={`Funding progress ${progress}%`}>
          <span style={{ width: `${progress}%` }} />
        </div>
      </section>

      <section className="umkm-funder-list-card">
        <div className="umkm-funder-list-head">
          <h3>
            <span className="material-symbols-outlined">pending_actions</span>
            Pending Requests
          </h3>
        </div>

        {pendingRequests.length > 0 ? (
          <div className="umkm-pending-funding-list">
            {pendingRequests.map((request) => (
              <article key={request.id} className="umkm-pending-funding-row">
                <div>
                  <h4>{request.name || 'Funder MicroFun'}</h4>
                  <p>{request.description || 'No request description provided.'}</p>
                </div>
                <strong>{formatRupiah(request.amount)}</strong>
                <time>{formatDisplayDate(request.requestedAt)}</time>
              </article>
            ))}
          </div>
        ) : (
          <div className="umkm-funding-state empty compact">
            <span className="material-symbols-outlined">task_alt</span>
            <h3>No Pending Requests</h3>
            <p>Requests waiting for funder approval will appear here.</p>
          </div>
        )}
      </section>

      <section className="umkm-funder-list-card">
        <div className="umkm-funder-list-head">
          <h3>
            <span className="material-symbols-outlined">history</span>
            Funding History
          </h3>
        </div>

        {funders.length > 0 ? (
          <div className="umkm-funding-table-wrap">
            <table className="umkm-funding-table">
              <thead>
                <tr>
                  <th>Funder Name</th>
                    <th>Total Funded</th>
                    <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {funders.map((funder) => (
                  <tr key={funder.id || `${funder.funderId || funder.name}-${funder.lastFundedAt}`}>
                    <td>
                      <div className="umkm-funding-table-name">
                        <span>{getInitials(funder.name)}</span>
                        <strong>{funder.name || 'Funder MicroFun'}</strong>
                      </div>
                    </td>
                    <td>{formatRupiah(funder.totalFunded)}</td>
                    <td>{formatDisplayDate(funder.lastFundedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="umkm-funding-state empty">
            <span className="material-symbols-outlined">account_balance_wallet</span>
            <h3>No Funders Yet</h3>
            <p>Funders who have successfully provided funding will appear here.</p>
          </div>
        )}
      </section>
    </section>
  )
}

function AiMatchingPanel({ error, onRequestFunder, onRequestMentor, requestMessage, result }) {
  const [activeType, setActiveType] = useState('funder')
  const [insightItem, setInsightItem] = useState(null)

  if (error) {
    return (
      <div className="ai-match-panel error">
        <span className="material-symbols-outlined">error</span>
        <p>{error}</p>
      </div>
    )
  }

  if (!result) return null

  return (
    <div className="ai-match-panel" id="ai-match-results">
      <div className="ai-match-summary">
        <span className="material-symbols-outlined">auto_awesome</span>
        <div>
          <strong>AI Recommendation Results</strong>
          <p>{result.summary}</p>
        </div>
      </div>

      {requestMessage && (
        <div className="ai-match-request-alert">
          <span className="material-symbols-outlined">check_circle</span>
          <p>{requestMessage}</p>
        </div>
      )}

      {insightItem && (
        <div className="ai-match-insight-alert">
          <button type="button" onClick={() => setInsightItem(null)} aria-label="Close insight">
            <span className="material-symbols-outlined">close</span>
          </button>
          <strong>AI Insight for {insightItem.name}</strong>
          <p>{insightItem.reason}</p>
          <small>{insightItem.nextStep}</small>
        </div>
      )}

      <div className="ai-match-tabs" role="tablist" aria-label="AI recommendation type">
        <button type="button" className={activeType === 'funder' ? 'active' : ''} onClick={() => setActiveType('funder')}>
          <span className="material-symbols-outlined">account_balance</span>
          Funder
        </button>
        <button type="button" className={activeType === 'mentor' ? 'active' : ''} onClick={() => setActiveType('mentor')}>
          <span className="material-symbols-outlined">school</span>
          Mentor
        </button>
      </div>

      {activeType === 'funder' ? (
      <RecommendationGroup
        actionLabel="Request Funding"
        icon="account_balance"
        items={result.funders || []}
        onViewInsight={setInsightItem}
        onRequest={onRequestFunder}
        title="Recommended Funders"
        type="funder"
      />
      ) : (
      <RecommendationGroup
        actionLabel="Request Mentoring"
        icon="school"
        items={result.mentors || []}
        onViewInsight={setInsightItem}
        onRequest={onRequestMentor}
        title="Recommended Mentors"
        type="mentor"
      />
      )}
    </div>
  )
}

function FindMentorView({ error, loading, mentors, onRequest, requestMessage }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [skillFilter, setSkillFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const skillOptions = useMemo(() => {
    return Array.from(new Set(mentors.flatMap((mentor) => mentor.skills))).sort((a, b) => a.localeCompare(b))
  }, [mentors])

  const filteredMentors = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase()

    return mentors.filter((mentor) => {
      const skillsText = mentor.skills.join(' ').toLowerCase()
      const matchesSearch = !normalizedSearch
        || mentor.name.toLowerCase().includes(normalizedSearch)
        || skillsText.includes(normalizedSearch)
      const matchesSkill = skillFilter === 'all' || mentor.skills.includes(skillFilter)
      const matchesStatus = statusFilter === 'all' || mentor.availabilityStatus === statusFilter

      return matchesSearch && matchesSkill && matchesStatus
    })
  }, [mentors, searchQuery, skillFilter, statusFilter])

  return (
    <div className="mentoring-page">
      <header className="mentoring-heading">
        <div>
        </div>
        <span>{filteredMentors.length} mentors available</span>
      </header>

      <section className="mentor-filter-panel" aria-label="Find mentor filters">
        <label className="mentor-search-field">
          <span className="material-symbols-outlined" aria-hidden="true">search</span>
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search mentor name or expertise..."
          />
        </label>
        <label>
          <span>Expertise</span>
          <select value={skillFilter} onChange={(event) => setSkillFilter(event.target.value)}>
            <option value="all">All expertise</option>
            {skillOptions.map((skill) => (
              <option key={skill} value={skill}>{skill}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Status</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">All status</option>
            <option value="Available">Available</option>
            <option value="Busy">Busy</option>
          </select>
        </label>
      </section>

      {requestMessage && (
        <div className="mentoring-alert success">
          <span className="material-symbols-outlined">check_circle</span>
          <p>{requestMessage}</p>
        </div>
      )}
      {error && (
        <div className="mentoring-alert error">
          <span className="material-symbols-outlined">error</span>
          <p>{error}</p>
        </div>
      )}

      {loading ? (
        <div className="mentoring-empty-state">
          <span className="material-symbols-outlined">hourglass_empty</span>
          <p>Loading mentor list...</p>
        </div>
      ) : mentors.length === 0 ? (
        <div className="mentoring-empty-state">
          <span className="material-symbols-outlined">school</span>
          <p>No mentors have completed their profile yet.</p>
        </div>
      ) : filteredMentors.length === 0 ? (
        <div className="mentoring-empty-state">
          <span className="material-symbols-outlined">manage_search</span>
          <p>No mentors match the current filters.</p>
        </div>
      ) : (
        <div className="mentor-directory-grid">
          {filteredMentors.map((mentor) => (
            <article key={mentor.id} className="mentor-directory-card">
              <header>
                <div className="mentor-directory-avatar">
                  {mentor.photoUrl ? <img src={mentor.photoUrl} alt={mentor.name} /> : <span>{mentor.initials}</span>}
                </div>
                <div>
                  <h3>{mentor.name}</h3>
                  <p>{mentor.current_job || 'MSME Mentor'}</p>
                </div>
              </header>
              <div className="mentor-directory-meta">
                <span className={`mentor-availability ${mentor.availabilityStatus.toLowerCase()}`}>
                  {mentor.availabilityStatus}
                </span>
                {mentor.rating > 0 && (
                  <span className="mentor-rating">
                    <span className="material-symbols-outlined" aria-hidden="true">star</span>
                    {mentor.rating.toFixed(1)}
                  </span>
                )}
              </div>
              <div className="mentor-directory-skills">
                {mentor.skills.length > 0 ? mentor.skills.map((skill) => <span key={skill}>{skill}</span>) : <span>No expertise added</span>}
              </div>
              <InfoBlock title="Experience" value={mentor.experience || 'No experience has been added yet.'} />
              <InfoBlock title="Achievements" value={mentor.achievements || 'No achievements have been added yet.'} />
              <InfoBlock title="About Mentor" value={mentor.about || 'This mentor has not added a bio yet.'} />
              <button type="button" onClick={() => onRequest(mentor)}>
                Request Mentoring
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

function InfoBlock({ title, value }) {
  return (
    <div className="mentor-info-block">
      <strong>{title}</strong>
      <p>{value}</p>
    </div>
  )
}

function MyMentoringView({ userId }) {
  const navigate = useNavigate()
  const [activeFilter, setActiveFilter] = useState('All')
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!userId) return
    let active = true
    setLoading(true)
    setError('')
    Promise.all([getUmkmRequests(userId), getUmkmWorkspaces(userId)])
      .then(([requests, workspaces]) => {
        if (!active) return
        setSessions([
          ...requests.map(normalizeApiMentoringRequest),
          ...workspaces.map(normalizeApiMentoringWorkspace),
        ])
      })
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [userId])

  const tabs = useMemo(() => {
    return mentoringFilterTabs.map((tab) => ({
      ...tab,
      count: sessions.filter((session) => tab.statuses.includes('all') || tab.statuses.includes(session.status)).length,
    }))
  }, [sessions])
  const filteredSessions = useMemo(() => {
    const activeTab = mentoringFilterTabs.find((tab) => tab.label === activeFilter)
    if (!activeTab || activeTab.statuses.includes('all')) return sessions
    return sessions.filter((session) => activeTab.statuses.includes(session.status))
  }, [activeFilter, sessions])

  async function cancelRequest(session) {
    setError('')
    try {
      await cancelMentoringRequest(session.id)
      setSessions((current) => current.map((item) => item.id === session.id ? { ...item, status: 'Cancelled' } : item))
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="mentoring-subpage">
      <div className="mentoring-heading">
        <div />
      </div>

      {error && <div className="mentoring-alert error">{error}</div>}
      <div className="mentoring-tabs" role="tablist" aria-label="My mentoring filters">
        {tabs.map((tab) => (
          <button key={tab.label} type="button" className={activeFilter === tab.label ? 'active' : ''} onClick={() => setActiveFilter(tab.label)}>
            {tab.label}
            <span>{tab.count}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="mentoring-empty-state">
          <span className="material-symbols-outlined">hourglass_top</span>
          <p>Loading mentoring data...</p>
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="mentoring-empty-state">
          <span className="material-symbols-outlined">event_busy</span>
          <p>No mentoring items for this status yet.</p>
        </div>
      ) : (
        <div className="mentoring-session-list">
          {filteredSessions.map((session) => (
            <MentoringRequestCard key={`${session.type}-${session.id}`} session={session} onCancel={() => cancelRequest(session)} onFindMentor={() => navigate('/dashboard/umkm/mentoring/find')} onOpenWorkspace={() => navigate(`/dashboard/umkm/mentoring/workspace/${session.workspaceId || session.id}`)} />
          ))}
        </div>
      )}
    </div>
  )
}

const mentoringFilterTabs = [
  { label: 'All', statuses: ['all'] },
  { label: 'Pending', statuses: ['Pending'] },
  { label: 'Active', statuses: ['Accepted', 'Active'] },
  { label: 'Rejected', statuses: ['Rejected'] },
  { label: 'Completed', statuses: ['Completed'] },
  { label: 'Cancelled', statuses: ['Cancelled'] },
]

const dummyMentoringItems = [
    {
      id: 'dummy-pending-101',
      mentorName: 'Sarah Jenkins',
      mentorProfession: 'Growth Marketing Strategist',
      topic: 'Digital marketing strategy',
      duration: '1 month mentoring',
      schedulePreference: 'Saturday morning',
      status: 'Pending',
      requestDate: '2026-05-22',
    },
    {
      id: 'dummy-accepted-102',
      mentorName: 'Marcus Thorne',
      mentorProfession: 'Operations & Logistics Advisor',
      topic: 'Operational and logistics scaling',
      duration: '3 months mentoring',
      schedulePreference: 'Wednesday evening',
      status: 'Accepted',
      requestDate: '2026-05-16',
      startDate: '2026-05-29',
      nextSession: 'Friday, May 29, 2026 - 19.30',
      taskProgress: 15,
    },
    {
      id: 'dummy-active-103',
      mentorName: 'Daniel Hart',
      mentorProfession: 'Finance Mentor',
      topic: 'Financial model evaluation',
      duration: '1 month mentoring',
      schedulePreference: 'Tuesday afternoon',
      status: 'Active',
      requestDate: '2026-05-06',
      startDate: '2026-05-10',
      endDate: '2026-06-10',
      nextSession: 'Tuesday, June 2, 2026 - 16.00',
      taskProgress: 62,
    },
    {
      id: 'dummy-rejected-104',
      mentorName: 'Nadia Prameswari',
      mentorProfession: 'Export Readiness Consultant',
      topic: 'Food product export readiness',
      duration: '1 consultation session',
      schedulePreference: 'Monday morning',
      status: 'Rejected',
      requestDate: '2026-04-28',
      rejectionReason: 'The mentor schedule is full this month and cannot accept new requests yet.',
    },
    {
      id: 'dummy-completed-105',
      mentorName: 'Raka Wibisana',
      mentorProfession: 'Branding Consultant',
      topic: 'Product packaging rebranding',
      duration: '1 month mentoring',
      schedulePreference: 'Thursday evening',
      status: 'Completed',
      requestDate: '2026-03-18',
      startDate: '2026-03-25',
      endDate: '2026-04-25',
      taskProgress: 100,
      hasRating: false,
    },
    {
      id: 'dummy-cancelled-106',
      mentorName: 'Maya Hartono',
      mentorProfession: 'Retail Expansion Mentor',
      topic: 'Reseller channel validation',
      duration: '1 consultation session',
      schedulePreference: 'Sunday afternoon',
      status: 'Cancelled',
      requestDate: '2026-04-12',
    },
  ]

const workspaceTabs = [
  'Overview',
  'Session Schedule',
  'Task & Action Plan',
  'Mentor Notes',
  'Chat',
  'File Sharing',
  'Evaluation',
]

const workspaceDummyContent = {
  sessions: [
    {
      id: 'session-1',
      title: 'Kickoff and problem mapping',
      date: 'May 29, 2026',
      time: '19.30 - 20.30',
      platform: 'Google Meet',
      meetingLink: 'https://meet.google.com/dummy-session',
      agenda: 'Agree on mentoring goals, business baseline, and priorities for the first 2 weeks.',
      status: 'Upcoming',
    },
    {
      id: 'session-2',
      title: 'Content strategy review',
      date: 'May 22, 2026',
      time: '19.00 - 20.00',
      platform: 'Zoom',
      meetingLink: 'https://zoom.us/dummy-session',
      agenda: 'Discuss the content calendar and campaign structure.',
      status: 'Completed',
    },
  ],
  tasks: [
    {
      id: 'task-1',
      title: 'Prepare a 14-day content calendar',
      instruction: 'Create a daily content plan with goals, formats, and short captions.',
      deadline: 'May 31, 2026',
      priority: 'High',
      status: 'Pending',
    },
    {
      id: 'task-2',
      title: 'Audit katalog WhatsApp Business',
      instruction: 'Update 5 main products with clearer photos, prices, and descriptions.',
      deadline: 'June 2, 2026',
      priority: 'Medium',
      status: 'In Progress',
    },
    {
      id: 'task-3',
      title: 'Record weekly sales performance',
      instruction: 'Summarize revenue, orders, and sales channels for the next session.',
      deadline: 'June 7, 2026',
      priority: 'Low',
      status: 'Done',
    },
  ],
  progressHistory: [
    {
      id: 'progress-1',
      updateDate: '2026-05-25',
      revenue: 'Rp 7.800.000',
      orders: '96',
      followers: '3.840',
      engagement: '5.8%',
      blocker: 'The team has not posted consistently every day.',
      implementationResult: 'Educational content has started generating new inbound messages.',
      question: 'How should we define CTAs for a reseller audience?',
    },
  ],
  notes: [
    {
      id: 'note-1',
      sessionTitle: 'Content strategy review',
      date: 'May 22, 2026',
      evaluation: 'The MSME already understands the target customers, but the content is still too broad.',
      advice: 'Focus on 3 content formats: product education, testimonials, and bundle promotions.',
      nextRecommendation: 'Test one campaign for 14 days and measure inbound messages per format.',
    },
  ],
  messages: [
    { id: 'message-1', sender: 'Mentor', text: 'Please send this week sales recap before the next session.', time: 'Yesterday' },
    { id: 'message-2', sender: 'MSME', text: 'Sure, I will prepare revenue, order, and Instagram content data.', time: 'Today' },
  ],
  files: [
    { id: 'file-1', name: 'Content Calendar Template.xlsx', meta: 'Mentor - 245 KB' },
    { id: 'file-2', name: 'Week 1 Sales Recap.pdf', meta: 'MSME - 520 KB' },
  ],
}

function MentoringRequestCard({ session, onCancel, onFindMentor, onOpenWorkspace }) {
  const statusClass = session.status.toLowerCase()
  const statusLabel = getMentoringStatusLabel(session.status)

  return (
    <article className="mentoring-request-card">
      <div className="mentoring-request-main">
        <div className="mentoring-request-head">
          <div>
            <span className={`mentoring-status ${statusClass}`}>{statusLabel}</span>
            <h3>{session.topic}</h3>
            <p>{session.mentorName} <span>{session.mentorProfession}</span></p>
          </div>
          <strong>{session.duration}</strong>
        </div>

        <div className="mentoring-request-meta">
          <InfoPair label="Schedule Preference" value={session.schedulePreference} />
          <InfoPair label="Request Date" value={formatDisplayDate(session.requestDate)} />
          {session.startDate && <InfoPair label="Start Date" value={formatDisplayDate(session.startDate)} />}
          {session.endDate && <InfoPair label="End Date" value={formatDisplayDate(session.endDate)} />}
          {session.nextSession && <InfoPair label="Next Session" value={session.nextSession} />}
        </div>

        {session.rejectionReason && (
          <div className="mentoring-request-note">
            <span className="material-symbols-outlined">info</span>
            <p>{session.rejectionReason}</p>
          </div>
        )}

        {typeof session.taskProgress === 'number' && (
          <div className="mentoring-task-progress">
            <div>
              <span>Progress Task</span>
              <strong>{session.taskProgress}%</strong>
            </div>
            <i><b style={{ width: `${session.taskProgress}%` }} /></i>
          </div>
        )}
      </div>

      <div className="mentoring-request-actions">
        {session.status === 'Pending' && (
          <>
            <button type="button" className="secondary">View Details</button>
            <button type="button" className="danger" onClick={onCancel}>Cancel Request</button>
          </>
        )}
        {session.status === 'Rejected' && (
          <>
            <button type="button" className="secondary">View Reason</button>
            <button type="button" onClick={onFindMentor}>Find Another Mentor</button>
          </>
        )}
        {session.status === 'Accepted' && (
          <>
            <button type="button" className="secondary">View Details</button>
            <button type="button" onClick={onOpenWorkspace}>Open Workspace</button>
          </>
        )}
        {session.status === 'Active' && (
          <button type="button" onClick={onOpenWorkspace}>Open Workspace</button>
        )}
        {session.status === 'Completed' && (
          <>
            <button type="button" className="secondary">View Archive</button>
            {!session.hasRating && <button type="button">Rate Mentor</button>}
          </>
        )}
        {session.status === 'Cancelled' && (
          <button type="button" className="secondary">View Details</button>
        )}
      </div>
    </article>
  )
}

function InfoPair({ label, value }) {
  return (
    <div className="mentoring-info-pair">
      <span>{label}</span>
      <strong>{value || '-'}</strong>
    </div>
  )
}

function MentoringWorkspacePlaceholder({ mentoringId, onBack }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [workspace, setWorkspace] = useState(() => ({
    id: mentoringId,
    mentorName: '',
    mentorProfession: '',
    topic: '',
    status: '',
    period: '-',
    summary: '',
    goal: '',
    mentorSummary: '',
  }))
  const activeTab = getWorkspaceTabFromSearch(location.search)
  const [tasks, setTasks] = useState([])
  const [progressHistory, setProgressHistory] = useState([])
  const [sessions, setSessions] = useState([])
  const [notes, setNotes] = useState([])
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [progressForm, setProgressForm] = useState({
    updateDate: toDateInputValue(new Date()),
    revenue: '',
    orders: '',
    followers: '',
    engagement: '',
    blocker: '',
    implementationResult: '',
    question: '',
  })
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [selectedSessionDetail, setSelectedSessionDetail] = useState(null)
  const [taskSubmissionDrafts, setTaskSubmissionDrafts] = useState({})

  function openWorkspaceTab(tab) {
    navigate({ pathname: location.pathname, search: buildWorkspaceTabSearch(tab) })
  }

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    Promise.all([
      getWorkspace(mentoringId),
      getWorkspaceSessions(mentoringId),
      getWorkspaceTasks(mentoringId),
      getWorkspaceProgress(mentoringId),
      getWorkspaceNotes(mentoringId),
      getWorkspaceMessages(mentoringId),
      getWorkspaceFiles(mentoringId),
    ])
      .then(([workspaceData, sessionsData, tasksData, progressData, notesData, messagesData, filesData]) => {
        if (!active) return
        const nextWorkspace = normalizeApiUmkmWorkspace(workspaceData)
        setWorkspace((current) => ({ ...current, ...nextWorkspace }))
        setSessions(sessionsData.map(normalizeApiSession))
        setTasks(tasksData.map(normalizeWorkspaceTask))
        setProgressHistory(progressData.map(normalizeApiProgress))
        setNotes(notesData.map(normalizeApiNote))
        setChatMessages(messagesData.map(normalizeChatMessage))
        setFiles(filesData.map(normalizeWorkspaceFile))
      })
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [mentoringId])

  useEffect(() => {
    const socket = getMentoringSocket()
    if (!socket || !mentoringId) return undefined

    const handleMessage = (message) => {
      if (String(message.workspaceId) !== String(mentoringId)) return
      setChatMessages((current) => {
        if (current.some((item) => String(item.id) === String(message.id))) return current
        return [...current, normalizeChatMessage(message)]
      })
    }

    socket.emit('mentoring:join', mentoringId)
    socket.on('mentoring:message', handleMessage)
    return () => {
      socket.emit('mentoring:leave', mentoringId)
      socket.off('mentoring:message', handleMessage)
    }
  }, [mentoringId])

  if (loading) {
    return <div className="mentoring-empty-state"><span className="material-symbols-outlined">hourglass_top</span><p>Loading mentoring workspace...</p></div>
  }

  if (error && !workspace.status) {
    return (
      <div className="mentoring-workspace-blocked">
        <span className="material-symbols-outlined">error</span>
        <h2>Workspace Cannot Be Loaded</h2>
        <p>{error}</p>
        <button type="button" onClick={onBack}>Back to My Mentoring</button>
      </div>
    )
  }

  if (!['Accepted', 'Active', 'Completed'].includes(workspace.status)) {
    return (
      <div className="mentoring-workspace-blocked">
        <span className="material-symbols-outlined">lock</span>
        <h2>Workspace Not Available Yet</h2>
        <p>The workspace can only be accessed for mentoring with Accepted, Active, or Completed status.</p>
        <button type="button" onClick={onBack}>Back to My Mentoring</button>
      </div>
    )
  }

  const taskProgress = calculateTaskProgress(tasks)
  const activeTasks = tasks.filter((task) => task.status !== 'Done')
  const completedSessions = sessions.filter((session) => session.status === 'Completed').length
  const uploadedTasks = tasks.filter((task) => task.submission || task.status === 'Done').length
  const nextSession = sessions.find((session) => session.status === 'Upcoming' || session.status === 'Rescheduled')

  function updateTaskSubmissionDraft(taskId, field, value) {
    setTaskSubmissionDrafts((current) => ({
      ...current,
      [taskId]: {
        ...(current[taskId] || {}),
        [field]: value,
      },
    }))
  }

  function handleTaskFileDraft(taskId, file) {
    if (!file) return
    setTaskSubmissionDrafts((current) => ({
      ...current,
      [taskId]: {
        ...(current[taskId] || {}),
        file,
        fileName: file.name,
      },
    }))
  }

  async function submitTaskAssignment(task) {
    const draft = taskSubmissionDrafts[task.id] || {}
    const note = String(draft.note || '').trim()
    if (!draft.fileName && !note) {
      setError('Upload a file or add notes before submitting the task.')
      return
    }
    try {
      setError('')
      const submission = await submitTask(task.id, { file: draft.file, note })
      setTasks((current) => current.map((item) => (
        item.id === task.id ? { ...item, status: 'Done', submission: normalizeTaskSubmission(submission) } : item
      )))
      setTaskSubmissionDrafts((current) => {
        const next = { ...current }
        delete next[task.id]
        return next
      })
    } catch (err) {
      setError(err.message)
    }
  }

  async function cancelTaskSubmission(task) {
    try {
      setError('')
      await cancelTaskSubmissionApi(task.id)
      setTasks((current) => current.map((item) => (
        item.id === task.id ? { ...item, status: 'Pending', submission: null } : item
      )))
      setTaskSubmissionDrafts((current) => {
        const next = { ...current }
        delete next[task.id]
        return next
      })
    } catch (err) {
      setError(err.message)
    }
  }

  function updateProgressField(field, value) {
    setProgressForm((current) => ({ ...current, [field]: value }))
  }

  function submitProgress(event) {
    event.preventDefault()
    createBusinessProgress(mentoringId, {
      omzet: progressForm.revenue,
      orderCount: progressForm.orders,
      followers: progressForm.followers,
      engagement: progressForm.engagement,
      obstacle: progressForm.blocker,
      implementationResult: progressForm.implementationResult,
      questionForMentor: progressForm.question,
    }).then(() => getWorkspaceProgress(mentoringId))
      .then((data) => setProgressHistory(data.map(normalizeApiProgress)))
      .catch((err) => setError(err.message))
    setProgressForm({
      updateDate: toDateInputValue(new Date()),
      revenue: '',
      orders: '',
      followers: '',
      engagement: '',
      blocker: '',
      implementationResult: '',
      question: '',
    })
  }

  async function sendMessage(event) {
    event.preventDefault()
    const text = chatInput.trim()
    if (!text) return
    try {
      setChatInput('')
      const message = await sendWorkspaceMessage(mentoringId, text)
      setChatMessages((current) => {
        if (current.some((item) => String(item.id) === String(message.id))) return current
        return [...current, normalizeChatMessage(message)]
      })
    } catch (err) {
      setChatInput(text)
      setError(err.message)
    }
  }

  return (
    <div className="umkm-workspace-page">
      <aside className="umkm-workspace-menu">
        <span>Workspace Menu</span>
        <nav className="umkm-workspace-tabs" aria-label="Workspace mentoring tabs">
          {workspaceTabs.map((tab) => (
            <button key={tab} type="button" className={activeTab === tab ? 'active' : ''} onClick={() => openWorkspaceTab(tab)}>
              <span className="material-symbols-outlined">{getWorkspaceTabIcon(tab)}</span>
              {tab}
            </button>
          ))}
        </nav>
      </aside>

      <section className="umkm-workspace-content">
        {error && <div className="mentoring-alert error">{error}</div>}
        <header className="umkm-workspace-header">
          <div className="umkm-workspace-mentor-card">
            <div className="umkm-workspace-avatar">
              <span className="material-symbols-outlined">person</span>
            </div>
            <div>
              <span>Workspace Mentor</span>
              <h2>{workspace.mentorName}</h2>
              <p>{workspace.mentorProfession}</p>
              <strong>{workspace.topic}</strong>
            </div>
          </div>
          <div className="umkm-workspace-stat-card">
            <span>Current Status</span>
            <strong className={`workspace-status-dot ${workspace.status.toLowerCase()}`}>{workspace.status}</strong>
            <small>Task Progress</small>
            <i><b style={{ width: `${taskProgress}%` }} /></i>
            <em>{taskProgress}%</em>
          </div>
          <div className="umkm-workspace-stat-card">
            <span>Program Period</span>
            <strong>{workspace.period}</strong>
            <small>Remaining Time</small>
            <em>{getRemainingWorkspaceTime(workspace.endDate, workspace.status)}</em>
          </div>
        </header>

        {activeTab === 'Overview' && (
          <section className="umkm-workspace-overview">
            <div className="umkm-overview-main">
              <WorkspacePanel title="Workspace Information" className="workspace-panel-wide">
                <div className="workspace-info-split">
                  <InfoPair label="Mentor Profile" value={workspace.mentorSummary || `${workspace.mentorName} is guiding this mentoring program.`} />
                  <InfoPair label="Mentoring Goal" value={workspace.goal || '-'} />
                </div>
                <InfoPair label="Mentoring Summary" value={workspace.summary || '-'} />
              </WorkspacePanel>

              <WorkspacePanel title="Activity Summary" className="workspace-panel-wide">
                <div className="umkm-overview-metrics">
                  <article><span>Completed Sessions</span><strong>{completedSessions}/{sessions.length}</strong><p>{nextSession ? `Next: ${nextSession.title}` : 'No upcoming session yet'}</p></article>
                  <article><span>Submitted Tasks</span><strong>{uploadedTasks}/{tasks.length}</strong><p>{activeTasks.length} active tasks remaining</p></article>
                  <article><span>Mentor Materials</span><strong>{files.length}</strong><p>Files are available in File Sharing</p></article>
                  <article><span>Mentor Notes</span><strong>{notes.length}</strong><p>Session insights are saved neatly</p></article>
                </div>
              </WorkspacePanel>

              {false && <WorkspacePanel title="Hidden" className="workspace-panel-wide">
                {progressHistory[0] ? (
                  <div className="workspace-last-progress">
                    <strong>{formatDisplayDate(progressHistory[0].updateDate)}</strong>
                    <p>Revenue: {progressHistory[0].revenue || '-'} - Orders: {progressHistory[0].orders || '-'} - Followers: {progressHistory[0].followers || '-'}</p>
                    <span>{progressHistory[0].implementationResult || progressHistory[0].blocker || 'Progress submitted.'}</span>
                  </div>
                ) : (
                  <div className="workspace-empty-panel">
                    <span className="material-symbols-outlined">info</span>
                    <p>No recent business update data yet. The latest progress will appear after the MSME sends a business update.</p>
                  </div>
                )}
              </WorkspacePanel>}
            </div>

            <aside className="umkm-overview-side">
              <article className="workspace-next-session-card">
                <header>
                  <span>Next Session</span>
                  {nextSession?.platform && <small>{nextSession.platform}</small>}
                </header>
                <h3>{nextSession?.title || 'No session yet'}</h3>
                <p>{nextSession ? `${nextSession.date} - ${nextSession.time || '-'}` : 'The mentor has not scheduled the next session yet.'}</p>
                {nextSession?.meetingLink && nextSession.meetingLink !== '#' && (
                  <a href={nextSession.meetingLink} target="_blank" rel="noreferrer">Join Room</a>
                )}
              </article>
              <article className="workspace-active-task-card">
                <h3>Active Tasks</h3>
                {activeTasks.length > 0 ? (
                  <ul>{activeTasks.slice(0, 3).map((task) => <li key={task.id}>{task.title}</li>)}</ul>
                ) : (
                  <div className="workspace-empty-panel compact">
                    <span className="material-symbols-outlined">assignment</span>
                    <p>There are no active tasks right now.</p>
                  </div>
                )}
                <button type="button" onClick={() => openWorkspaceTab('Task & Action Plan')}>View All Tasks</button>
              </article>
            </aside>
          </section>
        )}

      {activeTab === 'Session Schedule' && (
        <section className="workspace-list">
          {sessions.map((session) => (
            <article key={session.id} className="workspace-session-card">
              <div>
                <span className={`workspace-status ${session.status.toLowerCase()}`}>{session.status}</span>
                <h3>{session.title}</h3>
                <p>{session.date} • {session.time} • {session.platform}</p>
                <small>{session.agenda}</small>
                {session.cancellationReason && (
                  <div className="workspace-session-cancel-reason">
                    <span className="material-symbols-outlined">info</span>
                    <p>{session.cancellationReason}</p>
                  </div>
                )}
              </div>
              <div>
                {session.status === 'Completed' ? (
                  <button type="button" className="workspace-join-disabled" disabled>Join Meeting</button>
                ) : (
                  <a href={session.meetingLink} target="_blank" rel="noreferrer">Join Meeting</a>
                )}
                <button type="button" onClick={() => setSelectedSessionDetail(session)}>View Details</button>
              </div>
            </article>
          ))}
        </section>
      )}

      {activeTab === 'Task & Action Plan' && (
        <section className="workspace-task-board">
          <div className="workspace-task-board-head">
            <div>
              <span>Action Plan</span>
              <h3>Tasks & Submission</h3>
              <p>Complete mentor-assigned tasks, then submit supporting files or written notes.</p>
            </div>
            <strong>{tasks.filter((task) => task.status === 'Done' || task.submission).length}/{tasks.length} completed</strong>
          </div>

          <div className="workspace-task-todo-list">
            {tasks.length === 0 ? (
              <div className="workspace-empty-panel">
                <span className="material-symbols-outlined">assignment</span>
                <p>No tasks from mentors yet.</p>
              </div>
            ) : tasks.map((task) => {
              const submission = task.submission
              const draft = taskSubmissionDrafts[task.id] || {}
              const submissionMeta = getTaskSubmissionMeta(task, submission)
              const isSubmitted = Boolean(submission) || task.status === 'Done'
              const canSubmit = Boolean(draft.fileName) || Boolean(String(draft.note || '').trim())

              return (
                <article key={task.id} className={`workspace-task-todo ${isSubmitted ? 'done' : ''}`}>
                  <div className="workspace-task-check">
                    <span className="material-symbols-outlined">{isSubmitted ? 'check_circle' : 'radio_button_unchecked'}</span>
                  </div>
                  <div className="workspace-task-copy">
                    <div className="workspace-task-topline">
                      <span className={`task-submit-status ${submissionMeta.className}`}>{submissionMeta.label}</span>
                    </div>
                    <h3>{task.title}</h3>
                    <p>{task.instruction}</p>
                    <small>Deadline: {task.deadline}</small>
                    {task.mentorComment && (
                      <div className="workspace-task-mentor-comment">
                        <span className="material-symbols-outlined">rate_review</span>
                        <p>{task.mentorComment}</p>
                      </div>
                    )}
                  </div>

                  <aside className={`workspace-task-submit-panel ${submissionMeta.className}`}>
                    {isSubmitted ? (
                      <div className={`workspace-submission-receipt ${submissionMeta.className}`}>
                        <div className="workspace-submission-receipt-head">
                          <span className="material-symbols-outlined">task_alt</span>
                          <div>
                            <strong>{submissionMeta.label}</strong>
                            <p>{submission?.submittedAt ? formatDisplayDate(submission.submittedAt) : 'Task status is completed.'}</p>
                          </div>
                        </div>
                        {submission?.fileName && (
                          <a className="task-uploaded-file" href={submission.fileUrl || '#'} target="_blank" rel="noreferrer">
                            <span className="material-symbols-outlined">draft</span>
                            {submission.fileName}
                          </a>
                        )}
                        {submission?.note && (
                          <div className="workspace-submission-note">
                            <span>Notes</span>
                            <p>{submission.note}</p>
                          </div>
                        )}
                        <button type="button" className="workspace-cancel-submit" onClick={() => cancelTaskSubmission(task)}>
                          Cancel Submission
                        </button>
                      </div>
                    ) : (
                      <>
                        <label className="workspace-task-upload">
                          <span className="material-symbols-outlined">upload_file</span>
                          Choose File
                          <input type="file" onChange={(event) => handleTaskFileDraft(task.id, event.target.files?.[0])} />
                        </label>
                        {draft.fileName && (
                          <div className="task-uploaded-file">
                            <span className="material-symbols-outlined">draft</span>
                            {draft.fileName}
                          </div>
                        )}
                        <label className="workspace-task-note">
                          <span>Notes / answer</span>
                          <textarea
                            value={draft.note || ''}
                            onChange={(event) => updateTaskSubmissionDraft(task.id, 'note', event.target.value)}
                            placeholder="Write a work summary, document link, or blocker the mentor should know..."
                          />
                        </label>
                        <button
                          type="button"
                          className="workspace-submit-task"
                          disabled={!canSubmit}
                          onClick={() => submitTaskAssignment(task)}
                        >
                          Submit
                        </button>
                      </>
                    )}
                  </aside>
                </article>
              )
            })}
          </div>
        </section>
      )}

      {false && (
        <section className="workspace-progress-layout">
          <form className="workspace-progress-form" onSubmit={submitProgress}>
            <div className="workspace-form-grid">
              <label>Update Date<input type="date" value={progressForm.updateDate} onChange={(event) => updateProgressField('updateDate', event.target.value)} required /></label>
              <label>Revenue<input value={progressForm.revenue} onChange={(event) => updateProgressField('revenue', event.target.value)} placeholder="Example: Rp 8,500,000" /></label>
              <label>Total Orders<input value={progressForm.orders} onChange={(event) => updateProgressField('orders', event.target.value)} placeholder="Example: 120" /></label>
              <label>Followers<input value={progressForm.followers} onChange={(event) => updateProgressField('followers', event.target.value)} placeholder="Example: 4,200" /></label>
              <label>Engagement<input value={progressForm.engagement} onChange={(event) => updateProgressField('engagement', event.target.value)} placeholder="Example: 6.5%" /></label>
            </div>
            <label>Latest Blocker<textarea value={progressForm.blocker} onChange={(event) => updateProgressField('blocker', event.target.value)} /></label>
            <label>Mentor Advice Implementation Result<textarea value={progressForm.implementationResult} onChange={(event) => updateProgressField('implementationResult', event.target.value)} /></label>
            <label>Question for Mentor<textarea value={progressForm.question} onChange={(event) => updateProgressField('question', event.target.value)} /></label>
            <button type="submit">Submit Progress</button>
          </form>
          <div className="workspace-progress-history">
            {progressHistory.map((item) => (
              <article key={item.id}>
                <strong>{formatDisplayDate(item.updateDate)}</strong>
                <p>Revenue: {item.revenue || '-'} - Orders: {item.orders || '-'} - Followers: {item.followers || '-'}</p>
                <span>{item.implementationResult || item.blocker || 'Progress submitted.'}</span>
              </article>
            ))}
          </div>
        </section>
      )}

      {activeTab === 'Mentor Notes' && (
        <section className="workspace-note-list">
          {notes.length === 0 ? (
            <div className="workspace-empty-panel">
              <span className="material-symbols-outlined">edit_note</span>
              <p>No mentor notes for this workspace yet.</p>
            </div>
          ) : notes.map((note) => (
            <article key={note.id} className="workspace-note-card">
              <div className="workspace-note-card-head">
                <span className="material-symbols-outlined">edit_note</span>
                <div>
                  <h3>{note.sessionTitle}</h3>
                  <p>Session: {note.sessionTitle}{note.sessionDate ? ` - ${formatDisplayDate(note.sessionDate)}` : ''}</p>
                </div>
                <time>{formatDisplayDate(note.date)}</time>
              </div>
              <div className="workspace-note-grid">
                <InfoPair label="Evaluation" value={note.evaluation || '-'} />
                <InfoPair label="Advice" value={note.advice || '-'} />
                <InfoPair label="Next Recommendation" value={note.nextRecommendation || '-'} />
              </div>
            </article>
          ))}
        </section>
      )}

      {activeTab === 'Chat' && (
        <section className="workspace-chat">
          <div className="workspace-chat-list">
            {chatMessages.length === 0 ? (
              <div className="workspace-empty-panel">
                <span className="material-symbols-outlined">chat</span>
                <p>No messages in this workspace yet.</p>
              </div>
            ) : chatMessages.map((message) => (
                <article key={message.id} className={message.sender === 'MSME' ? 'me' : ''}>
                <strong>{message.sender}</strong>
                <p>{message.text}</p>
                <span>{message.time}</span>
              </article>
            ))}
          </div>
          <form onSubmit={sendMessage}>
            <input value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder="Write a message..." />
            <button type="submit">Send</button>
          </form>
        </section>
      )}

      {activeTab === 'File Sharing' && (
        <section className="workspace-file-list">
          {files.length === 0 ? (
            <div className="workspace-upload-placeholder">
              <span className="material-symbols-outlined">folder_open</span>
              <p>No mentor materials for this workspace yet.</p>
            </div>
          ) : files.map((file) => (
            <article key={file.id} className="workspace-material-card">
              <span className="material-symbols-outlined">description</span>
              <div>
                <h3>{file.title}</h3>
                <p>{file.description || file.fileName}</p>
                <small>{file.fileName} - {file.fileSizeLabel} - Uploaded {file.createdAtLabel}</small>
              </div>
              <a href={file.fileUrl} target="_blank" rel="noreferrer">Download</a>
            </article>
          ))}
        </section>
      )}

      {activeTab === 'Evaluation' && (
        <section className="workspace-evaluation">
          {workspace.status === 'Completed' ? (
            <form>
              <label>Rating 1-5<input type="number" min="1" max="5" placeholder="5" /></label>
              <label>Feedback<textarea placeholder="Share your mentoring experience..." /></label>
              <label>Mentoring Impact Testimonial<textarea placeholder="What impact did mentoring have on your business?" /></label>
              <button type="button">Submit Evaluation</button>
            </form>
          ) : (
            <div className="mentoring-empty-state">
              <span className="material-symbols-outlined">rate_review</span>
              <p>Evaluation is available after mentoring is completed.</p>
            </div>
          )}
        </section>
      )}
      {selectedSessionDetail && (
        <SessionDetailModal session={selectedSessionDetail} onClose={() => setSelectedSessionDetail(null)} />
      )}
      </section>
    </div>
  )
}

function WorkspacePanel({ children, className = '', title }) {
  return (
    <article className={`workspace-panel ${className}`}>
      <h3>{title}</h3>
      {children}
    </article>
  )
}

function SessionDetailModal({ onClose, session }) {
  return (
    <div className="workspace-modal-backdrop" role="dialog" aria-modal="true">
      <article className="workspace-detail-modal">
        <header>
          <div>
            <span>Mentoring Session Details</span>
            <h3>{session.title}</h3>
            <p>{session.platform || 'Platform not specified yet'}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close session details">
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>

        <div className="workspace-detail-grid">
          <InfoPair label="Status" value={session.status} />
          <InfoPair label="Date" value={session.date} />
          <InfoPair label="Time" value={session.time || '-'} />
          <InfoPair label="Platform" value={session.platform || '-'} />
        </div>

        <section>
          <strong>Session Agenda</strong>
          <p>{session.agenda || 'The mentor has not added a session agenda yet.'}</p>
        </section>
        {session.cancellationReason && (
          <section>
            <strong>Cancellation Reason</strong>
            <p>{session.cancellationReason}</p>
          </section>
        )}

        <footer>
          {session.status === 'Completed' ? (
            <button type="button" className="secondary" disabled>Session completed</button>
          ) : session.meetingLink && session.meetingLink !== '#' ? (
            <a href={session.meetingLink} target="_blank" rel="noreferrer">Join Meeting</a>
          ) : (
            <button type="button" className="secondary" disabled>Link not available yet</button>
          )}
          <button type="button" onClick={onClose}>Close</button>
        </footer>
      </article>
    </div>
  )
}

function getWorkspaceTabIcon(tab) {
  const icons = {
    Overview: 'space_dashboard',
    'Session Schedule': 'calendar_month',
    'Task & Action Plan': 'assignment_turned_in',
    'Mentor Notes': 'edit_note',
    Chat: 'chat_bubble',
    'File Sharing': 'attach_file',
    Evaluation: 'rate_review',
  }
  return icons[tab] || 'circle'
}

function getWorkspaceTabFromSearch(search) {
  const tab = new URLSearchParams(search).get('tab')
  if (!tab) return 'Overview'

  const normalized = tab.toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'and')
  const tabMap = {
    overview: 'Overview',
    sessions: 'Session Schedule',
    'task-and-action-plan': 'Task & Action Plan',
    tasks: 'Task & Action Plan',
    notes: 'Mentor Notes',
    chat: 'Chat',
    files: 'File Sharing',
    evaluation: 'Evaluation',
  }

  return tabMap[normalized] || 'Overview'
}

function buildWorkspaceTabSearch(tab) {
  const tabMap = {
    Overview: 'overview',
    'Session Schedule': 'sessions',
    'Task & Action Plan': 'tasks',
    'Mentor Notes': 'notes',
    Chat: 'chat',
    'File Sharing': 'files',
    Evaluation: 'evaluation',
  }

  const value = tabMap[tab] || 'overview'
  return `?tab=${encodeURIComponent(value)}`
}

function buildUmkmWorkspaceUrl(mentoringId, tab = 'overview') {
  return `/dashboard/umkm/mentoring/workspace/${mentoringId}${buildWorkspaceTabSearch(tab)}`
}

function groupTasksByDeadline(tasks) {
  const groups = new Map()

  tasks.forEach((task) => {
    const deadline = parseTaskDeadline(task.rawDeadline || task.deadline)
    const key = deadline ? deadline.toISOString().slice(0, 10) : 'no-deadline'
    const label = deadline ? formatDisplayDate(task.rawDeadline || task.deadline) : 'No deadline'
    const sortKey = deadline ? deadline.getTime() : Number.POSITIVE_INFINITY

    if (!groups.has(key)) {
      groups.set(key, { key, label, sortKey, tasks: [] })
    }

    groups.get(key).tasks.push(task)
  })

  return Array.from(groups.values()).sort((a, b) => a.sortKey - b.sortKey)
}

function getRemainingWorkspaceTime(endDate, status) {
  if (status === 'Completed') return 'Completed'
  if (status === 'Cancelled') return 'Cancelled'
  if (!endDate) return '-'
  const diff = new Date(endDate).getTime() - new Date().setHours(0, 0, 0, 0)
  const days = Math.ceil(diff / 86400000)
  if (Number.isNaN(days)) return '-'
  if (days <= 0) return 'Ends today'
  return `${days} days left`
}

function getTaskSubmissionStatus(task, submittedAt = new Date()) {
  const deadline = parseTaskDeadline(task.rawDeadline || task.deadline)
  if (!deadline) return 'submitted'
  return submittedAt.getTime() > deadline.getTime() ? 'late' : 'submitted'
}

function getTaskSubmissionMeta(task, submission) {
  if (!submission && task?.status === 'Done') return { className: 'submitted', label: 'Submitted' }
  if (!submission) return { className: 'not-submitted', label: 'Not submitted' }
  if (String(submission.submissionStatus).toLowerCase() === 'late') return { className: 'late', label: 'Submitted late' }
  return { className: 'submitted', label: 'Submitted' }
}

function parseTaskDeadline(value) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  date.setHours(23, 59, 59, 999)
  return date
}

function UmkmTaskView({ userId }) {
  const navigate = useNavigate()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!userId) return
    let active = true
    setLoading(true)
    getUmkmTasks(userId)
      .then((data) => {
        if (!active) return
        const normalized = (data || []).map((task) => ({
          ...normalizeApiTask(task),
          rawDeadline: task.deadline || task.dueDate || task.due_date || null,
          workspaceId: task.workspaceId || task.workspace_id || task.mentoringId || task.workspace?.id || null,
          workspaceLabel: task.workspace?.topic || task.workspace?.mentor?.name || task.workspaceName || '',
        }))
        normalized.sort((a, b) => {
          const aDeadline = parseTaskDeadline(a.rawDeadline)
          const bDeadline = parseTaskDeadline(b.rawDeadline)
          if (!aDeadline && !bDeadline) return 0
          if (!aDeadline) return 1
          if (!bDeadline) return -1
          return aDeadline.getTime() - bDeadline.getTime()
        })
        active && setTasks(normalized)
      })
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [userId])

  const groupedTasks = useMemo(() => groupTasksByDeadline(tasks), [tasks])

  return (
    <div className="mentoring-subpage">
      <div className="mentoring-heading">
        <div />
      </div>

      {error && <div className="mentoring-alert error">{error}</div>}
      {loading ? (
        <div className="mentoring-empty-state"><span className="material-symbols-outlined">hourglass_top</span><p>Loading tasks...</p></div>
      ) : tasks.length === 0 ? (
        <div className="mentoring-empty-state"><span className="material-symbols-outlined">task_alt</span><p>No tasks from mentors yet.</p></div>
      ) : (
        <div className="umkm-task-list">
          {groupedTasks.map((group) => (
            <section key={group.key} className="umkm-task-group">
              <header className="umkm-task-group-head">
                <h4>{group.label}</h4>
                <span>{group.tasks.length} task</span>
              </header>
              <div className="umkm-task-rows">
                {group.tasks.map((task) => (
                  <article key={task.id || task.title} className="umkm-task-row">
                    <div className="umkm-task-row-main">
                      <div className="umkm-task-row-topline">
                        <span className={`task-status ${task.status.toLowerCase().replace(/\s+/g, '-')}`}>{task.status}</span>
                        <small>{task.deadline}</small>
                      </div>
                      <h3>{task.title}</h3>
                      <p>{task.description}</p>
                      {task.workspaceLabel && <span className="umkm-task-row-meta">Workspace: {task.workspaceLabel}</span>}
                    </div>
                    <div className="umkm-task-row-actions">
                      <button
                        type="button"
                        className="umkm-task-workspace-btn"
                        onClick={() => {
                          if (task.workspaceId) {
                            navigate(buildUmkmWorkspaceUrl(task.workspaceId, 'tasks'))
                            return
                          }
                          navigate('/dashboard/umkm/mentoring/my')
                        }}
                      >
                        <span className="material-symbols-outlined" aria-hidden="true">workspaces</span>
                        Go to Workspace
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

function normalizeApiTask(task) {
  return {
    id: task.id,
    title: task.title,
    description: task.instruction || '-',
    deadline: formatDisplayDate(task.deadline),
    status: task.status || 'Pending',
    progress: task.status === 'Done' ? 100 : task.status === 'In Progress' ? 55 : task.status === 'Revision' ? 75 : 15,
  }
}

function normalizeApiUmkmWorkspace(workspace) {
  return {
    id: workspace.id,
    mentorName: workspace.mentor?.name || 'MSME Mentor',
    mentorProfession: workspace.mentor?.profession || 'MSME Mentor',
    topic: workspace.topic || 'Business mentoring',
    status: normalizeMentoringStatus(workspace.status),
    startDate: workspace.startDate,
    endDate: workspace.endDate,
    period: buildWorkspacePeriod(workspace.startDate, workspace.endDate),
    summary: workspace.acceptanceNote || 'Active mentoring workspace.',
    goal: workspace.goal || '-',
    mentorSummary: `${workspace.mentor?.name || 'Mentor'} is guiding the topic ${workspace.topic || 'business mentoring'}.`,
  }
}

function normalizeApiSession(session) {
  return {
    id: session.id,
    title: session.title,
    date: formatDisplayDate(session.date),
    time: [session.start_time || session.startTime, session.end_time || session.endTime].filter(Boolean).join(' - '),
    platform: session.platform || '-',
    meetingLink: session.meeting_link || session.meetingLink || '#',
    agenda: session.agenda || '-',
    status: session.status || 'Upcoming',
    cancellationReason: session.cancellation_reason || session.cancellationReason || '',
  }
}

function normalizeWorkspaceTask(task) {
  return {
    id: task.id,
    title: task.title,
    instruction: task.instruction || '-',
    deadline: formatDisplayDate(task.deadline),
    rawDeadline: task.deadline,
    priority: task.priority || 'Medium',
    status: task.status || 'Pending',
    mentorComment: task.mentor_comment || task.mentorComment || '',
    submission: normalizeTaskSubmission(task.submission),
  }
}

function normalizeTaskSubmission(submission) {
  if (!submission) return null
  return {
    id: submission.id,
    note: submission.note || '',
    fileName: submission.fileName || submission.file_name || '',
    fileUrl: buildApiAssetUrl(submission.fileUrl || submission.file_url || ''),
    submissionStatus: submission.submissionStatus || submission.submission_status || 'Submitted',
    submittedAt: submission.submittedAt || submission.submitted_at,
  }
}

function normalizeChatMessage(message) {
  const role = message.senderRole || message.sender_role
  return {
    id: message.id,
    workspaceId: message.workspaceId || message.workspace_id,
    sender: role === 'mentor' ? 'Mentor' : 'MSME',
    text: message.message || message.text || '',
    time: formatDisplayDate(message.createdAt || message.created_at || new Date().toISOString()),
  }
}

function normalizeWorkspaceFile(file) {
  return {
    id: file.id,
    title: file.title || file.fileName || file.file_name || 'Mentoring material',
    description: file.description || '',
    fileName: file.fileName || file.file_name || 'file',
    fileUrl: buildApiAssetUrl(file.fileUrl || file.file_url || ''),
    fileSizeLabel: formatFileSize(file.fileSize || file.file_size || 0),
    createdAtLabel: formatDisplayDate(file.createdAt || file.created_at),
  }
}

function buildApiAssetUrl(path) {
  if (!path) return ''
  if (path.startsWith('http')) return path
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'
  return `${apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`
}

function formatFileSize(size) {
  const value = Number(size || 0)
  if (!value) return 'Unknown size'
  if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`
  return `${Math.max(1, Math.round(value / 1024))} KB`
}

function normalizeApiProgress(item) {
  return {
    id: item.id,
    updateDate: item.created_at || item.createdAt,
    revenue: item.omzet,
    orders: item.order_count || item.orderCount,
    followers: item.followers,
    engagement: item.engagement,
    blocker: item.obstacle,
    implementationResult: item.implementation_result || item.implementationResult,
    question: item.question_for_mentor || item.questionForMentor,
  }
}

function normalizeApiNote(note) {
  return {
    id: note.id,
    sessionTitle: note.session_title || note.sessionTitle || 'Mentor note',
    sessionDate: note.session_date || note.sessionDate,
    date: note.created_at || note.createdAt,
    evaluation: note.evaluation,
    advice: note.advice,
    nextRecommendation: note.next_recommendation || note.nextRecommendation,
  }
}

function MentorRequestModal({ mentor, onClose, onSubmit, submitting }) {
  const [form, setForm] = useState({
    topic: '',
    business_problem: '',
    mentoring_goal: '',
      duration_type: '1 consultation session',
    schedule_preference: '',
    additional_message: '',
  })

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    const notes = [
      `Mentoring Duration: ${form.duration_type}`,
      `Schedule Preference: ${form.schedule_preference}`,
      form.additional_message ? `Additional Message: ${form.additional_message}` : '',
    ].filter(Boolean).join('\n')

    onSubmit({
      topic: form.topic,
      businessProblem: form.business_problem,
      mentoringGoal: form.mentoring_goal,
      duration: form.duration_type,
      preferredSchedule: form.schedule_preference,
      additionalMessage: form.additional_message || notes,
    })
  }

  return (
    <div className="mentor-request-overlay" role="dialog" aria-modal="true">
      <form className="mentor-request-modal" onSubmit={handleSubmit}>
        <header>
          <div>
            <h3>Request Mentoring with {mentor.name}</h3>
            <p>{mentor.current_job || 'MSME Mentor'}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close">
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>

        <label>
          Mentoring Topic
          <input value={form.topic} onChange={(event) => updateField('topic', event.target.value)} placeholder="Example: Digital marketing strategy" required />
        </label>
        <label>
          Business Problem
          <textarea value={form.business_problem} onChange={(event) => updateField('business_problem', event.target.value)} placeholder="Describe the business problem you are facing..." required />
        </label>
        <label>
          Mentoring Goal
          <textarea value={form.mentoring_goal} onChange={(event) => updateField('mentoring_goal', event.target.value)} placeholder="What do you want to achieve after mentoring?" required />
        </label>
        <label>
          Mentoring Duration
          <select value={form.duration_type} onChange={(event) => updateField('duration_type', event.target.value)} required>
            <option value="1 consultation session">1 consultation session</option>
            <option value="1 month mentoring">1 month mentoring</option>
            <option value="3 months mentoring">3 months mentoring</option>
          </select>
        </label>
        <label>
          Schedule Preference
          <input value={form.schedule_preference} onChange={(event) => updateField('schedule_preference', event.target.value)} placeholder="Example: Saturday morning or Wednesday evening" required />
        </label>
        <label>
          Additional Message
          <textarea value={form.additional_message} onChange={(event) => updateField('additional_message', event.target.value)} placeholder="Add any other context the mentor should know..." />
        </label>

        <footer>
          <button type="button" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="submit" disabled={submitting}>
            {submitting ? 'Sending...' : 'Send Request'}
          </button>
        </footer>
      </form>
    </div>
  )
}

function toDateTimeLocalValue(date) {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return offsetDate.toISOString().slice(0, 16)
}

function getDefaultMentoringSchedule() {
  const date = new Date()
  date.setDate(date.getDate() + 7)
  date.setHours(10, 0, 0, 0)
  return toDateTimeLocalValue(date).replace('T', ' ')
}

function getDurationMinutes(durationType) {
  const durationMap = {
    '1 consultation session': 60,
    '1 month mentoring': 60 * 4,
    '3 months mentoring': 60 * 12,
    '1 sesi konsultasi': 60,
    '1 bulan mentoring': 60 * 4,
    '3 bulan mentoring': 60 * 12,
  }

  return durationMap[durationType] || 60
}

function RecommendationGroup({ actionLabel, title, icon, items, onRequest, onViewInsight, type }) {
  return (
    <div className="ai-match-group">
      <div className="ai-match-group-head">
        <div>
          <span className="material-symbols-outlined">{icon}</span>
          <div>
            <h4>{title}</h4>
            <p>
              {type === 'funder'
                ? 'Potential funders aligned with your MSME sector, funding needs, and business goals.'
                : 'Mentors aligned with your business challenges and MSME development targets.'}
            </p>
          </div>
        </div>
        <small>{items.length} recommendations</small>
      </div>
      {items.length === 0 ? (
        <p className="ai-match-empty">No sufficiently suitable candidates yet.</p>
      ) : (
        <div className="ai-match-card-grid">
          {items.map((item, index) => (
            <article key={`${title}-${item.id}-${item.name}`} className="ai-match-card">
              <div className="ai-match-card-cover">
                <div className={`ai-match-avatar ${type}`}>{getInitials(item.name)}</div>
                <span className="ai-match-score">
                  <span className="material-symbols-outlined">bolt</span>
                  {item.matchScore || 0}% Match
                </span>
              </div>
              <div className="ai-match-card-body">
                <div className="ai-match-card-title-row">
                  <div>
                    <h5>{item.name}</h5>
                    <p>{type === 'funder' ? `Potential funder #${index + 1}` : `Potential mentor #${index + 1}`}</p>
                  </div>
                  <span className="ai-match-type-badge">{type === 'funder' ? 'Funder' : 'Mentor'}</span>
                </div>
                <div className="ai-match-insight-box">
                  <strong>AI Insight</strong>
                  <p>{item.reason}</p>
                </div>
                <div className="ai-match-next-step">
                  <strong>Langkah lanjut</strong>
                  <p>{item.nextStep}</p>
                </div>
                <div className="ai-match-card-actions">
                  <button type="button" className="secondary" onClick={() => onViewInsight?.(item)}>
                    View Insight
                  </button>
                  <button type="button" onClick={() => onRequest?.(item)}>
                    <span className="material-symbols-outlined">{type === 'funder' ? 'request_quote' : 'send'}</span>
                    {actionLabel}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

function normalizeMentorProfile(mentor, apiBaseUrl) {
  const photo = mentor.profile_photo || mentor.profilePhoto
  const photoUrl = photo
    ? photo.startsWith('http') || photo.startsWith('data:image/')
      ? photo
      : `${apiBaseUrl}${photo.startsWith('/') ? '' : '/'}${photo}`
    : ''

  return {
    ...mentor,
    photoUrl,
    initials: getInitials(mentor.name),
    current_job: mentor.current_job || mentor.profession || 'MSME Mentor',
    experience: mentor.experience || (mentor.experienceYears ? `${mentor.experienceYears} tahun pengalaman` : ''),
    about: mentor.about || mentor.bio || '',
    skills: Array.isArray(mentor.skills) ? mentor.skills : Array.isArray(mentor.expertise) ? mentor.expertise : [],
    rating: Number(mentor.rating || mentor.reputation_score || 0),
    availabilityStatus: getMentorAvailability(mentor),
  }
}

function normalizeFunderForUmkm(funder) {
  const interests = splitFunderTags(funder.investmentInterests || funder.investment_interests)
  const expertise = splitFunderTags(funder.expertiseAreas || funder.expertise_areas)
  const allInterests = [...new Set([...interests, ...expertise])].filter(Boolean)
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'
  const photo = funder.profilePhoto || funder.profile_photo || ''
  const photoUrl = photo
    ? String(photo).startsWith('http') || String(photo).startsWith('data:image/')
      ? photo
      : `${apiBaseUrl}${String(photo).startsWith('/') ? '' : '/'}${photo}`
    : ''

  return {
    id: funder.id,
    name: funder.name || funder.organization_name || 'Funder MicroFun',
    fundingMin: Number(funder.fundingMin || funder.funding_min || 0),
    fundingMax: Number(funder.fundingMax || funder.funding_max || 0),
    interests: allInterests.length ? allInterests : ['General Funding'],
    primaryInterest: allInterests[0] || 'General Funding',
    bio: normalizeFunderBio(funder.bio, allInterests),
    photoUrl,
    verified: Boolean(funder.verified),
    initials: getInitials(funder.name || funder.organization_name || 'Funder'),
  }
}

function normalizeFunderBio(bio, interests = []) {
  if (typeof bio === 'string') {
    const trimmed = bio.trim()
    if (trimmed && trimmed !== '[]') return trimmed
  }

  if (interests.length) {
    return `Fokus pendanaan pada ${interests.slice(0, 3).join(', ')}.`
  }

  return 'Funder ini belum menambahkan bio investasi lengkap.'
}

function splitFunderTags(value = '') {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean)

  try {
    const parsed = JSON.parse(value)
    if (Array.isArray(parsed)) return parsed.map((item) => String(item).trim()).filter(Boolean)
  } catch {
    // Plain comma-separated profile fields are common in older funder records.
  }

  return String(value)
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function normalizeApiMentoringRequest(request) {
  return {
    id: request.id,
    type: 'request',
    workspaceId: request.workspaceId,
    mentorName: request.mentor?.name || 'MSME Mentor',
    mentorProfession: request.mentor?.profession || 'MSME Mentor',
    topic: request.topic || 'Request mentoring',
    duration: request.duration || '-',
    schedulePreference: request.preferredSchedule || '-',
    status: normalizeMentoringStatus(request.status),
    requestDate: request.requestedAt || request.createdAt,
    startDate: request.startDate,
    endDate: request.endDate,
    rejectionReason: request.rejectionReason,
  }
}

function normalizeApiMentoringWorkspace(workspace) {
  return {
    id: workspace.requestId || workspace.id,
    type: 'workspace',
    workspaceId: workspace.id,
    mentorName: workspace.mentor?.name || 'MSME Mentor',
    mentorProfession: workspace.mentor?.profession || 'MSME Mentor',
    topic: workspace.topic || 'Business mentoring',
    duration: buildWorkspacePeriod(workspace.startDate, workspace.endDate),
    schedulePreference: '-',
    status: normalizeMentoringStatus(workspace.status),
    requestDate: workspace.createdAt,
    startDate: workspace.startDate,
    endDate: workspace.endDate,
  }
}

function getInitials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map((word) => word[0]).join('').toUpperCase() || 'MT'
}

function normalizeForumPreviewPost(post, apiBaseUrl) {
  const authorName = post.author?.name || 'MicroFun User'

  return {
    id: post.id,
    author: authorName,
    role: formatForumRole(post.author?.role),
    time: formatDisplayDate(post.createdAt),
    avatar: getForumPreviewAvatar(post.author?.profilePhoto, apiBaseUrl),
    content: post.body || '',
    replies: `${formatNumber(post.commentCount)} Comments`,
    likes: `${formatNumber(post.likeCount)} Likes`,
  }
}

function getForumPreviewAvatar(photo, apiBaseUrl) {
  const value = String(photo || '').trim()
  if (!value) return '/assets/logo.png'
  if (value.startsWith('http') || value.startsWith('data:image/') || value.startsWith('/assets/')) return value
  return `${apiBaseUrl}${value.startsWith('/') ? '' : '/'}${value}`
}

function formatForumRole(role) {
  const labels = {
    umkm_owner: 'MSME Owner',
    funder: 'Funder',
    mentor: 'Mentor',
    admin: 'Admin',
  }

  return labels[role] || 'MicroFun User'
}

function getMentorAvailability(mentor) {
  const rawStatus = mentor.availability_status || mentor.availabilityStatus || mentor.availability
  if (typeof rawStatus === 'string') {
    return rawStatus.toLowerCase() === 'busy' ? 'Busy' : 'Available'
  }

  if (rawStatus === false) return 'Busy'
  return 'Available'
}

function savePendingMentoringRequest(request) {
  const current = getStoredMentoringRequests(mentoringRequestStorageKey)
  localStorage.setItem(mentoringRequestStorageKey, JSON.stringify([request, ...current]))
}

function getStoredMentoringRequests(storageKey) {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function buildUmkmWorkspaceData(mentoringId) {
  const workspaceSnapshot = getStoredMentoringRequests('microfun_mentoring_workspaces')
    .find((workspace) => String(workspace.id) === String(mentoringId))
  const savedRequest = getStoredMentoringRequests(mentoringRequestStorageKey)
    .map(normalizeStoredMentoringRequest)
    .find((request) => String(request.id) === String(mentoringId))
  const dummyRequest = dummyMentoringItems.find((request) => String(request.id) === String(mentoringId))
  const source = savedRequest || dummyRequest || {}
  const status = normalizeMentoringStatus(workspaceSnapshot?.status || source.status || 'Pending')
  const period = buildWorkspacePeriod(workspaceSnapshot?.startDate || source.startDate, workspaceSnapshot?.endDate || source.endDate)
  const firstSession = workspaceSnapshot?.firstSession

  return {
    id: mentoringId,
    mentorName: workspaceSnapshot?.mentorName || source.mentorName || source.mentor?.name || 'MSME Mentor',
    mentorProfession: workspaceSnapshot?.mentorProfession || source.mentorProfession || source.mentor?.current_job || 'MSME Mentor',
    topic: workspaceSnapshot?.topic || source.topic || 'Business mentoring',
    status,
    period,
    nextSession: source.nextSession || (firstSession ? formatWorkspaceSessionLabel(firstSession) : ''),
    taskProgress: source.taskProgress || (status === 'Completed' ? 100 : 35),
    mentorSummary: `${workspaceSnapshot?.mentorName || source.mentorName || 'Mentor'} helps the MSME build a more focused strategy based on this mentoring topic.`,
    summary: workspaceSnapshot?.acceptanceNote || 'This workspace contains session schedules, tasks, mentor notes, business progress, chat, files, and mentoring evaluation.',
    goal: source.mentoringGoal || 'Improve business strategy execution and monitor MSME progress regularly.',
    lastBusinessProgress: 'The latest progress will appear after the MSME sends a business update.',
    sessions: firstSession ? [
      {
        id: 'first-session',
        title: firstSession.title || 'First session',
        date: formatDisplayDate(firstSession.date),
        time: `${firstSession.startTime || '-'} - ${firstSession.endTime || '-'}`,
        platform: firstSession.platform || 'Google Meet',
        meetingLink: firstSession.meetingLink || '#',
        agenda: firstSession.agenda || 'First session agenda.',
        status: 'Upcoming',
      },
      ...workspaceDummyContent.sessions.slice(1),
    ] : workspaceDummyContent.sessions,
    tasks: workspaceDummyContent.tasks,
    progressHistory: workspaceDummyContent.progressHistory,
    notes: workspaceDummyContent.notes,
    messages: workspaceDummyContent.messages,
    files: workspaceDummyContent.files,
  }
}

function buildWorkspacePeriod(startDate, endDate) {
  if (!startDate && !endDate) return 'Period not specified yet'
  return `${formatDisplayDate(startDate)} - ${formatDisplayDate(endDate)}`
}

function formatWorkspaceSessionLabel(session) {
  if (!session?.date) return ''
  return `${session.title || 'Mentoring session'} - ${formatDisplayDate(session.date)}`
}

function calculateTaskProgress(tasks) {
  if (!tasks.length) return 0
  return Math.round((tasks.filter((task) => task.status === 'Done').length / tasks.length) * 100)
}

function toDateInputValue(date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

function normalizeStoredMentoringRequest(request) {
  return {
    id: request.id || `stored-${Date.now()}`,
    mentorName: request.mentor?.name || 'MSME Mentor',
    mentorProfession: request.mentor?.current_job || 'MSME Mentor',
    topic: request.topic || 'Request mentoring',
    duration: request.duration_type || '1 consultation session',
    schedulePreference: request.schedule_preference || 'Not specified yet',
    status: normalizeMentoringStatus(request.status),
    requestDate: request.createdAt || new Date().toISOString(),
    startDate: request.startDate,
    endDate: request.endDate,
    nextSession: request.nextSession,
    rejectionReason: request.rejectionReason,
    taskProgress: request.taskProgress,
  }
}

function normalizeMentoringStatus(status) {
  const normalized = String(status || 'Pending').toLowerCase()
  const statusMap = {
    pending: 'Pending',
    accepted: 'Accepted',
    rejected: 'Rejected',
    active: 'Active',
    completed: 'Completed',
    cancelled: 'Cancelled',
    canceled: 'Cancelled',
  }

  return statusMap[normalized] || 'Pending'
}

function getMentoringStatusLabel(status) {
  const labelMap = {
    Pending: 'Pending',
    Accepted: 'Accepted',
    Rejected: 'Rejected',
    Active: 'Active',
    Completed: 'Completed',
    Cancelled: 'Cancelled',
  }

  return labelMap[status] || status
}

function formatDisplayDate(value) {
  if (!value) return '-'
  const date = value.length === 10 ? new Date(`${value}T00:00:00`) : new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function formatRupiah(value) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
}

function formatNumber(value) {
  return new Intl.NumberFormat('id-ID').format(Number(value || 0))
}

function formatCompactNumber(value) {
  return new Intl.NumberFormat('id-ID', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(Number(value || 0))
}

function getMentoringIdFromPath(pathname) {
  return pathname.split('/').filter(Boolean).at(-1) || 'new'
}

function getUmkmBusinessAvatar(user) {
  const logo = user?.businessLogo || user?.logo || ''
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'

  if (logo) {
    if (logo.startsWith('http') || logo.startsWith('data:image/')) return logo
    return `${apiBaseUrl}${logo.startsWith('/') ? '' : '/'}${logo}`
  }

  return '/assets/logo.png'
}

export default UmkmDashboardPage

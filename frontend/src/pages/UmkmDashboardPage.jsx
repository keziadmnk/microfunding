import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  getCurrentUser,
  getStoredUser,
  isAuthenticated,
  logout,
} from '../services/authService'
import DashboardSection from '../components/dashboard/DashboardSection'
import DashboardSidebar from '../components/dashboard/DashboardSidebar'
import DashboardTopBar from '../components/dashboard/DashboardTopBar'
import ForumPostCard from '../components/dashboard/ForumPostCard'
import ProgressOverviewCard from '../components/dashboard/ProgressOverviewCard'
import QuickActionButton from '../components/dashboard/QuickActionButton'
import SessionCard from '../components/dashboard/SessionCard'
import StatCard from '../components/dashboard/StatCard'
import ProfileForm from '../components/dashboard/ProfileForm'
import AiBusinessAdvisor from '../components/dashboard/AiBusinessAdvisor'
import './UmkmDashboardPage.css'

const forumPosts = [
  {
    author: 'Ahmad Ridwan (Investor)',
    role: 'Investor',
    time: '2 jam yang lalu',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDSrYW5kWc6K8OBpO5cBe8wVNZ1qamPVr4ZglIkrb4YPRRR_4UvmpQkNrFJG93dQ4MMOBQcgZpndLgpNoT1gaGeHgBDC87ggmptRpplp3C93Q0nP-tVaxvXu15Qou40Qj8SwgemDkg6Bk_JVRZn56LhGnklVIi4U2xwOZxUjDq4ROoA6jsXF5qlVSXgkEv2YbfydxnrICT_UjrYnuce1d5bhm3Lzk8mt421tP9NeEODtt4A7HKeMP62jPz7LyLxs_7bD18ENrVdnfI',
    content:
      'Sedang mencari UMKM di sektor agroteknologi untuk pendanaan Q4. Ada yang punya profil menarik?',
    replies: '24 Balasan',
    likes: '12 Suka',
  },
  {
    author: 'Siti Aminah (Kopi Merapi)',
    role: 'UMKM Owner',
    time: '5 jam yang lalu',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCiisoVElXb4MZr8sivsvP9brGsqu7U_U0HXuUuIVBx9l4HcyLoLaWgNqRz0BjrKbhfb5Xx8H_2QFstmav4RnJDzh8KuuBRc4a8JkEG9zyo_RDffVqpzA32aBwCsucOo4ckn-A54Je_1F5ROiLhCgXfRs31FfUmPx_xoP0s-23y0cfRPDsZdRKZvr4AdUWGS3wPdY8Gr5cLkMcOaYteFA6pp5AEHyvnIB6wdvBBB4aZs2mV8g_n8JIM37u55fi_sIhSeOYJ-WCswIQ',
    content:
      'Terima kasih untuk mentor Marcus Thorne atas sesi scaling logistik tadi siang. Sangat mencerahkan!',
    replies: '8 Balasan',
    likes: '45 Suka',
  },
]

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
    label: 'Mentoring Sessions',
    icon: 'video_chat',
    children: [
      { label: 'Mentoring Saya', icon: 'groups' },
      { label: 'Task and Action Plan', icon: 'task_alt' },
    ],
  },
  { label: 'Impact Reports', icon: 'monitoring' },
  { label: 'Financials', icon: 'payments' },
  { label: 'Network', icon: 'group' },
  { label: 'Profile', icon: 'storefront' },
]

function UmkmDashboardPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(getStoredUser())
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('Dashboard')
  const [aiMatchingLoading, setAiMatchingLoading] = useState(false)
  const [aiMatchingError, setAiMatchingError] = useState('')
  const [aiMatchingResult, setAiMatchingResult] = useState(null)
  const [aiRequestMessage, setAiRequestMessage] = useState('')
  const [mentors, setMentors] = useState([])
  const [mentorsLoading, setMentorsLoading] = useState(false)
  const [mentorsError, setMentorsError] = useState('')
  const [selectedMentor, setSelectedMentor] = useState(null)
  const [requestMessage, setRequestMessage] = useState('')

  const fetchMentors = useCallback(async () => {
    const token = localStorage.getItem('microfun_auth_token')
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'

    setMentorsLoading(true)
    setMentorsError('')

    try {
      const response = await fetch(`${apiBaseUrl}/api/mentor/directory`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.message || 'Gagal memuat daftar mentor.')
      setMentors((payload.data || []).map((mentor) => normalizeMentorProfile(mentor, apiBaseUrl)))
    } catch (err) {
      setMentorsError(err.message)
    } finally {
      setMentorsLoading(false)
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
        setError('')
        fetchMentors()
      })
      .catch((err) => {
        setError(err.message || 'Session expired, please login again.')
        logout()
        navigate('/login', { replace: true })
      })
      .finally(() => {
        setLoading(false)
      })
  }, [fetchMentors, navigate])

  const displayName = useMemo(() => user?.name || 'UMKM', [user])
  const topbarCopy = useMemo(() => {
    if (activeTab === 'Profile') {
      return {
        title: 'Pengaturan Profil UMKM',
        subtitle: 'Kelola informasi usaha, dokumen legalitas, dan target pendanaan AI Anda.',
      }
    }

    if (activeTab === 'AI Business Advisor') {
      return {
        title: 'AI Business Advisor',
        subtitle: 'Konsultasi strategi bisnis berbasis profil UMKM dan insight pasar.',
      }
    }

    if (activeTab === 'AI Matching') {
      return {
        title: 'AI Matching',
        subtitle: 'Temukan funder dan mentor yang cocok berdasarkan profil bisnis UMKM Anda.',
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
    const token = localStorage.getItem('microfun_auth_token')
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'
    setRequestMessage('')
    setMentorsError('')

    try {
      const response = await fetch(`${apiBaseUrl}/api/mentor/${selectedMentor.id}/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.message || 'Gagal mengirim request mentoring.')
      setRequestMessage(payload.message)
      setSelectedMentor(null)
    } catch (err) {
      setMentorsError(err.message)
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
      if (!response.ok) throw new Error(data.message || 'Gagal menjalankan analisis AI.')
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
        navItems={umkmNavItems}
        onTabChange={setActiveTab}
      />

      <main className="dashboard-main">
        <DashboardTopBar
          title={topbarCopy.title}
          subtitle={topbarCopy.subtitle}
          avatarUrl="https://lh3.googleusercontent.com/aida-public/AB6AXuD_ZPlwaN976hVEFlfHD9DhJytlci7bJpxywRgmDNNDsqteBZmz0nf92DTpTM6NVjyhJrNq_q3pP490-OxJdaJ8pLCC8mb8Vx1S5W6SVasoDZU-qlTX-jQ3GbZxKzGnoZU8R7gBTz4eV6CAj6qcOKs3z5X3dV9eNbGWnkdVGJqbXNiuBjUeC6UT4oTD8-WPao59TFUwijqoyHWEf8iwWmuZ9804veRR8GWYlkNx1-xxatuu6HwtQhkwH762hVXSK6e9mgrwnj9yEh0"
        />

        {error && <p className="dashboard-error">{error}</p>}

        {activeTab === 'Profile' ? (
          <ProfileForm onCancel={() => setActiveTab('Dashboard')} />
        ) : activeTab === 'AI Business Advisor' ? (
          <AiBusinessAdvisor userName={displayName} />
        ) : activeTab === 'AI Matching' ? (
          <AiMatchingView
            error={aiMatchingError}
            loading={aiMatchingLoading}
            onAnalyze={handleAiMatching}
            onRequestFunder={(funder) => {
              sessionStorage.setItem('microfun_selected_ai_funder', JSON.stringify(funder))
              navigate('/dashboard/umkm/ai-matching/funder-request')
            }}
            onRequestMentor={(mentor) => {
              setAiRequestMessage(`Silakan pilih ${mentor.name} di halaman Mentoring Saya untuk mengirim request mentoring.`)
              setActiveTab('Mentoring Saya')
            }}
            requestMessage={aiRequestMessage}
            result={aiMatchingResult}
          />
        ) : activeTab === 'Mentoring Saya' ? (
          <MentoringSessionsView
            error={mentorsError}
            loading={mentorsLoading}
            mentors={mentors}
            onRequest={setSelectedMentor}
            requestMessage={requestMessage}
          />
        ) : activeTab === 'Task and Action Plan' ? (
          <UmkmTaskActionPlanView />
        ) : activeTab === 'Dashboard' ? (
          <div className="dashboard-grid">
            <AiMatchingView
              error={aiMatchingError}
              loading={aiMatchingLoading}
              onAnalyze={handleAiMatching}
              onRequestFunder={(funder) => {
                sessionStorage.setItem('microfun_selected_ai_funder', JSON.stringify(funder))
                navigate('/dashboard/umkm/ai-matching/funder-request')
              }}
              onRequestMentor={(mentor) => {
                setAiRequestMessage(`Silakan pilih ${mentor.name} di halaman Mentoring Saya untuk mengirim request mentoring.`)
                setActiveTab('Mentoring Saya')
              }}
              requestMessage={aiRequestMessage}
              result={aiMatchingResult}
            />

            <DashboardSection className="dashboard-section dashboard-forum-section" span="wide" title="Forum Aktivitas" actionLabel="Lihat Semua">
              <div className="forum-list" id="forum">
                {forumPosts.map((post) => (
                  <ForumPostCard key={`${post.author}-${post.time}`} {...post} />
                ))}
              </div>

              <div className="forum-composer">
                <img
                  alt={`${displayName} profile`}
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuD_ZPlwaN976hVEFlfHD9DhJytlci7bJpxywRgmDNNDsqteBZmz0nf92DTpTM6NVjyhJrNq_q3pP490-OxJdaJ8pLCC8mb8Vx1S5W6SVasoDZU-qlTX-jQ3GbZxKzGnoZU8R7gBTz4eV6CAj6qcOKs3z5X3dV9eNbGWnkdVGJqbXNiuBjUeC6UT4oTD8-WPao59TFUwijqoyHWEf8iwWmuZ9804veRR8GWYlkNx1-xxatuu6HwtQhkwH762hVXSK6e9mgrwnj9yEh0"
                />
                <div className="forum-composer-input">
                  <input
                    type="text"
                    placeholder="Bagikan pembaruan atau ajukan pertanyaan..."
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
                        ? () => setActiveTab('Profile')
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
            <h3 style={{ margin: 0, color: '#122937', fontSize: '1.4rem', fontWeight: 800 }}>Fitur Sedang Dikembangkan</h3>
            <p style={{ color: '#43474b', margin: '0.75rem 0 1.75rem', fontSize: '0.95rem', lineHeight: 1.6 }}>
              Halaman <strong>{activeTab}</strong> saat ini sedang dipersiapkan dan akan segera hadir untuk menunjang pertumbuhan bisnis Anda.
            </p>
            <button
              type="button"
              className="dashboard-primary-action"
              onClick={() => setActiveTab('Dashboard')}
              style={{ margin: '0 auto', display: 'flex', border: 0 }}
            >
              <span className="material-symbols-outlined">dashboard</span>
              Kembali ke Dashboard
            </button>
          </div>
        )}

        {selectedMentor && (
          <MentorRequestModal
            mentor={selectedMentor}
            onClose={() => setSelectedMentor(null)}
            onSubmit={handleMentorRequest}
          />
        )}

        <footer className="dashboard-footer">
          <p>© 2024 MicroFun. Impacting Indonesian MSMEs through Global Connection.</p>
          <div>
            <a href="#">Impact Reports</a>
            <a href="#">Legal Information</a>
            <a href="#">Privacy Policy</a>
          </div>
        </footer>
      </main>
    </div>
  )
}

function AiMatchingView({ error, loading, onAnalyze, onRequestFunder, onRequestMentor, requestMessage, result }) {
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
            <h2>Cari Funder dan Mentor dengan AI</h2>
            <p>
              Sistem AI kami menganalisis profil bisnis, sektor usaha, dan kebutuhan Anda
              untuk menemukan funder dan mentor yang paling sesuai.
            </p>
            <div className="dashboard-hero-metrics">
              <StatCard
                icon="analytics"
                title="Skor Kecocokan AI"
                description="Analisis multi-dimensi berbasis profil bisnis Anda"
              />
              <StatCard
                icon="groups_3"
                title="3 Funder + 3 Mentor"
                description="Rekomendasi terkurasi sesuai sektor & kebutuhan modal"
              />
              <StatCard
                icon="forum"
                title="Penjelasan AI Insight"
                description="Alasan mengapa setiap rekomendasi cocok untuk bisnis Anda"
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
                {loading ? 'Menganalisis...' : 'Mulai Analisis AI'}
              </button>
              <a href="#ai-match-results" className="dashboard-text-action">
                <span className="material-symbols-outlined" aria-hidden="true">
                  search
                </span>
                Lihat Hasil
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
    </div>
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
          <strong>Hasil Rekomendasi AI</strong>
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
          <button type="button" onClick={() => setInsightItem(null)} aria-label="Tutup insight">
            <span className="material-symbols-outlined">close</span>
          </button>
          <strong>AI Insight untuk {insightItem.name}</strong>
          <p>{insightItem.reason}</p>
          <small>{insightItem.nextStep}</small>
        </div>
      )}

      <div className="ai-match-tabs" role="tablist" aria-label="Jenis rekomendasi AI">
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
        actionLabel="Request Pendanaan"
        icon="account_balance"
        items={result.funders || []}
        onViewInsight={setInsightItem}
        onRequest={onRequestFunder}
        title="Rekomendasi Funder"
        type="funder"
      />
      ) : (
      <RecommendationGroup
        actionLabel="Request Mentoring"
        icon="school"
        items={result.mentors || []}
        onViewInsight={setInsightItem}
        onRequest={onRequestMentor}
        title="Rekomendasi Mentor"
        type="mentor"
      />
      )}
    </div>
  )
}

function MentoringSessionsView({ error, loading, mentors, onRequest, requestMessage }) {
  return (
    <div className="mentoring-page">
      <header className="mentoring-heading">
        <div>
          <h2>Mentoring Sessions</h2>
          <p>Pilih mentor berdasarkan profil, bidang keahlian, prestasi, dan pengalaman mereka.</p>
        </div>
        <span>{mentors.length} mentor tersedia</span>
      </header>

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
          <p>Memuat daftar mentor...</p>
        </div>
      ) : mentors.length === 0 ? (
        <div className="mentoring-empty-state">
          <span className="material-symbols-outlined">school</span>
          <p>Belum ada mentor yang melengkapi profil.</p>
        </div>
      ) : (
        <div className="mentor-directory-grid">
          {mentors.map((mentor) => (
            <article key={mentor.id} className="mentor-directory-card">
              <header>
                <div className="mentor-directory-avatar">
                  {mentor.photoUrl ? <img src={mentor.photoUrl} alt={mentor.name} /> : <span>{mentor.initials}</span>}
                </div>
                <div>
                  <h3>{mentor.name}</h3>
                  <p>{mentor.current_job || 'Mentor UMKM'}</p>
                </div>
              </header>
              <div className="mentor-directory-skills">
                {mentor.skills.length > 0 ? mentor.skills.map((skill) => <span key={skill}>{skill}</span>) : <span>Keahlian belum diisi</span>}
              </div>
              <InfoBlock title="Prestasi" value={mentor.achievements || 'Belum ada prestasi yang ditambahkan.'} />
              <InfoBlock title="Pengalaman" value={mentor.experience || 'Belum ada pengalaman yang ditambahkan.'} />
              <InfoBlock title="Tentang Mentor" value={mentor.about || 'Mentor ini belum menambahkan bio.'} />
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

function UmkmTaskActionPlanView() {
  const tasks = [
    {
      title: 'Buat katalog produk digital',
      description: 'Susun 10 produk utama lengkap dengan harga, foto, dan deskripsi singkat.',
      deadline: 'Minggu ini',
      status: 'In Progress',
      progress: 65,
    },
    {
      title: 'Aktifkan WA Business Catalog',
      description: 'Upload minimal 5 produk unggulan ke katalog WhatsApp Business.',
      deadline: '3 hari lagi',
      status: 'Pending',
      progress: 20,
    },
    {
      title: 'Evaluasi strategi konten Instagram',
      description: 'Catat performa 5 posting terakhir dan pilih format dengan engagement tertinggi.',
      deadline: 'Selesai',
      status: 'Done',
      progress: 100,
    },
  ]

  return (
    <div className="mentoring-subpage">
      <div className="mentoring-heading">
        <div>
          <span>Mentoring Aktif</span>
          <h2>Task and Action Plan</h2>
          <p>Pantau tugas dari mentor dan update progres agar sesi mentoring tetap terarah.</p>
        </div>
        <button type="button">
          <span className="material-symbols-outlined">add_task</span>
          Update Progress
        </button>
      </div>

      <div className="action-plan-grid">
        {tasks.map((task) => (
          <article key={task.title} className="action-plan-card">
            <div className="action-plan-card-head">
              <span className={`task-status ${task.status.toLowerCase().replaceAll(' ', '-')}`}>{task.status}</span>
              <small>{task.deadline}</small>
            </div>
            <h3>{task.title}</h3>
            <p>{task.description}</p>
            <div className="action-plan-progress">
              <div>
                <span>Progress</span>
                <strong>{task.progress}%</strong>
              </div>
              <i><b style={{ width: `${task.progress}%` }} /></i>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

function MentorRequestModal({ mentor, onClose, onSubmit }) {
  const scheduleOptions = getMentoringScheduleOptions()
  const [form, setForm] = useState({
    topic: '',
    business_problem: '',
    mentoring_goal: '',
    scheduled_at: '',
    additional_message: '',
  })

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  return (
    <div className="mentor-request-overlay" role="dialog" aria-modal="true">
      <form className="mentor-request-modal" onSubmit={(event) => {
        event.preventDefault()
        onSubmit(form)
      }}>
        <header>
          <div>
            <h3>Request Mentoring</h3>
            <p>Dengan {mentor.name}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Tutup">
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>

        <label>
          Topik Mentoring
          <input value={form.topic} onChange={(event) => updateField('topic', event.target.value)} placeholder="Contoh: Strategi marketing digital" required />
        </label>
        <label>
          Masalah Bisnis
          <textarea value={form.business_problem} onChange={(event) => updateField('business_problem', event.target.value)} placeholder="Ceritakan masalah bisnis yang Anda hadapi..." required />
        </label>
        <label>
          Tujuan Mentoring
          <textarea value={form.mentoring_goal} onChange={(event) => updateField('mentoring_goal', event.target.value)} placeholder="Apa yang ingin Anda capai setelah mentoring?" required />
        </label>
        <label>
          Preferensi Jadwal
          <select value={form.scheduled_at} onChange={(event) => updateField('scheduled_at', event.target.value)} required>
            <option value="">Pilih jadwal...</option>
            {scheduleOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label>
          Pesan Tambahan
          <textarea value={form.additional_message} onChange={(event) => updateField('additional_message', event.target.value)} placeholder="Tambahkan konteks lain yang perlu diketahui mentor..." />
        </label>

        <footer>
          <button type="button" onClick={onClose}>Batal</button>
          <button type="submit">Kirim Request</button>
        </footer>
      </form>
    </div>
  )
}

function getMentoringScheduleOptions() {
  return [1, 2, 3, 5, 7].map((dayOffset, index) => {
    const date = new Date()
    date.setDate(date.getDate() + dayOffset)
    date.setHours(index % 2 === 0 ? 10 : 14, 0, 0, 0)
    return {
      value: toDateTimeLocalValue(date),
      label: new Intl.DateTimeFormat('id-ID', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date),
    }
  })
}

function toDateTimeLocalValue(date) {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return offsetDate.toISOString().slice(0, 16)
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
                ? 'Calon pendana yang selaras dengan sektor, kebutuhan modal, dan tujuan bisnis UMKM Anda.'
                : 'Mentor yang paling sesuai dengan tantangan bisnis dan target pengembangan UMKM Anda.'}
            </p>
          </div>
        </div>
        <small>{items.length} rekomendasi</small>
      </div>
      {items.length === 0 ? (
        <p className="ai-match-empty">Belum ada kandidat yang cukup cocok.</p>
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
                    <p>{type === 'funder' ? `Calon funder #${index + 1}` : `Calon mentor #${index + 1}`}</p>
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
  const photo = mentor.profile_photo
  const photoUrl = photo
    ? photo.startsWith('http') || photo.startsWith('data:image/')
      ? photo
      : `${apiBaseUrl}${photo.startsWith('/') ? '' : '/'}${photo}`
    : ''

  return {
    ...mentor,
    photoUrl,
    initials: getInitials(mentor.name),
    skills: Array.isArray(mentor.skills) ? mentor.skills : [],
  }
}

function getInitials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map((word) => word[0]).join('').toUpperCase() || 'MT'
}

export default UmkmDashboardPage

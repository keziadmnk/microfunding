import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

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

function UmkmDashboardPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(getStoredUser())
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login', { replace: true })
      return
    }

    getCurrentUser()
      .then((profile) => {
        setUser(profile)
        setError('')
      })
      .catch((err) => {
        setError(err.message || 'Session expired, please login again.')
        logout()
        navigate('/login', { replace: true })
      })
      .finally(() => {
        setLoading(false)
      })
  }, [navigate])

  const displayName = useMemo(() => user?.name || 'UMKM', [user])

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  if (loading) {
    return <main className="dashboard-loading">Loading dashboard...</main>
  }

  return (
    <div className="dashboard-shell">
      <DashboardSidebar onLogout={handleLogout} />

      <main className="dashboard-main">
        <DashboardTopBar
          title={`Welcome back, ${displayName} (MSME)`}
          subtitle="Here’s what’s happening with your business growth today."
          avatarUrl="https://lh3.googleusercontent.com/aida-public/AB6AXuD_ZPlwaN976hVEFlfHD9DhJytlci7bJpxywRgmDNNDsqteBZmz0nf92DTpTM6NVjyhJrNq_q3pP490-OxJdaJ8pLCC8mb8Vx1S5W6SVasoDZU-qlTX-jQ3GbZxKzGnoZU8R7gBTz4eV6CAj6qcOKs3z5X3dV9eNbGWnkdVGJqbXNiuBjUeC6UT4oTD8-WPao59TFUwijqoyHWEf8iwWmuZ9804veRR8GWYlkNx1-xxatuu6HwtQhkwH762hVXSK6e9mgrwnj9yEh0"
        />

        {error && <p className="dashboard-error">{error}</p>}

        <div className="dashboard-grid">
          <DashboardSection className="dashboard-section dashboard-hero-section" span="full">
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
                  Sistem AI kami menganalisis profil bisnis, sektor usaha, dan
                  kebutuhan Anda untuk menemukan funder dan mentor yang paling
                  sesuai.
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
                  <button type="button" className="dashboard-primary-action">
                    <span className="material-symbols-outlined" aria-hidden="true">
                      bolt
                    </span>
                    Mulai Analisis AI
                  </button>
                  <a href="#forum" className="dashboard-text-action">
                    <span className="material-symbols-outlined" aria-hidden="true">
                      search
                    </span>
                    Jelajahi UMKM
                  </a>
                </div>
              </div>
            </div>
          </DashboardSection>

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
                <QuickActionButton key={action.label} {...action} />
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

export default UmkmDashboardPage
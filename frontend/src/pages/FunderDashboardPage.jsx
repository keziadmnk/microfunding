import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  getCurrentUser,
  getStoredUser,
  isAuthenticated,
  logout,
} from '../services/authService'
import DashboardSidebar from '../components/dashboard/DashboardSidebar'
import FunderProfileForm from '../components/dashboard/FunderProfileForm'
import './FunderDashboardPage.css'

const roleDashboardMap = {
  umkm_owner: '/dashboard/umkm',
  funder: '/dashboard/funder',
  mentor: '/dashboard/mentor',
  admin: '/dashboard/admin',
}

const insightPrompts = [
  'Membantu UMKM berkembang',
  'Meningkatkan penjualan UMKM',
  'Membantu digitalisasi bisnis',
  'Mendukung UMKM lokal',
]

const supportPrompts = [
  'Pendanaan modal',
  'Mentoring bisnis',
  'Branding & marketing',
  'Networking',
]

const funderNavItems = [
  { label: 'Funding', icon: 'dashboard' },
  { label: 'AI Recommendation', icon: 'psychology' },
  { label: 'Funding History', icon: 'history' },
  { label: 'Profile', icon: 'account_circle' },
]

const fallbackImages = [
  'https://images.unsplash.com/photo-1556767576-cf0a4a80e5e2?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&w=900&q=80',
]

function FunderDashboardPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(getStoredUser())
  const [error, setError] = useState('')
  const [industry, setIndustry] = useState('All Industries')
  const [region, setRegion] = useState('All Regions')
  const [riskLevels, setRiskLevels] = useState([])
  const [fundingTarget, setFundingTarget] = useState('')
  const [supportType, setSupportType] = useState('')
  const [activeTab, setActiveTab] = useState('Funding')
  const [msmeProfiles, setMsmeProfiles] = useState([])
  const [msmeLoading, setMsmeLoading] = useState(false)
  const [msmeError, setMsmeError] = useState('')
  const [fundingHistory, setFundingHistory] = useState({ pending: [], history: [] })
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState('')
  const [aiRecommendationLoading, setAiRecommendationLoading] = useState(false)
  const [aiRecommendationError, setAiRecommendationError] = useState('')
  const [aiRecommendationResult, setAiRecommendationResult] = useState(null)

  const fetchRecommendedUmkms = useCallback(async () => {
    const token = localStorage.getItem('microfun_auth_token')
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'

    setMsmeLoading(true)
    setMsmeError('')

    try {
      const response = await fetch(`${apiBaseUrl}/api/funding/umkms`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.message || 'Gagal memuat data UMKM.')

      setMsmeProfiles((payload.data || []).map((item, index) => normalizeMsmeProfile(item, index, apiBaseUrl)))
    } catch (err) {
      setMsmeError(err.message)
      setMsmeProfiles([])
    } finally {
      setMsmeLoading(false)
    }
  }, [])

  const fetchFundingHistory = useCallback(async () => {
    const token = localStorage.getItem('microfun_auth_token')
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'

    setHistoryLoading(true)
    setHistoryError('')

    try {
      const response = await fetch(`${apiBaseUrl}/api/funding/history`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.message || 'Gagal memuat funding history.')

      setFundingHistory({
        pending: (payload.pending || []).map((item, index) => normalizeFundingHistoryItem(item, index, apiBaseUrl)),
        history: (payload.history || []).map((item, index) => normalizeFundingHistoryItem(item, index, apiBaseUrl)),
      })
    } catch (err) {
      setHistoryError(err.message)
      setFundingHistory({ pending: [], history: [] })
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login', { replace: true })
      return
    }

    getCurrentUser()
      .then((profile) => {
        if (profile.role !== 'funder') {
          navigate(roleDashboardMap[profile.role] || '/login', { replace: true })
          return
        }

        setUser(profile)
        setError('')
        fetchRecommendedUmkms()
        fetchFundingHistory()
      })
      .catch((err) => {
        setError(err.message || 'Session expired, please login again.')
        logout()
        navigate('/login', { replace: true })
      })
      .finally(() => {
        setLoading(false)
      })
  }, [fetchFundingHistory, fetchRecommendedUmkms, navigate])

  const displayName = useMemo(() => user?.name || 'Funder', [user])
  const profilePhotoUrl = useMemo(() => getProfilePhotoUrl(user?.profile_photo), [user])
  const userInitials = useMemo(() => getInitials(displayName), [displayName])

  const industryOptions = useMemo(() => {
    const categories = msmeProfiles.map((profile) => profile.industry).filter(Boolean)
    return ['All Industries', ...Array.from(new Set(categories))]
  }, [msmeProfiles])

  const regionOptions = useMemo(() => {
    const regions = msmeProfiles.map((profile) => profile.region).filter(Boolean)
    return ['All Regions', ...Array.from(new Set(regions))]
  }, [msmeProfiles])

  const filteredProfiles = useMemo(() => (
    msmeProfiles.filter((profile) => {
      const industryMatch = industry === 'All Industries' || profile.industry === industry
      const regionMatch = region === 'All Regions' || profile.region === region
      const riskMatch = riskLevels.length === 0 || riskLevels.includes(profile.risk)

      return industryMatch && regionMatch && riskMatch
    })
  ), [industry, msmeProfiles, region, riskLevels])

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  function toggleRisk(risk) {
    setRiskLevels((current) => (
      current.includes(risk)
        ? current.filter((item) => item !== risk)
        : [...current, risk]
    ))
  }

  function applyPrompt(setter, value) {
    setter((current) => (current ? `${current}, ${value}` : value))
  }

  function handleViewInsight(profile) {
    navigate(`/dashboard/funder/insight/${profile.id}`, {
      state: {
        insight: profile,
      },
    })
  }

  function handleFundNow(profile) {
    navigate(`/dashboard/funder/fund/${profile.id}`)
  }

  async function handleAiRecommendation() {
    const token = localStorage.getItem('microfun_auth_token')
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'

    setAiRecommendationLoading(true)
    setAiRecommendationError('')

    try {
      const response = await fetch(`${apiBaseUrl}/api/ai/funder-recommendations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          target: fundingTarget,
          supportType,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Gagal menjalankan rekomendasi AI.')
      setAiRecommendationResult(data)
    } catch (err) {
      setAiRecommendationError(err.message)
    } finally {
      setAiRecommendationLoading(false)
    }
  }

  if (loading) {
    return (
      <main className="funder-loading">
        <span className="material-symbols-outlined funder-spinner">hourglass_empty</span>
        <p>Memuat dashboard funder...</p>
      </main>
    )
  }

  return (
    <div className="funder-dashboard-shell">
      <DashboardSidebar
        onLogout={handleLogout}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        navItems={funderNavItems}
        brandSubtitle="Funding Growth"
        ctaLabel="Find Funding"
      >
          {activeTab === 'Funding' && (
          <div className="funder-filter-panel" aria-label="Funding filters">
            <div>
              <h3>Filters</h3>

            <div className="funder-filter-group">
              <label htmlFor="industry-filter">Industry</label>
              <select
                id="industry-filter"
                value={industry}
                onChange={(event) => setIndustry(event.target.value)}
              >
                {industryOptions.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </div>

            <div className="funder-filter-group">
              <label htmlFor="region-filter">Region</label>
              <select
                id="region-filter"
                value={region}
                onChange={(event) => setRegion(event.target.value)}
              >
                {regionOptions.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </div>

            <div className="funder-filter-group">
              <span className="funder-filter-label">Risk Level</span>
              <div className="funder-checkbox-stack">
                {['Conservative', 'Moderate', 'Aggressive'].map((risk) => (
                  <label key={risk}>
                    <input
                      type="checkbox"
                      checked={riskLevels.includes(risk)}
                      onChange={() => toggleRisk(risk)}
                    />
                    {risk}
                  </label>
                ))}
              </div>
            </div>

            <div className="funder-filter-group">
              <label htmlFor="goal-range">Funding Goal</label>
              <input id="goal-range" className="funder-range" type="range" min="1000" max="500000" />
              <div className="funder-range-labels">
                <span>$1k</span>
                <span>$500k</span>
              </div>
            </div>
          </div>
          </div>
          )}
      </DashboardSidebar>

      <main className="funder-main" id="funding">
        <header className="funder-dashboard-topbar">
          <div>
            <h2>{activeTab === 'Profile' ? 'Pengaturan Profil Funder' : `Welcome back, ${displayName} (Funder)`}</h2>
            <p>
              {activeTab === 'Profile'
                ? 'Kelola informasi profil, budget pendanaan, minat investasi, dan keahlian Anda.'
                : 'Temukan UMKM potensial, jalankan rekomendasi AI, dan pantau peluang pendanaan.'}
            </p>
          </div>

          <div className="funder-topbar-actions">
            <div className="funder-user-chip">
              <div>
                <strong>{displayName}</strong>
                <span>Funder</span>
              </div>
              <div className="funder-avatar">
                {profilePhotoUrl ? (
                  <img src={profilePhotoUrl} alt={displayName} />
                ) : (
                  <span>{userInitials}</span>
                )}
              </div>
            </div>
          </div>
        </header>

        {error && <p className="funder-error">{error}</p>}

        {activeTab === 'Profile' ? (
          <FunderProfileForm onCancel={() => setActiveTab('Funding')} />
        ) : activeTab === 'Funding History' ? (
          <FundingHistoryView
            error={historyError}
            history={fundingHistory.history}
            loading={historyLoading}
            onRefresh={fetchFundingHistory}
            pending={fundingHistory.pending}
          />
        ) : activeTab === 'Funding' || activeTab === 'AI Recommendation' ? (
          <>
        <section className="funder-ai-card" id="ai-recommendation">
            <div className="funder-ai-heading-row">
              <div className="funder-ai-icon">
                <span className="material-symbols-outlined">smart_toy</span>
              </div>
              <div className="funder-ai-badge">
                <span className="material-symbols-outlined">bolt</span>
                AI POWERED
              </div>
            </div>

            <h1>Rekomendasi UMKM dengan AI</h1>
            <p>Isi target dan jenis bantuan Anda, AI akan mencarikan UMKM yang paling cocok.</p>

            <div className="funder-ai-grid">
              <div className="funder-ai-field">
                <label htmlFor="funding-target">
                  <span className="material-symbols-outlined">target</span>
                  Target / Harapan terhadap UMKM
                </label>
                <textarea
                  id="funding-target"
                  value={fundingTarget}
                  onChange={(event) => setFundingTarget(event.target.value)}
                  placeholder="Contoh: Membantu UMKM berkembang, mencari UMKM dengan growth tinggi..."
                />
                <div className="funder-prompt-row">
                  {insightPrompts.map((prompt) => (
                    <button key={prompt} type="button" onClick={() => applyPrompt(setFundingTarget, prompt)}>
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="funder-ai-field">
                <label htmlFor="support-type">
                  <span className="material-symbols-outlined">handshake</span>
                  Jenis Bantuan yang Ingin Diberikan
                </label>
                <textarea
                  id="support-type"
                  value={supportType}
                  onChange={(event) => setSupportType(event.target.value)}
                  placeholder="Contoh: Pendanaan modal, mentoring bisnis, branding & marketing..."
                />
                <div className="funder-prompt-row">
                  {supportPrompts.map((prompt) => (
                    <button key={prompt} type="button" onClick={() => applyPrompt(setSupportType, prompt)}>
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="button"
              className="funder-ai-action"
              onClick={handleAiRecommendation}
              disabled={aiRecommendationLoading}
            >
              <span className="material-symbols-outlined">
                {aiRecommendationLoading ? 'hourglass_empty' : 'auto_awesome'}
              </span>
              {aiRecommendationLoading ? 'Menganalisis...' : 'Rekomendasi AI'}
            </button>
            {(aiRecommendationError || aiRecommendationResult) && (
              <FunderAiRecommendationPanel
                error={aiRecommendationError}
                result={aiRecommendationResult}
                apiProfiles={msmeProfiles}
                onFundNow={handleFundNow}
                onViewInsight={handleViewInsight}
              />
            )}
        </section>

        {activeTab === 'Funding' && (
          <>
            <header className="funder-section-heading">
              <div>
                <h2>Recommended MSMEs for You</h2>
              </div>
              <span>{filteredProfiles.length} peluang aktif</span>
            </header>

            {msmeError && <p className="funder-error">{msmeError}</p>}

            {msmeLoading ? (
              <div className="funder-data-state">
                <span className="material-symbols-outlined funder-spinner-small">hourglass_empty</span>
                <p>Memuat data UMKM dari database...</p>
              </div>
            ) : filteredProfiles.length > 0 ? (
              <div className="funder-profile-grid">
                {filteredProfiles.map((profile) => (
                  <MsmeCard
                    key={profile.id}
                    profile={profile}
                    onFundNow={handleFundNow}
                  />
                ))}
              </div>
            ) : (
              <div className="funder-data-state empty">
                <span className="material-symbols-outlined">database</span>
                <h3>Belum Ada Data UMKM</h3>
                <p>Card rekomendasi akan muncul setelah UMKM melengkapi profil bisnisnya.</p>
              </div>
            )}
          </>
        )}
          </>
        ) : (
          <div className="funder-placeholder-card">
            <span className="material-symbols-outlined">construction</span>
            <h3>Fitur Sedang Dikembangkan</h3>
            <p>Halaman <strong>{activeTab}</strong> sedang dipersiapkan untuk menunjang aktivitas pendanaan Anda.</p>
            <button type="button" className="funder-ai-action" onClick={() => setActiveTab('Funding')}>
              <span className="material-symbols-outlined">dashboard</span>
              Kembali ke Funding
            </button>
          </div>
        )}

        <footer className="funder-footer">
          <div>
            <p>© 2024 MicroFun. Impacting Indonesian MSMEs through Global Connection.</p>
            <nav aria-label="Footer links">
              <a href="#reports">Impact Reports</a>
              <a href="#legal">Legal Information</a>
              <a href="#privacy">Privacy Policy</a>
            </nav>
          </div>
        </footer>

      </main>
    </div>
  )
}

function MsmeCard({ profile, onFundNow, onViewInsight, showInsight = false }) {
  return (
    <article className="funder-msme-card">
      <div className="funder-msme-image-wrap">
        {profile.image ? (
          <img src={profile.image} alt={profile.name} />
        ) : (
          <div className="funder-msme-image-fallback">{profile.initials}</div>
        )}
        {profile.match ? <MatchBadge match={profile.match} /> : null}
      </div>

      <div className="funder-msme-body">
        <div className="funder-msme-title-row">
          <div>
            <h3>{profile.name}</h3>
            <span>{profile.category}</span>
          </div>
          <button type="button" aria-label={`Simpan ${profile.name}`}>
            <span className="material-symbols-outlined">bookmark</span>
          </button>
        </div>

        <p className="funder-msme-description">{profile.description}</p>
        <ProgressSummary goal={profile.goal} progress={profile.progress} />

        <div className="funder-msme-actions">
          {showInsight && (
            <button type="button" className="funder-secondary-btn" onClick={() => onViewInsight(profile)}>
              View Insight
            </button>
          )}
          <button type="button" className="funder-primary-btn" onClick={() => onFundNow(profile)}>
            Fund Now
          </button>
        </div>
      </div>
    </article>
  )
}

function FundingHistoryView({ error, history, loading, onRefresh, pending }) {
  if (loading) {
    return (
      <div className="funder-data-state">
        <span className="material-symbols-outlined funder-spinner-small">hourglass_empty</span>
        <p>Memuat funding history...</p>
      </div>
    )
  }

  return (
    <section className="funding-history-page">
      <header className="funding-history-header">
        <div>
          <h1>Funding Requests & History</h1>
          <p>Kelola pengajuan pendanaan dan pantau riwayat investasi Anda.</p>
        </div>
        <button type="button" onClick={onRefresh}>
          <span className="material-symbols-outlined">refresh</span>
          Refresh
        </button>
      </header>

      {error && <p className="funder-error">{error}</p>}

      <section className="funding-history-section">
        <div className="funding-history-section-head">
          <h2>
            <span className="material-symbols-outlined">pending_actions</span>
            Pending Requests
            <small>{pending.length} New</small>
          </h2>
        </div>

        {pending.length > 0 ? (
          <div className="funding-request-grid">
            {pending.map((item) => (
              <FundingRequestCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="funder-data-state empty compact">
            <span className="material-symbols-outlined">task_alt</span>
            <h3>Tidak Ada Pending Request</h3>
            <p>Pengajuan pendanaan baru akan muncul di sini setelah Anda melakukan pendanaan.</p>
          </div>
        )}
      </section>

      <section className="funding-history-section">
        <div className="funding-history-section-head">
          <h2>
            <span className="material-symbols-outlined">history</span>
            Investment History
          </h2>
        </div>

        <div className="funding-history-table-card">
          {history.length > 0 ? (
            <div className="funding-history-table-wrap">
              <table className="funding-history-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>MSME Name</th>
                    <th>Amount Invested</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => (
                    <tr key={item.id}>
                      <td>{formatDate(item.createdAt)}</td>
                      <td>
                        <div className="funding-history-business">
                          {item.image ? (
                            <img src={item.image} alt={item.businessName} />
                          ) : (
                            <span>{item.initials}</span>
                          )}
                          <strong>{item.businessName}</strong>
                        </div>
                      </td>
                      <td>{formatCurrency(item.amount)}</td>
                      <td><StatusBadge status={item.status} /></td>
                      <td>
                        <button type="button">View Details</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="funder-data-state empty compact">
              <span className="material-symbols-outlined">account_balance_wallet</span>
              <h3>Belum Ada Riwayat Investasi</h3>
              <p>Riwayat akan muncul setelah Anda melakukan pendanaan pada UMKM.</p>
            </div>
          )}
        </div>
      </section>
    </section>
  )
}

function FundingRequestCard({ item }) {
  return (
    <article className="funding-request-card">
      <header>
        <div className="funding-request-logo">
          {item.image ? <img src={item.image} alt={item.businessName} /> : <span>{item.initials}</span>}
        </div>
        <div>
          <h3>{item.businessName}</h3>
          <span>{item.category}</span>
        </div>
      </header>

      <ProgressSummary goal={formatCurrency(item.fundingTarget)} progress={item.progress} />
      <p>{item.description || 'UMKM ini belum menambahkan deskripsi bisnis.'}</p>

      <div className="funding-request-actions">
        <button type="button">Approve</button>
        <button type="button">Decline</button>
      </div>
    </article>
  )
}

function StatusBadge({ status }) {
  const normalized = status || 'pending'
  const labelMap = {
    approved: 'In Progress',
    completed: 'Completed',
    pending: 'Pending',
    rejected: 'Rejected',
  }

  return (
    <span className={`funding-status ${normalized}`}>
      <i />
      {labelMap[normalized] || normalized}
    </span>
  )
}

function FunderAiRecommendationPanel({ apiProfiles, error, onFundNow, onViewInsight, result }) {
  if (error) {
    return (
      <div className="funder-ai-result error">
        <span className="material-symbols-outlined">error</span>
        <p>{error}</p>
      </div>
    )
  }

  if (!result) return null

  const recommendations = (result.recommendations || []).map((item, index) => (
    normalizeAiRecommendation(item, index, apiProfiles)
  ))

  return (
    <div className="funder-ai-result">
      <div className="funder-ai-result-summary">
        <span className="material-symbols-outlined">auto_awesome</span>
        <p>{result.summary}</p>
      </div>
      <div className="funder-ai-result-grid">
        {recommendations.map((profile) => (
          <MsmeCard
            key={`ai-umkm-${profile.id}-${profile.name}`}
            profile={profile}
            onFundNow={onFundNow}
            onViewInsight={onViewInsight}
            showInsight
          />
        ))}
      </div>
    </div>
  )
}

function MatchBadge({ match }) {
  return (
    <div className="funder-match-badge">
      <span className="material-symbols-outlined">bolt</span>
      {match}% Match
    </div>
  )
}

function ProgressSummary({ goal, progress, inverted = false }) {
  const hasProgress = progress !== null && progress !== undefined

  return (
    <div className={`funder-progress ${inverted ? 'inverted' : ''}`}>
      <div>
        <span>Goal: {goal}</span>
        {hasProgress && <strong>{progress}%</strong>}
      </div>
      {hasProgress && (
        <div className="funder-progress-track">
          <span style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  )
}

function normalizeMsmeProfile(item, index, apiBaseUrl) {
  const target = Number(item.fundingTarget || 0)
  const progress = Number(item.progress || 0)
  const category = item.category || 'Lainnya'

  return {
    ...item,
    industry: category,
    region: getRegionFromLocation(item.location),
    risk: deriveRiskLevel(target),
    goal: formatCurrency(target),
    progress,
    match: null,
    image: getBusinessImage(item.logo, index, apiBaseUrl),
    description: item.description || item.businessGoals || item.fundingPurpose || 'UMKM ini belum menambahkan deskripsi bisnis.',
    initials: getInitials(item.name),
  }
}

function normalizeAiRecommendation(item, index, apiProfiles) {
  const dbProfile = apiProfiles.find((profile) => Number(profile.id) === Number(item.id)) || {}
  const target = Number(item.fundingTarget || dbProfile.fundingTarget || 0)

  return {
    ...dbProfile,
    id: item.id || dbProfile.id,
    name: item.name || dbProfile.name || 'UMKM',
    category: item.category || dbProfile.category || 'Lainnya',
    industry: item.category || dbProfile.industry || dbProfile.category || 'Lainnya',
    location: item.location || dbProfile.location || '-',
    fundingTarget: target,
    goal: formatCurrency(target),
    progress: dbProfile.progress || 0,
    match: Number(item.matchScore || 0) || null,
    image: dbProfile.image || fallbackImages[index % fallbackImages.length],
    initials: getInitials(item.name || dbProfile.name),
    description: item.reason || dbProfile.description || 'Rekomendasi AI untuk UMKM ini.',
    reason: item.reason,
    supportFit: item.supportFit,
    nextStep: item.nextStep,
  }
}

function normalizeFundingHistoryItem(item, index, apiBaseUrl) {
  return {
    ...item,
    image: getBusinessImage(item.logo, index, apiBaseUrl),
    initials: getInitials(item.businessName),
  }
}

function getBusinessImage(logo, index, apiBaseUrl) {
  if (logo) {
    return logo.startsWith('http') ? logo : `${apiBaseUrl}${logo.startsWith('/') ? '' : '/'}${logo}`
  }

  return fallbackImages[index % fallbackImages.length]
}

function getProfilePhotoUrl(photo) {
  if (!photo) return ''
  if (photo.startsWith('http') || photo.startsWith('data:image/')) return photo

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'
  return `${apiBaseUrl}${photo.startsWith('/') ? '' : '/'}${photo}`
}

function getRegionFromLocation(location) {
  if (!location) return 'Belum diisi'

  const normalized = String(location)
  const knownRegions = ['Java', 'Jawa', 'Sumatra', 'Bali', 'Sulawesi', 'Kalimantan', 'Papua', 'Jakarta']
  const match = knownRegions.find((region) => normalized.toLowerCase().includes(region.toLowerCase()))

  return match || normalized.split(',').pop().trim()
}

function deriveRiskLevel(target) {
  if (!target || target <= 25000000) return 'Conservative'
  if (target <= 100000000) return 'Moderate'
  return 'Aggressive'
}

function formatCurrency(value) {
  const number = Number(value || 0)
  if (!number) return 'Belum diisi'

  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(number)
}

function formatDate(value) {
  if (!value) return '-'

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase() || 'UM'
}

export default FunderDashboardPage




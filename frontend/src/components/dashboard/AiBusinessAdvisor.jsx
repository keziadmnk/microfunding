import { useEffect, useMemo, useState } from 'react'

const quickPrompts = [
  { icon: 'trending_up', label: 'Cara meningkatkan penjualan?' },
  { icon: 'payments', label: 'Strategi harga produk' },
  { icon: 'public', label: 'Ekspansi ke pasar baru' },
  { icon: 'savings', label: 'Mengurangi biaya operasional' },
]

const fallbackProfile = {
  name: 'Profil UMKM Anda',
  category: 'Belum diisi',
  employee_count: '-',
  monthly_revenue: '-',
  description: 'Lengkapi profil UMKM agar AI Advisor dapat memberikan saran yang lebih akurat.',
}

function AiBusinessAdvisor({ userName = 'UMKM Owner' }) {
  const [profile, setProfile] = useState(fallbackProfile)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [chatError, setChatError] = useState('')

  const token = localStorage.getItem('microfun_auth_token')
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'

  useEffect(() => {
    fetch(`${apiBaseUrl}/api/profile`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Gagal mengambil profil bisnis.')
        return res.json()
      })
      .then((data) => {
        const p = data.profile || {}
        setProfile({
          name: p.name || fallbackProfile.name,
          category: p.other_category || p.category || fallbackProfile.category,
          employee_count: p.employee_count || fallbackProfile.employee_count,
          monthly_revenue: p.monthly_revenue || fallbackProfile.monthly_revenue,
          description: p.description || fallbackProfile.description,
          location: p.location || '-',
        })
      })
      .catch(() => {
        setProfile(fallbackProfile)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [apiBaseUrl, token])

  const advisorIntro = useMemo(() => (
    `Selamat datang kembali, ${userName}! Saya telah membaca profil bisnis ${profile.name} di sektor ${profile.category}. Fokus awal yang bisa kita optimalkan adalah pemasaran, efisiensi operasional, dan kesiapan pendanaan berdasarkan data profil Anda.`
  ), [profile.category, profile.name, userName])

  const visibleMessages = useMemo(() => ([
    {
      id: 'intro',
      sender: 'ai',
      text: advisorIntro,
      time: 'AI ADVISOR',
    },
    ...messages,
  ]), [advisorIntro, messages])

  async function handleSend() {
    const question = input.trim()
    if (!question || sending) return

    const now = new Date().toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    })

    setMessages((current) => [
      ...current,
      { id: `user-${Date.now()}`, sender: 'user', text: question, time: `${now} - YOU` },
    ])
    setInput('')
    setSending(true)
    setChatError('')

    try {
      const response = await fetch(`${apiBaseUrl}/api/ai/business-advisor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          question,
          history: messages.map((message) => ({
            role: message.sender === 'user' ? 'user' : 'assistant',
            content: message.text,
          })),
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'AI gagal menjawab pertanyaan.')

      const aiTime = new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      })

      setMessages((current) => [
        ...current,
        { id: `ai-${Date.now()}`, sender: 'ai', text: data.answer, time: `${aiTime} - AI ADVISOR` },
      ])
    } catch (error) {
      setChatError(error.message)
      setMessages((current) => [
        ...current,
        {
          id: `ai-error-${Date.now()}`,
          sender: 'ai',
          text: 'Maaf, AI Business Advisor sedang tidak bisa dihubungi. Coba lagi sebentar lagi.',
          time: 'AI ADVISOR',
        },
      ])
    } finally {
      setSending(false)
    }
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="ai-advisor-page">
      <div className="ai-advisor-heading">
        <nav>
          <span>Dashboard</span>
          <span className="material-symbols-outlined">chevron_right</span>
          <strong>AI Business Advisor</strong>
        </nav>
        <div>
          <div>
            <h2>
              AI Business Advisor
              <span>
                <span className="material-symbols-outlined">auto_awesome</span>
                Powered by AI
              </span>
            </h2>
            <p>Personalized strategic consultation based on your enterprise profile and market data.</p>
          </div>
          <button type="button" onClick={() => setMessages([])} disabled={sending}>
            <span className="material-symbols-outlined">refresh</span>
            Reset Session
          </button>
        </div>
      </div>

      <div className="ai-advisor-layout">
        <aside className="ai-advisor-context">
          <section className="ai-business-card">
            <header>
              <div>
                <span className="material-symbols-outlined">storefront</span>
              </div>
              <div>
                <h3>Profil Usaha Anda</h3>
                <p>{loading ? 'Memuat profil...' : 'Active Enterprise Profile'}</p>
              </div>
            </header>
            <div className="ai-business-content">
              <InfoBlock label="Nama Usaha" value={profile.name} strong />
              <div className="ai-business-two-cols">
                <InfoBlock label="Sektor" value={formatCategory(profile.category)} />
                <InfoBlock label="Karyawan" value={profile.employee_count === '-' ? '-' : `${profile.employee_count} Karyawan`} />
              </div>
              <InfoBlock label="Omzet / Bulan" value={profile.monthly_revenue} accent />
              <div className="ai-business-alert">
                <span className="material-symbols-outlined">report</span>
                <p>Pemasaran & Jangkauan Pasar</p>
              </div>
            </div>
          </section>

          <section className="ai-insight-card">
            <header>
              <h3>
                <span className="material-symbols-outlined">analytics</span>
                Business Insight
              </h3>
              <span>Updated: Today</span>
            </header>
            <InsightBar label="Business Health" value={75} tone="green" />
            <InsightBar label="Growth Potential" value={80} tone="gold" />
            <InsightBar label="Market Competitiveness" value={60} tone="blue" />
            <div className="ai-active-note">
              <span />
              <p><strong>AI Advisor Aktif:</strong> Berbasis analisis profil bisnis Anda secara real-time.</p>
            </div>
          </section>
        </aside>

        <section className="ai-chat-panel">
          <header className="ai-chat-header">
            <div>
              <span className="material-symbols-outlined">psychology</span>
            </div>
            <div>
              <h3>MicroFun Business Advisor</h3>
              <p><span /> Always online & analyzing</p>
            </div>
          </header>

          <div className="ai-chat-messages">
            {visibleMessages.map((message) => (
              <ChatBubble key={message.id} message={message} />
            ))}
            {sending && (
              <div className="ai-typing-indicator">
                <span />
                <span />
                <span />
                <p>AI sedang menyusun jawaban...</p>
              </div>
            )}
          </div>

          <div className="ai-chat-input-area">
            {chatError && (
              <div className="ai-chat-error">
                <span className="material-symbols-outlined">error</span>
                {chatError}
              </div>
            )}
            <div className="ai-quick-prompts">
              {quickPrompts.map((prompt) => (
                <button key={prompt.label} type="button" onClick={() => setInput(prompt.label)} disabled={sending}>
                  <span className="material-symbols-outlined">{prompt.icon}</span>
                  {prompt.label}
                </button>
              ))}
            </div>
            <div className="ai-chat-input-row">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                rows="1"
                placeholder="Tanyakan tentang bisnis Anda..."
                disabled={sending}
              />
              <button type="button" onClick={handleSend} aria-label="Kirim pertanyaan" disabled={sending}>
                <span className="material-symbols-outlined">{sending ? 'hourglass_empty' : 'send'}</span>
              </button>
            </div>
            <div className="ai-chat-footer-note">
              <span>Tekan Enter untuk kirim - Shift+Enter untuk baris baru</span>
              <span><span className="material-symbols-outlined">shield</span> Data encrypted & private</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

function InfoBlock({ label, value, strong = false, accent = false }) {
  return (
    <div className="ai-info-block">
      <p>{label}</p>
      <strong className={`${strong ? 'strong' : ''}${accent ? ' accent' : ''}`}>{value || '-'}</strong>
    </div>
  )
}

function InsightBar({ label, value, tone }) {
  return (
    <div className="ai-insight-bar">
      <div>
        <span>{label}</span>
        <strong>{value}%</strong>
      </div>
      <div className="ai-insight-track">
        <span className={tone} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

function ChatBubble({ message }) {
  const isUser = message.sender === 'user'

  return (
    <div className={`ai-chat-bubble ${isUser ? 'user' : 'ai'}`}>
      <div className="ai-chat-avatar">
        <span className="material-symbols-outlined">{isUser ? 'person' : 'auto_awesome'}</span>
      </div>
      <div>
        <div className="ai-chat-text">
          <p>{message.text}</p>
        </div>
        <span>{message.time}</span>
      </div>
    </div>
  )
}

function formatCategory(category) {
  if (!category) return '-'
  return String(category).replaceAll('_', ' ')
}

export default AiBusinessAdvisor

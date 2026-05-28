import { useCallback, useEffect, useMemo, useState } from 'react'
import './ForumPage.css'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'
const mapZoom = 1
const mapTileCount = 2 ** mapZoom

function ForumPage({ currentUser, userLocation }) {
  const [posts, setPosts] = useState([])
  const [myPosts, setMyPosts] = useState([])
  const [stats, setStats] = useState(defaultStats)
  const [network, setNetwork] = useState([])
  const [activeFeed, setActiveFeed] = useState('all')
  const [draft, setDraft] = useState('')
  const [commentDrafts, setCommentDrafts] = useState({})
  const [expandedComments, setExpandedComments] = useState({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState('')
  const [locationMessage, setLocationMessage] = useState('')

  const fetchForum = useCallback(async () => {
    const token = localStorage.getItem('microfun_auth_token')
    setError('')

    try {
      const response = await fetch(`${apiBaseUrl}/api/forum/posts`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.message || 'Gagal memuat forum.')

      setPosts(payload.posts || [])
      setMyPosts(payload.myPosts || [])
      setStats({ ...defaultStats, ...(payload.stats || {}) })
      setNetwork(payload.network || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchForum()
  }, [fetchForum])

  const mapParticipants = useMemo(() => {
    const participants = [...network]
    const currentParticipant = participants.find((item) => Number(item.id) === Number(currentUser?.id))

    if (!currentParticipant && (userLocation || currentUser?.address)) {
      participants.unshift({
        id: `current-${currentUser?.id || 'user'}`,
        name: currentUser?.name || 'Lokasi Anda',
        role: currentUser?.role || 'umkm_owner',
        location: userLocation || currentUser?.address,
      })
    }

    return participants
  }, [currentUser, network, userLocation])

  const visiblePosts = activeFeed === 'mine' ? myPosts : posts

  async function handlePostSubmit(event) {
    event.preventDefault()
    const body = draft.trim()
    if (!body) return

    const token = localStorage.getItem('microfun_auth_token')
    setSubmitting(true)
    setError('')

    try {
      const response = await fetch(`${apiBaseUrl}/api/forum/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ body }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.message || 'Gagal membagikan postingan.')

      setDraft('')
      setActiveFeed('mine')
      await fetchForum()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleLike(postId) {
    const token = localStorage.getItem('microfun_auth_token')
    const optimisticUpdate = (post) => (
      post.id === postId
        ? {
            ...post,
            likedByMe: !post.likedByMe,
            likeCount: Math.max(0, Number(post.likeCount || 0) + (post.likedByMe ? -1 : 1)),
          }
        : post
    )

    setPosts((current) => current.map(optimisticUpdate))
    setMyPosts((current) => current.map(optimisticUpdate))

    try {
      const response = await fetch(`${apiBaseUrl}/api/forum/posts/${postId}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.message || 'Gagal memperbarui like.')

      const serverUpdate = (post) => (
        post.id === postId
          ? { ...post, likedByMe: payload.liked, likeCount: payload.likeCount }
          : post
      )
      setPosts((current) => current.map(serverUpdate))
      setMyPosts((current) => current.map(serverUpdate))
    } catch (err) {
      setError(err.message)
      fetchForum()
    }
  }

  async function handleCommentSubmit(event, postId) {
    event.preventDefault()
    const body = String(commentDrafts[postId] || '').trim()
    if (!body) return

    const token = localStorage.getItem('microfun_auth_token')

    try {
      const response = await fetch(`${apiBaseUrl}/api/forum/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ body }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.message || 'Gagal mengirim komentar.')

      setCommentDrafts((current) => ({ ...current, [postId]: '' }))
      await fetchForum()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleUseCurrentLocation() {
    if (!navigator.geolocation) {
      setLocationMessage('Browser ini belum mendukung deteksi lokasi.')
      return
    }

    const token = localStorage.getItem('microfun_auth_token')
    setLocating(true)
    setLocationMessage('')

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const response = await fetch(`${apiBaseUrl}/api/forum/location`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              address: userLocation || currentUser?.address || '',
            }),
          })
          const payload = await response.json()
          if (!response.ok) throw new Error(payload.message || 'Gagal menyimpan lokasi.')

          setLocationMessage('Koordinat lokasi berhasil disimpan ke database.')
          await fetchForum()
        } catch (err) {
          setLocationMessage(err.message)
        } finally {
          setLocating(false)
        }
      },
      () => {
        setLocationMessage('Izin lokasi ditolak atau lokasi tidak tersedia.')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 12000 }
    )
  }

  return (
    <section className="ecosystem-forum-page">
      <EcosystemMap
        locating={locating}
        locationMessage={locationMessage}
        onUseCurrentLocation={handleUseCurrentLocation}
        participants={mapParticipants}
      />

      <div className="forum-stat-grid">
        <ForumStatCard icon="edit_square" label="Total Postingan Saya" value={stats.myPostCount} />
        <ForumStatCard icon="mark_chat_unread" label="Total Komentar ke Saya" value={stats.commentsToMe} />
        <ForumStatCard icon="favorite" label="Total Like Postingan Saya" value={stats.totalLikes} />
      </div>

      <div className="forum-layout">
        <section className="forum-feed-panel">
          <header className="forum-feed-header">
            <div>
              <h2>Forum Aktivitas</h2>
              <p>Collaboration and Discussion Forum enables users to share knowledge, discuss challenges, and build networks within the ecosystem.</p>
            </div>
            <button type="button" onClick={fetchForum} aria-label="Refresh forum">
              <span className="material-symbols-outlined">refresh</span>
            </button>
          </header>

          {error && <p className="forum-error">{error}</p>}

          <form className="forum-composer-card" onSubmit={handlePostSubmit}>
            <div className="forum-avatar">{getInitials(currentUser?.name)}</div>
            <div>
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Bagikan insight, tantangan, peluang kolaborasi, atau kabar terbaru..."
                maxLength={1000}
              />
              <footer>
                <span>{draft.length}/1000</span>
                <button type="submit" disabled={submitting || !draft.trim()}>
                  <span className="material-symbols-outlined">send</span>
                  {submitting ? 'Mengirim...' : 'Share'}
                </button>
              </footer>
            </div>
          </form>

          <div className="forum-feed-tabs" role="tablist" aria-label="Filter forum">
            <button type="button" className={activeFeed === 'all' ? 'active' : ''} onClick={() => setActiveFeed('all')}>
              Seluruh Forum
              <span>{formatNumber(stats.forumPostCount)}</span>
            </button>
            <button type="button" className={activeFeed === 'mine' ? 'active' : ''} onClick={() => setActiveFeed('mine')}>
              Postingan Saya
              <span>{formatNumber(stats.myPostCount)}</span>
            </button>
          </div>

          {loading ? (
            <div className="forum-state">
              <span className="material-symbols-outlined">hourglass_empty</span>
              <p>Memuat forum aktivitas...</p>
            </div>
          ) : visiblePosts.length > 0 ? (
            <div className="forum-post-list">
              {visiblePosts.map((post) => (
                <ForumPost
                  key={post.id}
                  commentDraft={commentDrafts[post.id] || ''}
                  commentsOpen={Boolean(expandedComments[post.id])}
                  onCommentChange={(value) => setCommentDrafts((current) => ({ ...current, [post.id]: value }))}
                  onCommentSubmit={(event) => handleCommentSubmit(event, post.id)}
                  onLike={() => handleLike(post.id)}
                  onToggleComments={() => setExpandedComments((current) => ({ ...current, [post.id]: !current[post.id] }))}
                  post={post}
                />
              ))}
            </div>
          ) : (
            <div className="forum-state empty">
              <span className="material-symbols-outlined">forum</span>
              <h3>{activeFeed === 'mine' ? 'Belum Ada Postingan Saya' : 'Belum Ada Diskusi'}</h3>
              <p>{activeFeed === 'mine' ? 'Postingan yang Anda share akan tersimpan di sini.' : 'Jadilah yang pertama membagikan insight ke ekosistem MicroFun.'}</p>
            </div>
          )}
        </section>
      </div>
    </section>
  )
}

function ForumStatCard({ icon, label, value }) {
  return (
    <article className="forum-stat-card">
      <span className="material-symbols-outlined">{icon}</span>
      <div>
        <strong>{formatNumber(value)}</strong>
        <p>{label}</p>
      </div>
    </article>
  )
}

function EcosystemMap({ locating, locationMessage, onUseCurrentLocation, participants }) {
  const markers = useMemo(() => buildMapMarkers(participants), [participants])
  const tileUrls = useMemo(() => buildTileUrls(), [])

  return (
    <section className="ecosystem-map-card" aria-label="Peta jaringan ekosistem MicroFun">
      <div className="map-tile-grid" aria-hidden="true">
        {tileUrls.map((tile) => (
          <img key={`${tile.x}-${tile.y}`} alt="" src={tile.url} style={tile.style} />
        ))}
      </div>
      <svg className="map-arcs" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <path d="M25 42 C38 28 58 27 73 46" />
        <path d="M73 56 C63 48 52 51 42 64" />
        <path d="M18 48 C34 62 56 70 80 62" />
      </svg>

      {markers.map((marker, index) => (
        <span
          key={`${marker.label}-${index}`}
          className={`map-marker ${marker.type} ${marker.precise ? 'precise' : 'approximate'}`}
          style={{
            left: `${marker.x}%`,
            top: `${marker.y}%`,
            animationDelay: `${index * 0.35}s`,
          }}
          title={`${marker.label} - ${formatRole(marker.role)}${marker.precise ? '' : ' (perkiraan)'}`}
        />
      ))}

      <div className="map-location-panel">
        <strong>Peta Ekosistem Dunia</strong>
        <p>Marker presisi memakai koordinat latitude dan longitude dari database user.</p>
        <button type="button" onClick={onUseCurrentLocation} disabled={locating}>
          <span className="material-symbols-outlined">my_location</span>
          {locating ? 'Mendeteksi...' : 'Simpan Lokasi Saya'}
        </button>
        {locationMessage && <small>{locationMessage}</small>}
      </div>

      <div className="map-legend">
        <span><i className="umkm" /> MSMEs</span>
        <span><i className="mentor" /> Mentors</span>
        <span><i className="funder" /> Investors</span>
      </div>
      <div className="map-controls" aria-hidden="true">
        <button type="button">+</button>
        <button type="button">-</button>
      </div>
    </section>
  )
}

function ForumPost({ commentDraft, commentsOpen, onCommentChange, onCommentSubmit, onLike, onToggleComments, post }) {
  return (
    <article className="forum-post-item">
      <div className="forum-avatar">{getInitials(post.author?.name)}</div>
      <div className="forum-post-content">
        <header>
          <div>
            <h3>{post.author?.name || 'MicroFun User'}</h3>
            <span>{formatRole(post.author?.role)} - {formatDate(post.createdAt)}</span>
          </div>
        </header>
        <p>{post.body}</p>
        <div className="forum-post-actions">
          <button type="button" className={post.likedByMe ? 'liked' : ''} onClick={onLike}>
            <span className="material-symbols-outlined">favorite</span>
            {formatNumber(post.likeCount)} Like
          </button>
          <button type="button" className="forum-comment-toggle" onClick={onToggleComments}>
            <span className="material-symbols-outlined">chat_bubble</span>
            {commentsOpen ? 'Tutup Komentar' : 'Lihat Komentar'}
            {Number(post.commentCount || 0) > 0 && <small>{formatNumber(post.commentCount)}</small>}
          </button>
        </div>

        {commentsOpen && (
          <>
            {post.comments?.length > 0 ? (
              <div className="forum-comment-list">
                {post.comments.map((comment) => (
                  <div key={comment.id} className="forum-comment">
                    <strong>{comment.authorName}</strong>
                    <span>{formatRole(comment.authorRole)} - {formatDate(comment.createdAt)}</span>
                    <p>{comment.body}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="forum-comment-empty">Belum ada komentar.</p>
            )}

            <form className="forum-comment-form" onSubmit={onCommentSubmit}>
              <input
                value={commentDraft}
                onChange={(event) => onCommentChange(event.target.value)}
                placeholder="Tulis komentar..."
                maxLength={500}
              />
              <button type="submit" disabled={!commentDraft.trim()}>
                <span className="material-symbols-outlined">send</span>
              </button>
            </form>
          </>
        )}
      </div>
    </article>
  )
}

function buildTileUrls() {
  const tiles = []
  for (let x = 0; x < mapTileCount; x += 1) {
    for (let y = 0; y < mapTileCount; y += 1) {
      tiles.push({
        x,
        y,
        url: `https://tile.openstreetmap.org/${mapZoom}/${x}/${y}.png`,
        style: {
          left: `${(x / mapTileCount) * 100}%`,
          top: `${(y / mapTileCount) * 100}%`,
          width: `${100 / mapTileCount}%`,
          height: `${100 / mapTileCount}%`,
        },
      })
    }
  }
  return tiles
}

function buildMapMarkers(participants) {
  return participants
    .filter((participant) => participant.latitude || participant.longitude || participant.location || participant.name)
    .slice(0, 80)
    .map((participant, index) => {
      const precise = Number.isFinite(Number(participant.latitude)) && Number.isFinite(Number(participant.longitude))
      const coordinates = precise
        ? { latitude: Number(participant.latitude), longitude: Number(participant.longitude) }
        : geocodeKnownLocation(participant.location, index)
      const point = coordinatesToMapPoint(coordinates.latitude, coordinates.longitude)

      return {
        ...point,
        precise,
        role: participant.role,
        label: participant.location || participant.name,
        type: getMarkerType(participant.role),
      }
    })
}

function coordinatesToMapPoint(latitude, longitude) {
  const lat = Math.min(85.05112878, Math.max(-85.05112878, Number(latitude || 0)))
  const lon = Math.min(180, Math.max(-180, Number(longitude || 0)))
  const sinLat = Math.sin((lat * Math.PI) / 180)
  const x = ((lon + 180) / 360) * 100
  const y = (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * 100
  return { x, y }
}

function geocodeKnownLocation(location = '', index = 0) {
  const text = String(location).toLowerCase()
  const locationMap = [
    { keys: ['jakarta', 'tangerang', 'bekasi', 'depok'], latitude: -6.2088, longitude: 106.8456 },
    { keys: ['bandung', 'bogor', 'jawa barat'], latitude: -6.9175, longitude: 107.6191 },
    { keys: ['yogyakarta', 'jogja', 'sleman'], latitude: -7.7956, longitude: 110.3695 },
    { keys: ['solo', 'surakarta', 'semarang', 'jawa tengah'], latitude: -7.5755, longitude: 110.8243 },
    { keys: ['surabaya', 'malang', 'jawa timur'], latitude: -7.2575, longitude: 112.7521 },
    { keys: ['bali', 'denpasar'], latitude: -8.6705, longitude: 115.2126 },
    { keys: ['medan', 'sumatra', 'aceh'], latitude: 3.5952, longitude: 98.6722 },
    { keys: ['padang', 'palembang'], latitude: -0.9471, longitude: 100.4172 },
    { keys: ['kalimantan', 'pontianak', 'balikpapan'], latitude: -0.5022, longitude: 117.1536 },
    { keys: ['sulawesi', 'makassar', 'manado'], latitude: -5.1477, longitude: 119.4327 },
    { keys: ['papua', 'jayapura'], latitude: -2.5916, longitude: 140.669 },
    { keys: ['singapore'], latitude: 1.3521, longitude: 103.8198 },
    { keys: ['malaysia', 'kuala lumpur'], latitude: 3.139, longitude: 101.6869 },
    { keys: ['usa', 'america', 'united states', 'new york'], latitude: 40.7128, longitude: -74.006 },
    { keys: ['london', 'united kingdom'], latitude: 51.5072, longitude: -0.1276 },
    { keys: ['germany', 'berlin'], latitude: 52.52, longitude: 13.405 },
    { keys: ['france', 'paris'], latitude: 48.8566, longitude: 2.3522 },
    { keys: ['australia', 'sydney'], latitude: -33.8688, longitude: 151.2093 },
  ]

  const match = locationMap.find((item) => item.keys.some((key) => text.includes(key))) || {
    latitude: -6.2088,
    longitude: 106.8456,
  }

  return {
    latitude: match.latitude + ((index % 5) - 2) * 0.35,
    longitude: match.longitude + ((index % 4) - 1.5) * 0.35,
  }
}

function getMarkerType(role) {
  if (role === 'mentor') return 'mentor'
  if (role === 'funder') return 'funder'
  return 'umkm'
}

function formatRole(role) {
  const labels = {
    umkm_owner: 'UMKM',
    funder: 'Funder',
    mentor: 'Mentor',
  }
  return labels[role] || 'Member'
}

function formatDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function formatNumber(value) {
  return new Intl.NumberFormat('id-ID').format(Number(value || 0))
}

function getInitials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map((word) => word[0]).join('').toUpperCase() || 'MF'
}

const defaultStats = {
  myPostCount: 0,
  commentsToMe: 0,
  totalLikes: 0,
  forumPostCount: 0,
  contributorCount: 0,
}

export default ForumPage

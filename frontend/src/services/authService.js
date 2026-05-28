const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'

const TOKEN_STORAGE_KEY = 'microfun_auth_token'
const USER_STORAGE_KEY = 'microfun_auth_user'

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(payload.message || 'Request failed')
  }

  return payload
}

export async function login({ email, password, rememberMe }) {
  const payload = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, rememberMe }),
  })

  localStorage.setItem(TOKEN_STORAGE_KEY, payload.token)
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(payload.user))

  return payload
}

export async function register({ name, email, password, confirmPassword, role, rememberMe = true, umkmProfile = null }) {
  const payload = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password, confirmPassword, role, rememberMe, umkmProfile }),
  })

  localStorage.setItem(TOKEN_STORAGE_KEY, payload.token)
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(payload.user))

  return payload
}

export async function getCurrentUser() {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY)

  if (!token) {
    throw new Error('No active session')
  }

  const payload = await request('/api/auth/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(payload.user))
  return payload.user
}

export function getStoredUser() {
  const raw = localStorage.getItem(USER_STORAGE_KEY)
  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function isAuthenticated() {
  return Boolean(localStorage.getItem(TOKEN_STORAGE_KEY))
}

export function logout() {
  localStorage.removeItem(TOKEN_STORAGE_KEY)
  localStorage.removeItem(USER_STORAGE_KEY)
}

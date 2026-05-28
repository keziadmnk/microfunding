import { getStoredUser } from './authService'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'
const TOKEN_STORAGE_KEY = 'microfun_auth_token'

async function mentoringRequest(path, options = {}) {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY)
  const isFormData = options.body instanceof FormData
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.message || 'Gagal memproses request mentoring.')
  return payload
}

function body(data) {
  return JSON.stringify(data || {})
}

export function getCurrentUserId() {
  // Temporary fallback only for development if auth storage is not ready yet.
  // Replace this with auth context once the project has a central auth provider.
  return getStoredUser()?.id || getStoredUser()?.sub || null
}

export async function getMentors() {
  const payload = await mentoringRequest('/api/mentors')
  return payload.data || []
}

export async function getMentorDetail(mentorId) {
  const payload = await mentoringRequest(`/api/mentors/${mentorId}`)
  return payload.data
}

export async function upsertMentorProfile(data) {
  const payload = await mentoringRequest('/api/mentoring/profiles/me', {
    method: 'PUT',
    body: body(data),
  })
  return payload.data
}

export async function createMentoringRequest(data) {
  const payload = await mentoringRequest('/api/mentoring/requests', {
    method: 'POST',
    body: body(data),
  })
  return payload
}

export async function getUmkmRequests(umkmUserId) {
  const payload = await mentoringRequest(`/api/mentoring/requests/umkm/${umkmUserId}`)
  return payload.data || []
}

export async function getMentorRequests(mentorId) {
  const payload = await mentoringRequest(`/api/mentoring/requests/mentor/${mentorId}`)
  return payload.data || []
}

export async function cancelMentoringRequest(requestId) {
  return mentoringRequest(`/api/mentoring/requests/${requestId}/cancel`, { method: 'PATCH' })
}

export async function acceptMentoringRequest(requestId, data) {
  return mentoringRequest(`/api/mentoring/requests/${requestId}/accept`, {
    method: 'PATCH',
    body: body(data),
  })
}

export async function rejectMentoringRequest(requestId, data) {
  return mentoringRequest(`/api/mentoring/requests/${requestId}/reject`, {
    method: 'PATCH',
    body: body(data),
  })
}

export async function getUmkmWorkspaces(umkmUserId) {
  const payload = await mentoringRequest(`/api/mentoring/workspaces/umkm/${umkmUserId}`)
  return payload.data || []
}

export async function getMentorWorkspaces(mentorId) {
  const payload = await mentoringRequest(`/api/mentoring/workspaces/mentor/${mentorId}`)
  return payload.data || []
}

export async function getWorkspace(workspaceId) {
  const payload = await mentoringRequest(`/api/mentoring/workspaces/${workspaceId}`)
  return payload.data
}

export async function getWorkspaceSessions(workspaceId) {
  const payload = await mentoringRequest(`/api/mentoring/workspaces/${workspaceId}/sessions`)
  return payload.data || []
}

export async function createWorkspaceSession(workspaceId, data) {
  return mentoringRequest(`/api/mentoring/workspaces/${workspaceId}/sessions`, {
    method: 'POST',
    body: body(data),
  })
}

export async function updateSession(sessionId, data) {
  return mentoringRequest(`/api/mentoring/sessions/${sessionId}`, {
    method: 'PATCH',
    body: body(data),
  })
}

export async function completeSession(sessionId) {
  return mentoringRequest(`/api/mentoring/sessions/${sessionId}/complete`, { method: 'PATCH' })
}

export async function cancelSession(sessionId, reason = '') {
  return mentoringRequest(`/api/mentoring/sessions/${sessionId}/cancel`, {
    method: 'PATCH',
    body: body({ reason }),
  })
}

export async function getWorkspaceTasks(workspaceId) {
  const payload = await mentoringRequest(`/api/mentoring/workspaces/${workspaceId}/tasks`)
  return payload.data || []
}

export async function getUmkmTasks(umkmUserId) {
  const payload = await mentoringRequest(`/api/mentoring/tasks/umkm/${umkmUserId}`)
  return payload.data || []
}

export async function createWorkspaceTask(workspaceId, data) {
  return mentoringRequest(`/api/mentoring/workspaces/${workspaceId}/tasks`, {
    method: 'POST',
    body: body(data),
  })
}

export async function updateTask(taskId, data) {
  return mentoringRequest(`/api/mentoring/tasks/${taskId}`, {
    method: 'PATCH',
    body: body(data),
  })
}

export async function updateTaskStatus(taskId, status) {
  return mentoringRequest(`/api/mentoring/tasks/${taskId}/status`, {
    method: 'PATCH',
    body: body({ status }),
  })
}

export async function submitTask(taskId, { file, note }) {
  const formData = new FormData()
  if (file) formData.append('file', file)
  if (note) formData.append('note', note)
  const payload = await mentoringRequest(`/api/mentoring/tasks/${taskId}/submit`, {
    method: 'POST',
    body: formData,
  })
  return payload.data
}

export async function cancelTaskSubmission(taskId) {
  return mentoringRequest(`/api/mentoring/tasks/${taskId}/submission/cancel`, { method: 'PATCH' })
}

export async function deleteTask(taskId) {
  return mentoringRequest(`/api/mentoring/tasks/${taskId}`, { method: 'DELETE' })
}

export async function getWorkspaceProgress(workspaceId) {
  const payload = await mentoringRequest(`/api/mentoring/workspaces/${workspaceId}/progress`)
  return payload.data || []
}

export async function createBusinessProgress(workspaceId, data) {
  return mentoringRequest(`/api/mentoring/workspaces/${workspaceId}/progress`, {
    method: 'POST',
    body: body(data),
  })
}

export async function updateProgressRecommendation(progressId, mentorRecommendation) {
  return mentoringRequest(`/api/mentoring/progress/${progressId}/recommendation`, {
    method: 'PATCH',
    body: body({ mentorRecommendation }),
  })
}

export async function getWorkspaceNotes(workspaceId) {
  const payload = await mentoringRequest(`/api/mentoring/workspaces/${workspaceId}/notes`)
  return payload.data || []
}

export async function createMentorNote(workspaceId, data) {
  return mentoringRequest(`/api/mentoring/workspaces/${workspaceId}/notes`, {
    method: 'POST',
    body: body(data),
  })
}

export async function updateMentorNote(noteId, data) {
  return mentoringRequest(`/api/mentoring/notes/${noteId}`, {
    method: 'PATCH',
    body: body(data),
  })
}

export async function deleteMentorNote(noteId) {
  return mentoringRequest(`/api/mentoring/notes/${noteId}`, { method: 'DELETE' })
}

export async function completeWorkspace(workspaceId, data) {
  return mentoringRequest(`/api/mentoring/workspaces/${workspaceId}/complete`, {
    method: 'PATCH',
    body: body(data),
  })
}

export async function getWorkspaceMessages(workspaceId) {
  const payload = await mentoringRequest(`/api/mentoring/workspaces/${workspaceId}/messages`)
  return payload.data || []
}

export async function sendWorkspaceMessage(workspaceId, message) {
  const payload = await mentoringRequest(`/api/mentoring/workspaces/${workspaceId}/messages`, {
    method: 'POST',
    body: body({ message }),
  })
  return payload.data
}

export async function getWorkspaceFiles(workspaceId) {
  const payload = await mentoringRequest(`/api/mentoring/workspaces/${workspaceId}/files`)
  return payload.data || []
}

export async function uploadWorkspaceFile(workspaceId, { file, title, description }) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('title', title)
  if (description) formData.append('description', description)
  const payload = await mentoringRequest(`/api/mentoring/workspaces/${workspaceId}/files`, {
    method: 'POST',
    body: formData,
  })
  return payload.data
}

import { io } from 'socket.io-client'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'
const TOKEN_STORAGE_KEY = 'microfun_auth_token'

let socket

export function getMentoringSocket() {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY)
  if (!token) return null

  if (!socket) {
    socket = io(API_BASE_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    })
  }

  return socket
}

export function resetMentoringSocket() {
  if (socket) socket.disconnect()
  socket = null
}

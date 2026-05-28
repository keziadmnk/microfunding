import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import NotFoundPage from './pages/NotFoundPage'
import UmkmDashboardPage from './pages/UmkmDashboardPage'
import UmkmFunderRequestPage from './pages/UmkmFunderRequestPage'
import FunderDashboardPage from './pages/FunderDashboardPage'
import FundNowPage from './pages/FundNowPage'
import FunderInsightPage from './pages/FunderInsightPage'
import MentorDashboardPage from './pages/MentorDashboardPage'
import MentorRequestDetailPage from './pages/MentorRequestDetailPage'
import RoleDashboardPage from './pages/RoleDashboardPage'
import RoleGuard from './components/RoleGuard'
import { getStoredUser, isAuthenticated } from './services/authService'

/** Smart /dashboard redirect — reads stored role and sends to correct path */
function DashboardRedirect() {
  if (!isAuthenticated()) return <Navigate to="/login" replace />
  const user = getStoredUser()
  const rolePathMap = {
    umkm_owner: '/dashboard/umkm',
    funder: '/dashboard/funder',
    mentor: '/dashboard/mentor',
    admin: '/dashboard/admin',
  }
  const target = rolePathMap[user?.role] || '/login'
  return <Navigate to={target} replace />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Smart redirect — picks the correct dashboard based on role */}
        <Route path="/dashboard" element={<DashboardRedirect />} />
        <Route path="/home" element={<Navigate to="/" replace />} />

        {/* Role-specific dashboards, each protected by RoleGuard */}
        <Route
          path="/dashboard/umkm"
          element={
            <RoleGuard allowedRoles={['umkm_owner']}>
              <UmkmDashboardPage />
            </RoleGuard>
          }
        />
        <Route path="/dashboard/umkm/mentoring" element={<Navigate to="/dashboard/umkm/mentoring/find" replace />} />
        <Route path="/dashboard/umkm/mentoring-sessions" element={<Navigate to="/dashboard/umkm/mentoring/find" replace />} />
        <Route
          path="/dashboard/umkm/mentoring/find"
          element={
            <RoleGuard allowedRoles={['umkm_owner']}>
              <UmkmDashboardPage />
            </RoleGuard>
          }
        />
        <Route
          path="/dashboard/umkm/mentoring/my"
          element={
            <RoleGuard allowedRoles={['umkm_owner']}>
              <UmkmDashboardPage />
            </RoleGuard>
          }
        />
        <Route
          path="/dashboard/umkm/mentoring/tasks"
          element={
            <RoleGuard allowedRoles={['umkm_owner']}>
              <UmkmDashboardPage />
            </RoleGuard>
          }
        />
        <Route
          path="/dashboard/umkm/mentoring/workspace/:mentoringId"
          element={
            <RoleGuard allowedRoles={['umkm_owner']}>
              <UmkmDashboardPage />
            </RoleGuard>
          }
        />
        <Route
          path="/dashboard/umkm/ai-matching/funder-request"
          element={
            <RoleGuard allowedRoles={['umkm_owner']}>
              <UmkmFunderRequestPage />
            </RoleGuard>
          }
        />
        <Route
          path="/dashboard/funder"
          element={
            <RoleGuard allowedRoles={['funder']}>
              <FunderDashboardPage />
            </RoleGuard>
          }
        />
        <Route
          path="/dashboard/funder/fund/:id"
          element={
            <RoleGuard allowedRoles={['funder']}>
              <FundNowPage />
            </RoleGuard>
          }
        />
        <Route
          path="/dashboard/funder/insight/:id"
          element={
            <RoleGuard allowedRoles={['funder']}>
              <FunderInsightPage />
            </RoleGuard>
          }
        />
        <Route
          path="/dashboard/mentor"
          element={
            <RoleGuard allowedRoles={['mentor']}>
              <MentorDashboardPage />
            </RoleGuard>
          }
        />
        <Route
          path="/dashboard/mentor/mentees"
          element={
            <RoleGuard allowedRoles={['mentor']}>
              <MentorDashboardPage />
            </RoleGuard>
          }
        />
        <Route
          path="/dashboard/mentor/messages"
          element={
            <RoleGuard allowedRoles={['mentor']}>
              <MentorDashboardPage />
            </RoleGuard>
          }
        />
        <Route
          path="/dashboard/mentor/mentoring/tasks"
          element={
            <RoleGuard allowedRoles={['mentor']}>
              <MentorDashboardPage />
            </RoleGuard>
          }
        />
        <Route
          path="/dashboard/mentor/mentoring/workspace/:mentoringId"
          element={
            <RoleGuard allowedRoles={['mentor']}>
              <MentorDashboardPage />
            </RoleGuard>
          }
        />
        <Route
          path="/dashboard/mentor/requests/:id"
          element={
            <RoleGuard allowedRoles={['mentor']}>
              <MentorRequestDetailPage />
            </RoleGuard>
          }
        />
        <Route
          path="/dashboard/admin"
          element={
            <RoleGuard allowedRoles={['admin']}>
              <RoleDashboardPage role="admin" />
            </RoleGuard>
          }
        />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

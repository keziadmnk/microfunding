import { Navigate } from 'react-router-dom'
import { getStoredUser, isAuthenticated } from '../services/authService'

/**
 * RoleGuard — protects a route so only users with the allowed role(s) can access it.
 * If not authenticated → redirect to /login
 * If authenticated but wrong role → redirect to the role's own dashboard
 */
function RoleGuard({ children, allowedRoles }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />
  }

  const user = getStoredUser()
  const role = user?.role

  if (!role || !allowedRoles.includes(role)) {
    // Redirect to the correct dashboard for their role
    const roleDashboardMap = {
      umkm_owner: '/dashboard/umkm',
      funder: '/dashboard/funder',
      mentor: '/dashboard/mentor',
      admin: '/dashboard/admin',
    }
    const target = roleDashboardMap[role] || '/login'
    return <Navigate to={target} replace />
  }

  return children
}

export default RoleGuard

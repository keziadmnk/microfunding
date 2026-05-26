import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { login } from '../services/authService'
import './LoginPage.css'

function LoginPage() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    email: '',
    password: '',
    rememberMe: false,
  })

  const isDisabled = useMemo(() => {
    return !form.email.trim() || !form.password || isLoading
  }, [form.email, form.password, isLoading])

  function handleChange(event) {
    const { name, value, type, checked } = event.target
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const result = await login({
        email: form.email.trim(),
        password: form.password,
        rememberMe: form.rememberMe,
      })

      // Redirect to the correct dashboard based on role
      const roleDashboardMap = {
        umkm_owner: '/dashboard/umkm',
        funder: '/dashboard/funder',
        mentor: '/dashboard/mentor',
        admin: '/dashboard/admin',
      }
      const role = result.user?.role
      const target = roleDashboardMap[role] || '/dashboard'
      navigate(target, { replace: true })
    } catch (submitError) {
      setError(submitError.message || 'Login gagal, coba lagi.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="login-layout">
      <section className="login-hero">
        <img
          alt="Indonesian MSME Entrepreneur"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuB-WcQQAqo2Oc-zm-dcEJvFYR1wLKVwwF6u-G-EX5dVhqb9Rx7XB3dp8NIpsZ_BRNaVusxDThkQhinxThtYGdBxZUXSVmucIeTEFNFEgWIgWwKwyQjDL5ja_IHPbzBiI4s3MPfQ_Mr9BmRQoK9Z6C1EWQil6zyPK7kn7xT2Imfe6HGkVL0uq_wCugvuOZW6u50ONIaadd1LPTkUUtr6-zV28v8gKNdfiw--_vpNmzfKlgKSjF3b81UdN4AEdKGLW0i2hVgQ2JPsGis"
        />
        <div className="login-hero-overlay" />
        <div className="login-hero-content">
          <p className="hero-label">Empowering Growth</p>
          <h1>Empowering the backbone of Indonesia&apos;s economy through global connections.</h1>
          <p>
            Join MicroFun to unlock AI-driven opportunities for your MSME and
            scale beyond borders.
          </p>
          <Link className="hero-brand" to="/">
            <span className="material-symbols-outlined" aria-hidden="true">
              rocket_launch
            </span>
            <span>MicroFun</span>
          </Link>
        </div>
      </section>

      <section className="login-form-wrap">
        <div className="login-card">
          <header>
            <h2>Welcome Back</h2>
            <p>Access your business dashboard and AI insights.</p>
          </header>

          <form onSubmit={handleSubmit} className="login-form" noValidate>
            <div className="field">
              <label htmlFor="email">Business Email</label>
              <div className="input-wrap">
                <span className="material-symbols-outlined" aria-hidden="true">
                  mail
                </span>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="name@company.com"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="field">
              <div className="field-head">
                <label htmlFor="password">Password</label>
                <button type="button" className="link-btn" disabled>
                  Forgot password?
                </button>
              </div>
              <div className="input-wrap">
                <span className="material-symbols-outlined" aria-hidden="true">
                  lock
                </span>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <span className="material-symbols-outlined" aria-hidden="true">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            <label className="remember">
              <input
                id="rememberMe"
                name="rememberMe"
                type="checkbox"
                checked={form.rememberMe}
                onChange={handleChange}
              />
              <span>Stay signed in for 30 days</span>
            </label>

            {error && <p className="error-text">{error}</p>}

            <button className="submit-btn" type="submit" disabled={isDisabled}>
              <span>{isLoading ? 'Signing in...' : 'Login to Dashboard'}</span>
              <span className="material-symbols-outlined" aria-hidden="true">
                arrow_forward
              </span>
            </button>
          </form>

          <div className="seed-help">
            <strong>Seed account:</strong>
            <p>Email: admin@microfun.com</p>
            <p>Password: Password123!</p>
          </div>

          <p className="register-copy">
            New to MicroFun? <Link to="/register">Create an account</Link>
          </p>
        </div>
      </section>
    </main>
  )
}

export default LoginPage

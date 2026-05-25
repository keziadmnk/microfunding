import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { register } from '../services/authService'
import './RegisterPage.css'

const roleCards = [
  {
    value: 'msme',
    title: 'I am an MSME',
    description: 'Growing my business and seeking support.',
    icon: 'storefront',
  },
  {
    value: 'funder',
    title: 'I am a Funder',
    description: 'Investing in high-potential enterprises.',
    icon: 'account_balance',
  },
  {
    value: 'mentor',
    title: 'I am a Mentor',
    description: 'Sharing expertise and guiding growth.',
    icon: 'school',
  },
]

function RegisterPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [selectedRole, setSelectedRole] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false,
  })

  const canContinue = useMemo(() => Boolean(selectedRole), [selectedRole])
  const canSubmit = useMemo(() => {
    return (
      form.name.trim() &&
      form.email.trim() &&
      form.password &&
      form.confirmPassword &&
      form.agreeTerms &&
      !isLoading
    )
  }, [form, isLoading])

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

    if (!selectedRole) {
      setError('Please select a role first.')
      return
    }

    if (!form.agreeTerms) {
      setError('You must agree to the terms and privacy policy.')
      return
    }

    setIsLoading(true)

    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        confirmPassword: form.confirmPassword,
        role: selectedRole,
        rememberMe: true,
      })

      navigate('/dashboard', { replace: true })
    } catch (submitError) {
      setError(submitError.message || 'Registration failed, please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="register-layout">
      <section className="register-visual">
        <img
          alt="Professionals collaborating in a premium MSME growth environment"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuCrWFZazrwlrg2bM37yBC_U_tJb9PumZEgD4IkD7eHCPCfj7ZRYVM2dsMfR1aGo3Fhqcncug74kYAXVn-rG7qdqjhEb0RG4RKIPxQ7BTH8YjD3b01GGu_TGBSw7QnDxkwz9S3Xf4gRh-9482prF7YUoO3Q4GxJdnQFxcwxF_X7GskYPr035TE6AGB11ZGnBTINZUFUyOxOTytSgVl9vFeOOCuzl9oLISFk7Nfqfx0Z1V_DDQUrWt3LJqLIp4Aacm3yaWqtZ7BZGmvc"
        />
        <div className="register-visual-overlay" />
        <div className="register-visual-content">
          <p className="hero-label">Join the ecosystem</p>
          <h1>Access exclusive funding, world-class mentorship, and a network built for scale.</h1>
          <p>
            Join MicroFun and become part of a premium MSME ecosystem designed
            for growth, trust, and long-term impact.
          </p>
        </div>
      </section>

      <section className="register-form-wrap">
        <div className="register-card">
          <div className="register-brand">
            <Link to="/" className="brand-link">
              <span className="material-symbols-outlined" aria-hidden="true">
                rocket_launch
              </span>
              <span>MicroFun</span>
            </Link>
          </div>

          <div className="register-header">
            <span className="eyebrow">Registration</span>
            <h2>{step === 1 ? 'Select your role' : 'Create your account'}</h2>
            <div className="step-bars" aria-hidden="true">
              <span className={step >= 1 ? 'active' : ''} />
              <span className={step >= 2 ? 'active' : ''} />
            </div>
          </div>

          {step === 1 ? (
            <div className="register-step">
              <div className="role-grid">
                {roleCards.map((roleCard) => (
                  <button
                    key={roleCard.value}
                    type="button"
                    className={`role-card ${selectedRole === roleCard.value ? 'active-role-card' : ''}`}
                    onClick={() => setSelectedRole(roleCard.value)}
                  >
                    <span className="role-icon">
                      <span className="material-symbols-outlined" aria-hidden="true">
                        {roleCard.icon}
                      </span>
                    </span>
                    <span className="role-copy">
                      <strong>{roleCard.title}</strong>
                      <span>{roleCard.description}</span>
                    </span>
                    <span className="material-symbols-outlined check-icon" aria-hidden="true">
                      check_circle
                    </span>
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="submit-btn next-btn"
                disabled={!canContinue}
                onClick={() => setStep(2)}
              >
                <span>Continue to Details</span>
                <span className="material-symbols-outlined" aria-hidden="true">
                  arrow_forward
                </span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="register-form" noValidate>
              <div className="field">
                <label htmlFor="name">Full Name</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="John Doe"
                  autoComplete="name"
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="email">Work Email</label>
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

              <div className="field">
                <label htmlFor="password">Password</label>
                <div className="input-shell">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    className="toggle-visibility"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <span className="material-symbols-outlined" aria-hidden="true">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              <div className="field">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <div className="input-shell">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={form.confirmPassword}
                    onChange={handleChange}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    className="toggle-visibility"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    <span className="material-symbols-outlined" aria-hidden="true">
                      {showConfirmPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              <label className="terms-row">
                <input
                  id="agreeTerms"
                  name="agreeTerms"
                  type="checkbox"
                  checked={form.agreeTerms}
                  onChange={handleChange}
                />
                <span>
                  I agree to the <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
                </span>
              </label>

              {error && <p className="error-text">{error}</p>}

              <button className="submit-btn" type="submit" disabled={!canSubmit}>
                <span>{isLoading ? 'Creating account...' : 'Create Account'}</span>
                <span className="material-symbols-outlined" aria-hidden="true">
                  arrow_forward
                </span>
              </button>

              <button
                type="button"
                className="back-btn"
                onClick={() => setStep(1)}
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  arrow_back
                </span>
                Back to role selection
              </button>
            </form>
          )}

          <p className="switch-copy">
            Already have an account? <Link to="/login">Login</Link>
          </p>
        </div>
      </section>
    </main>
  )
}

export default RegisterPage

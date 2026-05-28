import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { register } from '../services/authService'
import { WORLD_CITY_OPTIONS, findCityByLabel } from '../components/dashboard/locationOptions'
import './RegisterPage.css'

const categoryOptions = [
  { value: 'kuliner', label: 'Kuliner' },
  { value: 'fashion_tekstil', label: 'Fashion & Tekstil' },
  { value: 'pertanian_perkebunan', label: 'Pertanian & Perkebunan' },
  { value: 'jasa', label: 'Jasa' },
  { value: 'teknologi', label: 'Teknologi' },
  { value: 'kreatif_seni', label: 'Kreatif & Seni' },
  { value: 'lainnya', label: 'Lainnya' },
]

const revenueOptions = [
  { value: '< 5 juta', label: 'Kurang dari Rp 5 Juta' },
  { value: '5 - 15 juta', label: 'Rp 5 Juta - Rp 15 Juta' },
  { value: '15 - 50 juta', label: 'Rp 15 Juta - Rp 50 Juta' },
  { value: '50 - 100 juta', label: 'Rp 50 Juta - Rp 100 Juta' },
  { value: '> 100 juta', label: 'Lebih dari Rp 100 Juta' },
]

const legalDocumentOptions = [
  { id: 'nib', label: 'NIB (Nomor Induk Berusaha)' },
  { id: 'npwp', label: 'NPWP Usaha' },
  { id: 'pirt', label: 'PIRT' },
  { id: 'halal', label: 'Sertifikasi Halal' },
  { id: 'bpom', label: 'BPOM' },
  { id: 'sni', label: 'SNI' },
  { id: 'siup', label: 'SIUP' },
  { id: 'tdp', label: 'TDP' },
  { id: 'hki', label: 'Merek Terdaftar (HKI)' },
]

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
    businessName: '',
    category: '',
    otherCategory: '',
    location: '',
    address: '',
    latitude: '',
    longitude: '',
    yearEstablished: '',
    employeeCount: '',
    monthlyRevenue: '',
    description: '',
    npwp: '',
    legalDocuments: [],
  })

  const canContinue = useMemo(() => Boolean(selectedRole), [selectedRole])
  const canSubmit = useMemo(() => {
    return (
      form.name.trim() &&
      form.email.trim() &&
      form.password &&
      form.confirmPassword &&
      form.agreeTerms &&
      (selectedRole !== 'msme' || (
        form.businessName.trim() &&
        form.category &&
        (form.category !== 'lainnya' || form.otherCategory.trim()) &&
        form.location.trim() &&
        form.description.trim()
      )) &&
      !isLoading
    )
  }, [form, isLoading, selectedRole])

  function handleChange(event) {
    const { name, value, type, checked } = event.target
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  function handleLocationChange(event) {
    const city = findCityByLabel(event.target.value)
    setForm((prev) => ({
      ...prev,
      location: city?.label || '',
      latitude: city?.latitude || '',
      longitude: city?.longitude || '',
    }))
  }

  function toggleLegalDocument(id) {
    setForm((prev) => ({
      ...prev,
      legalDocuments: prev.legalDocuments.includes(id)
        ? prev.legalDocuments.filter((docId) => docId !== id)
        : [...prev.legalDocuments, id],
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

    if (selectedRole === 'msme') {
      if (!form.businessName.trim() || !form.category || !form.location.trim() || !form.description.trim()) {
        setError('Nama UMKM, kategori, lokasi, dan deskripsi UMKM wajib diisi.')
        return
      }

      if (form.category === 'lainnya' && !form.otherCategory.trim()) {
        setError('Tuliskan kategori lainnya terlebih dahulu.')
        return
      }

      if (!findCityByLabel(form.location)) {
        setError('Lokasi UMKM wajib dipilih dari daftar kota.')
        return
      }

      if (form.description.length > 1000) {
        setError('Deskripsi UMKM maksimal 1000 karakter.')
        return
      }
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
        umkmProfile: selectedRole === 'msme' ? {
          businessName: form.businessName.trim(),
          category: form.category,
          otherCategory: form.otherCategory.trim(),
          location: form.location,
          address: form.address.trim(),
          latitude: form.latitude,
          longitude: form.longitude,
          yearEstablished: form.yearEstablished,
          employeeCount: form.employeeCount,
          monthlyRevenue: form.monthlyRevenue,
          description: form.description.trim(),
          npwp: form.npwp.trim(),
          legalDocuments: form.legalDocuments,
        } : null,
      })

      navigate(selectedRole === 'msme' ? '/dashboard/umkm' : '/dashboard', { replace: true })
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

              {selectedRole === 'msme' && (
                <section className="register-umkm-section">
                  <div className="register-section-heading">
                    <span className="material-symbols-outlined">storefront</span>
                    <div>
                      <h3>Profil Dasar UMKM</h3>
                      <p>Data ini akan masuk ke dashboard UMKM dan menunggu verifikasi admin.</p>
                    </div>
                  </div>

                  <div className="field">
                    <label htmlFor="businessName">Nama UMKM *</label>
                    <input
                      id="businessName"
                      name="businessName"
                      type="text"
                      value={form.businessName}
                      onChange={handleChange}
                      placeholder="Kezia"
                      required
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="accountEmailPreview">Email Akun *</label>
                    <input
                      id="accountEmailPreview"
                      type="email"
                      value={form.email}
                      placeholder="keziadamanik20@gmail.com"
                      readOnly
                    />
                  </div>

                  <div className="register-field-grid">
                    <div className="field">
                      <label htmlFor="category">Sektor / Kategori *</label>
                      <select id="category" name="category" value={form.category} onChange={handleChange} required>
                        <option value="">Pilih sektor usaha</option>
                        {categoryOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>

                    {form.category === 'lainnya' && (
                      <div className="field">
                        <label htmlFor="otherCategory">Tuliskan Kategori Lainnya</label>
                        <input
                          id="otherCategory"
                          name="otherCategory"
                          type="text"
                          value={form.otherCategory}
                          onChange={handleChange}
                          placeholder="Sebutkan kategori usaha"
                          required
                        />
                      </div>
                    )}
                  </div>

                  <div className="field">
                    <label htmlFor="location">Lokasi UMKM *</label>
                    <input
                      id="location"
                      name="location"
                      type="text"
                      value={form.location}
                      onChange={handleLocationChange}
                      list="register-city-options"
                      placeholder="Pilih kota lokasi UMKM"
                      required
                    />
                    <datalist id="register-city-options">
                      {WORLD_CITY_OPTIONS.map((city) => (
                        <option key={city.label} value={city.label} />
                      ))}
                    </datalist>
                  </div>

                  <div className="field">
                    <label htmlFor="address">Alamat Detail</label>
                    <input
                      id="address"
                      name="address"
                      type="text"
                      value={form.address}
                      onChange={handleChange}
                      placeholder="Contoh: Jl. Sudirman No. 10, Kecamatan Tanah Abang"
                    />
                  </div>

                  <div className="register-field-grid">
                    <div className="field">
                      <label htmlFor="yearEstablished">Tahun Mulai Beroperasi</label>
                      <input
                        id="yearEstablished"
                        name="yearEstablished"
                        type="number"
                        min="1900"
                        max="2100"
                        value={form.yearEstablished}
                        onChange={handleChange}
                        placeholder="Contoh: 2019"
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="employeeCount">Jumlah Karyawan Saat Ini</label>
                      <input
                        id="employeeCount"
                        name="employeeCount"
                        type="number"
                        min="0"
                        value={form.employeeCount}
                        onChange={handleChange}
                        placeholder="Contoh: 5"
                      />
                    </div>
                  </div>

                  <div className="field">
                    <label htmlFor="monthlyRevenue">Rata-rata Omzet Bulanan</label>
                    <select id="monthlyRevenue" name="monthlyRevenue" value={form.monthlyRevenue} onChange={handleChange}>
                      <option value="">Pilih Rentang Omzet</option>
                      {revenueOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="field">
                    <label htmlFor="npwp">NPWP</label>
                    <input
                      id="npwp"
                      name="npwp"
                      type="text"
                      value={form.npwp}
                      onChange={handleChange}
                      placeholder="Contoh: 12.345.678.9-000.000"
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="description">Deskripsi UMKM *</label>
                    <textarea
                      id="description"
                      name="description"
                      value={form.description}
                      onChange={handleChange}
                      rows="4"
                      maxLength="1000"
                      placeholder="Jelaskan produk, layanan, target pasar, dan keunikan UMKM Anda."
                      required
                    />
                    <small>{form.description.length}/1000 karakter</small>
                  </div>

                  <div className="register-legal-card">
                    <h4>Legalitas & Dokumen Usaha</h4>
                    <p>Centang semua dokumen legalitas yang sudah dimiliki oleh usaha Anda saat ini:</p>
                    <div className="register-check-grid">
                      {legalDocumentOptions.map((doc) => (
                        <label key={doc.id} className="register-check-row">
                          <input
                            type="checkbox"
                            checked={form.legalDocuments.includes(doc.id)}
                            onChange={() => toggleLegalDocument(doc.id)}
                          />
                          <span>{doc.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </section>
              )}

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

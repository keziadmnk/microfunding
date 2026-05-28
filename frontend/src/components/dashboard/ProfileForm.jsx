import { useCallback, useEffect, useState } from 'react'
import { WORLD_CITY_OPTIONS, findCityByLabel } from './locationOptions'

const CATEGORY_OPTIONS = [
  { value: 'kuliner', label: 'Kuliner' },
  { value: 'fashion_tekstil', label: 'Fashion & Tekstil' },
  { value: 'pertanian_perkebunan', label: 'Pertanian & Perkebunan' },
  { value: 'jasa', label: 'Jasa' },
  { value: 'teknologi', label: 'Teknologi' },
  { value: 'kreatif_seni', label: 'Kreatif & Seni' },
  { value: 'lainnya', label: 'Lainnya' },
]

const REVENUE_OPTIONS = [
  { value: '< 5 juta', label: 'Kurang dari Rp 5 Juta' },
  { value: '5 - 15 juta', label: 'Rp 5 Juta - Rp 15 Juta' },
  { value: '15 - 50 juta', label: 'Rp 15 Juta - Rp 50 Juta' },
  { value: '50 - 100 juta', label: 'Rp 50 Juta - Rp 100 Juta' },
  { value: '> 100 juta', label: 'Lebih dari Rp 100 Juta' },
]

const LEGAL_DOCUMENTS_LIST = [
  { id: 'nib', label: 'NIB (Nomor Induk Berusaha)' },
  { id: 'pirt', label: 'PIRT (Pangan Industri Rumah Tangga)' },
  { id: 'halal', label: 'Sertifikasi Halal MUI' },
  { id: 'bpom', label: 'BPOM' },
  { id: 'sni', label: 'Sertifikat SNI' },
  { id: 'siup', label: 'SIUP' },
  { id: 'tdp', label: 'TDP' },
  { id: 'hki', label: 'Merek Terdaftar (HKI)' },
  { id: 'iso', label: 'ISO' },
]

const isProfileComplete = (profile) => Boolean(
  profile.name?.trim() &&
    profile.category &&
    profile.location?.trim() &&
    profile.description?.trim()
)

function ProfileForm({ onCancel }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(true)
  const [hasSavedProfile, setHasSavedProfile] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })
  const [logoPreview, setLogoPreview] = useState(null)

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    category: '',
    other_category: '',
    location: '',
    address: '',
    latitude: '',
    longitude: '',
    year_established: '',
    employee_count: '',
    monthly_revenue: '',
    legal_documents: [],
    description: '',
    logo: '',
    verified: 0,
    funding_target: '',
    funding_purpose: '',
    business_goals: '',
  })
  const [originalFormData, setOriginalFormData] = useState(formData)

  const token = localStorage.getItem('microfun_auth_token')
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'
  const fieldsDisabled = saving || !isEditing
  // Funding target is locked until UMKM is verified (verified === 1)
  const fundingLocked = formData.verified !== 1

  const getLogoPreviewUrl = useCallback((logo) => {
    if (!logo) return null
    return logo.startsWith('/') ? `${apiBaseUrl}${logo}` : logo
  }, [apiBaseUrl])

  useEffect(() => {
    // Fetch profile on mount
    fetch(`${apiBaseUrl}/api/profile`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load profile data.')
        return res.json()
      })
      .then((data) => {
        const p = data.profile
        const nextFormData = {
          name: p.name || '',
          email: p.email || '',
          category: p.category || '',
          other_category: p.other_category || '',
          location: p.location || '',
          address: p.address || '',
          latitude: p.latitude || '',
          longitude: p.longitude || '',
          year_established: p.year_established || '',
          employee_count: p.employee_count || '',
          monthly_revenue: p.monthly_revenue || '',
          legal_documents: p.legal_documents || [],
          description: p.description || '',
          logo: p.logo || '',
          verified: p.businessVerified !== undefined ? p.businessVerified : 0,
          funding_target: p.funding_target || '',
          funding_purpose: p.funding_purpose || '',
          business_goals: p.business_goals || '',
        }
        const completeProfile = isProfileComplete(nextFormData)

        setFormData(nextFormData)
        setOriginalFormData(nextFormData)
        setHasSavedProfile(completeProfile)
        setIsEditing(!completeProfile)
        setLogoPreview(getLogoPreviewUrl(nextFormData.logo))
      })
      .catch((err) => {
        setMessage({ text: err.message, type: 'error' })
      })
      .finally(() => {
        setLoading(false)
      })
  }, [apiBaseUrl, getLogoPreviewUrl, token])

  const handleInputChange = (e) => {
    if (!isEditing) return

    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleLocationChange = (e) => {
    if (!isEditing) return

    const city = findCityByLabel(e.target.value)
    setFormData((prev) => ({
      ...prev,
      location: city?.label || '',
      latitude: city?.latitude || '',
      longitude: city?.longitude || '',
    }))
  }

  const handleCheckboxChange = (id) => {
    if (!isEditing) return

    setFormData((prev) => {
      const docs = prev.legal_documents.includes(id)
        ? prev.legal_documents.filter((d) => d !== id)
        : [...prev.legal_documents, id]
      return { ...prev, legal_documents: docs }
    })
  }

  const handleFileChange = (e) => {
    if (!isEditing) return

    const file = e.target.files[0]
    if (!file) return

    // Limit to 2MB
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ text: 'Image file size must be 2MB or less.', type: 'error' })
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      setLogoPreview(reader.result)
      setFormData((prev) => ({ ...prev, logo: reader.result }))
      setMessage({ text: '', type: '' })
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    if (!isEditing) {
      setMessage({ text: 'Click the Edit Profile button first to update your data.', type: 'error' })
      return
    }

    if (!formData.name.trim()) {
      setMessage({ text: 'MSME name is required.', type: 'error' })
      return
    }
    if (!formData.category) {
      setMessage({ text: 'Sector/category is required.', type: 'error' })
      return
    }
    if (!findCityByLabel(formData.location)) {
      setMessage({ text: 'MSME location must be selected from the city list.', type: 'error' })
      return
    }
    if (!formData.description.trim()) {
      setMessage({ text: 'MSME description is required.', type: 'error' })
      return
    }
    if (formData.description.length > 1000) {
      setMessage({ text: 'MSME description must be 1000 characters or fewer.', type: 'error' })
      return
    }

    setSaving(true)
    setMessage({ text: '', type: '' })

    fetch(`${apiBaseUrl}/api/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(formData),
    })
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.message || 'Failed to save changes.')
        return data
      })
      .then((data) => {
        const savedFormData = {
          ...formData,
          logo: data.logoUrl || formData.logo,
        }

        setMessage({ text: 'MSME profile has been updated.', type: 'success' })
        if (data.logoUrl) {
          setLogoPreview(`${apiBaseUrl}${data.logoUrl}`)
        }
        setFormData(savedFormData)
        setOriginalFormData(savedFormData)
        setHasSavedProfile(true)
        setIsEditing(false)
        // Smooth scroll to top of form
        window.scrollTo({ top: 0, behavior: 'smooth' })
      })
      .catch((err) => {
        setMessage({ text: err.message, type: 'error' })
      })
      .finally(() => {
        setSaving(false)
      })
  }

  const handleEditClick = () => {
    setIsEditing(true)
    setMessage({ text: '', type: '' })
  }

  const handleCancelClick = () => {
    if (hasSavedProfile && isEditing) {
      setFormData(originalFormData)
      setLogoPreview(getLogoPreviewUrl(originalFormData.logo))
      setIsEditing(false)
      setMessage({ text: '', type: '' })
      return
    }

    onCancel()
  }

  if (loading) {
    return (
      <div className="profile-loading-spinner">
        <span className="material-symbols-outlined spinner-icon">hourglass_empty</span>
        <p>Loading your MSME profile...</p>
      </div>
    )
  }

  return (
    <div className="profile-form-container">
      {hasSavedProfile && !isEditing && (
        <div className="profile-edit-toolbar">
          <button
            type="button"
            className="profile-btn-save"
            onClick={handleEditClick}
          >
            <span className="material-symbols-outlined">edit</span>
            Edit Profile
          </button>
        </div>
      )}

      {message.text && (
        <div className={`profile-alert ${message.type === 'error' ? 'alert-error' : 'alert-success'}`}>
          <span className="material-symbols-outlined">
            {message.type === 'error' ? 'error' : 'check_circle'}
          </span>
          <p>{message.text}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="profile-form-grid">
        {/* Left Side: General Profile Info */}
        <div className="profile-form-left-col">
          <div className="profile-card">
            <div className="profile-card-header">
              <span className="material-symbols-outlined card-header-icon">storefront</span>
              <h3>MSME Basic Profile</h3>
            </div>

            {/* Logo Upload */}
            <div className="profile-logo-uploader-section">
              <label className="form-label">MSME Logo</label>
              <div className="logo-upload-wrapper">
                <div className="logo-preview-box">
                  {logoPreview ? (
                    <img src={logoPreview} alt="MSME logo preview" />
                  ) : (
                    <div className="logo-placeholder">
                      <span className="material-symbols-outlined">storefront</span>
                    </div>
                  )}
                </div>
                <div className="logo-upload-controls">
                  <label
                    htmlFor="logo-file-input"
                    className={`file-select-btn${fieldsDisabled ? ' disabled' : ''}`}
                  >
                    <span className="material-symbols-outlined">upload_file</span>
                    Choose Logo File
                  </label>
                  <input
                    type="file"
                    id="logo-file-input"
                    accept="image/png, image/jpeg, image/gif"
                    onChange={handleFileChange}
                    disabled={fieldsDisabled}
                    style={{ display: 'none' }}
                  />
                  <p className="file-info-text">
                    JPG, PNG, GIF format. Maximum file size 2MB.
                  </p>
                </div>
              </div>
            </div>

            {/* Nama UMKM */}
            <div className="form-group">
              <label htmlFor="name-input" className="form-label">
                MSME Name <span className="required-star">*</span>
              </label>
              <input
                type="text"
                id="name-input"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="form-control"
                placeholder="Enter your MSME name"
                disabled={fieldsDisabled}
                required
              />
            </div>

            {/* Email Akun */}
            <div className="form-group">
              <label htmlFor="email-input" className="form-label">
                Account Email <span className="required-star">*</span>
              </label>
              <input
                type="email"
                id="email-input"
                name="email"
                value={formData.email}
                className="form-control"
                placeholder="Login account email"
                readOnly
                disabled={saving}
                required
              />
            </div>

            {/* Kategori / Sektor */}
            <div className="form-group">
              <label htmlFor="category-select" className="form-label">
                Sector / Category <span className="required-star">*</span>
              </label>
              <select
                id="category-select"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="form-control"
                disabled={fieldsDisabled}
                required
              >
                <option value="">Select business sector / category</option>
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {formData.category === 'lainnya' && (
              <div className="form-group">
                <label htmlFor="other-category-input" className="form-label">
                  Other Category
                </label>
                <input
                  type="text"
                  id="other-category-input"
                  name="other_category"
                  value={formData.other_category}
                  onChange={handleInputChange}
                  className="form-control"
                  placeholder="Enter business category"
                  disabled={fieldsDisabled}
                />
              </div>
            )}

            {/* Lokasi */}
            <div className="form-group">
              <label htmlFor="location-input" className="form-label">
                MSME Location <span className="required-star">*</span>
              </label>
              <select
                id="location-input"
                name="location"
                value={formData.location}
                onChange={handleLocationChange}
                className="form-control"
                disabled={fieldsDisabled}
                required
              >
                <option value="">Select MSME city location</option>
                {WORLD_CITY_OPTIONS.map((city) => (
                  <option key={city.label} value={city.label}>
                    {city.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="address-input" className="form-label">
                Detailed Address
              </label>
              <textarea
                id="address-input"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                className="form-control text-area-control"
                rows="3"
                placeholder="Example: Jl. Sudirman No. 10, Tanah Abang District"
                disabled={fieldsDisabled}
              />
            </div>

            {/* Tahun Operasi & Karyawan */}
            <div className="form-row-two-cols">
              <div className="form-group">
                <label htmlFor="year-established-input" className="form-label">
                  Year Started Operating
                </label>
                <input
                  type="number"
                  id="year-established-input"
                  name="year_established"
                  value={formData.year_established}
                  onChange={handleInputChange}
                  className="form-control"
                  placeholder="Example: 2019"
                  min="1900"
                  max={new Date().getFullYear()}
                  disabled={fieldsDisabled}
                />
              </div>

              <div className="form-group">
                <label htmlFor="employee-count-input" className="form-label">
                  Current Employee Count
                </label>
                <input
                  type="number"
                  id="employee-count-input"
                  name="employee_count"
                  value={formData.employee_count}
                  onChange={handleInputChange}
                  className="form-control"
                  placeholder="Example: 5"
                  min="0"
                  disabled={fieldsDisabled}
                />
              </div>
            </div>

            {/* Rata-rata Omzet */}
            <div className="form-group">
              <label htmlFor="monthly-revenue-select" className="form-label">
                Average Monthly Revenue
              </label>
              <select
                id="monthly-revenue-select"
                name="monthly_revenue"
                value={formData.monthly_revenue}
                onChange={handleInputChange}
                className="form-control"
                disabled={fieldsDisabled}
              >
                <option value="">Select revenue range</option>
                {REVENUE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Deskripsi UMKM */}
            <div className="form-group">
              <label htmlFor="description-textarea" className="form-label">
                MSME Description <span className="required-star">*</span>
              </label>
              <textarea
                id="description-textarea"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows="5"
                className="form-control text-area-control"
                placeholder="Write a complete description of your business, flagship products, and MSME uniqueness..."
                maxLength="1000"
                disabled={fieldsDisabled}
                required
              />
              <div className="textarea-footer">
                <span className="info-span">
                  A complete description improves your chance of receiving funding.
                </span>
                <span className="char-counter">
                  {formData.description.length} / 1000 Characters
                </span>
              </div>
            </div>

            {/* Status (Admin Only) */}
            <div className="profile-status-section">
              <label className="form-label">MSME Verification Status</label>
              <div className="status-badge-container">
                {formData.verified === 1 ? (
                  <div className="status-badge badge-verified">
                    <span className="material-symbols-outlined">verified</span>
                    <span>Verified</span>
                  </div>
                ) : formData.verified === 2 ? (
                  <div className="status-badge badge-rejected">
                    <span className="material-symbols-outlined">cancel</span>
                    <span>Rejected / Needs Revision</span>
                  </div>
                ) : (
                  <div className="status-badge badge-pending">
                    <span className="material-symbols-outlined">hourglass_top</span>
                    <span>Awaiting Verification</span>
                  </div>
                )}
                <span className="status-admin-note">
                  Verification status can only be changed by an administrator after reviewing your business documents.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Legalities & Funding Details */}
        <div className="profile-form-right-col">
          {/* Legalities Card */}
          <div className="profile-card">
            <div className="profile-card-header">
              <span className="material-symbols-outlined card-header-icon">verified_user</span>
              <h3>Business Legality & Documents</h3>
            </div>
            <p className="card-sub-info">
              Check all legal documents currently owned by your business:
            </p>
            <div className="checkbox-grid">
              {LEGAL_DOCUMENTS_LIST.map((doc) => (
                <label key={doc.id} className="checkbox-container">
                  <input
                    type="checkbox"
                    checked={formData.legal_documents.includes(doc.id)}
                    onChange={() => handleCheckboxChange(doc.id)}
                    disabled={fieldsDisabled}
                  />
                  <span className="checkmark-box" />
                  <span className="checkbox-label-text">{doc.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Target Pendanaan Card (AI matching) */}
          <div className={`profile-card profile-funding-card${fundingLocked ? ' profile-funding-locked' : ''}`}>
            <div className="profile-card-header">
              <span className="material-symbols-outlined card-header-icon">finance_mode</span>
              <h3>Funding Target (AI Recommendation)</h3>
            </div>

            {fundingLocked ? (
              <div className="profile-funding-lock-banner">
                <span className="material-symbols-outlined">lock</span>
                <div>
                  <h5>Feature Locked</h5>
                  <p>
                    Complete your MSME profile and wait for admin verification before filling in the funding target.
                    After verification, you can set a funding target and be listed in AI Funder recommendations.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="ai-matching-banner">
                  <span className="material-symbols-outlined banner-icon">psychology</span>
                  <div className="banner-copy">
                    <h5>Used by the AI Discovery Engine</h5>
                    <p>
                      Complete this section in detail so our AI can match your MSME with the most suitable
                      international funders and diaspora investors.
                    </p>
                  </div>
                </div>

            {/* Target Dana */}
            <div className="form-group">
              <label htmlFor="funding-target-input" className="form-label">
                Required Funding Target (Rp)
              </label>
              <div className="currency-input-wrapper">
                <span className="currency-prefix">Rp</span>
                <input
                  type="number"
                  id="funding-target-input"
                  name="funding_target"
                  value={formData.funding_target}
                  onChange={handleInputChange}
                  className="form-control prefix-control"
                  placeholder="Example: 500000000 (for Rp 500 million)"
                  min="0"
                  disabled={fieldsDisabled}
                />
              </div>
            </div>

            {/* Deskripsi Penggunaan Dana */}
            <div className="form-group">
              <label htmlFor="funding-purpose-textarea" className="form-label">
                Fund Usage Plan & Purpose
              </label>
              <textarea
                id="funding-purpose-textarea"
                name="funding_purpose"
                value={formData.funding_purpose}
                onChange={handleInputChange}
                rows="4"
                className="form-control text-area-control"
                placeholder="Explain the fund allocation plan in detail. Example: purchasing automated production machines, expanding distribution warehouses in 2 new cities, and improving digital marketing capacity..."
                disabled={fieldsDisabled}
              />
            </div>

            {/* Goal Bisnis */}
            <div className="form-group">
              <label htmlFor="business-goals-textarea" className="form-label">
                Business Goals & Expectations
              </label>
              <textarea
                id="business-goals-textarea"
                name="business_goals"
                value={formData.business_goals}
                onChange={handleInputChange}
                rows="4"
                className="form-control text-area-control"
                placeholder="Example: increase production capacity by 3x, open 3 new outlets in major cities, and export products to Malaysia within 1 year after receiving funding..."
                disabled={fieldsDisabled}
              />
            </div>

                {/* AI Note */}
                <div className="ai-matching-info-banner">
                  <span className="material-symbols-outlined info-icon">info</span>
                  <p>
                    <strong>Note:</strong> MSMEs that complete the Funding Target section will be
                    automatically listed on the <strong>AI Funder Recommendation Page</strong>, open
                    funding request list, and <strong>RantauHub Platform Discovery Engine</strong>.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Buttons Row */}
        <div className="profile-form-actions-bar">
          <button
            type="button"
            className="profile-btn-cancel"
            onClick={handleCancelClick}
            disabled={saving}
          >
            {hasSavedProfile && isEditing ? 'Cancel Edit' : 'Cancel'}
          </button>
          <button
            type="submit"
            className="profile-btn-save"
            disabled={saving || !isEditing}
          >
            {saving ? (
              <>
                <span className="material-symbols-outlined btn-spinner-icon">hourglass_empty</span>
                Saving...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined">save</span>
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

export default ProfileForm

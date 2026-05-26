import { useCallback, useEffect, useMemo, useState } from 'react'

const INVESTMENT_INTERESTS = [
  'Kuliner & F&B',
  'Fashion & Tekstil',
  'Agribisnis',
  'Kerajinan',
  'Teknologi',
  'Pendidikan',
  'Kesehatan',
  'Pariwisata',
  'Ekspor',
  'Semua Sektor',
]

const EXPERTISE_AREAS = [
  'Investasi & Keuangan',
  'Marketing & Branding',
  'Operasional Bisnis',
  'Ekspor & Distribusi',
  'Digital & Teknologi',
  'Hukum & Regulasi',
  'Networking',
  'Mentoring Bisnis',
  'Supply Chain',
  'HR & Organisasi',
]

const initialFormData = {
  name: '',
  email: '',
  email_verified_at: '',
  phone: '',
  address: '',
  bio: '',
  profile_photo: '',
  funding_min: '',
  funding_max: '',
  investment_interests: [],
  expertise_areas: [],
}

function isProfileComplete(profile) {
  return Boolean(
    profile.name?.trim() &&
      profile.phone?.trim() &&
      profile.address?.trim() &&
      profile.bio?.trim() &&
      profile.funding_min &&
      profile.funding_max &&
      profile.investment_interests.length > 0 &&
      profile.expertise_areas.length > 0
  )
}

function FunderProfileForm({ onCancel }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(true)
  const [hasSavedProfile, setHasSavedProfile] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })
  const [photoPreview, setPhotoPreview] = useState(null)
  const [formData, setFormData] = useState(initialFormData)
  const [originalFormData, setOriginalFormData] = useState(initialFormData)

  const token = localStorage.getItem('microfun_auth_token')
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'
  const fieldsDisabled = saving || !isEditing

  const initials = useMemo(() => {
    const parts = formData.name.trim().split(/\s+/).filter(Boolean)
    if (parts.length === 0) return 'F'
    return parts.slice(0, 2).map((part) => part[0]).join('').toUpperCase()
  }, [formData.name])

  const getPhotoPreviewUrl = useCallback((photo) => {
    if (!photo) return null
    return photo.startsWith('/') ? `${apiBaseUrl}${photo}` : photo
  }, [apiBaseUrl])

  useEffect(() => {
    fetch(`${apiBaseUrl}/api/funder-profile`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Gagal mengambil profil funder.')
        return res.json()
      })
      .then((data) => {
        const p = data.profile
        const nextFormData = {
          name: p.name || '',
          email: p.email || '',
          email_verified_at: p.email_verified_at || '',
          phone: p.phone || '',
          address: p.address || '',
          bio: p.bio || '',
          profile_photo: p.profile_photo || '',
          funding_min: p.funding_min || '',
          funding_max: p.funding_max || '',
          investment_interests: p.investment_interests || [],
          expertise_areas: p.expertise_areas || [],
        }
        const completeProfile = isProfileComplete(nextFormData)

        setFormData(nextFormData)
        setOriginalFormData(nextFormData)
        setHasSavedProfile(completeProfile)
        setIsEditing(!completeProfile)
        setPhotoPreview(getPhotoPreviewUrl(nextFormData.profile_photo))
      })
      .catch((err) => {
        setMessage({ text: err.message, type: 'error' })
      })
      .finally(() => {
        setLoading(false)
      })
  }, [apiBaseUrl, getPhotoPreviewUrl, token])

  function handleInputChange(event) {
    if (!isEditing) return

    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  function handleOptionToggle(field, value) {
    if (!isEditing) return

    setFormData((prev) => {
      const current = prev[field]
      const next = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value]

      return { ...prev, [field]: next }
    })
  }

  function handleFileChange(event) {
    if (!isEditing) return

    const file = event.target.files[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      setMessage({ text: 'Ukuran file gambar maksimal 2MB.', type: 'error' })
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      setPhotoPreview(reader.result)
      setFormData((prev) => ({ ...prev, profile_photo: reader.result }))
      setMessage({ text: '', type: '' })
    }
    reader.readAsDataURL(file)
  }

  function handleSubmit(event) {
    event.preventDefault()

    if (!isEditing) {
      setMessage({ text: 'Tekan tombol Edit Profil terlebih dahulu untuk mengubah data.', type: 'error' })
      return
    }

    if (!formData.name.trim()) {
      setMessage({ text: 'Nama lengkap wajib diisi.', type: 'error' })
      return
    }

    if (formData.bio.length > 1000) {
      setMessage({ text: 'Bio maksimal 1000 karakter.', type: 'error' })
      return
    }

    setSaving(true)
    setMessage({ text: '', type: '' })

    fetch(`${apiBaseUrl}/api/funder-profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(formData),
    })
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.message || 'Gagal menyimpan profil funder.')
        return data
      })
      .then((data) => {
        const savedFormData = {
          ...formData,
          profile_photo: data.profilePhotoUrl || formData.profile_photo,
        }

        setMessage({ text: 'Profil funder berhasil diperbarui.', type: 'success' })
        if (data.profilePhotoUrl) {
          setPhotoPreview(`${apiBaseUrl}${data.profilePhotoUrl}`)
        }
        setFormData(savedFormData)
        setOriginalFormData(savedFormData)
        setHasSavedProfile(true)
        setIsEditing(false)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      })
      .catch((err) => {
        setMessage({ text: err.message, type: 'error' })
      })
      .finally(() => {
        setSaving(false)
      })
  }

  function handleCancelClick() {
    if (hasSavedProfile && isEditing) {
      setFormData(originalFormData)
      setPhotoPreview(getPhotoPreviewUrl(originalFormData.profile_photo))
      setIsEditing(false)
      setMessage({ text: '', type: '' })
      return
    }

    onCancel()
  }

  if (loading) {
    return (
      <div className="funder-profile-loading">
        <span className="material-symbols-outlined funder-spinner">hourglass_empty</span>
        <p>Memuat profil funder...</p>
      </div>
    )
  }

  return (
    <div className="funder-profile-container">
      {hasSavedProfile && !isEditing && (
        <div className="funder-profile-toolbar">
          <button type="button" className="funder-profile-primary-btn" onClick={() => setIsEditing(true)}>
            <span className="material-symbols-outlined">edit</span>
            Edit Profil
          </button>
        </div>
      )}

      {message.text && (
        <div className={`funder-profile-alert ${message.type === 'error' ? 'error' : 'success'}`}>
          <span className="material-symbols-outlined">
            {message.type === 'error' ? 'error' : 'check_circle'}
          </span>
          <p>{message.text}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="funder-profile-form-grid">
        <section className="funder-profile-card">
          <div className="funder-profile-card-header">
            <span className="material-symbols-outlined">account_circle</span>
            <h3>Profil Dasar Funder</h3>
          </div>

          <div className="funder-photo-row">
            <div className="funder-photo-preview">
              {photoPreview ? (
                <img src={photoPreview} alt="Foto profil funder" />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <div>
              <label className={`funder-file-btn${fieldsDisabled ? ' disabled' : ''}`} htmlFor="funder-photo-input">
                <span className="material-symbols-outlined">upload_file</span>
                Pilih Foto Profil
              </label>
              <input
                id="funder-photo-input"
                type="file"
                accept="image/png, image/jpeg, image/gif"
                onChange={handleFileChange}
                disabled={fieldsDisabled}
                hidden
              />
              <p>Format: JPG, PNG, GIF. Maksimal 2MB</p>
            </div>
          </div>

          <TextInput
            label="Nama Lengkap"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            disabled={fieldsDisabled}
            required
          />

          <div className="funder-profile-field">
            <label htmlFor="funder-email">Email <span>*</span></label>
            <input
              id="funder-email"
              type="email"
              value={formData.email}
              readOnly
              disabled={saving}
            />
            <small className={formData.email_verified_at ? 'verified' : ''}>
              {formData.email_verified_at ? 'Email terverifikasi' : 'Email belum terverifikasi'}
            </small>
          </div>

          <TextInput
            label="No. Telepon"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            disabled={fieldsDisabled}
            placeholder="+6281234567892"
          />

          <TextInput
            label="Alamat"
            name="address"
            value={formData.address}
            onChange={handleInputChange}
            disabled={fieldsDisabled}
            placeholder="Jakarta, Indonesia"
          />

          <div className="funder-profile-field">
            <label htmlFor="funder-bio">Bio / Tentang Saya</label>
            <textarea
              id="funder-bio"
              name="bio"
              value={formData.bio}
              onChange={handleInputChange}
              disabled={fieldsDisabled}
              maxLength="1000"
              rows="5"
              placeholder="Investor dan entrepreneur diaspora Minangkabau yang fokus pada pengembangan UMKM lokal."
            />
            <small>{formData.bio.length} / 1000 karakter</small>
          </div>
        </section>

        <section className="funder-profile-card funder-ai-profile-card">
          <div className="funder-profile-card-header">
            <span className="material-symbols-outlined">business_center</span>
            <div>
              <h3>Profil Funder</h3>
              <p>Digunakan AI untuk mencocokkan UMKM</p>
            </div>
          </div>

          <div className="funder-profile-budget-grid">
            <CurrencyInput
              label="Minimum (Rp)"
              name="funding_min"
              value={formData.funding_min}
              onChange={handleInputChange}
              disabled={fieldsDisabled}
            />
            <CurrencyInput
              label="Maksimum (Rp)"
              name="funding_max"
              value={formData.funding_max}
              onChange={handleInputChange}
              disabled={fieldsDisabled}
            />
          </div>

          <OptionGroup
            title="Minat Investasi"
            description="Pilih satu atau lebih sektor yang Anda minati"
            options={INVESTMENT_INTERESTS}
            values={formData.investment_interests}
            disabled={fieldsDisabled}
            onToggle={(value) => handleOptionToggle('investment_interests', value)}
          />

          <OptionGroup
            title="Pengalaman / Keahlian"
            description="Pilih bidang keahlian yang dapat Anda berikan kepada UMKM"
            options={EXPERTISE_AREAS}
            values={formData.expertise_areas}
            disabled={fieldsDisabled}
            onToggle={(value) => handleOptionToggle('expertise_areas', value)}
          />
        </section>

        <div className="funder-profile-actions">
          <button
            type="button"
            className="funder-profile-secondary-btn"
            onClick={handleCancelClick}
            disabled={saving}
          >
            {hasSavedProfile && isEditing ? 'Batal Edit' : 'Batal'}
          </button>
          <button
            type="submit"
            className="funder-profile-primary-btn"
            disabled={saving || !isEditing}
          >
            {saving ? (
              <>
                <span className="material-symbols-outlined funder-spinner-small">hourglass_empty</span>
                Menyimpan...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined">save</span>
                Simpan Perubahan
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

function TextInput({ label, name, value, onChange, disabled, required = false, placeholder = '' }) {
  return (
    <div className="funder-profile-field">
      <label htmlFor={`funder-${name}`}>
        {label} {required && <span>*</span>}
      </label>
      <input
        id={`funder-${name}`}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
        required={required}
      />
    </div>
  )
}

function CurrencyInput({ label, name, value, onChange, disabled }) {
  const numberValue = Number(value || 0)
  const formatted = numberValue > 0
    ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(numberValue)
    : 'Rp 0'

  return (
    <div className="funder-profile-field">
      <label htmlFor={`funder-${name}`}>{label}</label>
      <input
        id={`funder-${name}`}
        type="number"
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        min="0"
        placeholder="10000000"
      />
      <small>{formatted}</small>
    </div>
  )
}

function OptionGroup({ title, description, options, values, disabled, onToggle }) {
  return (
    <div className="funder-option-section">
      <h4>{title}</h4>
      <p>{description}</p>
      <div className="funder-option-grid">
        {options.map((option) => (
          <label key={option} className="funder-option-chip">
            <input
              type="checkbox"
              checked={values.includes(option)}
              onChange={() => onToggle(option)}
              disabled={disabled}
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

export default FunderProfileForm

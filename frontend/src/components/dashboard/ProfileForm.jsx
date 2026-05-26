import { useCallback, useEffect, useState } from 'react'

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
        if (!res.ok) throw new Error('Gagal mengambil data profil.')
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
      setMessage({ text: 'Ukuran file gambar maksimal 2MB.', type: 'error' })
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
      setMessage({ text: 'Tekan tombol Edit Profil terlebih dahulu untuk mengubah data.', type: 'error' })
      return
    }

    if (!formData.name.trim()) {
      setMessage({ text: 'Nama UMKM wajib diisi.', type: 'error' })
      return
    }
    if (!formData.category) {
      setMessage({ text: 'Sektor/Kategori wajib dipilih.', type: 'error' })
      return
    }
    if (!formData.location.trim()) {
      setMessage({ text: 'Lokasi UMKM wajib diisi.', type: 'error' })
      return
    }
    if (!formData.description.trim()) {
      setMessage({ text: 'Deskripsi UMKM wajib diisi.', type: 'error' })
      return
    }
    if (formData.description.length > 1000) {
      setMessage({ text: 'Deskripsi UMKM maksimal 1000 karakter.', type: 'error' })
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
        if (!res.ok) throw new Error(data.message || 'Gagal menyimpan perubahan.')
        return data
      })
      .then((data) => {
        const savedFormData = {
          ...formData,
          logo: data.logoUrl || formData.logo,
        }

        setMessage({ text: 'Profil UMKM berhasil diperbarui.', type: 'success' })
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
        <p>Memuat profil UMKM Anda...</p>
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
            Edit Profil
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
              <h3>Profil Dasar UMKM</h3>
            </div>

            {/* Logo Upload */}
            <div className="profile-logo-uploader-section">
              <label className="form-label">Logo UMKM</label>
              <div className="logo-upload-wrapper">
                <div className="logo-preview-box">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo UMKM Preview" />
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
                    Pilih File Logo
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
                    Format JPG, PNG, GIF. Maksimal ukuran file 2MB.
                  </p>
                </div>
              </div>
            </div>

            {/* Nama UMKM */}
            <div className="form-group">
              <label htmlFor="name-input" className="form-label">
                Nama UMKM <span className="required-star">*</span>
              </label>
              <input
                type="text"
                id="name-input"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="form-control"
                placeholder="Masukkan nama UMKM Anda"
                disabled={fieldsDisabled}
                required
              />
            </div>

            {/* Email Akun */}
            <div className="form-group">
              <label htmlFor="email-input" className="form-label">
                Email Akun <span className="required-star">*</span>
              </label>
              <input
                type="email"
                id="email-input"
                name="email"
                value={formData.email}
                className="form-control"
                placeholder="Email akun login"
                readOnly
                disabled={saving}
                required
              />
            </div>

            {/* Kategori / Sektor */}
            <div className="form-group">
              <label htmlFor="category-select" className="form-label">
                Sektor / Kategori <span className="required-star">*</span>
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
                <option value="">Pilih Sektor / Kategori Usaha</option>
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
                  Tuliskan Kategori Lainnya
                </label>
                <input
                  type="text"
                  id="other-category-input"
                  name="other_category"
                  value={formData.other_category}
                  onChange={handleInputChange}
                  className="form-control"
                  placeholder="Sebutkan kategori usaha"
                  disabled={fieldsDisabled}
                />
              </div>
            )}

            {/* Lokasi */}
            <div className="form-group">
              <label htmlFor="location-input" className="form-label">
                Lokasi UMKM <span className="required-star">*</span>
              </label>
              <input
                type="text"
                id="location-input"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                className="form-control"
                placeholder="Contoh: Padang, Sumatera Barat"
                disabled={fieldsDisabled}
                required
              />
            </div>

            {/* Tahun Operasi & Karyawan */}
            <div className="form-row-two-cols">
              <div className="form-group">
                <label htmlFor="year-established-input" className="form-label">
                  Tahun Mulai Beroperasi
                </label>
                <input
                  type="number"
                  id="year-established-input"
                  name="year_established"
                  value={formData.year_established}
                  onChange={handleInputChange}
                  className="form-control"
                  placeholder="Contoh: 2019"
                  min="1900"
                  max={new Date().getFullYear()}
                  disabled={fieldsDisabled}
                />
              </div>

              <div className="form-group">
                <label htmlFor="employee-count-input" className="form-label">
                  Jumlah Karyawan Saat Ini
                </label>
                <input
                  type="number"
                  id="employee-count-input"
                  name="employee_count"
                  value={formData.employee_count}
                  onChange={handleInputChange}
                  className="form-control"
                  placeholder="Contoh: 5"
                  min="0"
                  disabled={fieldsDisabled}
                />
              </div>
            </div>

            {/* Rata-rata Omzet */}
            <div className="form-group">
              <label htmlFor="monthly-revenue-select" className="form-label">
                Rata-rata Omzet Bulanan
              </label>
              <select
                id="monthly-revenue-select"
                name="monthly_revenue"
                value={formData.monthly_revenue}
                onChange={handleInputChange}
                className="form-control"
                disabled={fieldsDisabled}
              >
                <option value="">Pilih Rentang Omzet</option>
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
                Deskripsi UMKM <span className="required-star">*</span>
              </label>
              <textarea
                id="description-textarea"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows="5"
                className="form-control text-area-control"
                placeholder="Tuliskan deskripsi lengkap mengenai bidang usaha, produk unggulan, dan keunikan UMKM Anda..."
                maxLength="1000"
                disabled={fieldsDisabled}
                required
              />
              <div className="textarea-footer">
                <span className="info-span">
                  Deskripsi yang lengkap meningkatkan kemungkinan mendapatkan pendanaan.
                </span>
                <span className="char-counter">
                  {formData.description.length} / 1000 Karakter
                </span>
              </div>
            </div>

            {/* Status (Admin Only) */}
            <div className="profile-status-section">
              <label className="form-label">Status Verifikasi UMKM</label>
              <div className="status-badge-container">
                {formData.verified === 1 ? (
                  <div className="status-badge badge-verified">
                    <span className="material-symbols-outlined">verified</span>
                    <span>Terverifikasi</span>
                  </div>
                ) : formData.verified === 2 ? (
                  <div className="status-badge badge-rejected">
                    <span className="material-symbols-outlined">cancel</span>
                    <span>Ditolak / Perlu Revisi</span>
                  </div>
                ) : (
                  <div className="status-badge badge-pending">
                    <span className="material-symbols-outlined">hourglass_top</span>
                    <span>Menunggu Verifikasi</span>
                  </div>
                )}
                <span className="status-admin-note">
                  Status verifikasi hanya dapat diubah oleh administrator setelah meninjau dokumen usaha Anda.
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
              <h3>Legalitas & Dokumen Usaha</h3>
            </div>
            <p className="card-sub-info">
              Centang semua dokumen legalitas yang sudah dimiliki oleh usaha Anda saat ini:
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
          <div className="profile-card profile-funding-card">
            <div className="profile-card-header">
              <span className="material-symbols-outlined card-header-icon">finance_mode</span>
              <h3>Target Pendanaan (Rekomendasi AI)</h3>
            </div>
            <div className="ai-matching-banner">
              <span className="material-symbols-outlined banner-icon">psychology</span>
              <div className="banner-copy">
                <h5>Digunakan oleh AI Discovery Engine</h5>
                <p>
                  Isi bagian ini secara detail agar AI kami dapat mencocokkan UMKM Anda dengan funder
                  internasional & investor diaspora yang paling sesuai!
                </p>
              </div>
            </div>

            {/* Target Dana */}
            <div className="form-group">
              <label htmlFor="funding-target-input" className="form-label">
                Target Dana yang Dibutuhkan (Rp)
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
                  placeholder="Contoh: 500000000 (untuk Rp 500 juta)"
                  min="0"
                  disabled={fieldsDisabled}
                />
              </div>
            </div>

            {/* Deskripsi Penggunaan Dana */}
            <div className="form-group">
              <label htmlFor="funding-purpose-textarea" className="form-label">
                Rencana & Tujuan Penggunaan Dana
              </label>
              <textarea
                id="funding-purpose-textarea"
                name="funding_purpose"
                value={formData.funding_purpose}
                onChange={handleInputChange}
                rows="4"
                className="form-control text-area-control"
                placeholder="Jelaskan secara rinci rencana alokasi dana tersebut. Contoh: Pembelian mesin produksi otomatis, ekspansi gudang distribusi di 2 kota baru, serta peningkatan kapasitas digital marketing..."
                disabled={fieldsDisabled}
              />
            </div>

            {/* Goal Bisnis */}
            <div className="form-group">
              <label htmlFor="business-goals-textarea" className="form-label">
                Target & Harapan Bisnis (Goal Bisnis)
              </label>
              <textarea
                id="business-goals-textarea"
                name="business_goals"
                value={formData.business_goals}
                onChange={handleInputChange}
                rows="4"
                className="form-control text-area-control"
                placeholder="Contoh: Meningkatkan kapasitas produksi hingga 3 kali lipat, membuka 3 cabang outlet baru di kota besar, dan melakukan ekspor produk ke Malaysia dalam waktu 1 tahun setelah menerima pendanaan..."
                disabled={fieldsDisabled}
              />
            </div>

            {/* AI Note */}
            <div className="ai-matching-info-banner">
              <span className="material-symbols-outlined info-icon">info</span>
              <p>
                <strong>Catatan:</strong> UMKM yang melengkapi bagian Target Pendanaan akan secara
                otomatis terdaftar dalam <strong>Halaman Rekomendasi AI Funder</strong>, daftar
                permintaan pendanaan terbuka, serta <strong>Discovery Engine Platform RantauHub</strong>.
              </p>
            </div>
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
            {hasSavedProfile && isEditing ? 'Batal Edit' : 'Batal'}
          </button>
          <button
            type="submit"
            className="profile-btn-save"
            disabled={saving || !isEditing}
          >
            {saving ? (
              <>
                <span className="material-symbols-outlined btn-spinner-icon">hourglass_empty</span>
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

export default ProfileForm

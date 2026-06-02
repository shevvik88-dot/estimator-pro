import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getProfile, upsertProfile } from '../lib/db'
import { US_REGIONS, US_STATES } from '../lib/regions'

const inputClass =
  'w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
const labelClass =
  'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5'

const EMPTY = {
  full_name: '',
  company_name: '',
  license_number: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  region: '',
}

function Toast({ message, type = 'success' }) {
  const bg = type === 'success' ? 'bg-green-600' : 'bg-red-600'
  const icon = type === 'success'
    ? <path d="M3 8l3.5 3.5L13 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    : <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  return (
    <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl ${bg} text-white text-sm font-medium shadow-lg`}>
      <svg className="w-4 h-4 shrink-0" viewBox="0 0 16 16" fill="none">{icon}</svg>
      {message}
    </div>
  )
}

function DeleteModal({ onCancel, onConfirm, deleting }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl p-6 w-full max-w-sm">
        <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-red-600 dark:text-red-400" viewBox="0 0 24 24" fill="none">
            <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white text-center mb-2">
          Delete account?
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6 leading-relaxed">
          This will permanently delete all your projects and estimates. This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="flex-1 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {deleting ? 'Deleting…' : 'Yes, delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Settings() {
  const navigate = useNavigate()

  // Profile form
  const [fields, setFields] = useState(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  // Password form
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwError, setPwError] = useState(null)

  // Delete account
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Toast
  const [toast, setToast] = useState(null) // { message, type }
  const toastTimer = useRef(null)

  function showToast(message, type = 'success') {
    clearTimeout(toastTimer.current)
    setToast({ message, type })
    toastTimer.current = setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    async function load() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return
        const profile = await getProfile(session.user.id)
        if (profile) {
          setFields({
            full_name:      profile.full_name      ?? '',
            company_name:   profile.company_name   ?? '',
            license_number: profile.license_number ?? '',
            phone:          profile.phone          ?? '',
            address:        profile.address        ?? '',
            city:           profile.city           ?? '',
            state:          profile.state          ?? '',
            region:         profile.region         ?? '',
          })
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function set(key, value) {
    setFields((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      await upsertProfile({ id: session.user.id, ...fields })
      showToast('Profile saved')
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handlePasswordUpdate(e) {
    e.preventDefault()
    if (newPassword.length < 6) {
      setPwError('New password must be at least 6 characters.')
      return
    }
    setPwSaving(true)
    setPwError(null)
    try {
      // Re-authenticate with current password first
      const { data: { session } } = await supabase.auth.getSession()
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: session.user.email,
        password: currentPassword,
      })
      if (signInError) throw new Error('Current password is incorrect.')

      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error

      setCurrentPassword('')
      setNewPassword('')
      showToast('Password updated')
    } catch (err) {
      setPwError(err.message)
    } finally {
      setPwSaving(false)
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      // Deleting the profile row cascades to projects and estimates via ON DELETE CASCADE
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', session.user.id)
      if (error) throw error
      await supabase.auth.signOut()
      navigate('/auth', { replace: true })
    } catch (err) {
      setDeleting(false)
      setShowDeleteModal(false)
      showToast(err.message, 'error')
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/auth', { replace: true })
  }

  return (
    <div className="p-8 max-w-2xl">

      {toast && <Toast message={toast.message} type={toast.type} />}
      {showDeleteModal && (
        <DeleteModal
          onCancel={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteAccount}
          deleting={deleting}
        />
      )}

      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">Settings</h1>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">

          {/* ── Company Profile ───────────────────────────────────── */}
          <form onSubmit={handleSave}>
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm divide-y divide-gray-100 dark:divide-gray-800">
              <div className="px-6 py-6">
                <p className="text-sm font-semibold text-gray-900 dark:text-white mb-5">
                  Company Profile
                </p>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Full Name</label>
                      <input type="text" value={fields.full_name} onChange={(e) => set('full_name', e.target.value)} className={inputClass} placeholder="Jane Smith" />
                    </div>
                    <div>
                      <label className={labelClass}>Company Name</label>
                      <input type="text" value={fields.company_name} onChange={(e) => set('company_name', e.target.value)} className={inputClass} placeholder="West Point Interiors Inc." />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>License Number</label>
                      <input type="text" value={fields.license_number} onChange={(e) => set('license_number', e.target.value)} className={inputClass} placeholder="CSLB #1141973" />
                    </div>
                    <div>
                      <label className={labelClass}>Phone</label>
                      <input type="tel" value={fields.phone} onChange={(e) => set('phone', e.target.value)} className={inputClass} placeholder="(888) 915-2525" />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Company Address</label>
                    <input type="text" value={fields.address} onChange={(e) => set('address', e.target.value)} className={inputClass} placeholder="123 Main St" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>City</label>
                      <input type="text" value={fields.city} onChange={(e) => set('city', e.target.value)} className={inputClass} placeholder="Sacramento" />
                    </div>
                    <div>
                      <label className={labelClass}>State</label>
                      <select value={fields.state} onChange={(e) => set('state', e.target.value)} className={inputClass}>
                        <option value="">Select state…</option>
                        {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Default Region</label>
                    <select value={fields.region} onChange={(e) => set('region', e.target.value)} className={inputClass}>
                      <option value="">Select region…</option>
                      {US_REGIONS.map((r) => (
                        <option key={r.id} value={r.id}>{r.label} (×{r.multiplier.toFixed(2)})</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 flex items-center justify-between">
                {saveError
                  ? <p className="text-sm text-red-600 dark:text-red-400">{saveError}</p>
                  : <span />}
                <button type="submit" disabled={saving} className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors">
                  {saving ? 'Saving…' : 'Save profile'}
                </button>
              </div>

              <div className="px-6 py-5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Sign out</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Sign out of your EstimatorPro account.</p>
                </div>
                <button type="button" onClick={handleSignOut} className="px-4 py-2 rounded-lg border border-red-200 dark:border-red-800 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                  Sign out
                </button>
              </div>
            </div>
          </form>

          {/* ── Change Password ───────────────────────────────────── */}
          <form onSubmit={handlePasswordUpdate}>
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm divide-y divide-gray-100 dark:divide-gray-800">
              <div className="px-6 py-6">
                <p className="text-sm font-semibold text-gray-900 dark:text-white mb-5">
                  Change Password
                </p>
                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>Current Password</label>
                    <input
                      type="password"
                      autoComplete="current-password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className={inputClass}
                      placeholder="••••••••"
                      required
                    />
                  </div>
                  <div>
                    <label className={labelClass}>New Password</label>
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className={inputClass}
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 flex items-center justify-between">
                {pwError
                  ? <p className="text-sm text-red-600 dark:text-red-400">{pwError}</p>
                  : <span />}
                <button type="submit" disabled={pwSaving} className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors">
                  {pwSaving ? 'Updating…' : 'Update password'}
                </button>
              </div>
            </div>
          </form>

          {/* ── Danger Zone ───────────────────────────────────────── */}
          <div className="rounded-2xl border-2 border-red-200 dark:border-red-900 bg-white dark:bg-gray-900 shadow-sm">
            <div className="px-6 py-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-red-600 dark:text-red-400 mb-0.5">
                  Delete Account
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Permanently delete your account, projects, and estimates.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="shrink-0 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors"
              >
                Delete account
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}

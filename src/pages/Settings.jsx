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

export default function Settings() {
  const navigate = useNavigate()
  const [fields, setFields] = useState(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const toastTimer = useRef(null)

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
      clearTimeout(toastTimer.current)
      setToast(true)
      toastTimer.current = setTimeout(() => setToast(false), 3000)
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/auth', { replace: true })
  }

  return (
    <div className="p-8 max-w-2xl">

      {/* ── Toast ─────────────────────────────────────────────── */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-green-600 text-white text-sm font-medium shadow-lg">
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 16 16" fill="none">
            <path d="M3 8l3.5 3.5L13 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Profile saved
        </div>
      )}

      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">Settings</h1>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
        </div>
      ) : (
        <form onSubmit={handleSave}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm divide-y divide-gray-100 dark:divide-gray-800">

            {/* ── Company Profile ──────────────────────────────── */}
            <div className="px-6 py-6">
              <p className="text-sm font-semibold text-gray-900 dark:text-white mb-5">
                Company Profile
              </p>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Full Name</label>
                    <input
                      type="text"
                      value={fields.full_name}
                      onChange={(e) => set('full_name', e.target.value)}
                      className={inputClass}
                      placeholder="Jane Smith"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Company Name</label>
                    <input
                      type="text"
                      value={fields.company_name}
                      onChange={(e) => set('company_name', e.target.value)}
                      className={inputClass}
                      placeholder="West Point Interiors Inc."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>License Number</label>
                    <input
                      type="text"
                      value={fields.license_number}
                      onChange={(e) => set('license_number', e.target.value)}
                      className={inputClass}
                      placeholder="CSLB #1141973"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Phone</label>
                    <input
                      type="tel"
                      value={fields.phone}
                      onChange={(e) => set('phone', e.target.value)}
                      className={inputClass}
                      placeholder="(888) 915-2525"
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Company Address</label>
                  <input
                    type="text"
                    value={fields.address}
                    onChange={(e) => set('address', e.target.value)}
                    className={inputClass}
                    placeholder="123 Main St"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>City</label>
                    <input
                      type="text"
                      value={fields.city}
                      onChange={(e) => set('city', e.target.value)}
                      className={inputClass}
                      placeholder="Sacramento"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>State</label>
                    <select
                      value={fields.state}
                      onChange={(e) => set('state', e.target.value)}
                      className={inputClass}
                    >
                      <option value="">Select state…</option>
                      {US_STATES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Default Region</label>
                  <select
                    value={fields.region}
                    onChange={(e) => set('region', e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Select region…</option>
                    {US_REGIONS.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label} (×{r.multiplier.toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* ── Save button ──────────────────────────────────── */}
            <div className="px-6 py-4 flex items-center justify-between">
              {saveError ? (
                <p className="text-sm text-red-600 dark:text-red-400">{saveError}</p>
              ) : (
                <span />
              )}
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
              >
                {saving ? 'Saving…' : 'Save profile'}
              </button>
            </div>

            {/* ── Sign out ─────────────────────────────────────── */}
            <div className="px-6 py-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Sign out</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Sign out of your EstimatorPro account.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="px-4 py-2 rounded-lg border border-red-200 dark:border-red-800 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                Sign out
              </button>
            </div>

          </div>
        </form>
      )}
    </div>
  )
}

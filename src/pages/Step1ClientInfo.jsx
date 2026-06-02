import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEstimate } from '../context/EstimateContext'
import StepProgressBar from '../components/StepProgressBar'
import { US_REGIONS, US_STATES, detectRegion } from '../lib/regions'

const input =
  'w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition'

const labelCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5'

const REQUIRED = ['clientName', 'clientEmail', 'projectAddress', 'city', 'state', 'region']

export default function Step1ClientInfo() {
  const { estimate, updateEstimate } = useEstimate()
  const navigate = useNavigate()

  const [fields, setFields] = useState({
    clientName:     estimate.clientName,
    clientEmail:    estimate.clientEmail,
    clientPhone:    estimate.clientPhone,
    projectAddress: estimate.projectAddress,
    city:           estimate.city,
    state:          estimate.state,
    region:         estimate.region,
  })
  const [errors, setErrors] = useState({})
  // true while region was last set by auto-detection (not manually chosen)
  const [regionAutoDetected, setRegionAutoDetected] = useState(false)

  function applyAutoDetect(state, city, currentFields) {
    const detected = detectRegion(state, city)
    if (detected) {
      setRegionAutoDetected(true)
      return { ...currentFields, region: detected }
    }
    return currentFields
  }

  function handleChange(e) {
    const { name, value } = e.target

    setFields((prev) => {
      let next = { ...prev, [name]: value }

      if (name === 'state') {
        // State change always triggers auto-detection
        next = applyAutoDetect(value, prev.city, next)
      } else if (name === 'city' && prev.state) {
        // City change triggers auto-detection only if state is already set
        next = applyAutoDetect(prev.state, value, next)
      } else if (name === 'region') {
        // Manual region change clears the auto-detected badge
        setRegionAutoDetected(false)
      }

      return next
    })

    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: false }))
  }

  function validate() {
    const next = {}
    REQUIRED.forEach((key) => {
      if (!fields[key].trim()) next[key] = true
    })
    if (fields.clientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.clientEmail)) {
      next.clientEmail = true
    }
    return next
  }

  function handleNext() {
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    updateEstimate(fields)
    navigate('/new-estimate/2')
  }

  const selectedRegion = US_REGIONS.find((r) => r.id === fields.region)

  return (
    <div className="max-w-2xl mx-auto">
      <StepProgressBar current={1} />

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-8">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
          Client Information
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
          Enter the client and project location details.
        </p>

        <div className="space-y-6">
          {/* ── Client details ─────────────────────────────────── */}
          <div className="grid grid-cols-1 gap-5">
            <div>
              <label className={labelCls}>
                Client Name <span className="text-red-500">*</span>
              </label>
              <input
                name="clientName"
                value={fields.clientName}
                onChange={handleChange}
                placeholder="Jane Smith"
                className={`${input} ${errors.clientName ? 'border-red-400 focus:ring-red-400' : ''}`}
              />
              {errors.clientName && <p className="mt-1 text-xs text-red-500">Required</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>
                  Client Email <span className="text-red-500">*</span>
                </label>
                <input
                  name="clientEmail"
                  type="email"
                  value={fields.clientEmail}
                  onChange={handleChange}
                  placeholder="jane@example.com"
                  className={`${input} ${errors.clientEmail ? 'border-red-400 focus:ring-red-400' : ''}`}
                />
                {errors.clientEmail && (
                  <p className="mt-1 text-xs text-red-500">Valid email required</p>
                )}
              </div>
              <div>
                <label className={labelCls}>Client Phone</label>
                <input
                  name="clientPhone"
                  type="tel"
                  value={fields.clientPhone}
                  onChange={handleChange}
                  placeholder="(555) 000-0000"
                  className={input}
                />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 dark:border-gray-800" />

          {/* ── Project location ───────────────────────────────── */}
          <div className="space-y-5">
            <div>
              <label className={labelCls}>
                Project Address <span className="text-red-500">*</span>
              </label>
              <input
                name="projectAddress"
                value={fields.projectAddress}
                onChange={handleChange}
                placeholder="123 Main St"
                className={`${input} ${errors.projectAddress ? 'border-red-400 focus:ring-red-400' : ''}`}
              />
              {errors.projectAddress && <p className="mt-1 text-xs text-red-500">Required</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>
                  City <span className="text-red-500">*</span>
                </label>
                <input
                  name="city"
                  value={fields.city}
                  onChange={handleChange}
                  placeholder="Springfield"
                  className={`${input} ${errors.city ? 'border-red-400 focus:ring-red-400' : ''}`}
                />
                {errors.city && <p className="mt-1 text-xs text-red-500">Required</p>}
              </div>
              <div>
                <label className={labelCls}>
                  State <span className="text-red-500">*</span>
                </label>
                <select
                  name="state"
                  value={fields.state}
                  onChange={handleChange}
                  className={`${input} ${errors.state ? 'border-red-400 focus:ring-red-400' : ''}`}
                >
                  <option value="">— Select —</option>
                  {US_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                {errors.state && <p className="mt-1 text-xs text-red-500">Required</p>}
              </div>
            </div>

            {/* ── Region ─────────────────────────────────────────── */}
            <div>
              <label className={labelCls}>
                Region <span className="text-red-500">*</span>
              </label>
              <select
                name="region"
                value={fields.region}
                onChange={handleChange}
                className={`${input} ${errors.region ? 'border-red-400 focus:ring-red-400' : ''}`}
              >
                <option value="">— Select region —</option>
                {US_REGIONS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label} ({r.states}) — ×{r.multiplier.toFixed(2)}
                  </option>
                ))}
              </select>
              {errors.region && <p className="mt-1 text-xs text-red-500">Required</p>}

              {/* Auto-detected badge */}
              {selectedRegion && regionAutoDetected && (
                <div className="mt-2 flex items-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-3 py-2">
                  <svg
                    className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8 1a7 7 0 100 14A7 7 0 008 1zm3.28 5.28a.75.75 0 00-1.06-1.06L7 8.44 5.78 7.22a.75.75 0 00-1.06 1.06l1.75 1.75a.75.75 0 001.06 0l3.75-3.75z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-xs text-emerald-700 dark:text-emerald-300">
                    <strong className="font-semibold">{selectedRegion.label}</strong>
                    {' '}region detected —{' '}
                    <strong className="font-semibold">×{selectedRegion.multiplier.toFixed(2)}</strong>
                    {' '}multiplier applied
                    {fields.region === 'sacramento-ca' && (
                      <span className="text-emerald-600/80 dark:text-emerald-400/80">
                        {' '}(base market)
                      </span>
                    )}
                  </span>
                  <span className="ml-auto text-xs text-emerald-600/70 dark:text-emerald-400/60 whitespace-nowrap">
                    Override below ↑
                  </span>
                </div>
              )}

              {/* Manual selection — show neutral multiplier info */}
              {selectedRegion && !regionAutoDetected && (
                <div className="mt-2 flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400">
                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M8 1a7 7 0 100 14A7 7 0 008 1zm.75 4.25a.75.75 0 00-1.5 0v3.5l2.25 2.25a.75.75 0 001.06-1.06L8.75 8.19V5.25z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Cost multiplier{' '}
                  <strong className="font-semibold">×{selectedRegion.multiplier.toFixed(2)}</strong>
                  {' '}will be applied to all material and labor costs.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────────────── */}
        <div className="flex justify-end mt-8 pt-6 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={handleNext}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-semibold transition-colors"
          >
            Next
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

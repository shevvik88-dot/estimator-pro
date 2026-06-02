import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEstimate } from '../context/EstimateContext'
import StepProgressBar from '../components/StepProgressBar'
import { US_REGIONS } from '../lib/regions'
import { getConfig, computeLineItems } from '../lib/measurementConfigs'

const inputBase =
  'w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition'

const labelCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5'

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

// ── Field renderers ────────────────────────────────────────────────────────

function NumberField({ field, value, onChange, hasError }) {
  return (
    <div className="relative">
      <input
        type="number"
        min="0"
        value={value ?? ''}
        onChange={(e) => onChange(field.key, e.target.value)}
        placeholder="0"
        className={`${inputBase} ${field.unit ? 'pr-14' : ''} ${hasError ? 'border-red-400 focus:ring-red-400' : ''}`}
      />
      {field.unit && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400 dark:text-gray-500 pointer-events-none">
          {field.unit}
        </span>
      )}
    </div>
  )
}

function SelectField({ field, value, onChange }) {
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(field.key, e.target.value)}
      className={inputBase}
    >
      <option value="">— Select —</option>
      {field.options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  )
}

function ToggleField({ field, value, onChange }) {
  return (
    <div className="flex gap-2">
      {['Yes', 'No'].map((label) => {
        const optVal = label.toLowerCase()
        const active = value === optVal
        return (
          <button
            key={label}
            type="button"
            onClick={() => onChange(field.key, active ? '' : optVal)}
            className={[
              'px-5 py-2 rounded-lg text-sm font-medium border-2 transition-all',
              active
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600',
            ].join(' ')}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

function SegmentField({ field, value, onChange }) {
  return (
    <div className="flex gap-2">
      {field.options.map((opt) => {
        const active = value === opt
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(field.key, active ? '' : opt)}
            className={[
              'px-5 py-2 rounded-lg text-sm font-medium border-2 transition-all',
              active
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600',
            ].join(' ')}
          >
            {opt}
          </button>
        )
      })}
    </div>
  )
}

function FieldRow({ field, value, onChange, hasError }) {
  // Computed fields are summary-only — no input rendered here
  if (field.type === 'computed') return null

  return (
    <div>
      <label className={labelCls}>
        {field.label}
        {field.unit && (
          <span className="ml-1.5 text-xs font-normal text-gray-400 dark:text-gray-500">({field.unit})</span>
        )}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {field.type === 'number'   && <NumberField  field={field} value={value} onChange={onChange} hasError={hasError} />}
      {field.type === 'select'   && <SelectField  field={field} value={value} onChange={onChange} />}
      {field.type === 'toggle'   && <ToggleField  field={field} value={value} onChange={onChange} />}
      {field.type === 'segment'  && <SegmentField field={field} value={value} onChange={onChange} />}

      {hasError && <p className="mt-1 text-xs text-red-500">Required</p>}

      {field.hint && (
        <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500 leading-relaxed">{field.hint}</p>
      )}
    </div>
  )
}

// ── Summary panel ──────────────────────────────────────────────────────────

function SummaryPanel({ config, measurements, region }) {
  const multiplier = region?.multiplier ?? 1.0
  const lineItems = computeLineItems(config, measurements, multiplier)
  const baseSubtotal = lineItems.reduce((s, i) => s + i.baseAmount, 0)
  const total = baseSubtotal * multiplier
  const adjustment = total - baseSubtotal
  const showAdj = multiplier !== 1.0 && baseSubtotal > 0

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 sticky top-8">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-0.5">
          Running Estimate
        </p>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{config.name}</p>
      </div>

      {lineItems.length === 0 ? (
        <div className="py-8 text-center">
          <svg className="w-8 h-8 mx-auto mb-2 text-gray-200 dark:text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a1 1 0 001-1V6a1 1 0 00-1-1H4a1 1 0 00-1 1v12a1 1 0 001 1z" />
          </svg>
          <p className="text-xs text-gray-400 dark:text-gray-500">Fill in measurements to see estimate</p>
        </div>
      ) : (
        <>
          <div className="space-y-2.5 mb-4">
            {lineItems.map((item) => (
              <div key={item.label}>
                <div className="flex justify-between items-baseline gap-2">
                  <span className="text-xs text-gray-600 dark:text-gray-400 leading-tight">{item.label}</span>
                  <span className="text-xs font-semibold text-gray-900 dark:text-white shrink-0">
                    {fmt(item.baseAmount)}
                  </span>
                </div>
                {item.qty && (
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {item.qty} {item.unit} × ${item.baseRate.toFixed(2)}
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="border-t border-gray-100 dark:border-gray-800 pt-3 space-y-1.5">
            {showAdj ? (
              <>
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>Subtotal (base rates)</span>
                  <span>{fmt(baseSubtotal)}</span>
                </div>
                <div className="flex justify-between text-xs text-indigo-600 dark:text-indigo-400">
                  <span>{region.label} ×{multiplier.toFixed(2)}</span>
                  <span>+{fmt(adjustment)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-gray-900 dark:text-white pt-1 border-t border-gray-100 dark:border-gray-800">
                  <span>Estimate Total</span>
                  <span>{fmt(total)}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between text-sm font-bold text-gray-900 dark:text-white">
                <span>Estimate Total</span>
                <span>{fmt(total)}</span>
              </div>
            )}
          </div>
        </>
      )}

      <p className="mt-4 text-xs text-gray-400 dark:text-gray-500 leading-relaxed border-t border-gray-100 dark:border-gray-800 pt-3">
        Base rates only. Final quote includes permits, markup, and project-specific adjustments.
      </p>

      {region && (
        <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
          <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 16 16">
            <path fillRule="evenodd" d="M8 1a7 7 0 100 14A7 7 0 008 1zm.75 4.25a.75.75 0 00-1.5 0v3.5l2.25 2.25a.75.75 0 001.06-1.06L8.75 8.19V5.25z" clipRule="evenodd" />
          </svg>
          Region: {region.label} (×{multiplier.toFixed(2)})
        </div>
      )}
    </div>
  )
}

// ── Main Step 3 component ──────────────────────────────────────────────────

export default function Step3Measurements() {
  const { estimate, updateEstimate } = useEstimate()
  const navigate = useNavigate()

  const config = getConfig(estimate.workType)
  const region = US_REGIONS.find((r) => r.id === estimate.region)

  const [measurements, setMeasurements] = useState(estimate.measurements ?? {})
  const [errors, setErrors] = useState({})

  function handleChange(key, value) {
    setMeasurements((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: false }))
  }

  function validate() {
    const errs = {}
    config.fields
      .filter((f) => f.required)
      .forEach((f) => {
        const v = measurements[f.key]
        if (!v || (f.type === 'number' && parseFloat(v) <= 0)) errs[f.key] = true
      })
    return errs
  }

  function handleNext() {
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    updateEstimate({ measurements })
    navigate('/new-estimate/4')
  }

  return (
    <div className="max-w-5xl mx-auto">
      <StepProgressBar current={3} />

      <div className="flex gap-6 items-start">
        {/* ── Form ────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-8">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
            {config.title}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
            Enter quantities from your field measurements.
            {estimate.notes && (
              <> Your field notes will be used to personalize line-item descriptions.</>
            )}
          </p>

          {estimate.notes && (
            <div className="mb-7 flex gap-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3">
              <svg className="w-4 h-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" fill="currentColor" viewBox="0 0 16 16">
                <path fillRule="evenodd" d="M8 1a7 7 0 100 14A7 7 0 008 1zm-.75 4a.75.75 0 011.5 0v4a.75.75 0 01-1.5 0V5zm.75 7.5a.875.875 0 100-1.75.875.875 0 000 1.75z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-0.5">Field Observations</p>
                <p className="text-xs text-amber-700/80 dark:text-amber-300/80 leading-relaxed">{estimate.notes}</p>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {config.fields.map((field) => (
              <FieldRow
                key={field.key}
                field={field}
                value={measurements[field.key]}
                onChange={handleChange}
                hasError={!!errors[field.key]}
              />
            ))}
          </div>

          <div className="flex justify-between mt-8 pt-6 border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={() => navigate('/new-estimate/2')}
              className="px-5 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              ← Back
            </button>
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

        {/* ── Summary panel ────────────────────────────────────── */}
        <div className="w-72 shrink-0">
          <SummaryPanel config={config} measurements={measurements} region={region} />
        </div>
      </div>
    </div>
  )
}

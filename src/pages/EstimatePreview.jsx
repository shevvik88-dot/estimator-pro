import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useEstimate } from '../context/EstimateContext'
import { getEstimate, getProfile } from '../lib/db'
import { supabase } from '../lib/supabase'
import { US_REGIONS } from '../lib/regions'

const WORK_TYPE_LABELS = {
  'roof-replacement': 'Roof Replacement',
  'kitchen-remodel': 'Kitchen Remodel',
  'bathroom-remodel': 'Bathroom Remodel',
  'addition': 'Addition',
}

const fmt = (n) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)

const fmtDecimal = (n) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)

function formatDate(dateStr) {
  if (!dateStr) return null
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })
}

export default function EstimatePreview() {
  const { id } = useParams()
  const { estimate: ctxEstimate } = useEstimate()
  const navigate = useNavigate()

  const [dbRow, setDbRow] = useState(null)
  const [loadingDb, setLoadingDb] = useState(!!id)
  const [dbError, setDbError] = useState(null)
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    if (!id) return
    getEstimate(id)
      .then(setDbRow)
      .catch((err) => setDbError(err.message))
      .finally(() => setLoadingDb(false))
  }, [id])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) getProfile(session.user.id).then(setProfile).catch(() => {})
    })
  }, [])

  if (loadingDb) {
    return (
      <div className="min-h-full bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
      </div>
    )
  }

  if (dbError) {
    return (
      <div className="min-h-full bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-red-500 mb-4">{dbError}</p>
          <button onClick={() => navigate('/projects')} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold">
            ← Back to Projects
          </button>
        </div>
      </div>
    )
  }

  // Build a unified estimate/gen shape from DB row or fall back to context
  const estimate = id && dbRow ? {
    clientName:     dbRow.projects?.client_name,
    clientEmail:    dbRow.projects?.client_email,
    clientPhone:    dbRow.projects?.client_phone,
    projectAddress: dbRow.projects?.project_address,
    city:           dbRow.projects?.city,
    state:          dbRow.projects?.state,
    region:         dbRow.projects?.region,
    workType:       dbRow.work_type,
    projectTitle:   dbRow.inputs?.projectTitle,
    startDate:      dbRow.inputs?.startDate,
  } : ctxEstimate

  const gen = id && dbRow ? dbRow.generated_estimate : ctxEstimate.generatedEstimate
  const region = US_REGIONS.find((r) => r.id === estimate.region)

  if (!gen) {
    return (
      <div className="min-h-full bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">No estimate generated yet.</p>
          <button
            onClick={() => navigate('/new-estimate/4')}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            ← Back to Generate
          </button>
        </div>
      </div>
    )
  }

  const baseSubtotal = gen.subtotal
  const multiplier = gen.multiplier || 1
  const computedTotal = Math.round(baseSubtotal * multiplier)
  const adjustment = computedTotal - baseSubtotal
  const showAdj = multiplier !== 1

  const workTypeLabel = WORK_TYPE_LABELS[estimate.workType]
  const estimateTitle = workTypeLabel
    ? `${workTypeLabel.toUpperCase()} ESTIMATE`
    : 'ESTIMATE'

  const cityLabel = estimate.city
    ? estimate.city.charAt(0).toUpperCase() + estimate.city.slice(1).toLowerCase()
    : region?.label

  const backTarget = id ? '/projects' : '/new-estimate/4'

  return (
    <div className="min-h-full bg-gray-50 dark:bg-gray-950 py-8 px-8 print:py-0 print:px-0 print:bg-white">
      <div className="max-w-4xl mx-auto print:max-w-none">

        {/* ── Toolbar ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-6 print:hidden">
          <button
            onClick={() => navigate(backTarget)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
              <path d="M13 8H3M7 4L3 8l4 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {id ? 'Back to Projects' : 'Back'}
          </button>
          {id && (
            <button
              onClick={() => navigate(`/contract/${id}`)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 text-sm font-semibold hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                <path d="M9 2H4a1 1 0 00-1 1v10a1 1 0 001 1h8a1 1 0 001-1V6l-4-4z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M9 2v4h4M5 9h6M5 11.5h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              View Contract
            </button>
          )}
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
              <path d="M4 6V2h8v4M4 12H3a1 1 0 01-1-1V7a1 1 0 011-1h10a1 1 0 011 1v4a1 1 0 01-1 1h-1M4 9h8v5H4V9z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Print / PDF
          </button>
        </div>

        {/* ── Estimate Document ───────────────────────────────── */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden print:rounded-none print:border-0 print:shadow-none">

          {/* Header */}
          <div className="flex justify-between items-start p-8 border-b border-gray-100 dark:border-gray-800">
            <div>
              <span className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">
                {profile?.company_name || 'Your Company'}
              </span>
              {profile?.license_number && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  License {profile.license_number}
                </p>
              )}
              {profile?.phone && (
                <p className="text-xs text-gray-500 dark:text-gray-400">{profile.phone}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-gray-900 dark:text-white tracking-wide uppercase">
                {estimateTitle}
              </p>
              {estimate.startDate && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  Start: {formatDate(estimate.startDate)}
                </p>
              )}
            </div>
          </div>

          {/* Client & project info */}
          <div className="grid grid-cols-2 gap-8 px-8 py-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">Prepared for</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{estimate.clientName}</p>
              {estimate.clientEmail && <p className="text-sm text-gray-500 dark:text-gray-400">{estimate.clientEmail}</p>}
              {estimate.clientPhone && <p className="text-sm text-gray-500 dark:text-gray-400">{estimate.clientPhone}</p>}
              {estimate.projectAddress && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {[estimate.projectAddress, estimate.city, estimate.state].filter(Boolean).join(', ')}
                </p>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">Project</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{estimate.projectTitle || gen.title}</p>
              {region && (
                <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
                  {region.label} region — ×{gen.multiplier?.toFixed(2)} cost multiplier applied
                </p>
              )}
            </div>
          </div>

          {/* Line items */}
          <div className="p-8">
            {gen.sections?.map((section) => (
              <div key={section.name} className="mb-8 last:mb-0">
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    {section.name}
                  </h3>
                  <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                </div>

                <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-4 print:gap-x-2 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2 pb-1 border-b border-gray-100 dark:border-gray-800">
                  <span>Description</span>
                  <span className="text-right w-12">Qty</span>
                  <span className="text-right w-10">Unit</span>
                  <span className="text-right w-20">Rate</span>
                  <span className="text-right w-20">Total</span>
                </div>

                {section.items?.map((item, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-4 print:gap-x-2 py-2.5 border-b border-gray-50 dark:border-gray-800/50 last:border-0"
                  >
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-snug pr-4">
                      {item.description}
                    </p>
                    <span className="text-sm text-gray-500 dark:text-gray-400 text-right w-12 tabular-nums">
                      {item.qty?.toLocaleString() ?? '—'}
                    </span>
                    <span className="text-sm text-gray-400 dark:text-gray-500 text-right w-10">
                      {item.unit ?? ''}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 text-right w-20 tabular-nums">
                      {item.rate != null ? fmtDecimal(item.rate) : '—'}
                    </span>
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200 text-right w-20 tabular-nums">
                      {item.total != null ? fmt(item.total) : '—'}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Exclusions */}
          {gen.exclusions?.length > 0 && (
            <div className="mx-8 mb-6 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-3">
                Exclusions — Not Included in This Estimate
              </p>
              <ul className="space-y-1.5">
                {gen.exclusions.map((ex, i) => (
                  <li key={i} className="flex gap-2 text-sm text-amber-800 dark:text-amber-300">
                    <span className="shrink-0 mt-0.5">•</span>
                    <span className="leading-snug">{ex}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Totals */}
          <div className="px-8 pb-8">
            <div className="ml-auto w-72 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              {showAdj && (
                <>
                  <div className="flex justify-between items-center px-5 py-3 border-b border-gray-100 dark:border-gray-800">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Subtotal (base)</span>
                    <span className="text-sm text-gray-700 dark:text-gray-300 tabular-nums">{fmt(baseSubtotal)}</span>
                  </div>
                  <div className="flex justify-between items-center px-5 py-3 border-b border-gray-100 dark:border-gray-800">
                    <span className="text-sm text-indigo-600 dark:text-indigo-400">
                      Regional adjustment ({cityLabel} ×{gen.multiplier?.toFixed(2)})
                    </span>
                    <span className="text-sm text-indigo-600 dark:text-indigo-400 tabular-nums">+{fmt(adjustment)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between items-center px-5 py-4 bg-gray-50 dark:bg-gray-800/50">
                <span className="text-base font-bold text-gray-900 dark:text-white">Total Price</span>
                <span className="text-xl font-bold text-gray-900 dark:text-white tabular-nums">{fmt(computedTotal)}</span>
              </div>
            </div>

            <p className="text-xs text-gray-400 dark:text-gray-500 mt-4 leading-relaxed">
              This estimate is based on field measurements and observations provided. Final pricing is subject to on-site verification, permit fees, and any scope changes discovered during construction. Valid for 30 days from date of issue.
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}

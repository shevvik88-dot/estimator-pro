import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { SparklesIcon, CheckCircleIcon } from '@heroicons/react/24/solid'
import { useEstimate } from '../context/EstimateContext'
import StepProgressBar from '../components/StepProgressBar'
import { US_REGIONS } from '../lib/regions'
import { getConfig } from '../lib/measurementConfigs'
import { anthropic } from '../lib/anthropic'
import { SYSTEM_PROMPT, buildUserPrompt } from '../lib/buildPrompt'
import { supabase } from '../lib/supabase'
import { saveProject, saveEstimate, getTemplateItems, getUserPrices } from '../lib/db'

// ── Anthropic API call ─────────────────────────────────────────────────────
async function generateEstimate(estimate, templateItems) {
  console.log(`[AI call] workType="${estimate.workType}" | template_items count:`, templateItems.length, templateItems)
  const userPrompt = buildUserPrompt(estimate, templateItems)

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: userPrompt }],
  })

  const rawText = message.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')

  const cleaned = rawText
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()

  return JSON.parse(cleaned)
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function formatMeasurement(field, value) {
  if (field.type === 'computed' || !value) return null
  if (field.type === 'number') {
    const n = parseFloat(value)
    if (!n || n <= 0) return null
    return `${n.toLocaleString()} ${field.unit}`
  }
  if (field.type === 'toggle') return value === 'yes' ? 'Yes' : value === 'no' ? 'No' : null
  return value || null
}

// ── Sub-components ─────────────────────────────────────────────────────────

function SectionLabel({ children }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1 mt-7 first:mt-0">
      {children}
    </p>
  )
}

function ReviewRow({ label, value, mono = false }) {
  if (!value) return null
  return (
    <div className="flex gap-3 py-2.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <span className="text-sm text-gray-400 dark:text-gray-500 w-40 shrink-0 leading-snug">{label}</span>
      <span className={`text-sm text-gray-800 dark:text-gray-200 leading-snug ${mono ? 'font-mono text-xs mt-0.5' : ''}`}>
        {value}
      </span>
    </div>
  )
}

const CHECKLIST = [
  'Itemized estimate with professional descriptions',
  'Contract auto-filled from estimate',
  'Change order template ready',
  'PDF export available',
]

// ── Main component ─────────────────────────────────────────────────────────

export default function Step4Review() {
  const { estimate, updateEstimate } = useEstimate()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [error, setError] = useState(null)
  const [savedEstimateId, setSavedEstimateId] = useState(null)
  const generatingRef = useRef(false)

  const region = US_REGIONS.find((r) => r.id === estimate.region)
  const config = getConfig(estimate.workType)

  const measurementRows = config.fields
    .filter((f) => f.type !== 'computed')
    .map((f) => ({ label: f.label, value: formatMeasurement(f, estimate.measurements?.[f.key]) }))
    .filter((r) => r.value !== null)

  async function handleGenerate() {
    if (generatingRef.current) return
    generatingRef.current = true
    setLoading(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session?.user?.id

      // Fetch matching template items for this work type (silently ignore if unavailable)
      let templateItems = []
      try {
        templateItems = await getTemplateItems(estimate.workType)
        console.log(`[buildPrompt] template_items fetched for "${estimate.workType}":`, templateItems.length, templateItems)
      } catch {
        // non-fatal — proceed without template items
        console.warn(`[buildPrompt] failed to fetch template_items for "${estimate.workType}"`)
      }

      // Apply user's custom price overrides
      if (userId && templateItems.length > 0) {
        try {
          const userPrices = await getUserPrices(userId)
          if (userPrices.length > 0) {
            const priceMap = Object.fromEntries(userPrices.map((p) => [p.template_item_id, p.custom_rate]))
            templateItems = templateItems.map((item) =>
              priceMap[item.id] !== undefined ? { ...item, base_rate: priceMap[item.id] } : item
            )
          }
        } catch {
          // non-fatal — continue with default rates
        }
      }

      const result = await generateEstimate(estimate, templateItems)

      // Post-process: strip baseboard/trim sections unless field notes mention them
      const notesHaveBaseboards = /baseboard/i.test(estimate.notes || '')
      if (!notesHaveBaseboards && result.sections) {
        result.sections = result.sections.filter((s) => !/baseboard|trim/i.test(s.name))
        result.subtotal = result.sections.reduce(
          (sum, s) => sum + (s.items ?? []).reduce((acc, item) => acc + (item.total ?? 0), 0),
          0
        )
      }

      // Post-process: kitchen-specific filters
      console.log('[kitchen filter debug] workType:', estimate.workType)
      if (estimate.workType === 'kitchen-remodel' && result.sections) {
        const m = estimate.measurements ?? {}
        const sinkType = (m.sinkType || '').toLowerCase()
        const sinkNone = !sinkType || sinkType === 'none'
        const sinkHomeowner = sinkType.includes('homeowner')
        const countertopHomeowner = (m.countertopType || '').toLowerCase() === 'homeowner supplied'
        const notesHaveElectrical = /electrical|gfci/i.test(estimate.notes || '')

        console.log('[kitchen filter] measurements.sinkType raw:', m.sinkType)
        console.log('[kitchen filter] sinkType normalized:', sinkType, '| sinkNone:', sinkNone, '| sinkHomeowner:', sinkHomeowner)
        console.log('[kitchen filter] countertopHomeowner:', countertopHomeowner, '| notesHaveElectrical:', notesHaveElectrical)
        console.log('[kitchen filter] sections BEFORE:', result.sections.length, result.sections.map((s) => s.name))

        // Always removed from kitchen estimates regardless of selections
        const alwaysUnwanted = /garbage disposal|air gap|soap dispenser|edge lamination/i
        // Removed only when sink is homeowner-supplied
        const sinkMaterialPattern = /faucet material|sink material/i
        // Removed only when countertop is homeowner-supplied
        const countertopMaterialPattern = /countertop material|countertop slab|\bslab\b/i
        // Removed unless notes mention electrical
        const electricalItemPattern = /gfci|electrical circuit|dedicated circuit/i

        result.sections = result.sections
          // Section-level: remove entire sink section when no sink in scope
          .filter((s) => {
            if (sinkNone && /sink|faucet/i.test(s.name)) {
              console.log('[kitchen filter] removed section (sinkNone):', s.name)
              return false
            }
            return true
          })
          // Section-level: remove entire electrical section unless notes mention it
          .filter((s) => {
            if (!notesHaveElectrical && /electrical/i.test(s.name)) {
              console.log('[kitchen filter] removed section (electrical):', s.name)
              return false
            }
            return true
          })
          // Item-level: single pass over all remaining items
          .map((s) => ({
            ...s,
            items: (s.items ?? []).filter((item) => {
              const desc = item.description || ''
              if (alwaysUnwanted.test(desc)) {
                console.log('[kitchen filter] removed item (alwaysUnwanted):', desc)
                return false
              }
              if (!notesHaveElectrical && electricalItemPattern.test(desc)) {
                console.log('[kitchen filter] removed item (electrical):', desc)
                return false
              }
              if (sinkNone && /sink|faucet/i.test(desc)) {
                console.log('[kitchen filter] removed item (sinkNone stray):', desc)
                return false
              }
              if (sinkHomeowner && sinkMaterialPattern.test(desc)) {
                console.log('[kitchen filter] removed item (sinkHomeowner):', desc)
                return false
              }
              if (countertopHomeowner && countertopMaterialPattern.test(desc)) {
                console.log('[kitchen filter] removed item (countertopHomeowner):', desc)
                return false
              }
              return true
            }),
          }))
          // Drop sections emptied by item-level filtering
          .filter((s) => (s.items ?? []).length > 0)

        console.log('[kitchen filter] sections AFTER:', result.sections.length, result.sections.map((s) => s.name))

        result.subtotal = result.sections.reduce(
          (sum, s) => sum + (s.items ?? []).reduce((acc, item) => acc + (item.total ?? 0), 0),
          0
        )
      }

      updateEstimate({ generatedEstimate: result })

      const computedTotal = Math.round(result.subtotal * (result.multiplier || 1))

      const project = await saveProject({
        user_id: userId,
        client_name: estimate.clientName,
        client_email: estimate.clientEmail || null,
        client_phone: estimate.clientPhone || null,
        project_address: estimate.projectAddress || null,
        city: estimate.city || null,
        state: estimate.state || null,
        region: estimate.region || null,
        region_multiplier: result.multiplier || 1.0,
        status: 'draft',
      })

      const saved = await saveEstimate({
        project_id: project.id,
        user_id: userId,
        title: estimate.projectTitle || result.title,
        work_type: estimate.workType,
        inputs: {
          projectTitle: estimate.projectTitle,
          startDate: estimate.startDate,
          measurements: estimate.measurements,
          notes: estimate.notes,
        },
        generated_estimate: result,
        subtotal: result.subtotal,
        multiplier: result.multiplier || 1.0,
        total: computedTotal,
        version: 1,
      })

      setSavedEstimateId(saved.id)
      setGenerated(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed. Check your API key and try again.')
    } finally {
      generatingRef.current = false
      setLoading(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      <StepProgressBar current={4} />

      <div className="flex gap-6 items-start">

        {/* ── LEFT: Project Summary ──────────────────────────────── */}
        <div className="flex-1 min-w-0 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-8">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
            Review Estimate
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
            Confirm all details before generating.
          </p>

          {/* Client */}
          <SectionLabel>Client</SectionLabel>
          <div>
            <ReviewRow label="Name" value={estimate.clientName} />
            <ReviewRow label="Email" value={estimate.clientEmail} />
            <ReviewRow label="Phone" value={estimate.clientPhone} />
            <ReviewRow
              label="Project Address"
              value={
                [estimate.projectAddress, estimate.city, estimate.state]
                  .filter(Boolean).join(', ')
              }
            />
            <ReviewRow
              label="Region"
              value={region ? `${region.label} — ×${region.multiplier.toFixed(2)} cost multiplier` : null}
            />
          </div>

          {/* Project */}
          <SectionLabel>Project</SectionLabel>
          <div>
            <ReviewRow label="Work Type"     value={config.name} />
            <ReviewRow label="Project Title" value={estimate.projectTitle} />
            <ReviewRow label="Start Date"    value={formatDate(estimate.startDate)} />
          </div>

          {/* Measurements */}
          {measurementRows.length > 0 && (
            <>
              <SectionLabel>Measurements</SectionLabel>
              <div>
                {measurementRows.map(({ label, value }) => (
                  <ReviewRow key={label} label={label} value={value} />
                ))}
              </div>
            </>
          )}

          {/* Field observations */}
          {estimate.notes && (
            <>
              <SectionLabel>Field Observations</SectionLabel>
              <div className="mt-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3.5">
                <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed whitespace-pre-wrap">
                  {estimate.notes}
                </p>
              </div>
            </>
          )}

          {/* Back */}
          <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={() => navigate('/new-estimate/3')}
              className="px-5 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              ← Back
            </button>
          </div>
        </div>

        {/* ── RIGHT: Generate Panel ──────────────────────────────── */}
        <div className="w-72 shrink-0 sticky top-8 flex flex-col gap-4">

          {/* Checklist card */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-4">
              What's included
            </p>
            <ul className="space-y-3">
              {CHECKLIST.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircleIcon className="w-4 h-4 mt-0.5 shrink-0 text-indigo-500 dark:text-indigo-400" />
                  <span className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Generate / loading / success card */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6">
            {generated ? (
              /* ── Success state ── */
              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-green-600 dark:text-green-400" viewBox="0 0 24 24" fill="none">
                    <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <p className="text-base font-semibold text-gray-900 dark:text-white mb-1.5">
                  Estimate Ready
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-5">
                  Professional line-item descriptions have been generated and saved to your project.
                </p>
                <button
                  onClick={() => navigate(`/estimate/preview/${savedEstimateId}`)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 active:bg-green-800 text-white text-sm font-semibold transition-colors"
                >
                  View Estimate
                  <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            ) : loading ? (
              /* ── Loading state ── */
              <div className="text-center py-4">
                <div className="relative w-12 h-12 mx-auto mb-4">
                  <svg className="w-12 h-12 animate-spin text-indigo-200 dark:text-indigo-900" viewBox="0 0 48 48" fill="none">
                    <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" />
                  </svg>
                  <svg className="absolute inset-0 w-12 h-12 animate-spin text-indigo-600 dark:text-indigo-400" style={{ animationDuration: '0.75s' }} viewBox="0 0 48 48" fill="none">
                    <path d="M24 4a20 20 0 0120 20" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Generating your estimate...
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Writing professional descriptions for each line item
                </p>
              </div>
            ) : (
              /* ── Idle state ── */
              <>
                <button
                  onClick={handleGenerate}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-bold transition-colors shadow-sm shadow-indigo-200 dark:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <SparklesIcon className="w-4 h-4" />
                  Generate Estimate
                </button>
                <p className="mt-3 text-xs text-center text-gray-400 dark:text-gray-500 leading-relaxed">
                  AI will use your measurements and field notes to write professional line-item descriptions
                </p>
                {error && (
                  <div className="mt-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2.5">
                    <p className="text-xs text-red-700 dark:text-red-300 leading-relaxed">{error}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

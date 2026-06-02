import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  HomeIcon,
  FireIcon,
  BeakerIcon,
  Squares2X2Icon,
  RectangleGroupIcon,
  RectangleStackIcon,
  PaintBrushIcon,
  SunIcon,
  HomeModernIcon,
  EllipsisHorizontalCircleIcon,
} from '@heroicons/react/24/outline'
import { useEstimate } from '../context/EstimateContext'
import StepProgressBar from '../components/StepProgressBar'

const WORK_TYPES = [
  { id: 'roof-replacement',  label: 'Roof Replacement',   Icon: HomeIcon },
  { id: 'kitchen-remodel',   label: 'Kitchen Remodel',    Icon: FireIcon },
  { id: 'bathroom-remodel',  label: 'Bathroom Remodel',   Icon: BeakerIcon },
  { id: 'lvp-flooring',      label: 'LVP Flooring',       Icon: Squares2X2Icon },
  { id: 'windows-doors',     label: 'Windows & Doors',    Icon: RectangleGroupIcon },
  { id: 'drywall',           label: 'Drywall',            Icon: RectangleStackIcon },
  { id: 'exterior-paint',    label: 'Exterior Paint',     Icon: PaintBrushIcon },
  { id: 'patio-hardscape',   label: 'Patio / Hardscape',  Icon: SunIcon },
  { id: 'adu',               label: 'ADU',                Icon: HomeModernIcon },
  { id: 'other',             label: 'Other',              Icon: EllipsisHorizontalCircleIcon },
]

const input =
  'w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition'

const label = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5'

function autoTitle(workTypeId, clientName) {
  const wt = WORK_TYPES.find((t) => t.id === workTypeId)
  return wt && clientName ? `${clientName} – ${wt.label}` : ''
}

export default function Step2Project() {
  const { estimate, updateEstimate } = useEstimate()
  const navigate = useNavigate()

  const [fields, setFields] = useState({
    workType:     estimate.workType,
    projectTitle: estimate.projectTitle,
    startDate:    estimate.startDate,
    notes:        estimate.notes,
  })
  const [errors, setErrors] = useState({})
  // track whether title has been manually edited so we don't overwrite
  const titleEdited = useRef(!!estimate.projectTitle)

  function handleSelectWorkType(id) {
    setFields((prev) => {
      const generated = autoTitle(id, estimate.clientName)
      return {
        ...prev,
        workType: id,
        projectTitle:
          !titleEdited.current ? generated : prev.projectTitle,
      }
    })
    if (errors.workType) setErrors((prev) => ({ ...prev, workType: false }))
  }

  function handleChange(e) {
    const { name, value } = e.target
    if (name === 'projectTitle') titleEdited.current = true
    setFields((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: false }))
  }

  function validate() {
    const next = {}
    if (!fields.workType) next.workType = true
    if (!fields.projectTitle.trim()) next.projectTitle = true
    return next
  }

  function handleNext() {
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    updateEstimate(fields)
    navigate('/new-estimate/3')
  }

  const selectedType = WORK_TYPES.find((t) => t.id === fields.workType)

  return (
    <div className="max-w-2xl mx-auto">
      <StepProgressBar current={2} />

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-8">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
          Project Details
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
          Select the type of work and describe the project.
        </p>

        {/* ── Work Type ─────────────────────────────────────────── */}
        <div className="mb-6">
          <p className={label}>
            Work Type <span className="text-red-500">*</span>
          </p>

          <div className="grid grid-cols-3 gap-3">
            {WORK_TYPES.map(({ id, label: wtLabel, Icon }) => {
              const active = fields.workType === id
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleSelectWorkType(id)}
                  className={[
                    'flex flex-col items-center gap-2.5 px-3 py-4 rounded-xl border-2 text-center transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
                    active
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                      : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 dark:hover:text-indigo-400',
                  ].join(' ')}
                >
                  <Icon className="w-7 h-7 shrink-0" />
                  <span className="text-xs font-medium leading-tight">{wtLabel}</span>
                </button>
              )
            })}
          </div>

          {errors.workType && (
            <p className="mt-2 text-xs text-red-500">Please select a work type.</p>
          )}
        </div>

        <div className="border-t border-gray-100 dark:border-gray-800 mb-6" />

        {/* ── Project Title ─────────────────────────────────────── */}
        <div className="mb-5">
          <label className={label}>
            Project Title <span className="text-red-500">*</span>
          </label>
          <input
            name="projectTitle"
            value={fields.projectTitle}
            onChange={handleChange}
            placeholder={
              selectedType && estimate.clientName
                ? autoTitle(selectedType.id, estimate.clientName)
                : 'e.g. Smith Residence – Roof Replacement'
            }
            className={`${input} ${errors.projectTitle ? 'border-red-400 focus:ring-red-400' : ''}`}
          />
          {errors.projectTitle && (
            <p className="mt-1 text-xs text-red-500">Required</p>
          )}
          {!titleEdited.current && fields.workType && (
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              Auto-filled from client name and work type — feel free to edit.
            </p>
          )}
        </div>

        {/* ── Start Date ────────────────────────────────────────── */}
        <div className="mb-5">
          <label className={label}>Approximate Start Date</label>
          <input
            type="date"
            name="startDate"
            value={fields.startDate}
            onChange={handleChange}
            className={input}
          />
        </div>

        {/* ── Field Notes ───────────────────────────────────────── */}
        <div className="mb-2">
          <label className={label}>Field Observations / Notes</label>
          <textarea
            name="notes"
            value={fields.notes}
            onChange={handleChange}
            rows={4}
            placeholder="e.g. Existing wood shake roofing, visible water damage on north-facing fascia, dry rot on two window frames, second-story access only by extension ladder..."
            className={`${input} resize-none leading-relaxed`}
          />
          <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
            These observations will be used to personalize line-item descriptions in the estimate.
          </p>
        </div>

        {/* ── Footer ────────────────────────────────────────────── */}
        <div className="flex justify-between mt-8 pt-6 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={() => navigate('/new-estimate/1')}
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
    </div>
  )
}

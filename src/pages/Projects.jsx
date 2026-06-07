import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getProjects, deleteEstimate, deleteProject } from '../lib/db'
import { useEstimate } from '../context/EstimateContext'

const WORK_TYPE_LABELS = {
  'roof-replacement': 'Roof Replacement',
  'kitchen-remodel':  'Kitchen Remodel',
  'bathroom-remodel': 'Bathroom Remodel',
  'lvp-flooring':     'LVP Flooring',
  'windows-doors':    'Windows & Doors',
  'drywall':          'Drywall',
  'exterior-paint':   'Exterior Paint',
  'patio-hardscape':  'Patio / Hardscape',
  'adu':              'ADU',
  'addition':         'Addition',
  'other':            'Other',
}

const STATUS_STYLES = {
  draft:    'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  sent:     'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  complete: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
}

const fmt = (n) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

export default function Projects() {
  const navigate = useNavigate()
  const { updateEstimate } = useEstimate()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null) // { estimateId: string|null, projectId: string }

  async function handleDelete() {
    const { estimateId, projectId } = confirmDelete
    setConfirmDelete(null)
    setProjects(prev => prev.filter(p => p.id !== projectId))
    try {
      if (estimateId) {
        await deleteEstimate(estimateId)
      } else {
        await deleteProject(projectId)
      }
    } catch (err) {
      console.error('Delete failed:', err)
    }
  }

  function handleGenerateEstimate(project) {
    updateEstimate({
      clientName:     project.client_name || '',
      clientEmail:    project.client_email || '',
      clientPhone:    project.client_phone || '',
      projectAddress: project.project_address || '',
      city:           project.city || '',
      state:          project.state || '',
      region:         project.region || '',
    })
    navigate('/new-estimate/1', { state: { skipReset: true } })
  }

  useEffect(() => {
    async function load() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const data = await getProjects(session?.user?.id)
        setProjects(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Projects</h1>
        <Link
          to="/new-estimate/1"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors"
        >
          + New Estimate
        </Link>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-24">
          <div className="w-6 h-6 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {!loading && !error && projects.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-gray-400" viewBox="0 0 24 24" fill="none">
              <path d="M3 7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" stroke="currentColor" strokeWidth="1.5" />
              <path d="M8 12h8M8 16h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <p className="text-base font-medium text-gray-900 dark:text-white mb-1">No projects yet</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Create your first estimate to get started.
          </p>
          <Link
            to="/new-estimate/1"
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors"
          >
            Create first estimate
          </Link>
        </div>
      )}

      {!loading && !error && projects.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => {
            const latestEstimate = project.estimates?.[0]
            const workTypeLabel = WORK_TYPE_LABELS[latestEstimate?.work_type] ?? latestEstimate?.work_type ?? '—'
            const statusStyle = STATUS_STYLES[project.status] ?? STATUS_STYLES.draft
            const previewPath = latestEstimate
              ? `/estimate/preview/${latestEstimate.id}`
              : null

            const address = [project.project_address, project.city, project.state]
              .filter(Boolean).join(', ')

            return (
              <div
                key={project.id}
                className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col"
              >
                {/* Card header */}
                <div className="px-5 pt-5 pb-4 flex-1">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <p className="text-base font-semibold text-gray-900 dark:text-white leading-snug">
                      {project.client_name}
                    </p>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${statusStyle}`}>
                        {project.status}
                      </span>
                      <button
                        onClick={() => setConfirmDelete({ estimateId: latestEstimate?.id ?? null, projectId: project.id })}
                        className="p-1 rounded text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                          <path d="M2 4h12M6 4V2.5a.5.5 0 01.5-.5h3a.5.5 0 01.5.5V4M5 4l.5 9h5L11 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mb-1">
                    {workTypeLabel}
                  </p>

                  {address && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-snug mb-3">
                      {address}
                    </p>
                  )}

                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {formatDate(project.created_at)}
                    </span>
                    {latestEstimate?.total != null && (
                      <span className="text-base font-bold text-gray-900 dark:text-white tabular-nums">
                        {fmt(latestEstimate.total)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card footer */}
                <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800">
                  {previewPath ? (
                    <Link
                      to={previewPath}
                      className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      View estimate →
                    </Link>
                  ) : (
                    <button
                      onClick={() => handleGenerateEstimate(project)}
                      className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      Generate Estimate →
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl p-6 w-full max-w-sm mx-4">
            <p className="text-base font-semibold text-gray-900 dark:text-white mb-1">Delete this estimate?</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">This cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

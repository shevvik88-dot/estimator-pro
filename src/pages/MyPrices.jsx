import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { getPriceOverrides, upsertPriceOverrides, deletePriceOverrides } from '../lib/db'
import { MEASUREMENT_CONFIGS } from '../lib/measurementConfigs'

// ── Derive priceable items from MEASUREMENT_CONFIGS ────────────────────────
// Skip 'computed' fields (rate depends on a select value) and '__default'.
// Namespace keys as `{workTypeId}_{fieldKey}` to avoid collisions.
const PRICE_GROUPS = Object.entries(MEASUREMENT_CONFIGS)
  .filter(([id]) => id !== '__default')
  .map(([workTypeId, config]) => ({
    workTypeId,
    name: config.name,
    items: config.fields
      .filter((f) => f.type !== 'computed' && f.rate !== undefined)
      .map((f) => ({
        key: `${workTypeId}_${f.key}`,
        label: f.rateLabel,
        unit: f.flat ? 'flat fee' : (f.unit ?? ''),
        defaultRate: f.rate,
      })),
  }))
  .filter((g) => g.items.length > 0)

const fmt = (n) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)

export default function MyPrices() {
  const [overrides, setOverrides] = useState({}) // { item_key: string }
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [error, setError] = useState(null)
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
        const rows = await getPriceOverrides(session.user.id)
        const map = {}
        rows.forEach((r) => { map[r.item_key] = String(r.custom_rate) })
        setOverrides(map)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function setRate(key, value) {
    setOverrides((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session.user.id

      const toUpsert = []
      const toDelete = []

      for (const group of PRICE_GROUPS) {
        for (const item of group.items) {
          const val = overrides[item.key]
          const num = parseFloat(val)
          if (val && val.trim() !== '' && !isNaN(num) && num >= 0) {
            toUpsert.push({
              user_id: userId,
              item_key: item.key,
              custom_rate: num,
              unit: item.unit,
              label: item.label,
            })
          } else if (val === '') {
            toDelete.push(item.key)
          }
        }
      }

      await upsertPriceOverrides(toUpsert)
      await deletePriceOverrides(userId, toDelete)
      showToast('Prices saved')
    } catch (err) {
      setError(err.message)
      showToast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl">

      {/* ── Toast ─────────────────────────────────────────────── */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl text-white text-sm font-medium shadow-lg ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 16 16" fill="none">
            {toast.type === 'error'
              ? <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              : <path d="M3 8l3.5 3.5L13 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
          </svg>
          {toast.message}
        </div>
      )}

      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 mb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">My Prices</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Override default rates used when generating estimates. Leave blank to use the default.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="w-full md:w-auto px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
        >
          {saving ? 'Saving…' : 'Save prices'}
        </button>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-6 h-6 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {PRICE_GROUPS.map((group) => (
            <div
              key={group.workTypeId}
              className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden"
            >
              {/* Section header */}
              <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/30">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  {group.name}
                </p>
              </div>

              {/* Column headers — desktop only */}
              <div className="hidden md:grid grid-cols-[1fr_5rem_6rem_7rem] gap-x-4 px-5 py-2 border-b border-gray-100 dark:border-gray-800">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Description</span>
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 text-center">Unit</span>
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 text-right">Default</span>
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 text-right">Your Rate</span>
              </div>

              {/* Rate rows */}
              {group.items.map((item, i) => {
                const hasOverride = overrides[item.key] !== undefined && overrides[item.key] !== ''
                const borderClass = i < group.items.length - 1 ? 'border-b border-gray-50 dark:border-gray-800/60' : ''
                const inputClass = `pl-5 pr-2 py-1.5 rounded-lg border text-sm text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                  hasOverride
                    ? 'border-indigo-300 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-gray-900 dark:text-white'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600'
                }`
                return (
                  <div key={item.key} className={`px-5 py-3 ${borderClass}`}>

                    {/* Mobile card layout */}
                    <div className="md:hidden flex flex-col gap-1.5">
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-snug">
                        {item.label}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        Default: {fmt(item.defaultRate)}{item.unit ? ` / ${item.unit}` : ''}
                      </p>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-gray-500 pointer-events-none">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={overrides[item.key] ?? ''}
                          onChange={(e) => setRate(item.key, e.target.value)}
                          placeholder={String(item.defaultRate)}
                          className={`w-full ${inputClass}`}
                        />
                      </div>
                    </div>

                    {/* Desktop table layout */}
                    <div className="hidden md:grid grid-cols-[1fr_5rem_6rem_7rem] gap-x-4 items-center">
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-snug">
                        {item.label}
                      </p>
                      <p className="text-sm text-gray-400 dark:text-gray-500 text-center">
                        {item.unit || '—'}
                      </p>
                      <p className="text-sm text-gray-400 dark:text-gray-500 text-right tabular-nums">
                        {fmt(item.defaultRate)}
                      </p>
                      <div className="flex justify-end">
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-gray-500 pointer-events-none">$</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={overrides[item.key] ?? ''}
                            onChange={(e) => setRate(item.key, e.target.value)}
                            placeholder={String(item.defaultRate)}
                            className={`w-24 ${inputClass}`}
                          />
                        </div>
                      </div>
                    </div>

                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}

      {/* ── Footer save ───────────────────────────────────────── */}
      {!loading && (
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full md:w-auto px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
          >
            {saving ? 'Saving…' : 'Save prices'}
          </button>
        </div>
      )}
    </div>
  )
}

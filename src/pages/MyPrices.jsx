import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import {
  getDistinctCategories,
  getTemplateItemsByCategory,
  getUserPrices,
  upsertUserPrices,
  deleteUserPrices,
} from '../lib/db'

const fmt = (n) =>
  n != null
    ? new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(n)
    : '—'

const inputCls = (hasValue) =>
  `w-24 pl-5 pr-2 py-1.5 rounded-lg border text-sm text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
    hasValue
      ? 'border-indigo-300 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-gray-900 dark:text-white'
      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600'
  }`

function CategoryCard({ category, items, customRates, onRateChange, onRemove }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/30">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {category}
        </p>
        <button
          onClick={onRemove}
          className="text-xs text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
        >
          Remove
        </button>
      </div>

      <div className="hidden md:grid grid-cols-[1fr_5rem_6rem_7rem] gap-x-4 px-5 py-2 border-b border-gray-100 dark:border-gray-800">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Item</span>
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 text-center">Unit</span>
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 text-right">Default</span>
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 text-right">Your Rate</span>
      </div>

      {items.length === 0 ? (
        <div className="px-5 py-4 text-sm text-gray-400 dark:text-gray-500">No items in this category.</div>
      ) : (
        items.map((item, i) => {
          const val = customRates[item.id] ?? ''
          const hasValue = val.trim() !== ''
          const rate = item.base_rate ?? item.labor_rate ?? item.material_rate
          const border = i < items.length - 1 ? 'border-b border-gray-50 dark:border-gray-800/60' : ''
          return (
            <div key={item.id} className={`px-5 py-3 ${border}`}>
              {/* Desktop */}
              <div className="hidden md:grid grid-cols-[1fr_5rem_6rem_7rem] gap-x-4 items-center">
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-snug">{item.name}</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center">{item.unit || '—'}</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 text-right tabular-nums">{fmt(rate)}</p>
                <div className="flex justify-end">
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-gray-500 pointer-events-none">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={val}
                      onChange={(e) => onRateChange(item.id, e.target.value)}
                      placeholder={rate != null ? String(rate) : ''}
                      className={inputCls(hasValue)}
                    />
                  </div>
                </div>
              </div>
              {/* Mobile */}
              <div className="md:hidden flex flex-col gap-1.5">
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-snug">{item.name}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Default: {fmt(rate)}{item.unit ? ` / ${item.unit}` : ''}
                </p>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-gray-500 pointer-events-none">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={val}
                    onChange={(e) => onRateChange(item.id, e.target.value)}
                    placeholder={rate != null ? String(rate) : ''}
                    className={`w-full ${inputCls(hasValue)}`}
                  />
                </div>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}

function AddCategoryDropdown({ available, loadingCategory, onSelect, show, onToggle, wrapperRef, variant = 'default' }) {
  const buttonCls = variant === 'primary'
    ? 'inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors'
    : 'inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-500 dark:text-gray-400 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors'

  return (
    <div ref={wrapperRef} className="relative inline-block">
      <button onClick={onToggle} className={buttonCls}>
        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
          <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        Add Work Type
      </button>
      {show && (
        <div className="absolute left-0 top-full mt-1 w-72 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg z-20 overflow-hidden">
          {available.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-400 dark:text-gray-500">All categories already added.</p>
          ) : (
            <div className="max-h-64 overflow-y-auto py-1">
              {available.map((cat) => (
                <button
                  key={cat}
                  onClick={() => onSelect(cat)}
                  disabled={loadingCategory === cat}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-between disabled:opacity-50"
                >
                  <span>{cat}</span>
                  {loadingCategory === cat && (
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function MyPrices() {
  const [allCategories, setAllCategories] = useState([])
  const [addedCategories, setAddedCategories] = useState([])
  const [categoryItems, setCategoryItems] = useState({})
  const [customRates, setCustomRates] = useState({})
  const [userId, setUserId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadingCategory, setLoadingCategory] = useState(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [toast, setToast] = useState(null)
  const [error, setError] = useState(null)
  const dropdownRef = useRef(null)
  const toastTimer = useRef(null)

  function showToast(msg, type = 'success') {
    clearTimeout(toastTimer.current)
    setToast({ msg, type })
    toastTimer.current = setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    if (!showDropdown) return
    function onMouseDown(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [showDropdown])

  useEffect(() => {
    async function load() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { setLoading(false); return }
        const uid = session.user.id
        setUserId(uid)

        const [categories, prices] = await Promise.all([
          getDistinctCategories(),
          getUserPrices(uid),
        ])
        setAllCategories(categories)

        if (prices.length > 0) {
          const rateMap = {}
          prices.forEach((p) => { rateMap[p.template_item_id] = String(p.custom_rate) })
          setCustomRates(rateMap)

          // Resolve which categories are active by looking up those template item IDs
          const { data: priceItems, error: piErr } = await supabase
            .from('template_items')
            .select('id, category')
            .in('id', prices.map((p) => p.template_item_id))
          if (piErr) throw piErr

          const uniqueCats = [...new Set(priceItems.map((item) => item.category))]

          const itemsMap = {}
          await Promise.all(uniqueCats.map(async (cat) => {
            itemsMap[cat] = await getTemplateItemsByCategory(cat)
          }))
          setAddedCategories(uniqueCats)
          setCategoryItems(itemsMap)
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function handleAddCategory(cat) {
    setShowDropdown(false)
    if (addedCategories.includes(cat)) return
    setLoadingCategory(cat)
    try {
      const items = await getTemplateItemsByCategory(cat)
      setCategoryItems((prev) => ({ ...prev, [cat]: items }))
      setAddedCategories((prev) => [...prev, cat])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoadingCategory(null)
    }
  }

  function handleRemoveCategory(cat) {
    setAddedCategories((prev) => prev.filter((c) => c !== cat))
    setCategoryItems((prev) => {
      const next = { ...prev }
      delete next[cat]
      return next
    })
  }

  async function handleSave() {
    if (!userId) return
    setSaving(true)
    setError(null)
    try {
      const currentItems = addedCategories.flatMap((cat) => categoryItems[cat] ?? [])
      const currentItemIds = new Set(currentItems.map((item) => item.id))

      const toUpsert = []
      const toDelete = []

      for (const item of currentItems) {
        const val = (customRates[item.id] ?? '').trim()
        const num = parseFloat(val)
        if (val !== '' && !isNaN(num) && num >= 0) {
          toUpsert.push({ user_id: userId, template_item_id: item.id, custom_rate: num })
        } else {
          toDelete.push(item.id)
        }
      }

      // Clean up prices from any removed categories
      const existing = await getUserPrices(userId)
      existing.forEach((p) => {
        if (!currentItemIds.has(p.template_item_id)) toDelete.push(p.template_item_id)
      })

      await Promise.all([
        upsertUserPrices(toUpsert),
        deleteUserPrices(userId, toDelete),
      ])
      showToast('Prices saved')
    } catch (err) {
      setError(err.message)
      showToast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const availableCategories = allCategories.filter((cat) => !addedCategories.includes(cat))
  const hasCategories = addedCategories.length > 0

  return (
    <div className="p-4 md:p-8 max-w-3xl">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl text-white text-sm font-medium shadow-lg ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 16 16" fill="none">
            {toast.type === 'error'
              ? <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              : <path d="M3 8l3.5 3.5L13 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
          </svg>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">My Prices</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Override default rates for template items. Leave blank to use the default.
          </p>
        </div>
        {hasCategories && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="shrink-0 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
          >
            {saving ? 'Saving…' : 'Save prices'}
          </button>
        )}
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
      ) : !hasCategories ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-gray-400 dark:text-gray-500" viewBox="0 0 24 24" fill="none">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="text-base font-semibold text-gray-700 dark:text-gray-200 mb-1">No categories added yet</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-6 max-w-xs leading-relaxed">
            Add your first work type to customize rates.
          </p>
          <AddCategoryDropdown
            available={availableCategories}
            loadingCategory={loadingCategory}
            onSelect={handleAddCategory}
            show={showDropdown}
            onToggle={() => setShowDropdown((v) => !v)}
            wrapperRef={dropdownRef}
            variant="primary"
          />
        </div>
      ) : (
        /* Category cards */
        <div className="space-y-6">
          {addedCategories.map((cat) => (
            <CategoryCard
              key={cat}
              category={cat}
              items={categoryItems[cat] ?? []}
              customRates={customRates}
              onRateChange={(id, val) => setCustomRates((prev) => ({ ...prev, [id]: val }))}
              onRemove={() => handleRemoveCategory(cat)}
            />
          ))}

          {/* Add more categories */}
          {availableCategories.length > 0 && (
            <AddCategoryDropdown
              available={availableCategories}
              loadingCategory={loadingCategory}
              onSelect={handleAddCategory}
              show={showDropdown}
              onToggle={() => setShowDropdown((v) => !v)}
              wrapperRef={dropdownRef}
            />
          )}

          {/* Footer save */}
          <div className="flex justify-end pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
            >
              {saving ? 'Saving…' : 'Save prices'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

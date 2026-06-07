import { supabase } from './supabase'

export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  // PGRST116 = no rows found — not an error, just a new user with no profile yet
  if (error && error.code !== 'PGRST116') throw error
  return data
}

export async function upsertProfile(profileData) {
  const { data, error } = await supabase
    .from('profiles')
    .upsert(profileData)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function saveProject(projectData) {
  const { data, error } = await supabase
    .from('projects')
    .insert(projectData)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function saveEstimate(estimateData) {
  const { data, error } = await supabase
    .from('estimates')
    .insert(estimateData)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getProjects(userId) {
  const { data, error } = await supabase
    .from('projects')
    .select('*, estimates(id, title, work_type, total, created_at)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getPriceOverrides(userId) {
  const { data, error } = await supabase
    .from('price_overrides')
    .select('*')
    .eq('user_id', userId)
  if (error) throw error
  return data ?? []
}

export async function upsertPriceOverrides(rows) {
  if (!rows.length) return
  const { error } = await supabase
    .from('price_overrides')
    .upsert(rows, { onConflict: 'user_id,item_key' })
  if (error) throw error
}

export async function deletePriceOverrides(userId, itemKeys) {
  if (!itemKeys.length) return
  const { error } = await supabase
    .from('price_overrides')
    .delete()
    .eq('user_id', userId)
    .in('item_key', itemKeys)
  if (error) throw error
}

export async function getEstimate(estimateId) {
  const { data, error } = await supabase
    .from('estimates')
    .select('*, projects(*)')
    .eq('id', estimateId)
    .single()
  if (error) throw error
  return data
}

export async function deleteEstimate(estimateId) {
  const { error } = await supabase
    .from('estimates')
    .delete()
    .eq('id', estimateId)
  if (error) throw error
}

export async function deleteProject(projectId) {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId)
  if (error) throw error
}

export async function markContractGenerated(estimateId) {
  const { error } = await supabase
    .from('estimates')
    .update({ contract_generated: true })
    .eq('id', estimateId)
  if (error) throw error
}

// Maps work type IDs to their relevant template_items categories
const WORK_TYPE_CATEGORIES = {
  'roof-replacement':  ['ROOF', 'DEMOLITION', 'PROJECT PREPARATION', 'HARDSCAPE | DRIVEWAY | DECK'],
  'lvp-flooring':      ['FLOOR', 'BASEBOARDS'],
  'exterior-paint':    ['EXTERIOR SURFACE RESTORATION'],
  'drywall':           ['INTERIOR SURFACE RESTORATION'],
  'windows-doors':     ['WINDOWS & PATIO DOORS', 'DOORS'],
  'kitchen-remodel':   ['KITCHEN', 'FRAMING| REMODEL', 'PLUMBING', 'ELECTRICAL'],
  'bathroom-remodel':  ['BATHROOM 1', 'BATHROOM 2', 'PLUMBING', 'ELECTRICAL'],
  'patio-hardscape':   ['HARDSCAPE | DRIVEWAY | DECK'],
  'adu':               null, // null = fetch all categories
}

export async function getTemplateItems(workType) {
  if (!(workType in WORK_TYPE_CATEGORIES)) return []

  const categories = WORK_TYPE_CATEGORIES[workType]

  let query = supabase
    .from('template_items')
    .select('name, category, subcategory, unit, base_rate, labor_rate, material_rate, min_amount, notes')
    .order('sort_order')

  if (categories !== null) {
    query = query.in('category', categories)
  }

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

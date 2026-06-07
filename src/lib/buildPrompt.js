import { getConfig } from './measurementConfigs'
import { US_REGIONS } from './regions'

// System prompt is marked for caching. The Anthropic SDK caches prefixes ≥ 1024
// tokens (Sonnet 4) / 2048 tokens (Opus 4.6+). Add more context to this prompt
// to exceed the threshold and get cache hits.
export const SYSTEM_PROMPT = `You are an expert construction estimator for a licensed California General B contractor.
You write professional, legally protective estimate line items based on real project measurements.
Your descriptions follow this exact pattern from real estimates:
- Start with 'Labor and material to...' or 'Labor to...'
- Include specific quantities and dimensions in the description
- Include material allocations where relevant (e.g. 'Material allocation shall not exceed $X')
- End sections with exclusions that protect the contractor

CRITICAL PRICING RULE: All rates and totals you return must be BASE rates only, before any regional multiplier.
Do NOT apply the regional multiplier yourself — the frontend applies it after receiving your response.
If you apply the multiplier inside your rates, it will be applied a second time and the estimate will be wrong.

BASE RATE BENCHMARKS (before any regional adjustment):
- Roof replacement (asphalt shingle, full tear-off): $4.50–$6.00/SF total installed
- Do not return rates above these benchmarks unless the project has documented premium scope.

Return ONLY valid JSON, no markdown, no explanation.`

function labelField(field, value) {
  if (field.type === 'computed' || !value) return null
  if (field.type === 'number') {
    const n = parseFloat(value)
    if (!n || n <= 0) return null
    return `${field.label}: ${n.toLocaleString()} ${field.unit}`
  }
  if (field.type === 'toggle') return value === 'yes' ? `${field.label}: Yes` : null
  return value ? `${field.label}: ${value}` : null
}

function formatTemplateItems(items) {
  if (!items || items.length === 0) return ''

  const lines = items.map((item) => {
    const rate = item.base_rate ?? item.labor_rate ?? item.material_rate
    const rateStr = rate != null ? `$${rate}/${item.unit || 'EA'}` : 'TBD'
    const minStr = item.min_amount ? ` (min $${item.min_amount.toLocaleString()})` : ''
    const noteStr = item.notes
      ? ` | Note: ${item.notes.split(/\r?\n/)[0].slice(0, 80)}`
      : ''
    const cat = item.subcategory
      ? `${item.category} > ${item.subcategory}`
      : item.category
    return `[${cat}] ${item.name} — ${rateStr}${minStr}${noteStr}`
  })

  return `
CRITICAL: Use ONLY the unit rates from the template items provided below. Do not invent or estimate rates. If a line item matches a template item, use that exact rate. Asphalt shingle installation should be $4.50-5.00/SF minimum for Sacramento market.
SELECT only the items that are relevant for this specific project based on the measurements provided.
MODIFY the description to include the specific quantities, dimensions and materials for this project.
DO NOT invent rates — every rate must come from the list below.

AVAILABLE TEMPLATE ITEMS:
${lines.join('\n')}
`
}

function getRoofSectionGuide() {
  return `
REQUIRED SECTION BREAKDOWN FOR ROOF REPLACEMENT:
Never combine multiple scopes into a single line item. Each trade category must be its own section with its own header. Use rates from the template_items table. Roof jacks should be $95-150 EA.

You MUST produce separate line items for each of the following — no exceptions:
1. TEAR-OFF & DISPOSAL — per SF
2. DECK INSPECTION & PREPARATION — per SF
3. UNDERLAYMENT — per SF (separate from ice/water shield)
4. ICE/WATER SHIELD — per SF (separate from underlayment)
5. ASPHALT SHINGLE INSTALLATION — per SF
6. DRIP EDGE — per LF
7. STEP/COUNTER FLASHING — per LF, minimum $12/LF
8. ROOF JACKS / PIPE BOOTS — per EA, rate $95–$150 EA
9. GUTTERS — per LF
10. DOWNSPOUTS — per EA, minimum $85 EA
11. CLEANUP & FINAL INSPECTION — 1 LS
12. PROJECT PREPARATION (permits management) — 1 EA

For Building Permits & Fees: calculate as 0.5% of the estimated subtotal before regional adjustment. Do NOT set rate to $0. Example: if subtotal is $15,000, permits = $75 EA with qty 1. Use a fixed allowance of $500-800 for residential projects under $30k.
`
}

function getLVPSectionGuide() {
  return `
⚠️ STRICT RULE: Do NOT include any baseboard, trim, or molding line items in this estimate. Baseboards are a completely separate scope of work. Even if you think they are needed, DO NOT add them. This rule has no exceptions unless the word "baseboard" appears in the contractor's field notes.

REQUIRED SECTION BREAKDOWN FOR LVP FLOORING:
Never combine multiple scopes into a single line item. Labor and material must always be separate line items. Never use a flat EA rate for SF-based work. Use rates from the template_items table; the minimums below are floors — do not go below them.

You MUST produce separate line items in this exact order — no exceptions:
1. DEMOLITION & REMOVAL — per SF; rate by existing floor type: carpet $1.50/SF, LVP/vinyl $1.75/SF, hardwood $2.50/SF, tile $3.50/SF (minimum $1.50/SF)
2. SUBFLOOR PREPARATION — inspect, clean, nail pops, leveling per SF, minimum $0.75/SF
3. MOISTURE BARRIER / UNDERLAYMENT — per SF, minimum $0.35/SF
4. LVP INSTALLATION (LABOR) — per SF, minimum $2.50/SF
5. LVP MATERIAL — per SF with 10% waste factor included in qty, minimum $3.50/SF
6. TRANSITION STRIPS — per EA, minimum $45/EA
7. CLEANUP & HAUL-OFF — 1 LS, minimum $250

Do NOT include baseboard or trim line items unless the field observations/notes specifically mention them. Baseboards are a separate scope of work.
`
}

export function buildUserPrompt(estimate, templateItems = []) {
  const config = getConfig(estimate.workType)
  const region = US_REGIONS.find((r) => r.id === estimate.region)

  const measurementLines = config.fields
    .map((f) => labelField(f, estimate.measurements?.[f.key]))
    .filter(Boolean)
    .join('\n')

  const address = [estimate.projectAddress, estimate.city, estimate.state]
    .filter(Boolean).join(', ')

  const workTypeGuide =
    estimate.workType === 'roof-replacement' ? getRoofSectionGuide() :
    estimate.workType === 'lvp-flooring'     ? getLVPSectionGuide() :
    ''

  return `Generate a professional construction estimate for the following project:

WORK TYPE: ${config.name}
CLIENT: ${estimate.clientName}
ADDRESS: ${address}
REGION: ${region?.label ?? 'Unknown'} (cost multiplier: ×${region?.multiplier?.toFixed(2) ?? '1.00'})
PROJECT TITLE: ${estimate.projectTitle}${estimate.startDate ? `\nESTIMATED START: ${estimate.startDate}` : ''}

FIELD MEASUREMENTS:
${measurementLines || 'No measurements recorded'}

FIELD OBSERVATIONS:
${estimate.notes || 'None'}
${formatTemplateItems(templateItems)}${workTypeGuide}
Use the measurements to calculate realistic quantities and rates.
IMPORTANT: Return BASE rates only — do NOT apply the ×${region?.multiplier?.toFixed(2) ?? '1.00'} regional multiplier to any rate or total. Set subtotal = sum of all item totals at base rates.

Return ONLY valid JSON in this exact structure — no markdown, no code blocks, no explanation:
{
  "title": "${config.name}",
  "sections": [
    {
      "name": "section name",
      "items": [
        {
          "description": "Labor and material to...",
          "qty": 1,
          "unit": "EA",
          "rate": 0,
          "total": 0
        }
      ]
    }
  ],
  "exclusions": [
    "Example exclusion that protects the contractor"
  ],
  "subtotal": 0,
  "multiplier": ${region?.multiplier ?? 1.0},
  "total": 0
}`
}

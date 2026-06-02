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

export function buildUserPrompt(estimate) {
  const config = getConfig(estimate.workType)
  const region = US_REGIONS.find((r) => r.id === estimate.region)

  const measurementLines = config.fields
    .map((f) => labelField(f, estimate.measurements?.[f.key]))
    .filter(Boolean)
    .join('\n')

  const address = [estimate.projectAddress, estimate.city, estimate.state]
    .filter(Boolean).join(', ')

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

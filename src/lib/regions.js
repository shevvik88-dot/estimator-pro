export const US_REGIONS = [
  { id: 'northeast',      label: 'Northeast',          states: 'CT, ME, MA, NH, NY, RI, VT',       multiplier: 1.25 },
  { id: 'mid-atlantic',   label: 'Mid-Atlantic',        states: 'DE, MD, NJ, PA, DC',               multiplier: 1.15 },
  { id: 'pacific',        label: 'Pacific Coast',       states: 'CA, OR, WA',                       multiplier: 1.20 },
  { id: 'pacific-remote', label: 'Pacific (AK / HI)',   states: 'AK, HI',                           multiplier: 1.35 },
  { id: 'mountain',       label: 'Mountain',            states: 'CO, ID, MT, NV, UT, WY',           multiplier: 1.05 },
  { id: 'midwest',        label: 'Midwest',             states: 'IL, IN, MI, OH, WI',               multiplier: 1.00 },
  { id: 'south-atlantic', label: 'South Atlantic',      states: 'FL, GA, NC, SC, VA, WV',           multiplier: 1.00 },
  { id: 'southwest',      label: 'Southwest',           states: 'AZ, NM, OK, TX',                   multiplier: 1.00 },
  { id: 'great-plains',   label: 'Great Plains',        states: 'IA, KS, MN, MO, NE, ND, SD',      multiplier: 0.95 },
  { id: 'southeast',      label: 'Southeast',           states: 'AL, AR, KY, LA, MS, TN',           multiplier: 0.90 },
  { id: 'sacramento-ca',  label: 'Sacramento, CA',      states: 'CA',                               multiplier: 1.12 },
]

// State → region id (used for auto-detection)
export const STATE_TO_REGION = {
  CA: 'pacific', OR: 'pacific', WA: 'pacific',
  AK: 'pacific-remote', HI: 'pacific-remote',
  NY: 'northeast', NJ: 'northeast', CT: 'northeast',
  MA: 'northeast', ME: 'northeast', NH: 'northeast',
  RI: 'northeast', VT: 'northeast',
  MD: 'mid-atlantic', DE: 'mid-atlantic', PA: 'mid-atlantic', DC: 'mid-atlantic',
  CO: 'mountain', ID: 'mountain', MT: 'mountain',
  NV: 'mountain', UT: 'mountain', WY: 'mountain',
  IL: 'midwest', IN: 'midwest', MI: 'midwest', OH: 'midwest', WI: 'midwest',
  FL: 'south-atlantic', GA: 'south-atlantic', NC: 'south-atlantic',
  SC: 'south-atlantic', VA: 'south-atlantic', WV: 'south-atlantic',
  AZ: 'southwest', NM: 'southwest', OK: 'southwest', TX: 'southwest',
  IA: 'great-plains', KS: 'great-plains', MN: 'great-plains',
  MO: 'great-plains', NE: 'great-plains', ND: 'great-plains', SD: 'great-plains',
  AL: 'southeast', AR: 'southeast', KY: 'southeast',
  LA: 'southeast', MS: 'southeast', TN: 'southeast',
}

// City-level overrides — checked before STATE_TO_REGION
// city must be lowercase-trimmed for matching
export const CITY_OVERRIDES = [
  { city: 'sacramento', state: 'CA', regionId: 'sacramento-ca' },
]

export function detectRegion(state, city) {
  const cityKey = city.trim().toLowerCase()
  const override = CITY_OVERRIDES.find(
    (o) => o.city === cityKey && o.state === state
  )
  if (override) return override.regionId
  return STATE_TO_REGION[state] ?? ''
}

export const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC',
]

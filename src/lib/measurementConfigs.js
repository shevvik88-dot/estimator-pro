// Field types:
//   'number'   — numeric input with unit badge
//   'select'   — dropdown
//   'toggle'   — yes / no buttons
//   'segment'  — labelled multi-choice buttons (e.g. Wall / Ceiling, 1 / 2)
//   'computed' — summary-only, no input rendered; rate is looked up from another field's value
//
// Fields with a `rate` appear in the running estimate.
// `flat: true`  → toggle field where "yes" adds the fixed rate (not qty × rate).
//
// 'computed' fields use:
//   sourceField   — key of the numeric field that provides qty
//   rateField     — key of the select/segment field that determines which rate to use
//   materialRates — { [optionValue]: rate } map
//   defaultRate   — fallback rate when rateField is empty

export const MEASUREMENT_CONFIGS = {
  'roof-replacement': {
    name: 'Roof Replacement',
    title: 'Roof Measurements',
    fields: [
      {
        key: 'roofArea', label: 'Roof Area', unit: 'SF', type: 'number', required: true,
        hint: 'Total surface area across all slopes. Multiply flat footprint × pitch factor (e.g. ×1.15 for 4/12 pitch).',
        rate: 4.50, rateLabel: 'Roofing — labor & materials',
      },
      {
        key: 'existingMaterial', label: 'Existing Roof Material', type: 'select',
        options: ['Wood Shake', 'Asphalt Shingle', 'Tile', 'Metal', 'Unknown'],
        hint: 'Affects demo complexity and disposal cost. Sets the demolition rate in the estimate.',
      },
      {
        // Summary-only: no input rendered. Qty comes from roofArea; rate comes from existingMaterial.
        key: '__roofDemo', type: 'computed',
        rateLabel: 'Demo',
        sourceField: 'roofArea',
        rateField: 'existingMaterial',
        defaultRate: 1.75,
        materialRates: {
          'Asphalt Shingle': 1.50,
          'Wood Shake':      2.00,
          'Tile':            2.50,
          'Metal':           2.00,
          'Unknown':         1.75,
        },
      },
      {
        key: 'guttersLF', label: 'Gutters', unit: 'LF', type: 'number',
        hint: 'Linear feet to replace. Measure at eave line.',
        rate: 8.00, rateLabel: 'Gutters',
      },
      {
        key: 'downspoutsEA', label: 'Downspouts', unit: 'EA', type: 'number',
        hint: 'One per 30–40 LF of gutter is typical.',
        rate: 75, rateLabel: 'Downspouts',
      },
      {
        key: 'roofJacksEA', label: 'Roof Jacks / Vents', unit: 'EA', type: 'number',
        hint: 'Pipe jacks, ridge vents, and attic vents to flash and reseat.',
        rate: 45, rateLabel: 'Roof jacks & vents',
      },
      {
        key: 'chimneyPresent', label: 'Chimney Present?', type: 'toggle',
        hint: 'Adds step flashing and counterflashing around chimney base — typically $350–500.',
        rate: 350, flat: true, rateLabel: 'Chimney flashing',
      },
    ],
  },

  'lvp-flooring': {
    name: 'LVP Flooring',
    title: 'Flooring Measurements',
    fields: [
      {
        key: 'floorAreaSF', label: 'Total Floor Area', unit: 'SF', type: 'number', required: true,
        hint: 'Net square footage of areas receiving new flooring. Add 10% for waste and cuts.',
        rate: 3.25, rateLabel: 'LVP — supply & install',
      },
      {
        key: 'damagedPlanksEA', label: 'Damaged Planks', unit: 'EA', type: 'number',
        hint: 'For partial repair only. Each plank ≈ 4–6 SF. Helps AI decide repair vs. full replace.',
        rate: 22, rateLabel: 'Plank replacement (partial)',
      },
      {
        key: 'roomCount', label: 'Number of Rooms', unit: 'rooms', type: 'number',
        hint: 'Used to estimate furniture moving time and per-room setup cost.',
      },
      {
        key: 'transitionsEA', label: 'Transitions', unit: 'EA', type: 'number',
        hint: 'T-molding or reducer strips where flooring meets different surfaces or thresholds.',
        rate: 45, rateLabel: 'Transition strips',
      },
      {
        key: 'existingFloorType', label: 'Existing Floor Type', type: 'select',
        options: ['LVP', 'Hardwood', 'Tile', 'Carpet', 'Unknown'],
        hint: 'Removal cost and subfloor prep varies by material. Tile has highest removal cost.',
      },
    ],
  },

  'exterior-paint': {
    name: 'Exterior Paint',
    title: 'Exterior Paint Measurements',
    fields: [
      {
        key: 'windowFramesEA', label: 'Window Frames', unit: 'EA', type: 'number', required: true,
        hint: 'Count all exterior-facing window frames to be painted or primed.',
        rate: 85, rateLabel: 'Window frames',
      },
      {
        key: 'garageDoorFramesEA', label: 'Garage Door Frames', unit: 'EA', type: 'number',
        hint: 'Number of garage door openings (not panels).',
        rate: 150, rateLabel: 'Garage door frames',
      },
      {
        key: 'exteriorWallsSF', label: 'Exterior Walls', unit: 'SF', type: 'number',
        hint: 'Total paintable wall surface. Perimeter × eave height, then subtract windows and doors.',
        rate: 1.75, rateLabel: 'Exterior walls',
      },
      {
        key: 'dryRotRepair', label: 'Dry Rot Repair Needed?', type: 'toggle',
        hint: 'Noted from field observations. Adds carpentry scope before paint — confirm extent on-site.',
        rate: 250, flat: true, rateLabel: 'Dry rot repair (allowance)',
      },
      {
        key: 'stories', label: 'Number of Stories', type: 'segment',
        options: ['1', '2'],
        hint: '2-story adds scaffold or lift setup and increases wall labor by ~15%.',
      },
    ],
  },

  'drywall': {
    name: 'Drywall',
    title: 'Drywall Measurements',
    fields: [
      {
        key: 'damagedAreaSF', label: 'Damaged Area', unit: 'SF', type: 'number', required: true,
        hint: 'Square footage of drywall to patch or replace. Round up to nearest sheet (32 SF each).',
        rate: 4.50, rateLabel: 'Drywall repair — labor & materials',
      },
      {
        key: 'sheetsEA', label: 'Full Sheets', unit: 'EA', type: 'number',
        hint: 'Standard 4×8 sheet = 32 SF. Count for full-panel replacements only.',
        rate: 65, rateLabel: 'Full-sheet replacement',
      },
      {
        key: 'location', label: 'Ceiling or Wall?', type: 'segment',
        options: ['Wall', 'Ceiling'],
        hint: 'Ceiling work adds overhead labor — typically 25–35% higher than wall work.',
      },
      {
        key: 'textureMatch', label: 'Texture Match Needed?', type: 'toggle',
        hint: 'Orange peel, knockdown, skip trowel — matching existing finish adds spray or skim time.',
        rate: 125, flat: true, rateLabel: 'Texture match',
      },
      {
        key: 'paintMatch', label: 'Paint Match Needed?', type: 'toggle',
        hint: 'Color-match coat after texture. Required for most insurance-related patches.',
        rate: 95, flat: true, rateLabel: 'Paint match coat',
      },
    ],
  },

  'windows-doors': {
    name: 'Windows & Doors',
    title: 'Windows & Doors Measurements',
    fields: [
      {
        key: 'standardWindowsEA', label: 'Standard Windows', unit: 'EA', type: 'number',
        hint: 'Single or double-hung, 24"–36" wide. Most common residential window.',
        rate: 425, rateLabel: 'Standard windows',
      },
      {
        key: 'narrowWindowsEA', label: 'Narrow Windows', unit: 'EA', type: 'number',
        hint: 'Bathroom or utility windows under 24" wide.',
        rate: 350, rateLabel: 'Narrow windows',
      },
      {
        key: 'slidingGlassDoorsEA', label: 'Sliding Glass Doors', unit: 'EA', type: 'number',
        hint: 'Standard 6-ft or 8-ft patio door openings including frame and track.',
        rate: 850, rateLabel: 'Sliding glass doors',
      },
      {
        key: 'entryDoorsEA', label: 'Entry Doors', unit: 'EA', type: 'number',
        hint: 'Pre-hung exterior doors including frame and hardware allowance.',
        rate: 650, rateLabel: 'Entry doors',
      },
      {
        key: 'existingFrameMaterial', label: 'Existing Frame Material', type: 'select',
        options: ['Wood', 'Vinyl', 'Aluminum'],
        hint: 'Affects demolition method and new sill pan / flashing approach.',
      },
    ],
  },

  __default: {
    name: 'Project',
    title: 'Project Measurements',
    fields: [
      {
        key: 'primaryAreaSF', label: 'Primary Area', unit: 'SF', type: 'number',
        hint: 'Main work area in square feet.',
        rate: 3.50, rateLabel: 'Primary scope',
      },
      {
        key: 'primaryCountEA', label: 'Primary Count', unit: 'EA', type: 'number',
        hint: 'Main unit count — fixtures, panels, openings, etc.',
        rate: 65, rateLabel: 'Unit count',
      },
      {
        key: 'secondaryAreaSF', label: 'Secondary Area', unit: 'SF', type: 'number',
        hint: 'Additional or adjacent work area.',
        rate: 2.50, rateLabel: 'Secondary scope',
      },
    ],
  },
}

export function getConfig(workTypeId) {
  return MEASUREMENT_CONFIGS[workTypeId] ?? MEASUREMENT_CONFIGS.__default
}

export function computeLineItems(config, measurements, multiplier) {
  return config.fields.flatMap((f) => {
    // Computed: rate determined by another field's selected value
    if (f.type === 'computed') {
      const qty = parseFloat(measurements[f.sourceField])
      if (!qty || qty <= 0) return []
      const material = measurements[f.rateField]
      const rate = (material && f.materialRates[material]) ?? f.defaultRate ?? 0
      if (!rate) return []
      const label = material ? `${f.rateLabel} — ${material}` : f.rateLabel
      return [{ label, qty, unit: 'SF', baseRate: rate, baseAmount: qty * rate, amount: qty * rate * multiplier }]
    }

    if (f.rate === undefined) return []

    const val = measurements[f.key]

    // Flat-rate toggle (yes/no)
    if (f.flat) {
      if (val !== 'yes') return []
      return [{ label: f.rateLabel, qty: null, unit: null, baseRate: f.rate, baseAmount: f.rate, amount: f.rate * multiplier }]
    }

    // Standard qty × rate
    const qty = parseFloat(val)
    if (!val || !qty || qty <= 0) return []
    return [{ label: f.rateLabel, qty, unit: f.unit, baseRate: f.rate, baseAmount: qty * f.rate, amount: qty * f.rate * multiplier }]
  })
}

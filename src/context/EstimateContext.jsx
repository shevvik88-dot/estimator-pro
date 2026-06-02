import { createContext, useContext, useState } from 'react'

const EstimateContext = createContext(null)

const initialState = {
  // Step 1 — Client Info
  clientName: '',
  clientEmail: '',
  clientPhone: '',
  projectAddress: '',
  city: '',
  state: '',
  region: '',
  // Step 2 — Project Details
  workType: '',
  projectTitle: '',
  startDate: '',
  notes: '',
  // Step 3 — Measurements (keyed by field.key, flexible per work type)
  measurements: {},
  // Step 4 — AI-generated estimate JSON
  generatedEstimate: null,
}

export function EstimateProvider({ children }) {
  const [estimate, setEstimate] = useState(initialState)

  function updateEstimate(fields) {
    setEstimate((prev) => ({ ...prev, ...fields }))
  }

  function resetEstimate() {
    setEstimate(initialState)
  }

  return (
    <EstimateContext.Provider value={{ estimate, updateEstimate, resetEstimate }}>
      {children}
    </EstimateContext.Provider>
  )
}

export function useEstimate() {
  const ctx = useContext(EstimateContext)
  if (!ctx) throw new Error('useEstimate must be used within EstimateProvider')
  return ctx
}

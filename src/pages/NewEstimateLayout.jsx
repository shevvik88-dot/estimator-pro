import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useEstimate } from '../context/EstimateContext'

// Each step controls its own max-width so Step 3 can use a wider two-column layout.
export default function NewEstimateLayout() {
  const { resetEstimate } = useEstimate()
  const location = useLocation()
  const skipReset = !!location.state?.skipReset
  // Delay rendering children until after the reset runs so Step1's useState
  // initializer captures the freshly-cleared context, not stale previous data.
  const [ready, setReady] = useState(skipReset)

  useEffect(() => {
    if (!skipReset) {
      resetEstimate()
    }
    setReady(true)
  }, [])

  if (!ready) return null

  return (
    <div className="min-h-full bg-gray-50 dark:bg-gray-950 p-8">
      <Outlet />
    </div>
  )
}

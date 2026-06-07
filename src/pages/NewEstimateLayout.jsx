import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useEstimate } from '../context/EstimateContext'

// Each step controls its own max-width so Step 3 can use a wider two-column layout.
export default function NewEstimateLayout() {
  const { resetEstimate } = useEstimate()
  const location = useLocation()

  useEffect(() => {
    if (!location.state?.skipReset) {
      resetEstimate()
    }
  }, [])

  return (
    <div className="min-h-full bg-gray-50 dark:bg-gray-950 p-8">
      <Outlet />
    </div>
  )
}

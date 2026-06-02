import { Outlet } from 'react-router-dom'

// Each step controls its own max-width so Step 3 can use a wider two-column layout.
export default function NewEstimateLayout() {
  return (
    <div className="min-h-full bg-gray-50 dark:bg-gray-950 p-8">
      <Outlet />
    </div>
  )
}

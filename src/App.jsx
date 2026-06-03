import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Bars3Icon } from '@heroicons/react/24/outline'
import { EstimateProvider } from './context/EstimateContext'
import { supabase } from './lib/supabase'
import Sidebar from './components/Sidebar'
import Auth from './pages/Auth'
import NewEstimateLayout from './pages/NewEstimateLayout'
import Step1ClientInfo from './pages/Step1ClientInfo'
import Step2Project from './pages/Step2Project'
import Step3Measurements from './pages/Step3Measurements'
import Step4Review from './pages/Step4Review'
import Projects from './pages/Projects'
import Documents from './pages/Documents'
import MyPrices from './pages/MyPrices'
import Settings from './pages/Settings'
import EstimatePreview from './pages/EstimatePreview'

export default function App() {
  const [darkMode, setDarkMode] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches
  )
  const [session, setSession] = useState(undefined) // undefined = loading
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!session) {
    return (
      <Routes>
        <Route path="*" element={<Auth />} />
      </Routes>
    )
  }

  return (
    <EstimateProvider>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
        <Sidebar
          darkMode={darkMode}
          onToggleDark={() => setDarkMode((d) => !d)}
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
        />

        {/* Right side: mobile top bar + page content */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <div className="md:hidden flex items-center gap-3 h-14 px-4 shrink-0 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <button
              onClick={() => setDrawerOpen(true)}
              className="p-1 rounded-md text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Open menu"
            >
              <Bars3Icon className="w-6 h-6" />
            </button>
            <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400 tracking-tight">
              EstimatorPro
            </span>
          </div>

          <main className="flex-1 overflow-auto">
            <Routes>
              <Route path="/" element={<Navigate to="/projects" replace />} />
              <Route path="/new-estimate" element={<NewEstimateLayout />}>
                <Route index element={<Navigate to="1" replace />} />
                <Route path="1" element={<Step1ClientInfo />} />
                <Route path="2" element={<Step2Project />} />
                <Route path="3" element={<Step3Measurements />} />
                <Route path="4" element={<Step4Review />} />
              </Route>
              <Route path="/projects" element={<Projects />} />
              <Route path="/documents" element={<Documents />} />
              <Route path="/my-prices" element={<MyPrices />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/estimate/preview/:id?" element={<EstimatePreview />} />
            </Routes>
          </main>
        </div>
      </div>
    </EstimateProvider>
  )
}

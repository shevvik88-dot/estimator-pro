import { NavLink } from 'react-router-dom'
import {
  PlusCircleIcon,
  FolderIcon,
  DocumentTextIcon,
  TagIcon,
  Cog6ToothIcon,
  SunIcon,
  MoonIcon,
} from '@heroicons/react/24/outline'

const navItems = [
  { to: '/new-estimate', label: 'New Estimate', Icon: PlusCircleIcon },
  { to: '/projects', label: 'Projects', Icon: FolderIcon },
  { to: '/documents', label: 'Documents', Icon: DocumentTextIcon },
  { to: '/my-prices', label: 'My Prices', Icon: TagIcon },
]

const bottomItems = [
  { to: '/settings', label: 'Settings', Icon: Cog6ToothIcon },
]

const linkBase =
  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors'
const linkActive =
  'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
const linkInactive =
  'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'

export default function Sidebar({ darkMode, onToggleDark, isOpen, onClose }) {
  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col h-screen px-3 py-4
          border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900
          transform transition-transform duration-200 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          md:relative md:translate-x-0 md:flex md:flex-col`}
      >
        <div className="px-3 mb-6">
          <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400 tracking-tight">
            EstimatorPro
          </span>
        </div>

        <nav className="flex-1 flex flex-col gap-1">
          {navItems.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                `${linkBase} ${isActive ? linkActive : linkInactive}`
              }
            >
              <Icon className="w-5 h-5 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="flex flex-col gap-1">
          {bottomItems.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                `${linkBase} ${isActive ? linkActive : linkInactive}`
              }
            >
              <Icon className="w-5 h-5 shrink-0" />
              {label}
            </NavLink>
          ))}

          <button
            onClick={onToggleDark}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
          >
            {darkMode ? (
              <SunIcon className="w-5 h-5 shrink-0" />
            ) : (
              <MoonIcon className="w-5 h-5 shrink-0" />
            )}
            {darkMode ? 'Light mode' : 'Dark mode'}
          </button>
        </div>
      </aside>
    </>
  )
}

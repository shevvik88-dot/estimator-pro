const STEPS = [
  { n: 1, label: 'Client' },
  { n: 2, label: 'Project' },
  { n: 3, label: 'Measurements' },
  { n: 4, label: 'Review' },
]

export default function StepProgressBar({ current }) {
  return (
    <div className="flex items-center mb-8">
      {STEPS.map(({ n, label }, i) => {
        const done = n < current
        const active = n === current

        return (
          <div key={n} className="flex items-center flex-1 last:flex-none">
            <div className="flex items-center gap-2.5 shrink-0">
              <span
                className={[
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors',
                  done
                    ? 'bg-indigo-600 text-white'
                    : active
                    ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 dark:ring-indigo-900/50'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500',
                ].join(' ')}
              >
                {done ? (
                  <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none">
                    <path d="M2.5 7l3 3 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  n
                )}
              </span>
              <span
                className={[
                  'text-sm font-medium whitespace-nowrap',
                  active
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : done
                    ? 'text-gray-600 dark:text-gray-400'
                    : 'text-gray-400 dark:text-gray-500',
                ].join(' ')}
              >
                {label}
              </span>
            </div>

            {i < STEPS.length - 1 && (
              <div
                className={[
                  'flex-1 h-px mx-4 transition-colors',
                  done ? 'bg-indigo-400' : 'bg-gray-200 dark:bg-gray-700',
                ].join(' ')}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

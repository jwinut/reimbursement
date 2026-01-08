'use client'

interface StatusTabsProps {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
}

export function StatusTabs({ value, onChange, options }: StatusTabsProps) {
  return (
    <div className="border-b border-gray-200 mb-6">
      <nav
        className="-mb-px flex space-x-8 overflow-x-auto"
        role="tablist"
        aria-label="Status filter"
      >
        {options.map((option) => {
          const isActive = value === option.value
          return (
            <button
              key={option.value}
              onClick={() => onChange(option.value)}
              role="tab"
              aria-selected={isActive}
              className={`whitespace-nowrap py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {option.label}
            </button>
          )
        })}
      </nav>
    </div>
  )
}

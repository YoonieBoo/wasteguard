import type { TimeRange } from '@/lib/mock-data'
import { getText, type Language } from '@/lib/i18n'

interface TimeFilterToggleProps {
  value: TimeRange
  onChange: (value: TimeRange) => void
  language?: Language
}

export function TimeFilterToggle({ value, onChange, language = 'en' }: TimeFilterToggleProps) {
  const t = getText(language)
  const options: { label: string; value: TimeRange }[] = [
    { label: t.day, value: 'day' },
    { label: t.week, value: 'week' },
    { label: t.month, value: 'month' },
  ]

  return (
    <div className="mt-5 grid grid-cols-3 gap-1.5 rounded-[1.25rem] bg-white p-1.5 shadow-[0_12px_28px_rgba(41,91,67,0.08)] md:max-w-[420px]">
      {options.map((option) => {
        const isActive = value === option.value

        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`h-11 rounded-[0.9rem] px-1 text-sm font-black transition ${
              isActive
                ? 'bg-primary text-primary-foreground shadow-[0_8px_18px_rgba(68,179,126,0.2)]'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

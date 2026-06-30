import type { TimeRange } from '@/lib/mock-data'
import { getText, type Language } from '@/lib/i18n'

interface TimeFilterToggleProps {
  value: TimeRange
  onChange: (value: TimeRange) => void
  language?: Language
  className?: string
}

export function TimeFilterToggle({ value, onChange, language = 'en', className }: TimeFilterToggleProps) {
  const t = getText(language)
  const options: { label: string; value: TimeRange }[] = [
    { label: t.day, value: 'day' },
    { label: t.week, value: 'week' },
    { label: t.month, value: 'month' },
  ]

  return (
    <div className={className ?? 'mt-5 grid w-full shrink-0 grid-cols-3 gap-2 rounded-[0.75rem] bg-white p-2 shadow-[0_12px_28px_rgba(41,91,67,0.08)] sm:w-[31rem] sm:max-w-full'}>
      {options.map((option) => {
        const isActive = value === option.value

        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`h-12 rounded-[0.5rem] px-3 text-sm font-black transition ${
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

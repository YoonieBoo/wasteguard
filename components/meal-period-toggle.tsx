import { getText, type Language } from '@/lib/i18n'

export type CheckMealPeriod = 'breakfast' | 'dinner'

interface MealPeriodToggleProps {
  value: CheckMealPeriod
  onChange: (value: CheckMealPeriod) => void
  language?: Language
}

export function MealPeriodToggle({ value, onChange, language = 'en' }: MealPeriodToggleProps) {
  const t = getText(language)
  const options: { label: string; value: CheckMealPeriod }[] = [
    { label: t.mealPeriodBreakfast, value: 'breakfast' },
    { label: t.mealPeriodDinner, value: 'dinner' },
  ]

  return (
    <div className="mt-5 grid w-full shrink-0 grid-cols-2 gap-2 rounded-[0.75rem] bg-white p-2 shadow-[0_12px_28px_rgba(41,91,67,0.08)] sm:w-[20rem]">
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

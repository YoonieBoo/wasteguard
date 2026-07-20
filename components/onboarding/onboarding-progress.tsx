import type { ReactNode } from 'react'
import { getText, type Language } from '@/lib/i18n'

interface OnboardingShellProps {
  step: number
  totalSteps: number
  title: string
  subtitle?: string
  language: Language
  onToggleLanguage: () => void
  children: ReactNode
}

export function OnboardingShell({ step, totalSteps, title, subtitle, language, onToggleLanguage, children }: OnboardingShellProps) {
  const t = getText(language)

  return (
    <main className="relative flex min-h-dvh w-full justify-center bg-white px-4 py-10 sm:px-5 md:px-6 md:py-14">
      <button
        onClick={onToggleLanguage}
        className="fixed right-3 top-3 z-[60] rounded-full bg-white/90 px-3 py-2 text-xs font-black leading-none text-emerald-800 shadow-[0_10px_24px_rgba(35,88,62,0.14)] transition hover:bg-white sm:right-4 sm:top-4 sm:px-4 md:right-6"
      >
        {language === 'en' ? 'EN / TH' : 'TH / EN'}
      </button>
      <div className="w-full max-w-[430px] md:max-w-[640px]">
        <div className="wg-page-header">
          <p className="wg-eyebrow">
            {t.onboardingStepOf.replace('{step}', String(step)).replace('{total}', String(totalSteps))}
          </p>
          <div className="mb-3 flex gap-1.5">
            {Array.from({ length: totalSteps }).map((_, index) => (
              <div
                key={index}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  index < step ? 'bg-primary' : 'bg-secondary'
                }`}
              />
            ))}
          </div>
          <h1 className="wg-page-title">{title}</h1>
          {subtitle && <p className="wg-page-subtitle">{subtitle}</p>}
        </div>
        {children}
      </div>
    </main>
  )
}

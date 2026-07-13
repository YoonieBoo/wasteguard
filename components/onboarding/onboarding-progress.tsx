import type { ReactNode } from 'react'

interface OnboardingShellProps {
  step: number
  totalSteps: number
  title: string
  subtitle?: string
  children: ReactNode
}

export function OnboardingShell({ step, totalSteps, title, subtitle, children }: OnboardingShellProps) {
  return (
    <main className="flex min-h-dvh w-full justify-center bg-white px-4 py-10 sm:px-5 md:px-6 md:py-14">
      <div className="w-full max-w-[430px] md:max-w-[640px]">
        <div className="wg-page-header">
          <p className="wg-eyebrow">
            Step {step} of {totalSteps}
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

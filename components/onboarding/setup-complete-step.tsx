'use client'

import { Button } from '@/components/ui/button'
import type { ImportSummary } from '@/lib/onboarding/types'
import { getText, type Language } from '@/lib/i18n'

interface SetupCompleteStepProps {
  language: Language
  summary: ImportSummary
  onContinue: () => void
  onAddMoreData: () => void
}

export function SetupCompleteStep({ language, summary, onContinue, onAddMoreData }: SetupCompleteStepProps) {
  const t = getText(language)
  const readiness =
    summary.distinctDayCount >= 30
      ? t.readinessForecast
      : summary.distinctDayCount >= 7
        ? t.readinessEarly
        : t.readinessBasic

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label={t.statRowsImported} value={summary.importedRows} />
        <Stat label={t.statMenuItemsFound} value={summary.menuItemCount} />
        <Stat label={t.statDaysFound} value={summary.distinctDayCount} />
        <Stat label={t.statRowsSkipped} value={summary.skippedRows} />
      </div>

      <div className="rounded-[0.75rem] bg-white p-4 shadow-[0_14px_35px_rgba(41,91,67,0.08)]">
        <p className="wg-body">{readiness}</p>
      </div>

      <Button
        type="button"
        onClick={onContinue}
        className="wg-action w-full bg-primary text-primary-foreground hover:bg-primary/90"
      >
        {t.continueToDashboard}
      </Button>
      <button
        type="button"
        onClick={onAddMoreData}
        className="h-[3.25rem] w-full rounded-[0.5rem] bg-secondary/70 text-sm font-black text-foreground shadow-sm hover:bg-secondary sm:text-base"
      >
        {t.addMoreData}
      </button>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[0.75rem] bg-secondary/70 p-3 text-center">
      <p className="text-lg font-black leading-none text-foreground">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-normal text-muted-foreground">{label}</p>
    </div>
  )
}

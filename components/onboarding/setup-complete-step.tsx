'use client'

import { Button } from '@/components/ui/button'
import type { ImportSummary } from '@/lib/onboarding/types'

interface SetupCompleteStepProps {
  summary: ImportSummary
  onContinue: () => void
  onAddMoreData: () => void
}

export function SetupCompleteStep({ summary, onContinue, onAddMoreData }: SetupCompleteStepProps) {
  const readiness =
    summary.distinctDayCount >= 30
      ? 'Forecasting and recommendations available.'
      : summary.distinctDayCount >= 7
        ? 'Early insights available.'
        : 'Basic tracking available.'

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Rows imported" value={summary.importedRows} />
        <Stat label="Menu items found" value={summary.menuItemCount} />
        <Stat label="Days found" value={summary.distinctDayCount} />
        <Stat label="Rows skipped" value={summary.skippedRows} />
      </div>

      <div className="rounded-[0.75rem] bg-white p-4 shadow-[0_14px_35px_rgba(41,91,67,0.08)]">
        <p className="wg-body">{readiness}</p>
      </div>

      <Button
        type="button"
        onClick={onContinue}
        className="wg-action w-full bg-primary text-primary-foreground hover:bg-primary/90"
      >
        Continue to Dashboard
      </Button>
      <button
        type="button"
        onClick={onAddMoreData}
        className="h-[3.25rem] w-full rounded-[0.5rem] bg-secondary/70 text-sm font-black text-foreground shadow-sm hover:bg-secondary sm:text-base"
      >
        Add more data
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

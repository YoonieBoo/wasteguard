'use client'

import { Leaf } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getText, type Language } from '@/lib/i18n'
import type { Recommendation } from '@/lib/recommendations'

interface MorningBriefingProps {
  language: Language
  bakeryName?: string
  pendingRecommendations: Recommendation[]
  estimatedSavingsTotal: number
  wasteDelta: number
  onReviewRecs: () => void
  onDismiss: () => void
}

export function MorningBriefing({
  language,
  bakeryName,
  pendingRecommendations,
  estimatedSavingsTotal,
  wasteDelta,
  onReviewRecs,
  onDismiss,
}: MorningBriefingProps) {
  const t = getText(language)
  const pendingCount = pendingRecommendations.length

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center p-4 sm:items-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onDismiss}
      />

      <div className="relative w-full max-w-[420px] animate-in fade-in-0 slide-in-from-bottom-4 duration-300 sm:zoom-in-95 sm:slide-in-from-bottom-0">
        <div className="rounded-t-[0.75rem] bg-primary px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20">
              <Leaf className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-normal text-primary-foreground/70">
                Waste Guard
              </p>
              <p className="truncate text-base font-black text-primary-foreground">
                {t.morningGreeting} {bakeryName}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-b-[0.75rem] bg-white px-5 pb-6 pt-5 shadow-[0_24px_60px_rgba(35,88,62,0.2)]">
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-[0.5rem] bg-primary/10 px-4 py-3">
              <p className="text-sm font-bold text-foreground">{t.pendingRecs}</p>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-black text-white">
                {pendingCount}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-[0.5rem] bg-secondary/70 px-4 py-3">
              <p className="text-sm font-bold text-foreground">{t.estimatedSavingsTodayLabel}</p>
              <p className="text-sm font-black text-primary">
                {language === 'th'
                  ? `${estimatedSavingsTotal.toLocaleString()} บาท`
                  : `THB ${estimatedSavingsTotal.toLocaleString()}`}
              </p>
            </div>

            {wasteDelta > 0 && (
              <div className="flex items-center justify-between rounded-[0.5rem] bg-secondary/70 px-4 py-3">
                <p className="text-sm font-bold text-foreground">
                  {t.wasteDownNote.replace('{percent}', String(wasteDelta))}
                </p>
                <span className="text-sm font-black text-primary">✓</span>
              </div>
            )}
          </div>

          <div className="mt-4 space-y-2.5">
            <Button
              onClick={onReviewRecs}
              className="wg-action w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {t.reviewRecs}
            </Button>
            <Button
              onClick={onDismiss}
              variant="secondary"
              className="h-[3.25rem] w-full rounded-[0.5rem] bg-secondary text-sm font-black text-foreground hover:bg-secondary/80"
            >
              {t.goToDashboard}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

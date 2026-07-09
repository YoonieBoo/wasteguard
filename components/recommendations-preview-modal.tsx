'use client'

import { ChevronRight, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getText, type Language } from '@/lib/i18n'
import type { Recommendation } from '@/lib/recommendations'

interface RecommendationsPreviewModalProps {
  language: Language
  recommendations: Recommendation[]
  onAccept: (id: string) => void
  onIgnore: (id: string) => void
  onModify: (id: string) => void
  onViewAll: () => void
  onClose: () => void
}

function getPriority(confidence: number) {
  if (confidence >= 80) return 'high'
  if (confidence >= 60) return 'medium'
  return 'low'
}

export function RecommendationsPreviewModal({
  language,
  recommendations,
  onAccept,
  onIgnore,
  onModify,
  onViewAll,
  onClose,
}: RecommendationsPreviewModalProps) {
  const t = getText(language)
  const previewItems = recommendations.slice(0, 3)

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative flex max-h-[calc(100vh-2rem)] w-full max-w-[780px] flex-col overflow-hidden rounded-[1rem] bg-white shadow-[0_32px_80px_rgba(35,88,62,0.25)] animate-in fade-in-0 zoom-in-95 duration-200">
        <div className="flex shrink-0 items-center justify-between gap-4 px-6 pt-6 sm:px-8 sm:pt-8">
          <p className="wg-eyebrow mb-0 font-black">{t.todaysRecommendations}</p>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 flex-1 overflow-y-auto overscroll-contain px-6 sm:px-8">
          <div className="divide-y divide-secondary/70 overflow-hidden rounded-[0.75rem] border border-secondary/70">
            {previewItems.map((rec) => {
              const priority = getPriority(rec.confidence)
              const title = language === 'th' ? rec.titleTh : rec.title
              const accentBar = priority === 'high' ? 'bg-red-500' : priority === 'medium' ? 'bg-amber-400' : 'bg-secondary'

              return (
                <div key={rec.id} className="flex items-center gap-4 bg-white p-5 sm:p-6">
                  <span className={`w-1 shrink-0 self-stretch rounded-full ${accentBar}`} />

                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-black leading-snug text-foreground sm:text-lg">{title}</h3>
                  </div>

                  <div className="hidden shrink-0 flex-col justify-center gap-3 text-right sm:flex">
                    <div>
                      <p className="wg-meta">{t.estimatedSavingsLabel}</p>
                      <p className="mt-0.5 text-sm font-black text-primary">
                        {language === 'th' ? `${rec.estimatedSavings.toLocaleString()} บาท` : `THB ${rec.estimatedSavings.toLocaleString()}`}
                        <span className="ml-1 text-xs font-bold text-muted-foreground">{t.perMonth}</span>
                      </p>
                    </div>
                    <div>
                      <p className="wg-meta">{t.co2ImpactLabel}</p>
                      <p className="mt-0.5 text-sm font-black text-primary">
                        {Math.abs(rec.co2Impact)} {t.kgCo2}
                        <span className="ml-1 text-xs font-bold text-muted-foreground">{t.perMonth}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col gap-2 self-center">
                    <Button
                      onClick={() => onAccept(rec.id)}
                      className="h-9 rounded-[0.5rem] bg-primary px-4 text-xs font-black text-primary-foreground hover:bg-primary/90"
                    >
                      {t.accept}
                    </Button>
                    <Button
                      onClick={() => onModify(rec.id)}
                      variant="outline"
                      className="h-9 rounded-[0.5rem] border-primary/40 px-4 text-xs font-black text-primary hover:bg-primary/5"
                    >
                      {t.modify}
                    </Button>
                    <button
                      type="button"
                      onClick={() => onIgnore(rec.id)}
                      className="text-xs font-bold text-muted-foreground/70 transition hover:text-muted-foreground"
                    >
                      {t.ignore}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="shrink-0 px-6 pb-6 pt-5 sm:px-8 sm:pb-8">
          <button
            type="button"
            onClick={onViewAll}
            className="flex w-full items-center justify-between rounded-[0.75rem] border border-secondary/70 px-5 py-4 text-sm font-black text-foreground transition hover:bg-secondary/40"
          >
            <span>{t.viewAllRecommendations}</span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  )
}

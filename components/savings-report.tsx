'use client'

import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getText, translateItemName, type Language } from '@/lib/i18n'
import { cleanBakeryTitle } from '@/lib/bakery-catalog'
import type { Recommendation } from '@/lib/recommendations'
import type { FoodRow } from '@/lib/mock-data'

interface SavingsReportProps {
  recommendations: Recommendation[]
  dailyInputs: FoodRow[]
  language: Language
  bakeryName?: string
  onGoToRecommendations: () => void
}

function computeMonthlyData(inputs: FoodRow[]) {
  const byMonth: Record<string, { waste: number[]; savings: number[]; co2: number[] }> = {}

  for (const row of inputs) {
    const key = row.date.slice(0, 7)
    if (!byMonth[key]) byMonth[key] = { waste: [], savings: [], co2: [] }
    byMonth[key].waste.push(row.waste_percent)
    byMonth[key].savings.push(Number(row.money_saved ?? 0))
    byMonth[key].co2.push(Number(row.co2_saved ?? 0))
  }

  return Object.entries(byMonth)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 6)
    .map(([key, data]) => {
      const [year, month] = key.split('-')
      const label = new Date(Number(year), Number(month) - 1).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      })
      const avgWaste = data.waste.reduce((s, v) => s + v, 0) / (data.waste.length || 1)
      const totalSavings = data.savings.reduce((s, v) => s + v, 0)
      const totalCo2 = data.co2.reduce((s, v) => s + v, 0)
      return {
        key,
        label,
        avgWaste: Math.round(avgWaste * 10) / 10,
        totalSavings: Math.round(totalSavings),
        totalCo2: parseFloat(totalCo2.toFixed(1)),
        days: data.waste.length,
      }
    })
}

export function SavingsReport({
  recommendations,
  dailyInputs,
  language,
  onGoToRecommendations,
}: SavingsReportProps) {
  const t = getText(language)

  const acceptedRecs = recommendations.filter((r) => r.status === 'accepted' || r.status === 'modified')
  const totalSavings = acceptedRecs.reduce((sum, r) => sum + r.estimatedSavings, 0)
  const totalCo2 = acceptedRecs.reduce((sum, r) => sum + Math.max(0, r.co2Impact), 0)
  const monthlyData = computeMonthlyData(dailyInputs)

  const statCards = [
    {
      label: t.estimatedFromRecs,
      value: language === 'th' ? `${totalSavings.toLocaleString()} บาท` : `THB ${totalSavings.toLocaleString()}`,
      tone: 'bg-primary/10 text-primary',
    },
    {
      label: t.co2ReducedLabel,
      value: `${parseFloat(totalCo2.toFixed(1))} ${t.kgCo2}`,
      tone: 'bg-primary/10 text-primary',
    },
    {
      label: t.recsActedOn,
      value: `${acceptedRecs.length} ${t.ofTotal} ${recommendations.length}`,
      tone: 'bg-secondary text-foreground',
    },
  ]

  return (
    <main className="wg-page">
      <div className="wg-page-header">
        <p className="wg-eyebrow">{t.today}</p>
        <h1 className="wg-page-title">{t.savingsReport}</h1>
        <p className="wg-page-subtitle">{t.savingsReportNote}</p>
      </div>

      {/* Hero stat cards */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className={`flex flex-col justify-between rounded-[1.5rem] p-4 sm:p-5 ${card.tone}`}
          >
            <p className="wg-label mb-3">{card.label}</p>
            <p className="text-lg font-black leading-tight sm:text-xl">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Accepted Recommendations breakdown */}
      <section className="mt-8">
        <h2 className="wg-section-title mb-4">{t.acceptedRecsBreakdown}</h2>

        {acceptedRecs.length === 0 ? (
          <div className="rounded-[1.5rem] bg-white p-8 text-center shadow-[0_14px_35px_rgba(41,91,67,0.08)]">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-muted-foreground">
              <Sparkles className="h-6 w-6" />
            </div>
            <p className="text-sm font-black text-foreground">{t.noAcceptedRecsReport}</p>
            <p className="wg-meta mt-1 mb-5">{t.noAcceptedRecsReportNote}</p>
            <Button
              onClick={onGoToRecommendations}
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-[1rem] h-11 px-6 text-sm font-black"
            >
              {t.goToRecs}
            </Button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-[1.5rem] bg-white shadow-[0_14px_35px_rgba(41,91,67,0.08)]">
            {acceptedRecs.map((rec, i) => {
              const title = language === 'th' ? rec.titleTh : rec.title
              const isModified = rec.status === 'modified'
              const statusLabel = isModified ? t.modifiedBadge : t.acceptedBadge
              const statusTone = isModified ? 'bg-amber-50 text-amber-700' : 'bg-primary/12 text-primary'
              const itemName = rec.affectedItemFileName
                ? translateItemName(cleanBakeryTitle(rec.affectedItemFileName), language)
                : null

              return (
                <div
                  key={rec.id}
                  className={`flex items-start justify-between gap-4 px-5 py-4 sm:px-6 ${
                    i !== 0 ? 'border-t border-secondary/60' : ''
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-black ${statusTone}`}>
                        {statusLabel}
                      </span>
                      {itemName && (
                        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-bold text-muted-foreground">
                          {itemName}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm font-black text-foreground leading-snug">{title}</p>
                    {isModified && rec.modifiedQuantity != null && (
                      <p className="wg-meta mt-0.5">
                        → {rec.modifiedQuantity} {language === 'th' ? 'หน่วย' : 'units'}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-black text-primary">
                      {language === 'th'
                        ? `+${rec.estimatedSavings.toLocaleString()} ฿`
                        : `+THB ${rec.estimatedSavings.toLocaleString()}`}
                    </p>
                    {rec.co2Impact > 0 && (
                      <p className="wg-meta mt-0.5">↓{rec.co2Impact} {t.kgCo2}</p>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Totals footer */}
            <div className="flex items-center justify-between border-t border-secondary/80 bg-secondary/30 px-5 py-4 sm:px-6">
              <p className="text-sm font-black text-foreground">{language === 'th' ? 'รวม' : 'Total projected'}</p>
              <div className="text-right">
                <p className="text-sm font-black text-primary">
                  {language === 'th'
                    ? `+${totalSavings.toLocaleString()} บาท`
                    : `+THB ${totalSavings.toLocaleString()}`}
                </p>
                {totalCo2 > 0 && (
                  <p className="wg-meta mt-0.5">↓{parseFloat(totalCo2.toFixed(1))} {t.kgCo2}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Monthly performance history */}
      <section className="mt-8">
        <h2 className="wg-section-title mb-4">{t.monthlyPerformance}</h2>

        {monthlyData.length === 0 ? (
          <div className="rounded-[1.5rem] bg-white p-8 text-center shadow-[0_14px_35px_rgba(41,91,67,0.08)]">
            <p className="text-sm font-black text-foreground">{t.noHistoricalData}</p>
            <p className="wg-meta mt-1">{t.noHistoricalDataNote}</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-[1.5rem] bg-white shadow-[0_14px_35px_rgba(41,91,67,0.08)]">
            {/* Table header */}
            <div className="grid grid-cols-4 border-b border-secondary/60 px-5 py-3 sm:px-6">
              <p className="wg-label">{language === 'th' ? 'เดือน' : 'Month'}</p>
              <p className="wg-label text-center">{t.avgWasteLabel}</p>
              <p className="wg-label text-center">{t.estSavedLabel}</p>
              <p className="wg-label text-right">{t.co2SavedLabel}</p>
            </div>

            {monthlyData.map((row, i) => {
              const wasteColor =
                row.avgWaste <= 15
                  ? 'text-primary'
                  : row.avgWaste <= 25
                    ? 'text-amber-600'
                    : 'text-red-500'

              return (
                <div
                  key={row.key}
                  className={`grid grid-cols-4 items-center px-5 py-4 sm:px-6 ${
                    i !== 0 ? 'border-t border-secondary/40' : ''
                  }`}
                >
                  <div>
                    <p className="text-sm font-black text-foreground">{row.label}</p>
                    <p className="wg-meta">{row.days} {t.daysLogged}</p>
                  </div>
                  <p className={`text-center text-sm font-black ${wasteColor}`}>{row.avgWaste}%</p>
                  <p className="text-center text-sm font-black text-foreground">
                    {language === 'th'
                      ? `${row.totalSavings.toLocaleString()} ฿`
                      : `฿${row.totalSavings.toLocaleString()}`}
                  </p>
                  <p className="text-right text-sm font-bold text-muted-foreground">
                    {row.totalCo2} {t.kgCo2}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}

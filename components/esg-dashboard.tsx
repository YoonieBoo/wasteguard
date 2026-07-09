'use client'

import { useState } from 'react'
import { Award, CheckCircle2, Leaf, Lock, ShieldCheck, Users, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getText, type Language } from '@/lib/i18n'
import { getBusinessInsightData, getEsgData, type FoodRow, type TimeRange } from '@/lib/mock-data'
import { TimeFilterToggle } from '@/components/time-filter-toggle'

interface EsgDashboardProps {
  dailyInputs: FoodRow[]
  language: Language
  recsTotal: number
  recsActed: number
  isProPlan?: boolean
  onUpgrade?: () => void
}

function getScoreStatusLabel(score: number, t: ReturnType<typeof getText>) {
  if (score >= 85) return t.scoreStatusExcellent
  if (score >= 70) return t.scoreStatusDoingWell
  if (score >= 50) return t.scoreStatusNeedsAttention
  return t.scoreStatusNeedsImprovement
}

function scoreColor(_s: number) {
  return '#15803d'
}
function scoreBadgeBg(_s: number) {
  return '#dcfce7'
}
function scoreBadgeText(_s: number) {
  return '#166534'
}

function computeMonthlyWaste(inputs: FoodRow[]) {
  const now = new Date()
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('en', { month: 'short' })
    const rows = inputs.filter(r => r.date.startsWith(key))
    const avg = rows.length > 0 ? rows.reduce((s, r) => s + r.waste_percent, 0) / rows.length : 0
    return { label, avg: parseFloat(avg.toFixed(1)), hasData: rows.length > 0 }
  })
}

export function EsgDashboard({ dailyInputs, language, recsTotal, recsActed, isProPlan = false, onUpgrade }: EsgDashboardProps) {
  const t = getText(language)
  const [range, setRange] = useState<TimeRange>('month')
  const esg = getEsgData(range, dailyInputs, recsTotal, recsActed)
  const monthly = computeMonthlyWaste(dailyInputs)
  const insights = getBusinessInsightData(dailyInputs)

  // Bar chart / line chart shared geometry
  const barH = 96
  const barW = 28
  const barGap = 10
  const barMax = Math.max(...monthly.map(m => m.avg), 50) // must be ≥50 so 50% grid line stays at y≥0
  const barChartW = monthly.length * (barW + barGap) - barGap

  const pointX = (i: number) => i * (barW + barGap) + barW / 2
  const pointY = (avg: number) => barH - (avg / barMax) * barH

  const lineSegments: Array<Array<{ x: number; y: number }>> = []
  let currentSegment: Array<{ x: number; y: number }> = []
  monthly.forEach((m, i) => {
    if (m.hasData) {
      currentSegment.push({ x: pointX(i), y: pointY(m.avg) })
    } else if (currentSegment.length > 0) {
      lineSegments.push(currentSegment)
      currentSegment = []
    }
  })
  if (currentSegment.length > 0) lineSegments.push(currentSegment)

  const lastDataPoint = [...monthly].reverse().find(m => m.hasData)
  const lastDataIndex = lastDataPoint ? monthly.lastIndexOf(lastDataPoint) : -1

  const kpiCards = [
    {
      label: t.overallEsgScore,
      score: esg.overallScore,
      showOutOf100: true,
      badge: esg.hasData ? getScoreStatusLabel(esg.overallScore, t) : '--',
      badgeLabel: '',
      Icon: Award,
    },
    {
      label: t.environmental,
      score: esg.envScore,
      showOutOf100: false,
      badge: esg.hasData ? `${esg.avgWaste}%` : '--',
      badgeLabel: t.avgFoodWaste,
      Icon: Leaf,
    },
    {
      label: t.social,
      score: esg.socialScore,
      showOutOf100: false,
      badge: `${esg.daysLogged}/${esg.totalDays}d`,
      badgeLabel: t.teamReporting,
      Icon: Users,
    },
    {
      label: t.governance,
      score: esg.govScore,
      showOutOf100: false,
      badge: esg.recsTotal > 0 ? `${esg.recsActed}/${esg.recsTotal}` : '--',
      badgeLabel: t.aiRecAdherence,
      Icon: Shield,
    },
  ]

  const scoreBreakdownRows = [
    { label: t.environmental, score: esg.envScore, color: '#16a34a' },
    { label: t.social, score: esg.socialScore, color: '#4ade80' },
    { label: t.governance, score: esg.govScore, color: '#86efac' },
  ]

  const aiSummaryBullets: string[] = []
  if (esg.hasData) {
    aiSummaryBullets.push(
      insights.wasteDelta > 0
        ? t.aiSummaryWasteDecreased.replace('{percent}', String(insights.wasteDelta))
        : t.aiSummaryWasteSteady,
    )

    if (insights.estimatedSavings > 0) {
      aiSummaryBullets.push(t.aiSummarySavings.replace('{amount}', insights.estimatedSavings.toLocaleString()))
    }

    const recentMonths = monthly.filter(m => m.hasData).slice(-2)
    if (recentMonths.length === 2) {
      const scoreFromWaste = (avg: number) => Math.round(Math.min(100, Math.max(0, 100 - avg * 2.5)))
      const scoreDelta = scoreFromWaste(recentMonths[1].avg) - scoreFromWaste(recentMonths[0].avg)
      if (scoreDelta !== 0) {
        aiSummaryBullets.push(
          (scoreDelta > 0 ? t.aiSummaryScoreImproved : t.aiSummaryScoreDeclined)
            .replace('{pillar}', t.environmental)
            .replace('{points}', String(Math.abs(scoreDelta))),
        )
      }
    }

    if (esg.recsTotal > 0) {
      aiSummaryBullets.push(
        t.aiSummaryRecAdherence.replace('{acted}', String(esg.recsActed)).replace('{total}', String(esg.recsTotal)),
      )
    }
  } else {
    aiSummaryBullets.push(t.aiSummaryNoData)
  }

  return (
    <main className="relative min-h-dvh w-full bg-[#eef2ef] px-4 pb-28 pt-8 sm:px-5 md:px-6 lg:px-8 lg:pb-8 lg:pt-7">
      <div className={`mx-auto w-full max-w-[960px] ${!isProPlan ? 'pointer-events-none select-none blur-sm' : ''}`}>

        {/* Header */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900 sm:text-3xl">{t.esgDashboard}</h1>
            <p className="mt-1 text-sm font-medium text-gray-500">{t.esgDashboardNote}</p>
          </div>
          <div className="shrink-0">
            <TimeFilterToggle value={range} onChange={setRange} language={language} />
          </div>
        </div>

        {/* KPI cards — 4 across */}
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {kpiCards.map((card) => {
            const Icon = card.Icon
            return (
              <div key={card.label} className="rounded-[0.75rem] bg-white p-4 shadow-[0_1px_4px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.04)] sm:p-5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[11px] font-bold leading-snug text-gray-500 sm:text-xs">{card.label}</p>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1a3328]">
                    <Icon className="h-4 w-4 text-emerald-400" />
                  </div>
                </div>
                <p className="mt-3 text-4xl font-black leading-none" style={{ color: esg.hasData ? scoreColor(card.score) : '#d1d5db' }}>
                  {esg.hasData ? card.score : '--'}
                  {card.showOutOf100 && <span className="text-base font-bold text-gray-400"> /100</span>}
                </p>
                <div className="mt-2.5 flex items-center gap-1.5">
                  <span
                    className="inline-block rounded-[0.25rem] px-1.5 py-0.5 text-[11px] font-black"
                    style={{
                      backgroundColor: esg.hasData ? scoreBadgeBg(card.score) : '#f3f4f6',
                      color: esg.hasData ? scoreBadgeText(card.score) : '#9ca3af',
                    }}
                  >
                    {card.badge}
                  </span>
                  {card.badgeLabel && (
                    <span className="truncate text-[10px] font-medium text-gray-400">{card.badgeLabel}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Charts row */}
        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">

          {/* Waste Trend — line chart */}
          <div className="rounded-[0.75rem] bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.04)]">
            <p className="text-sm font-black text-gray-900">{t.wasteTrend}</p>
            <p className="mb-5 text-[11px] font-medium text-gray-400">{t.wasteTrendNote}</p>

            <svg viewBox={`-28 -24 ${barChartW + 28} ${barH + 42}`} className="w-full">
              <defs>
                <linearGradient id="wasteTrendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#16a34a" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="#16a34a" stopOpacity={0} />
                </linearGradient>
              </defs>
              {[0, 25, 50].map(pct => {
                const y = barH - (pct / barMax) * barH
                return (
                  <g key={pct}>
                    <line x1={0} y1={y} x2={barChartW} y2={y} stroke="#f3f4f6" strokeWidth={1} />
                    <text x={-5} y={y + 3} textAnchor="end" fontSize={8} fill="#c8d0cd" fontFamily="inherit">{pct}%</text>
                  </g>
                )
              })}

              {lineSegments.map((segment, i) => {
                const linePath = segment.map((p, j) => `${j === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
                const areaPath = `${linePath} L ${segment[segment.length - 1].x} ${barH} L ${segment[0].x} ${barH} Z`

                return (
                  <g key={i}>
                    <path d={areaPath} fill="url(#wasteTrendFill)" />
                    <path d={linePath} fill="none" stroke="#16a34a" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                  </g>
                )
              })}

              {monthly.map((m, i) =>
                m.hasData ? (
                  <circle
                    key={m.label}
                    cx={pointX(i)}
                    cy={pointY(m.avg)}
                    r={i === lastDataIndex ? 4 : 3}
                    fill="#ffffff"
                    stroke="#16a34a"
                    strokeWidth={2}
                  />
                ) : null,
              )}

              {lastDataPoint && lastDataIndex >= 0 && (
                <g>
                  <rect
                    x={pointX(lastDataIndex) - 16}
                    y={pointY(lastDataPoint.avg) - 26}
                    width={32}
                    height={16}
                    rx={5}
                    fill="#16a34a"
                  />
                  <text
                    x={pointX(lastDataIndex)}
                    y={pointY(lastDataPoint.avg) - 15}
                    textAnchor="middle"
                    fontSize={9}
                    fontWeight={800}
                    fill="#ffffff"
                    fontFamily="inherit"
                  >
                    {lastDataPoint.avg}%
                  </text>
                </g>
              )}

              {monthly.map((m, i) => (
                <text key={`label-${m.label}`} x={pointX(i)} y={barH + 14} textAnchor="middle" fontSize={9} fill="#9ca3af" fontFamily="inherit">
                  {m.label}
                </text>
              ))}
            </svg>
          </div>

          {/* Score Breakdown */}
          <div className="rounded-[0.75rem] bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.04)]">
            <p className="text-sm font-black text-gray-900">{t.scoreBreakdown}</p>
            <p className="mb-5 text-[11px] font-medium text-gray-400">{t.scoreBreakdownNote}</p>

            <div className="space-y-5">
              {scoreBreakdownRows.map((row) => (
                <div key={row.label} className="flex items-center gap-4">
                  <p className="w-24 shrink-0 text-xs font-bold text-gray-600 sm:text-sm">{row.label}</p>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${esg.hasData ? row.score : 0}%`, backgroundColor: row.color }}
                    />
                  </div>
                  <p className="w-14 shrink-0 text-right text-sm font-black" style={{ color: esg.hasData ? scoreColor(row.score) : '#d1d5db' }}>
                    {esg.hasData ? row.score : '--'}
                    <span className="text-xs font-medium text-gray-400">/100</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI Summary */}
        <div className="rounded-[0.75rem] bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.04)] sm:p-6">
          <p className="text-sm font-black text-gray-900">{t.aiSummary}</p>

          <div className="mt-5 space-y-4">
            {aiSummaryBullets.map((bullet) => (
              <p key={bullet} className="flex gap-3 text-sm font-medium leading-6 text-gray-700 sm:text-base">
                <span className="text-gray-400">•</span>
                <span>{bullet}</span>
              </p>
            ))}
          </div>
        </div>

      </div>

      {/* Pro-plan paywall */}
      {!isProPlan && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-white/30" />
          <div className="relative w-full max-w-[420px] rounded-[1rem] bg-white p-8 text-center shadow-[0_32px_80px_rgba(35,88,62,0.25)] animate-in fade-in-0 zoom-in-95 duration-200">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/12">
              <Lock className="h-6 w-6 text-primary" />
            </div>

            <h2 className="mt-5 text-xl font-black leading-snug text-gray-900">
              {t.lockedSectionPrefix} <span className="text-primary">{t.proPlanLabel}</span>
            </h2>

            <div className="mt-5 space-y-3 border-t border-gray-100 pt-5 text-left">
              {[t.proFeatureFullPerformance, t.proFeatureInsights, t.proFeatureExport].map((feature) => (
                <div key={feature} className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                  <p className="text-sm font-medium text-gray-700">{feature}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 space-y-2.5">
              <Button
                onClick={onUpgrade}
                className="h-[3.25rem] w-full rounded-[0.5rem] bg-primary text-sm font-black text-primary-foreground hover:bg-primary/90"
              >
                {t.upgradeToProButton}
              </Button>
              <Button
                onClick={onUpgrade}
                variant="outline"
                className="h-[3.25rem] w-full rounded-[0.5rem] border-primary/40 text-sm font-black text-primary hover:bg-primary/5"
              >
                {t.viewPlansButton}
              </Button>
            </div>

            <p className="mt-4 flex items-center justify-center gap-1.5 text-xs font-medium text-gray-400">
              <ShieldCheck className="h-3.5 w-3.5" />
              {t.cancelAnytimeNote}
            </p>
          </div>
        </div>
      )}
    </main>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, Lock, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getText, type Language } from '@/lib/i18n'
import { getBusinessInsightData, getEsgData, getSortedRows, type FoodRow, type TimeRange } from '@/lib/mock-data'
import { TimeFilterToggle } from '@/components/time-filter-toggle'
import type { FlaskAnalyticsResponse, FlaskEsgScoreResponse, FlaskWastePredictionsResponse } from '@/lib/ai-api'

interface EsgDashboardProps {
  dailyInputs: FoodRow[]
  language: Language
  recsTotal: number
  recsActed: number
  isProPlan?: boolean
  onUpgrade?: () => void
  analyticsData?: FlaskAnalyticsResponse | null
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

// Buckets the most recent logged days into 6 even segments, rather than
// strict calendar months — the seed dataset spans a single month, so
// calendar-month buckets left 5 of 6 points empty.
function computeWasteTrend(inputs: FoodRow[]) {
  const buckets = 6
  const recent = [...inputs].sort((a, b) => a.date.localeCompare(b.date)).slice(-60)

  if (recent.length === 0) {
    return Array.from({ length: buckets }, () => ({ label: '', avg: 0, hasData: false }))
  }

  const chunkSize = Math.max(1, Math.ceil(recent.length / buckets))

  return Array.from({ length: buckets }, (_, i) => {
    const chunk = recent.slice(i * chunkSize, (i + 1) * chunkSize)
    if (chunk.length === 0) {
      return { label: '', avg: 0, hasData: false }
    }
    const avg = chunk.reduce((s, r) => s + r.waste_percent, 0) / chunk.length
    const label = new Date(chunk[chunk.length - 1].date).toLocaleDateString('en', { month: 'short', day: 'numeric' })
    return { label, avg: parseFloat(avg.toFixed(1)), hasData: true }
  })
}

export function EsgDashboard({ dailyInputs, language, recsTotal, recsActed, isProPlan = false, onUpgrade, analyticsData }: EsgDashboardProps) {
  const t = getText(language)
  const [range, setRange] = useState<TimeRange>('month')
  const esg = getEsgData(range, dailyInputs, recsTotal, recsActed)
  const wasteTrend = computeWasteTrend(getSortedRows(dailyInputs))
  const insights = getBusinessInsightData(dailyInputs)

  // Fetch the engine-computed ESG score using the exact same inputs the local
  // getEsgData() formula already uses (same weights/formula on both sides), so this
  // is a safe swap-in once it loads — falls back to the local score until then.
  const [engineEsg, setEngineEsg] = useState<FlaskEsgScoreResponse | null>(null)
  useEffect(() => {
    if (!esg.hasData) {
      setEngineEsg(null)
      return
    }
    const reportingRate = esg.totalDays > 0 ? Math.min(1, esg.daysLogged / esg.totalDays) : 0
    fetch('/api/esg-score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        average_waste_percent: esg.avgWaste,
        days_logged: esg.daysLogged,
        total_days_in_period: esg.totalDays,
        reporting_rate: reportingRate,
        recommendations_acted_on: esg.recsActed,
        total_recommendations: esg.recsTotal,
      }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: FlaskEsgScoreResponse | { error: string } | null) => {
        if (!data || 'error' in data) return
        setEngineEsg(data)
      })
      .catch(() => undefined)
  }, [esg.hasData, esg.avgWaste, esg.daysLogged, esg.totalDays, esg.recsActed, esg.recsTotal])

  // Fetch grounded waste-risk predictions to strengthen the AI Summary (additive only).
  // Menu-item-level prediction still runs on the engine's own menu/forecast data — it
  // doesn't yet take this business's real menu_items (see the menu-scoping plan in memory).
  const [wastePredictions, setWastePredictions] = useState<FlaskWastePredictionsResponse | null>(null)
  useEffect(() => {
    fetch('/api/waste-predictions')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: FlaskWastePredictionsResponse | { error: string } | null) => {
        if (!data || 'error' in data) return
        setWastePredictions(data)
      })
      .catch(() => undefined)
  }, [])

  const overallScore = engineEsg?.dashboard_cards.overall.score ?? esg.overallScore
  const envScore = engineEsg?.dashboard_cards.environmental.score ?? esg.envScore
  const socialScore = engineEsg?.dashboard_cards.social.score ?? esg.socialScore
  const govScore = engineEsg?.dashboard_cards.governance.score ?? esg.govScore

  // Bar chart / line chart shared geometry
  const barH = 96
  const barW = 28
  const barGap = 10
  const barMax = Math.max(...wasteTrend.map(m => m.avg), 50) // must be ≥50 so 50% grid line stays at y≥0
  const barChartW = wasteTrend.length * (barW + barGap) - barGap

  const pointX = (i: number) => i * (barW + barGap) + barW / 2
  const pointY = (avg: number) => barH - (avg / barMax) * barH

  const lineSegments: Array<Array<{ x: number; y: number }>> = []
  let currentSegment: Array<{ x: number; y: number }> = []
  wasteTrend.forEach((m, i) => {
    if (m.hasData) {
      currentSegment.push({ x: pointX(i), y: pointY(m.avg) })
    } else if (currentSegment.length > 0) {
      lineSegments.push(currentSegment)
      currentSegment = []
    }
  })
  if (currentSegment.length > 0) lineSegments.push(currentSegment)

  const lastDataPoint = [...wasteTrend].reverse().find(m => m.hasData)
  const lastDataIndex = lastDataPoint ? wasteTrend.lastIndexOf(lastDataPoint) : -1

  const kpiCards = [
    {
      label: t.overallEsgScore,
      score: overallScore,
      showOutOf100: true,
      badge: esg.hasData ? getScoreStatusLabel(overallScore, t) : '--',
      badgeLabel: '',
    },
    {
      label: t.environmental,
      score: envScore,
      showOutOf100: false,
      badge: esg.hasData ? `${esg.avgWaste}%` : '--',
      badgeLabel: t.avgFoodWaste,
    },
    {
      label: t.social,
      score: socialScore,
      showOutOf100: false,
      badge: `${esg.daysLogged}/${esg.totalDays}d`,
      badgeLabel: t.teamReporting,
    },
    {
      label: t.governance,
      score: govScore,
      showOutOf100: false,
      badge: esg.recsTotal > 0 ? `${esg.recsActed}/${esg.recsTotal}` : '--',
      badgeLabel: t.aiRecAdherence,
    },
  ]

  const scoreBreakdownRows = [
    { label: t.environmental, score: envScore, color: '#16a34a' },
    { label: t.social, score: socialScore, color: '#4ade80' },
    { label: t.governance, score: govScore, color: '#86efac' },
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

    const recentPoints = wasteTrend.filter(m => m.hasData).slice(-2)
    if (recentPoints.length === 2) {
      const scoreFromWaste = (avg: number) => Math.round(Math.min(100, Math.max(0, 100 - avg * 2.5)))
      const scoreDelta = scoreFromWaste(recentPoints[1].avg) - scoreFromWaste(recentPoints[0].avg)
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

    if (analyticsData) {
      aiSummaryBullets.push(
        t.aiSummaryTotalCo2.replace('{amount}', analyticsData.carbon_emissions.total_co2_kg.toLocaleString()),
      )
      aiSummaryBullets.push(
        t.aiSummaryOperatingCost.replace('{amount}', analyticsData.costs.total_operating_cost.toLocaleString()),
      )
      const flaggedCount = Object.values(analyticsData.benchmark_comparison).filter(
        (status) => status === 'Above benchmark' || status === 'High',
      ).length
      if (flaggedCount > 0) {
        aiSummaryBullets.push(t.aiSummaryBenchmarkFlag.replace('{count}', String(flaggedCount)))
      }
    }

    if (wastePredictions && wastePredictions.summary.overall_waste_risk !== 'Low Waste Risk') {
      aiSummaryBullets.push(
        t.aiSummaryWasteRisk
          .replace('{risk}', wastePredictions.summary.overall_waste_risk)
          .replace('{amount}', wastePredictions.summary.total_predicted_waste_kg.toLocaleString()),
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
            return (
              <div key={card.label} className="rounded-[0.75rem] bg-white p-4 shadow-[0_1px_4px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.04)] sm:p-5">
                <p className="text-[11px] font-bold leading-snug text-gray-500 sm:text-xs">{card.label}</p>
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

              {wasteTrend.map((m, i) =>
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

              {wasteTrend.map((m, i) => (
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

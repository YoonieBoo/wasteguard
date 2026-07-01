'use client'

import { useState } from 'react'
import type { ElementType } from 'react'
import {
  Leaf, Users, Shield, Zap, Droplets, UtensilsCrossed, Wind, CircleDollarSign,
  Download, Star, CheckCircle2, Sparkles, ChevronRight,
} from 'lucide-react'
import { getText, type Language } from '@/lib/i18n'
import { getEsgData, type FoodRow, type TimeRange } from '@/lib/mock-data'
import { TimeFilterToggle } from '@/components/time-filter-toggle'
import type { Recommendation } from '@/lib/recommendations'

interface EsgDashboardProps {
  dailyInputs: FoodRow[]
  language: Language
  recsTotal: number
  recsActed: number
  recommendations?: Recommendation[]
  onGoToRecommendations?: () => void
}

// ── helpers ────────────────────────────────────────────────────────────────

function badgeLabel(score: number): string {
  if (score >= 90) return 'Outstanding'
  if (score >= 80) return 'Excellent'
  if (score >= 70) return 'Good'
  if (score >= 60) return 'Fair'
  return 'Needs Work'
}

function badgeCls(score: number): string {
  if (score >= 80) return 'bg-emerald-100 text-emerald-700'
  if (score >= 60) return 'bg-amber-100 text-amber-700'
  return 'bg-red-100 text-red-600'
}

function scoreFg(score: number): string {
  if (score >= 80) return '#15803d'
  if (score >= 60) return '#16a34a'
  if (score >= 40) return '#ca8a04'
  return '#dc2626'
}

function computeMonthlyScores(inputs: FoodRow[], recsTotal: number, recsActed: number) {
  const byMonth: Record<string, number[]> = {}
  for (const row of inputs) {
    const key = row.date.slice(0, 7)
    if (!byMonth[key]) byMonth[key] = []
    byMonth[key].push(row.waste_percent)
  }
  const months = Object.keys(byMonth).sort().slice(-6)
  const recAdh = recsTotal > 0 ? recsActed / recsTotal : 0
  return months.map(key => {
    const ws = byMonth[key]
    const avg = ws.reduce((s, v) => s + v, 0) / ws.length
    const env  = Math.round(Math.max(0, Math.min(100, 100 - avg * 2.5)))
    const soc  = Math.round(Math.min(1, ws.length / 30) * 100)
    const gov  = Math.round((Math.min(1, ws.length / 30) * 0.6 + recAdh * 0.4) * 100)
    const score = Math.round(env * 0.5 + soc * 0.25 + gov * 0.25)
    const [y, m] = key.split('-')
    const label = new Date(Number(y), Number(m) - 1).toLocaleDateString('en-US', { month: 'short' })
    return { key, label, score }
  })
}

function relativeTime(dateStr: string, refDate: string): string {
  const d = new Date(dateStr), r = new Date(refDate)
  const diff = Math.floor((r.getTime() - d.getTime()) / 86400000)
  if (diff <= 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 7) return `${diff} days ago`
  if (diff < 14) return '1 week ago'
  return `${Math.floor(diff / 7)} weeks ago`
}

// ── StarRating ─────────────────────────────────────────────────────────────

function StarRating({ score }: { score: number }) {
  const stars = score / 20
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => {
        const fill = Math.min(1, Math.max(0, stars - (i - 1)))
        return (
          <div key={i} className="relative h-3.5 w-3.5">
            <Star className="absolute inset-0 h-3.5 w-3.5 text-gray-200" fill="currentColor" />
            <div className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star className="h-3.5 w-3.5 text-amber-400" fill="currentColor" />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── LineChart ──────────────────────────────────────────────────────────────

function LineChart({ data }: { data: { label: string; score: number; key: string }[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-[0.5rem] bg-gray-50">
        <p className="text-xs font-bold text-gray-400">No historical data yet</p>
      </div>
    )
  }

  const W = 400, H = 150
  const PAD = { t: 24, r: 24, b: 28, l: 28 }
  const iW = W - PAD.l - PAD.r
  const iH = H - PAD.t - PAD.b
  const n = data.length

  const xs = data.map((_, i) => PAD.l + (n > 1 ? (i / (n - 1)) * iW : iW / 2))
  const ys = data.map(d => PAD.t + (1 - d.score / 100) * iH)
  const pts = xs.map((x, i) => `${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ')

  const fillPts = [
    `${xs[0].toFixed(1)},${(PAD.t + iH).toFixed(1)}`,
    ...xs.map((x, i) => `${x.toFixed(1)},${ys[i].toFixed(1)}`),
    `${xs[n - 1].toFixed(1)},${(PAD.t + iH).toFixed(1)}`,
  ].join(' ')

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 150 }}>
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#16a34a" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#16a34a" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 25, 50, 75, 100].map(v => {
        const y = PAD.t + (1 - v / 100) * iH
        return (
          <g key={v}>
            <line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y} stroke="#f3f4f6" strokeWidth={1} />
            <text x={PAD.l - 5} y={y + 3.5} textAnchor="end" fontSize={8} fill="#d1d5db" fontFamily="inherit">{v}</text>
          </g>
        )
      })}
      <polygon points={fillPts} fill="url(#lg)" />
      <polyline points={pts} fill="none" stroke="#16a34a" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {data.map((d, i) => (
        <g key={d.key}>
          <circle cx={xs[i]} cy={ys[i]} r={i === n - 1 ? 5.5 : 4} fill={i === n - 1 ? '#16a34a' : 'white'} stroke="#16a34a" strokeWidth={2} />
          <text x={xs[i]} y={ys[i] - 9} textAnchor="middle" fontSize={9} fontWeight={700} fill="#15803d" fontFamily="inherit">{d.score}</text>
          <text x={xs[i]} y={H - 4} textAnchor="middle" fontSize={9} fill="#9ca3af" fontFamily="inherit">{d.label}</text>
        </g>
      ))}
    </svg>
  )
}

// ── MetricCard ─────────────────────────────────────────────────────────────

function MetricCard({
  Icon, iconBg, iconColor, label, value, unit,
}: {
  Icon: ElementType<{ className?: string }>
  iconBg: string
  iconColor: string
  label: string
  value: string
  unit: string
}) {
  return (
    <div className="rounded-[0.5rem] border border-gray-100 bg-white p-3">
      <div className={`mb-2.5 flex h-9 w-9 items-center justify-center rounded-full ${iconBg}`}>
        <Icon className={`h-4 w-4 ${iconColor}`} />
      </div>
      <p className="text-[10px] font-bold leading-tight text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-black leading-none text-gray-900">
        {value}
        <span className="ml-1 text-[11px] font-bold text-gray-400">{unit}</span>
      </p>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export function EsgDashboard({
  dailyInputs,
  language,
  recsTotal,
  recsActed,
  recommendations = [],
  onGoToRecommendations,
}: EsgDashboardProps) {
  const [range, setRange] = useState<TimeRange>('month')
  const esg = getEsgData(range, dailyInputs, recsTotal, recsActed)

  // Derived environmental impact values
  const electricitySaved = esg.hasData ? Math.round(esg.totalPortionsSaved * 3.2) : 0
  const waterSaved       = esg.hasData ? Math.round(esg.totalPortionsSaved * 12.5) : 0
  const foodWasteKg      = esg.hasData ? Math.round(esg.totalPortionsSaved * 0.4) : 0

  // Monthly ESG trend for line chart
  const monthlyScores = computeMonthlyScores(dailyInputs, recsTotal, recsActed)
  const prevScore = monthlyScores.length >= 2 ? monthlyScores[monthlyScores.length - 2].score : null
  const scoreDiff = prevScore != null ? esg.overallScore - prevScore : null

  // Reference date for relative time (latest date in data)
  const refDate = dailyInputs.length > 0
    ? [...dailyInputs].sort((a, b) => b.date.localeCompare(a.date))[0].date
    : new Date().toISOString().slice(0, 10)

  // Top 2 pending recs for inline preview
  const pendingRecs = recommendations.filter(r => r.status === 'pending').slice(0, 2)

  // This-period highlights
  const highlights: string[] = []
  if (recsActed > 0) highlights.push(`${recsActed} recommendation${recsActed > 1 ? 's' : ''} accepted`)
  if (esg.hasData && esg.avgWaste < 15) highlights.push('Food waste below 15% target')
  if (esg.hasData && esg.totalCo2Saved > 0) highlights.push(`CO₂ reduced by ${esg.totalCo2Saved.toFixed(0)} kg`)
  if (esg.reportingRate >= 0.8) highlights.push(`Team reporting at ${Math.round(esg.reportingRate * 100)}%`)
  if (highlights.length < 2 && esg.daysLogged > 0) highlights.push(`${esg.daysLogged} days of data logged`)

  // Recent activity (newest 5 rows)
  const recentRows = [...dailyInputs]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5)

  const rangeLabel = range === 'day' ? 'Today' : range === 'week' ? 'This Week' : 'This Month'

  return (
    <main className="min-h-dvh w-full bg-[#f1f5f2] px-4 pb-28 pt-6 sm:px-5 md:px-6 lg:px-8 lg:pb-8 lg:pt-6">
      <div className="mx-auto w-full max-w-[780px]">

        {/* Header */}
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-gray-900 sm:text-3xl">ESG Dashboard</h1>
            <p className="mt-0.5 text-xs font-medium text-gray-400">
              Track your sustainability performance and improve every day.
            </p>
          </div>
          <TimeFilterToggle value={range} onChange={setRange} language={language} />
        </div>

        {/* ── 1. Overall Sustainability Score ───────────────────────────── */}
        <div className="mb-4 overflow-hidden rounded-[0.875rem] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.08),0_4px_16px_rgba(0,0,0,0.05)]">
          <div className="p-5 sm:p-6">
            {/* Hero row */}
            <div className="mb-5 flex items-start gap-5">
              {/* Globe decoration */}
              <div className="relative hidden shrink-0 sm:flex h-[88px] w-[88px] items-center justify-center rounded-full bg-gradient-to-br from-emerald-100 to-emerald-50">
                <Leaf className="h-11 w-11 text-emerald-500" />
                <div className="absolute -right-0.5 -top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-300/60">
                  <Leaf className="h-3 w-3 text-emerald-700" />
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Overall Sustainability Score</p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-[52px] font-black leading-none" style={{ color: esg.hasData ? scoreFg(esg.overallScore) : '#d1d5db' }}>
                    {esg.hasData ? esg.overallScore : '--'}
                  </span>
                  <span className="text-base font-bold text-gray-300">/ 100</span>
                </div>
                <div className="mt-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-black ${esg.hasData ? badgeCls(esg.overallScore) : 'bg-gray-100 text-gray-400'}`}>
                    {esg.hasData ? badgeLabel(esg.overallScore) : '--'}
                  </span>
                </div>
                <div className="mt-2">
                  <StarRating score={esg.hasData ? esg.overallScore : 0} />
                </div>
                {scoreDiff != null && (
                  <p className="mt-2 text-[11px] font-bold">
                    <span className={scoreDiff >= 0 ? 'text-emerald-600' : 'text-red-500'}>
                      {scoreDiff >= 0 ? '↑' : '↓'} {Math.abs(scoreDiff)} points this period
                    </span>
                    {monthlyScores.length >= 2 && (
                      <span className="text-gray-400"> · Compared to {monthlyScores[monthlyScores.length - 2].label}</span>
                    )}
                  </p>
                )}
              </div>
            </div>

            {/* 3 Pillar cards */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { Icon: Leaf,   label: 'Environmental', score: esg.envScore,    desc: 'Energy, water and waste performance',         iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600' },
                { Icon: Users,  label: 'Social',        score: esg.socialScore, desc: 'Team wellbeing and community impact',          iconBg: 'bg-blue-100',    iconColor: 'text-blue-600'    },
                { Icon: Shield, label: 'Governance',    score: esg.govScore,    desc: 'Policies, compliance and transparency',        iconBg: 'bg-purple-100',  iconColor: 'text-purple-600'  },
              ].map(({ Icon, label, score, desc, iconBg, iconColor }) => (
                <div key={label} className="rounded-[0.625rem] border border-gray-100 p-3 sm:p-4">
                  <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-full ${iconBg}`}>
                    <Icon className={`h-4 w-4 ${iconColor}`} />
                  </div>
                  <p className="text-[11px] font-bold text-gray-500">{label}</p>
                  <p className="mt-0.5 text-[26px] font-black leading-none" style={{ color: esg.hasData ? scoreFg(score) : '#d1d5db' }}>
                    {esg.hasData ? score : '--'}
                  </p>
                  <span className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[9px] font-black ${esg.hasData ? badgeCls(score) : 'bg-gray-100 text-gray-400'}`}>
                    {esg.hasData ? badgeLabel(score) : '--'}
                  </span>
                  <p className="mt-2 hidden text-[9px] font-medium leading-tight text-gray-400 sm:block">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── 2. Environmental Impact ───────────────────────────────────── */}
        <div className="mb-4 rounded-[0.875rem] bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.08),0_4px_16px_rgba(0,0,0,0.05)] sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-base font-black text-gray-900">Environmental Impact</h2>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black text-emerald-700">{rangeLabel}</span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <MetricCard Icon={Zap}              iconBg="bg-emerald-100" iconColor="text-emerald-600" label="Electricity Saved"  value={electricitySaved.toLocaleString()}       unit="kWh" />
            <MetricCard Icon={Droplets}         iconBg="bg-blue-100"    iconColor="text-blue-600"    label="Water Saved"        value={waterSaved.toLocaleString()}              unit="L"   />
            <MetricCard Icon={UtensilsCrossed}  iconBg="bg-orange-100"  iconColor="text-orange-600"  label="Food Waste Reduced" value={foodWasteKg.toLocaleString()}             unit="kg"  />
            <MetricCard Icon={Wind}             iconBg="bg-teal-100"    iconColor="text-teal-600"    label="CO₂ Reduced"        value={esg.totalCo2Saved.toFixed(0)}             unit="kg"  />
            <MetricCard Icon={CircleDollarSign} iconBg="bg-amber-100"   iconColor="text-amber-600"   label="Est. Cost Savings"  value={esg.totalMoneySaved.toLocaleString()}     unit="THB" />
          </div>
        </div>

        {/* ── 3. AI Sustainability Recommendations ─────────────────────── */}
        {recommendations.length > 0 && (
          <div className="mb-4 rounded-[0.875rem] bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.08),0_4px_16px_rgba(0,0,0,0.05)] sm:p-6">
            <div className="mb-1 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-gray-900">AI Sustainability Recommendations</h2>
                <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
              </div>
              {onGoToRecommendations && (
                <button
                  onClick={onGoToRecommendations}
                  className="flex items-center gap-0.5 text-[11px] font-black text-emerald-600 hover:text-emerald-700"
                >
                  View all recommendations <ChevronRight className="h-3 w-3" />
                </button>
              )}
            </div>
            <p className="mb-4 text-[11px] font-medium text-gray-400">
              Recommendations generated based on your data and performance.
            </p>

            {pendingRecs.length === 0 ? (
              <div className="rounded-[0.5rem] bg-emerald-50 px-4 py-3 text-center">
                <p className="text-xs font-black text-emerald-700">
                  All {recsActed} recommendations have been reviewed!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingRecs.map((rec, idx) => {
                  const title = language === 'th' ? rec.titleTh : rec.title
                  const imgSrc = rec.affectedItemFileName ? `/hotel/${rec.affectedItemFileName}` : null
                  const conf = Math.round(rec.confidence <= 1 ? rec.confidence * 100 : rec.confidence)

                  return (
                    <div key={rec.id} className="flex gap-3 rounded-[0.625rem] border border-gray-100 p-3 sm:gap-4">
                      {/* Thumbnail */}
                      <div className="relative shrink-0">
                        {imgSrc ? (
                          <img
                            src={imgSrc}
                            alt=""
                            className="h-[68px] w-[68px] rounded-[0.5rem] object-cover sm:h-20 sm:w-20"
                            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                          />
                        ) : (
                          <div className="flex h-[68px] w-[68px] items-center justify-center rounded-[0.5rem] bg-emerald-50 sm:h-20 sm:w-20">
                            <Sparkles className="h-7 w-7 text-emerald-400" />
                          </div>
                        )}
                        <span className="absolute -left-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-gray-900 text-[9px] font-black text-white">
                          {idx + 1}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-black leading-tight text-gray-900">{title}</p>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
                          <div>
                            <p className="text-[9px] font-bold uppercase tracking-wide text-gray-400">Est. Monthly Saving</p>
                            <p className="text-xs font-black text-gray-800">THB {rec.estimatedSavings.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold uppercase tracking-wide text-gray-400">Carbon Reduction</p>
                            <p className="text-xs font-black text-gray-800">{rec.co2Impact} kg CO₂</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold uppercase tracking-wide text-gray-400">Confidence</p>
                            <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-black text-emerald-700">{conf}%</span>
                          </div>
                        </div>
                        <p className="mt-1.5 line-clamp-2 text-[10px] font-medium leading-snug text-gray-400">
                          {language === 'th' ? rec.reasonTh : rec.reason}
                        </p>
                      </div>
                    </div>
                  )
                })}

                {onGoToRecommendations && (
                  <button
                    onClick={onGoToRecommendations}
                    className="w-full rounded-[0.5rem] border border-emerald-200 bg-emerald-50 py-2.5 text-[11px] font-black text-emerald-700 hover:bg-emerald-100"
                  >
                    View all {recommendations.filter(r => r.status === 'pending').length} pending recommendations →
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── 4. Improvement Progress ───────────────────────────────────── */}
        <div className="mb-4 rounded-[0.875rem] bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.08),0_4px_16px_rgba(0,0,0,0.05)] sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-base font-black text-gray-900">Improvement Progress</h2>
            <span className="text-[10px] font-bold text-gray-400">Last 6 Months</span>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="min-w-0 flex-1">
              <LineChart data={monthlyScores} />
            </div>
            <div className="shrink-0 rounded-[0.625rem] bg-gray-50 p-4 sm:w-52">
              <p className="text-xs font-black text-gray-700">This Period Highlights</p>
              <div className="mt-3 space-y-2">
                {highlights.map((h, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    <p className="text-[10px] font-bold leading-snug text-gray-600">{h}</p>
                  </div>
                ))}
              </div>
              {scoreDiff != null && (
                <div className="mt-3 border-t border-gray-200 pt-3">
                  <p className="text-[10px] font-bold text-gray-400">Overall improvement</p>
                  <p className={`text-2xl font-black ${scoreDiff >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {scoreDiff >= 0 ? '+' : ''}{scoreDiff}%
                  </p>
                  <p className="text-[9px] font-medium text-gray-400">Compared to last month</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── 5. Recent Sustainability Activity ────────────────────────── */}
        <div className="mb-4 rounded-[0.875rem] bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.08),0_4px_16px_rgba(0,0,0,0.05)] sm:p-6">
          <h2 className="mb-4 text-base font-black text-gray-900">Recent Sustainability Activity</h2>
          {recentRows.length === 0 ? (
            <p className="text-sm text-gray-400">No activity logged yet.</p>
          ) : (
            <div className="relative">
              <div className="absolute left-[13px] top-3.5 h-[calc(100%-2rem)] w-px bg-gray-100" />
              <div className="space-y-5">
                {recentRows.map(row => {
                  const isGood = row.waste_percent < 15
                  const co2 = Number(row.co2_saved ?? 0).toFixed(1)
                  const money = Math.round(Number(row.money_saved ?? 0))
                  return (
                    <div key={row.date} className="relative flex items-start gap-3">
                      <div className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-white ${isGood ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                        {isGood
                          ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          : <UtensilsCrossed className="h-3.5 w-3.5 text-amber-600" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[13px] font-black text-gray-800">
                            {isGood ? 'Food waste on target' : 'Food waste above target'}
                          </p>
                          <p className="shrink-0 text-[10px] font-bold text-gray-400">
                            {relativeTime(row.date, refDate)}
                          </p>
                        </div>
                        <p className="mt-0.5 text-[10px] font-medium text-gray-400">
                          {row.waste_percent}% waste · CO₂ saved {co2} kg · Savings THB {money.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── 6. Download Reports ───────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Download ESG Report',    sub: 'Comprehensive ESG performance report', bg: 'bg-[#1a3328]' },
            { label: 'Download Carbon Report', sub: 'Detailed carbon footprint report',      bg: 'bg-emerald-700' },
          ].map(btn => (
            <button
              key={btn.label}
              className={`${btn.bg} flex items-center gap-3 rounded-[0.75rem] p-4 text-left text-white transition hover:opacity-90 active:scale-[0.98]`}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10">
                <Download className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-black leading-tight">{btn.label}</p>
                <p className="mt-0.5 text-[10px] font-medium text-white/60">{btn.sub}</p>
              </div>
            </button>
          ))}
        </div>

      </div>
    </main>
  )
}

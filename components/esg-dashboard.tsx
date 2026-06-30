'use client'

import { useState } from 'react'
import { Leaf, Users, Shield, Award } from 'lucide-react'
import { getText, type Language } from '@/lib/i18n'
import { getEsgData, type FoodRow, type TimeRange } from '@/lib/mock-data'
import { TimeFilterToggle } from '@/components/time-filter-toggle'

interface EsgDashboardProps {
  dailyInputs: FoodRow[]
  language: Language
  recsTotal: number
  recsActed: number
}

function getRatingLabel(rating: string, t: ReturnType<typeof getText>) {
  if (rating === 'A+' || rating === 'A') return t.ratingExcellent
  if (rating === 'B+') return t.ratingVeryGood
  if (rating === 'B') return t.ratingGood
  if (rating === 'C') return t.ratingFair
  if (rating === 'D') return t.ratingPoor
  return '--'
}

function scoreColor(s: number) {
  return s >= 80 ? '#16a34a' : s >= 60 ? '#d97706' : '#dc2626'
}
function scoreBadgeBg(s: number) {
  return s >= 80 ? '#dcfce7' : s >= 60 ? '#fef3c7' : '#fee2e2'
}
function scoreBadgeText(s: number) {
  return s >= 80 ? '#166534' : s >= 60 ? '#92400e' : '#991b1b'
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

function polarToCartesian(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg - 90) * (Math.PI / 180)
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  if (endDeg - startDeg <= 0) return ''
  if (endDeg - startDeg >= 360) endDeg = startDeg + 359.99
  const s = polarToCartesian(cx, cy, r, startDeg)
  const e = polarToCartesian(cx, cy, r, endDeg)
  const large = endDeg - startDeg > 180 ? 1 : 0
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`
}

export function EsgDashboard({ dailyInputs, language, recsTotal, recsActed }: EsgDashboardProps) {
  const t = getText(language)
  const [range, setRange] = useState<TimeRange>('month')
  const esg = getEsgData(range, dailyInputs, recsTotal, recsActed)
  const monthly = computeMonthlyWaste(dailyInputs)

  // Donut chart dimensions
  const cx = 84, cy = 84, r = 62, sw = 24

  // Weighted score angle per pillar (E=50%, S=25%, G=25% of 360°)
  const eAngle = esg.hasData ? (esg.envScore * 0.5 / 100) * 360 : 0
  const sAngle = esg.hasData ? (esg.socialScore * 0.25 / 100) * 360 : 0
  const gAngle = esg.hasData ? (esg.govScore * 0.25 / 100) * 360 : 0

  // Bar chart
  const barH = 96
  const barW = 28
  const barGap = 10
  const barMax = Math.max(...monthly.map(m => m.avg), 50) // must be ≥50 so 50% grid line stays at y≥0
  const barChartW = monthly.length * (barW + barGap) - barGap

  const barColor = (v: number) => v < 20 ? '#16a34a' : v < 35 ? '#d97706' : '#dc2626'

  const kpiCards = [
    {
      label: t.overallEsgScore,
      score: esg.overallScore,
      badge: esg.rating,
      badgeLabel: esg.hasData ? getRatingLabel(esg.rating, t) : '--',
      Icon: Award,
    },
    {
      label: t.environmental,
      score: esg.envScore,
      badge: esg.hasData ? `${esg.avgWaste}%` : '--',
      badgeLabel: t.avgFoodWaste,
      Icon: Leaf,
    },
    {
      label: t.social,
      score: esg.socialScore,
      badge: `${esg.daysLogged}/${esg.totalDays}d`,
      badgeLabel: t.teamReporting,
      Icon: Users,
    },
    {
      label: t.governance,
      score: esg.govScore,
      badge: esg.recsTotal > 0 ? `${esg.recsActed}/${esg.recsTotal}` : '--',
      badgeLabel: t.aiRecAdherence,
      Icon: Shield,
    },
  ]

  const pillars = [
    {
      letter: 'E', label: t.environmental, note: t.envPillarNote,
      score: esg.envScore, color: '#16a34a', badgeBg: '#dcfce7', cardBg: '#f0fdf4',
      metrics: [
        { label: t.avgFoodWaste,  value: esg.hasData ? `${esg.avgWaste}%` : '--' },
        { label: t.co2SavedTotal, value: esg.hasData ? `${esg.totalCo2Saved} kg` : '--' },
        { label: t.portionsSaved, value: esg.hasData ? esg.totalPortionsSaved.toLocaleString() : '--' },
      ],
    },
    {
      letter: 'S', label: t.social, note: t.socialPillarNote,
      score: esg.socialScore, color: '#2563eb', badgeBg: '#dbeafe', cardBg: '#eff6ff',
      metrics: [
        { label: t.teamReporting,     value: `${esg.daysLogged} / ${esg.totalDays}` },
        { label: t.donationPotential, value: esg.hasData ? esg.totalLeftover.toLocaleString() : '--' },
      ],
    },
    {
      letter: 'G', label: t.governance, note: t.govPillarNote,
      score: esg.govScore, color: '#7c3aed', badgeBg: '#ede9fe', cardBg: '#f5f3ff',
      metrics: [
        { label: t.daysLoggedOf,   value: `${esg.daysLogged} / ${esg.totalDays}` },
        { label: t.aiRecAdherence, value: esg.recsTotal > 0 ? `${esg.recsActed} / ${esg.recsTotal}` : '--' },
      ],
    },
  ]

  return (
    <main className="min-h-dvh w-full bg-[#eef2ef] px-4 pb-28 pt-8 sm:px-5 md:px-6 lg:px-8 lg:pb-8 lg:pt-7">
      <div className="mx-auto w-full max-w-[960px]">

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
                  <span className="truncate text-[10px] font-medium text-gray-400">{card.badgeLabel}</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Charts row */}
        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">

          {/* Donut chart */}
          <div className="rounded-[0.75rem] bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.04)]">
            <p className="mb-4 text-sm font-black text-gray-900">
              {language === 'th' ? 'การกระจายคะแนน ESG' : 'ESG Score Breakdown'}
            </p>
            <div className="flex items-center gap-6">
              <svg width={cx * 2} height={cy * 2} viewBox={`0 0 ${cx * 2} ${cy * 2}`} className="shrink-0">
                {/* Track */}
                <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f3f4f6" strokeWidth={sw} />
                {esg.hasData ? (
                  <>
                    <path d={arcPath(cx, cy, r, 0, eAngle)}
                      fill="none" stroke="#16a34a" strokeWidth={sw} strokeLinecap="butt" />
                    <path d={arcPath(cx, cy, r, eAngle, eAngle + sAngle)}
                      fill="none" stroke="#2563eb" strokeWidth={sw} strokeLinecap="butt" />
                    <path d={arcPath(cx, cy, r, eAngle + sAngle, eAngle + sAngle + gAngle)}
                      fill="none" stroke="#7c3aed" strokeWidth={sw} strokeLinecap="butt" />
                  </>
                ) : (
                  <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth={sw} />
                )}
                {/* Center */}
                <text x={cx} y={cy - 9} textAnchor="middle" fontSize={24} fontWeight={900}
                  fill={esg.hasData ? scoreColor(esg.overallScore) : '#d1d5db'} fontFamily="inherit">
                  {esg.hasData ? esg.overallScore : '--'}
                </text>
                <text x={cx} y={cy + 8} textAnchor="middle" fontSize={10} fontWeight={700}
                  fill="#9ca3af" fontFamily="inherit">
                  {language === 'th' ? 'คะแนนรวม' : 'Overall'}
                </text>
                <text x={cx} y={cy + 24} textAnchor="middle" fontSize={15} fontWeight={900}
                  fill={esg.hasData ? scoreColor(esg.overallScore) : '#d1d5db'} fontFamily="inherit">
                  {esg.rating}
                </text>
              </svg>

              <div className="flex-1 space-y-3">
                {[
                  { letter: 'E', label: t.environmental, color: '#16a34a', score: esg.envScore },
                  { letter: 'S', label: t.social,         color: '#2563eb', score: esg.socialScore },
                  { letter: 'G', label: t.governance,     color: '#7c3aed', score: esg.govScore },
                ].map(p => (
                  <div key={p.letter}>
                    <div className="mb-1 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                        <span className="text-xs font-bold text-gray-600">{p.label}</span>
                      </div>
                      <span className="text-sm font-black" style={{ color: esg.hasData ? scoreColor(p.score) : '#d1d5db' }}>
                        {esg.hasData ? p.score : '--'}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${esg.hasData ? p.score : 0}%`, backgroundColor: p.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bar chart — monthly waste % */}
          <div className="rounded-[0.75rem] bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.04)]">
            <p className="text-sm font-black text-gray-900">
              {language === 'th' ? 'ของเสียเฉลี่ยรายเดือน' : 'Monthly Avg Waste %'}
            </p>
            <p className="mb-5 text-[11px] font-medium text-gray-400">
              {language === 'th' ? '6 เดือนล่าสุด' : 'Last 6 months'}
            </p>

            {/* viewBox left margin=28 for y-axis labels, top margin=14 for value labels above bars */}
            <svg viewBox={`-28 -14 ${barChartW + 28} ${barH + 42}`} className="w-full">
              {[0, 25, 50].map(pct => {
                const y = barH - (pct / barMax) * barH
                return (
                  <g key={pct}>
                    <line x1={0} y1={y} x2={barChartW} y2={y} stroke="#f3f4f6" strokeWidth={1} />
                    <text x={-5} y={y + 3} textAnchor="end" fontSize={8} fill="#c8d0cd" fontFamily="inherit">{pct}%</text>
                  </g>
                )
              })}
              {monthly.map((m, i) => {
                const h = m.hasData ? Math.max(4, (m.avg / barMax) * barH) : 3
                const x = i * (barW + barGap)
                return (
                  <g key={m.label}>
                    <rect x={x} y={barH - h} width={barW} height={h}
                      fill={m.hasData ? barColor(m.avg) : '#e5e7eb'} rx={3} />
                    {m.hasData && (
                      <text x={x + barW / 2} y={barH - h - 5} textAnchor="middle"
                        fontSize={8} fontWeight={700} fill={barColor(m.avg)} fontFamily="inherit">
                        {m.avg}%
                      </text>
                    )}
                    <text x={x + barW / 2} y={barH + 14} textAnchor="middle"
                      fontSize={9} fill="#9ca3af" fontFamily="inherit">
                      {m.label}
                    </text>
                  </g>
                )
              })}
            </svg>

            <div className="mt-3 flex flex-wrap gap-3">
              {[
                { color: '#16a34a', label: language === 'th' ? 'ดี <20%' : 'Good <20%' },
                { color: '#d97706', label: language === 'th' ? 'ปานกลาง' : 'Fair 20–35%' },
                { color: '#dc2626', label: language === 'th' ? 'สูง >35%' : 'High >35%' },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: l.color }} />
                  <span className="text-[10px] font-medium text-gray-400">{l.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>


      </div>
    </main>
  )
}

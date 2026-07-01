'use client'

import { useState } from 'react'
import { Leaf, Users, Shield, Award, Zap, Droplets, UtensilsCrossed, Wind, BadgeDollarSign, Download, TrendingDown, CheckCircle2, ClipboardList } from 'lucide-react'
import { getText, type Language } from '@/lib/i18n'
import { getEsgData, type FoodRow, type TimeRange } from '@/lib/mock-data'
import { TimeFilterToggle } from '@/components/time-filter-toggle'
import { Button } from '@/components/ui/button'

interface EsgDashboardProps {
  dailyInputs: FoodRow[]
  language: Language
  recsTotal: number
  recsActed: number
}

function getRatingLabel(rating: string) {
  if (rating === 'A+' || rating === 'A') return 'Excellent'
  if (rating === 'B+') return 'Very Good'
  if (rating === 'B') return 'Good'
  if (rating === 'C') return 'Fair'
  if (rating === 'D') return 'Needs Work'
  return '--'
}

function scoreColor(s: number) {
  if (s >= 80) return '#15803d'
  if (s >= 60) return '#16a34a'
  if (s >= 40) return '#ca8a04'
  return '#dc2626'
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

const SECTION = 'mb-4 rounded-[0.75rem] bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.04)] sm:p-6'
const LABEL = 'text-[11px] font-bold uppercase tracking-wide text-gray-400'
const DIVIDER = 'my-4 border-t border-gray-100'

export function EsgDashboard({ dailyInputs, language, recsTotal, recsActed }: EsgDashboardProps) {
  const t = getText(language)
  const [range, setRange] = useState<TimeRange>('month')
  const esg = getEsgData(range, dailyInputs, recsTotal, recsActed)

  // Donut
  const cx = 72, cy = 72, r = 54, sw = 18
  const eAngle = esg.hasData ? (esg.envScore * 0.5 / 100) * 360 : 0
  const sAngle = esg.hasData ? (esg.socialScore * 0.25 / 100) * 360 : 0
  const gAngle = esg.hasData ? (esg.govScore * 0.25 / 100) * 360 : 0

  // Derived mock env-impact values
  const electricitySaved = esg.hasData ? Math.round(esg.totalPortionsSaved * 0.15) : 0   // kWh
  const waterSaved       = esg.hasData ? Math.round(esg.totalPortionsSaved * 2.8)  : 0   // liters
  const foodWastePct     = esg.hasData ? esg.avgWaste : 0
  const co2Saved         = esg.hasData ? esg.totalCo2Saved : 0
  const moneySaved       = esg.hasData ? esg.totalMoneySaved : 0

  // Improvement progress goals
  const goals = [
    {
      label: 'Food Waste < 15%',
      current: esg.hasData ? Math.max(0, 100 - (foodWastePct / 15) * 100) : 0,
      detail: esg.hasData ? `${foodWastePct}% avg waste` : 'No data',
      color: '#15803d',
    },
    {
      label: 'CO₂ Reduction Goal (500 kg)',
      current: esg.hasData ? Math.min(100, (co2Saved / 500) * 100) : 0,
      detail: esg.hasData ? `${co2Saved.toFixed(1)} kg saved` : 'No data',
      color: '#16a34a',
    },
    {
      label: 'Team Reporting Consistency',
      current: Math.round(esg.reportingRate * 100),
      detail: `${esg.daysLogged}/${esg.totalDays} days logged`,
      color: '#4ade80',
    },
    {
      label: 'Recommendation Adherence',
      current: recsTotal > 0 ? Math.round((recsActed / recsTotal) * 100) : 0,
      detail: recsTotal > 0 ? `${recsActed}/${recsTotal} acted on` : 'No recs yet',
      color: '#86efac',
    },
  ]

  // Recent activity — last 5 days from dailyInputs, newest first
  const recentActivity = [...dailyInputs]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5)
    .map(row => ({
      date: row.date,
      waste: row.waste_percent,
      co2: Math.round(row.food_sold * (1 - row.waste_percent / 100) * 0.75 * 10) / 10,
      money: Math.round(row.money_saved ?? 0),
    }))

  return (
    <main className="min-h-dvh w-full bg-[#eef2ef] px-4 pb-28 pt-8 sm:px-5 md:px-6 lg:px-8 lg:pb-8 lg:pt-7">
      <div className="mx-auto w-full max-w-[680px]">

        {/* Header */}
        <div className="mb-5 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-black text-gray-900 sm:text-3xl">{t.esgDashboard}</h1>
          <TimeFilterToggle value={range} onChange={setRange} language={language} />
        </div>

        {/* ── 1. Overall Sustainability Score ───────────────────────────── */}
        <div className={SECTION}>
          <p className={LABEL}>Overall Sustainability Score</p>
          <hr className={DIVIDER} />
          <div className="flex items-center gap-6">
            <svg width={cx * 2} height={cy * 2} viewBox={`0 0 ${cx * 2} ${cy * 2}`} className="shrink-0">
              <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f3f4f6" strokeWidth={sw} />
              {esg.hasData ? (
                <>
                  <path d={arcPath(cx, cy, r, 0, eAngle)}
                    fill="none" stroke="#15803d" strokeWidth={sw} strokeLinecap="butt" />
                  <path d={arcPath(cx, cy, r, eAngle, eAngle + sAngle)}
                    fill="none" stroke="#4ade80" strokeWidth={sw} strokeLinecap="butt" />
                  <path d={arcPath(cx, cy, r, eAngle + sAngle, eAngle + sAngle + gAngle)}
                    fill="none" stroke="#86efac" strokeWidth={sw} strokeLinecap="butt" />
                </>
              ) : (
                <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth={sw} />
              )}
              <text x={cx} y={cy - 8} textAnchor="middle" fontSize={26} fontWeight={900}
                fill={esg.hasData ? scoreColor(esg.overallScore) : '#d1d5db'} fontFamily="inherit">
                {esg.hasData ? esg.overallScore : '--'}
              </text>
              <text x={cx} y={cy + 8} textAnchor="middle" fontSize={9} fontWeight={700}
                fill="#9ca3af" fontFamily="inherit">Overall</text>
              <text x={cx} y={cy + 23} textAnchor="middle" fontSize={14} fontWeight={900}
                fill={esg.hasData ? scoreColor(esg.overallScore) : '#d1d5db'} fontFamily="inherit">
                {esg.rating}
              </text>
            </svg>
            <div className="flex-1">
              <p className="text-3xl font-black leading-none" style={{ color: scoreColor(esg.overallScore) }}>
                {esg.hasData ? esg.overallScore : '--'}
                <span className="ml-1 text-lg">/100</span>
              </p>
              <p className="mt-1 text-base font-black text-gray-700">{esg.rating} · {getRatingLabel(esg.rating)}</p>
              <p className="mt-2 text-xs font-medium text-gray-400">
                Based on {esg.daysLogged} day{esg.daysLogged !== 1 ? 's' : ''} of data
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  { dot: '#15803d', label: 'Environmental (50%)' },
                  { dot: '#4ade80', label: 'Social (25%)' },
                  { dot: '#86efac', label: 'Governance (25%)' },
                ].map(l => (
                  <div key={l.label} className="flex items-center gap-1.5">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: l.dot }} />
                    <span className="text-[10px] font-medium text-gray-400">{l.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── 2. E / S / G Pillar Cards ─────────────────────────────────── */}
        <div className={SECTION}>
          <p className={LABEL}>Pillars</p>
          <hr className={DIVIDER} />
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Leaf,   label: 'Environmental', score: esg.envScore,    meta: `${foodWastePct}% avg waste`,               color: '#15803d' },
              { icon: Users,  label: 'Social',        score: esg.socialScore, meta: `${esg.daysLogged}/${esg.totalDays}d logged`, color: '#4ade80' },
              { icon: Shield, label: 'Governance',    score: esg.govScore,    meta: recsTotal > 0 ? `${recsActed}/${recsTotal} recs` : 'No recs', color: '#86efac' },
            ].map(({ icon: Icon, label, score, meta, color }) => (
              <div key={label} className="rounded-[0.5rem] bg-gray-50 p-3 text-center">
                <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-[#1a3328]">
                  <Icon className="h-4 w-4 text-emerald-400" />
                </div>
                <p className="text-2xl font-black" style={{ color: esg.hasData ? color : '#d1d5db' }}>
                  {esg.hasData ? score : '--'}
                </p>
                <p className="mt-0.5 text-[10px] font-black text-gray-600">{label}</p>
                <p className="mt-1 text-[9px] font-medium text-gray-400">{esg.hasData ? meta : 'No data'}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── 3. Environmental Impact ───────────────────────────────────── */}
        <div className={SECTION}>
          <p className={LABEL}>Environmental Impact</p>
          <hr className={DIVIDER} />
          <div className="space-y-3">
            {[
              { icon: Zap,              label: 'Electricity Saved',  value: esg.hasData ? `${electricitySaved} kWh` : '--',           sub: 'from reduced prep' },
              { icon: Droplets,         label: 'Water Saved',        value: esg.hasData ? `${waterSaved.toLocaleString()} L` : '--',   sub: 'estimated reduction' },
              { icon: UtensilsCrossed,  label: 'Food Waste',         value: esg.hasData ? `${foodWastePct}%` : '--',                   sub: 'average waste rate' },
              { icon: Wind,             label: 'CO₂ Reduced',        value: esg.hasData ? `${co2Saved.toFixed(1)} kg` : '--',          sub: 'carbon saved' },
              { icon: BadgeDollarSign,  label: 'Savings',            value: esg.hasData ? `THB ${moneySaved.toLocaleString()}` : '--', sub: 'total period savings' },
            ].map(({ icon: Icon, label, value, sub }) => (
              <div key={label} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50">
                    <Icon className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-800">{label}</p>
                    <p className="text-[10px] font-medium text-gray-400">{sub}</p>
                  </div>
                </div>
                <p className="text-sm font-black" style={{ color: esg.hasData ? '#15803d' : '#d1d5db' }}>{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── 4. Improvement Progress ───────────────────────────────────── */}
        <div className={SECTION}>
          <p className={LABEL}>Improvement Progress</p>
          <hr className={DIVIDER} />
          <div className="space-y-4">
            {goals.map(goal => (
              <div key={goal.label}>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <p className="text-xs font-black text-gray-700">{goal.label}</p>
                  <p className="shrink-0 text-xs font-black" style={{ color: goal.color }}>{Math.round(goal.current)}%</p>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${goal.current}%`, backgroundColor: goal.color }}
                  />
                </div>
                <p className="mt-1 text-[10px] font-medium text-gray-400">{goal.detail}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── 5. Recent Sustainability Activity ────────────────────────── */}
        <div className={SECTION}>
          <p className={LABEL}>Recent Sustainability Activity</p>
          <hr className={DIVIDER} />
          {recentActivity.length === 0 ? (
            <p className="text-sm font-medium text-gray-400">No activity logged yet.</p>
          ) : (
            <div className="space-y-3">
              {recentActivity.map(item => {
                const good = item.waste < 15
                return (
                  <div key={item.date} className="flex items-start gap-3">
                    <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${good ? 'bg-emerald-50' : 'bg-amber-50'}`}>
                      {good
                        ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        : <TrendingDown className="h-4 w-4 text-amber-500" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-black text-gray-800">{item.date}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-black ${good ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {item.waste}% waste
                        </span>
                      </div>
                      <p className="mt-0.5 text-[10px] font-medium text-gray-400">
                        CO₂ saved: {item.co2} kg · Savings: THB {item.money.toLocaleString()}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── 6. Downloads ─────────────────────────────────────────────── */}
        <div className={SECTION}>
          <p className={LABEL}>Reports</p>
          <hr className={DIVIDER} />
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="secondary"
              className="flex h-12 items-center justify-center gap-2 rounded-[0.5rem] bg-[#1a3328] text-xs font-black text-white hover:bg-[#1a3328]/90"
            >
              <Download className="h-4 w-4" />
              Download ESG Report
            </Button>
            <Button
              variant="secondary"
              className="flex h-12 items-center justify-center gap-2 rounded-[0.5rem] bg-emerald-700 text-xs font-black text-white hover:bg-emerald-700/90"
            >
              <Download className="h-4 w-4" />
              Download Carbon Report
            </Button>
          </div>
        </div>

      </div>
    </main>
  )
}

'use client'

import { useState } from 'react'
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

function scoreColor(score: number) {
  if (score >= 80) return '#6ee7b7'   // emerald-300
  if (score >= 60) return '#fcd34d'   // amber-300
  return '#f87171'                     // red-400
}

export function EsgDashboard({ dailyInputs, language, recsTotal, recsActed }: EsgDashboardProps) {
  const t = getText(language)
  const [range, setRange] = useState<TimeRange>('month')
  const esg = getEsgData(range, dailyInputs, recsTotal, recsActed)

  // Ring chart math (same approach as carbon-impact)
  const circleSize = 200
  const strokeWidth = 14
  const radius = (circleSize - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = esg.hasData ? esg.overallScore / 100 : 0
  const progressOffset = circumference - progress * circumference
  const ringColor = esg.hasData ? scoreColor(esg.overallScore) : 'rgba(255,255,255,0.15)'

  const pillars = [
    {
      letter: 'E',
      label: t.environmental,
      note: t.envPillarNote,
      score: esg.envScore,
      accent: '#6ee7b7',
      trackColor: 'rgba(110,231,183,0.18)',
      metrics: [
        { label: t.avgFoodWaste,  value: esg.hasData ? `${esg.avgWaste}%`                         : '--' },
        { label: t.co2SavedTotal, value: esg.hasData ? `${esg.totalCo2Saved} kg`                  : '--' },
        { label: t.portionsSaved, value: esg.hasData ? esg.totalPortionsSaved.toLocaleString()     : '--' },
      ],
    },
    {
      letter: 'S',
      label: t.social,
      note: t.socialPillarNote,
      score: esg.socialScore,
      accent: '#7dd3fc',
      trackColor: 'rgba(125,211,252,0.18)',
      metrics: [
        { label: t.teamReporting,     value: `${esg.daysLogged} / ${esg.totalDays}` },
        { label: t.donationPotential, value: esg.hasData ? `${esg.totalLeftover.toLocaleString()} portions` : '--' },
      ],
    },
    {
      letter: 'G',
      label: t.governance,
      note: t.govPillarNote,
      score: esg.govScore,
      accent: '#c4b5fd',
      trackColor: 'rgba(196,181,253,0.18)',
      metrics: [
        { label: t.daysLoggedOf,   value: `${esg.daysLogged} / ${esg.totalDays}` },
        { label: t.aiRecAdherence, value: esg.recsTotal > 0 ? `${esg.recsActed} / ${esg.recsTotal}` : '--' },
      ],
    },
  ]

  return (
    <main className="min-h-dvh w-full bg-[radial-gradient(circle_at_18%_10%,rgba(91,211,151,0.28),transparent_18rem),radial-gradient(circle_at_88%_20%,rgba(99,226,172,0.16),transparent_20rem),linear-gradient(180deg,#073f3f_0%,#0b322f_100%)] px-4 pb-28 pt-8 text-white sm:px-5 md:px-6 lg:px-8 lg:pb-8 lg:pt-7">
      <div className="mx-auto w-full max-w-[900px]">

        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-normal text-emerald-300">{t.today}</p>
            <h1 className="mt-1 text-2xl font-black leading-tight text-white sm:text-3xl lg:text-4xl">
              {t.esgDashboard}
            </h1>
            <p className="mt-1 text-sm font-semibold text-emerald-100">{t.esgDashboardNote}</p>
          </div>
          <div className="shrink-0">
            <TimeFilterToggle value={range} onChange={setRange} language={language} />
          </div>
        </div>

        {/* Hero — ring + E/S/G summary */}
        <section className="mb-5 rounded-[0.75rem] bg-white/[0.08] p-5 backdrop-blur sm:p-6">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-10">

            {/* SVG ring */}
            <div className="relative mx-auto shrink-0" style={{ width: circleSize, height: circleSize }}>
              <svg className="-rotate-90" width={circleSize} height={circleSize}>
                <circle cx={circleSize / 2} cy={circleSize / 2} r={radius}
                  fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={strokeWidth} />
                <circle cx={circleSize / 2} cy={circleSize / 2} r={radius}
                  fill="none" stroke={ringColor} strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={progressOffset}
                  style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <p className="text-4xl font-black leading-none" style={{ color: esg.hasData ? ringColor : 'rgba(255,255,255,0.3)' }}>
                  {esg.hasData ? esg.overallScore : '--'}
                </p>
                <p className="mt-1 text-[11px] font-black uppercase tracking-normal text-emerald-200">
                  {t.overallEsgScore}
                </p>
                <p className="mt-2 text-xl font-black" style={{ color: esg.hasData ? ringColor : 'rgba(255,255,255,0.3)' }}>
                  {esg.rating}
                </p>
              </div>
            </div>

            {/* Rating label + pillar mini-bars */}
            <div className="w-full min-w-0 flex-1">
              <p className="text-xl font-black text-white sm:text-2xl">
                {esg.hasData ? getRatingLabel(esg.rating, t) : t.noEsgData}
              </p>
              <p className="mt-1 text-sm font-medium text-emerald-100">
                {esg.hasData ? t.esgDashboardNote : t.noEsgDataNote}
              </p>

              <div className="mt-6 space-y-4">
                {pillars.map((p) => (
                  <div key={p.letter} className="flex items-center gap-4">
                    <span className="w-5 shrink-0 text-xs font-black" style={{ color: p.accent }}>{p.letter}</span>
                    <div className="flex-1 overflow-hidden rounded-full bg-white/10" style={{ height: 8 }}>
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${esg.hasData ? p.score : 0}%`, backgroundColor: p.accent }}
                      />
                    </div>
                    <span className="w-8 shrink-0 text-right text-sm font-black text-white">
                      {esg.hasData ? p.score : '--'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Pillar detail rows */}
        <div className="space-y-3">
          {pillars.map((p) => (
            <section key={p.letter} className="rounded-[0.75rem] bg-white/[0.08] p-5 backdrop-blur sm:p-6">
              {/* Top row: letter + label + score */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black"
                    style={{ backgroundColor: p.trackColor, color: p.accent }}
                  >
                    {p.letter}
                  </div>
                  <div>
                    <p className="text-base font-black text-white">{p.label}</p>
                    <p className="text-xs font-medium text-emerald-100/70">{p.note}</p>
                  </div>
                </div>
                <p
                  className="shrink-0 text-3xl font-black leading-none"
                  style={{ color: esg.hasData ? scoreColor(p.score) : 'rgba(255,255,255,0.3)' }}
                >
                  {esg.hasData ? p.score : '--'}
                </p>
              </div>

              {/* Progress bar */}
              <div className="mt-4 overflow-hidden rounded-full bg-white/10" style={{ height: 6 }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${esg.hasData ? p.score : 0}%`, backgroundColor: p.accent }}
                />
              </div>

              {/* Metrics */}
              <div className="mt-5 grid gap-4" style={{ gridTemplateColumns: `repeat(${p.metrics.length}, minmax(0,1fr))` }}>
                {p.metrics.map((m) => (
                  <div key={m.label}>
                    <p className="text-[11px] font-bold uppercase tracking-normal" style={{ color: p.accent, opacity: 0.7 }}>
                      {m.label}
                    </p>
                    <p className="mt-1 text-lg font-black leading-tight text-white sm:text-xl">{m.value}</p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Weighting note — minimal */}
        <p className="mt-5 text-center text-xs font-bold text-emerald-100/40">
          {language === 'th'
            ? 'น้ำหนักคะแนน: E 50% · S 25% · G 25%'
            : 'Score weighting: E 50% · S 25% · G 25%'}
        </p>

      </div>
    </main>
  )
}

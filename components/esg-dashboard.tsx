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

function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/15">
      <div
        className={`h-full rounded-full transition-all duration-700 ${color}`}
        style={{ width: `${score}%` }}
      />
    </div>
  )
}

function ratingLabel(rating: string, t: ReturnType<typeof getText>) {
  if (rating === 'A+' || rating === 'A') return t.ratingExcellent
  if (rating === 'B+') return t.ratingVeryGood
  if (rating === 'B') return t.ratingGood
  if (rating === 'C') return t.ratingFair
  if (rating === 'D') return t.ratingPoor
  return '--'
}

function ratingColor(score: number) {
  if (score >= 80) return 'text-emerald-300'
  if (score >= 60) return 'text-amber-300'
  return 'text-red-400'
}

export function EsgDashboard({ dailyInputs, language, recsTotal, recsActed }: EsgDashboardProps) {
  const t = getText(language)
  const [range, setRange] = useState<TimeRange>('month')
  const esg = getEsgData(range, dailyInputs, recsTotal, recsActed)

  const pillars = [
    {
      letter: 'E',
      label: t.environmental,
      note: t.envPillarNote,
      score: esg.envScore,
      barColor: 'bg-emerald-400',
      metrics: [
        { label: t.avgFoodWaste, value: esg.hasData ? `${esg.avgWaste}%` : '--' },
        { label: t.co2SavedTotal, value: esg.hasData ? `${esg.totalCo2Saved} kg` : '--' },
        { label: t.portionsSaved, value: esg.hasData ? esg.totalPortionsSaved.toLocaleString() : '--' },
      ],
    },
    {
      letter: 'S',
      label: t.social,
      note: t.socialPillarNote,
      score: esg.socialScore,
      barColor: 'bg-sky-400',
      metrics: [
        {
          label: t.teamReporting,
          value: `${esg.daysLogged} / ${esg.totalDays}`,
        },
        { label: t.donationPotential, value: esg.hasData ? esg.totalLeftover.toLocaleString() : '--' },
      ],
    },
    {
      letter: 'G',
      label: t.governance,
      note: t.govPillarNote,
      score: esg.govScore,
      barColor: 'bg-violet-400',
      metrics: [
        {
          label: t.daysLoggedOf,
          value: `${esg.daysLogged} / ${esg.totalDays}`,
        },
        {
          label: t.aiRecAdherence,
          value: esg.recsTotal > 0 ? `${esg.recsActed} / ${esg.recsTotal}` : '--',
        },
      ],
    },
  ]

  return (
    <main className="min-h-dvh w-full bg-[radial-gradient(circle_at_18%_10%,rgba(91,211,151,0.28),transparent_18rem),radial-gradient(circle_at_88%_20%,rgba(99,226,172,0.16),transparent_20rem),linear-gradient(180deg,#073f3f_0%,#0b322f_100%)] px-4 pb-28 pt-8 text-white sm:px-5 md:px-6 lg:px-8 lg:pb-8 lg:pt-7">
      <div className="mx-auto w-full max-w-[960px]">

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

        {/* Overall ESG score hero */}
        <div className="mb-5 overflow-hidden rounded-[0.75rem] bg-white/[0.08] backdrop-blur">
          <div className="flex items-center gap-6 p-5 sm:p-6 lg:gap-10">
            {/* Big score number */}
            <div className="shrink-0 text-center">
              <p className={`text-5xl font-black leading-none sm:text-6xl ${esg.hasData ? ratingColor(esg.overallScore) : 'text-white/40'}`}>
                {esg.hasData ? esg.overallScore : '--'}
              </p>
              <p className="mt-1 text-xs font-black uppercase tracking-normal text-emerald-200">
                {t.overallEsgScore}
              </p>
            </div>

            {/* Divider */}
            <div className="h-16 w-px shrink-0 bg-white/15" />

            {/* Rating + description */}
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-3">
                <span className={`text-3xl font-black sm:text-4xl ${esg.hasData ? ratingColor(esg.overallScore) : 'text-white/40'}`}>
                  {esg.rating}
                </span>
                <span className="text-base font-black text-white">
                  {esg.hasData ? ratingLabel(esg.rating, t) : t.noEsgData}
                </span>
              </div>
              <p className="mt-1 text-sm font-medium text-emerald-100">
                {esg.hasData ? t.esgDashboardNote : t.noEsgDataNote}
              </p>
              {/* Overall progress bar */}
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-emerald-400 transition-all duration-700"
                  style={{ width: `${esg.overallScore}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* E / S / G pillar cards */}
        <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
          {pillars.map((pillar) => (
            <div
              key={pillar.letter}
              className="rounded-[0.75rem] bg-white/[0.08] p-5 backdrop-blur"
            >
              {/* Letter badge + label */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-black uppercase tracking-normal text-emerald-200">
                    {pillar.letter}
                  </p>
                  <p className="mt-0.5 text-base font-black text-white">{pillar.label}</p>
                  <p className="mt-0.5 text-[11px] font-medium leading-4 text-emerald-100/80">
                    {pillar.note}
                  </p>
                </div>
                <span className={`shrink-0 text-2xl font-black ${esg.hasData ? ratingColor(pillar.score) : 'text-white/40'}`}>
                  {esg.hasData ? pillar.score : '--'}
                </span>
              </div>

              <ScoreBar score={esg.hasData ? pillar.score : 0} color={pillar.barColor} />

              {/* Metrics */}
              <div className="mt-4 space-y-2.5">
                {pillar.metrics.map((metric) => (
                  <div key={metric.label} className="flex items-baseline justify-between gap-2">
                    <p className="text-[11px] font-bold text-emerald-200/80">{metric.label}</p>
                    <p className="shrink-0 text-sm font-black text-white">{metric.value}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Scoring methodology note */}
        <div className="mt-6 rounded-[0.75rem] bg-white/[0.06] px-5 py-4">
          <p className="text-xs font-bold leading-5 text-emerald-100/70">
            {language === 'th'
              ? 'คะแนน ESG คำนวณจาก: สิ่งแวดล้อม (50%) · สังคม (25%) · ธรรมาภิบาล (25%) — อิงจากข้อมูลที่บันทึกในช่วงเวลาที่เลือก'
              : 'ESG score is weighted: Environmental (50%) · Social (25%) · Governance (25%) — calculated from data logged in the selected period.'}
          </p>
        </div>

      </div>
    </main>
  )
}

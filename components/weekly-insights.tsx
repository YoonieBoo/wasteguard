'use client'

import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Coins, TrendingDown } from 'lucide-react'
import { getText, type Language } from '@/lib/i18n'
import { getSavingsData, type FoodRow, type TimeRange, type WasteGuardRole } from '@/lib/mock-data'
import { TimeFilterToggle } from '@/components/time-filter-toggle'

interface WeeklyInsightsProps {
  dailyInputs?: FoodRow[]
  language: Language
  role?: WasteGuardRole
}

const fills = [
  '#b7ecd5',
  '#9fe4c4',
  '#89dcba',
  '#72d2aa',
  '#5fc89c',
  '#51bd91',
  '#44b37e',
]

const weekDayLabels = ['Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed']
const thaiWeekDayLabels = ['พฤ', 'ศ', 'ส', 'อา', 'จ', 'อ', 'พ']

export function WeeklyInsights({ dailyInputs = [], language, role = 'staff' }: WeeklyInsightsProps) {
  const t = getText(language)
  const [range, setRange] = useState<TimeRange>('week')
  const savings = getSavingsData(range, dailyInputs)
  const title = range === 'day' ? t.todayPeriod : range === 'week' ? t.thisWeek : t.thisMonth
  const canSeeMoney = role === 'owner'

  const chartRows = savings.chartRows.map((item, index) => ({
    ...item,
    day:
      range === 'month'
        ? `${t.week} ${index + 1}`
        : range === 'week'
          ? (language === 'th' ? thaiWeekDayLabels[index] : weekDayLabels[index]) ?? item.day
          : item.day,
  }))

  return (
    <main className="py-7 md:py-6">
      <div className="mb-7 md:mb-6 md:pt-2">
        <p className="mb-2 text-sm font-bold text-primary">{title}</p>
        <h1 className="text-3xl font-black leading-tight text-foreground sm:text-4xl">{t.yourSavings}</h1>
        <p className="mt-3 text-base font-medium leading-relaxed text-muted-foreground">
          {t.seeWins}
        </p>
        <TimeFilterToggle value={range} onChange={setRange} language={language} />
      </div>

      <div className={`mb-7 grid gap-3 md:mb-6 md:gap-4 ${canSeeMoney ? 'grid-cols-2' : 'grid-cols-1'}`}>
        <div className="rounded-[1.6rem] bg-white p-5 shadow-[0_14px_35px_rgba(41,91,67,0.09)] md:p-6">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/12 text-primary">
            <TrendingDown className="h-5 w-5" />
          </div>
          <p className="mt-2 text-3xl font-black text-foreground sm:text-4xl">
            {savings.lessWaste}%
          </p>
          <p className="text-sm font-bold text-muted-foreground">
            {t.lowWaste}
          </p>
        </div>

        {canSeeMoney && (
          <div className="rounded-[1.6rem] bg-white p-5 shadow-[0_14px_35px_rgba(41,91,67,0.09)] md:p-6">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/20 text-accent-foreground">
              <Coins className="h-5 w-5" />
            </div>
            <p className="mt-2 text-3xl font-black text-foreground sm:text-4xl">
              {savings.moneySaved.toLocaleString()}
            </p>
            <p className="text-sm font-bold text-muted-foreground">
              {t.thbSaved}
            </p>
          </div>
        )}
      </div>

      <section className="rounded-[2rem] bg-white p-5 shadow-[0_14px_35px_rgba(41,91,67,0.09)] md:p-7">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-foreground sm:text-2xl">{title}</h2>
            <p className="mt-1 text-sm font-bold text-muted-foreground">
              {t.higherBar}
            </p>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartRows} margin={{ top: 24, right: 4, left: -20, bottom: 4 }}>
              <CartesianGrid vertical={false} stroke="var(--secondary)" strokeWidth={1.5} />

              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fontWeight: 700, fill: 'var(--muted-foreground)' }}
              />

              <YAxis
                width={36}
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fontWeight: 700, fill: 'var(--muted-foreground)' }}
                tickFormatter={(value) => `${value}%`}
              />

              <Tooltip
                cursor={{ fill: 'rgba(68, 179, 126, 0.08)' }}
                formatter={(value) => [`${value}% ${t.sold}`, t.bakeryItems]}
                labelFormatter={(label) => `${label}`}
                contentStyle={{
                  border: '0',
                  borderRadius: '1rem',
                  boxShadow: '0 12px 30px rgba(41,91,67,0.14)',
                  fontWeight: 700,
                }}
              />

              <Bar dataKey="saved" radius={[12, 12, 4, 4]} barSize={28}>
                {chartRows.map((item, index) => (
                  <Cell key={`${item.day}-${index}`} fill={fills[index] ?? fills[fills.length - 1]} />
                ))}

                <LabelList
                  dataKey="saved"
                  position="top"
                  formatter={(value: number) => `${value}%`}
                  fill="var(--foreground)"
                  fontSize={12}
                  fontWeight={800}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </main>
  )
}

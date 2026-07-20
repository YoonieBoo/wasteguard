import data from '@/data/hotelMockData.json'

export type FoodRow = {
  date: string
  menu_item_name?: string
  quantity_sold?: number
  orders: number
  food_prepared: number
  food_sold: number
  leftover: number
  waste_percent: number
  money_saved?: number
  co2_saved?: number
  revenue?: number
  weather: string
  is_weekend: number
  promotion: number
}

export type TimeRange = 'day' | 'week' | 'month'
export type WasteGuardRole = 'staff' | 'owner'

export type IngredientEstimate = {
  name: string
  amount: string
}

export type BusinessDashboardData = {
  revenue: number
  previousRevenue: number
  revenueChangePercent: number
  orders: number
  previousOrders: number
  orderChangePercent: number
  revenueBars: {
    label: string
    current: number
    previous: number
  }[]
  orderTrend: {
    label: string
    current: number
    previous: number
  }[]
  demand: {
    morning: number
    afternoon: number
    evening: number
    morningOrders: number
    afternoonOrders: number
    eveningOrders: number
    dominant: 'morning' | 'afternoon' | 'evening'
    dominantOrders: number
  }
  // null means there isn't enough of the right kind of data to compute this
  // metric honestly (e.g. a sales-only import with no prepared-quantity
  // column) — the UI should show "not enough data" rather than a number.
  quality: {
    freshness: number | null
    taste: number | null
    packaging: number | null
  }
}

const rows = data as FoodRow[]

function dateValue(date: string) {
  return new Date(date).getTime()
}

// Falls back to the bundled demo dataset only when there's no real data yet
// (e.g. a brand-new account) — every function below this one previously
// ignored inputRows unconditionally and always showed the mock dataset,
// regardless of what real data existed.
export function getSortedRows(inputRows: FoodRow[] = []) {
  const source = inputRows.length > 0 ? inputRows : rows

  return [...source].sort((a, b) => dateValue(b.date) - dateValue(a.date))
}

function getDemoRows(inputRows: FoodRow[] = []) {
  return getSortedRows(inputRows).slice(0, 20)
}

function getRowsForRange(range: TimeRange, inputRows: FoodRow[] = []) {
  const count = range === 'day' ? 1 : range === 'week' ? 7 : 30
  return getSortedRows(inputRows).slice(0, count)
}

function getPreviousRowsForRange(range: TimeRange, inputRows: FoodRow[] = []) {
  const count = range === 'day' ? 1 : range === 'week' ? 7 : 30
  return getSortedRows(inputRows).slice(count, count * 2)
}

const savedPerPortion = 15    // avg food cost per portion (THB) — hotel restaurant
const co2PerGoodPortion = 0.75 // kg CO₂ per portion (food_waste factor 2.5 × ~0.3 kg/portion)

export function getDashboardData(inputRows: FoodRow[] = []) {
  const demoRows = getDemoRows(inputRows)
  const todayRow = demoRows[0]
  const yesterdayRow = demoRows[1] ?? todayRow
  const averageLeftover = demoRows.reduce((sum, row) => sum + row.leftover, 0) / demoRows.length
  const ordersToday = todayRow.orders
  const cookThisMuch = todayRow.food_prepared
  const wasteYesterday = Math.round(yesterdayRow.waste_percent)
  const moneySaved = Math.round(Math.max(0, averageLeftover - todayRow.leftover) * savedPerPortion)
  const revenueToday = todayRow.revenue ?? Math.round(todayRow.orders * 578)
  const co2Saved = Math.round(todayRow.food_sold * (1 - todayRow.waste_percent / 100) * co2PerGoodPortion)
  const wasteReduced = Math.max(0, Math.round(averageLeftover - todayRow.leftover))

  return {
    ordersToday,
    cookThisMuch,
    wasteYesterday,
    moneySaved,
    revenueToday,
    co2Saved,
    wasteReduced,
  }
}

export function getPrepList(inputRows: FoodRow[] = []) {
  const demoRows = getDemoRows(inputRows)
  const itemRows = getSortedRows(inputRows).filter(
    (row) => typeof row.menu_item_name === 'string' && typeof row.quantity_sold === 'number',
  )

  if (itemRows.length === 0) {
    const fallbackItems = [
      { name: 'Croissant', quantity: 55, unit: 'pieces', action: 'Bake', label: 'High demand', image: '🥐' },
      { name: 'Muffin', quantity: 30, unit: 'pieces', action: 'Bake', label: 'Bake today', image: '🧁' },
      { name: 'Banana Bread', quantity: 12, unit: 'pieces', action: 'Bake', label: 'Popular today', image: '🍞' },
      { name: 'Chocolate Cake', quantity: 8, unit: 'pieces', action: 'Bake', label: 'Afternoon snack', image: '🍰' },
    ]

    return fallbackItems.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      action: item.action,
      label: item.label,
      image: item.image,
      ingredients: getIngredientEstimate(item.name, item.quantity),
    }))
  }

  const groupedItems = itemRows.reduce<Record<string, { total: number; count: number; latest: number; latestDate: number }>>(
    (items, row) => {
      const itemName = row.menu_item_name ?? 'Item'
      const sold = row.quantity_sold ?? 0
      const rowDate = dateValue(row.date)
      const currentItem = items[itemName] ?? { total: 0, count: 0, latest: 0, latestDate: 0 }

      return {
        ...items,
        [itemName]: {
          total: currentItem.total + sold,
          count: currentItem.count + 1,
          latest: rowDate >= currentItem.latestDate ? sold : currentItem.latest,
          latestDate: Math.max(rowDate, currentItem.latestDate),
        },
      }
    },
    {},
  )

  return Object.entries(groupedItems)
    .map(([name, item]) => ({
      name,
      quantity: Math.max(1, Math.round((item.latest || item.total / item.count) * 0.9)),
      unit: 'pieces',
      action: 'Bake',
      label: item.total > 500 ? 'High demand' : 'Bake today',
      image: '🥐',
      total: item.total,
      ingredients: getIngredientEstimate(name, Math.max(1, Math.round((item.latest || item.total / item.count) * 0.9))),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)
}

export function getIngredientEstimate(itemName: string, quantity: number): IngredientEstimate[] {
  const rounded = Math.max(1, quantity)

  if (itemName === 'Croissant') {
    return [
      { name: 'Flour', amount: `${Math.max(1, Math.round((rounded / 55) * 4))} kg` },
      { name: 'Butter', amount: `${Math.max(1, Math.round((rounded / 55) * 2))} kg` },
    ]
  }

  if (itemName === 'Banana Bread') {
    return [
      { name: 'Flour', amount: `${Math.max(1, Math.round((rounded / 12) * 2))} kg` },
      { name: 'Banana', amount: `${Math.max(1, Math.round((rounded / 12) * 8))} pcs` },
    ]
  }

  if (itemName === 'Muffin') {
    return [
      { name: 'Flour', amount: `${Math.max(1, Math.round((rounded / 30) * 3))} kg` },
      { name: 'Eggs', amount: `${Math.max(6, Math.round((rounded / 30) * 18))} pcs` },
    ]
  }

  if (itemName === 'Chocolate Cake') {
    return [
      { name: 'Flour', amount: `${Math.max(1, Math.round((rounded / 8) * 2))} kg` },
      { name: 'Chocolate', amount: `${Math.max(1, Math.round((rounded / 8) * 1))} kg` },
    ]
  }

  return [
    { name: 'Flour', amount: `${Math.max(1, Math.round(rounded / 18))} kg` },
    { name: 'Butter', amount: `${Math.max(1, Math.round(rounded / 30))} kg` },
  ]
}

export function getTodayRecommendations(inputRows: FoodRow[] = []) {
  const demoRows = getDemoRows(inputRows)
  const todayRow = demoRows[0]
  const averageOrders = Math.round(demoRows.reduce((sum, row) => sum + row.orders, 0) / demoRows.length)
  const hasRain = todayRow.weather.toLowerCase() === 'rainy'
  const hasPromotion = todayRow.promotion === 1
  const highSold = todayRow.food_sold > averageOrders

  const recommendations = []

  if (hasRain) {
    recommendations.push({
      title: 'Cook less today',
      note: 'Rainy day.',
      kind: 'rain',
    })
  }

  if (hasPromotion) {
    recommendations.push({
      title: 'More customers today',
      note: 'Promo is on.',
      kind: 'promo',
    })
  }

  if (highSold) {
    recommendations.push({
      title: 'Bake popular items',
      note: 'Sold more lately.',
      kind: 'popular',
    })
  }

  if (recommendations.length === 0) {
    recommendations.push({
      title: 'Cook normal today',
      note: 'No big change.',
      kind: 'steady',
    })
  }

  return recommendations.slice(0, 3)
}

function average(items: number[]) {
  return items.reduce((sum, item) => sum + item, 0) / items.length
}

function safeAverage(items: number[]) {
  return items.length > 0 ? average(items) : 0
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function percentChange(current: number, previous: number) {
  if (previous <= 0) {
    return current > 0 ? 100 : 0
  }

  return ((current - previous) / previous) * 100
}

function getChartLabel(row: FoodRow, index: number, range: TimeRange) {
  if (range === 'day') {
    return 'Today'
  }

  if (range === 'month') {
    return String(index + 1).padStart(2, '0')
  }

  return new Date(row.date).toLocaleDateString('en-US', { weekday: 'short' })
}

export function getBusinessDashboardData(range: TimeRange, inputRows: FoodRow[] = []): BusinessDashboardData {
  const currentRows = getRowsForRange(range, inputRows)
  const previousRows = getPreviousRowsForRange(range, inputRows)
  const orderedCurrentRows = [...currentRows].reverse()
  const orderedPreviousRows = [...previousRows].reverse()
  const visibleRows = orderedCurrentRows.slice(-12)
  const visiblePreviousRows = orderedPreviousRows.slice(-12)
  const revenue = Math.round(currentRows.reduce((sum, row) => sum + (row.revenue ?? row.food_sold * 75), 0))
  const previousRevenue = Math.round(previousRows.reduce((sum, row) => sum + (row.revenue ?? row.food_sold * 75), 0))
  const orders = currentRows.reduce((sum, row) => sum + row.orders, 0)
  const previousOrders = previousRows.reduce((sum, row) => sum + row.orders, 0)

  const revenueBars = visibleRows.map((row, index) => {
    const previousRow = visiblePreviousRows[index] ?? row

    return {
      label: getChartLabel(row, index, range),
      current: Math.round(row.revenue ?? row.food_sold * 75),
      previous: Math.round(previousRow.revenue ?? previousRow.food_sold * 75),
    }
  })

  const orderTrend = visibleRows.map((row, index) => {
    const previousRow = visiblePreviousRows[index] ?? row

    return {
      label: getChartLabel(row, index, range),
      current: row.orders,
      previous: previousRow.orders,
    }
  })

  const morningOrders = currentRows.reduce((sum, row) => sum + Math.round(row.orders * (0.28 + row.is_weekend * 0.02)), 0)
  const afternoonOrders = currentRows.reduce((sum, row) => sum + Math.round(row.orders * (0.39 + row.promotion * 0.03)), 0)
  const eveningOrders = Math.max(0, orders - morningOrders - afternoonOrders)
  const demandTotal = Math.max(1, morningOrders + afternoonOrders + eveningOrders)
  const demandValues = {
    morning: Math.round((morningOrders / demandTotal) * 100),
    afternoon: Math.round((afternoonOrders / demandTotal) * 100),
    evening: 0,
  }
  demandValues.evening = Math.max(0, 100 - demandValues.morning - demandValues.afternoon)
  const demandEntries = [
    { key: 'morning' as const, orders: morningOrders },
    { key: 'afternoon' as const, orders: afternoonOrders },
    { key: 'evening' as const, orders: eveningOrders },
  ].sort((a, b) => b.orders - a.orders)

  const soldRate = safeAverage(currentRows.map((row) => row.food_prepared > 0 ? row.food_sold / row.food_prepared : 0))
  const averageWaste = safeAverage(currentRows.map((row) => row.waste_percent))
  const averageLeftover = safeAverage(currentRows.map((row) => row.leftover))

  // A sales-only import (no prepared_quantity column) leaves food_prepared/
  // waste_percent at 0 for every row — that's not "0% waste", it's "unknown".
  // Only compute each metric when the data it actually depends on exists.
  const hasPreparedSignal = currentRows.some((row) => row.food_prepared > 0)
  const hasSoldSignal = currentRows.some((row) => row.food_sold > 0)
  const hasLeftoverSignal = currentRows.some((row) => row.leftover > 0)

  return {
    revenue,
    previousRevenue,
    revenueChangePercent: percentChange(revenue, previousRevenue),
    orders,
    previousOrders,
    orderChangePercent: percentChange(orders, previousOrders),
    revenueBars,
    orderTrend,
    demand: {
      ...demandValues,
      morningOrders,
      afternoonOrders,
      eveningOrders,
      dominant: demandEntries[0]?.key ?? 'afternoon',
      dominantOrders: demandEntries[0]?.orders ?? 0,
    },
    quality: {
      freshness: hasPreparedSignal ? clamp(Math.round(96 - averageWaste * 0.65), 72, 98) : null,
      taste: hasPreparedSignal && hasSoldSignal ? clamp(Math.round(78 + soldRate * 20), 72, 98) : null,
      packaging: hasPreparedSignal || hasLeftoverSignal ? clamp(Math.round(97 - averageLeftover * 0.45), 72, 98) : null,
    },
  }
}

export function getBusinessInsightData(inputRows: FoodRow[] = []) {
  const sortedRows = getSortedRows(inputRows)
  const todayRow = sortedRows[0]
  const previousRows = sortedRows.slice(1, 8)
  const previousAverageWaste = safeAverage(previousRows.map((row) => row.waste_percent))
  const wasteDelta = todayRow ? Math.max(0, Math.round(previousAverageWaste - todayRow.waste_percent)) : 0
  const highRiskItems = todayRow ? Math.max(0, Math.round(todayRow.leftover / 3)) : 0
  const riskStatus = highRiskItems <= 6 ? 'low' : highRiskItems <= 12 ? 'medium' : 'high'

  // Prefer prepared-quantity trend; a sales-only import (no prepared_quantity
  // column) leaves food_prepared at 0 for every row, so fall back to the
  // sold-quantity trend instead of comparing against a meaningless zero.
  const previousRow = previousRows[0]
  const latestActivity = todayRow ? (todayRow.food_prepared > 0 ? todayRow.food_prepared : todayRow.food_sold) : 0
  const previousActivity = previousRow ? (previousRow.food_prepared > 0 ? previousRow.food_prepared : previousRow.food_sold) : 0
  // Only compute a real percentage when there's an actual non-zero baseline to
  // compare against — otherwise it's not a forecast, just a divide-by-a-
  // placeholder artifact (e.g. always exactly -100%).
  const forecastAvailable = previousActivity > 0
  const forecastChange = forecastAvailable
    ? Math.round(percentChange(Math.round(latestActivity * 1.08), previousActivity))
    : 0

  return {
    estimatedSavings: Math.round(todayRow?.money_saved ?? Math.max(0, wasteDelta * savedPerPortion)),
    wasteDelta,
    highRiskItems,
    riskStatus,
    forecastChange,
    forecastAvailable,
  }
}

function getMonthChartRows(rowsForRange: FoodRow[]) {
  const orderedRows = [...rowsForRange].reverse()
  const chunkSize = Math.ceil(orderedRows.length / 4)

  return Array.from({ length: 4 }, (_, index) => {
    const chunk = orderedRows.slice(index * chunkSize, (index + 1) * chunkSize)
    const saved = chunk.length > 0 ? Math.round(average(chunk.map((row) => 100 - row.waste_percent))) : 0

    return {
      day: `W${index + 1}`,
      saved: Math.max(0, saved),
    }
  })
}

export function getSavingsData(range: TimeRange, inputRows: FoodRow[] = []) {
  const rowsForRange = getRowsForRange(range, inputRows)
  const averageLeftover = average(rowsForRange.map((row) => row.leftover))
  const moneySaved = Math.round(
    rowsForRange.reduce((sum, row) => sum + Math.max(0, averageLeftover - row.leftover) * savedPerPortion, 0),
  )
  const lessWaste = Math.max(0, Math.round(average(rowsForRange.map((row) => 100 - row.waste_percent))))
  const chartRows =
    range === 'month'
      ? getMonthChartRows(rowsForRange)
      : [...rowsForRange].reverse().map((row) => ({
          day: range === 'day' ? 'Today' : new Date(row.date).toLocaleDateString('en-US', { weekday: 'short' }),
          saved: Math.max(0, Math.round(100 - row.waste_percent)),
        }))

  return {
    lessWaste,
    moneySaved,
    chartRows,
    title: range === 'day' ? 'Today' : range === 'week' ? 'This Week' : 'This Month',
  }
}

export function getImpactData(range: TimeRange, inputRows: FoodRow[] = []) {
  const rowsForRange = getRowsForRange(range, inputRows)
  const latestRow = rowsForRange[0]
  const co2Reduced = Math.round(
    rowsForRange.reduce((sum, row) => sum + row.food_sold * (1 - row.waste_percent / 100) * co2PerGoodPortion, 0),
  )
  const averageWaste = average(rowsForRange.map((row) => row.waste_percent))
  const wasteDown = Math.max(0, Math.round(averageWaste - latestRow.waste_percent))
  const goal = range === 'day' ? 20 : range === 'week' ? 120 : 500
  const periodLabel = range === 'day' ? 'Impact today' : range === 'week' ? 'Impact this week' : 'Impact this month'
  const listTitle = range === 'day' ? 'Daily Impact' : range === 'week' ? 'Weekly Impact' : 'Monthly Impact'

  return {
    co2Reduced,
    goal,
    percentComplete: (co2Reduced / goal) * 100,
    wasteDown,
    periodLabel,
    listTitle,
    items: rowsForRange.slice(0, 3).map((row, index) => ({
      day:
        index === 0
          ? 'Today'
          : index === 1
            ? 'Yesterday'
            : new Date(row.date).toLocaleDateString('en-US', { weekday: 'short' }),
      value: `${(Math.max(1, Math.round(row.food_sold * (1 - row.waste_percent / 100) * co2PerGoodPortion * 10) / 10) / 1000).toFixed(2)} tons CO2`,
      note: index === 0 ? 'Based on your data' : 'Less food left',
    })),
  }
}

export function getEsgData(
  range: TimeRange,
  inputRows: FoodRow[],
  recsTotal: number,
  recsActed: number,
) {
  const rowsForRange = getRowsForRange(range, inputRows)
  const totalDays = range === 'day' ? 1 : range === 'week' ? 7 : 30
  const daysLogged = rowsForRange.length
  const hasData = daysLogged > 0

  // Environmental — based on average waste % (0% waste = 100, 40%+ = 0)
  const avgWaste = hasData ? safeAverage(rowsForRange.map((r) => r.waste_percent)) : 0
  const totalCo2Saved = rowsForRange.reduce((sum, r) => sum + Number(r.co2_saved ?? 0), 0)
  const totalPortionsSaved = rowsForRange.reduce(
    (sum, r) => sum + Math.max(0, r.food_sold - r.leftover),
    0,
  )
  const totalMoneySaved = rowsForRange.reduce((sum, r) => sum + Number(r.money_saved ?? 0), 0)
  const totalLeftover = rowsForRange.reduce((sum, r) => sum + r.leftover, 0)
  const envScore = hasData ? Math.round(clamp(100 - avgWaste * 2.5, 0, 100)) : 0

  // Social — team reporting consistency + potential food donations
  const reportingRate = totalDays > 0 ? Math.min(1, daysLogged / totalDays) : 0
  const socialScore = Math.round(reportingRate * 100)

  // Governance — reporting rate + AI recommendation adherence
  const recAdherence = recsTotal > 0 ? recsActed / recsTotal : 0
  const govScore = Math.round((reportingRate * 0.6 + recAdherence * 0.4) * 100)

  // Overall (E: 50%, S: 25%, G: 25%)
  const overallScore = hasData
    ? Math.round(envScore * 0.5 + socialScore * 0.25 + govScore * 0.25)
    : 0

  const rating =
    overallScore >= 90 ? 'A+'
    : overallScore >= 80 ? 'A'
    : overallScore >= 70 ? 'B+'
    : overallScore >= 60 ? 'B'
    : overallScore >= 50 ? 'C'
    : hasData ? 'D'
    : '--'

  return {
    hasData,
    overallScore,
    envScore,
    socialScore,
    govScore,
    rating,
    avgWaste: parseFloat(avgWaste.toFixed(1)),
    totalCo2Saved: parseFloat(totalCo2Saved.toFixed(1)),
    totalPortionsSaved: Math.round(totalPortionsSaved),
    totalMoneySaved: Math.round(totalMoneySaved),
    totalLeftover: Math.round(totalLeftover),
    daysLogged,
    totalDays,
    reportingRate,
    recsTotal,
    recsActed,
    recAdherence,
  }
}

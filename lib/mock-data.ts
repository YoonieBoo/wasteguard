import data from '@/data/mockData2.json'

export type FoodRow = {
  date: string
  menu_item_name?: string
  quantity_sold?: number
  orders: number
  food_prepared: number
  food_sold: number
  leftover: number
  waste_percent: number
  weather: string
  is_weekend: number
  promotion: number
}

export type TimeRange = 'day' | 'week' | 'month'

const rows = data as FoodRow[]

function dateValue(date: string) {
  return new Date(date).getTime()
}

function getSortedRows(inputRows: FoodRow[] = []) {
  return [...rows, ...inputRows].sort((a, b) => dateValue(b.date) - dateValue(a.date))
}

function getDemoRows(inputRows: FoodRow[] = []) {
  return getSortedRows(inputRows).slice(0, 20)
}

function getRowsForRange(range: TimeRange, inputRows: FoodRow[] = []) {
  const count = range === 'day' ? 1 : range === 'week' ? 7 : 30
  return getSortedRows(inputRows).slice(0, count)
}

const savedPerPortion = 35
const co2PerGoodPortion = 0.1

export function getDashboardData(inputRows: FoodRow[] = []) {
  const demoRows = getDemoRows(inputRows)
  const todayRow = demoRows[0]
  const yesterdayRow = demoRows[1] ?? todayRow
  const averageLeftover = demoRows.reduce((sum, row) => sum + row.leftover, 0) / demoRows.length
  const ordersToday = todayRow.orders
  const cookThisMuch = todayRow.food_prepared
  const wasteYesterday = Math.round(yesterdayRow.waste_percent)
  const moneySaved = Math.round(Math.max(0, averageLeftover - todayRow.leftover) * savedPerPortion)

  return {
    ordersToday,
    cookThisMuch,
    wasteYesterday,
    moneySaved,
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
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)
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
      value: `${Math.max(1, Math.round(row.food_sold * (1 - row.waste_percent / 100) * co2PerGoodPortion * 10) / 10)} kg CO2`,
      note: index === 0 ? 'Based on your data' : 'Less food left',
    })),
  }
}

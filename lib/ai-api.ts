import type { BakeryImageFile } from '@/lib/bakery-catalog'
import type { Recommendation, WasteType } from '@/lib/recommendations'

// ── Flask API response types ──────────────────────────────────────────────────

export interface FlaskFoodPrepItem {
  menu_item: string
  category: string
  yesterday_sales: number
  seven_day_average: number
  thirty_day_average: number
  trend_percent: number
  ai_forecast: number
  safety_buffer_percent: number
  final_prep_recommendation: number
  demand_status: string
  waste_risk_status: string
}

export interface FlaskSustainabilityRec {
  priority: string
  recommendation: string
  reason: string
  estimated_savings: string  // e.g. "฿1,234/month"
  carbon_reduction: string   // e.g. "123 kg CO₂/month"
  confidence: string         // e.g. "89%"
}

export interface FlaskAnomalyRec {
  priority: string
  recommendation: string
  date: string
  // The engine's possible_reasons is always a Python list, even for one reason.
  reason: string | string[]
  confidence: string
}

export interface FlaskRecommendationsResponse {
  food_preparation_recommendations: FlaskFoodPrepItem[]
  sustainability_recommendations: FlaskSustainabilityRec[]
  anomaly_recommendations: FlaskAnomalyRec[]
}

export interface FlaskAnalyticsResponse {
  totals: {
    total_customers: number
    total_food_waste_kg: number
    total_electricity_kwh: number
    total_water_m3: number
    total_gas_m3: number
    total_revenue: number
  }
  costs: {
    electricity_cost: number
    water_cost: number
    gas_cost: number
    food_waste_disposal_cost: number
    total_operating_cost: number
  }
  carbon_emissions: {
    electricity_co2_kg: number
    water_co2_kg: number
    gas_co2_kg: number
    food_waste_co2_kg: number
    total_co2_kg: number
  }
  trends: {
    food_waste_trend_percent: number
    electricity_trend_percent: number
    water_trend_percent: number
    revenue_trend_percent: number
  }
  benchmark_comparison: {
    electricity_status: string
    water_status: string
    gas_status: string
    food_waste_status: string
  }
  esg: {
    esg_score: number
    rating: string
  }
}

export interface FlaskEsgScoreResponse {
  scores: {
    overall_sustainability_score: number
    environmental_score: number
    social_score: number
    governance_score: number
  }
  dashboard_cards: {
    overall: { score: number; status: string }
    environmental: { score: number; metric_value: number; metric_unit: string; status: string }
    social: { score: number; metric_value: string; status: string }
    governance: { score: number; metric_value: string; status: string }
  }
}

export interface FlaskWastePredictionItem {
  menu_item: string
  category: string
  predicted_waste_kg: number
  predicted_waste_percent: number
  waste_risk_status: string
  estimated_total_loss_thb: number
  recommendation: string
}

export interface FlaskWastePredictionsResponse {
  summary: {
    total_predicted_waste_kg: number
    overall_waste_percent: number
    overall_waste_risk: string
    total_estimated_loss_thb: number
    total_carbon_impact_kg_co2e: number
  }
  waste_predictions: FlaskWastePredictionItem[]
}

export interface FlaskSavingsReportResponse {
  period: string
  summary: {
    estimated_total_cost_saving_thb: number
    estimated_waste_reduction_kg: number
    estimated_carbon_reduction_kg_co2e: number
    overall_esg_score: number
  }
}

// ── Parse helpers ─────────────────────────────────────────────────────────────

function parseThb(s: string): number {
  const digits = s.replace(/,/g, '').match(/\d+/)
  return digits ? parseInt(digits[0]) : 0
}

function parseCo2(s: string): number {
  const digits = s.match(/\d+/)
  return digits ? parseInt(digits[0]) : 0
}

function parsePct(s: string): number {
  return parseInt(s) || 0
}

// ── Transform Flask → Recommendation[] ───────────────────────────────────────

// Per-item pricing from mock_datas.py menu_sales
const MENU_PRICING: Record<string, { foodCost: number; sellingPrice: number }> = {
  'Breakfast Buffet': { foodCost: 24, sellingPrice: 65 },
  'Fried Rice':       { foodCost: 5,  sellingPrice: 15 },
  'Caesar Salad':     { foodCost: 4,  sellingPrice: 12 },
  'Chicken Steak':    { foodCost: 8,  sellingPrice: 22 },
}

// Maps Flask menu_item names → image filenames for the home dashboard approvedOverrides
const MENU_FILE_MAP: Record<string, BakeryImageFile> = {
  'Breakfast Buffet': 'breakfast_buffet',
  'Fried Rice':       'fried_rice',
  'Caesar Salad':     'caesar_salad',
  'Chicken Steak':    'chicken_steak',
}
const DEFAULT_PRICING = { foodCost: 10, sellingPrice: 30 }
const CO2_PER_UNIT = 0.75  // kg CO₂ per portion (2.5 kg CO₂/kg × ~0.3 kg/portion)

// Real per-business pricing (name → cost/price), built from the owner's
// actual menu_items. Falls back to the 4-dish demo table only for names it
// doesn't recognize (e.g. still on the mock dataset).
export type PricingByName = Record<string, { foodCost: number; sellingPrice: number }>

// Real per-business menu_items.id, keyed by dish name — lets accept/approve
// state (affectedItemFileName) target the owner's actual dish instead of
// only ever resolving for the 4 mock demo dishes via MENU_FILE_MAP.
export type MenuItemIdByName = Record<string, string>

export function transformFlaskToRecommendations(
  data: FlaskRecommendationsResponse,
  pricingByName: PricingByName = {},
  menuItemIdByName: MenuItemIdByName = {},
): Recommendation[] {
  const recs: Recommendation[] = []

  // 1. Food preparation recommendations
  data.food_preparation_recommendations.forEach((item, i) => {
    const avg = Math.round(item.seven_day_average)
    const qty = item.final_prep_recommendation
    const diff = qty - avg
    const isReducing = diff < 0
    const absDiff = Math.abs(diff)
    const pricing = pricingByName[item.menu_item] ?? MENU_PRICING[item.menu_item] ?? DEFAULT_PRICING

    const action = isReducing ? 'Reduce' : diff > 0 ? 'Increase' : 'Maintain'

    let reason: string
    let reasonTh: string
    if (isReducing) {
      reason = `Your 7-day average for ${item.menu_item} is ${avg} portions, but today's demand looks lower. Preparing ${qty} should be just enough — helping you cut down on leftovers.`
      reasonTh = `ค่าเฉลี่ย 7 วันของ ${item.menu_item} อยู่ที่ ${avg} ส่วน แต่วันนี้ความต้องการดูต่ำลง การเตรียม ${qty} ส่วนน่าจะพอดี ช่วยลดของเหลือได้`
    } else if (diff > 0) {
      reason = `${item.menu_item} has been selling fast lately — your 7-day average is ${avg} portions and demand is rising. Preparing ${qty} helps you meet orders without running short.`
      reasonTh = `${item.menu_item} ขายดีในช่วงนี้ — ค่าเฉลี่ย 7 วันอยู่ที่ ${avg} ส่วน และความต้องการเพิ่มขึ้น การเตรียม ${qty} ส่วนช่วยให้ไม่ขาด`
    } else {
      reason = `Sales for ${item.menu_item} have been steady around ${avg} portions a day. Preparing ${qty} matches today's expected demand well.`
      reasonTh = `ยอดขายของ ${item.menu_item} อยู่ที่ประมาณ ${avg} ส่วนต่อวัน การเตรียม ${qty} ส่วนตรงกับความต้องการวันนี้`
    }

    recs.push({
      id: `ai-prep-${i}`,
      title: `${action} ${item.menu_item} — prepare ${qty} portions`,
      titleTh: `${action === 'Reduce' ? 'ลด' : action === 'Increase' ? 'เพิ่ม' : 'คง'} ${item.menu_item} — เตรียม ${qty} ส่วน`,
      reason,
      reasonTh,
      estimatedSavings: isReducing
        ? absDiff * pricing.foodCost                                           // waste cost avoided
        : diff > 0
          ? absDiff * (pricing.sellingPrice - pricing.foodCost)                // profit margin captured
          : Math.round(avg * pricing.foodCost * 0.03),                         // ~3% planning efficiency
      co2Impact: isReducing ? absDiff * CO2_PER_UNIT : -(absDiff * CO2_PER_UNIT),
      confidence: Math.max(60, 100 - item.safety_buffer_percent),
      status: 'pending',
      wasteType: 'food',
      affectedItemFileName: menuItemIdByName[item.menu_item] ?? MENU_FILE_MAP[item.menu_item],
      suggestedQuantity: qty,
    })
  })

  // 2. Sustainability recommendations
  data.sustainability_recommendations.forEach((rec, i) => {
    const titleLower = rec.recommendation.toLowerCase()
    const sustainType: WasteType = titleLower.includes('water') ? 'water'
      : titleLower.includes('electric') || titleLower.includes('light') || titleLower.includes('energy') ? 'energy'
      : titleLower.includes('packag') || titleLower.includes('plastic') ? 'packaging'
      : 'energy'
    recs.push({
      id: `ai-sustain-${i}`,
      title: rec.recommendation,
      titleTh: rec.recommendation,
      reason: rec.reason,
      reasonTh: rec.reason,
      estimatedSavings: parseThb(rec.estimated_savings),
      co2Impact: parseCo2(rec.carbon_reduction),
      confidence: parsePct(rec.confidence),
      status: 'pending',
      wasteType: sustainType,
    })
  })

  // 3. Anomaly recommendations
  data.anomaly_recommendations.forEach((rec, i) => {
    const cleanText = (s: string) =>
      s.replace(/\bAI[- ]powered\b/gi, 'pattern-based')
       .replace(/\bAI\b/g, 'system')
    const reasonText = Array.isArray(rec.reason) ? rec.reason.join(', ') : rec.reason
    recs.push({
      id: `ai-anomaly-${i}`,
      title: cleanText(rec.recommendation),
      titleTh: cleanText(rec.recommendation),
      reason: cleanText(reasonText),
      reasonTh: cleanText(reasonText),
      estimatedSavings: parseThb(rec.date ?? '') || 200,
      co2Impact: 0.5,
      confidence: parsePct(rec.confidence),
      status: 'pending',
      wasteType: 'food' as WasteType,
    })
  })

  return recs
}

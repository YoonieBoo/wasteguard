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
  reason: string
  confidence: string
}

export interface FlaskRecommendationsResponse {
  food_preparation_recommendations: FlaskFoodPrepItem[]
  sustainability_recommendations: FlaskSustainabilityRec[]
  anomaly_recommendations: FlaskAnomalyRec[]
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

export function transformFlaskToRecommendations(data: FlaskRecommendationsResponse): Recommendation[] {
  const recs: Recommendation[] = []

  // 1. Food preparation recommendations
  data.food_preparation_recommendations.forEach((item, i) => {
    const avg = Math.round(item.seven_day_average)
    const qty = item.final_prep_recommendation
    const diff = qty - avg
    const isReducing = diff < 0
    const absDiff = Math.abs(diff)
    const pricing = MENU_PRICING[item.menu_item] ?? DEFAULT_PRICING

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
      affectedItemFileName: MENU_FILE_MAP[item.menu_item],
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
    recs.push({
      id: `ai-anomaly-${i}`,
      title: cleanText(rec.recommendation),
      titleTh: cleanText(rec.recommendation),
      reason: cleanText(rec.reason),
      reasonTh: cleanText(rec.reason),
      estimatedSavings: parseThb(rec.date ?? '') || 200,
      co2Impact: 0.5,
      confidence: parsePct(rec.confidence),
      status: 'pending',
      wasteType: 'food' as WasteType,
    })
  })

  return recs
}

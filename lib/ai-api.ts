import type { Recommendation } from '@/lib/recommendations'

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

const THB_PER_UNIT = 40   // estimated THB value per bakery item
const CO2_PER_UNIT = 0.08 // kg CO₂ per food item not produced/wasted

export function transformFlaskToRecommendations(data: FlaskRecommendationsResponse): Recommendation[] {
  const recs: Recommendation[] = []

  // 1. Food preparation recommendations
  data.food_preparation_recommendations.forEach((item, i) => {
    const avg = Math.round(item.seven_day_average)
    const qty = item.final_prep_recommendation
    const diff = qty - avg
    const isReducing = diff < 0
    const absDiff = Math.abs(diff)

    const action = isReducing ? 'Reduce' : diff > 0 ? 'Increase' : 'Maintain'
    const trendSign = item.trend_percent >= 0 ? '+' : ''

    recs.push({
      id: `ai-prep-${i}`,
      title: `${action} ${item.menu_item}: prepare ${qty} units`,
      titleTh: `${action === 'Reduce' ? 'ลด' : action === 'Increase' ? 'เพิ่ม' : 'คง'} ${item.menu_item}: เตรียม ${qty} ชิ้น`,
      reason: `AI forecast ${item.ai_forecast} units (${trendSign}${item.trend_percent.toFixed(1)}% trend vs 7-day avg of ${avg}). Safety buffer: +${item.safety_buffer_percent}%. ${item.demand_status} · ${item.waste_risk_status}.`,
      reasonTh: `AI คาดการณ์ ${item.ai_forecast} ชิ้น (แนวโน้ม ${trendSign}${item.trend_percent.toFixed(1)}% เทียบกับ 7 วันเฉลี่ย ${avg} ชิ้น) บัฟเฟอร์ความปลอดภัย +${item.safety_buffer_percent}%`,
      estimatedSavings: isReducing ? absDiff * THB_PER_UNIT : 0,
      co2Impact: isReducing ? absDiff * CO2_PER_UNIT : -(absDiff * CO2_PER_UNIT),
      confidence: Math.max(60, 100 - item.safety_buffer_percent),
      status: 'pending',
      suggestedQuantity: qty,
    })
  })

  // 2. Sustainability recommendations
  data.sustainability_recommendations.forEach((rec, i) => {
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
    })
  })

  // 3. Anomaly recommendations
  data.anomaly_recommendations.forEach((rec, i) => {
    recs.push({
      id: `ai-anomaly-${i}`,
      title: rec.recommendation,
      titleTh: rec.recommendation,
      reason: `${rec.date ? `Date: ${rec.date}. ` : ''}${rec.reason}`,
      reasonTh: `${rec.date ? `วันที่: ${rec.date}. ` : ''}${rec.reason}`,
      estimatedSavings: 0,
      co2Impact: 0,
      confidence: parsePct(rec.confidence),
      status: 'pending',
    })
  })

  return recs
}

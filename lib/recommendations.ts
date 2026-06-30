import type { BakeryImageFile } from '@/lib/bakery-catalog'

export type RecommendationStatus = 'pending' | 'accepted' | 'modified' | 'ignored'

export type Recommendation = {
  id: string
  title: string
  titleTh: string
  reason: string
  reasonTh: string
  estimatedSavings: number
  co2Impact: number
  confidence: number
  status: RecommendationStatus
  affectedItemFileName?: BakeryImageFile
  suggestedQuantity?: number
  modifiedQuantity?: number
}

export const defaultRecommendations: Recommendation[] = [
  {
    id: 'rec-001',
    title: 'Reduce Breakfast Buffet by 35 portions',
    titleTh: 'ลดบุฟเฟ่ต์อาหารเช้าลง 35 ส่วน',
    reason:
      'Breakfast Buffet averaged 35 leftover portions this week. Preparing 285 instead of 320 matches actual demand and reduces food waste.',
    reasonTh:
      'บุฟเฟ่ต์อาหารเช้ามีเศษอาหารเหลือเฉลี่ย 35 ส่วนต่อสัปดาห์ การเตรียม 285 แทน 320 ส่วนช่วยลดของเหลือได้',
    estimatedSavings: 420,
    co2Impact: 2.5,
    confidence: 87,
    status: 'pending',
    affectedItemFileName: 'breakfast_buffet',
    suggestedQuantity: 285,
  },
  {
    id: 'rec-002',
    title: 'Increase Fried Rice by 10 plates',
    titleTh: 'เพิ่มข้าวผัดอีก 10 จาน',
    reason:
      'Fried Rice sells out almost daily with only 4 leftovers from 95 prepared. Demand trend is rising — prepare 105 to capture lost sales.',
    reasonTh:
      'ข้าวผัดขายหมดแทบทุกวัน เหลือเพียง 4 จากที่เตรียม 95 จาน แนวโน้มความต้องการสูงขึ้น ควรเตรียม 105 จานเพื่อไม่เสียยอดขาย',
    estimatedSavings: 520,
    co2Impact: -0.3,
    confidence: 79,
    status: 'pending',
    affectedItemFileName: 'fried_rice',
    suggestedQuantity: 105,
  },
  {
    id: 'rec-003',
    title: 'Cut Caesar Salad production by 8 plates',
    titleTh: 'ลดซีซาร์สลัดลง 8 จาน',
    reason:
      'Caesar Salad has a 14.5% leftover rate. Customers are shifting to other menu items — preparing 47 instead of 55 avoids likely waste.',
    reasonTh:
      'ซีซาร์สลัดมีของเหลือ 14.5% ลูกค้าเริ่มเลือกเมนูอื่น การเตรียม 47 แทน 55 จานช่วยลดของเหลือได้',
    estimatedSavings: 240,
    co2Impact: 1.2,
    confidence: 72,
    status: 'pending',
    affectedItemFileName: 'caesar_salad',
    suggestedQuantity: 47,
  },
]

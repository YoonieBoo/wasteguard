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
    title: 'Reduce Meal Box 1 by 8 boxes',
    titleTh: 'ลด Meal Box 1 ลง 8 กล่อง',
    reason:
      'The last 3 Tuesdays averaged 9 leftover boxes. Tuesday demand typically drops 18% — preparing 47 instead of 55 eliminates likely waste.',
    reasonTh:
      '3 อังคารที่ผ่านมา เหลือเฉลี่ย 9 กล่อง ความต้องการวันอังคารลดลง 18% โดยเฉลี่ย การผลิต 47 กล่องแทน 55 กล่อง ช่วยลดของเหลือได้',
    estimatedSavings: 380,
    co2Impact: 2.1,
    confidence: 87,
    status: 'pending',
    affectedItemFileName: 'meal_box1',
    suggestedQuantity: 47,
  },
  {
    id: 'rec-002',
    title: 'Bake 12 extra Hokkaido Milk Buns',
    titleTh: 'อบขนมปังนมฮอกไกโดเพิ่ม 12 ชิ้น',
    reason:
      'Morning traffic has grown 14% over the past 2 weeks. Hokkaido Milk sells out before 9 AM on 4 of 5 recent days — you are losing morning sales.',
    reasonTh:
      'ลูกค้าช่วงเช้าเพิ่มขึ้น 14% ใน 2 สัปดาห์ที่ผ่านมา ขนมปังนมฮอกไกโดขายหมดก่อน 9 โมงเช้า 4 ใน 5 วัน ร้านกำลังเสียยอดขายช่วงเช้า',
    estimatedSavings: 520,
    co2Impact: -0.4,
    confidence: 79,
    status: 'pending',
    affectedItemFileName: 'Hokkaido_milk',
    suggestedQuantity: 52,
  },
  {
    id: 'rec-003',
    title: 'Cut Snack Box 2 production by 7 boxes',
    titleTh: 'ลด Snack Box 2 ลง 7 กล่อง',
    reason:
      'Snack Box 2 has a 22% leftover rate this month. Customers are choosing Snack Box 1 at a higher rate — redirecting production avoids likely waste.',
    reasonTh:
      'Snack Box 2 มีของเหลือ 22% ในเดือนนี้ ลูกค้าเลือก Snack Box 1 มากขึ้น การปรับการผลิตช่วยลดของเหลือได้',
    estimatedSavings: 240,
    co2Impact: 1.4,
    confidence: 72,
    status: 'pending',
    affectedItemFileName: 'snack_box2',
    suggestedQuantity: 31,
  },
]

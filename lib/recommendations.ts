export type RecommendationStatus = 'pending' | 'accepted' | 'modified' | 'ignored'
export type WasteType = 'food' | 'energy' | 'water' | 'packaging'

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
  wasteType?: WasteType
  // Real dishes use their menu_items.id; the 4 demo dishes use a BakeryImageFile key.
  affectedItemFileName?: string
  suggestedQuantity?: number
  modifiedQuantity?: number
}

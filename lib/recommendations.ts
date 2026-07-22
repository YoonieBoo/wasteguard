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
    wasteType: 'food',
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
    wasteType: 'food',
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
    wasteType: 'food',
    affectedItemFileName: 'caesar_salad',
    suggestedQuantity: 47,
  },
  {
    id: 'rec-004',
    title: 'Turn off kitchen equipment 30 minutes before closing',
    titleTh: 'ปิดอุปกรณ์ครัวก่อนปิดร้าน 30 นาที',
    reason:
      'Electricity usage after 9:30 PM accounts for 12% of daily consumption but serves fewer than 5% of customers. Shutting down ovens, fryers, and warmers 30 minutes early could save around THB 1,100 per month.',
    reasonTh:
      'การใช้ไฟฟ้าหลัง 21:30 น. คิดเป็น 12% ของการบริโภคทั้งวัน แต่ให้บริการลูกค้าน้อยกว่า 5% การปิดเตาอบ หม้อทอด และเครื่องอุ่นอาหารก่อน 30 นาทีช่วยประหยัดได้ประมาณ 1,100 บาทต่อเดือน',
    estimatedSavings: 1100,
    co2Impact: 4.8,
    confidence: 83,
    status: 'pending',
    wasteType: 'energy',
  },
  {
    id: 'rec-005',
    title: 'Fix the kitchen pre-rinse tap — it\'s running too long',
    titleTh: 'ซ่อมหัวฉีดล้างจานในครัว — น้ำไหลนานเกินไป',
    reason:
      'Water consumption on dish-washing days is 18% higher than the hotel average. A pre-rinse spray valve that stays open longer than needed is the likely cause. Adjusting or replacing it could save roughly 6 m³ of water per month.',
    reasonTh:
      'การใช้น้ำในวันล้างจานสูงกว่าค่าเฉลี่ยของโรงแรม 18% หัวฉีดล้างจานที่เปิดนานเกินไปน่าจะเป็นสาเหตุ การปรับหรือเปลี่ยนอุปกรณ์ช่วยประหยัดน้ำได้ประมาณ 6 ลูกบาศก์เมตรต่อเดือน',
    estimatedSavings: 680,
    co2Impact: 1.5,
    confidence: 76,
    status: 'pending',
    wasteType: 'water',
  },
  {
    id: 'rec-006',
    title: 'Switch breakfast buffet packaging to reusable containers',
    titleTh: 'เปลี่ยนบรรจุภัณฑ์บุฟเฟ่ต์อาหารเช้าเป็นภาชนะใช้ซ้ำ',
    reason:
      'Single-use takeaway boxes for the breakfast buffet generate roughly 4 kg of packaging waste per week. Switching to reusable containers for in-room dining orders reduces waste and saves on disposable costs — estimated THB 850 per month.',
    reasonTh:
      'กล่องใช้ครั้งเดียวสำหรับบุฟเฟ่ต์อาหารเช้าสร้างขยะบรรจุภัณฑ์ประมาณ 4 กิโลกรัมต่อสัปดาห์ การเปลี่ยนเป็นภาชนะใช้ซ้ำสำหรับออร์เดอร์ในห้องช่วยลดขยะและประหยัดต้นทุนได้ประมาณ 850 บาทต่อเดือน',
    estimatedSavings: 850,
    co2Impact: 3.2,
    confidence: 68,
    status: 'pending',
    wasteType: 'packaging',
  },
]

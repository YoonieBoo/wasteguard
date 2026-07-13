export const SAMPLE_TEMPLATE_CSV = `date,menu_item,category,prepared_quantity,sold_quantity,leftover_quantity,waste_quantity,unit,unit_cost,selling_price
2026-06-01,Chicken Steak,Main Course,40,34,6,2,plate,55,120
2026-06-01,Caesar Salad,Salad,25,20,5,1,plate,30,85
2026-06-02,Chicken Steak,Main Course,38,35,3,1,plate,55,120
2026-06-02,Fried Rice,Main Course,50,44,6,2,plate,25,65
2026-06-03,Caesar Salad,Salad,22,18,4,1,plate,30,85
`

export function downloadSampleTemplate() {
  const blob = new Blob([SAMPLE_TEMPLATE_CSV], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'waste-guard-sample-template.csv'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

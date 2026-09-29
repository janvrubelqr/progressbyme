export type MonthCell = { iso: string; day: number } | null

// Monday-first grid of the given month, padded with null cells so every row has 7 columns.
export function getMonthGrid(year: number, month: number): MonthCell[][] {
  const firstOfMonth = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const leadingEmpty = (firstOfMonth.getDay() + 6) % 7 // Mon=0 ... Sun=6

  const cells: MonthCell[] = []
  for (let i = 0; i < leadingEmpty; i++) cells.push(null)
  for (let day = 1; day <= daysInMonth; day++) {
    const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    cells.push({ iso, day })
  }
  while (cells.length % 7 !== 0) cells.push(null)

  const weeks: MonthCell[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

export function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const d = new Date(year, month + delta, 1)
  return { year: d.getFullYear(), month: d.getMonth() }
}

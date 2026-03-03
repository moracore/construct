export interface CalendarDay {
  date: string        // YYYY-MM-DD, empty string for padding cells
  day: number         // 1-31, 0 for padding
  isToday: boolean
  isCurrentMonth: boolean
}

export function buildMonthGrid(year: number, month: number): CalendarDay[][] {
  const today = new Date().toISOString().slice(0, 10)
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  // Week starts Monday (0=Mon ... 6=Sun)
  const startPad = (firstDay.getDay() + 6) % 7
  const totalDays = lastDay.getDate()

  const cells: CalendarDay[] = []

  // Padding before
  for (let i = 0; i < startPad; i++) {
    const d = new Date(year, month, 1 - (startPad - i))
    const dateStr = d.toISOString().slice(0, 10)
    cells.push({ date: dateStr, day: d.getDate(), isToday: false, isCurrentMonth: false })
  }

  // Current month
  for (let d = 1; d <= totalDays; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ date: dateStr, day: d, isToday: dateStr === today, isCurrentMonth: true })
  }

  // Padding after to fill final row
  const remainder = cells.length % 7
  if (remainder !== 0) {
    for (let i = 1; i <= 7 - remainder; i++) {
      const d = new Date(year, month + 1, i)
      const dateStr = d.toISOString().slice(0, 10)
      cells.push({ date: dateStr, day: d.getDate(), isToday: false, isCurrentMonth: false })
    }
  }

  // Chunk into weeks
  const weeks: CalendarDay[][] = []
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7))
  }
  return weeks
}

export const WEEKDAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

export function monthName(month: number): string {
  return ['January','February','March','April','May','June',
          'July','August','September','October','November','December'][month]
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

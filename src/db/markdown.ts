import type { DayLog, ExerciseSet } from '../types'

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return `${dateStr} - ${days[d.getDay()]}`
}

function formatSet(set: ExerciseSet, isDoubleComponent: boolean, isBodyweight: boolean): string {
  if (isDoubleComponent) {
    const lw = set.leftWeight != null ? `${set.leftWeight}kg` : ''
    const rw = set.rightWeight != null ? `${set.rightWeight}kg` : ''
    const lr = set.leftReps ?? set.reps
    const rr = set.rightReps ?? set.reps
    return `L ${lw} x ${lr} | R ${rw} x ${rr}`
  }
  if (isBodyweight) {
    return `BW x ${set.reps}${set.weight ? ` (+${set.weight}kg)` : ''}`
  }
  const w = set.weight != null ? `${set.weight}${set.weightUnit ?? 'kg'}` : 'BW'
  return `${w} x ${set.reps}`
}

export function generateMarkdown(log: DayLog, exerciseMap: Record<string, { isDoubleComponent: boolean; isBodyweight: boolean }>): string {
  const dateHeader = formatDate(log.date)
  let md = `# ${dateHeader} - ${log.workoutName}\n`

  for (const ex of log.exercises) {
    const meta = exerciseMap[ex.exerciseId] ?? { isDoubleComponent: false, isBodyweight: false }
    const suffix = meta.isDoubleComponent ? ' (L/R)' : ''
    md += `\n## ${ex.exerciseName}${suffix}\n`
    ex.sets.forEach((set, i) => {
      md += `- Set ${i + 1}: ${formatSet(set, meta.isDoubleComponent, meta.isBodyweight)}\n`
    })
  }

  return md
}

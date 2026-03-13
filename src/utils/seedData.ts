import { saveExercise, saveWorkout, saveDayLog,
         getAllExercises, getAllWorkouts, getAllDayLogs,
         deleteExercise, deleteWorkout, deleteDayLog } from '../db'
import { generateMarkdown } from '../db/markdown'
import type { Exercise, Workout, DayLog, ExerciseSet, LoggedExercise } from '../types'

function uid(p: string) { return `${p}_demo_${Math.random().toString(36).slice(2, 9)}` }

function dateISO(daysAgo: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().slice(0, 10)
}

// Random integer in [min, max] snapped to step
function ri(min: number, max: number, step = 1): number {
  const n = Math.floor((max - min) / step) + 1
  return min + Math.floor(Math.random() * n) * step
}

// True with probability p
function roll(p: number): boolean { return Math.random() < p }

function wSets(baseW: number, baseR: number, nSets: number): ExerciseSet[] {
  return Array.from({ length: nSets }, (_, i) => ({
    weight: Math.max(5, baseW + (i === nSets - 1 && roll(0.5) ? ri(0, 5, 2.5) : 0)),
    reps: Math.max(1, baseR + ri(-2, 2)),
  }))
}

function bwSets(baseR: number, nSets: number): ExerciseSet[] {
  return Array.from({ length: nSets }, () => ({ reps: Math.max(1, baseR + ri(-3, 3)) }))
}

function timedSets(baseDur: number, nSets: number): ExerciseSet[] {
  return Array.from({ length: nSets }, () => ({ reps: 0, duration: Math.max(15, baseDur + ri(-15, 15, 5)) }))
}

// ─────────────────────────────────────────────────────────────────────────────

export async function seedDemoData(): Promise<{ logs: number }> {
  const now = Date.now()

  // ── Clear existing data ────────────────────────────────────────────────────
  const [existingLogs, existingExercises, existingWorkouts] = await Promise.all([
    getAllDayLogs(), getAllExercises(), getAllWorkouts(),
  ])
  await Promise.all([
    ...existingLogs.map((l) => deleteDayLog(l.id)),
    ...existingExercises.map((e) => deleteExercise(e.id)),
    ...existingWorkouts.map((w) => deleteWorkout(w.id)),
  ])

  // ── Exercises ──────────────────────────────────────────────────────────────
  const eBench:     Exercise = { id: uid('ex'), name: 'Bench Press',        isBodyweight: false, isDoubleComponent: false, primaryMuscleGroups: ['Chest', 'Front Delts'],            secondaryMuscleGroups: ['Triceps'],                              createdAt: now }
  const eIncline:   Exercise = { id: uid('ex'), name: 'Incline DB Press',   isBodyweight: false, isDoubleComponent: false, primaryMuscleGroups: ['Chest', 'Front Delts'],            secondaryMuscleGroups: ['Triceps'],                              createdAt: now }
  const eOHP:       Exercise = { id: uid('ex'), name: 'Overhead Press',     isBodyweight: false, isDoubleComponent: false, primaryMuscleGroups: ['Front Delts', 'Side Delts'],       secondaryMuscleGroups: ['Triceps', 'Traps'],                     createdAt: now }
  const eLateral:   Exercise = { id: uid('ex'), name: 'Lateral Raise',      isBodyweight: false, isDoubleComponent: false, primaryMuscleGroups: ['Side Delts'],                      secondaryMuscleGroups: ['Traps'],                                createdAt: now }
  const eTricepPD:  Exercise = { id: uid('ex'), name: 'Tricep Pushdown',    isBodyweight: false, isDoubleComponent: false, primaryMuscleGroups: ['Triceps'],                         secondaryMuscleGroups: ['Forearms'],                             createdAt: now }
  const eChestFly:  Exercise = { id: uid('ex'), name: 'Cable Fly',          isBodyweight: false, isDoubleComponent: false, primaryMuscleGroups: ['Chest'],                           secondaryMuscleGroups: ['Front Delts'],                          createdAt: now }

  const ePullup:    Exercise = { id: uid('ex'), name: 'Pull-ups',           isBodyweight: true,  isDoubleComponent: false, primaryMuscleGroups: ['Lats', 'Biceps'],                  secondaryMuscleGroups: ['Rear Delts', 'Forearms'],               createdAt: now }
  const eBBRow:     Exercise = { id: uid('ex'), name: 'Barbell Row',        isBodyweight: false, isDoubleComponent: false, primaryMuscleGroups: ['Lats', 'Traps'],                   secondaryMuscleGroups: ['Biceps', 'Rear Delts', 'Lower Back'],   createdAt: now }
  const eFacePull:  Exercise = { id: uid('ex'), name: 'Face Pull',          isBodyweight: false, isDoubleComponent: false, primaryMuscleGroups: ['Rear Delts', 'Traps'],             secondaryMuscleGroups: ['Side Delts'],                           createdAt: now }
  const eBBCurl:    Exercise = { id: uid('ex'), name: 'Barbell Curl',       isBodyweight: false, isDoubleComponent: false, primaryMuscleGroups: ['Biceps'],                          secondaryMuscleGroups: ['Forearms'],                             createdAt: now }
  const eHammer:    Exercise = { id: uid('ex'), name: 'Hammer Curl',        isBodyweight: false, isDoubleComponent: false, primaryMuscleGroups: ['Biceps', 'Forearms'],              secondaryMuscleGroups: [],                                       createdAt: now }

  const eSquat:     Exercise = { id: uid('ex'), name: 'Back Squat',         isBodyweight: false, isDoubleComponent: false, primaryMuscleGroups: ['Quads', 'Glutes'],                 secondaryMuscleGroups: ['Hamstrings', 'Hip Flexors', 'Lower Back'], createdAt: now }
  const eRDL:       Exercise = { id: uid('ex'), name: 'Romanian Deadlift',  isBodyweight: false, isDoubleComponent: false, primaryMuscleGroups: ['Hamstrings', 'Glutes'],            secondaryMuscleGroups: ['Lower Back', 'Calves'],                 createdAt: now }
  const eLegPress:  Exercise = { id: uid('ex'), name: 'Leg Press',          isBodyweight: false, isDoubleComponent: false, primaryMuscleGroups: ['Quads', 'Glutes'],                 secondaryMuscleGroups: ['Hamstrings'],                           createdAt: now }
  const eHipThrust: Exercise = { id: uid('ex'), name: 'Hip Thrust',         isBodyweight: false, isDoubleComponent: false, primaryMuscleGroups: ['Glutes'],                          secondaryMuscleGroups: ['Hamstrings', 'Hip Flexors'],            createdAt: now }
  const eLegCurl:   Exercise = { id: uid('ex'), name: 'Leg Curl',           isBodyweight: false, isDoubleComponent: false, primaryMuscleGroups: ['Hamstrings'],                      secondaryMuscleGroups: ['Calves'],                               createdAt: now }
  const eCalfRaise: Exercise = { id: uid('ex'), name: 'Calf Raise',         isBodyweight: false, isDoubleComponent: false, primaryMuscleGroups: ['Calves'],                          secondaryMuscleGroups: [],                                       createdAt: now }
  const eAdductor:  Exercise = { id: uid('ex'), name: 'Adductor Machine',   isBodyweight: false, isDoubleComponent: false, primaryMuscleGroups: ['Adductors'],                       secondaryMuscleGroups: ['Hip Flexors'],                          createdAt: now }

  const ePlank:     Exercise = { id: uid('ex'), name: 'Plank',              isBodyweight: true,  isDoubleComponent: false, isTimed: true, timedTargetSeconds: 60, primaryMuscleGroups: ['Core'], secondaryMuscleGroups: ['Lower Back'], createdAt: now }
  const eCableCrunch: Exercise = { id: uid('ex'), name: 'Cable Crunch',     isBodyweight: false, isDoubleComponent: false, primaryMuscleGroups: ['Core'],                            secondaryMuscleGroups: ['Hip Flexors'],                          createdAt: now }
  const eBackExt:   Exercise = { id: uid('ex'), name: 'Back Extension',     isBodyweight: false, isDoubleComponent: false, primaryMuscleGroups: ['Lower Back'],                      secondaryMuscleGroups: ['Glutes', 'Hamstrings'],                 createdAt: now }

  const allExercises = [
    eBench, eIncline, eOHP, eLateral, eTricepPD, eChestFly,
    ePullup, eBBRow, eFacePull, eBBCurl, eHammer,
    eSquat, eRDL, eLegPress, eHipThrust, eLegCurl, eCalfRaise, eAdductor,
    ePlank, eCableCrunch, eBackExt,
  ]
  for (const ex of allExercises) await saveExercise(ex)

  // ── Workouts ────────────────────────────────────────────────────────────────
  const woPush: Workout = { id: uid('wo'), name: 'Push',  color: '#E8591A', category: 'Strength', exerciseIds: [eBench.id, eIncline.id, eOHP.id, eLateral.id, eTricepPD.id, eChestFly.id], createdAt: now }
  const woPull: Workout = { id: uid('wo'), name: 'Pull',  color: '#1A9E8C', category: 'Strength', exerciseIds: [ePullup.id, eBBRow.id, eFacePull.id, eBBCurl.id, eHammer.id],              createdAt: now }
  const woLegs: Workout = { id: uid('wo'), name: 'Legs',  color: '#1A7FBF', category: 'Strength', exerciseIds: [eSquat.id, eRDL.id, eLegPress.id, eHipThrust.id, eLegCurl.id, eCalfRaise.id, eAdductor.id], createdAt: now }
  const woCore: Workout = { id: uid('wo'), name: 'Core',  color: '#5E9E6A', category: 'Accessory', exerciseIds: [ePlank.id, eCableCrunch.id, eBackExt.id],                                 createdAt: now }
  for (const wo of [woPush, woPull, woLegs, woCore]) await saveWorkout(wo)

  const exMeta: Record<string, { isDoubleComponent: boolean; isBodyweight: boolean; isTimed?: boolean }> = {}
  for (const ex of allExercises) exMeta[ex.id] = { isDoubleComponent: ex.isDoubleComponent, isBodyweight: ex.isBodyweight, isTimed: ex.isTimed }

  // ── Random session builders ─────────────────────────────────────────────────
  // Each candidate exercise is: [Exercise, inclusionProbability, weightRange, repRange, setsRange]
  type Slot = [Exercise, number, [number, number], [number, number], [number, number]]

  function buildSession(slots: Slot[]): LoggedExercise[] {
    return slots.flatMap(([ex, prob, [wMin, wMax], [rMin, rMax], [sMin, sMax]]) => {
      if (!roll(prob)) return []
      const nSets = ri(sMin, sMax)
      let sets: ExerciseSet[]
      if (ex.isTimed)        sets = timedSets(ri(wMin, wMax, 5), nSets)
      else if (ex.isBodyweight) sets = bwSets(ri(rMin, rMax), nSets)
      else                   sets = wSets(ri(wMin, wMax, 2.5), ri(rMin, rMax), nSets)
      return [{ exerciseId: ex.id, exerciseName: ex.name, sets }]
    })
  }

  function pushSession(): LoggedExercise[] {
    return buildSession([
      [eBench,    1.00, [75,  105], [5, 10], [3, 5]],
      [eIncline,  0.80, [27,  42],  [8, 12], [3, 4]],
      [eOHP,      0.75, [50,  75],  [6, 10], [3, 4]],
      [eChestFly, 0.60, [12,  25],  [10,15], [3, 3]],
      [eLateral,  0.65, [12,  22],  [12,15], [3, 4]],
      [eTricepPD, 0.70, [25,  45],  [10,15], [3, 4]],
    ])
  }

  function pullSession(): LoggedExercise[] {
    return buildSession([
      [ePullup,   1.00, [0,   0],   [5, 10], [3, 4]],  // bodyweight — weight range unused
      [eBBRow,    0.90, [70,  105], [6, 10], [3, 5]],
      [eFacePull, 0.75, [22,  40],  [12,15], [3, 4]],
      [eBBCurl,   0.80, [35,  55],  [8, 12], [3, 4]],
      [eHammer,   0.65, [17,  27],  [10,12], [3, 3]],
    ])
  }

  function legsSession(): LoggedExercise[] {
    return buildSession([
      [eSquat,     1.00, [90,  130], [4,  8], [3, 5]],
      [eRDL,       0.85, [80,  120], [8, 10], [3, 4]],
      [eLegPress,  0.75, [160, 220], [10,12], [3, 4]],
      [eHipThrust, 0.70, [90,  130], [10,12], [3, 4]],
      [eLegCurl,   0.75, [40,  60],  [10,12], [3, 3]],
      [eCalfRaise, 0.60, [70,  100], [15,20], [3, 3]],
      [eAdductor,  0.55, [45,  75],  [12,15], [3, 3]],
    ])
  }

  function coreSession(): LoggedExercise[] {
    return buildSession([
      [ePlank,       0.85, [30, 75],  [0,  0], [3, 4]],  // timed — weight range = duration range
      [eCableCrunch, 0.80, [27, 45],  [12,15], [3, 4]],
      [eBackExt,     0.70, [15, 35],  [12,15], [3, 3]],
    ])
  }

  // ── Session schedule ─────────────────────────────────────────────────────────
  // 11 candidate slots spread across 3 weeks; each may be skipped (15% chance).
  // Base days are staggered to avoid collisions; small random jitter applied.
  type SessionSlot = { baseDaysAgo: number; workout: Workout; buildFn: () => LoggedExercise[] }

  const CANDIDATE_SLOTS: SessionSlot[] = [
    { baseDaysAgo: 21, workout: woPush, buildFn: pushSession },
    { baseDaysAgo: 18, workout: woPull, buildFn: pullSession },
    { baseDaysAgo: 15, workout: woLegs, buildFn: legsSession },
    { baseDaysAgo: 13, workout: woCore, buildFn: coreSession },
    { baseDaysAgo: 11, workout: woPush, buildFn: pushSession },
    { baseDaysAgo:  9, workout: woPull, buildFn: pullSession },
    { baseDaysAgo:  7, workout: woLegs, buildFn: legsSession },
    { baseDaysAgo:  5, workout: woPush, buildFn: pushSession },
    { baseDaysAgo:  4, workout: woCore, buildFn: coreSession },
    { baseDaysAgo:  2, workout: woPull, buildFn: pullSession },
    { baseDaysAgo:  1, workout: woLegs, buildFn: legsSession },
  ]

  const usedDates = new Set<string>()
  const logs: DayLog[] = []

  for (const { baseDaysAgo, workout, buildFn } of CANDIDATE_SLOTS) {
    if (!roll(0.85)) continue                        // 15% chance to skip this session entirely

    // Small jitter (0–1 day earlier) to vary the exact date
    const daysAgo = baseDaysAgo + ri(0, 1)
    const date = dateISO(daysAgo)
    if (usedDates.has(date)) continue                // skip collision
    usedDates.add(date)

    const exercises = buildFn()
    if (exercises.length === 0) continue             // session ended up empty

    const partial = { id: uid('log'), date, workoutName: workout.name, exercises, markdown: '', createdAt: now, updatedAt: now }
    logs.push({ ...partial, markdown: generateMarkdown(partial, exMeta) })
  }

  for (const log of logs) await saveDayLog(log)
  return { logs: logs.length }
}

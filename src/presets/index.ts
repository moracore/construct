import { saveExercise, saveWorkout, getAllExercises, getAllWorkouts } from '../db'
import type { MuscleGroup } from '../types'

export type PresetMode = 'simple' | 'extensive'

export interface PresetExercise {
  name: string
  primaryMuscles: MuscleGroup[]
  secondaryMuscles: MuscleGroup[]
  isBodyweight: boolean
  bodyweightType?: 'standard' | 'assisted' | 'weighted'
  isDoubleComponent: boolean
  isTimed?: boolean
  workout: string
}

// ── Simple preset ────────────────────────────────────────────────────────────

export const SIMPLE_EXERCISES: PresetExercise[] = [
  // Push
  { name: 'Bench Press',                    primaryMuscles: ['Chest'],       secondaryMuscles: ['Front Delts', 'Triceps'],           isBodyweight: false, isDoubleComponent: false, workout: 'Push' },
  { name: 'Dips',                           primaryMuscles: ['Chest'],       secondaryMuscles: ['Front Delts', 'Triceps'],           isBodyweight: true,  bodyweightType: 'standard', isDoubleComponent: false, workout: 'Push' },
  { name: 'Dips (Weighted)',                primaryMuscles: ['Chest'],       secondaryMuscles: ['Front Delts', 'Triceps'],           isBodyweight: true,  bodyweightType: 'weighted', isDoubleComponent: false, workout: 'Push' },
  { name: 'Shoulder Press',                 primaryMuscles: ['Front Delts'], secondaryMuscles: ['Side Delts', 'Triceps'],            isBodyweight: false, isDoubleComponent: false, workout: 'Push' },
  { name: 'Chest Fly',                      primaryMuscles: ['Chest'],       secondaryMuscles: ['Front Delts'],                     isBodyweight: false, isDoubleComponent: false, workout: 'Push' },
  { name: 'Crossovers',                     primaryMuscles: ['Chest'],       secondaryMuscles: ['Front Delts', 'Triceps'],           isBodyweight: false, isDoubleComponent: false, workout: 'Push' },
  { name: 'Push-ups',                       primaryMuscles: ['Chest'],       secondaryMuscles: ['Front Delts', 'Triceps'],           isBodyweight: true,  bodyweightType: 'standard', isDoubleComponent: false, workout: 'Push' },
  { name: 'Push-ups (Weighted)',            primaryMuscles: ['Chest'],       secondaryMuscles: ['Front Delts', 'Triceps'],           isBodyweight: true,  bodyweightType: 'weighted', isDoubleComponent: false, workout: 'Push' },
  { name: 'Lateral Raises',                 primaryMuscles: ['Side Delts'],  secondaryMuscles: [],                                  isBodyweight: false, isDoubleComponent: true,  workout: 'Push' },
  { name: 'Pushdowns',                      primaryMuscles: ['Triceps'],     secondaryMuscles: ['Front Delts'],                     isBodyweight: false, isDoubleComponent: false, workout: 'Push' },
  { name: 'Overhead Tricep Extensions',     primaryMuscles: ['Triceps'],     secondaryMuscles: ['Front Delts'],                     isBodyweight: false, isDoubleComponent: true,  workout: 'Push' },
  // Pull
  { name: 'Rows',                           primaryMuscles: ['Lats', 'Traps'], secondaryMuscles: ['Biceps', 'Rear Delts'],          isBodyweight: false, isDoubleComponent: false, workout: 'Pull' },
  { name: 'Pulldowns',                      primaryMuscles: ['Lats'],        secondaryMuscles: ['Biceps', 'Rear Delts'],             isBodyweight: false, isDoubleComponent: false, workout: 'Pull' },
  { name: 'Pull-ups',                       primaryMuscles: ['Lats'],        secondaryMuscles: ['Biceps', 'Rear Delts', 'Traps'],   isBodyweight: true,  bodyweightType: 'standard', isDoubleComponent: false, workout: 'Pull' },
  { name: 'Pull-ups (Weighted)',            primaryMuscles: ['Lats'],        secondaryMuscles: ['Biceps', 'Rear Delts', 'Traps'],   isBodyweight: true,  bodyweightType: 'weighted', isDoubleComponent: false, workout: 'Pull' },
  { name: 'Pull-ups (Assisted)',            primaryMuscles: ['Lats'],        secondaryMuscles: ['Biceps', 'Rear Delts', 'Traps'],   isBodyweight: true,  bodyweightType: 'assisted', isDoubleComponent: false, workout: 'Pull' },
  { name: 'Curls',                          primaryMuscles: ['Biceps'],      secondaryMuscles: [],                                  isBodyweight: false, isDoubleComponent: true,  workout: 'Pull' },
  { name: 'Wrist Curls',                    primaryMuscles: ['Forearms'],    secondaryMuscles: [],                                  isBodyweight: false, isDoubleComponent: false, workout: 'Pull' },
  { name: 'Reverse Wrist Curls',           primaryMuscles: ['Forearms'],    secondaryMuscles: [],                                  isBodyweight: false, isDoubleComponent: false, workout: 'Pull' },
  { name: 'Farmers Walk',                   primaryMuscles: ['Forearms'],    secondaryMuscles: ['Core', 'Traps'],                   isBodyweight: false, isDoubleComponent: true,  workout: 'Pull' },
  { name: 'Back Extensions',               primaryMuscles: ['Lower Back'],  secondaryMuscles: ['Glutes', 'Hamstrings'],             isBodyweight: true,  bodyweightType: 'standard', isDoubleComponent: false, workout: 'Pull' },
  { name: 'Good Mornings',                  primaryMuscles: ['Lower Back'],  secondaryMuscles: ['Glutes', 'Hamstrings'],             isBodyweight: false, isDoubleComponent: false, workout: 'Pull' },
  { name: 'Face Pulls',                     primaryMuscles: ['Rear Delts'],  secondaryMuscles: ['Traps'],                           isBodyweight: false, isDoubleComponent: false, workout: 'Pull' },
  { name: 'Reverse Pec Deck',              primaryMuscles: ['Rear Delts'],  secondaryMuscles: [],                                  isBodyweight: false, isDoubleComponent: false, workout: 'Pull' },
  // Legs
  { name: 'Squats',                         primaryMuscles: ['Glutes', 'Quads'], secondaryMuscles: ['Core', 'Hamstrings'],          isBodyweight: false, isDoubleComponent: false, workout: 'Legs' },
  { name: 'Leg Press',                      primaryMuscles: ['Glutes', 'Quads'], secondaryMuscles: ['Hamstrings'],                  isBodyweight: false, isDoubleComponent: false, workout: 'Legs' },
  { name: 'Lunges',                         primaryMuscles: ['Glutes', 'Quads'], secondaryMuscles: ['Hamstrings'],                  isBodyweight: false, isDoubleComponent: true,  workout: 'Legs' },
  { name: 'Bulgarian Split Squats',         primaryMuscles: ['Glutes', 'Quads'], secondaryMuscles: ['Hamstrings'],                  isBodyweight: false, isDoubleComponent: true,  workout: 'Legs' },
  { name: 'Romanian Deadlifts',             primaryMuscles: ['Glutes', 'Hamstrings'], secondaryMuscles: ['Core', 'Lower Back'],     isBodyweight: false, isDoubleComponent: false, workout: 'Legs' },
  { name: 'Leg Extensions',                 primaryMuscles: ['Quads'],       secondaryMuscles: [],                                  isBodyweight: false, isDoubleComponent: false, workout: 'Legs' },
  { name: 'Leg Curls',                      primaryMuscles: ['Hamstrings'],  secondaryMuscles: [],                                  isBodyweight: false, isDoubleComponent: false, workout: 'Legs' },
  { name: 'Calf Raises',                    primaryMuscles: ['Calves'],      secondaryMuscles: [],                                  isBodyweight: false, isDoubleComponent: true,  workout: 'Legs' },
  { name: 'Hip Thrusts',                    primaryMuscles: ['Glutes'],      secondaryMuscles: ['Hamstrings'],                      isBodyweight: false, isDoubleComponent: false, workout: 'Legs' },
  { name: 'Glute Kickbacks',               primaryMuscles: ['Glutes'],      secondaryMuscles: [],                                  isBodyweight: false, isDoubleComponent: true,  workout: 'Legs' },
  { name: 'Abductors',                      primaryMuscles: ['Glutes'],      secondaryMuscles: [],                                  isBodyweight: false, isDoubleComponent: false, workout: 'Legs' },
  { name: 'Adductors',                      primaryMuscles: ['Adductors'],   secondaryMuscles: [],                                  isBodyweight: false, isDoubleComponent: false, workout: 'Legs' },
  // Core
  { name: 'Crunches',                       primaryMuscles: ['Core'],        secondaryMuscles: [],                                  isBodyweight: true,  bodyweightType: 'standard', isDoubleComponent: false, workout: 'Core' },
  { name: 'Cable Crunches',                 primaryMuscles: ['Core'],        secondaryMuscles: [],                                  isBodyweight: false, isDoubleComponent: false, workout: 'Core' },
  { name: 'Leg Raises',                     primaryMuscles: ['Core'],        secondaryMuscles: ['Hip Flexors'],                     isBodyweight: true,  bodyweightType: 'standard', isDoubleComponent: false, workout: 'Core' },
  { name: 'Planks',                         primaryMuscles: ['Core'],        secondaryMuscles: ['Front Delts'],                     isBodyweight: true,  bodyweightType: 'standard', isDoubleComponent: false, isTimed: true, workout: 'Core' },
  { name: 'Russian Twists',                 primaryMuscles: ['Obliques'],    secondaryMuscles: ['Core'],                            isBodyweight: false, isDoubleComponent: true,  workout: 'Core' },
  { name: 'Ab Wheel Rollouts',             primaryMuscles: ['Core'],        secondaryMuscles: ['Lats'],                            isBodyweight: true,  bodyweightType: 'standard', isDoubleComponent: false, workout: 'Core' },
]

// ── Extensive preset ─────────────────────────────────────────────────────────

export const EXTENSIVE_EXERCISES: PresetExercise[] = [
  // Push
  { name: 'Bench Press (Dumbbells)',                          primaryMuscles: ['Chest'],       secondaryMuscles: ['Triceps', 'Front Delts'],           isBodyweight: false, isDoubleComponent: false, workout: 'Push' },
  { name: 'Bench Press (Barbell)',                            primaryMuscles: ['Chest'],       secondaryMuscles: ['Triceps', 'Front Delts'],           isBodyweight: false, isDoubleComponent: false, workout: 'Push' },
  { name: 'Bench Press (Machine)',                            primaryMuscles: ['Chest'],       secondaryMuscles: ['Triceps', 'Front Delts'],           isBodyweight: false, isDoubleComponent: false, workout: 'Push' },
  { name: 'Incline Bench Press (Dumbbells)',                  primaryMuscles: ['Chest'],       secondaryMuscles: ['Triceps', 'Front Delts'],           isBodyweight: false, isDoubleComponent: false, workout: 'Push' },
  { name: 'Incline Bench Press (Barbell)',                    primaryMuscles: ['Chest'],       secondaryMuscles: ['Triceps', 'Front Delts'],           isBodyweight: false, isDoubleComponent: false, workout: 'Push' },
  { name: 'Incline Bench Press (Machine)',                    primaryMuscles: ['Chest'],       secondaryMuscles: ['Triceps', 'Front Delts'],           isBodyweight: false, isDoubleComponent: false, workout: 'Push' },
  { name: 'Dips',                                            primaryMuscles: ['Chest'],       secondaryMuscles: ['Triceps', 'Front Delts'],           isBodyweight: true,  bodyweightType: 'standard', isDoubleComponent: false, workout: 'Push' },
  { name: 'Dips (Weighted)',                                  primaryMuscles: ['Chest'],       secondaryMuscles: ['Triceps', 'Front Delts'],           isBodyweight: true,  bodyweightType: 'weighted', isDoubleComponent: false, workout: 'Push' },
  { name: 'Dips (Machine)',                                   primaryMuscles: ['Chest'],       secondaryMuscles: ['Triceps', 'Front Delts'],           isBodyweight: false, isDoubleComponent: false, workout: 'Push' },
  { name: 'Shoulder Press (Dumbbells)',                       primaryMuscles: ['Front Delts'], secondaryMuscles: ['Triceps', 'Side Delts'],            isBodyweight: false, isDoubleComponent: false, workout: 'Push' },
  { name: 'Shoulder Press (Barbell)',                         primaryMuscles: ['Front Delts'], secondaryMuscles: ['Triceps', 'Side Delts'],            isBodyweight: false, isDoubleComponent: false, workout: 'Push' },
  { name: 'Shoulder Press (Machine)',                         primaryMuscles: ['Front Delts'], secondaryMuscles: ['Triceps', 'Side Delts'],            isBodyweight: false, isDoubleComponent: false, workout: 'Push' },
  { name: 'Chest Fly (Dumbbells)',                            primaryMuscles: ['Chest'],       secondaryMuscles: ['Front Delts'],                     isBodyweight: false, isDoubleComponent: false, workout: 'Push' },
  { name: 'Chest Fly (Machine)',                              primaryMuscles: ['Chest'],       secondaryMuscles: ['Front Delts'],                     isBodyweight: false, isDoubleComponent: false, workout: 'Push' },
  { name: 'Chest Fly (Cable)',                                primaryMuscles: ['Chest'],       secondaryMuscles: ['Front Delts'],                     isBodyweight: false, isDoubleComponent: false, workout: 'Push' },
  { name: 'Crossovers (Cable)',                               primaryMuscles: ['Chest'],       secondaryMuscles: ['Triceps', 'Front Delts'],           isBodyweight: false, isDoubleComponent: false, workout: 'Push' },
  { name: 'Push-ups',                                        primaryMuscles: ['Chest'],       secondaryMuscles: ['Triceps', 'Front Delts'],           isBodyweight: true,  bodyweightType: 'standard', isDoubleComponent: false, workout: 'Push' },
  { name: 'Push-ups (Weighted)',                              primaryMuscles: ['Chest'],       secondaryMuscles: ['Triceps', 'Front Delts'],           isBodyweight: true,  bodyweightType: 'weighted', isDoubleComponent: false, workout: 'Push' },
  { name: 'Lateral Raises (L/R Cable)',                       primaryMuscles: ['Side Delts'],  secondaryMuscles: [],                                  isBodyweight: false, isDoubleComponent: true,  workout: 'Push' },
  { name: 'Lateral Raises (Cable)',                           primaryMuscles: ['Side Delts'],  secondaryMuscles: [],                                  isBodyweight: false, isDoubleComponent: false, workout: 'Push' },
  { name: 'Lateral Raises (Dumbbells)',                       primaryMuscles: ['Side Delts'],  secondaryMuscles: [],                                  isBodyweight: false, isDoubleComponent: false, workout: 'Push' },
  { name: 'Lateral Raises (Machine)',                         primaryMuscles: ['Side Delts'],  secondaryMuscles: [],                                  isBodyweight: false, isDoubleComponent: false, workout: 'Push' },
  { name: 'Pushdowns (Cable)',                                primaryMuscles: ['Triceps'],     secondaryMuscles: ['Front Delts'],                     isBodyweight: false, isDoubleComponent: false, workout: 'Push' },
  { name: 'Overhead Tricep Extensions (Cable)',               primaryMuscles: ['Triceps'],     secondaryMuscles: ['Front Delts'],                     isBodyweight: false, isDoubleComponent: false, workout: 'Push' },
  { name: 'Overhead Tricep Extensions (Dumbbells L/R)',       primaryMuscles: ['Triceps'],     secondaryMuscles: ['Front Delts'],                     isBodyweight: false, isDoubleComponent: true,  workout: 'Push' },
  { name: 'Overhead Tricep Extensions (Dumbbell)',            primaryMuscles: ['Triceps'],     secondaryMuscles: ['Front Delts'],                     isBodyweight: false, isDoubleComponent: false, workout: 'Push' },
  // Pull
  { name: 'Rows (Close-grip Cable)',                          primaryMuscles: ['Lats'],        secondaryMuscles: ['Traps', 'Biceps', 'Rear Delts'],   isBodyweight: false, isDoubleComponent: false, workout: 'Pull' },
  { name: 'Rows (Wide-grip Cable)',                           primaryMuscles: ['Traps'],       secondaryMuscles: ['Lats', 'Biceps', 'Rear Delts'],    isBodyweight: false, isDoubleComponent: false, workout: 'Pull' },
  { name: 'Rows (Machine)',                                   primaryMuscles: ['Lats', 'Traps'], secondaryMuscles: ['Biceps', 'Rear Delts'],          isBodyweight: false, isDoubleComponent: false, workout: 'Pull' },
  { name: 'Rows (Barbell)',                                   primaryMuscles: ['Lats', 'Traps'], secondaryMuscles: ['Biceps', 'Rear Delts'],          isBodyweight: false, isDoubleComponent: false, workout: 'Pull' },
  { name: 'Pulldowns (Close-grip Cable)',                     primaryMuscles: ['Lats'],        secondaryMuscles: ['Biceps', 'Rear Delts'],             isBodyweight: false, isDoubleComponent: false, workout: 'Pull' },
  { name: 'Pulldowns (Close-grip Machine)',                   primaryMuscles: ['Lats'],        secondaryMuscles: ['Biceps', 'Rear Delts'],             isBodyweight: false, isDoubleComponent: false, workout: 'Pull' },
  { name: 'Pull-ups (Wide-grip)',                             primaryMuscles: ['Lats'],        secondaryMuscles: ['Biceps', 'Traps', 'Rear Delts'],   isBodyweight: true,  bodyweightType: 'standard', isDoubleComponent: false, workout: 'Pull' },
  { name: 'Pull-ups (Underhand Close-Grip)',                  primaryMuscles: ['Lats', 'Biceps'], secondaryMuscles: ['Traps', 'Rear Delts'],          isBodyweight: true,  bodyweightType: 'standard', isDoubleComponent: false, workout: 'Pull' },
  { name: 'Pull-ups (Close-grip)',                            primaryMuscles: ['Lats'],        secondaryMuscles: ['Biceps', 'Traps', 'Rear Delts'],   isBodyweight: true,  bodyweightType: 'standard', isDoubleComponent: false, workout: 'Pull' },
  { name: 'Pull-ups (Assisted)',                              primaryMuscles: ['Lats'],        secondaryMuscles: ['Biceps', 'Traps', 'Rear Delts'],   isBodyweight: true,  bodyweightType: 'assisted', isDoubleComponent: false, workout: 'Pull' },
  { name: 'Pull-ups (Wide-grip Weighted)',                    primaryMuscles: ['Lats'],        secondaryMuscles: ['Biceps', 'Traps', 'Rear Delts'],   isBodyweight: true,  bodyweightType: 'weighted', isDoubleComponent: false, workout: 'Pull' },
  { name: 'Pull-ups (Close-grip Weighted)',                   primaryMuscles: ['Lats'],        secondaryMuscles: ['Biceps', 'Traps', 'Rear Delts'],   isBodyweight: true,  bodyweightType: 'weighted', isDoubleComponent: false, workout: 'Pull' },
  { name: 'Curls (Dumbbell)',                                 primaryMuscles: ['Biceps'],      secondaryMuscles: [],                                  isBodyweight: false, isDoubleComponent: false, workout: 'Pull' },
  { name: 'Curls (Dumbbell L/R)',                             primaryMuscles: ['Biceps'],      secondaryMuscles: [],                                  isBodyweight: false, isDoubleComponent: true,  workout: 'Pull' },
  { name: 'Curls (Preacher Dumbbell L/R)',                    primaryMuscles: ['Biceps'],      secondaryMuscles: [],                                  isBodyweight: false, isDoubleComponent: true,  workout: 'Pull' },
  { name: 'Curls (Preacher Barbell)',                         primaryMuscles: ['Biceps'],      secondaryMuscles: [],                                  isBodyweight: false, isDoubleComponent: false, workout: 'Pull' },
  { name: 'Curls (Barbell)',                                  primaryMuscles: ['Biceps'],      secondaryMuscles: [],                                  isBodyweight: false, isDoubleComponent: false, workout: 'Pull' },
  { name: 'Curls (Machine)',                                  primaryMuscles: ['Biceps'],      secondaryMuscles: [],                                  isBodyweight: false, isDoubleComponent: false, workout: 'Pull' },
  { name: 'Curls (Machine L/R)',                              primaryMuscles: ['Biceps'],      secondaryMuscles: [],                                  isBodyweight: false, isDoubleComponent: true,  workout: 'Pull' },
  { name: 'Curls (Cable)',                                    primaryMuscles: ['Biceps'],      secondaryMuscles: [],                                  isBodyweight: false, isDoubleComponent: false, workout: 'Pull' },
  { name: 'Curls (Cable L/R)',                                primaryMuscles: ['Biceps'],      secondaryMuscles: [],                                  isBodyweight: false, isDoubleComponent: true,  workout: 'Pull' },
  { name: 'Wrist Curls (Barbell)',                            primaryMuscles: ['Forearms'],    secondaryMuscles: [],                                  isBodyweight: false, isDoubleComponent: false, workout: 'Pull' },
  { name: 'Reverse Wrist Curls (Barbell)',                    primaryMuscles: ['Forearms'],    secondaryMuscles: [],                                  isBodyweight: false, isDoubleComponent: false, workout: 'Pull' },
  { name: 'Farmers Walk',                                    primaryMuscles: ['Forearms'],    secondaryMuscles: ['Core', 'Traps'],                   isBodyweight: false, isDoubleComponent: true,  workout: 'Pull' },
  { name: 'Back Extensions (Machine)',                        primaryMuscles: ['Lower Back'],  secondaryMuscles: ['Glutes', 'Hamstrings'],             isBodyweight: true,  bodyweightType: 'standard', isDoubleComponent: false, workout: 'Pull' },
  { name: 'Good Mornings',                                   primaryMuscles: ['Lower Back'],  secondaryMuscles: ['Glutes', 'Hamstrings'],             isBodyweight: false, isDoubleComponent: false, workout: 'Pull' },
  { name: 'Face Pulls (Cable)',                               primaryMuscles: ['Rear Delts'],  secondaryMuscles: ['Traps'],                           isBodyweight: false, isDoubleComponent: false, workout: 'Pull' },
  { name: 'Reverse Pec Deck (Machine)',                       primaryMuscles: ['Rear Delts'],  secondaryMuscles: [],                                  isBodyweight: false, isDoubleComponent: false, workout: 'Pull' },
  // Legs
  { name: 'Squats (Barbell)',                                 primaryMuscles: ['Glutes', 'Quads'], secondaryMuscles: ['Core', 'Hamstrings'],          isBodyweight: false, isDoubleComponent: false, workout: 'Legs' },
  { name: 'Squats (Goblet)',                                  primaryMuscles: ['Glutes', 'Quads'], secondaryMuscles: ['Core', 'Hamstrings'],          isBodyweight: false, isDoubleComponent: false, workout: 'Legs' },
  { name: 'Leg Press',                                       primaryMuscles: ['Glutes', 'Quads'], secondaryMuscles: ['Hamstrings'],                  isBodyweight: false, isDoubleComponent: false, workout: 'Legs' },
  { name: 'Lunges (Dumbbells)',                               primaryMuscles: ['Glutes', 'Quads'], secondaryMuscles: ['Hamstrings'],                  isBodyweight: false, isDoubleComponent: true,  workout: 'Legs' },
  { name: 'Bulgarian Split Squats',                           primaryMuscles: ['Glutes', 'Quads'], secondaryMuscles: ['Hamstrings'],                  isBodyweight: false, isDoubleComponent: true,  workout: 'Legs' },
  { name: 'Romanian Deadlifts',                               primaryMuscles: ['Glutes', 'Hamstrings'], secondaryMuscles: ['Core', 'Lower Back'],     isBodyweight: false, isDoubleComponent: false, workout: 'Legs' },
  { name: 'Leg Extensions (Machine)',                         primaryMuscles: ['Quads'],       secondaryMuscles: [],                                  isBodyweight: false, isDoubleComponent: false, workout: 'Legs' },
  { name: 'Leg Curls (Machine)',                              primaryMuscles: ['Hamstrings'],  secondaryMuscles: [],                                  isBodyweight: false, isDoubleComponent: false, workout: 'Legs' },
  { name: 'Calf Raises (Machine)',                            primaryMuscles: ['Calves'],      secondaryMuscles: [],                                  isBodyweight: false, isDoubleComponent: true,  workout: 'Legs' },
  { name: 'Hip Thrusts (Barbell)',                            primaryMuscles: ['Glutes'],      secondaryMuscles: ['Hamstrings'],                      isBodyweight: false, isDoubleComponent: false, workout: 'Legs' },
  { name: 'Glute Kickbacks (Cable)',                          primaryMuscles: ['Glutes'],      secondaryMuscles: [],                                  isBodyweight: false, isDoubleComponent: true,  workout: 'Legs' },
  { name: 'Abductors (Machine)',                              primaryMuscles: ['Glutes'],      secondaryMuscles: [],                                  isBodyweight: false, isDoubleComponent: false, workout: 'Legs' },
  { name: 'Adductors (Machine)',                              primaryMuscles: ['Adductors'],   secondaryMuscles: [],                                  isBodyweight: false, isDoubleComponent: false, workout: 'Legs' },
  // Core
  { name: 'Crunches',                                        primaryMuscles: ['Core'],        secondaryMuscles: [],                                  isBodyweight: true,  bodyweightType: 'standard', isDoubleComponent: false, workout: 'Core' },
  { name: 'Cable Crunches',                                  primaryMuscles: ['Core'],        secondaryMuscles: [],                                  isBodyweight: false, isDoubleComponent: false, workout: 'Core' },
  { name: 'Leg Raises',                                      primaryMuscles: ['Core'],        secondaryMuscles: ['Hip Flexors'],                     isBodyweight: true,  bodyweightType: 'standard', isDoubleComponent: false, workout: 'Core' },
  { name: 'Planks',                                          primaryMuscles: ['Core'],        secondaryMuscles: ['Front Delts'],                     isBodyweight: true,  bodyweightType: 'standard', isDoubleComponent: false, isTimed: true, workout: 'Core' },
  { name: 'Russian Twists',                                  primaryMuscles: ['Obliques'],    secondaryMuscles: ['Core'],                            isBodyweight: false, isDoubleComponent: true,  workout: 'Core' },
  { name: 'Ab Wheel Rollouts',                               primaryMuscles: ['Core'],        secondaryMuscles: ['Lats'],                            isBodyweight: true,  bodyweightType: 'standard', isDoubleComponent: false, workout: 'Core' },
]

// ── Workout definitions ──────────────────────────────────────────────────────

const WORKOUT_DEFS = [
  { name: 'Push', color: 'var(--accent)', category: 'Push' },
  { name: 'Pull', color: '#44BB66',       category: 'Pull' },
  { name: 'Legs', color: '#FF8800',       category: 'Legs' },
  { name: 'Core', color: '#AA44FF',       category: 'Core' },
]

// ── loadPreset ───────────────────────────────────────────────────────────────

export async function loadPreset(mode: PresetMode): Promise<void> {
  const [existingExercises, existingWorkouts] = await Promise.all([
    getAllExercises(),
    getAllWorkouts(),
  ])

  const exercises = mode === 'simple' ? SIMPLE_EXERCISES : EXTENSIVE_EXERCISES

  // Build or find workout records, keyed by workout name
  const workoutIdMap: Record<string, string> = {}

  for (const def of WORKOUT_DEFS) {
    const existing = existingWorkouts.find((w) => w.name === def.name && w.category === def.category)
    if (existing) {
      workoutIdMap[def.name] = existing.id
    } else {
      const id = `wo_preset_${mode}_${def.name.toLowerCase()}`
      workoutIdMap[def.name] = id
      await saveWorkout({
        id,
        name: def.name,
        color: def.color,
        category: def.category,
        exerciseIds: [],
        createdAt: Date.now(),
      })
    }
  }

  // For each workout, collect the ordered exercise IDs we'll add
  const workoutExerciseIds: Record<string, string[]> = {
    Push: [], Pull: [], Legs: [], Core: [],
  }

  for (const preset of exercises) {
    // Skip if an exercise with the same name already exists
    if (existingExercises.some((e) => e.name === preset.name)) continue

    const id = `ex_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    await saveExercise({
      id,
      name: preset.name,
      isBodyweight: preset.isBodyweight,
      bodyweightType: preset.bodyweightType,
      isDoubleComponent: preset.isDoubleComponent,
      isTimed: preset.isTimed || undefined,
      primaryMuscleGroups: preset.primaryMuscles,
      secondaryMuscleGroups: preset.secondaryMuscles,
      createdAt: Date.now(),
    })
    workoutExerciseIds[preset.workout].push(id)
  }

  // Re-fetch workouts and append newly created exercise IDs
  const updatedWorkouts = await getAllWorkouts()
  for (const def of WORKOUT_DEFS) {
    const wo = updatedWorkouts.find((w) => w.id === workoutIdMap[def.name])
    if (!wo) continue
    const newIds = workoutExerciseIds[def.name]
    if (newIds.length === 0) continue
    await saveWorkout({
      ...wo,
      exerciseIds: [...wo.exerciseIds, ...newIds],
    })
  }
}

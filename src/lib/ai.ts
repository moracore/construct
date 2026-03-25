const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'
const MODEL = 'google/gemini-2.5-flash'

export interface AiKeys {
  openRouterKey?: string
  geminiKey?: string
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

async function callAI(messages: ChatMessage[], keys: AiKeys): Promise<string> {
  if (!keys.openRouterKey && !keys.geminiKey) {
    throw new Error('No AI key configured. Add an OpenRouter or Gemini key in Settings.')
  }

  if (keys.openRouterKey) {
    const res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${keys.openRouterKey}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Construct',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: MODEL, messages }),
    })
    if (!res.ok) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err = await res.json().catch(() => ({})) as any
      throw new Error(`OpenRouter error: ${err.error?.message ?? res.statusText}`)
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await res.json() as any
    return data.choices[0].message.content as string
  }

  // Gemini direct
  const systemMsg = messages.find((m) => m.role === 'system')?.content
  const history = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] }))

  const body: Record<string, unknown> = { contents: history }
  if (systemMsg) body.systemInstruction = { role: 'system', parts: [{ text: systemMsg }] }

  const res = await fetch(`${GEMINI_URL}?key=${keys.geminiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const err = await res.json().catch(() => ({})) as any
    throw new Error(`Gemini error: ${err.error?.message ?? res.statusText}`)
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = await res.json() as any
  return data.candidates[0].content.parts[0].text as string
}

function stripFences(raw: string): string {
  return raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
}

// ── Workout Suggestion ──────────────────────────────────────────────────────

export interface SuggestedExercise {
  exerciseId: string
  note?: string
  isWildcard: boolean
}

export interface WorkoutSuggestion {
  reasoning: string
  exercises: SuggestedExercise[]
}

export interface WorkoutSuggestionInput {
  today: string
  dayOfWeek: string
  /** Full exercise library */
  exercises: { id: string; name: string; primaryMuscles: string[]; secondaryMuscles: string[] }[]
  /** User's saved workout presets */
  workouts: { name: string; exercises: string[] }[]
  /** Last 28 days of training */
  recentLogs: { date: string; workoutName: string; exercises: string[] }[]
  /** Days since each muscle was last worked */
  daysSinceLastTrainedPerMuscle: Record<string, number>
  /** Muscles not trained in >14 days — wildcard candidates */
  wildcardMuscles: string[]
  /** Exercises in the selected workout preset — primary suggestion pool */
  workoutPoolNames?: string[]
  /** Exercises already in the session — must NOT be re-suggested */
  alreadyInSessionNames?: string[]
}

const SUGGEST_SYSTEM = `You are a personal trainer AI embedded in a gym tracking app called Construct.
Your job: suggest exercises to add to the user's current workout session.

Key context fields:
- workoutPoolNames: the exercises this workout preset normally includes. Prefer these.
- alreadyInSessionNames: exercises already in the session (some may have sets done). Never suggest these.
- wildcardMuscles: muscle groups not trained in >14 days. Strongly consider adding 1-2 wildcards from outside the pool if relevant.

Rules:
- Suggest 4-6 exercises total (not counting already-in-session ones)
- Draw primarily from workoutPoolNames, excluding alreadyInSessionNames
- For wildcards: pick an exercise targeting a wildcard muscle, set isWildcard: true, and explain in the note (e.g. "quads not hit in 18 days")
- Only include a wildcard if it makes anatomical sense alongside the current workout focus — don't force it
- Prefer exercises that appear in the user's recent logs (they know how to do them)
- Return ONLY valid JSON. No markdown fences. No prose outside the JSON.

Return exactly this shape:
{
  "reasoning": "One sentence: why this selection",
  "exercises": [
    { "exerciseId": "...", "note": "optional short note", "isWildcard": false },
    { "exerciseId": "...", "note": "quads not trained in 18 days", "isWildcard": true }
  ]
}`

export async function suggestWorkout(keys: AiKeys, input: WorkoutSuggestionInput): Promise<WorkoutSuggestion> {
  const userMsg = `Today: ${input.today} (${input.dayOfWeek})

Workout pool (this preset's exercises): ${JSON.stringify(input.workoutPoolNames ?? [])}
Already in session (do NOT suggest): ${JSON.stringify(input.alreadyInSessionNames ?? [])}

Full exercise library:
${JSON.stringify(input.exercises)}

Recent training (last 28 days):
${JSON.stringify(input.recentLogs)}

Days since each muscle was last trained:
${JSON.stringify(input.daysSinceLastTrainedPerMuscle)}

Wildcard muscles (>14 days untrained): ${JSON.stringify(input.wildcardMuscles)}`

  const raw = await callAI(
    [{ role: 'system', content: SUGGEST_SYSTEM }, { role: 'user', content: userMsg }],
    keys,
  )

  const parsed = JSON.parse(stripFences(raw)) as WorkoutSuggestion
  return parsed
}

// ── Exercise Order Optimisation ─────────────────────────────────────────────

export interface ExerciseOrderInput {
  id: string
  name: string
  primaryMuscles: string[]
  secondaryMuscles: string[]
  isCompound: boolean
}

const REORDER_SYSTEM = `You are a personal trainer AI. Reorder a list of exercises into the optimal training sequence.

Ordering principles (in priority):
1. Compound multi-joint movements before isolation exercises
2. Avoid pre-fatiguing synergists (e.g. do not put tricep isolation before chest press)
3. If all exercises target the same muscle group, order heaviest/most demanding first
4. Alternate push and pull patterns when possible to allow partial recovery
5. Core and stabiliser work last

Return ONLY a JSON array of exercise IDs in the recommended order.
If the current order is already optimal, return it unchanged.
No markdown fences. No explanation. Only the JSON array.`

export async function optimizeExerciseOrder(keys: AiKeys, exercises: ExerciseOrderInput[]): Promise<string[]> {
  const raw = await callAI(
    [
      { role: 'system', content: REORDER_SYSTEM },
      { role: 'user', content: `Exercises to order:\n${JSON.stringify(exercises)}` },
    ],
    keys,
  )

  const parsed = JSON.parse(stripFences(raw)) as string[]
  return parsed
}

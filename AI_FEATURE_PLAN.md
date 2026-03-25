# AI Workout Features — Implementation Plan

## Overview

Two small AI-powered buttons added to the workout logging section:

1. **Suggest Workout** — appears on the `WorkoutSelector` page before starting. Generates a recommended 5–6 exercise session based on the user's history, muscle fatigue, and training patterns.
2. **Optimize Order** — appears on the `ActiveWorkout` page after starting. Reorders exercises that have **no sets logged yet** into an evidence-based training sequence.

Both features use the same Gemini / OpenRouter dual-provider pattern from Pathway and Mora. Keys are stored in `localStorage` and entered once in Settings.

---

## 1. API Key Storage & Settings

### `src/types/index.ts`
Extend `AppSettings` with two optional fields:

```typescript
export interface AppSettings {
  // ... existing fields ...
  aiOpenRouterKey?: string
  aiGeminiKey?: string
}
```

**Why in AppSettings (IndexedDB) rather than plain localStorage?**
All app config already lives in the `settings` IndexedDB store — keeps persistence consistent. The db layer already has `getSettings()` / `saveSettings()` helpers.

### `src/pages/Settings.tsx`
Add an **"AI Features"** section near the bottom of the settings page:

```
┌─────────────────────────────────────────┐
│  AI Features                            │
│                                         │
│  OpenRouter Key (preferred)             │
│  [sk-or-v1-...                     👁] │
│                                         │
│  Gemini Key (fallback)                  │
│  [AIza...                          👁] │
│                                         │
│  Keys are stored locally and sent only  │
│  to your configured provider.           │
└─────────────────────────────────────────┘
```

- Password input fields with show/hide toggle
- Detect provider from key prefix on call (`AIza` → Gemini direct, else OpenRouter)
- Saved immediately on blur / change via `saveSettings()`

---

## 2. AI Client Module

### `src/lib/ai.ts` (new file)

Mirrors Pathway's `src/lib/ai.ts` exactly in structure:

```typescript
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const DEFAULT_MODEL = 'google/gemini-2.5-flash'

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export async function callAI(
  messages: ChatMessage[],
  keys: { openRouterKey?: string; geminiKey?: string }
): Promise<string>

export async function suggestWorkout(
  keys: { openRouterKey?: string; geminiKey?: string },
  context: WorkoutSuggestionContext
): Promise<SuggestedExercise[]>

export async function optimizeExerciseOrder(
  keys: { openRouterKey?: string; geminiKey?: string },
  context: OrderOptimizationContext
): Promise<string[]>   // returns ordered exerciseIds
```

**Provider routing** (same as Pathway):
- If `openRouterKey` present → POST to OpenRouter with `google/gemini-2.5-flash`
- Else if `geminiKey` present → POST directly to `generativelanguage.googleapis.com`
- Else → throw `"No AI key configured. Add one in Settings."`

Both functions return **parsed JSON** — prompts instruct the model to return only JSON, no prose.

---

## 3. Context Builders

### `src/lib/aiContext.ts` (new file)

Utility functions that gather and serialize the data needed for prompts. Keeps prompt construction cleanly separated from the AI client.

#### 3a. `buildWorkoutSuggestionContext()`

```typescript
export async function buildWorkoutSuggestionContext(): Promise<WorkoutSuggestionContext>
```

Gathers:

| Data | Source | Purpose |
|------|--------|---------|
| All exercises | `getAllExercises()` | Model knows what's available |
| All workouts (names + exerciseIds) | `getAllWorkouts()` | Understand user's training splits |
| Last 28 days of DayLogs | `getAllDayLogs()` filtered | Recency of each exercise |
| Last 28 days of QuickLogs | `getAllQuickLogs()` filtered | Single-exercise recency |
| `useMuscleFatigue` output | hook result | Pre-computed fatigue per muscle |
| Day of week | `new Date()` | Context for Push/Pull/Leg patterns |

Serialised as a compact JSON object (no full set details — just exercise names, dates performed, muscle groups). Token budget matters for free models.

**Compute "last performed" per exercise** from the logs — key signal for the AI.

**Compute "muscles not hit in >14 days"** — wildcard candidate pool.

#### 3b. `buildOrderOptimizationContext()`

```typescript
export async function buildOrderOptimizationContext(
  exercises: Exercise[],        // only those with 0 sets
  fatigueData: FatigueResult
): Promise<OrderOptimizationContext>
```

Gathers:
- Each exercise's muscle groups and whether it's compound/isolation (can infer: if it has 3+ muscle groups it's compound)
- Current fatigue levels per muscle from `useMuscleFatigue`
- Simple list — no log history needed, this is a one-shot ordering call

---

## 4. Prompt Engineering

### Feature 1 — Workout Suggester

**System prompt:**
```
You are a personal trainer AI embedded in a gym tracking app.
You receive the user's exercise library, their saved workout splits, and their recent training history.
Suggest a workout session of 5-6 exercises for today.

Rules:
- Prioritise muscles that have had the most rest since last trained
- If a muscle group has not been trained in >14 days, include at least one exercise for it as a "wildcard"
- Do not repeat muscle groups excessively (avoid training the same primary muscle with >2 exercises unless it's a dedicated day)
- Respect the user's existing workout splits as hints for today's intent — if the user's recent logs lean toward a push/pull/legs pattern, follow it
- Prefer exercises the user has done before; only suggest new ones if the muscle hasn't been hit in a while
- Return ONLY valid JSON. No prose. No markdown code fences. No explanation.

Return format:
{
  "reasoning": "One sentence summary of why this selection",
  "exercises": [
    { "exerciseId": "...", "note": "optional short note e.g. 'not done in 3 weeks'" },
    ...
  ]
}
```

**User message** (compact, serialised from context builder):
```
Today: Wednesday 25 March 2026

Your exercise library:
[{ "id": "...", "name": "Bench Press", "primaryMuscles": ["Chest"], "secondaryMuscles": ["Front Delts","Triceps"] }, ...]

Your workout presets:
[{ "name": "Push Day", "exercises": ["Bench Press","Overhead Press","Lateral Raises","Tricep Pushdown","Cable Fly"] }, ...]

Recent training (last 28 days):
[{ "date": "2026-03-24", "workoutName": "Pull Day", "exercises": ["Barbell Row","Lat Pulldown","Face Pulls","Bicep Curls"] }, ...]

Days since each muscle was last trained:
{ "Chest": 4, "Front Delts": 4, "Lats": 1, "Biceps": 1, "Quads": 8, "Hamstrings": 8, "Glutes": 8, "Calves": 12, "Rear Delts": 3, "Core": 6 }

Muscles not trained in >14 days (wildcard candidates): ["Hip Flexors", "Adductors"]
```

### Feature 2 — Order Optimizer

**System prompt:**
```
You are a personal trainer AI. Reorder a list of exercises into the optimal training sequence.

Ordering principles (in priority):
1. Compound multi-joint movements before isolation
2. Avoid pre-fatiguing synergists (e.g. don't do tricep isolation before chest press)
3. If all exercises target the same muscle group, order heaviest/most demanding first
4. Alternate push/pull patterns when possible to allow partial recovery
5. Core and stabiliser work last (unless warming up)

Return ONLY valid JSON — an array of exercise IDs in the recommended order.
If the current order is already optimal, return it unchanged.
No prose. No explanation outside the JSON.

Return format: ["exerciseId1", "exerciseId2", ...]
```

**User message:**
```
Exercises to order:
[
  { "id": "...", "name": "Lateral Raises", "primaryMuscles": ["Side Delts"], "secondaryMuscles": [], "isCompound": false },
  { "id": "...", "name": "Overhead Press", "primaryMuscles": ["Front Delts"], "secondaryMuscles": ["Triceps","Side Delts"], "isCompound": true },
  { "id": "...", "name": "Tricep Pushdown", "primaryMuscles": ["Triceps"], "secondaryMuscles": [], "isCompound": false },
  { "id": "...", "name": "Cable Fly", "primaryMuscles": ["Chest"], "secondaryMuscles": ["Front Delts"], "isCompound": false },
  { "id": "...", "name": "Bench Press", "primaryMuscles": ["Chest"], "secondaryMuscles": ["Front Delts","Triceps"], "isCompound": true }
]

Current muscle fatigue context:
{ "Chest": "moderate", "Front Delts": "moderate", "Triceps": "low", "Side Delts": "low" }
```

---

## 5. UI — WorkoutSelector.tsx

### Button placement

Add two small buttons immediately below the `"Your Workouts"` section title, right-aligned in a row:

```
Your Workouts              [✦ Suggest]  [⟳ Optimize]
```

Wait — `Optimize` applies to an active session, so it belongs in `ActiveWorkout`. Only **Suggest** goes in `WorkoutSelector`.

Revised layout:

```
Your Workouts                       [✦ Suggest workout]
┌──────────┐ ┌──────────┐ ┌──────┐ ┌──────┐
│ Push Day │ │ Pull Day │ │ Legs │ │ Core │
└──────────┘ └──────────┘ └──────┘ └──────┘
```

The button is small (`btn-sm`), ghost style, with a sparkle icon (⟡ or Sparkles SVG). Disabled + tooltip if no API key.

### State additions

```typescript
const [isSuggesting, setIsSuggesting] = useState(false)
const [suggestError, setSuggestError] = useState<string | null>(null)
const [suggestion, setSuggestion] = useState<SuggestedExercise[] | null>(null)
```

### Suggestion result UI

After clicking, a card appears below the grid (before Quick Log):

```
┌─────────────────────────────────────────────┐
│  ✦ AI Suggestion          [×]               │
│  "Push day - chest and triceps need work"   │
│                                             │
│  • Bench Press          (Chest — 4d rest)   │
│  • Overhead Press       (Delts — 4d rest)   │
│  • Cable Fly            (Chest — isolation) │
│  • Tricep Pushdown      (Triceps)           │
│  • Lateral Raises       (Side Delts)        │
│  • Hip Flexor Stretch   ★ wildcard          │
│                                             │
│  [Start this workout]                       │
└─────────────────────────────────────────────┘
```

"Start this workout" calls `startSession()` with a custom name and pre-loads the suggested `exerciseIds` into the session via `addExercise()` for each.

### No API key state

If `!aiKey`, button shows tooltip: _"Add an AI key in Settings to use this feature"_ and is visually disabled (opacity 0.5, cursor not-allowed).

---

## 6. UI — ActiveWorkout.tsx

### Optimize Order button

Small ghost button in the exercise list header area. Only visible when:
- There are ≥ 2 exercises with **zero sets logged** (no point optimising a single exercise, and no point reordering already-started ones)

```
Exercises                           [⟳ Optimize order]
```

The button is hidden once all exercises have at least one set.

### Behaviour

1. Collect all exercises with `sets.length === 0`
2. Call `optimizeExerciseOrder()` with those exercises + fatigue context
3. Reorder the session's exercise list — exercises with sets stay at their current positions (at the top if they were first), the zero-set ones are reordered after them
4. Update `ActiveWorkoutContext` — requires a new `reorderExercises(newOrder: string[])` action

### State additions

```typescript
const [isOptimizing, setIsOptimizing] = useState(false)
const [optimizeError, setOptimizeError] = useState<string | null>(null)
```

Brief toast/inline message: `"Order updated"` or error message. No persistent card — the reorder is the UI feedback.

---

## 7. ActiveWorkoutContext — `reorderExercises` action

The context needs one new action:

```typescript
reorderExercises: (orderedIds: string[]) => void
```

Logic: given an array of `instanceId`s (or `exerciseId`s for the unstarted subset), splice them into the session exercise list in the new order while preserving already-started exercises at their current relative positions.

Implementation:
```
started = exercises with sets.length > 0  (keep position)
unstarted = exercises with sets.length === 0 (reorder per orderedIds)
new list = [...started, ...orderedIds.map(id => find in unstarted)]
```

---

## 8. File Changelist

| File | Change |
|------|--------|
| `src/types/index.ts` | Add `aiOpenRouterKey?` and `aiGeminiKey?` to `AppSettings` |
| `src/lib/ai.ts` | **New** — AI client (Gemini + OpenRouter dual provider) |
| `src/lib/aiContext.ts` | **New** — Context builders for both features |
| `src/pages/Settings.tsx` | Add AI keys section |
| `src/pages/log/WorkoutSelector.tsx` | Add Suggest button + suggestion card |
| `src/pages/log/ActiveWorkout.tsx` | Add Optimize Order button |
| `src/context/ActiveWorkoutContext.tsx` | Add `reorderExercises` action |

---

## 9. Data Flow Diagram

```
Settings.tsx
  └─ saves aiOpenRouterKey / aiGeminiKey → AppSettings (IndexedDB)

WorkoutSelector.tsx
  ├─ [Suggest workout] clicked
  ├─ buildWorkoutSuggestionContext()
  │    ├─ getAllExercises()      (IndexedDB)
  │    ├─ getAllWorkouts()       (IndexedDB)
  │    ├─ getDayLogs(last 28d)  (IndexedDB)
  │    └─ getQuickLogs(last 28d)(IndexedDB)
  ├─ suggestWorkout(keys, context) → src/lib/ai.ts
  │    └─ fetch → OpenRouter / Gemini API
  └─ render SuggestionCard
       └─ [Start this workout] → startSession() + addExercise() × N

ActiveWorkout.tsx
  ├─ [Optimize order] clicked
  ├─ collect unstarted exercises from session
  ├─ buildOrderOptimizationContext(exercises, fatigueData)
  ├─ optimizeExerciseOrder(keys, context) → src/lib/ai.ts
  │    └─ fetch → OpenRouter / Gemini API
  └─ reorderExercises(newOrder) → ActiveWorkoutContext
```

---

## 10. Edge Cases & Guardrails

| Scenario | Handling |
|----------|----------|
| No API key configured | Button disabled + tooltip |
| API returns malformed JSON | Catch parse error → show error message, retry not attempted |
| API rate limit (free tier) | Show error: "AI unavailable — free tier limit reached. Try again later." |
| No exercises in library | Suggest button hidden (nothing to suggest from) |
| All session exercises already have sets | Optimize button hidden |
| Suggested exercise ID no longer exists in library | Filter out before displaying; show warning if >1 missing |
| User dismisses suggestion | `setSuggestion(null)` — no side effects |
| Network offline (PWA) | Catch fetch error → show offline message |

---

## 11. Token Budget Estimation

The free `google/gemini-2.5-flash` tier is generous but finite. Keeping prompts lean:

- Exercise library serialisation: ~50 chars per exercise × 150 exercises = ~7,500 chars ≈ ~2,000 tokens
- 28-day log history: only exercise names + dates, no set details ≈ ~1,500 tokens
- System prompt ≈ ~300 tokens
- **Total: ~4,000 tokens per Suggest call** — well within free limits

Order optimization is much lighter: just the current workout exercises (max ~20) ≈ ~500 tokens total.

---

## 12. Implementation Order

1. `src/types/index.ts` — add fields to `AppSettings`
2. `src/lib/ai.ts` — AI client (can test in isolation)
3. `src/lib/aiContext.ts` — context builders
4. `src/pages/Settings.tsx` — API key UI (can test key storage)
5. `src/context/ActiveWorkoutContext.tsx` — add `reorderExercises`
6. `src/pages/log/WorkoutSelector.tsx` — Suggest button + card
7. `src/pages/log/ActiveWorkout.tsx` — Optimize button

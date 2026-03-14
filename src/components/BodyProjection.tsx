import { useState, useRef, useEffect } from 'react'
import type { MuscleGroup } from '../types'

// ── Asset imports ─────────────────────────────────────────────────────────────
// import.meta.glob paths are relative to this file (src/components/)
const b0Raw = import.meta.glob('../../b0/*.png', { query: '?url', import: 'default', eager: true }) as Record<string, string>
const b1Raw = import.meta.glob('../../b1/*.png', { query: '?url', import: 'default', eager: true }) as Record<string, string>
const b2Raw = import.meta.glob('../../b2/*.png', { query: '?url', import: 'default', eager: true }) as Record<string, string>
const b3Raw = import.meta.glob('../../b3/*.png', { query: '?url', import: 'default', eager: true }) as Record<string, string>

// ── Muscle name parsing ───────────────────────────────────────────────────────
// Asset keys look like '../../b0/b0-chest.png' → muscle name = 'chest'
// Double-dash names like 'b0--fill.png' → '-fill' (starts with '-', excluded)
function parseMuscle(key: string): string {
  const file = key.split('/').pop()!
  return file.replace(/^b\d+/, '').replace(/^-/, '').replace(/\.png$/, '')
}

// Generic aggregate groupings to exclude per spec
const EXCLUDED = new Set(['arms', 'back', 'mid', 'upper', 'legs'])

interface MuscleEntry { name: string; url: string }

function buildMuscleList(assets: Record<string, string>): MuscleEntry[] {
  return Object.entries(assets).flatMap(([key, url]) => {
    const name = parseMuscle(key)
    // Skip base images (--fill, --full, --outline, --fulloutline) and excluded aggregates
    if (name.startsWith('-') || name === '' || EXCLUDED.has(name)) return []
    return [{ name, url }]
  })
}

function getBaseUrls(assets: Record<string, string>): { fill: string; outline: string } {
  const keys = Object.keys(assets)
  const fillKey = keys.find((k) => k.includes('--fill'))
  const outlineKey =
    keys.find((k) => k.includes('--fulloutline')) ??
    keys.find((k) => k.includes('--outline')) ??
    keys.find((k) => k.includes('--full'))
  return {
    fill: fillKey ? assets[fillKey] : '',
    outline: outlineKey ? assets[outlineKey] : '',
  }
}

// ── Muscle → MuscleGroup mapping ─────────────────────────────────────────────
const MUSCLE_TO_GROUP: Partial<Record<string, MuscleGroup>> = {
  add:        'Adductors',
  biceps:     'Biceps',
  calves:     'Calves',
  chest:      'Chest',
  core:       'Core',
  forearms:   'Forearms',
  frontdelts: 'Front Delts',
  glutes:     'Glutes',
  ham:        'Hamstrings',
  hip:        'Hip Flexors',
  lats:       'Lats',
  lowerback:  'Lower Back',
  obliques:   'Obliques',
  quads:      'Quads',
  reardelts:  'Rear Delts',
  backdelts:  'Rear Delts',
  sidedelts:  'Side Delts',
  traps:      'Traps',
  triceps:    'Triceps',
}

// ── Angle definitions ─────────────────────────────────────────────────────────
// 6 steps: 0°, 60°, 120°, 180°, 240° (mirror of 120°), 300° (mirror of 60°)
type AngleDef = { assets: Record<string, string>; mirror: boolean; label: string }

const ANGLE_DEFS: AngleDef[] = [
  { assets: b0Raw, mirror: false, label: 'Front' },
  { assets: b1Raw, mirror: false, label: '60°' },
  { assets: b2Raw, mirror: false, label: '120°' },
  { assets: b3Raw, mirror: false, label: 'Back' },
  { assets: b2Raw, mirror: true,  label: '240°' },
  { assets: b1Raw, mirror: true,  label: '300°' },
]

// ── Stage 3: L/R interception ─────────────────────────────────────────────────
// When scaleX(-1) is active the left side of the avatar renders on the right.
// If/when separate L/R MuscleGroup entries are added to the data model,
// insert the swap logic here so the correct side highlights.
function interceptMirror(
  opacities: Partial<Record<MuscleGroup, number>>,
  _isMirrored: boolean,
): Partial<Record<MuscleGroup, number>> {
  // No separate L/R groups in current schema → identity pass-through.
  // Replace with swap logic when L/R muscle groups are introduced.
  return opacities
}

// px of horizontal drag to advance one rotation step
const DRAG_STEP_PX = 48

// ── Component ─────────────────────────────────────────────────────────────────
interface Props {
  // null while data is still loading — prevents untrained ghost flicker on mount
  muscleOpacity: Partial<Record<MuscleGroup, number>> | null
  showGhost?: boolean
  ignoredMuscles?: MuscleGroup[]
  /** Automatically cycle through angles — for decorative non-interactive use */
  autoSpin?: boolean
  /** Interval in ms between angle steps when autoSpin is true (default 650) */
  spinInterval?: number
  /** When false, disables drag interaction (default true) */
  interactive?: boolean
}

export default function BodyProjection({
  muscleOpacity,
  showGhost = true,
  ignoredMuscles = [],
  autoSpin = false,
  spinInterval = 650,
  interactive = true,
}: Props) {
  const [angleIdx, setAngleIdx] = useState(0)
  const drag = useRef({ active: false, startX: 0, startAngle: 0 })

  useEffect(() => {
    if (!autoSpin) return
    const id = setInterval(() => setAngleIdx((prev) => (prev + 1) % 6), spinInterval)
    return () => clearInterval(id)
  }, [autoSpin, spinInterval])

  const { assets, mirror } = ANGLE_DEFS[angleIdx]
  const loaded = muscleOpacity !== null
  const effectiveOpacity = interceptMirror(muscleOpacity ?? {}, mirror)
  const muscles = buildMuscleList(assets)
  const { fill, outline } = getBaseUrls(assets)

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    drag.current = { active: true, startX: e.clientX, startAngle: angleIdx }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current.active) return
    const delta = e.clientX - drag.current.startX
    const steps = Math.round(-delta / DRAG_STEP_PX)
    const next = ((drag.current.startAngle + steps) % 6 + 6) % 6
    setAngleIdx(next)
  }

  function onPointerUp() {
    drag.current.active = false
  }

  return (
    <div
      className="body-projection"
      onPointerDown={interactive ? onPointerDown : undefined}
      onPointerMove={interactive ? onPointerMove : undefined}
      onPointerUp={interactive ? onPointerUp : undefined}
      onPointerCancel={interactive ? onPointerUp : undefined}
      style={{
        transform: mirror ? 'scaleX(-1)' : undefined,
        cursor: interactive ? 'pointer' : 'default',
        pointerEvents: interactive ? undefined : 'none',
      }}
    >
      {/* Base silhouette fill — theme-coloured via CSS var */}
      {fill && (
        <div
          className="body-layer body-fill"
          style={{
            maskImage: `url(${fill})`,
            WebkitMaskImage: `url(${fill})`,
          }}
        />
      )}
      {/* Outline layer */}
      {outline && (
        <div
          className="body-layer body-outline"
          style={{
            maskImage: `url(${outline})`,
            WebkitMaskImage: `url(${outline})`,
          }}
        />
      )}
      {/* Muscle highlight layers — opacity driven by 14-day volume.
          Untrained muscles (opacity 0, data loaded) pulse in the complement hue. */}
      {muscles.map(({ name, url }) => {
        const group = MUSCLE_TO_GROUP[name]
        const opacity = group ? (effectiveOpacity[group] ?? 0) : 0
        const isIgnored = group ? ignoredMuscles.includes(group) : false
        const isGhost = loaded && opacity === 0 && showGhost && !isIgnored
        return (
          <div
            key={name}
            className={`body-layer body-muscle${isGhost ? ' body-muscle-ghost' : ''}`}
            style={{
              maskImage: `url(${url})`,
              WebkitMaskImage: `url(${url})`,
              opacity: isGhost ? undefined : opacity,
            }}
          />
        )
      })}
    </div>
  )
}

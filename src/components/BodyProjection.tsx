import { useState, useRef, useEffect } from 'react'
import type { MuscleGroup } from '../types'

// ── Asset imports ─────────────────────────────────────────────────────────────
// import.meta.glob paths are relative to this file (src/components/)
const b0Raw = import.meta.glob('../../b0/*.png', { query: '?url', import: 'default', eager: true }) as Record<string, string>
const b1Raw = import.meta.glob('../../b1/*.png', { query: '?url', import: 'default', eager: true }) as Record<string, string>
const b2Raw = import.meta.glob('../../b2/*.png', { query: '?url', import: 'default', eager: true }) as Record<string, string>
const b3Raw = import.meta.glob('../../b3/*.png', { query: '?url', import: 'default', eager: true }) as Record<string, string>

// ── Muscle name parsing ───────────────────────────────────────────────────────
function parseMuscle(key: string): string {
  const file = key.split('/').pop()!
  return file.replace(/^b\d+/, '').replace(/^-/, '').replace(/\.png$/, '')
}

const EXCLUDED = new Set(['arms', 'back', 'mid', 'upper', 'legs'])

interface MuscleEntry { name: string; url: string }

function buildMuscleList(assets: Record<string, string>): MuscleEntry[] {
  return Object.entries(assets).flatMap(([key, url]) => {
    const name = parseMuscle(key)
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
type AngleDef = { assets: Record<string, string>; mirror: boolean; label: string }

const ANGLE_DEFS: AngleDef[] = [
  { assets: b0Raw, mirror: false, label: 'Front' },
  { assets: b1Raw, mirror: false, label: '60°' },
  { assets: b2Raw, mirror: false, label: '120°' },
  { assets: b3Raw, mirror: false, label: 'Back' },
  { assets: b2Raw, mirror: true,  label: '240°' },
  { assets: b1Raw, mirror: true,  label: '300°' },
]

function interceptMirror(
  opacities: Partial<Record<MuscleGroup, number>>,
  _isMirrored: boolean,
): Partial<Record<MuscleGroup, number>> {
  return opacities
}

// Native PNG dimensions — the body layers render at exactly this size so the
// mask PNG is never upscaled. The inner div is then scaled via CSS transform,
// which uses the GPU compositor path where image-rendering: pixelated is
// reliably honoured on both Chrome and Android WebView.
const PNG_W = 86
const PNG_H = 145

const DRAG_STEP_PX = 48

// ── Component ─────────────────────────────────────────────────────────────────
interface Props {
  muscleOpacity: Partial<Record<MuscleGroup, number>> | null
  showGhost?: boolean
  ignoredMuscles?: MuscleGroup[]
  autoSpin?: boolean
  spinInterval?: number
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
  const [scale, setScale] = useState(1)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const drag = useRef({ active: false, startX: 0, startAngle: 0 })

  // Measure the container and compute the scale so the native-size inner div
  // fills it — mask-image is rendered at 1:1 with the PNG, then the GPU
  // compositor scales it up with pixelated (nearest-neighbour) interpolation.
  useEffect(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) return
    const update = () => {
      const { width, height } = wrapper.getBoundingClientRect()
      if (width > 0 && height > 0) {
        setScale(Math.min(width / PNG_W, height / PNG_H))
      }
    }
    const ro = new ResizeObserver(update)
    ro.observe(wrapper)
    update()
    return () => ro.disconnect()
  }, [])

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

  // Mirror is folded into the horizontal scale so we don't need a separate
  // scaleX(-1) wrapper that would create an extra compositing layer.
  const sx = mirror ? -scale : scale

  return (
    <div
      ref={wrapperRef}
      className="body-projection"
      onPointerDown={interactive ? onPointerDown : undefined}
      onPointerMove={interactive ? onPointerMove : undefined}
      onPointerUp={interactive ? onPointerUp : undefined}
      onPointerCancel={interactive ? onPointerUp : undefined}
      style={{
        cursor: interactive ? 'pointer' : 'default',
        pointerEvents: interactive ? undefined : 'none',
      }}
    >
      {/* Inner div rendered at native PNG size; scaled via GPU transform.
          image-rendering: pixelated tells the compositor to use nearest-
          neighbour when scaling this compositing layer — works reliably in
          both Chrome and Android WebView, unlike mask-image upscaling. */}
      <div
        style={{
          position: 'relative',
          width: PNG_W,
          height: PNG_H,
          flexShrink: 0,
          transformOrigin: 'center center',
          transform: `scaleX(${sx}) scaleY(${scale})`,
          imageRendering: 'pixelated',
        }}
      >
        {fill && (
          <div
            className="body-layer body-fill"
            style={{ maskImage: `url(${fill})`, WebkitMaskImage: `url(${fill})` }}
          />
        )}
        {outline && (
          <div
            className="body-layer body-outline"
            style={{ maskImage: `url(${outline})`, WebkitMaskImage: `url(${outline})` }}
          />
        )}
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
    </div>
  )
}

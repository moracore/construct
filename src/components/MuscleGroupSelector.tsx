import { MUSCLE_GROUPS, type MuscleGroup } from '../types'

interface Props {
  selected: MuscleGroup[]
  onChange: (groups: MuscleGroup[]) => void
  label?: string
}

export default function MuscleGroupSelector({ selected, onChange, label }: Props) {
  function toggle(group: MuscleGroup) {
    if (selected.includes(group)) {
      onChange(selected.filter((g) => g !== group))
    } else {
      onChange([...selected, group])
    }
  }

  return (
    <div className="form-group">
      {label && <label>{label}</label>}
      <div className="chip-grid">
        {MUSCLE_GROUPS.map((group) => (
          <button
            key={group}
            type="button"
            className={`chip${selected.includes(group) ? ' selected' : ''}`}
            onClick={() => toggle(group)}
          >
            {group}
          </button>
        ))}
      </div>
    </div>
  )
}

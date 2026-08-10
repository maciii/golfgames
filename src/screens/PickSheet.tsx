import type { ReactNode } from 'react'

/**
 * Vlastní list pro výběr jedné hodnoty z více možností - ne nativní `<select>`.
 *
 * Zavřená nabídka `<select>` se dá obarvit, ale rozbalený seznam kreslí
 * operační systém (na Windows/Chrome tmavým podkladem, ale s barvou
 * zvýraznění podle systému) a CSS na něj nemá dosah. `TeeSheet` řeší
 * odpaliště stejným trikem - vlastní list místo nabídky.
 */

export interface PickSheetOption {
  id: string
  label: string
  icon?: ReactNode
}

interface Props {
  title: string
  options: PickSheetOption[]
  selectedId: string
  onSelect: (id: string) => void
  onClose: () => void
}

export default function PickSheet({
  title,
  options,
  selectedId,
  onSelect,
  onClose,
}: Props) {
  return (
    <div
      className="sheet-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      {/* Klepnutí uvnitř listu ho nesmí zavřít, jinak by nešlo nic vybrat. */}
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <header className="sheet-header">
          <h2>{title}</h2>
        </header>

        <div className="pick-rows" role="radiogroup">
          {options.map((option) => {
            const selected = option.id === selectedId
            return (
              <button
                key={option.id}
                type="button"
                className={`pick-row${selected ? ' selected' : ''}`}
                onClick={() => {
                  // Klepnutí rovnou vybere a zavře - stejně jako u TeeSheet
                  // netřeba to potvrzovat druhým krokem.
                  onSelect(option.id)
                  onClose()
                }}
                aria-pressed={selected}
              >
                {option.icon}
                <span className="pick-row-label">{option.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

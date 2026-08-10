/**
 * Malé jednobarevné ikony sdílené mezi víc obrazovkami - nakreslené ručně
 * jako zbytek appky, ne textové glyfy/emoji. Ty se na různých systémech
 * vykreslují jinak (i deformovaně), protože se pro ně bere emoji nebo
 * symbolový font podle toho, co je zrovna po ruce.
 */

export function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      aria-hidden="true"
    >
      <path
        d="M12 20.3s-7.6-4.4-10.1-9C.5 7.9 2 4.6 5.5 4.1c2-.3 3.9.6 6.5 3.1 2.6-2.5 4.5-3.4 6.5-3.1 3.5.5 5 3.8 3.6 7.2-2.5 4.6-10.1 9-10.1 9z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Hvězdička oblíbeného hráče - nakreslená, ne textový znak ★, ze stejného
 *  důvodu jako HeartIcon výš. */
export function StarIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2.5l2.9 6.3 6.8.7-5.1 4.7 1.5 6.8L12 17.6l-6.1 3.4 1.5-6.8-5.1-4.7 6.8-.7z" />
    </svg>
  )
}

/**
 * Praporek na odpališti - značí volbu odpaliště jinak než jen barevným
 * kolečkem, které v seznamu hráčů splývalo s ostatními kulatými prvky.
 */
export function TeeFlagIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 21V4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M6 4l10 3.2L6 10.4z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

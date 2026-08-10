import { useId } from 'react'
import type { ReactNode } from 'react'
import type { Locale } from '../i18n'

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

/**
 * Šipka zpět - nahrazuje textové tlačítko „Zpět", které stálo osamocené
 * nad titulkem. Jako ikona vedle titulku patří na stejný řádek a je vidět,
 * že jde o navigaci, ne o další text.
 */
export function BackIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M14.5 5.5l-7 6.5 7 6.5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Šipka dolů u vlastních rozbalovacích tlačítek - nahrazuje nativní `<select>`,
 *  jehož rozbalený seznam se v různých prohlížečích nedá dostylovat. */
export function ChevronDownIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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

/**
 * Ploché vlaječky jazyků - kreslené, ne emoji 🇨🇿/🇬🇧. Ty na Windows nemají
 * v systémovém emoji fontu obrázek a appka pak místo vlaječky ukáže jen
 * dvojpísmenný kód (CZ/GB) - stejná třída chyby jako u srdíčka a hvězdičky
 * výš. Záměrně ploché, ne "vlající" 3D - má to být malá značka, ne ilustrace.
 *
 * Nový jazyk přidá novou funkci sem a řádek do `FLAGS`.
 */
function CzFlag({ clipId }: { clipId: string }) {
  return (
    <g clipPath={`url(#${clipId})`}>
      <rect width="30" height="20" fill="#fff" />
      <rect y="10" width="30" height="10" fill="#d7141a" />
      <path d="M0 0L15 10L0 20Z" fill="#11457e" />
    </g>
  )
}

function GbFlag({ clipId }: { clipId: string }) {
  return (
    <g clipPath={`url(#${clipId})`}>
      <rect width="30" height="20" fill="#00247d" />
      <path d="M0 0L30 20M30 0L0 20" stroke="#fff" strokeWidth="4" />
      <path d="M0 0L30 20M30 0L0 20" stroke="#cf142b" strokeWidth="2" />
      <path d="M15 0V20M0 10H30" stroke="#fff" strokeWidth="6" />
      <path d="M15 0V20M0 10H30" stroke="#cf142b" strokeWidth="3.2" />
    </g>
  )
}

const FLAGS: Record<Locale, (props: { clipId: string }) => ReactNode> = {
  cs: CzFlag,
  en: GbFlag,
}

export function FlagIcon({ locale }: { locale: Locale }) {
  const clipId = useId()
  const Flag = FLAGS[locale]
  return (
    <svg width="22" height="16" viewBox="0 0 30 20" aria-hidden="true">
      <clipPath id={clipId}>
        <rect width="30" height="20" rx="3" />
      </clipPath>
      <Flag clipId={clipId} />
    </svg>
  )
}

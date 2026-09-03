import type { ReactNode } from 'react'
import { useT } from '../i18n'
import type { MessageKey } from '../i18n'
import type { Theme } from '../theme'
import { THEMES, useTheme } from '../theme'
import { APP_VERSION } from '../version'

interface Props {
  onClose: () => void
  onNewRound: () => void
  onBrowseCourses: () => void
  onOpenPlayers: () => void
  onOpenArchive: () => void
  onOpenBackup: () => void
  onOpenAccount: () => void
  courseCount: number
  playerCount: number
  archiveCount: number
}

/** Ikony jsou jen orientační - malé, jednobarevné, kreslené ručně jako zbytek appky. */
function NewRoundIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 4l11 6-11 6z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CoursesIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2c-3.9 0-7 3.1-7 7 0 5 7 13 7 13s7-8 7-13c0-3.9-3.1-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z" />
    </svg>
  )
}

function PlayersIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <g
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="9" cy="8" r="3" />
        <circle cx="17" cy="9" r="2.4" />
        <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
        <path d="M14 14.3c2.6.3 4.6 2.4 5 5.7" />
      </g>
    </svg>
  )
}

function ArchiveIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <g
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 3" />
      </g>
    </svg>
  )
}

function BackupIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <g
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M7 18a4.5 4.5 0 0 1-1-8.9A5.5 5.5 0 0 1 16.9 8 4 4 0 0 1 17 16" />
        <path d="M12 12v7" />
        <path d="M9.5 16.5L12 19l2.5-2.5" />
      </g>
    </svg>
  )
}

function AccountIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <g
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="8" r="3.4" />
        <path d="M5 20c0-4 3.1-6.5 7-6.5s7 2.5 7 6.5" />
      </g>
    </svg>
  )
}

/** Vzhled se vybírá podle obrázku dřív než podle slova - měsíc a slunce. */
function DarkThemeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function LightThemeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <g
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4" />
      </g>
    </svg>
  )
}

const THEME_LABEL: Record<Theme, MessageKey> = {
  dark: 'menu.themeDark',
  light: 'menu.themeLight',
}

interface ItemProps {
  icon: ReactNode
  label: string
  count?: string
  onClick: () => void
}

function MenuItem({ icon, label, count, onClick }: ItemProps) {
  return (
    <button type="button" className="menu-drawer-item" onClick={onClick}>
      <span className="menu-drawer-icon">{icon}</span>
      <span className="menu-drawer-label">{label}</span>
      {count && <span className="menu-drawer-count">{count}</span>}
    </button>
  )
}

/**
 * Hlavní menu appky - vše, co se dělá zřídka a záměrně.
 *
 * Výsuvný panel zleva, ne list zespodu jako `TeeSheet`/`BonusSheet` - menu je
 * navigace k dalším místům appky, ne volba k jedné věci na obrazovce. Není
 * napojené na History API - zpět/swipe ho zavírá stejně jako klepnutí mimo
 * něj nebo na zavírací křížek, žádnou vlastní historii appce nepřidává.
 */
export default function MenuSheet({
  onClose,
  onNewRound,
  onBrowseCourses,
  onOpenPlayers,
  onOpenArchive,
  onOpenBackup,
  onOpenAccount,
  courseCount,
  playerCount,
  archiveCount,
}: Props) {
  const t = useT()
  const { theme, setTheme } = useTheme()

  function go(action: () => void) {
    onClose()
    action()
  }

  return (
    <div
      className="menu-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={t('menu.title')}
      onClick={onClose}
    >
      {/* Klepnutí uvnitř panelu ho nesmí zavřít, jinak by nešlo nic vybrat. */}
      <div className="menu-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="menu-drawer-head">
          <h2>{t('menu.title')}</h2>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label={t('common.close')}
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>

        <nav className="menu-drawer-list">
          <MenuItem
            icon={<NewRoundIcon />}
            label={t('home.newRound')}
            onClick={() => go(onNewRound)}
          />
          <MenuItem
            icon={<CoursesIcon />}
            label={t('menu.courses')}
            {...(courseCount > 0
              ? { count: t('menu.coursesCount', { count: courseCount }) }
              : {})}
            onClick={() => go(onBrowseCourses)}
          />
          <MenuItem
            icon={<PlayersIcon />}
            label={t('menu.players')}
            {...(playerCount > 0
              ? { count: t('menu.playersCount', { count: playerCount }) }
              : {})}
            onClick={() => go(onOpenPlayers)}
          />
          <MenuItem
            icon={<ArchiveIcon />}
            label={t('menu.archive')}
            {...(archiveCount > 0
              ? { count: t('menu.archiveCount', { count: archiveCount }) }
              : {})}
            onClick={() => go(onOpenArchive)}
          />

          <div className="menu-drawer-divider" />

          <MenuItem
            icon={<BackupIcon />}
            label={t('menu.backup')}
            onClick={() => go(onOpenBackup)}
          />
          <MenuItem
            icon={<AccountIcon />}
            label={t('menu.account')}
            onClick={() => go(onOpenAccount)}
          />
        </nav>

        <div className="menu-drawer-foot">
          <div className="menu-drawer-setting">
            <span className="menu-drawer-setting-label" id="menu-appearance-label">
              {t('menu.appearance')}
            </span>
            <div
              className="segmented"
              role="group"
              aria-labelledby="menu-appearance-label"
            >
              {THEMES.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`segment${option === theme ? ' selected' : ''}`}
                  onClick={() => setTheme(option)}
                  aria-pressed={option === theme}
                >
                  {option === 'dark' ? <DarkThemeIcon /> : <LightThemeIcon />}
                  <span>{t(THEME_LABEL[option])}</span>
                </button>
              ))}
            </div>
          </div>

          <p className="menu-drawer-version">
            {t('common.version', { version: APP_VERSION })}
          </p>
        </div>
      </div>
    </div>
  )
}

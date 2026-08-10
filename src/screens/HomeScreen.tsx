import { useMemo, useState } from 'react'
import type { Course } from '../courses/types'
import type { Round } from '../types'
import { formatRoundDate } from '../types'
import { getGame } from '../games'
import { formatHandicapIndex } from '../handicap'
import type { RosterEntry } from '../storage'
import { loadCourses, loadFavoriteCourseIds, loadRoster } from '../storage'
import { usePwaInstall } from '../pwa'
import { LOCALES, LOCALE_LABEL, useLocale } from '../i18n'
import type { MessageKey } from '../i18n'
import { FlagIcon, HeartIcon } from './icons'
import MenuSheet from './MenuSheet'

/**
 * Wordmark na Home mísro textového „Golf Games" - jméno appky se zvažuje
 * (viz docs/decisions.md), tohle je zatím jen kosmetická značka na jednom
 * místě, snadno vratná. Dva překrývající se kruhy narážejí na „-some" ve
 * jméně (twosome, foursome - běžná golfová slova pro počet hráčů ve
 * skupině), „Fair" pak na fairway i poctivou hru.
 */
function BrandMark() {
  return (
    <span className="brand-mark">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="9" cy="9" r="6" fill="currentColor" opacity="0.35" />
        <circle cx="15" cy="15" r="6" fill="currentColor" />
      </svg>
      <span className="brand-mark-text">
        Fair<em>some</em>
      </span>
    </span>
  )
}

interface Props {
  archive: Round[]
  onNewRound: () => void
  onOpenRound: (roundId: string) => void
  onPickFavoriteCourse: (course: Course) => void
  onOpenArchive: () => void
  onOpenPlayers: () => void
  onBrowseCourses: () => void
  onOpenBackup: () => void
  onOpenAccount: () => void
}

/**
 * Domovská obrazovka - skutečný vstupní bod appky.
 *
 * Dělí obrazovky podle toho, jak často se používají: co se dělá skoro
 * pokaždé (nová hra, poslední výsledek, oblíbení) je přímo tady; co se dělá
 * zřídka a záměrně (procházet hřiště, spravovat hráče, záloha, účet) je za
 * menu. Renderuje se jen když není rozehrané kolo - `viewForRound()` v
 * App.tsx vede rozehrané kolo rovnou do zápisu skóre.
 */
export default function HomeScreen({
  archive,
  onNewRound,
  onOpenRound,
  onPickFavoriteCourse,
  onOpenArchive,
  onOpenPlayers,
  onBrowseCourses,
  onOpenBackup,
  onOpenAccount,
}: Props) {
  const { t, locale, setLocale } = useLocale()
  const { canInstall, install, isIOS, isMobile, isStandalone } = usePwaInstall()
  const [installHelp, setInstallHelp] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [roster] = useState<RosterEntry[]>(() => loadRoster())
  const [courses] = useState<Course[]>(() => loadCourses())
  const [favoriteCourseIds] = useState<string[]>(() => loadFavoriteCourseIds())

  const showInstall = !isStandalone && (canInstall || isIOS || isMobile)
  const lastRound = archive[0]

  const favoritePlayers = useMemo(
    () => roster.filter((entry) => entry.favorite),
    [roster],
  )
  const favoriteCourses = useMemo(() => {
    const favoriteIds = new Set(favoriteCourseIds)
    return courses.filter((course) => favoriteIds.has(course.id))
  }, [courses, favoriteCourseIds])

  async function installApp() {
    const result = await install()
    if (result === 'unavailable') setInstallHelp(true)
  }

  function lastRoundLine(round: Round): string {
    const sections = getGame(round.gameId).computeStandings(round)
    const rows = sections[0]?.rows ?? []
    const winners = rows.filter((r) => r.position === 1 && r.holesPlayed > 0)
    if (winners.length === 0) return t('archive.noResult')
    return winners.map((w) => w.name).join(', ')
  }

  return (
    <div className="screen">
      <header className="app-header">
        <div className="setup-header-row">
          <button
            type="button"
            className="icon-button"
            onClick={() => setMenuOpen(true)}
            aria-label={t('home.openMenu')}
          >
            <span aria-hidden="true">☰</span>
          </button>
          <h1>
            <BrandMark />
          </h1>
          <div className="language-switcher" aria-label={t('setup.language')}>
            {LOCALES.map((code) => (
              <button
                key={code}
                type="button"
                className={`language-button${code === locale ? ' selected' : ''}`}
                onClick={() => setLocale(code)}
                aria-label={LOCALE_LABEL[code]}
                aria-pressed={code === locale}
                title={LOCALE_LABEL[code]}
              >
                <FlagIcon locale={code} />
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="content">
        <button
          type="button"
          className="primary-button home-new-round"
          onClick={onNewRound}
        >
          {t('home.newRound')}
        </button>

        {favoriteCourses.length > 0 && (
          <section className="card home-section">
            <h2>{t('home.favoriteCourses')}</h2>
            <div className="favorite-course-row">
              {favoriteCourses.map((course) => (
                <button
                  key={course.id}
                  type="button"
                  className="favorite-course-chip"
                  onClick={() => onPickFavoriteCourse(course)}
                >
                  <HeartIcon filled />
                  <span className="favorite-course-chip-name">{course.name}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {favoritePlayers.length > 0 && (
          <section className="card home-section">
            <h2>{t('home.favoritePlayers')}</h2>
            <div className="chip-row">
              {favoritePlayers.map((entry) => (
                <span key={entry.id} className="chip">
                  {entry.name}
                  {typeof entry.handicapIndex === 'number' && (
                    <span className="chip-meta">
                      {' '}
                      · {formatHandicapIndex(entry.handicapIndex)}
                    </span>
                  )}
                </span>
              ))}
            </div>
          </section>
        )}

        {lastRound && (
          <section className="card home-section">
            <div className="home-section-head">
              <h2>{t('home.lastRound')}</h2>
              <button type="button" className="link-button" onClick={onOpenArchive}>
                {t('home.seeArchive')}
              </button>
            </div>
            <button
              type="button"
              className="home-card"
              onClick={() => onOpenRound(lastRound.id)}
            >
              <span className="home-card-title">
                {t(`games.${lastRound.gameId}.name` as MessageKey)}
                {' · '}
                {formatRoundDate(lastRound)}
              </span>
              <span className="home-card-meta">{lastRoundLine(lastRound)}</span>
            </button>
          </section>
        )}

        {showInstall && (
          <section className="pwa-install">
            <button
              type="button"
              className="link-button pwa-install-button"
              onClick={() => void installApp()}
            >
              {t('pwa.installApp')}
            </button>
            <p className="hint pwa-install-benefit">{t('pwa.installAppBenefit')}</p>
            {installHelp && (
              <div className="pwa-install-help" role="status">
                <strong>
                  {t(isIOS ? 'pwa.installIosTitle' : 'pwa.installBrowserTitle')}
                </strong>
                <p>{t(isIOS ? 'pwa.installIosHint' : 'pwa.installBrowserHint')}</p>
                <button
                  type="button"
                  className="link-button"
                  onClick={() => setInstallHelp(false)}
                >
                  {t('pwa.installClose')}
                </button>
              </div>
            )}
          </section>
        )}
      </main>

      {menuOpen && (
        <MenuSheet
          onClose={() => setMenuOpen(false)}
          onNewRound={onNewRound}
          onBrowseCourses={onBrowseCourses}
          onOpenPlayers={onOpenPlayers}
          onOpenArchive={onOpenArchive}
          onOpenBackup={onOpenBackup}
          onOpenAccount={onOpenAccount}
          courseCount={courses.length}
          playerCount={roster.length}
          archiveCount={archive.length}
        />
      )}
    </div>
  )
}

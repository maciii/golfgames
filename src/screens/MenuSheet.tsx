import { useT } from '../i18n'

interface Props {
  onClose: () => void
  onNewRound: () => void
  onBrowseCourses: () => void
  onOpenPlayers: () => void
  onOpenArchive: () => void
  onOpenBackup: () => void
  onOpenAccount: () => void
}

/**
 * Hlavní menu appky - vše, co se dělá zřídka a záměrně.
 *
 * Sdílí vzhled s ostatními listy (`TeeSheet`, `BonusSheet`): zatemněné pozadí
 * appku pod ním zavře, klepnutí do samotného listu se nešíří dál. Menu není
 * napojené na History API - žádná jiná modální nabídka v appce taky není a
 * appku samotnou to nijak neopouští.
 */
export default function MenuSheet({
  onClose,
  onNewRound,
  onBrowseCourses,
  onOpenPlayers,
  onOpenArchive,
  onOpenBackup,
  onOpenAccount,
}: Props) {
  const t = useT()

  function go(action: () => void) {
    onClose()
    action()
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet menu-sheet" onClick={(e) => e.stopPropagation()}>
        <header className="sheet-header">
          <h2>{t('menu.title')}</h2>
        </header>

        <nav className="menu-list">
          <button type="button" className="menu-item" onClick={() => go(onNewRound)}>
            {t('home.newRound')}
          </button>
          <button type="button" className="menu-item" onClick={() => go(onBrowseCourses)}>
            {t('menu.courses')}
          </button>
          <button type="button" className="menu-item" onClick={() => go(onOpenPlayers)}>
            {t('menu.players')}
          </button>
          <button type="button" className="menu-item" onClick={() => go(onOpenArchive)}>
            {t('menu.archive')}
          </button>
          <button type="button" className="menu-item" onClick={() => go(onOpenBackup)}>
            {t('menu.backup')}
          </button>
          <button type="button" className="menu-item" onClick={() => go(onOpenAccount)}>
            {t('menu.account')}
          </button>
        </nav>

        <button type="button" className="link-button" onClick={onClose}>
          {t('common.close')}
        </button>
      </div>
    </div>
  )
}

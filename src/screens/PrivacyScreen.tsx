import { useT } from '../i18n'
import { BackIcon } from './icons'

/** Kontakt správce údajů. Změna e-mailu je jen tady. */
const CONTACT = 'martin@kubecka.cz'

/** Odstavce zásad v pořadí, v jakém se zobrazují. */
const SECTIONS = [
  ['privacy.offlineTitle', 'privacy.offline'],
  ['privacy.cloudTitle', 'privacy.cloud'],
  ['privacy.accessTitle', 'privacy.access'],
  ['privacy.retentionTitle', 'privacy.retention'],
  ['privacy.rightsTitle', 'privacy.rights'],
] as const

/**
 * Zásady zpracování osobních údajů.
 *
 * Nutné od chvíle, kdy aplikace umí ukládat data k účtu. Text je záměrně
 * krátký a konkrétní - popisuje přesně to, co aplikace dělá, nic navíc.
 *
 * Stejný dokument je i jako statická stránka `public/soukromi.html`, protože
 * Google při nastavení přihlášení vyžaduje veřejnou adresu. Když se mění text,
 * mění se na obou místech.
 */
export default function PrivacyScreen({ onBack }: { onBack: () => void }) {
  const t = useT()

  return (
    <div className="screen">
      <header className="app-header">
        <div className="screen-header-row">
          <button
            type="button"
            className="icon-button"
            onClick={onBack}
            aria-label={t('common.back')}
          >
            <BackIcon />
          </button>
          <h1>{t('privacy.title')}</h1>
        </div>
        <p className="subtitle">Golf Games</p>
      </header>

      <main className="content prose">
        {SECTIONS.map(([title, body]) => (
          <section key={title} className="section">
            <h2 className="section-title">{t(title)}</h2>
            <p className="hint">{t(body)}</p>
            {body === 'privacy.cloud' && (
              <ul className="bullet-list">
                <li>{t('privacy.itemRounds')}</li>
                <li>{t('privacy.itemRoster')}</li>
                <li>{t('privacy.itemSettings')}</li>
                <li>{t('privacy.itemAccount')}</li>
              </ul>
            )}
          </section>
        ))}

        <section className="section">
          <h2 className="section-title">{t('privacy.contactTitle')}</h2>
          <p className="hint">
            {t('privacy.contact')} <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
          </p>
          <p className="hint">
            {t('privacy.publicVersion')}{' '}
            <a href="/soukromi.html">golf.kubecka.cz/soukromi.html</a>
          </p>
        </section>
      </main>
    </div>
  )
}

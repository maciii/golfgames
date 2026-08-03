import { APP_VERSION } from '../version'

/** Kontakt správce údajů. Změna e-mailu je jen tady. */
const CONTACT = 'martin@kubecka.cz'

/**
 * Zásady zpracování osobních údajů.
 *
 * Nutné od chvíle, kdy aplikace umí ukládat data k účtu. Text je záměrně
 * krátký a konkrétní - popisuje přesně to, co aplikace dělá, nic navíc.
 */
export default function PrivacyScreen({ onBack }: { onBack: () => void }) {
  return (
    <div className="screen">
      <header className="app-header">
        <h1>Zpracování údajů</h1>
        <p className="subtitle">Golf Games</p>
      </header>

      <main className="content prose">
        <section className="section">
          <h2 className="section-title">Bez přihlášení</h2>
          <p className="hint">
            Aplikace bez přihlášení neodesílá nikam nic. Všechna data – odehraná kola,
            jména spoluhráčů i nastavení – zůstávají v úložišti prohlížeče ve tvém
            zařízení. Neexistuje žádný účet ani server, který by o nich věděl.
          </p>
        </section>

        <section className="section">
          <h2 className="section-title">S přihlášením</h2>
          <p className="hint">
            Když se přihlásíš účtem Google, ukládají se tato data do služby Google
            Firebase (Firestore), aby byla zálohovaná a dostupná z dalších zařízení:
          </p>
          <ul className="bullet-list">
            <li>odehraná a rozehraná kola včetně skóre, hráčů a nastavení bodování</li>
            <li>seznam uložených spoluhráčů</li>
            <li>předvolby sázky a bodování</li>
            <li>e-mail a jméno z účtu Google, aby šlo data přiřadit</li>
          </ul>
          <p className="hint">
            Jména spoluhráčů zadáváš ty. Uváděj je tak, jak je běžné mezi vámi – celé
            jméno není potřeba.
          </p>
        </section>

        <section className="section">
          <h2 className="section-title">Kdo k datům má přístup</h2>
          <p className="hint">
            Jen ty. Pravidla databáze jsou nastavená tak, že ke svým datům se dostane
            výhradně přihlášený vlastník. Data se nikomu nepředávají, nepoužívají se k
            reklamě ani k profilování. Zpracovatelem úložiště je Google Ireland Limited
            jako provozovatel Firebase.
          </p>
        </section>

        <section className="section">
          <h2 className="section-title">Jak dlouho</h2>
          <p className="hint">
            Dokud data sám nesmažeš. Účet i všechna data v cloudu smažeš tlačítkem „Smazat
            účet a data v cloudu“ na obrazovce Účet. Smazání je okamžité a nevratné.
          </p>
        </section>

        <section className="section">
          <h2 className="section-title">Tvá práva</h2>
          <p className="hint">
            Máš právo na přístup k údajům, jejich opravu, výmaz a přenositelnost. Přístup
            i přenositelnost pokrývá tlačítko „Stáhnout zálohu“ na obrazovce Záloha dat,
            které vydá všechna data v otevřeném formátu JSON. Opravit je můžeš přímo v
            aplikaci, smazat tlačítkem výše.
          </p>
        </section>

        <section className="section">
          <h2 className="section-title">Kontakt</h2>
          <p className="hint">
            Správcem údajů je provozovatel aplikace. S čímkoli ohledně zpracování se ozvi
            na <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
          </p>
        </section>
      </main>

      <footer className="app-footer">
        <button type="button" className="primary-button" onClick={onBack}>
          Zpět
        </button>
        <p className="version">verze {APP_VERSION}</p>
      </footer>
    </div>
  )
}

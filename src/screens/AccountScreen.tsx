import { useState } from 'react'
import { useAccount } from '../sync/AccountContext'
import { missingConfigKeys } from '../sync/firebase'
import type { SignInError, SyncStatus } from '../sync/AccountContext'
import { APP_VERSION } from '../version'

interface Props {
  onOpenPrivacy: () => void
  onBack: () => void
}

const STATUS_TEXT: Record<SyncStatus, string> = {
  disabled: 'Synchronizace není v téhle verzi dostupná.',
  anonymous: 'Nepřihlášeno – data jsou jen v tomhle zařízení.',
  syncing: 'Synchronizuji…',
  synced: 'Data jsou zálohovaná.',
  offline: 'Bez připojení. Změny se pošlou, až bude signál.',
  error: 'Synchronizace se nepovedla. Zkusím to znovu při dalším spuštění.',
}

const SIGN_IN_ERROR: Record<SignInError, string> = {
  cancelled: '',
  network: 'Přihlášení se nepovedlo kvůli připojení. Zkus to prosím znovu.',
  unavailable: 'Přihlášení se nepovedlo. Zkus to prosím znovu.',
  unknown: 'Něco se pokazilo. Zkus to prosím znovu.',
}

/**
 * Účet a synchronizace.
 *
 * Přihlášení je dobrovolné - bez něj aplikace funguje přesně jako dřív a nic
 * neodchází ze zařízení. Proto je obrazovka postavená tak, aby nepřihlášenému
 * uživateli nic nevyčítala.
 */
export default function AccountScreen({ onOpenPrivacy, onBack }: Props) {
  const {
    status,
    account,
    lastSyncAt,
    signInError,
    signIn,
    signOut,
    syncNow,
    deleteEverything,
  } = useAccount()
  const [busy, setBusy] = useState(false)

  async function run(action: () => Promise<unknown>) {
    setBusy(true)
    try {
      await action()
    } finally {
      setBusy(false)
    }
  }

  function confirmDelete() {
    if (
      !confirm(
        'Smazat účet a všechna data v cloudu?\n\n' +
          'Kola uložená v tomhle telefonu zůstanou. Přijdeš o zálohu a o přístup ' +
          'z jiných zařízení. Akce je nevratná.',
      )
    ) {
      return
    }
    void run(deleteEverything)
  }

  return (
    <div className="screen">
      <header className="app-header">
        <h1>Účet</h1>
        <p className="subtitle">Záloha do cloudu</p>
      </header>

      <main className="content">
        {status === 'disabled' ? (
          <section className="section">
            <p className="notice error">
              Tahle verze aplikace nemá nastavené připojení k cloudu, takže se nejde
              přihlásit. Data si zatím zálohuj přes obrazovku „Záloha dat“.
            </p>
            <h2 className="section-title">Co chybí</h2>
            <p className="hint">
              Buildu se nedostaly tyhle údaje – doplň je v repozitáři jako GitHub Secrets
              (Settings → Secrets and variables → Actions) a spusť nasazení znovu:
            </p>
            <ul className="bullet-list">
              {missingConfigKeys().map((key) => (
                <li key={key}>
                  <code>{key}</code>
                </li>
              ))}
            </ul>
            <p className="hint">
              Postup je popsaný v <code>docs/sync.md</code>. Verze aplikace je{' '}
              {APP_VERSION} – zkontroluj, že je to ta nasazená.
            </p>
          </section>
        ) : account ? (
          <>
            <section className="section">
              <h2 className="section-title">Přihlášen</h2>
              <p className="account-name">{account.name}</p>
              {account.email && <p className="hint">{account.email}</p>}
              <p className="notice">
                {STATUS_TEXT[status]}
                {lastSyncAt && status === 'synced' && (
                  <> Naposledy {lastSyncAt.toLocaleTimeString('cs-CZ')}.</>
                )}
              </p>
              <button
                type="button"
                className="secondary-button"
                disabled={busy || status === 'syncing'}
                onClick={() => void run(syncNow)}
              >
                Synchronizovat teď
              </button>
            </section>

            <section className="section">
              <h2 className="section-title">Odhlášení</h2>
              <p className="hint">
                Po odhlášení zůstanou kola v tomhle zařízení a přestanou se zálohovat.
                Data v cloudu se nemažou – po přihlášení se zase objeví.
              </p>
              <button
                type="button"
                className="secondary-button"
                disabled={busy}
                onClick={() => void run(signOut)}
              >
                Odhlásit se
              </button>
            </section>

            <section className="section">
              <h2 className="section-title">Smazání účtu</h2>
              <p className="hint">
                Smaže účet i všechna data v cloudu. Kola v tomhle telefonu zůstanou –
                pokud si je chceš odnést, udělej si nejdřív zálohu do souboru.
              </p>
              <button
                type="button"
                className="danger-button"
                disabled={busy}
                onClick={confirmDelete}
              >
                Smazat účet a data v cloudu
              </button>
            </section>
          </>
        ) : (
          <>
            <p className="hint">
              Bez přihlášení jsou kola uložená jen v tomhle zařízení. Přihlášením účtem
              Google se začnou zálohovat a dostaneš se k nim odkudkoli – z telefonu,
              tabletu i počítače.
            </p>

            <section className="section">
              <button
                type="button"
                className="primary-button"
                disabled={busy || status === 'syncing'}
                onClick={() => void run(signIn)}
              >
                {status === 'syncing' ? 'Přihlašuji…' : 'Přihlásit se účtem Google'}
              </button>
              {signInError && (
                <p className="notice error">{SIGN_IN_ERROR[signInError]}</p>
              )}
              <p className="hint">
                Nic se nemusí – aplikace funguje bez přihlášení úplně stejně. Zálohu do
                souboru najdeš na obrazovce „Záloha dat“.
              </p>
            </section>

            <section className="section">
              <h2 className="section-title">Co se ukládá</h2>
              <p className="hint">
                Odehraná kola, seznam spoluhráčů a nastavení bodování. Z účtu Google jen
                e-mail a jméno, aby šlo data přiřadit. Nic dalšího se nesbírá a nikomu se
                nepředává.
              </p>
              <button type="button" className="link-button" onClick={onOpenPrivacy}>
                Zásady zpracování údajů
              </button>
            </section>
          </>
        )}
      </main>

      <footer className="app-footer">
        <button type="button" className="primary-button" onClick={onBack} disabled={busy}>
          Zpět
        </button>
        <p className="version">verze {APP_VERSION}</p>
      </footer>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useAccount } from '../sync/AccountContext'
import { missingConfigKeys } from '../sync/firebase'
import type { SignInError, SyncStatus } from '../sync/AccountContext'
import { APP_VERSION } from '../version'
import { useT } from '../i18n'
import type { MessageKey } from '../i18n'
import { BackIcon } from './icons'

interface Props {
  onOpenPrivacy: () => void
  onBack: () => void
}

const STATUS_TEXT: Record<SyncStatus, MessageKey> = {
  disabled: 'sync.disabled',
  anonymous: 'sync.anonymous',
  syncing: 'sync.syncing',
  synced: 'sync.synced',
  offline: 'sync.offline',
  error: 'sync.error',
}

/** Zrušené přihlášení uživatel udělal sám, tomu se nic nehlásí. */
const SIGN_IN_ERROR: Record<Exclude<SignInError, 'cancelled'>, MessageKey> = {
  network: 'signIn.network',
  unavailable: 'signIn.unavailable',
  notReady: 'signIn.notReady',
  unknown: 'signIn.unknown',
}

/**
 * Účet a synchronizace.
 *
 * Přihlášení je dobrovolné - bez něj aplikace funguje přesně jako dřív a nic
 * neodchází ze zařízení. Proto je obrazovka postavená tak, aby nepřihlášenému
 * uživateli nic nevyčítala.
 */
export default function AccountScreen({ onOpenPrivacy, onBack }: Props) {
  const t = useT()
  const {
    status,
    account,
    lastSyncAt,
    signInError,
    syncError,
    authReady,
    prepareSignIn,
    signIn,
    signOut,
    syncNow,
    deleteEverything,
  } = useAccount()
  const [busy, setBusy] = useState(false)

  // SDK se načítá hned při otevření obrazovky, aby šlo přihlašovací okno
  // otevřít přímo v obsluze klepnutí. Kdyby se načítalo až po klepnutí,
  // prohlížeč by okno zablokoval jako nevyžádané.
  useEffect(prepareSignIn, [prepareSignIn])

  async function run(action: () => Promise<unknown>) {
    setBusy(true)
    try {
      await action()
    } finally {
      setBusy(false)
    }
  }

  function confirmDelete() {
    if (!confirm(t('account.deleteConfirm'))) {
      return
    }
    void run(deleteEverything)
  }

  return (
    <div className="screen">
      <header className="app-header">
        <div className="screen-header-row">
          <button
            type="button"
            className="icon-button"
            onClick={onBack}
            disabled={busy}
            aria-label={t('common.back')}
          >
            <BackIcon />
          </button>
          <h1>{t('account.title')}</h1>
        </div>
        <p className="subtitle">{t('account.subtitle')}</p>
      </header>

      <main className="content">
        {status === 'disabled' ? (
          <section className="section">
            <p className="notice error">{t('account.disabledNotice')}</p>
            <h2 className="section-title">{t('account.missingTitle')}</h2>
            <p className="hint">{t('account.missingHint')}</p>
            <ul className="bullet-list">
              {missingConfigKeys().map((key) => (
                <li key={key}>
                  <code>{key}</code>
                </li>
              ))}
            </ul>
            <p className="hint">{t('account.missingFooter', { version: APP_VERSION })}</p>
          </section>
        ) : account ? (
          <>
            <section className="section">
              <h2 className="section-title">{t('account.signedIn')}</h2>
              <p className="account-name">{account.name}</p>
              {account.email && <p className="hint">{account.email}</p>}
              <p className={`notice${status === 'error' ? ' error' : ''}`}>
                {t(STATUS_TEXT[status])}
                {lastSyncAt && status === 'synced' && (
                  <> {t('account.lastSync', { time: lastSyncAt.toLocaleTimeString() })}</>
                )}
              </p>
              {status === 'error' && syncError && (
                <p className="notice error">{syncError}</p>
              )}
              <button
                type="button"
                className="secondary-button"
                disabled={busy || status === 'syncing'}
                onClick={() => void run(syncNow)}
              >
                {t('account.syncNow')}
              </button>
            </section>

            <section className="section">
              <h2 className="section-title">{t('account.signOutTitle')}</h2>
              <p className="hint">{t('account.signOutHint')}</p>
              <button
                type="button"
                className="secondary-button"
                disabled={busy}
                onClick={() => void run(signOut)}
              >
                {t('account.signOut')}
              </button>
            </section>

            <section className="section">
              <h2 className="section-title">{t('account.deleteTitle')}</h2>
              <p className="hint">{t('account.deleteHint')}</p>
              <button
                type="button"
                className="danger-button"
                disabled={busy}
                onClick={confirmDelete}
              >
                {t('account.delete')}
              </button>
            </section>
          </>
        ) : (
          <>
            <p className="hint">{t('account.intro')}</p>

            <section className="section">
              <button
                type="button"
                className="primary-button"
                disabled={busy || status === 'syncing' || !authReady}
                onClick={() => void run(signIn)}
              >
                {status === 'syncing'
                  ? t('account.signingIn')
                  : authReady
                    ? t('account.signIn')
                    : t('account.preparing')}
              </button>
              {signInError && signInError !== 'cancelled' && (
                <p className="notice error">{t(SIGN_IN_ERROR[signInError])}</p>
              )}
              <p className="hint">{t('account.optional')}</p>
            </section>

            <section className="section">
              <h2 className="section-title">{t('account.storedTitle')}</h2>
              <p className="hint">{t('account.storedHint')}</p>
              <button type="button" className="link-button" onClick={onOpenPrivacy}>
                {t('account.privacy')}
              </button>
            </section>
          </>
        )}
      </main>
    </div>
  )
}

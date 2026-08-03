import type { FirebaseApp } from 'firebase/app'
import type { Auth } from 'firebase/auth'
import type { Firestore } from 'firebase/firestore'

/**
 * Líné načtení Firebase.
 *
 * SDK je velké a naprostá většina zápisů skóre se odehraje bez přihlášení,
 * takže se načítá **dynamickým importem až v okamžiku, kdy je potřeba**.
 * Nepřihlášený uživatel tím pádem nestáhne ani bajt navíc a aplikace se chová
 * přesně jako před zavedením synchronizace.
 *
 * Konfigurace jsou veřejné údaje - u Firebase to tak je z principu, protože
 * zabezpečení stojí na pravidlech Firestore (`firestore.rules`), ne na utajení
 * klíče. Přesto se do repozitáře nedávají a plní se při buildu z proměnných
 * prostředí (viz .env.example).
 */

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

/**
 * Je synchronizace v tomhle buildu vůbec dostupná?
 *
 * Bez konfigurace se celá sekce účtu skryje a aplikace funguje jako čistě
 * místní - díky tomu jde repozitář postavit i bez přístupu k Firebase.
 */
export function isSyncConfigured(): boolean {
  return missingConfigKeys().length === 0
}

/**
 * Které údaje konfigurace chybí.
 *
 * Slouží k diagnostice: bez tohohle výpisu je "synchronizace nedostupná"
 * hláška, se kterou se nedá nic dělat.
 */
export function missingConfigKeys(): string[] {
  const required: [string, string | undefined][] = [
    ['VITE_FIREBASE_API_KEY', config.apiKey],
    ['VITE_FIREBASE_AUTH_DOMAIN', config.authDomain],
    ['VITE_FIREBASE_PROJECT_ID', config.projectId],
    ['VITE_FIREBASE_APP_ID', config.appId],
  ]
  return required.filter(([, value]) => !value).map(([name]) => name)
}

export interface FirebaseBundle {
  app: FirebaseApp
  auth: Auth
  db: Firestore
}

/** Jednou načtené SDK si držíme, ať se při dalším volání neinicializuje znovu. */
let pending: Promise<FirebaseBundle> | null = null

export function loadFirebase(): Promise<FirebaseBundle> {
  if (!isSyncConfigured()) {
    return Promise.reject(new Error('Synchronizace není v tomhle buildu nastavená.'))
  }

  pending ??= (async () => {
    const [{ initializeApp, getApps, getApp }, authModule, { getFirestore }] =
      await Promise.all([
        import('firebase/app'),
        import('firebase/auth'),
        import('firebase/firestore'),
      ])

    const app = getApps().length > 0 ? getApp() : initializeApp(config)
    const auth = authModule.getAuth(app)
    // Přihlášení má přežít zavření aplikace - na hřišti nikdo nechce řešit
    // login podruhé.
    await authModule.setPersistence(auth, authModule.browserLocalPersistence)

    return { app, auth, db: getFirestore(app) }
  })()

  return pending
}

/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

/** Verze z package.json, vpečená při buildu (vite.config.ts -> define). */
declare const __APP_VERSION__: string

/**
 * Konfigurace Firebase pro synchronizaci; plní se při buildu z GitHub Secrets.
 * Když chybí, aplikace běží bez účtu jako čistě místní (viz sync/firebase.ts).
 */
interface ImportMetaEnv {
  /** Adresa katalogu hřišť; bez ní se čte katalog projektu (viz courses/catalog.ts). */
  readonly VITE_COURSES_URL?: string
  readonly VITE_FIREBASE_API_KEY?: string
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string
  readonly VITE_FIREBASE_PROJECT_ID?: string
  readonly VITE_FIREBASE_APP_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

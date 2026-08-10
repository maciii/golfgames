import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Message } from './plural'
import { selectPlural } from './plural'
import { cs } from './cs'
import { en } from './en'

/**
 * Překlady.
 *
 * Vlastní řešení místo knihovny: textů je pár stovek, potřebujeme jen dosazení
 * proměnných a množná čísla, a katalog se dá typově pohlídat líp než u obecné
 * knihovny - chybějící překlad je chyba překladače, ne text, který v aplikaci
 * zůstane česky.
 *
 * Kromě Reactu si jazyk drží i modul (`current`), protože ho potřebují
 * i funkce mimo komponenty - formátování peněz, datumů a řazení jmen.
 */

export type Locale = 'cs' | 'en'

export const LOCALES: Locale[] = ['cs', 'en']

/** Jazyk se v přepínači píše vždy svým vlastním jménem. */
export const LOCALE_LABEL: Record<Locale, string> = {
  cs: 'Čeština',
  en: 'English',
}

/** Značka jazyka pro Intl - formát peněz, datumů a řazení. */
const LOCALE_TAG: Record<Locale, string> = {
  cs: 'cs-CZ',
  en: 'en-GB',
}

const CATALOGS: Record<Locale, Record<string, Message>> = { cs, en }

/** Katalogová id odpališť, která mají obecný význam a mají se překládat. */
const TEE_NAME_KEYS: Record<string, MessageKey> = {
  black: 'course.tee.black',
  blue: 'course.tee.blue',
  bronze: 'course.tee.bronze',
  'dark-green': 'course.tee.darkGreen',
  gold: 'course.tee.gold',
  green: 'course.tee.green',
  jade: 'course.tee.jade',
  members: 'course.tee.members',
  men: 'course.tee.men',
  middle: 'course.tee.middle',
  orange: 'course.tee.orange',
  players: 'course.tee.players',
  purple: 'course.tee.purple',
  red: 'course.tee.red',
  silver: 'course.tee.silver',
  tournament: 'course.tee.tournament',
  white: 'course.tee.white',
  yellow: 'course.tee.yellow',
}

/** Klíče se odvozují z českého katalogu, ten je zdrojem pravdy. */
export type MessageKey = keyof typeof cs

export type Params = Record<string, string | number>

const STORAGE_KEY = 'golfgames.locale.v1'

function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && LOCALES.includes(value as Locale)
}

/**
 * Zvolený jazyk: uložená volba, jinak jazyk prohlížeče, jinak angličtina.
 * Angličtina jako výchozí proto, že aplikaci může otevřít kdokoli.
 */
function detectLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (isLocale(stored)) return stored
  } catch {
    /* privátní režim - spadneme na jazyk prohlížeče */
  }

  const preferred = typeof navigator === 'undefined' ? [] : navigator.languages
  for (const tag of preferred ?? []) {
    const base = tag.split('-')[0]
    if (isLocale(base)) return base
  }
  return 'en'
}

/** Aktuální jazyk i pro kód mimo komponenty. */
let current: Locale = detectLocale()

export function getLocale(): Locale {
  return current
}

/**
 * Nastaví jazyk pro kód mimo React.
 *
 * Používá to provider (aby formátování peněz a datumů vidělo nový jazyk hned)
 * a testy, které ověřují konkrétní znění textů.
 */
export function setActiveLocale(next: Locale): void {
  current = next
}

/** Značka pro `Intl` podle aktuálního jazyka. */
export function localeTag(): string {
  return LOCALE_TAG[current]
}

/** Dosadí `{proměnné}` do textu. */
function fill(text: string, params?: Params): string {
  if (!params) return text
  return text.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in params ? String(params[name]) : whole,
  )
}

/**
 * Přeloží klíč do daného jazyka.
 *
 * Když text v jazyce chybí, spadne se na češtinu a nakonec na samotný klíč -
 * v aplikaci se tak nikdy neobjeví prázdné místo.
 */
export function translate(locale: Locale, key: MessageKey, params?: Params): string {
  const message = CATALOGS[locale][key] ?? CATALOGS.cs[key]
  if (message === undefined) return key

  if (typeof message === 'string') return fill(message, params)

  // Množné číslo se řídí parametrem `count`.
  const count = Number(params?.count ?? 0)
  return fill(selectPlural(message, count, LOCALE_TAG[locale]), params)
}

/** Překlad podle aktuálního jazyka - pro kód mimo komponenty. */
export function t(key: MessageKey, params?: Params): string {
  return translate(current, key, params)
}

/** Přeloží standardní katalogové odpaliště; vlastní názvy nechá beze změny. */
export function localizedTeeName(id: string, fallback: string): string {
  const key = TEE_NAME_KEYS[id]
  if (key) return t(key)

  const numbered = /^tee-(\d+)$/.exec(id)?.[1]
  return numbered ? t('course.tee.number', { number: numbered }) : fallback
}

interface LocaleValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: MessageKey, params?: Params) => string
}

const LocaleContext = createContext<LocaleValue | null>(null)

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(current)

  const setLocale = useCallback((next: Locale) => {
    // Modul se nastavuje hned, ať funkce mimo komponenty (peníze, datumy)
    // vidí nový jazyk už při prvním překreslení.
    setActiveLocale(next)
    setLocaleState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* volba se prostě nezapamatuje */
    }
  }, [])

  // Jazyk stránky kvůli čtečkám obrazovky a dělení slov.
  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const translateWithLocale = useCallback(
    (key: MessageKey, params?: Params) => translate(locale, key, params),
    [locale],
  )

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t: translateWithLocale }}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale(): LocaleValue {
  const value = useContext(LocaleContext)
  if (!value) throw new Error('useLocale se dá volat jen uvnitř LocaleProvider')
  return value
}

/**
 * Klíč složený za běhu z id (hry, bonusu, kategorie výsledku).
 *
 * TypeScript takový klíč proti seznamu neověří, proto existenci všech
 * odvozených klíčů hlídá test v `i18n.test.ts` - projde všechny registrované
 * hry, bonusy i kategorie a ověří, že v obou katalozích jsou.
 */
export function dynamicKey(...parts: string[]): MessageKey {
  return parts.join('.') as MessageKey
}

/** Zkratka pro komponenty, které potřebují jen překlad. */
export function useT(): (key: MessageKey, params?: Params) => string {
  return useLocale().t
}

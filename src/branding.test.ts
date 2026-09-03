import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * Jméno appky se drží na čtyřech místech mimo React a nic je nesváže:
 * manifest PWA, titulek stránky, titulek pro iOS a úvodní obrazovka před
 * načtením skriptu. Když se přejmenování někde zapomene, appka se pořád
 * tváří správně - jen se pod starým jménem nabídne při ukládání na plochu,
 * což je přesně to, co se stalo při přechodu na Fairsome.
 *
 * Se značkou je to stejné: dva překrývající se kruhy kreslí wordmark
 * v Reactu, favicon a generátor PWA ikon, každý svým vlastním způsobem
 * (SVG, SVG, pixely). Rozejít se smí zápis, ne akcentní barva ani průsvit
 * zadního kruhu - jinak má appka na ploše telefonu jiné logo než uvnitř.
 */

const APP_NAME = 'Fairsome'

/** Průsvit zadního kruhu ve značce - jediné, čím se dva kruhy liší. */
const MARK_BACK_OPACITY = '0.35'

const indexHtml = readFileSync('index.html', 'utf8')
const viteConfig = readFileSync('vite.config.ts', 'utf8')
const styles = readFileSync('src/styles.css', 'utf8')
const favicon = readFileSync('public/favicon.svg', 'utf8')
const iconScript = readFileSync('scripts/gen-icons.mjs', 'utf8')
const brandMark = readFileSync('src/screens/HomeScreen.tsx', 'utf8')

/** Akcentní zelená z tmavého schématu - zdroj pravdy pro barvu značky. */
function accentColor(): string {
  return match(styles, /--accent:\s*(#[0-9a-f]{6})/)
}

function match(source: string, pattern: RegExp): string {
  const found = source.match(pattern)
  expect(found?.[1], `nenalezeno: ${pattern}`).toBeDefined()
  return found![1]!
}

describe('jméno aplikace', () => {
  it('manifest PWA nabídne appku pod jejím jménem', () => {
    // `name` i `short_name` jsou to, co telefon ukáže při ukládání na plochu.
    expect(match(viteConfig, /\n\s*name: '([^']+)',/)).toBe(APP_NAME)
    expect(match(viteConfig, /\n\s*short_name: '([^']+)',/)).toBe(APP_NAME)
  })

  it('titulek stránky, iOS titulek a úvodní obrazovka se shodují', () => {
    expect(match(indexHtml, /<title>([^<]+)<\/title>/)).toBe(APP_NAME)
    expect(match(indexHtml, /name="apple-mobile-web-app-title" content="([^"]+)"/)).toBe(
      APP_NAME,
    )
    expect(match(indexHtml, /class="boot-title">([^<]+)</)).toBe(APP_NAME)
  })
})

describe('značka aplikace', () => {
  it('favicon kreslí značku akcentní barvou appky', () => {
    expect(match(favicon, /<g fill="(#[0-9a-f]{6})">/)).toBe(accentColor())
  })

  it('ikony na plochu kreslí tu samou zelenou', () => {
    const rgb = match(iconScript, /const ACCENT = \[([\d, ]+)\]/)
      .split(',')
      .map((part) => Number(part.trim()))
    const hex = `#${rgb.map((v) => v.toString(16).padStart(2, '0')).join('')}`

    expect(hex).toBe(accentColor())
  })

  it('zadní kruh je všude stejně průsvitný', () => {
    // Wordmark v aplikaci, favicon i generátor ikon: dva kruhy, zadní tlumený.
    expect(brandMark, 'BrandMark').toContain(`opacity="${MARK_BACK_OPACITY}"`)
    expect(favicon, 'favicon.svg').toContain(`opacity="${MARK_BACK_OPACITY}"`)
    expect(iconScript, 'gen-icons.mjs').toContain(`ACCENT, ${MARK_BACK_OPACITY}`)
  })
})

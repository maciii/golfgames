import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * Jméno appky se drží na čtyřech místech mimo React a nic je nesváže:
 * manifest PWA, titulek stránky, titulek pro iOS a úvodní obrazovka před
 * načtením skriptu. Když se přejmenování někde zapomene, appka se pořád
 * tváří správně - jen se pod starým jménem nabídne při ukládání na plochu,
 * což je přesně to, co se stalo při přechodu na Fairsome.
 */

const APP_NAME = 'Fairsome'

const indexHtml = readFileSync('index.html', 'utf8')
const viteConfig = readFileSync('vite.config.ts', 'utf8')

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

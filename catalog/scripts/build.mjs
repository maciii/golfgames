#!/usr/bin/env node
/**
 * Sestaví publikovanou podobu katalogu ze zdrojových souborů.
 *
 *   courses/<id>.json   ->   dist/index.json
 *                            dist/course/<id>.json
 *                            dist/meta.json
 *
 * Zdrojem pravdy jsou soubory v `courses/`, které se upravují ručně. `dist/`
 * je odvozený a při každém buildu se přepisuje - nikdy se needituje.
 *
 * Rejstřík je zatím jeden soubor. Při dnešních stovkách hřišť má desítky
 * kilobajtů, takže dělení podle polohy by byla složitost bez užitku; jakmile
 * katalog vyroste na tisíce, rozdělí se podle geohashe.
 */

import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const sourceDir = join(root, 'courses')
const distDir = join(root, 'dist')

rmSync(distDir, { recursive: true, force: true })
mkdirSync(join(distDir, 'course'), { recursive: true })

const files = readdirSync(sourceDir)
  .filter((name) => name.endsWith('.json'))
  .sort()
const index = []

for (const file of files) {
  const course = JSON.parse(readFileSync(join(sourceDir, file), 'utf8'))

  writeFileSync(join(distDir, 'course', `${course.id}.json`), JSON.stringify(course))

  // Rejstřík nese jen to, podle čeho se hřiště hledá a vybírá. Scorekarta se
  // stahuje až u zvoleného hřiště, aby telefon netahal data, která neuvidí.
  index.push({
    id: course.id,
    name: course.name,
    ...(course.club && course.club !== course.name ? { club: course.club } : {}),
    ...(course.country ? { country: course.country } : {}),
    ...(course.lat !== undefined && course.lon !== undefined
      ? { lat: course.lat, lon: course.lon }
      : {}),
    holeCount: course.holeCount,
    tees: (course.tees ?? []).length,
    // Bez normy odpaliště se hrací handicap nedá spočítat z indexu, takže je
    // užitečné to poznat ještě před stažením.
    rated: (course.tees ?? []).some((tee) => tee.slopeRating !== undefined),
  })
}

writeFileSync(join(distDir, 'index.json'), JSON.stringify(index))
writeFileSync(
  join(distDir, 'meta.json'),
  JSON.stringify(
    {
      builtAt: new Date().toISOString(),
      courses: index.length,
      license: 'ODbL-1.0',
      source: 'https://github.com/maciii/golfgames-courses',
    },
    null,
    2,
  ),
)

// Katalog čte aplikace z jiné domény; Pages posílají hvězdičkový CORS samy,
// tenhle soubor je jen pojistka pro jiný hosting.
writeFileSync(join(distDir, '_headers'), 'https://*\n  Access-Control-Allow-Origin: *\n')

const bytes = JSON.stringify(index).length
console.log(`hřišť:     ${index.length}`)
console.log(`rejstřík:  ${(bytes / 1024).toFixed(1)} kB`)

#!/usr/bin/env node
/**
 * Rozpadne `data/hriste.json` z repozitáře aplikace na soubory po hřištích.
 *
 * Používá se jednorázově při zakládání katalogu. Potom je zdrojem pravdy
 * `courses/` a tenhle skript se už nepouští - přepsal by ruční úpravy.
 *
 *   node scripts/split.mjs ../golfgames/data/hriste.json
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const input = process.argv[2]
if (!input) {
  console.error('Použití: node scripts/split.mjs <hriste.json>')
  process.exit(2)
}

const outDir = join(new URL('..', import.meta.url).pathname, 'courses')
mkdirSync(outDir, { recursive: true })

const source = JSON.parse(readFileSync(input, 'utf8'))
const courses = source.data?.courses ?? source.courses ?? source

for (const course of courses) {
  writeFileSync(join(outDir, `${course.id}.json`), JSON.stringify(course, null, 2) + '\n')
}

console.log(`zapsáno ${courses.length} hřišť do courses/`)

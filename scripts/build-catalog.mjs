#!/usr/bin/env node
/**
 * Vygeneruje katalog hřišť do `public/courses/`.
 *
 * Katalog patří do samostatného projektu `golfgames-courses` (viz
 * docs/katalog.md). Než bude jeho GitHub Pages k dispozici, staví se stejná
 * struktura z `data/hriste.json` a servíruje se z domény aplikace, aby se
 * katalog dal používat a testovat.
 *
 * Výstup je odvozený a v `.gitignore` - do repozitáře se necommituje.
 * Přepnutí na samostatný katalog je jedna proměnná: VITE_COURSES_URL.
 */

import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const outDir = join(root, 'public', 'courses')

const source = JSON.parse(readFileSync(join(root, 'data', 'hriste.json'), 'utf8'))
const courses = source.data.courses

rmSync(outDir, { recursive: true, force: true })
mkdirSync(join(outDir, 'course'), { recursive: true })

const index = courses.map((course) => ({
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
  // užitečné to poznat ještě před stažením scorekarty.
  rated: (course.tees ?? []).some((tee) => tee.slopeRating !== undefined),
}))

for (const course of courses) {
  writeFileSync(join(outDir, 'course', `${course.id}.json`), JSON.stringify(course))
}
writeFileSync(join(outDir, 'index.json'), JSON.stringify(index))
writeFileSync(
  join(outDir, 'meta.json'),
  JSON.stringify({ builtAt: new Date().toISOString(), courses: index.length }, null, 2),
)

console.log(
  `katalog: ${index.length} hřišť, rejstřík ${(JSON.stringify(index).length / 1024).toFixed(1)} kB`,
)

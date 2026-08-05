#!/usr/bin/env node
/**
 * Kontrola zdrojových souborů katalogu.
 *
 * Pouští se v CI před buildem, takže se do publikovaného katalogu nedostane
 * hřiště, které by rozbilo výpočty v aplikaci. Ruční úprava je hlavní způsob,
 * jak se data mění, a překlep v poli o osmnácti číslech je snadný.
 *
 * Dělí nálezy na chyby (build spadne) a podezření (jen se vypíšou), protože
 * spousta zvláštně vypadajících hodnot je u golfu normální: předsunutá
 * odpaliště mívají jiný par než hřiště a krátká hřiště mají nízké CR.
 */

import { readdirSync, readFileSync } from 'node:fs'
import { basename, join } from 'node:path'

const dir = process.argv[2] ?? join(new URL('..', import.meta.url).pathname, 'courses')
const files = readdirSync(dir)
  .filter((name) => name.endsWith('.json'))
  .sort()

const errors = []
const warnings = []
const seen = new Set()

for (const file of files) {
  const at = basename(file, '.json')
  let course
  try {
    course = JSON.parse(readFileSync(join(dir, file), 'utf8'))
  } catch (error) {
    errors.push(`${at}: soubor není platný JSON (${error.message})`)
    continue
  }

  // Jméno souboru je zároveň id - jinak by build zapsal hřiště jinam, než kde
  // ho člověk hledá, a odkaz z rejstříku by nesedel.
  if (course.id !== at) errors.push(`${at}: id "${course.id}" nesedí na název souboru`)
  if (seen.has(course.id)) errors.push(`${at}: duplicitní id`)
  seen.add(course.id)

  if (!course.name) errors.push(`${at}: chybí název`)
  if (!Number.isInteger(course.holeCount) || course.holeCount <= 0) {
    errors.push(`${at}: holeCount není kladné celé číslo`)
    continue
  }
  if (!Array.isArray(course.pars) || course.pars.length !== course.holeCount) {
    errors.push(`${at}: pars nemá délku ${course.holeCount}`)
    continue
  }
  if (course.pars.some((par) => !Number.isInteger(par) || par < 3 || par > 6)) {
    errors.push(`${at}: par mimo rozsah 3-6`)
  }

  // Stroke index musí být permutace. Dvě jamky se stejným SI rozdělí rány
  // špatně a nikdo si toho nevšimne, dokud se nepočítají peníze.
  if (Array.isArray(course.strokeIndex) && course.strokeIndex.length > 0) {
    if (course.strokeIndex.length !== course.holeCount) {
      errors.push(`${at}: strokeIndex nemá délku ${course.holeCount}`)
    } else if (new Set(course.strokeIndex).size !== course.holeCount) {
      errors.push(`${at}: strokeIndex má opakující se hodnoty`)
    }
  } else {
    warnings.push(`${at}: bez stroke indexu, rány se rozdělí podle pořadí jamek`)
  }

  const parSum = course.pars.reduce((sum, par) => sum + par, 0)

  for (const tee of course.tees ?? []) {
    const where = `${at}/${tee.id ?? tee.name ?? '?'}`
    const par = tee.par ?? parSum

    if (tee.slopeRating === undefined) {
      warnings.push(`${where}: bez SR, handicap se nedopočítá z indexu`)
    } else if (tee.slopeRating < 55 || tee.slopeRating > 155) {
      errors.push(`${where}: SR ${tee.slopeRating} je mimo rozsah 55-155`)
    }

    if (tee.courseRating !== undefined) {
      if (tee.courseRating <= 0) {
        errors.push(`${where}: CR ${tee.courseRating} není platné`)
      } else if (tee.courseRating > 100) {
        // CR nad sto je skoro jistě slope zapsaný do špatného pole.
        errors.push(`${where}: CR ${tee.courseRating} vypadá jako slope`)
      } else if (Math.abs(tee.courseRating - par) > 15) {
        warnings.push(`${where}: CR ${tee.courseRating} proti paru ${par} - ověřit normu`)
      }
    }
  }
}

console.log(`souborů:   ${files.length}`)
console.log(`chyb:      ${errors.length}`)
console.log(`podezření: ${warnings.length}`)

if (errors.length > 0) {
  console.log('\nCHYBY')
  for (const message of errors) console.log(`  ${message}`)
}
if (warnings.length > 0) {
  console.log('\nPODEZŘENÍ')
  for (const message of warnings) console.log(`  ${message}`)
}

process.exit(errors.length > 0 ? 1 : 0)

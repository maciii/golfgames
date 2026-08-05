#!/usr/bin/env node
/**
 * Kontrola sady hřišť.
 *
 * Projde soubor ve formátu zálohy (viz docs/import-hrist.md) a vypíše, co
 * v datech nesedí. Skript se hodí před importem cizí sady i později, až se
 * hřiště budou udržovat v samostatném datovém projektu.
 *
 *   node scripts/check-courses.mjs data/hriste.json
 *
 * Vrací nenulový návratový kód, když najde chybu, která by rozbila výpočty.
 * Podezření (možná chyba, možná zvláštní hřiště) jen vypíše.
 */

import { readFileSync } from 'node:fs'

const file = process.argv[2]
if (!file) {
  console.error('Použití: node scripts/check-courses.mjs <soubor.json>')
  process.exit(2)
}

const raw = JSON.parse(readFileSync(file, 'utf8'))
const courses = Array.isArray(raw) ? raw : (raw.data?.courses ?? raw.courses ?? [])

const errors = []
const warnings = []

const seen = new Set()
for (const course of courses) {
  const at = course.id ?? course.name ?? '(bez id)'

  // --- tvar, na kterém stojí výpočty ---
  if (!course.id) errors.push(`${at}: chybí id`)
  else if (seen.has(course.id)) errors.push(`${at}: duplicitní id`)
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

  // Stroke index musí být permutace - dvě jamky se stejným SI rozdělí rány
  // špatně a nikdo si toho nevšimne, dokud se nepočítají peníze.
  if (course.strokeIndex !== undefined && course.strokeIndex.length > 0) {
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

    if (tee.slopeRating !== undefined) {
      // Mimo 55-155 slope neexistuje; typicky je to prohozené CR.
      if (tee.slopeRating < 55 || tee.slopeRating > 155) {
        errors.push(`${where}: SR ${tee.slopeRating} je mimo rozsah 55-155`)
      }
    } else {
      warnings.push(`${where}: bez SR, handicap se nedopočítá z indexu`)
    }

    if (tee.courseRating !== undefined) {
      if (tee.courseRating <= 0) {
        errors.push(`${where}: CR ${tee.courseRating} není platné`)
      } else if (tee.courseRating > 100) {
        // CR nad sto je skoro jistě slope zapsaný do špatného pole.
        errors.push(`${where}: CR ${tee.courseRating} vypadá jako slope`)
      } else if (Math.abs(tee.courseRating - par) > 15) {
        warnings.push(
          `${where}: CR ${tee.courseRating} proti paru ${par} - ověřit, jestli norma odpovídá počtu jamek`,
        )
      }
    }
  }
}

console.log(`hřišť v souboru: ${courses.length}`)
console.log(`chyb:            ${errors.length}`)
console.log(`podezření:       ${warnings.length}`)

if (errors.length > 0) {
  console.log('\nCHYBY')
  for (const message of errors) console.log(`  ${message}`)
}
if (warnings.length > 0) {
  console.log('\nPODEZŘENÍ')
  for (const message of warnings) console.log(`  ${message}`)
}

process.exit(errors.length > 0 ? 1 : 0)

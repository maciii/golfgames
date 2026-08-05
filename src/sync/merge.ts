import type { Round } from '../types'
import { roundTimestamp } from '../types'

/**
 * Slučování místních a vzdálených dat.
 *
 * Schválně bez jediného odkazu na Firebase - je to čistá matematika, kterou
 * jde testovat bez prohlížeče i bez sítě. Samotné čtení a zápis do cloudu
 * řeší sync.ts.
 *
 * Pravidlo je všude stejné: **nic se nikdy nezahazuje**. Kola se párují podle
 * `id` a při shodě vyhrává novější podle `updatedAt`. Kolo, které je jen na
 * jedné straně, se vždy dostane na obě.
 */

/** Co po sloučení zapsat kam. */
export interface MergePlan {
  /** Výsledný stav, který se uloží do zařízení. */
  local: Round[]
  /** Kola, která je potřeba nahrát do cloudu (chybí tam, nebo jsou starší). */
  push: Round[]
}

/** Vyřadí kola, která uživatel explicitně smazal a nesmí se znovu objevit. */
export function removeDeletedRounds(rounds: Round[], deletedIds: string[]): Round[] {
  if (deletedIds.length === 0) return rounds
  const deleted = new Set(deletedIds)
  return rounds.filter((round) => !deleted.has(round.id))
}

/**
 * Sloučí místní kola se vzdálenými a zároveň řekne, co je potřeba nahrát.
 *
 * Vrácené `local` je sjednocení obou stran, `push` obsahuje jen ta kola, kde
 * je místní verze novější (nebo v cloudu vůbec není) - díky tomu se po
 * přihlášení nenahrává celý archiv znovu.
 */
export function mergeRounds(local: Round[], remote: Round[]): MergePlan {
  const remoteById = new Map(remote.map((r) => [r.id, r]))
  const merged = new Map<string, Round>()
  const push: Round[] = []

  for (const round of local) {
    const counterpart = remoteById.get(round.id)
    if (!counterpart) {
      // V cloudu chybí - patří tam.
      merged.set(round.id, round)
      push.push(round)
      continue
    }
    // Při shodě časů zůstává místní verze, ale nahrávat ji není proč -
    // v cloudu je stejně stará.
    const newer = roundTimestamp(round) >= roundTimestamp(counterpart)
    merged.set(round.id, newer ? round : counterpart)
    if (roundTimestamp(round) > roundTimestamp(counterpart)) push.push(round)
  }

  for (const round of remote) {
    if (!merged.has(round.id)) merged.set(round.id, round)
  }

  return {
    local: [...merged.values()].sort((a, b) => roundTimestamp(b) - roundTimestamp(a)),
    push,
  }
}

/**
 * Vybere z kol to, které je rozehrané a naposledy se v něm zapisovalo.
 *
 * Rozehrané kolo je v cloudu obyčejné kolo bez `finishedAt`, takže se po
 * přihlášení na novém zařízení pozná právě takhle. Když jsou rozehraná dvě
 * (hrálo se na dvou zařízeních), vyhrává novější - druhé v cloudu zůstává
 * a nikam se neztratí.
 */
export function pickCurrentRound(rounds: Round[]): Round | null {
  const unfinished = rounds.filter((r) => !r.finishedAt)
  if (unfinished.length === 0) return null

  return unfinished.reduce((newest, round) =>
    roundTimestamp(round) > roundTimestamp(newest) ? round : newest,
  )
}

/** Dohraná kola pro archiv, seřazená od nejnovějšího. */
export function finishedRounds(rounds: Round[]): Round[] {
  return rounds
    .filter((r) => r.finishedAt)
    .sort((a, b) => roundTimestamp(b) - roundTimestamp(a))
}

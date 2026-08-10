import type { BonusId, PlayerId, Round } from '../types'

/**
 * Převod kola do podoby, kterou Firestore přijme, a zpět.
 *
 * **Firestore neumí uložit pole uvnitř pole.** `Round.bonuses` je přitom
 * `bonuses[hráč][jamka] = seznam bonusů`, tedy pole polí - zápis takového
 * dokumentu skončí chybou `invalid-argument`. V dokumentu se proto jamky
 * ukládají jako mapa, kde klíčem je číslo jamky:
 *
 *   v aplikaci   bonuses.p1 = [[], ['longest'], []]
 *   v dokumentu  bonuses.p1 = { "1": ['longest'] }
 *
 * Prázdné jamky se vynechávají, takže dokument zůstává malý.
 *
 * Zbytek modelu je pro Firestore v pořádku: `scores` i `pars` jsou pole
 * jednoduchých hodnot a `teams` je pole objektů (pole uvnitř objektu vadí
 * nemusí).
 *
 * Druhá past se stejnou chybou je `undefined` v jakémkoli poli – od toho je
 * `forFirestore()`.
 *
 * Modul je schválně bez jediného odkazu na Firebase, aby šel testovat.
 */

/**
 * Hodnota bez `undefined`, kterou Firestore přijme.
 *
 * **Firestore odmítne `undefined` v jakémkoli poli** – celý zápis skončí
 * chybou `invalid-argument`, stejnou jako u pole uvnitř pole. A `undefined` se
 * do dat dostane snadno a záměrně: `normalizeCourse()` zapisuje
 * `loops: undefined`, aby přebilo poškozené smyčky z uložené kopie, a
 * `copyAsPrivateCourse()` totéž s `catalogUpdatedAt`. V paměti je to správně –
 * hodnota musí přebít to, co přišlo ze spreadu – jen se to nesmí poslat dál.
 *
 * Kolo tenhle problém nemá: `toDocument()` ho posílá přes JSON, které
 * `undefined` zahodí samo. Předvolby se ale skládají z živých objektů
 * (hřiště, seznam hráčů, nastavení), takže potřebují tohle.
 *
 * Prvky pole se nezahazují, jen se z `undefined` stane `null`: vyhozením by se
 * posunuly indexy a `pars[3]` by přestal být par čtvrté jamky.
 */
export function forFirestore<T>(value: T): T {
  return strip(value) as T
}

function strip(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => (item === undefined ? null : strip(item)))
  }
  if (value === null || typeof value !== 'object') return value

  const result: Record<string, unknown> = {}
  for (const [key, item] of Object.entries(value)) {
    if (item === undefined) continue
    result[key] = strip(item)
  }
  return result
}

/** Kola z aplikace do tvaru pro Firestore. */
export function encodeBonuses(
  bonuses: Record<PlayerId, BonusId[][]> | undefined,
): Record<PlayerId, Record<string, BonusId[]>> {
  const encoded: Record<PlayerId, Record<string, BonusId[]>> = {}

  for (const [playerId, holes] of Object.entries(bonuses ?? {})) {
    const byHole: Record<string, BonusId[]> = {}
    ;(holes ?? []).forEach((list, hole) => {
      if (Array.isArray(list) && list.length > 0) byHole[String(hole)] = list
    })
    encoded[playerId] = byHole
  }

  return encoded
}

/**
 * Zpátky do tvaru, se kterým pracuje aplikace.
 *
 * Zvládne i podobu pole polí, kdyby se někde objevil dokument uložený jinak -
 * cizí data nemají shodit zápis skóre.
 */
export function decodeBonuses(
  raw: unknown,
  holeCount: number,
): Record<PlayerId, BonusId[][]> {
  const decoded: Record<PlayerId, BonusId[][]> = {}
  if (!raw || typeof raw !== 'object') return decoded

  const holes = Math.max(0, holeCount)

  for (const [playerId, value] of Object.entries(raw as Record<string, unknown>)) {
    const perHole = Array.from({ length: holes }, () => [] as BonusId[])

    if (Array.isArray(value)) {
      value.forEach((list, hole) => {
        if (hole < holes && Array.isArray(list)) perHole[hole] = list as BonusId[]
      })
    } else if (value && typeof value === 'object') {
      for (const [hole, list] of Object.entries(value as Record<string, unknown>)) {
        const index = Number(hole)
        if (
          Number.isInteger(index) &&
          index >= 0 &&
          index < holes &&
          Array.isArray(list)
        ) {
          perHole[index] = list as BonusId[]
        }
      }
    }

    decoded[playerId] = perHole
  }

  return decoded
}

/**
 * Kolo připravené k zápisu do Firestore.
 *
 * Průchod JSONem zbaví dokument hodnot `undefined`, které Firestore také
 * neumí; `bonuses` se navíc přepíše do mapové podoby.
 */
export function toDocument(round: Round): Record<string, unknown> {
  const plain = JSON.parse(JSON.stringify(round)) as Record<string, unknown>
  return { ...plain, bonuses: encodeBonuses(round.bonuses) }
}

/** Dokument z Firestore zpátky do tvaru kola. */
export function fromDocument(data: unknown): unknown {
  if (!data || typeof data !== 'object') return data

  const document = data as Record<string, unknown>
  const holeCount = typeof document.holeCount === 'number' ? document.holeCount : 0

  return { ...document, bonuses: decodeBonuses(document.bonuses, holeCount) }
}

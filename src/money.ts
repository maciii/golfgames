import type { Currency, Round } from './types'
import { playerName } from './types'

/**
 * Přepočet bodů na peníze.
 *
 * Rozlišují se dva způsoby podle toho, jestli se hraje ve dvojicích:
 *
 * **Dvojice** (Best Aggregate, four-ball match play) - spočítá se rozdíl bodů
 * obou dvojic a ten se přepočte na peníze. Takhle spočítanou částku pak platí
 * *každý* hráč prohrávající dvojice svému protějšku ve vítězné dvojici. Při
 * rozdílu 7 bodů a desetikoruně za bod tedy platí první hráč 70 Kč prvnímu
 * soupeři a druhý hráč 70 Kč druhému soupeři; dvojice dohromady dostane 140 Kč.
 *
 * **Jednotlivci** (Skins, match play dvou hráčů) - každý bod navíc inkasuje
 * hráč od každého soupeře zvlášť. Součet všech částek je nula.
 */

/** Strana vyrovnání - dvojice, nebo jednotlivec. */
export interface SettlementParty {
  id: string
  name: string
  /** Body, skiny nebo vyhrané jamky - podle hry. */
  units: number
}

/** Čistý zůstatek hráče: kladné číslo dostává, záporné platí. */
export interface Balance {
  id: string
  name: string
  amount: number
}

/** Konkrétní platba mezi dvěma hráči. */
export interface Transfer {
  fromId: string
  fromName: string
  toId: string
  toName: string
  amount: number
}

export type Settlement =
  | { kind: 'none' }
  | { kind: 'balances'; rows: Balance[]; summary: string }
  | {
      kind: 'transfers'
      transfers: Transfer[]
      /** Kolik platí jeden hráč prohrávající dvojice. */
      perPlayer: number
      /** Rozdíl bodů mezi dvojicemi. */
      unitDiff: number
      summary: string
    }

/**
 * Zůstatky jednotlivců.
 *
 * Pro hráče i platí: amount = hodnota bodu × (body_i × (n−1) − součet ostatních).
 * Při dvou hráčích se výraz zjednoduší na rozdíl bodů × hodnota bodu.
 */
export function balances(parties: SettlementParty[], pointValue: number): Balance[] {
  const total = parties.reduce((sum, p) => sum + p.units, 0)
  const others = parties.length - 1

  return parties.map((party) => ({
    id: party.id,
    name: party.name,
    amount: pointValue * (party.units * others - (total - party.units)),
  }))
}

/**
 * Sestaví vyrovnání pro celé kolo.
 *
 * Strany dostává z výsledkové tabulky hry, takže funguje stejně pro body,
 * skiny i vyhrané jamky.
 */
export function settleRound(round: Round, parties: SettlementParty[]): Settlement {
  const { pointValue, currency } = round.settings
  if (pointValue <= 0 || parties.length < 2) return { kind: 'none' }

  const teams = round.teams
  // Dvojice se vyrovnávají po hráčích jen tehdy, když jsou strany opravdu
  // dvě stejně velké dvojice - jinak spadneme na zůstatky jednotlivců.
  const isPairGame =
    parties.length === 2 &&
    teams.length === 2 &&
    parties.every((p) => teams.some((t) => t.id === p.id)) &&
    teams[0]?.playerIds.length === teams[1]?.playerIds.length

  if (!isPairGame) {
    const rows = balances(parties, pointValue)
    const summary = rows.every((r) => r.amount === 0)
      ? 'Nikdo nikomu nic nedluží.'
      : 'Každý bod navíc platí každý ze soupeřů zvlášť.'
    return { kind: 'balances', rows, summary }
  }

  const [first, second] = parties as [SettlementParty, SettlementParty]
  const unitDiff = Math.abs(first.units - second.units)
  const perPlayer = unitDiff * pointValue

  if (perPlayer === 0) {
    return {
      kind: 'transfers',
      transfers: [],
      perPlayer: 0,
      unitDiff: 0,
      summary: 'Nerozhodně, nikdo nikomu nic nedluží.',
    }
  }

  const winner = first.units > second.units ? first : second
  const loser = winner === first ? second : first
  const winnerTeam = teams.find((t) => t.id === winner.id)
  const loserTeam = teams.find((t) => t.id === loser.id)

  // Protějšky se párují podle pořadí ve dvojici: první platí prvnímu.
  const transfers: Transfer[] = (loserTeam?.playerIds ?? []).map((fromId, index) => {
    const toId = winnerTeam?.playerIds[index] ?? ''
    return {
      fromId,
      fromName: playerName(round, fromId),
      toId,
      toName: playerName(round, toId),
      amount: perPlayer,
    }
  })

  return {
    kind: 'transfers',
    transfers,
    perPlayer,
    unitDiff,
    summary:
      `Rozdíl ${unitDiff} b. × ${formatMoney(pointValue, currency)} = ` +
      `${formatMoney(perPlayer, currency)}, které platí každý hráč zvlášť.`,
  }
}

/**
 * Formátuje částku včetně měny; záporné částky nechává se znaménkem.
 *
 * Celé částky se píšou bez desetinných míst ("60 Kč"), necelé vždy na dvě
 * ("12,50 €") - půlka haléře by u sázky vypadala jako chyba.
 */
export function formatMoney(amount: number, currency: Currency): string {
  const fractionDigits = Number.isInteger(amount) ? 0 : 2
  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(amount)
}

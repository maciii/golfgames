import type { Currency, Round } from './types'
import { playerName } from './types'
import { localeTag, t } from './i18n'

/**
 * Přepočet bodů na peníze.
 *
 * Rozlišují se dva způsoby podle toho, jestli se hraje ve dvojicích:
 *
 * **Dvojice** (Best + Součet, four-ball match play) - spočítá se rozdíl bodů
 * obou dvojic a ten se přepočte na peníze. Takhle spočítanou částku pak platí
 * *každý* hráč prohrávající dvojice svému protějšku ve vítězné dvojici. Při
 * rozdílu 7 bodů a desetikoruně za bod tedy platí první hráč 70 Kč prvnímu
 * soupeři a druhý hráč 70 Kč druhému soupeři; dvojice dohromady dostane 140 Kč.
 *
 * **Jednotlivci** (Skins, match play dvou hráčů) - čisté zůstatky vznikají
 * z vyrovnání vůči každému soupeři zvlášť. UI nabízí přímé platby i jejich
 * sloučení do nejmenšího možného počtu převodů; součet zůstatků je nula.
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
  | {
      kind: 'balances'
      rows: Balance[]
      /** Přímé vyrovnání každého rozdílu mezi dvojicí hráčů. */
      transfers: Transfer[]
      /** Stejné zůstatky vyrovnané nejmenším možným počtem plateb. */
      optimizedTransfers: Transfer[]
      summary: string
    }
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

/** Vypíše každý dluh mezi dvojicí jednotlivců zvlášť. */
export function pairwiseTransfers(
  parties: SettlementParty[],
  pointValue: number,
): Transfer[] {
  const transfers: Transfer[] = []

  for (let firstIndex = 0; firstIndex < parties.length; firstIndex++) {
    const first = parties[firstIndex]
    if (!first) continue

    for (let secondIndex = firstIndex + 1; secondIndex < parties.length; secondIndex++) {
      const second = parties[secondIndex]
      if (!second || first.units === second.units) continue

      const winner = first.units > second.units ? first : second
      const loser = winner === first ? second : first
      transfers.push({
        fromId: loser.id,
        fromName: loser.name,
        toId: winner.id,
        toName: winner.name,
        amount: Math.abs(first.units - second.units) * pointValue,
      })
    }
  }

  return transfers
}

/**
 * Najde vyrovnání s nejmenším počtem převodů.
 *
 * Hráčů jsou nejvýše čtyři, takže lze projít všechny možné protějšky bez
 * složitého optimalizačního modelu. Každý krok vynuluje alespoň jeden
 * zůstatek, a hledání si pamatuje nejkratší nalezené řešení.
 */
export function optimizedTransfers(
  parties: SettlementParty[],
  pointValue: number,
): Transfer[] {
  const epsilon = 1e-9
  const remaining = balances(parties, pointValue).map((balance) => ({
    balance: Math.abs(balance.amount) < epsilon ? 0 : balance.amount,
    party: balance,
  }))
  let best: Transfer[] | null = null

  function search(state: typeof remaining, transfers: Transfer[]): void {
    if (best && transfers.length >= best.length) return

    const firstIndex = state.findIndex((entry) => Math.abs(entry.balance) >= epsilon)
    if (firstIndex < 0) {
      best = transfers
      return
    }

    const first = state[firstIndex]
    if (!first) return

    for (let secondIndex = firstIndex + 1; secondIndex < state.length; secondIndex++) {
      const second = state[secondIndex]
      if (!second || first.balance * second.balance >= 0) continue

      const amount = Math.min(Math.abs(first.balance), Math.abs(second.balance))
      const next = state.map((entry) => ({ ...entry }))
      const firstNext = next[firstIndex]
      const secondNext = next[secondIndex]
      if (!firstNext || !secondNext) continue

      let transfer: Transfer
      if (first.balance < 0) {
        firstNext.balance += amount
        secondNext.balance -= amount
        transfer = {
          fromId: first.party.id,
          fromName: first.party.name,
          toId: second.party.id,
          toName: second.party.name,
          amount,
        }
      } else {
        firstNext.balance -= amount
        secondNext.balance += amount
        transfer = {
          fromId: second.party.id,
          fromName: second.party.name,
          toId: first.party.id,
          toName: first.party.name,
          amount,
        }
      }

      search(next, [...transfers, transfer])
    }
  }

  search(remaining, [])
  return best ?? []
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
    // Přímé převody zůstávají výchozí kvůli průhlednosti; optimalizované jsou
    // alternativní rozpis pro skupiny, které chtějí méně skutečných plateb.
    const rows = balances(parties, pointValue)
    const transfers = pairwiseTransfers(parties, pointValue)
    const optimized = optimizedTransfers(parties, pointValue)
    const summary = rows.every((r) => r.amount === 0)
      ? t('money.nobodyOwes')
      : t('money.eachOpponent')
    return { kind: 'balances', rows, transfers, optimizedTransfers: optimized, summary }
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
      summary: t('money.draw'),
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
    summary: t('money.transfers', {
      units: unitDiff,
      value: formatMoney(pointValue, currency),
      amount: formatMoney(perPlayer, currency),
    }),
  }
}

/**
 * Vyrovnání několika **nezávislých** her v jednom kole.
 *
 * Dvě jamkovky ve flightu nejsou jedna hra o čtyřech hráčích: hráči ze dvou
 * různých zápasů si nemají co platit. Každá skupina se proto spočítá sama za
 * sebe a přehledy se slepí do jednoho - výsledek je tvarem k nerozeznání od
 * běžných zůstatků, takže obrazovka výsledků nic dalšího řešit nemusí.
 *
 * Skupina o méně než dvou stranách se zahodí; není proti komu se vyrovnávat.
 */
export function settleGroups(round: Round, groups: SettlementParty[][]): Settlement {
  const { pointValue } = round.settings
  const usable = groups.filter((group) => group.length >= 2)
  if (pointValue <= 0 || usable.length === 0) return { kind: 'none' }

  const rows = usable.flatMap((group) => balances(group, pointValue))
  const transfers = usable.flatMap((group) => pairwiseTransfers(group, pointValue))
  const optimized = usable.flatMap((group) => optimizedTransfers(group, pointValue))

  return {
    kind: 'balances',
    rows,
    transfers,
    optimizedTransfers: optimized,
    summary: rows.every((row) => row.amount === 0)
      ? t('money.nobodyOwes')
      : t('money.perGroup'),
  }
}

/**
 * Jsou dva rozpisy plateb stejné?
 *
 * U dvou hráčů nebo u nezávislých zápasů vyjde optimalizované vyrovnání stejně
 * jako přímé platby - a nabízet přepínač mezi dvěma totožnými seznamy je jen
 * šum. Při jiném pořadí stejných platebních příkazů se přepínač nabídne;
 * to nikomu neublíží a nestojí to za složitější porovnání.
 */
export function transfersEqual(first: Transfer[], second: Transfer[]): boolean {
  if (first.length !== second.length) return false
  return first.every((transfer, index) => {
    const other = second[index]
    return (
      other !== undefined &&
      transfer.fromId === other.fromId &&
      transfer.toId === other.toId &&
      Math.abs(transfer.amount - other.amount) < 1e-9
    )
  })
}

/**
 * Formátuje částku včetně měny; záporné částky nechává se znaménkem.
 *
 * Celé částky se píšou bez desetinných míst ("60 Kč"), necelé vždy na dvě
 * ("12,50 €") - půlka haléře by u sázky vypadala jako chyba.
 */
export function formatMoney(amount: number, currency: Currency): string {
  const fractionDigits = Number.isInteger(amount) ? 0 : 2
  return new Intl.NumberFormat(localeTag(), {
    style: 'currency',
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(amount)
}

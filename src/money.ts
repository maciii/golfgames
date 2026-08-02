import type { Currency } from './types'

/**
 * Přepočet bodů na peníze.
 *
 * Model je jednoduchý a sedí na všechny hry: každý bod, který má strana
 * navíc oproti soupeři, jí soupeř zaplatí. U dvou stran (dvě dvojice, dva
 * hráči v match play) to je prostě rozdíl bodů krát hodnota bodu.
 *
 * U tří a čtyř hráčů (Skins) se stejný princip uplatní vůči každému
 * soupeři zvlášť - kdo bere skin, inkasuje ho od všech ostatních. Součet
 * všech částek je proto vždy nula.
 */

export interface SettlementParty {
  id: string
  name: string
  /** Body, skiny nebo vyhrané jamky - podle hry. */
  units: number
}

export interface SettlementRow extends SettlementParty {
  /** Kladné číslo = strana dostává, záporné = platí. */
  amount: number
}

/**
 * Rozdělí peníze mezi strany.
 *
 * Pro stranu i platí: amount = hodnota bodu × (units_i × (n−1) − Σ units_ostatní).
 * Při dvou stranách se výraz zjednoduší na rozdíl bodů × hodnota bodu.
 */
export function settle(parties: SettlementParty[], pointValue: number): SettlementRow[] {
  const total = parties.reduce((sum, p) => sum + p.units, 0)
  const others = parties.length - 1

  return parties.map((party) => ({
    ...party,
    amount: pointValue * (party.units * others - (total - party.units)),
  }))
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

/**
 * Věta popisující, kdo komu platí. U dvou stran je konkrétní, u víc hráčů
 * jen vysvětlí princip - jednotlivé částky jsou vidět v tabulce.
 */
export function settlementSummary(rows: SettlementRow[], currency: Currency): string {
  if (rows.every((row) => row.amount === 0)) return 'Nikdo nikomu nic nedluží.'

  if (rows.length === 2) {
    const [winner, loser] = [...rows].sort((a, b) => b.amount - a.amount)
    if (!winner || !loser) return ''
    const units = Math.abs(winner.units - loser.units)
    return `${loser.name} platí ${winner.name} ${formatMoney(winner.amount, currency)} (rozdíl ${units} b.).`
  }

  return 'Každý bod navíc platí každý ze soupeřů zvlášť.'
}

import { useRef, useState } from 'react'
import type { ImportMode, ImportSummary } from '../backup'
import { applyBackup, backupFileName, createBackup, parseBackup } from '../backup'
import { APP_VERSION } from '../version'

interface Props {
  /** Zavolá se po úspěšném importu, ať aplikace načte nový stav z úložiště. */
  onImported: () => void
  onBack: () => void
}

/** Hlášky k důvodům, proč soubor nešel načíst. */
const PARSE_ERROR: Record<'invalid' | 'tooNew', string> = {
  invalid: 'Tenhle soubor není záloha Golf Games, nebo je poškozený.',
  tooNew: 'Záloha pochází z novější verze aplikace. Aktualizuj aplikaci a zkus to znovu.',
}

/**
 * Záloha dat do souboru a obnova z něj.
 *
 * Data aplikace jsou jen v telefonu, takže tohle je jediná cesta, jak je dostat
 * ven - před výměnou zařízení nebo prostě pro klid.
 */
export default function BackupScreen({ onImported, onBack }: Props) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Režim se vybere před otevřením dialogu, ať se uživatel nerozhoduje
  // až nad hotovým souborem.
  const [mode, setMode] = useState<ImportMode>('merge')

  function download() {
    setError(null)
    const json = JSON.stringify(createBackup(), null, 2)
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = backupFileName()
    link.click()
    // Bez uvolnění by objekt držel data v paměti až do zavření karty.
    URL.revokeObjectURL(url)
    setMessage('Záloha se stáhla.')
  }

  function summaryText(summary: ImportSummary): string {
    const parts = [`V archivu je ${summary.archive} kol`]
    if (summary.added > 0) parts.push(`z toho ${summary.added} nových`)
    if (summary.currentRoundReplaced) parts.push('obnovilo se i rozehrané kolo')
    return `${parts.join(', ')}.`
  }

  async function handleFile(file: File) {
    setMessage(null)
    setError(null)

    const result = parseBackup(await file.text())
    if (!result.ok) {
      setError(PARSE_ERROR[result.reason])
      return
    }

    const rounds = result.backup.data.archive.length
    const question =
      mode === 'replace'
        ? `Nahradit všechna data zálohou z ${result.backup.exportedAt.slice(0, 10)}? Současná kola se smažou. Záloha obsahuje ${rounds} kol.`
        : `Sloučit zálohu z ${result.backup.exportedAt.slice(0, 10)} se současnými daty? Nic se nesmaže, záloha obsahuje ${rounds} kol.`
    if (!confirm(question)) return

    setMessage(summaryText(applyBackup(result.backup, mode)))
    onImported()
  }

  return (
    <div className="screen">
      <header className="app-header">
        <h1>Záloha dat</h1>
        <p className="subtitle">Export a obnova</p>
      </header>

      <main className="content">
        <p className="hint">
          Kola, hráči i nastavení jsou uložená jen v tomhle zařízení. Zálohou si je
          odneseš do souboru – před výměnou telefonu nebo jen pro jistotu.
        </p>

        <section className="section">
          <h2 className="section-title">Zálohovat</h2>
          <button type="button" className="primary-button" onClick={download}>
            Stáhnout zálohu
          </button>
          <p className="hint">
            Uloží se jeden soubor JSON se vším: rozehrané kolo, archiv, seznam hráčů i
            nastavení bodování. Na iPhonu se soubor nabídne přes sdílení – ulož ho třeba
            do Souborů nebo si ho pošli e-mailem.
          </p>
        </section>

        <section className="section">
          <h2 className="section-title">Obnovit ze zálohy</h2>

          <div className="segmented">
            <button
              type="button"
              className={`segment${mode === 'merge' ? ' selected' : ''}`}
              onClick={() => setMode('merge')}
              aria-pressed={mode === 'merge'}
            >
              Sloučit
            </button>
            <button
              type="button"
              className={`segment${mode === 'replace' ? ' selected' : ''}`}
              onClick={() => setMode('replace')}
              aria-pressed={mode === 'replace'}
            >
              Nahradit vše
            </button>
          </div>

          <p className="hint">
            {mode === 'merge'
              ? 'Kola ze zálohy se přidají k těm současným a nic se nesmaže. Rozehrané kolo zůstane to současné.'
              : 'Všechna současná data se zahodí a nahradí obsahem zálohy. Hodí se na novém zařízení.'}
          </p>

          <button
            type="button"
            className="secondary-button"
            onClick={() => fileInput.current?.click()}
          >
            Vybrat soubor se zálohou
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="file-input"
            onChange={(e) => {
              const file = e.target.files?.[0]
              // Reset hodnoty, ať jde stejný soubor vybrat i podruhé.
              e.target.value = ''
              if (file) void handleFile(file)
            }}
          />
        </section>

        {message && <p className="notice">{message}</p>}
        {error && <p className="notice error">{error}</p>}
      </main>

      <footer className="app-footer">
        <button type="button" className="primary-button" onClick={onBack}>
          Zpět
        </button>
        <p className="version">verze {APP_VERSION}</p>
      </footer>
    </div>
  )
}

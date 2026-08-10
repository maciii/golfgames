import { useRef, useState } from 'react'
import type { ImportMode, ImportSummary } from '../backup'
import { applyBackup, backupFileName, createBackup, parseBackup } from '../backup'
import { useT } from '../i18n'
import type { MessageKey } from '../i18n'
import { BackIcon } from './icons'

interface Props {
  /** Zavolá se po úspěšném importu, ať aplikace načte nový stav z úložiště. */
  onImported: () => void
  onBack: () => void
}

/** Hlášky k důvodům, proč soubor nešel načíst. */
const PARSE_ERROR: Record<'invalid' | 'tooNew', MessageKey> = {
  invalid: 'backup.errorInvalid',
  tooNew: 'backup.errorTooNew',
}

/**
 * Záloha dat do souboru a obnova z něj.
 *
 * Data aplikace jsou jen v telefonu, takže tohle je jediná cesta, jak je dostat
 * ven - před výměnou zařízení nebo prostě pro klid.
 */
export default function BackupScreen({ onImported, onBack }: Props) {
  const t = useT()
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
    setMessage(t('backup.downloaded'))
  }

  function summaryText(summary: ImportSummary): string {
    const parts = [t('backup.summary', { count: summary.archive })]
    if (summary.added > 0) parts.push(t('backup.summaryAdded', { count: summary.added }))
    if (summary.currentRoundReplaced) parts.push(t('backup.summaryCurrent'))
    return `${parts.join(', ')}.`
  }

  async function handleFile(file: File) {
    setMessage(null)
    setError(null)

    const result = parseBackup(await file.text())
    if (!result.ok) {
      setError(t(PARSE_ERROR[result.reason]))
      return
    }

    const params = {
      date: result.backup.exportedAt.slice(0, 10),
      count: result.backup.data.archive.length,
    }
    const question =
      mode === 'replace'
        ? t('backup.replaceConfirm', params)
        : t('backup.mergeConfirm', params)
    if (!confirm(question)) return

    setMessage(summaryText(applyBackup(result.backup, mode)))
    onImported()
  }

  return (
    <div className="screen">
      <header className="app-header">
        <div className="screen-header-row">
          <button
            type="button"
            className="icon-button"
            onClick={onBack}
            aria-label={t('common.back')}
          >
            <BackIcon />
          </button>
          <h1>{t('backup.title')}</h1>
        </div>
        <p className="subtitle">{t('backup.subtitle')}</p>
      </header>

      <main className="content">
        <p className="hint">{t('backup.intro')}</p>

        <section className="card section">
          <h2 className="section-title">{t('backup.exportTitle')}</h2>
          <button type="button" className="primary-button" onClick={download}>
            {t('backup.download')}
          </button>
          <p className="hint">{t('backup.downloadHint')}</p>
        </section>

        <section className="card section">
          <h2 className="section-title">{t('backup.importTitle')}</h2>

          <div className="segmented">
            <button
              type="button"
              className={`segment${mode === 'merge' ? ' selected' : ''}`}
              onClick={() => setMode('merge')}
              aria-pressed={mode === 'merge'}
            >
              {t('backup.merge')}
            </button>
            <button
              type="button"
              className={`segment${mode === 'replace' ? ' selected' : ''}`}
              onClick={() => setMode('replace')}
              aria-pressed={mode === 'replace'}
            >
              {t('backup.replace')}
            </button>
          </div>

          <p className="hint">
            {mode === 'merge' ? t('backup.mergeHint') : t('backup.replaceHint')}
          </p>

          <button
            type="button"
            className="secondary-button"
            onClick={() => fileInput.current?.click()}
          >
            {t('backup.choose')}
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
    </div>
  )
}

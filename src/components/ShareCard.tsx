import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n/I18nProvider'
import { drawShareCard, SHARE_HEIGHT, SHARE_WIDTH, type ShareCardData } from '../lib/share-card'
import { ShareIcon } from './icons'

type State = { status: 'idle' } | { status: 'loading' } | { status: 'ready'; blob: Blob; url: string } | { status: 'error' }

/** Botão "Compartilhar imagem": gera o PNG, mostra a prévia e oferece baixar ou compartilhar. */
export function ShareCardButton({ data, fileName }: { data: ShareCardData; fileName: string }) {
  const { t } = useI18n()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [state, setState] = useState<State>({ status: 'idle' })
  const file = `${fileName}-dexpedition.png`

  // Libera a URL temporária da prévia ao trocar de imagem ou sair da página.
  const previewUrl = state.status === 'ready' ? state.url : null
  useEffect(() => () => void (previewUrl && URL.revokeObjectURL(previewUrl)), [previewUrl])

  const open = async () => {
    dialogRef.current?.showModal()
    setState({ status: 'loading' })
    try {
      const blob = await drawShareCard(data)
      setState({ status: 'ready', blob, url: URL.createObjectURL(blob) })
    } catch {
      setState({ status: 'error' })
    }
  }

  const close = () => dialogRef.current?.close()

  const download = () => {
    if (state.status !== 'ready') return
    const a = document.createElement('a')
    a.href = state.url
    a.download = file
    a.click()
  }

  const shareFile = state.status === 'ready' ? new File([state.blob], file, { type: 'image/png' }) : null
  // Celulares compartilham o arquivo direto (WhatsApp, Instagram...); no PC o botão de baixar basta.
  const canShare = !!shareFile && typeof navigator.canShare === 'function' && navigator.canShare({ files: [shareFile] })

  const share = async () => {
    if (!shareFile) return
    try {
      await navigator.share({ files: [shareFile], title: data.name })
    } catch {
      // Cancelado pelo usuário: nada a fazer.
    }
  }

  return (
    <>
      <button type="button" className="btn block ghost-link" onClick={() => void open()}>
        <ShareIcon />
        {t.share.button}
      </button>
      <dialog ref={dialogRef} className="share-dialog" aria-label={t.share.title} onClose={() => setState({ status: 'idle' })}>
        <div className="share-head">
          <h2 className="card-title">{t.share.title}</h2>
          <button type="button" className="share-close" onClick={close} aria-label={t.share.close}>
            ×
          </button>
        </div>
        <div className="share-preview" style={{ aspectRatio: `${SHARE_WIDTH} / ${SHARE_HEIGHT}` }}>
          {state.status === 'ready' && <img src={state.url} alt={t.share.previewAlt(data.name)} />}
          {state.status === 'loading' && <span className="caption">{t.share.loading}</span>}
          {state.status === 'error' && <span className="caption">{t.share.error}</span>}
        </div>
        <div className="share-actions">
          {canShare && (
            <button type="button" className="btn primary" onClick={() => void share()}>
              {t.share.share}
            </button>
          )}
          <button type="button" className={canShare ? 'btn' : 'btn primary'} onClick={download} disabled={state.status !== 'ready'}>
            {t.share.download}
          </button>
        </div>
      </dialog>
    </>
  )
}

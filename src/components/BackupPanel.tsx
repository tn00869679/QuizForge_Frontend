import { useRef, useState, type ChangeEvent } from 'react'
import { store } from '../store/local'

export default function BackupPanel() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  const handleExport = () => {
    const json = store.exportJSON()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'quizforge-backup.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleImportFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    // 清空 input value,讓同一檔可再次觸發 onChange
    e.target.value = ''
    if (!file) return
    try {
      const text = await file.text()
      const result = store.importJSON(text)
      if (result.ok) {
        setMessage({ kind: 'ok', text: '匯入成功,重新載入中…' })
        location.reload()
      } else {
        setMessage({ kind: 'error', text: result.error ?? '匯入失敗' })
      }
    } catch (err) {
      setMessage({ kind: 'error', text: err instanceof Error ? err.message : '讀取檔案失敗' })
    }
  }

  return (
    <div className="card pv-backup">
      <h3 className="pv-backup__title">本機備份</h3>
      <div className="pv-backup__actions">
        <button type="button" className="btn" onClick={handleExport}>
          匯出 JSON
        </button>
        <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
          匯入 JSON
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="pv-backup__file"
          onChange={handleImportFile}
        />
      </div>
      {message && (
        <p className={message.kind === 'error' ? 'pv-backup__msg pv-backup__msg--error' : 'pv-backup__msg'}>
          {message.text}
        </p>
      )}
    </div>
  )
}

import type { UserStats, AnswerKey } from '../api/types'

export interface LocalAttempt {
  selected: AnswerKey | null
  is_correct: boolean
  is_marked_uncertain: boolean
  is_favorite: boolean
  mode: 'practice' | 'exam'
  ts: number   // Date.now()
}

export interface LocalSettings {
  // 上次練習篩選,全選填
  category_id?: number
  subject_id?: number[]
  session_ids?: number[]
  status?: 'unanswered' | 'wrong' | 'favorite'
  limit?: '5' | '10' | '20' | '50' | 'all'
  keyword?: string
}

export interface LocalBackup { version: 1; attempts: Record<number, LocalAttempt>; settings: LocalSettings }

const KEY_ATTEMPTS = 'quizforge:attempts'
const KEY_SETTINGS = 'quizforge:settings'

// In-memory fallbacks for SSR / private-mode environments where localStorage is unavailable.
let memAttempts: Record<number, LocalAttempt> = {}
let memSettings: LocalSettings = {}
let storageAvailable = true

function tryRead(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    storageAvailable = false
    return null
  }
}

function tryWrite(key: string, value: string): void {
  if (!storageAvailable) return
  try {
    localStorage.setItem(key, value)
  } catch {
    storageAvailable = false
  }
}

function tryRemove(key: string): void {
  if (!storageAvailable) return
  try {
    localStorage.removeItem(key)
  } catch {
    storageAvailable = false
  }
}

function readAttempts(): Record<number, LocalAttempt> {
  const raw = tryRead(KEY_ATTEMPTS)
  if (raw == null) return storageAvailable ? {} : memAttempts
  try {
    return JSON.parse(raw) as Record<number, LocalAttempt>
  } catch {
    return {}
  }
}

function writeAttempts(attempts: Record<number, LocalAttempt>): void {
  if (storageAvailable) {
    tryWrite(KEY_ATTEMPTS, JSON.stringify(attempts))
  } else {
    memAttempts = attempts
  }
}

function readSettings(): LocalSettings {
  const raw = tryRead(KEY_SETTINGS)
  if (raw == null) return storageAvailable ? {} : memSettings
  try {
    return JSON.parse(raw) as LocalSettings
  } catch {
    return {}
  }
}

function writeSettings(s: LocalSettings): void {
  if (storageAvailable) {
    tryWrite(KEY_SETTINGS, JSON.stringify(s))
  } else {
    memSettings = s
  }
}

export const store = {
  getAllAttempts(): Record<number, LocalAttempt> {
    return readAttempts()
  },

  getAttempt(qid: number): LocalAttempt | undefined {
    return readAttempts()[qid]
  },

  recordAnswer(
    qid: number,
    selected: AnswerKey,
    isCorrect: boolean,
    mode: 'practice' | 'exam',
  ): LocalAttempt {
    const attempts = readAttempts()
    const existing = attempts[qid]
    const updated: LocalAttempt = {
      selected,
      is_correct: isCorrect,
      is_marked_uncertain: existing?.is_marked_uncertain ?? false,
      is_favorite: existing?.is_favorite ?? false,
      mode,
      ts: Date.now(),
    }
    attempts[qid] = updated
    writeAttempts(attempts)
    return updated
  },

  setFavorite(qid: number, value: boolean): LocalAttempt {
    const attempts = readAttempts()
    const existing = attempts[qid]
    const updated: LocalAttempt = existing
      ? { ...existing, is_favorite: value, ts: Date.now() }
      : { selected: null, is_correct: false, is_marked_uncertain: false, is_favorite: value, mode: 'practice', ts: Date.now() }
    attempts[qid] = updated
    writeAttempts(attempts)
    return updated
  },

  setUncertain(qid: number, value: boolean): LocalAttempt {
    const attempts = readAttempts()
    const existing = attempts[qid]
    const updated: LocalAttempt = existing
      ? { ...existing, is_marked_uncertain: value, ts: Date.now() }
      : { selected: null, is_correct: false, is_marked_uncertain: value, is_favorite: false, mode: 'practice', ts: Date.now() }
    attempts[qid] = updated
    writeAttempts(attempts)
    return updated
  },

  getStats(): UserStats {
    const attempts = Object.values(readAttempts())
    const answered = attempts.filter(a => a.selected != null).length
    const correct = attempts.filter(a => a.selected != null && a.is_correct).length
    const wrong = attempts.filter(a => a.selected != null && !a.is_correct).length
    const favorites = attempts.filter(a => a.is_favorite).length
    const uncertain = attempts.filter(a => a.is_marked_uncertain).length
    return {
      answered,
      correct,
      accuracy: answered > 0 ? correct / answered : 0,
      wrong,
      favorites,
      uncertain,
    }
  },

  getIdsByStatus(status: 'wrong' | 'favorite' | 'uncertain'): number[] {
    const attempts = readAttempts()
    return (Object.entries(attempts) as [string, LocalAttempt][])
      .filter(([, a]) => {
        if (status === 'wrong') return a.selected != null && !a.is_correct
        if (status === 'favorite') return a.is_favorite
        return a.is_marked_uncertain
      })
      .sort(([, a], [, b]) => b.ts - a.ts)
      .map(([id]) => Number(id))
  },

  getSettings(): LocalSettings {
    return readSettings()
  },

  saveSettings(s: LocalSettings): void {
    writeSettings(s)
  },

  clearAll(): void {
    tryRemove(KEY_ATTEMPTS)
    tryRemove(KEY_SETTINGS)
    memAttempts = {}
    memSettings = {}
  },

  exportJSON(): string {
    return JSON.stringify(
      { version: 1, attempts: readAttempts(), settings: readSettings() } satisfies LocalBackup,
      null,
      2,
    )
  },

  importJSON(json: string): { ok: boolean; error?: string } {
    try {
      const parsed = JSON.parse(json) as unknown
      if (
        typeof parsed !== 'object' ||
        parsed === null ||
        (parsed as LocalBackup).version !== 1 ||
        typeof (parsed as LocalBackup).attempts !== 'object' ||
        (parsed as LocalBackup).attempts === null
      ) {
        return { ok: false, error: 'invalid format: version must be 1 and attempts must be an object' }
      }
      const backup = parsed as LocalBackup
      writeAttempts(backup.attempts)
      writeSettings(backup.settings ?? {})
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  },
}

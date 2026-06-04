import { useCallback, useMemo, useState } from 'react'
import type { QuestionPublic, QuestionQuery, AnswerKey } from '../api/types'
import { api, ApiError } from '../api/client'
import { store } from '../store/local'
import type { CellStatus } from '../components/QuestionGrid'

export type QuestionSetSource =
  | { type: 'filter'; query: QuestionQuery; want: number | 'all'; random: boolean }
  | { type: 'status'; status: 'wrong' | 'favorite' | 'uncertain'; want: number | 'all' }

export interface UseQuestionSetResult {
  questions: QuestionPublic[]
  index: number
  current: QuestionPublic | undefined
  loading: boolean
  error: string | null
  selected: string | null
  revealed: boolean
  isFavorite: boolean
  isUncertain: boolean
  explainExpanded: boolean
  statuses: CellStatus[]
  stats: { total: number; answered: number; correct: number; uncertain: number; accuracyPct: number }
  wrongList: { index: number; question: QuestionPublic }[]
  load: (source: QuestionSetSource) => Promise<void>
  goto: (i: number) => void
  next: () => void
  prev: () => void
  select: (key: AnswerKey) => void
  toggleReveal: () => void
  toggleFavorite: () => void
  toggleUncertain: () => void
  toggleExplain: () => void
}

// 依 want 截斷陣列(want==='all' 不截)
function take<T>(arr: T[], want: number | 'all'): T[] {
  return want === 'all' ? arr : arr.slice(0, Math.max(0, want))
}

// 由 id 清單抓題目(含答案),濾掉已被後端刪除(getQuestion 失敗)者
async function fetchByIds(ids: number[]): Promise<QuestionPublic[]> {
  const results = await Promise.all(ids.map((id) => api.getQuestion(id, true).catch(() => null)))
  return results.filter((q): q is QuestionPublic => q != null)
}

// 「全部」:後端 limit='all' 會退回預設 page_size(20),故需分頁抓完整題庫。
// 用穩定(非 random)分頁避免逐次 random 造成跨頁重複/遺漏。
async function fetchAllPages(query: QuestionQuery): Promise<QuestionPublic[]> {
  const pageSize = 100
  const first = await api.listQuestions({ ...query, limit: undefined, random: false, page: 1, page_size: pageSize })
  const acc = [...first.items]
  const totalPages = Math.ceil(first.total / pageSize)
  for (let p = 2; p <= totalPages; p += 1) {
    const pg = await api.listQuestions({ ...query, limit: undefined, random: false, page: p, page_size: pageSize })
    acc.push(...pg.items)
  }
  return acc
}

// Fisher-Yates 洗牌(回新陣列)
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function useQuestionSet(): UseQuestionSetResult {
  const [questions, setQuestions] = useState<QuestionPublic[]>([])
  const [index, setIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 本機暫存:看答案(未作答但手動揭曉)的 id 集合 / 目前題的解析展開
  const [revealSet, setRevealSet] = useState<Set<number>>(new Set())
  const [explainExpanded, setExplainExpanded] = useState(false)

  // 作答/收藏/不確定皆寫進 store(localStorage),用 version 觸發 re-render 讀新值
  const [version, setVersion] = useState(0)
  const bump = useCallback(() => setVersion((v) => v + 1), [])

  const load = useCallback(async (source: QuestionSetSource) => {
    setLoading(true)
    setError(null)
    try {
      let set: QuestionPublic[]

      if (source.type === 'status') {
        const ids = take(store.getIdsByStatus(source.status), source.want)
        set = await fetchByIds(ids)
      } else {
        const { query, want } = source
        if (query.status === 'wrong' || query.status === 'favorite') {
          // 後端 status filter 需 X-User-Id,本輪改用本機紀錄 + 逐題抓內容
          const ids = take(store.getIdsByStatus(query.status), want)
          set = await fetchByIds(ids)
        } else if (query.status === 'unanswered') {
          // 後端 unanswered 不可用 → 多抓一批,本機濾掉已作答者再截斷
          const page = await api.listQuestions({
            ...query,
            status: undefined,
            random: true,
            limit: undefined,
            page_size: 100,
          })
          const attempts = store.getAllAttempts()
          const answered = new Set(
            Object.entries(attempts)
              .filter(([, a]) => a.selected != null)
              .map(([id]) => Number(id)),
          )
          set = take(
            page.items.filter((q) => !answered.has(q.id)),
            want,
          )
        } else if (query.limit === 'all') {
          // 「全部」:分頁抓完整題庫;random 時 client 端洗牌
          const all = await fetchAllPages(query)
          set = source.random ? shuffle(all) : all
        } else {
          // 數字 limit / customCount(page_size):query 已含 filters/random/limit,直接用後端結果
          const page = await api.listQuestions(query)
          set = page.items
        }
      }

      setQuestions(set)
      setIndex(0)
      setRevealSet(new Set())
      setExplainExpanded(false)
    } catch (err) {
      setQuestions([])
      setError(err instanceof ApiError ? err.message : '載入題目失敗')
    } finally {
      setLoading(false)
    }
  }, [])

  const len = questions.length
  const current = questions[index]

  // 目前題的本機作答狀態(依 version 重讀)
  const attempt = useMemo(
    () => (current ? store.getAttempt(current.id) : undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [current, version],
  )

  const selected = attempt?.selected ?? null
  const isFavorite = attempt?.is_favorite ?? false
  const isUncertain = attempt?.is_marked_uncertain ?? false
  const revealed = selected != null || (current != null && revealSet.has(current.id))

  // 題號盤狀態(index-aligned):不確定優先於對錯
  const statuses = useMemo<CellStatus[]>(
    () =>
      questions.map((q) => {
        const a = store.getAttempt(q.id)
        if (a?.selected == null) return 'unanswered'
        if (a.is_marked_uncertain) return 'uncertain'
        return a.is_correct ? 'correct' : 'wrong'
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [questions, version],
  )

  const stats = useMemo(() => {
    let answered = 0
    let correct = 0
    let uncertain = 0
    for (const q of questions) {
      const a = store.getAttempt(q.id)
      if (a?.selected != null) {
        answered += 1
        if (a.is_correct) correct += 1
      }
      if (a?.is_marked_uncertain) uncertain += 1
    }
    return {
      total: len,
      answered,
      correct,
      uncertain,
      accuracyPct: answered > 0 ? Math.round((correct / answered) * 100) : 0,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions, len, version])

  const wrongList = useMemo(
    () =>
      questions
        .map((question, i) => ({ index: i, question }))
        .filter(({ question }) => {
          const a = store.getAttempt(question.id)
          return a?.selected != null && !a.is_correct
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [questions, version],
  )

  const goto = useCallback(
    (i: number) => {
      if (len === 0) return
      const clamped = Math.max(0, Math.min(len - 1, i))
      setIndex(clamped)
      setExplainExpanded(false)
    },
    [len],
  )

  const next = useCallback(() => goto(index + 1), [goto, index])
  const prev = useCallback(() => goto(index - 1), [goto, index])

  const select = useCallback(
    (key: AnswerKey) => {
      if (!current) return
      const isCorrect = key === current.answer
      store.recordAnswer(current.id, key, isCorrect, 'practice')
      // 作答後即視為已揭曉
      setRevealSet((prev) => {
        const nextSet = new Set(prev)
        nextSet.add(current.id)
        return nextSet
      })
      bump()
    },
    [current, bump],
  )

  const toggleReveal = useCallback(() => {
    if (!current) return
    setRevealSet((prev) => {
      const nextSet = new Set(prev)
      if (nextSet.has(current.id)) nextSet.delete(current.id)
      else nextSet.add(current.id)
      return nextSet
    })
  }, [current])

  const toggleFavorite = useCallback(() => {
    if (!current) return
    store.setFavorite(current.id, !isFavorite)
    bump()
  }, [current, isFavorite, bump])

  const toggleUncertain = useCallback(() => {
    if (!current) return
    store.setUncertain(current.id, !isUncertain)
    bump()
  }, [current, isUncertain, bump])

  const toggleExplain = useCallback(() => setExplainExpanded((e) => !e), [])

  return {
    questions,
    index,
    current,
    loading,
    error,
    selected,
    revealed,
    isFavorite,
    isUncertain,
    explainExpanded,
    statuses,
    stats,
    wrongList,
    load,
    goto,
    next,
    prev,
    select,
    toggleReveal,
    toggleFavorite,
    toggleUncertain,
    toggleExplain,
  }
}

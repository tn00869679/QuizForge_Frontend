import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Category, Subject, ExamSession, QuestionQuery, AnswerKey } from '../api/types'
import { api } from '../api/client'
import { store } from '../store/local'
import { useQuestionSet } from '../hooks/useQuestionSet'
import QuestionCard from '../components/QuestionCard'
import ProgressRing from '../components/ProgressRing'
import QuestionGrid from '../components/QuestionGrid'
import FilterPanel, { type FilterValue } from '../components/FilterPanel'
import BackupPanel from '../components/BackupPanel'

interface PracticeViewProps {
  mode: 'practice' | 'review'
  reviewStatus?: 'wrong' | 'favorite' | 'uncertain'
  reviewTitle?: string
}

const DEFAULT_FILTER: FilterValue = {
  subject_id: [],
  session_ids: [],
  limit: '10',
  keyword: '',
}

// 從本機設定還原上次篩選(僅取有效欄位)
function restoreFilter(): FilterValue {
  const s = store.getSettings()
  return {
    category_id: s.category_id,
    subject_id: s.subject_id ?? [],
    session_ids: s.session_ids ?? [],
    status: s.status,
    limit: s.limit ?? '10',
    keyword: s.keyword ?? '',
  }
}

// 由 FilterValue 組成 want(本次題數)
function filterToWant(value: FilterValue): number | 'all' {
  if (value.customCount !== undefined) return value.customCount
  return value.limit === 'all' ? 'all' : Number(value.limit)
}

// 由 FilterValue 組成後端 query;customCount 走 page_size,否則用 limit
function filterToQuery(value: FilterValue): QuestionQuery {
  const query: QuestionQuery = {
    category_id: value.category_id,
    subject_id: value.subject_id.length > 0 ? value.subject_id : undefined,
    session_ids: value.session_ids.length > 0 ? value.session_ids : undefined,
    keyword: value.keyword.trim() !== '' ? value.keyword.trim() : undefined,
    status: value.status,
  }
  if (value.customCount !== undefined) {
    query.page_size = value.customCount
  } else if (value.limit !== 'all') {
    query.limit = value.limit
  } else {
    query.limit = 'all'
  }
  return query
}

export default function PracticeView({ mode, reviewStatus, reviewTitle }: PracticeViewProps) {
  const qs = useQuestionSet()

  // 練習篩選用中繼資料(複習模式不載)
  const [categories, setCategories] = useState<Category[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [sessions, setSessions] = useState<ExamSession[]>([])
  const [filter, setFilter] = useState<FilterValue>(mode === 'practice' ? restoreFilter : DEFAULT_FILTER)

  const { load } = qs

  // practice:載入類別 → 預設第一類 → 該類科目/考次
  useEffect(() => {
    if (mode !== 'practice') return
    let cancelled = false
    async function loadMeta() {
      try {
        const cats = await api.listCategories()
        if (cancelled) return
        setCategories(cats)
        const first = cats[0]
        if (!first) return
        const catId = filter.category_id ?? first.id
        if (filter.category_id === undefined) {
          setFilter((f) => ({ ...f, category_id: catId }))
        }
        const [subs, sess] = await Promise.all([api.listSubjects(catId), api.listExamSessions(catId)])
        if (cancelled) return
        setSubjects(subs)
        setSessions(sess)
      } catch {
        // 中繼資料載入失敗不擋頁面,FilterPanel 會顯示空清單
      }
    }
    loadMeta()
    return () => {
      cancelled = true
    }
    // 僅 mount 載一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  // review:mount 自動載入一次
  useEffect(() => {
    if (mode !== 'review' || !reviewStatus) return
    void load({ type: 'status', status: reviewStatus, want: 'all' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, reviewStatus])

  const handleFilterChange = useCallback((v: FilterValue) => {
    setFilter(v)
    store.saveSettings({
      category_id: v.category_id,
      subject_id: v.subject_id,
      session_ids: v.session_ids,
      status: v.status,
      limit: v.limit,
      keyword: v.keyword,
    })
  }, [])

  const handleGenerate = useCallback(
    (random: boolean) => {
      void load({ type: 'filter', query: filterToQuery(filter), want: filterToWant(filter), random })
    },
    [filter, load],
  )

  const handleReviewRefresh = useCallback(() => {
    if (reviewStatus) void load({ type: 'status', status: reviewStatus, want: 'all' })
  }, [reviewStatus, load])

  // 來源標籤對照(練習模式才有 sessions/subjects;複習模式傳 undefined)
  const sessionLabel = useMemo(() => {
    if (!qs.current) return undefined
    return sessions.find((s) => s.id === qs.current!.exam_session_id)?.label
  }, [qs.current, sessions])

  const subjectName = useMemo(() => {
    if (!qs.current) return undefined
    return subjects.find((s) => s.id === qs.current!.subject_id)?.name
  }, [qs.current, subjects])

  return (
    <div className="pv">
      {/* 左欄:篩選 / 複習控制 */}
      <aside className="pv__left">
        {mode === 'practice' ? (
          <FilterPanel
            categories={categories}
            subjects={subjects}
            sessions={sessions}
            value={filter}
            onChange={handleFilterChange}
            onGenerate={() => handleGenerate(true)}
            onStartFromFirst={() => handleGenerate(false)}
          />
        ) : (
          <div className="card pv-review">
            <h3 className="pv-review__title">{reviewTitle ?? '複習'}</h3>
            <button type="button" className="btn btn-primary" onClick={handleReviewRefresh}>
              重新整理題組
            </button>
          </div>
        )}
      </aside>

      {/* 中欄:題目卡 */}
      <main className="pv__center">
        {qs.loading ? (
          <div className="card pv-status">載入中…</div>
        ) : qs.error ? (
          <div className="card pv-status pv-status--error">{qs.error}</div>
        ) : qs.current ? (
          <QuestionCard
            question={qs.current}
            index={qs.index}
            total={qs.questions.length}
            sessionLabel={sessionLabel}
            subjectName={subjectName}
            selected={qs.selected}
            revealed={qs.revealed}
            isFavorite={qs.isFavorite}
            isUncertain={qs.isUncertain}
            explainExpanded={qs.explainExpanded}
            onSelect={(key) => qs.select(key as AnswerKey)}
            onToggleFavorite={qs.toggleFavorite}
            onToggleUncertain={qs.toggleUncertain}
            onToggleReveal={qs.toggleReveal}
            onToggleExplain={qs.toggleExplain}
            onPrev={qs.prev}
            onNext={qs.next}
          />
        ) : (
          <div className="card pv-status">
            {mode === 'practice' ? '設定篩選後按「產生隨機題組」開始練習。' : '此清單目前沒有題目。'}
          </div>
        )}
      </main>

      {/* 右欄:進度 / 備份 / 快速回顧 / 題號盤 */}
      <aside className="pv__right">
        <div className="card pv-progress">
          <ProgressRing percent={qs.stats.accuracyPct} sublabel="正確率" />
          <div className="pv-progress__meta">
            <div>
              目前題組 <strong>{qs.stats.total}</strong>
            </div>
            <div>
              已完成 <strong>{qs.stats.answered}</strong>
            </div>
            <div>
              不確定 <strong>{qs.stats.uncertain}</strong>
            </div>
          </div>
        </div>

        <BackupPanel />

        {qs.wrongList.length > 0 && (
          <div className="card pv-wrong">
            <h3 className="pv-wrong__title">快速回顧(錯題)</h3>
            <ul className="pv-wrong__list">
              {qs.wrongList.map(({ index, question }) => (
                <li key={question.id}>
                  <button type="button" className="pv-wrong__item" onClick={() => qs.goto(index)}>
                    <span className="pv-wrong__num">第 {index + 1} 題</span>
                    <span className="pv-wrong__stem">{question.stem}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {qs.questions.length > 0 && (
          <div className="card pv-gridwrap">
            <h3 className="pv-gridwrap__title">題號盤</h3>
            <QuestionGrid statuses={qs.statuses} current={qs.index} onJump={qs.goto} />
          </div>
        )}
      </aside>
    </div>
  )
}

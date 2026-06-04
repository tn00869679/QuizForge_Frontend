import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type {
  AnswerKey,
  Category,
  ExamGradeResponse,
  ExamStartResponse,
} from '../api/types'
import { api, ApiError } from '../api/client'
import QuestionCard from '../components/QuestionCard'
import QuestionGrid, { type CellStatus } from '../components/QuestionGrid'
import Scorecard from '../components/Scorecard'
import { useExamTimer } from '../hooks/useExamTimer'
import './Exam.css'

type Phase = 'intro' | 'running' | 'grading' | 'result'

const PER_SUBJECT_N = 50
const DURATION_SEC = 7200 // 120 分鐘

function errMsg(err: unknown): string {
  if (err instanceof ApiError) return err.message
  if (err instanceof Error) return err.message
  return String(err)
}

// 從 exam.per_subject 反查科目名稱,供作答時來源標籤顯示。
function subjectNameFor(exam: ExamStartResponse, subjectId: number): string | undefined {
  return exam.per_subject.find((s) => s.subject_id === subjectId)?.subject
}

// ── running 子元件:隔離計時器 hook,使其只在考試階段掛載一次 ──
interface RunningViewProps {
  exam: ExamStartResponse
  answers: Map<number, AnswerKey>
  onSelect: (questionId: number, key: AnswerKey) => void
  onSubmit: () => void
  submitting: boolean
  gradeError: string | null
}

function RunningView({
  exam,
  answers,
  onSelect,
  onSubmit,
  submitting,
  gradeError,
}: RunningViewProps) {
  const { questions, total, duration_sec } = exam
  const [current, setCurrent] = useState(0)

  // 計時歸零 → onExpire 自動交卷(useExamTimer 保證只觸發一次)。
  const timer = useExamTimer({
    durationSec: duration_sec,
    onExpire: onSubmit,
    autoStart: true,
  })

  const q = questions[current]

  const goPrev = useCallback(() => setCurrent((c) => Math.max(0, c - 1)), [])
  const goNext = useCallback(
    () => setCurrent((c) => Math.min(total - 1, c + 1)),
    [total],
  )

  const answeredCount = answers.size
  const statuses: CellStatus[] = questions.map((item) =>
    answers.has(item.id) ? 'answered' : 'unanswered',
  )

  return (
    <div className="ex-running">
      <div className="ex-topbar card">
        <div
          className={
            timer.remainingSec <= 60
              ? 'ex-topbar__timer ex-topbar__timer--urgent'
              : 'ex-topbar__timer'
          }
        >
          {timer.formatted}
        </div>
        <div className="ex-topbar__count">
          已作答 {answeredCount}/{total}
        </div>
        <button
          type="button"
          className="btn btn-primary ex-topbar__submit"
          onClick={onSubmit}
          disabled={submitting}
        >
          {submitting ? '交卷中…' : '交卷'}
        </button>
      </div>

      {gradeError && (
        <div className="ex-error card">
          <span>交卷失敗:{gradeError}</span>
          <button type="button" className="btn" onClick={onSubmit} disabled={submitting}>
            重試
          </button>
        </div>
      )}

      <div className="ex-running__body">
        <div className="ex-running__main">
          {q && (
            <QuestionCard
              question={q}
              index={current}
              total={total}
              subjectName={subjectNameFor(exam, q.subject_id)}
              examMode
              revealed={false}
              selected={answers.get(q.id) ?? null}
              onSelect={(key) => onSelect(q.id, key as AnswerKey)}
              onPrev={goPrev}
              onNext={goNext}
            />
          )}
        </div>
        <aside className="ex-running__side card">
          <h2 className="ex-side__title">題號盤</h2>
          <QuestionGrid statuses={statuses} current={current} onJump={setCurrent} />
        </aside>
      </div>
    </div>
  )
}

export default function Exam() {
  const [phase, setPhase] = useState<Phase>('intro')

  // intro state
  const [categories, setCategories] = useState<Category[]>([])
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [subjectCount, setSubjectCount] = useState<number | null>(null)
  const [introLoading, setIntroLoading] = useState(true)
  const [introError, setIntroError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)

  // running / grading / result state
  const [exam, setExam] = useState<ExamStartResponse | null>(null)
  const [answers, setAnswers] = useState<Map<number, AnswerKey>>(new Map())
  const [result, setResult] = useState<ExamGradeResponse | null>(null)
  const [gradeError, setGradeError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  // 防重複提交:onExpire 與手動交卷只 grade 一次。
  const submittingRef = useRef(false)

  // 載入類別清單
  useEffect(() => {
    let cancelled = false
    setIntroLoading(true)
    api
      .listCategories()
      .then((cats) => {
        if (cancelled) return
        setCategories(cats)
        const first = cats[0]
        setCategoryId(first ? first.id : null)
        setIntroError(cats.length === 0 ? '目前沒有可用的考試類別' : null)
      })
      .catch((err: unknown) => {
        if (!cancelled) setIntroError(errMsg(err))
      })
      .finally(() => {
        if (!cancelled) setIntroLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // 類別變動時載入科目數
  useEffect(() => {
    if (categoryId == null) {
      setSubjectCount(null)
      return
    }
    let cancelled = false
    setSubjectCount(null)
    api
      .listSubjects(categoryId)
      .then((subs) => {
        if (!cancelled) setSubjectCount(subs.length)
      })
      .catch(() => {
        if (!cancelled) setSubjectCount(null)
      })
    return () => {
      cancelled = true
    }
  }, [categoryId])

  const handleStart = useCallback(async () => {
    if (categoryId == null) return
    setStarting(true)
    setIntroError(null)
    try {
      const res = await api.examStart({
        category_id: categoryId,
        per_subject_n: PER_SUBJECT_N,
        duration_sec: DURATION_SEC,
      })
      if (res.questions.length === 0) {
        setIntroError('此類別目前沒有可用題目,無法開始模擬考')
        return
      }
      setExam(res)
      setAnswers(new Map())
      setResult(null)
      setGradeError(null)
      submittingRef.current = false
      setSubmitting(false)
      setPhase('running')
    } catch (err: unknown) {
      setIntroError(errMsg(err))
    } finally {
      setStarting(false)
    }
  }, [categoryId])

  const handleSelect = useCallback((questionId: number, key: AnswerKey) => {
    // 考試中只存記憶體,不寫 localStorage。
    setAnswers((prev) => {
      const next = new Map(prev)
      next.set(questionId, key)
      return next
    })
  }, [])

  // 交卷(手動或計時歸零)。submittingRef 防重入;grading/result 階段忽略。
  const handleSubmit = useCallback(async () => {
    if (!exam) return
    if (submittingRef.current) return
    submittingRef.current = true
    setSubmitting(true)
    setGradeError(null)
    setPhase('grading')
    try {
      const res = await api.examGrade({
        exam_token: exam.exam_token,
        answers: exam.questions.map((q) => ({
          question_id: q.id,
          selected: answers.get(q.id) ?? '',
        })),
      })
      setResult(res)
      setPhase('result')
    } catch (err: unknown) {
      // 失敗:回到 running 顯示錯誤並允許重試
      setGradeError(errMsg(err))
      submittingRef.current = false
      setSubmitting(false)
      setPhase('running')
    }
  }, [exam, answers])

  const handleRetake = useCallback(() => {
    setExam(null)
    setAnswers(new Map())
    setResult(null)
    setGradeError(null)
    submittingRef.current = false
    setSubmitting(false)
    setPhase('intro')
  }, [])

  if (phase === 'result' && result && exam) {
    return (
      <div className="ex-page">
        <div className="ex-result-actions">
          <Link to="/" className="btn">
            返回首頁
          </Link>
          <button type="button" className="btn btn-primary" onClick={handleRetake}>
            再考一次
          </button>
        </div>
        <Scorecard result={result} questions={exam.questions} />
      </div>
    )
  }

  if (phase === 'grading') {
    return (
      <div className="ex-page">
        <div className="card ex-status">評分中,請稍候…</div>
      </div>
    )
  }

  if (phase === 'running' && exam) {
    return (
      <div className="ex-page">
        <RunningView
          exam={exam}
          answers={answers}
          onSelect={handleSelect}
          onSubmit={handleSubmit}
          submitting={submitting}
          gradeError={gradeError}
        />
      </div>
    )
  }

  // intro
  return (
    <div className="ex-page">
      <div className="card ex-intro">
        <h1 className="ex-intro__title">模擬考</h1>

        {introLoading && <p className="ex-intro__hint">載入中…</p>}

        {!introLoading && introError && (
          <p className="ex-intro__error">{introError}</p>
        )}

        {!introLoading && !introError && (
          <>
            {categories.length > 1 && (
              <label className="ex-intro__field">
                <span>考試類別</span>
                <select
                  className="ex-select"
                  value={categoryId ?? ''}
                  onChange={(e) => setCategoryId(Number(e.target.value))}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <ul className="ex-intro__rules">
              <li>每科隨機抽取 {PER_SUBJECT_N} 題</li>
              <li>作答時間 120 分鐘</li>
              <li>
                預計題數:
                {subjectCount != null
                  ? `${PER_SUBJECT_N} × ${subjectCount} = ${PER_SUBJECT_N * subjectCount} 題`
                  : `每科 ${PER_SUBJECT_N} 題`}
              </li>
            </ul>
            <p className="ex-intro__note">
              考試模式不顯示答案、解析,交卷後才公布成績。
            </p>

            <button
              type="button"
              className="btn btn-primary ex-intro__start"
              onClick={handleStart}
              disabled={starting || categoryId == null}
            >
              {starting ? '準備中…' : '開始模擬考'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

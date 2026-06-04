import { useEffect, useMemo, useRef } from 'react'
import type {
  AnswerKey,
  ExamGradeResponse,
  QuestionExamMode,
  QuestionPublic,
} from '../api/types'
import { store } from '../store/local'
import QuestionCard from './QuestionCard'

interface ScorecardProps {
  result: ExamGradeResponse
  // examStart 拿到的原題,用來補 stem/options(item 無此資訊)
  questions: QuestionExamMode[]
}

// 把成績單逐題 item 與原題依 question_id 合併成可揭曉的 QuestionPublic。
// 原題提供 stem/options;item 提供 answer/explanation。
function buildRevealQuestion(
  question: QuestionExamMode,
  answer: string,
  explanation: string,
): QuestionPublic {
  return { ...question, answer, explanation }
}

export default function Scorecard({ result, questions }: ScorecardProps) {
  // question_id → 原題,供逐題檢視 join
  const questionById = useMemo(() => {
    const map = new Map<number, QuestionExamMode>()
    for (const q of questions) map.set(q.id, q)
    return map
  }, [questions])

  // 成績單渲染時把每題寫入 store 供錯題本復用,僅跑一次。
  const recordedRef = useRef(false)
  useEffect(() => {
    if (recordedRef.current) return
    recordedRef.current = true
    for (const item of result.items) {
      // 跳過(未作答)者不記錄
      if (item.selected === '') continue
      store.recordAnswer(
        item.question_id,
        item.selected as AnswerKey,
        item.is_correct,
        'exam',
      )
    }
  }, [result.items])

  const scorePct = Math.round(result.score)

  return (
    <div className="ex-scorecard">
      <section className="card ex-scorecard__summary">
        <div className="ex-scorecard__score">
          <span className="ex-scorecard__score-value">{scorePct}</span>
          <span className="ex-scorecard__score-unit">分</span>
        </div>
        <div className="ex-scorecard__summary-meta">
          <div className="ex-scorecard__correct">
            答對 {result.correct}/{result.total} 題
          </div>
          {result.expired && (
            <div className="ex-scorecard__expired">逾時自動交卷</div>
          )}
        </div>
      </section>

      <section className="card ex-scorecard__subjects">
        <h2 className="ex-scorecard__heading">各科分數</h2>
        <ul className="ex-scorecard__subject-list">
          {result.per_subject.map((s) => (
            <li key={s.subject_id} className="ex-scorecard__subject-row">
              <span className="ex-scorecard__subject-name">{s.subject}</span>
              <span className="ex-scorecard__subject-score">
                {Math.round(s.score)} 分
              </span>
              <span className="ex-scorecard__subject-detail">
                {s.correct}/{s.total}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="ex-scorecard__review">
        <h2 className="ex-scorecard__heading">逐題檢視</h2>
        <div className="ex-scorecard__review-list">
          {result.items.map((item, i) => {
            const original = questionById.get(item.question_id)
            // 理論上每個 item 都有對應原題;缺漏時略過該題避免崩潰
            if (!original) return null
            const merged = buildRevealQuestion(
              original,
              item.answer,
              item.explanation,
            )
            return (
              <div
                key={item.question_id}
                className={
                  item.is_correct
                    ? 'ex-scorecard__review-item ex-scorecard__review-item--correct'
                    : 'ex-scorecard__review-item ex-scorecard__review-item--wrong'
                }
              >
                <QuestionCard
                  question={merged}
                  index={i}
                  total={result.items.length}
                  subjectName={item.subject}
                  examMode={false}
                  readOnly={true}
                  revealed={true}
                  explainExpanded={true}
                  selected={item.selected || null}
                  onSelect={() => {}}
                />
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

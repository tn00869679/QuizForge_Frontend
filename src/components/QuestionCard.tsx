import type { QuestionPublic, QuestionExamMode } from '../api/types'
import OptionList from './OptionList'
import AnswerExplain from './AnswerExplain'

interface QuestionCardProps {
  question: QuestionPublic | QuestionExamMode
  index: number // 0-based
  total: number
  sessionLabel?: string
  subjectName?: string
  examMode?: boolean // true:隱藏 星號/看答案/解析/不確定
  readOnly?: boolean // true(複習/成績單):隱藏所有互動鈕,只留揭曉的選項與解析
  selected: string | null
  revealed: boolean // 練習:作答後或按「看答案」為 true
  isFavorite?: boolean
  isUncertain?: boolean
  explainExpanded?: boolean
  onSelect: (key: string) => void
  onToggleFavorite?: () => void
  onToggleUncertain?: () => void
  onToggleReveal?: () => void // 「看答案」
  onToggleExplain?: () => void
  onPrev?: () => void
  onNext?: () => void
}

export default function QuestionCard({
  question,
  index,
  total,
  sessionLabel,
  subjectName,
  examMode,
  readOnly,
  selected,
  revealed,
  isFavorite,
  isUncertain,
  explainExpanded,
  onSelect,
  onToggleFavorite,
  onToggleUncertain,
  onToggleReveal,
  onToggleExplain,
  onPrev,
  onNext,
}: QuestionCardProps) {
  const isExam = examMode === true
  // 型別窄化:練習模式且 question 帶 answer 才有正解可揭曉
  const correctKey = !isExam && 'answer' in question ? question.answer : undefined

  // 來源標籤分段,缺值略過
  const sourceParts: string[] = []
  if (sessionLabel) sourceParts.push(sessionLabel)
  if (subjectName) sourceParts.push(subjectName)
  sourceParts.push(`第${question.number}題`)
  const sourceLabel = sourceParts.join(' ｜ ')

  return (
    <div className="card ql-card">
      <div className="ql-card__header">
        <span className="ql-card__counter">
          題目 {index + 1}/{total}
        </span>
        <span className="chip ql-card__source">{sourceLabel}</span>
        {!isExam && !readOnly && (
          <div className="ql-card__header-actions">
            <button
              type="button"
              className={
                isFavorite
                  ? 'btn ql-card__fav ql-card__fav--on'
                  : 'btn ql-card__fav'
              }
              aria-pressed={isFavorite === true}
              aria-label="收藏"
              onClick={onToggleFavorite}
            >
              {isFavorite ? '★' : '☆'}
            </button>
            <button type="button" className="btn" onClick={onToggleReveal}>
              {revealed ? '隱藏答案' : '看答案'}
            </button>
          </div>
        )}
      </div>

      <p className="ql-card__stem">{question.stem}</p>

      <OptionList
        options={question.options}
        selected={selected}
        correctKey={correctKey}
        revealed={revealed}
        disabled={!isExam && revealed}
        onSelect={onSelect}
      />

      {!isExam && revealed && 'answer' in question && (
        <AnswerExplain
          answer={question.answer}
          explanation={question.explanation}
          tags={(question as QuestionPublic).tags}
          expanded={explainExpanded === true}
          onToggle={onToggleExplain ?? (() => {})}
        />
      )}

      {!readOnly && (
        <div className="ql-card__footer">
          <button type="button" className="btn" onClick={onPrev}>
            上一題
          </button>
          {!isExam && (
            <button
              type="button"
              className={
                isUncertain
                  ? 'btn ql-card__uncertain ql-card__uncertain--on'
                  : 'btn ql-card__uncertain'
              }
              aria-pressed={isUncertain === true}
              onClick={onToggleUncertain}
            >
              標記不確定
            </button>
          )}
          <button type="button" className="btn" onClick={onNext}>
            下一題
          </button>
        </div>
      )}
    </div>
  )
}

interface AnswerExplainProps {
  answer: string
  explanation: string
  tags: string[]
  expanded: boolean
  onToggle: () => void
}

export default function AnswerExplain({
  answer,
  explanation,
  tags,
  expanded,
  onToggle,
}: AnswerExplainProps) {
  return (
    <div className="ql-explain">
      <div className="ql-explain__header">
        <span className="ql-explain__title">解析</span>
        <button type="button" className="btn ql-explain__toggle" onClick={onToggle}>
          {expanded ? '收合' : '展開'}
        </button>
      </div>
      {expanded && (
        <div className="ql-explain__body">
          <div className="ql-explain__answer">
            正解:<strong>{answer}</strong>
          </div>
          <div className="ql-explain__text">{explanation}</div>
          {tags.length > 0 && (
            <div className="ql-explain__tags">
              {tags.map((tag) => (
                <span key={tag} className="chip">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

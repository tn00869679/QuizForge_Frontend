export type CellStatus = 'unanswered' | 'answered' | 'correct' | 'wrong' | 'uncertain'

interface QuestionGridProps {
  statuses: CellStatus[]
  current: number
  onJump: (index: number) => void
}

const STATUS_CLASS: Record<CellStatus, string> = {
  unanswered: 'ql-grid__cell--unanswered',
  answered: 'ql-grid__cell--answered',
  correct: 'ql-grid__cell--correct',
  wrong: 'ql-grid__cell--wrong',
  uncertain: 'ql-grid__cell--uncertain',
}

export default function QuestionGrid({ statuses, current, onJump }: QuestionGridProps) {
  return (
    <div className="ql-grid">
      {statuses.map((status, i) => {
        const classes = ['ql-grid__cell', STATUS_CLASS[status]]
        if (i === current) classes.push('ql-grid__cell--current')
        return (
          <button
            key={i}
            type="button"
            className={classes.join(' ')}
            aria-current={i === current ? 'true' : undefined}
            onClick={() => onJump(i)}
          >
            {i + 1}
          </button>
        )
      })}
    </div>
  )
}

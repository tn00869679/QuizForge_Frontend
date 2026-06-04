import type { QuestionOption } from '../api/types'

interface OptionListProps {
  options: QuestionOption[]
  selected: string | null
  correctKey?: string // 揭曉時的正解 key
  revealed: boolean // true 才上正解/錯選著色
  disabled?: boolean // true 不可點
  onSelect: (key: string) => void
}

function optionClass(
  key: string,
  selected: string | null,
  correctKey: string | undefined,
  revealed: boolean,
): string {
  const classes = ['ql-option']
  if (revealed) {
    if (correctKey != null && key === correctKey) {
      classes.push('ql-option--correct')
    } else if (key === selected) {
      classes.push('ql-option--wrong')
    }
  } else if (key === selected) {
    classes.push('ql-option--selected')
  }
  return classes.join(' ')
}

export default function OptionList({
  options,
  selected,
  correctKey,
  revealed,
  disabled,
  onSelect,
}: OptionListProps) {
  // revealed 後一律不可點;disabled 亦不可點
  const locked = revealed || disabled === true

  return (
    <ul className="ql-option-list">
      {options.map((opt) => (
        <li key={opt.key}>
          <button
            type="button"
            className={optionClass(opt.key, selected, correctKey, revealed)}
            disabled={locked}
            aria-pressed={opt.key === selected}
            onClick={() => onSelect(opt.key)}
          >
            <span className="ql-option__badge">{opt.key}</span>
            <span className="ql-option__text">{opt.text}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

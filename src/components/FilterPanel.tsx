import type { Category, Subject, ExamSession } from '../api/types'

export interface FilterValue {
  category_id?: number
  subject_id: number[]
  session_ids: number[]
  status?: 'unanswered' | 'wrong' | 'favorite'
  limit: '5' | '10' | '20' | '50' | 'all'
  customCount?: number
  keyword: string
}

interface FilterPanelProps {
  categories: Category[]
  subjects: Subject[]
  sessions: ExamSession[]
  value: FilterValue
  onChange: (v: FilterValue) => void
  onGenerate: () => void
  onStartFromFirst: () => void
}

const LIMIT_OPTIONS: { value: FilterValue['limit']; label: string }[] = [
  { value: '5', label: '5' },
  { value: '10', label: '10' },
  { value: '20', label: '20' },
  { value: '50', label: '50' },
  { value: 'all', label: '全部' },
]

const STATUS_OPTIONS: { value: NonNullable<FilterValue['status']>; label: string }[] = [
  { value: 'unanswered', label: '尚未作答' },
  { value: 'wrong', label: '答錯題目' },
  { value: 'favorite', label: '已收藏' },
]

function toggleNumber(list: number[], id: number): number[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id]
}

export default function FilterPanel({
  categories,
  subjects,
  sessions,
  value,
  onChange,
  onGenerate,
  onStartFromFirst,
}: FilterPanelProps) {
  const patch = (p: Partial<FilterValue>) => onChange({ ...value, ...p })

  return (
    <div className="card pv-filter">
      {categories.length > 1 && (
        <div className="pv-filter__group">
          <label className="pv-filter__label" htmlFor="pv-category">
            考試類別
          </label>
          <select
            id="pv-category"
            className="pv-filter__select"
            value={value.category_id ?? ''}
            onChange={(e) => patch({ category_id: Number(e.target.value) })}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="pv-filter__group">
        <span className="pv-filter__label">年度／考次</span>
        <div className="pv-filter__checks">
          {sessions.length === 0 && <span className="pv-filter__empty">無考次資料</span>}
          {sessions.map((s) => (
            <label key={s.id} className="pv-filter__check">
              <input
                type="checkbox"
                checked={value.session_ids.includes(s.id)}
                onChange={() => patch({ session_ids: toggleNumber(value.session_ids, s.id) })}
              />
              <span>{s.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="pv-filter__group">
        <span className="pv-filter__label">科目</span>
        <div className="pv-filter__checks">
          {subjects.length === 0 && <span className="pv-filter__empty">無科目資料</span>}
          {subjects.map((s) => (
            <label key={s.id} className="pv-filter__check">
              <input
                type="checkbox"
                checked={value.subject_id.includes(s.id)}
                onChange={() => patch({ subject_id: toggleNumber(value.subject_id, s.id) })}
              />
              <span>{s.name}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="pv-filter__group">
        <span className="pv-filter__label">題目狀態</span>
        <div className="pv-filter__checks">
          {STATUS_OPTIONS.map((opt) => (
            <label key={opt.value} className="pv-filter__check">
              <input
                type="radio"
                name="pv-status"
                checked={value.status === opt.value}
                onChange={() => patch({ status: opt.value })}
              />
              <span>{opt.label}</span>
            </label>
          ))}
          <label className="pv-filter__check">
            <input
              type="radio"
              name="pv-status"
              checked={value.status === undefined}
              onChange={() => patch({ status: undefined })}
            />
            <span>不限</span>
          </label>
        </div>
      </div>

      <div className="pv-filter__group">
        <span className="pv-filter__label">本次題數</span>
        <div className="pv-filter__checks pv-filter__checks--row">
          {LIMIT_OPTIONS.map((opt) => (
            <label key={opt.value} className="pv-filter__check">
              <input
                type="radio"
                name="pv-limit"
                checked={value.customCount === undefined && value.limit === opt.value}
                onChange={() => patch({ limit: opt.value, customCount: undefined })}
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
        <div className="pv-filter__custom">
          <span>自訂</span>
          <input
            type="number"
            min={1}
            className="pv-filter__num"
            value={value.customCount ?? ''}
            onChange={(e) => {
              const n = Number(e.target.value)
              patch({ customCount: e.target.value === '' || Number.isNaN(n) || n < 1 ? undefined : n })
            }}
          />
        </div>
      </div>

      <div className="pv-filter__group">
        <label className="pv-filter__label" htmlFor="pv-keyword">
          關鍵字
        </label>
        <input
          id="pv-keyword"
          type="text"
          className="pv-filter__input"
          placeholder="搜尋題幹關鍵字"
          value={value.keyword}
          onChange={(e) => patch({ keyword: e.target.value })}
        />
      </div>

      <div className="pv-filter__actions">
        <button type="button" className="btn btn-primary" onClick={onGenerate}>
          產生隨機題組
        </button>
        <button type="button" className="btn" onClick={onStartFromFirst}>
          從第一題開始
        </button>
      </div>
    </div>
  )
}

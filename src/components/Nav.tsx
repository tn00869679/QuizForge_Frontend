import { NavLink } from 'react-router-dom'
import { store } from '../store/local'

const NAV_LINKS = [
  { to: '/', label: '首頁', end: true },
  { to: '/practice', label: '練習', end: false },
  { to: '/custom', label: '自創題', end: false },
  { to: '/exam', label: '模擬考', end: false },
  { to: '/wrong', label: '錯題本', end: false },
  { to: '/favorites', label: '收藏', end: false },
  { to: '/uncertain', label: '不確定', end: false },
]

export default function Nav() {
  function handleClearAll() {
    if (window.confirm('確定要清除所有本機作答紀錄？此操作無法復原。')) {
      store.clearAll()
      location.reload()
    }
  }

  return (
    <nav className="nav">
      <NavLink to="/" className="nav__brand">
        QuizForge
      </NavLink>
      <div className="nav__links">
        {NAV_LINKS.map(({ to, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              isActive ? 'nav__link nav__link--active' : 'nav__link'
            }
          >
            {label}
          </NavLink>
        ))}
      </div>
      <div className="nav__actions">
        <button className="btn" onClick={handleClearAll}>
          清除本機紀錄
        </button>
      </div>
    </nav>
  )
}

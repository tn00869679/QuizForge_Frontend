import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import type { Category } from '../api/types'
import { api } from '../api/client'
import { store } from '../store/local'

interface DbStats {
  totalQuestions: number
  subjectCount: number
}

export default function Home() {
  const [dbStats, setDbStats] = useState<DbStats | null>(null)
  const personalStats = store.getStats()

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const categories = await api.listCategories()
        const firstCat: Category | undefined = categories[0]
        if (!firstCat) {
          if (!cancelled) setDbStats({ totalQuestions: 0, subjectCount: 0 })
          return
        }
        const [subjects, questionsPage] = await Promise.all([
          api.listSubjects(firstCat.id),
          api.listQuestions({ page_size: 1 }),
        ])
        if (!cancelled) {
          setDbStats({
            totalQuestions: questionsPage.total,
            subjectCount: subjects.length,
          })
        }
      } catch {
        if (!cancelled) setDbStats(null)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const totalQuestions = dbStats?.totalQuestions != null ? dbStats.totalQuestions.toLocaleString() : '—'
  const subjectCount = dbStats?.subjectCount != null ? String(dbStats.subjectCount) : '—'
  const accuracyPct =
    personalStats.answered > 0
      ? `${(personalStats.accuracy * 100).toFixed(1)}%`
      : '—'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
      {/* Hero */}
      <section style={{ display: 'flex', gap: '32px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Left — brand + CTA */}
        <div style={{ flex: '1 1 320px' }}>
          <h1 style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '8px' }}>
            QuizForge
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '1.1rem', marginBottom: '24px' }}>
            證券商業務員歷屆試題練習平台。即時回饋、模擬考、錯題本，一站備考。
          </p>
          <p style={{ color: 'var(--text)', marginBottom: '32px', lineHeight: 1.8 }}>
            從歷屆考古題中精選題目，支援科目篩選、隨機抽題、模擬考計時，搭配本機作答紀錄，
            幫助你掌握弱點、提升正確率。
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Link to="/practice" className="btn btn-primary" style={{ fontSize: '1rem', padding: '12px 24px' }}>
              開始歷屆題練習
            </Link>
            <Link to="/exam" className="btn" style={{ fontSize: '1rem', padding: '12px 24px' }}>
              進入模擬考
            </Link>
          </div>
        </div>

        {/* Right — stats card */}
        <div style={{ flex: '0 0 260px' }}>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--muted)', marginBottom: '4px' }}>
              題庫統計
            </h2>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>總題數</span>
              <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)' }}>{totalQuestions}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>科目數</span>
              <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)' }}>{subjectCount}</span>
            </div>
            <hr style={{ border: 'none', borderTop: '1px solid var(--border)' }} />
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--muted)' }}>我的進度</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>已作答</span>
              <span style={{ fontWeight: 600, color: 'var(--text)' }}>{personalStats.answered}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>正確率</span>
              <span style={{ fontWeight: 600, color: 'var(--correct)' }}>{accuracyPct}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>錯題數</span>
              <span style={{ fontWeight: 600, color: 'var(--wrong)' }}>{personalStats.wrong}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>收藏</span>
              <span style={{ fontWeight: 600, color: 'var(--warn)' }}>{personalStats.favorites}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '20px', color: 'var(--muted)' }}>
          功能說明
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
          <div className="card">
            <h3 style={{ fontWeight: 700, marginBottom: '8px', color: 'var(--primary)' }}>練習模式</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem', lineHeight: 1.7 }}>
              依科目、年度、題目狀態篩選，支援隨機抽題。作答後即時顯示正解與解析，統計同步更新。
            </p>
          </div>
          <div className="card">
            <h3 style={{ fontWeight: 700, marginBottom: '8px', color: 'var(--primary)' }}>模擬考模式</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem', lineHeight: 1.7 }}>
              每科隨機抽題，計時作答，交卷後顯示成績單與各科分析，貼近正式考試體驗。
            </p>
          </div>
          <div className="card">
            <h3 style={{ fontWeight: 700, marginBottom: '8px', color: 'var(--primary)' }}>錯題本 / 收藏</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem', lineHeight: 1.7 }}>
              作答紀錄存於本機，隨時回顧答錯題目、加星收藏或標記不確定，支援匯出備份。
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}

import { useCallback, useEffect, useRef, useState } from 'react'

interface UseExamTimerOptions {
  durationSec: number
  onExpire: () => void
  autoStart?: boolean
}

interface UseExamTimerResult {
  remainingSec: number
  formatted: string
  isExpired: boolean
  isRunning: boolean
  start: () => void
  stop: () => void
}

function format(remaining: number): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const h = Math.floor(remaining / 3600)
  const m = Math.floor((remaining % 3600) / 60)
  const s = remaining % 60
  if (remaining >= 3600) {
    return `${h}:${pad(m)}:${pad(s)}`
  }
  return `${pad(m)}:${pad(s)}`
}

export function useExamTimer(opts: UseExamTimerOptions): UseExamTimerResult {
  const { durationSec, autoStart = false } = opts

  const [remainingSec, setRemainingSec] = useState(durationSec)
  const [isRunning, setIsRunning] = useState(false)
  const [isExpired, setIsExpired] = useState(false)

  const endAtRef = useRef<number | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const expiredFiredRef = useRef(false)

  // 以 ref 包裝 onExpire,避免 interval callback 捕捉到 stale closure
  const onExpireRef = useRef(opts.onExpire)
  useEffect(() => {
    onExpireRef.current = opts.onExpire
  }, [opts.onExpire])

  const clearTimer = useCallback(() => {
    if (intervalRef.current != null) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const tick = useCallback(() => {
    const endAt = endAtRef.current
    if (endAt == null) return
    const remaining = Math.max(0, Math.ceil((endAt - Date.now()) / 1000))
    setRemainingSec(remaining)
    if (remaining <= 0) {
      clearTimer()
      setIsRunning(false)
      setIsExpired(true)
      // 防重入:onExpire 僅觸發一次
      if (!expiredFiredRef.current) {
        expiredFiredRef.current = true
        onExpireRef.current()
      }
    }
  }, [clearTimer])

  const start = useCallback(() => {
    clearTimer()
    expiredFiredRef.current = false
    endAtRef.current = Date.now() + durationSec * 1000
    setIsExpired(false)
    setIsRunning(true)
    setRemainingSec(durationSec)
    tick() // 立即算一次,避免首個 500ms 空窗
    intervalRef.current = setInterval(tick, 500)
  }, [clearTimer, durationSec, tick])

  const stop = useCallback(() => {
    // 停 interval,不觸發 onExpire
    clearTimer()
    setIsRunning(false)
  }, [clearTimer])

  // autoStart 僅在 mount 時生效;重新 render 不重置 endAt
  useEffect(() => {
    if (autoStart) start()
    return () => clearTimer()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    remainingSec,
    formatted: format(remainingSec),
    isExpired,
    isRunning,
    start,
    stop,
  }
}

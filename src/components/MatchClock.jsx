import { useState, useEffect, useRef } from 'react'

const CLOCK_KEY = 'kampstotte_clock'

function loadPersistedClock() {
  try { return JSON.parse(localStorage.getItem(CLOCK_KEY)) } catch { return null }
}

function initFromStorage() {
  const saved = loadPersistedClock()
  if (!saved) return { running: false, elapsed: 0 }
  const elapsed = saved.running && saved.virtualStart != null
    ? Math.max(0, Math.floor((Date.now() - saved.virtualStart) / 1000))
    : saved.elapsed ?? 0
  if (elapsed >= 50 * 60) {
    localStorage.removeItem(CLOCK_KEY)
    return { running: false, elapsed: 0 }
  }
  return { running: saved.running ?? false, elapsed }
}

export default function MatchClock({ onMinute }) {
  const init = useRef(initFromStorage()).current
  const [running, setRunning] = useState(init.running)
  const [elapsed, setElapsed] = useState(init.elapsed)
  const intervalRef = useRef(null)
  const startRef    = useRef(null)
  const elapsedRef  = useRef(init.elapsed)

  useEffect(() => {
    onMinute(Math.floor(init.elapsed / 60))
  }, [])

  useEffect(() => {
    if (running) {
      startRef.current = Date.now() - elapsedRef.current * 1000
      localStorage.setItem(CLOCK_KEY, JSON.stringify({ running: true, virtualStart: startRef.current }))
      intervalRef.current = setInterval(() => {
        const secs = Math.floor((Date.now() - startRef.current) / 1000)
        if (secs >= 50 * 60) {
          clearInterval(intervalRef.current)
          setRunning(false)
          setElapsed(0)
          elapsedRef.current = 0
          onMinute(0)
          localStorage.removeItem(CLOCK_KEY)
          return
        }
        elapsedRef.current = secs
        setElapsed(secs)
        onMinute(Math.floor(secs / 60))
      }, 500)
    } else {
      clearInterval(intervalRef.current)
      localStorage.setItem(CLOCK_KEY, JSON.stringify({ running: false, elapsed: elapsedRef.current }))
    }
    return () => clearInterval(intervalRef.current)
  }, [running])

  function reset() {
    setRunning(false)
    clearInterval(intervalRef.current)
    setElapsed(0)
    elapsedRef.current = 0
    onMinute(0)
    localStorage.removeItem(CLOCK_KEY)
  }

  const mins = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const secs = String(elapsed % 60).padStart(2, '0')

  return (
    <div className="flex items-center gap-3 bg-gray-900 px-4 py-2 rounded-xl border border-gray-700">
      <span className="text-2xl font-mono font-bold text-green-400 min-w-[72px] text-center">
        {mins}:{secs}
      </span>
      <button
        onClick={() => setRunning(r => !r)}
        className={`px-4 py-2 rounded-lg font-bold text-sm min-w-[72px] ${
          running
            ? 'bg-yellow-500 text-black'
            : 'bg-green-600 text-white'
        }`}
      >
        {running ? 'Pause' : 'Start'}
      </button>
      <button
        onClick={reset}
        className="px-4 py-2 rounded-lg font-bold text-sm bg-gray-700 text-white"
      >
        Reset
      </button>
    </div>
  )
}

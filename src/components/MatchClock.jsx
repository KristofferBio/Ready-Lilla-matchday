import { useState, useEffect, useRef } from 'react'

export default function MatchClock({ running, virtualStart, elapsed, onStart, onPause, onReset, onMinute }) {
  const onMinuteRef = useRef(onMinute)
  onMinuteRef.current = onMinute
  const onResetRef = useRef(onReset)
  onResetRef.current = onReset

  function computeDisplay() {
    if (running && virtualStart != null)
      return Math.max(0, Math.floor((Date.now() - virtualStart) / 1000))
    return elapsed ?? 0
  }

  const [display, setDisplay] = useState(computeDisplay)

  // Emit initial minute on mount
  useEffect(() => { onMinuteRef.current(Math.floor(computeDisplay() / 60)) }, [])

  // Sync display when paused state arrives (local or from cloud)
  useEffect(() => {
    if (!running) {
      const secs = elapsed ?? 0
      setDisplay(secs)
      onMinuteRef.current(Math.floor(secs / 60))
    }
  }, [running, elapsed])

  // Run interval while clock is active
  useEffect(() => {
    if (!running || virtualStart == null) return
    // Immediate sync
    const initial = Math.max(0, Math.floor((Date.now() - virtualStart) / 1000))
    setDisplay(initial)
    onMinuteRef.current(Math.floor(initial / 60))

    const id = setInterval(() => {
      const secs = Math.max(0, Math.floor((Date.now() - virtualStart) / 1000))
      if (secs >= 50 * 60) { onResetRef.current(); return }
      setDisplay(secs)
      onMinuteRef.current(Math.floor(secs / 60))
    }, 500)

    return () => clearInterval(id)
  }, [running, virtualStart])

  const mins = String(Math.floor(display / 60)).padStart(2, '0')
  const secs = String(display % 60).padStart(2, '0')

  function handleStartPause() {
    if (running) {
      onPause(Math.max(0, Math.floor((Date.now() - virtualStart) / 1000)))
    } else {
      onStart()
    }
  }

  return (
    <div className="flex items-center gap-3 bg-gray-900 px-4 py-2 rounded-xl border border-gray-700">
      <span className="text-2xl font-mono font-bold text-green-400 min-w-[72px] text-center">
        {mins}:{secs}
      </span>
      <button
        onClick={handleStartPause}
        className={`px-4 py-2 rounded-lg font-bold text-sm min-w-[72px] ${
          running ? 'bg-yellow-500 text-black' : 'bg-green-600 text-white'
        }`}
      >
        {running ? 'Pause' : 'Start'}
      </button>
      <button onClick={onReset} className="px-4 py-2 rounded-lg font-bold text-sm bg-gray-700 text-white">
        Reset
      </button>
    </div>
  )
}

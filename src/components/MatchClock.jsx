import { useState, useEffect, useRef } from 'react'

export default function MatchClock({ onMinute }) {
  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const intervalRef = useRef(null)
  const startRef = useRef(null)
  const elapsedRef = useRef(0)

  useEffect(() => {
    if (running) {
      startRef.current = Date.now() - elapsedRef.current * 1000
      intervalRef.current = setInterval(() => {
        const secs = Math.floor((Date.now() - startRef.current) / 1000)
        elapsedRef.current = secs
        setElapsed(secs)
        onMinute(Math.floor(secs / 60))
      }, 500)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [running])

  function reset() {
    setRunning(false)
    clearInterval(intervalRef.current)
    setElapsed(0)
    elapsedRef.current = 0
    onMinute(0)
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

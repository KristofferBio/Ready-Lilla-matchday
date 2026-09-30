import { useState, useEffect, useEffectEvent } from 'react'

function clockSeconds(running, virtualStart, elapsed) {
  return running && virtualStart != null
    ? Math.max(0, Math.floor((Date.now() - virtualStart) / 1000))
    : elapsed ?? 0
}

export default function MatchClock({ running, virtualStart, elapsed, onStart, onPause, onReset, onMinute }) {
  const [activeDisplay, setActiveDisplay] = useState(() => clockSeconds(running, virtualStart, elapsed))
  const display = running ? activeDisplay : elapsed ?? 0
  const [confirmReset, setConfirmReset] = useState(false)

  const handleTick = useEffectEvent((enforceLimits) => {
    const secs = clockSeconds(running, virtualStart, elapsed)
    if (enforceLimits && secs >= 100 * 60) { onReset(); return }
    if (enforceLimits && (elapsed ?? 0) < 35 * 60 && secs >= 35 * 60) { onPause(secs); return }
    setActiveDisplay(secs)
    onMinute(Math.floor(secs / 60))
  })

  // Timer events synchronize wall-clock time without state updates during render.
  // Effect Events keep callbacks current without resetting the interval each tick.
  useEffect(() => {
    const initial = setTimeout(() => handleTick(false), 0)
    const interval = running && virtualStart != null ? setInterval(() => handleTick(true), 500) : null
    return () => { clearTimeout(initial); if (interval !== null) clearInterval(interval) }
  }, [running, virtualStart, elapsed])

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
      {confirmReset ? (
        <>
          <button
            onClick={() => { onReset(); setConfirmReset(false) }}
            className="px-4 py-2 rounded-lg font-bold text-sm bg-red-600 text-white"
          >
            Bekreft
          </button>
          <button
            onClick={() => setConfirmReset(false)}
            className="px-4 py-2 rounded-lg font-bold text-sm bg-gray-700 text-white"
          >
            Avbryt
          </button>
        </>
      ) : (
        <button
          onClick={() => setConfirmReset(true)}
          className="px-4 py-2 rounded-lg font-bold text-sm bg-gray-700 text-white"
        >
          Reset
        </button>
      )}
    </div>
  )
}

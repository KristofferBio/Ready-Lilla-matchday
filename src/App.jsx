import { useState, useEffect } from 'react'
import MatchClock from './components/MatchClock'
import FormationView from './components/FormationView'
import SubLog from './components/SubLog'
import SquadManager from './components/SquadManager'
import { FORMATION_KEYS, FORMATIONS } from './formations'
import {
  loadAllFromCloud,
  loadSquadLocal, loadFormationLocal, loadPositionsLocal,
  saveSquad, saveFormation, savePositions,
} from './storage'

const TABS = [
  { id: 'kampdag', label: 'Kampdag' },
  { id: 'squad',   label: 'Tropp' },
]

export default function App() {
  const [tab, setTab]             = useState('kampdag')
  const [squad, setSquad]         = useState(loadSquadLocal)
  const [formation, setFormation] = useState(loadFormationLocal)
  const [positions, setPositions] = useState(loadPositionsLocal)
  const [subLog, setSubLog]       = useState([])
  const [minute, setMinute]       = useState(0)
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  // Load everything from cloud on startup
  useEffect(() => {
    loadAllFromCloud().then(data => {
      setSquad(data.squad)
      setFormation(data.formation)
      setPositions(data.positions)
    })
  }, [])

  function handleSquadChange(newSquad) {
    setSquad(newSquad)
    saveSquad(newSquad)
    const ids = new Set(newSquad.map(p => p.id))
    const cleaned = Object.fromEntries(
      Object.entries(positions).filter(([, pid]) => ids.has(pid))
    )
    setPositions(cleaned)
    savePositions(cleaned)
  }

  function handleFormationChange(f) {
    if (f === formation) return
    setFormation(f)
    saveFormation(f)
    // Keep players on field – positions stay (different formations may share pos IDs)
    // Only clear positions that don't exist in the new formation
    const validPosIds = new Set(FORMATIONS[f].positions.map(p => p.id))
    const cleaned = Object.fromEntries(
      Object.entries(positions).filter(([posId]) => validPosIds.has(posId))
    )
    setPositions(cleaned)
    savePositions(cleaned)
  }

  function handlePositionsChange(newPos) {
    setPositions(newPos)
    savePositions(newPos)
  }

  function handleSubstitution(inId, outId) {
    setSubLog(log => [...log, { minute, inId, outId }])
  }

  function handleReset() {
    setPositions({})
    savePositions({})
    setSubLog([])
    setShowResetConfirm(false)
  }

  return (
    <div className="flex flex-col min-h-svh bg-gray-950 text-white">
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between gap-3 flex-wrap sticky top-0 z-10">
        <h1 className="text-lg font-bold text-green-400 tracking-tight">Kampstøtte</h1>
        <MatchClock onMinute={setMinute} />
      </header>

      <nav className="bg-gray-900 border-b border-gray-800 flex sticky top-[68px] z-10">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-3 text-sm font-bold transition-colors ${
              tab === t.id
                ? 'text-green-400 border-b-2 border-green-400'
                : 'text-gray-400'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="flex-1 overflow-y-auto pb-8">
        {tab === 'kampdag' && (
          <div className="p-3 max-w-sm mx-auto flex flex-col gap-4">

            {/* Formation selector + reset */}
            <div className="flex items-center gap-2">
              <div className="flex gap-2 flex-1">
                {FORMATION_KEYS.map(f => (
                  <button
                    key={f}
                    onClick={() => handleFormationChange(f)}
                    className={`px-3 py-2 rounded-xl font-bold text-sm transition-colors ${
                      formation === f
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-800 text-gray-300'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowResetConfirm(true)}
                className="px-3 py-2 rounded-xl bg-gray-800 text-gray-400 text-sm font-bold"
              >
                Nullstill
              </button>
            </div>

            {/* Reset confirmation */}
            {showResetConfirm && (
              <div className="bg-red-950 border border-red-700 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                <span className="text-sm text-red-200">Tøm banen og nullstill byttelogg?</span>
                <div className="flex gap-2">
                  <button onClick={handleReset} className="bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-bold">Ja</button>
                  <button onClick={() => setShowResetConfirm(false)} className="bg-gray-700 text-white px-3 py-2 rounded-lg text-sm">Avbryt</button>
                </div>
              </div>
            )}

            <FormationView
              formation={formation}
              positions={positions}
              squad={squad}
              onPositionsChange={handlePositionsChange}
              onSubstitution={handleSubstitution}
            />

            <SubLog log={subLog} squad={squad} />
          </div>
        )}

        {tab === 'squad' && (
          <SquadManager squad={squad} onSquadChange={handleSquadChange} />
        )}
      </main>
    </div>
  )
}

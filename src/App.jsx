import { useState } from 'react'
import MatchClock from './components/MatchClock'
import FormationView from './components/FormationView'
import SubLog from './components/SubLog'
import SquadManager from './components/SquadManager'
import { FORMATION_KEYS } from './formations'
import {
  loadSquad, saveSquad,
  loadFormation, saveFormation,
  loadPositions, savePositions,
} from './storage'

const TABS = [
  { id: 'kampdag', label: 'Kampdag' },
  { id: 'squad',   label: 'Tropp' },
]

export default function App() {
  const [tab, setTab]             = useState('kampdag')
  const [squad, setSquad]         = useState(loadSquad)
  const [formation, setFormation] = useState(loadFormation)
  const [positions, setPositions] = useState(loadPositions)
  const [subLog, setSubLog]       = useState([])
  const [minute, setMinute]       = useState(0)

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
    setFormation(f)
    saveFormation(f)
    setPositions({})
    savePositions({})
  }

  function handlePositionsChange(newPos) {
    setPositions(newPos)
    savePositions(newPos)
  }

  function handleSubstitution(inId, outId) {
    setSubLog(log => [...log, { minute, inId, outId }])
  }

  return (
    <div className="flex flex-col min-h-svh bg-gray-950 text-white">
      {/* ── Header + clock ── */}
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between gap-3 flex-wrap sticky top-0 z-10">
        <h1 className="text-lg font-bold text-green-400 tracking-tight">Kampstøtte</h1>
        <MatchClock onMinute={setMinute} />
      </header>

      {/* ── Tab bar ── */}
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

      {/* ── Content ── */}
      <main className="flex-1 overflow-y-auto pb-8">
        {tab === 'kampdag' && (
          <div className="p-3 max-w-sm mx-auto flex flex-col gap-4">
            {/* Formation selector */}
            <div className="flex gap-2 justify-center">
              {FORMATION_KEYS.map(f => (
                <button
                  key={f}
                  onClick={() => handleFormationChange(f)}
                  className={`px-4 py-2 rounded-xl font-bold text-sm transition-colors ${
                    formation === f
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-800 text-gray-300'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Field + bench */}
            <FormationView
              formation={formation}
              positions={positions}
              squad={squad}
              onPositionsChange={handlePositionsChange}
              onSubstitution={handleSubstitution}
            />

            {/* Substitution log – inline */}
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

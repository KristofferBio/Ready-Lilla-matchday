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

const TEAMS = [
  { id: 'ready-lilla', label: 'Lilla', color: 'bg-purple-700', activeColor: 'bg-purple-500', textColor: 'text-purple-300' },
  { id: 'ready-gronn', label: 'Grønn', color: 'bg-green-800',  activeColor: 'bg-green-600',  textColor: 'text-green-300'  },
]

const TABS = [
  { id: 'kampdag', label: 'Kampdag' },
  { id: 'squad',   label: 'Tropp'   },
]

function emptyTeamState(teamId) {
  return {
    squad:     loadSquadLocal(teamId),
    formation: loadFormationLocal(teamId),
    positions: loadPositionsLocal(teamId),
  }
}

export default function App() {
  const [activeTeam, setActiveTeam] = useState('ready-lilla')
  const [tab, setTab]               = useState('kampdag')
  const [teamData, setTeamData]     = useState({
    'ready-lilla': emptyTeamState('ready-lilla'),
    'ready-gronn': emptyTeamState('ready-gronn'),
  })
  const [subLogs, setSubLogs]       = useState({ 'ready-lilla': [], 'ready-gronn': [] })
  const [minute, setMinute]         = useState(0)
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  const team = TEAMS.find(t => t.id === activeTeam)
  const { squad, formation, positions } = teamData[activeTeam]
  const subLog = subLogs[activeTeam]

  // Load both teams from cloud on startup
  useEffect(() => {
    TEAMS.forEach(t => {
      loadAllFromCloud(t.id).then(data => {
        setTeamData(prev => ({ ...prev, [t.id]: data }))
      })
    })
  }, [])

  function updateTeam(teamId, patch) {
    setTeamData(prev => ({ ...prev, [teamId]: { ...prev[teamId], ...patch } }))
  }

  function switchTeam(teamId) {
    setActiveTeam(teamId)
    setShowResetConfirm(false)
  }

  // ── Squad ──────────────────────────────────────────────────────

  function handleSquadChange(newSquad) {
    saveSquad(activeTeam, newSquad)
    const ids = new Set(newSquad.map(p => p.id))
    const cleanedPos = Object.fromEntries(
      Object.entries(positions).filter(([, pid]) => ids.has(pid))
    )
    updateTeam(activeTeam, { squad: newSquad, positions: cleanedPos })
    savePositions(activeTeam, cleanedPos)
  }

  // ── Formation ─────────────────────────────────────────────────

  function handleFormationChange(f) {
    if (f === formation) return
    saveFormation(activeTeam, f)
    const validPosIds = new Set(FORMATIONS[f].positions.map(p => p.id))
    const cleanedPos  = Object.fromEntries(
      Object.entries(positions).filter(([posId]) => validPosIds.has(posId))
    )
    updateTeam(activeTeam, { formation: f, positions: cleanedPos })
    savePositions(activeTeam, cleanedPos)
  }

  // ── Positions ─────────────────────────────────────────────────

  function handlePositionsChange(newPos) {
    updateTeam(activeTeam, { positions: newPos })
    savePositions(activeTeam, newPos)
  }

  // ── Substitution ──────────────────────────────────────────────

  function handleSubstitution(inId, outId) {
    setSubLogs(prev => ({
      ...prev,
      [activeTeam]: [...prev[activeTeam], { minute, inId, outId }],
    }))
  }

  // ── Reset ─────────────────────────────────────────────────────

  function handleReset() {
    updateTeam(activeTeam, { positions: {} })
    savePositions(activeTeam, {})
    setSubLogs(prev => ({ ...prev, [activeTeam]: [] }))
    setShowResetConfirm(false)
  }

  return (
    <div className="flex flex-col min-h-svh bg-gray-950 text-white">

      {/* ── Header + clock ── */}
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between gap-3 flex-wrap sticky top-0 z-10">
        <h1 className="text-lg font-bold text-white tracking-tight">Kampstøtte</h1>
        <MatchClock onMinute={setMinute} />
      </header>

      {/* ── Team selector ── */}
      <div className="bg-gray-900 border-b border-gray-800 flex gap-2 px-4 py-2 sticky top-[68px] z-10">
        {TEAMS.map(t => (
          <button
            key={t.id}
            onClick={() => switchTeam(t.id)}
            className={`flex-1 py-2 rounded-xl font-bold text-sm transition-colors ${
              activeTeam === t.id
                ? `${t.activeColor} text-white`
                : 'bg-gray-800 text-gray-400'
            }`}
          >
            Ready {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab bar ── */}
      <nav className={`border-b border-gray-800 flex sticky top-[116px] z-10 ${
        activeTeam === 'ready-lilla' ? 'bg-purple-950' : 'bg-green-950'
      }`}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-3 text-sm font-bold transition-colors ${
              tab === t.id
                ? `${team.textColor} border-b-2 ${activeTeam === 'ready-lilla' ? 'border-purple-400' : 'border-green-400'}`
                : 'text-gray-500'
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

            {/* Formation selector + reset */}
            <div className="flex items-center gap-2">
              <div className="flex gap-2 flex-1">
                {FORMATION_KEYS.map(f => (
                  <button
                    key={f}
                    onClick={() => handleFormationChange(f)}
                    className={`px-3 py-2 rounded-xl font-bold text-sm transition-colors ${
                      formation === f
                        ? (activeTeam === 'ready-lilla' ? 'bg-purple-600 text-white' : 'bg-green-600 text-white')
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

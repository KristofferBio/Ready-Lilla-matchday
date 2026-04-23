import { useState, useEffect } from 'react'
import MatchClock from './components/MatchClock'
import FormationView from './components/FormationView'
import SubLog from './components/SubLog'
import SquadManager from './components/SquadManager'
import { FORMATION_KEYS, FORMATIONS } from './formations'
import {
  loadAllFromCloud,
  loadSquadLocal, loadFormationLocal, loadPositionsLocal, loadSubLogLocal, loadPlayTimeLocal,
  saveSquad, saveFormation, savePositions, saveSubLog, savePlayTime,
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
  const pt = loadPlayTimeLocal(teamId)
  return {
    squad:            loadSquadLocal(teamId),
    formation:        loadFormationLocal(teamId),
    positions:        loadPositionsLocal(teamId),
    subLog:           loadSubLogLocal(teamId),
    playMinutes:      pt.playMinutes,
    fieldStartMinute: pt.fieldStartMinute,
  }
}

export default function App() {
  const [activeTeam, setActiveTeam] = useState('ready-lilla')
  const [tab, setTab]               = useState('kampdag')
  const [teamData, setTeamData]     = useState({
    'ready-lilla': emptyTeamState('ready-lilla'),
    'ready-gronn': emptyTeamState('ready-gronn'),
  })
  const [minute, setMinute]         = useState(0)
  const [showResetConfirm, setShowResetConfirm] = useState(null) // null | 'oppsett' | 'logg'

  const team = TEAMS.find(t => t.id === activeTeam)
  const { squad, formation, positions, subLog, playMinutes, fieldStartMinute } = teamData[activeTeam]

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
    setShowResetConfirm(null)
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
    const oldOnField = new Set(Object.values(positions))
    const newOnField = new Set(Object.values(newPos))
    const newPlayMinutes      = { ...playMinutes }
    const newFieldStartMinute = { ...fieldStartMinute }

    for (const id of oldOnField) {
      if (!newOnField.has(id)) {
        newPlayMinutes[id] = (newPlayMinutes[id] ?? 0) + (minute - (newFieldStartMinute[id] ?? minute))
        delete newFieldStartMinute[id]
      }
    }
    for (const id of newOnField) {
      if (!oldOnField.has(id)) newFieldStartMinute[id] = minute
    }

    updateTeam(activeTeam, { positions: newPos, playMinutes: newPlayMinutes, fieldStartMinute: newFieldStartMinute })
    savePositions(activeTeam, newPos)
    savePlayTime(activeTeam, { playMinutes: newPlayMinutes, fieldStartMinute: newFieldStartMinute })
  }

  // ── Substitution ──────────────────────────────────────────────

  function handleSubstitution(inId, outId) {
    const newLog = [...teamData[activeTeam].subLog, { minute, inId, outId }]
    updateTeam(activeTeam, { subLog: newLog })
    saveSubLog(activeTeam, newLog)
  }

  // ── Reset ─────────────────────────────────────────────────────

  function handleResetOppsett() {
    const newPlayMinutes = { ...playMinutes }
    for (const id of Object.values(positions)) {
      newPlayMinutes[id] = (newPlayMinutes[id] ?? 0) + (minute - (fieldStartMinute[id] ?? minute))
    }
    updateTeam(activeTeam, { positions: {}, playMinutes: newPlayMinutes, fieldStartMinute: {} })
    savePositions(activeTeam, {})
    savePlayTime(activeTeam, { playMinutes: newPlayMinutes, fieldStartMinute: {} })
    setShowResetConfirm(null)
  }

  function handleResetLogg() {
    updateTeam(activeTeam, { subLog: [] })
    saveSubLog(activeTeam, [])
    setShowResetConfirm(null)
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
              <div className="flex gap-2">
                <button
                  onClick={() => setShowResetConfirm('logg')}
                  className="px-3 py-2 rounded-xl bg-gray-800 text-gray-400 text-sm font-bold"
                >
                  Nullstill logg
                </button>
                <button
                  onClick={() => setShowResetConfirm('oppsett')}
                  className="px-3 py-2 rounded-xl bg-gray-800 text-gray-400 text-sm font-bold"
                >
                  Nullstill oppsett
                </button>
              </div>
            </div>

            {showResetConfirm && (
              <div className="bg-red-950 border border-red-700 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                <span className="text-sm text-red-200">
                  {showResetConfirm === 'logg' ? 'Nullstill bytteloggen?' : 'Tøm banen?'}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={showResetConfirm === 'logg' ? handleResetLogg : handleResetOppsett}
                    className="bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-bold"
                  >
                    Ja
                  </button>
                  <button onClick={() => setShowResetConfirm(null)} className="bg-gray-700 text-white px-3 py-2 rounded-lg text-sm">Avbryt</button>
                </div>
              </div>
            )}

            <FormationView
              formation={formation}
              positions={positions}
              squad={squad}
              subLog={subLog}
              minute={minute}
              playMinutes={playMinutes}
              fieldStartMinute={fieldStartMinute}
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

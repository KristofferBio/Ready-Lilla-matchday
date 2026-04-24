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
  }

  function handleResetLogg() {
    updateTeam(activeTeam, { subLog: [] })
    saveSubLog(activeTeam, [])
  }

  function handleResetSpilletid() {
    updateTeam(activeTeam, { playMinutes: {}, fieldStartMinute: {} })
    savePlayTime(activeTeam, { playMinutes: {}, fieldStartMinute: {} })
  }

  return (
    <div className="flex flex-col h-svh bg-gray-950 text-white">

      {/* ── Clock – always visible ── */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex justify-center">
        <MatchClock onMinute={setMinute} />
      </div>

      {/* ── Scrollable content ── */}
      <main className="flex-1 overflow-y-auto pb-8">

        {/* ── Team selector (scrolls away) ── */}
        <div className="bg-gray-900 border-b border-gray-800 flex gap-2 px-4 py-2">
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

        {/* ── Tab bar (scrolls away) ── */}
        <nav className={`border-b border-gray-800 flex ${
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

        {tab === 'kampdag' && (
          <div className="p-3 max-w-sm mx-auto flex flex-col gap-4">

            {/* Formation selector */}
            <div className="flex gap-2">
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
              onResetOppsett={handleResetOppsett}
              onResetLogg={handleResetLogg}
              onResetSpilletid={handleResetSpilletid}
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

import { useState } from 'react'
import MatchClock from './components/MatchClock'
import FormationView from './components/FormationView'
import SquadManager from './components/SquadManager'
import TeamManager from './components/TeamManager'
import TeamSync from './components/TeamSync'
import SyncStatus from './components/SyncStatus'
import { loadTeams, saveTeams, TEAM_COLORS } from './teams'
import { FORMATION_KEYS } from './formations'
import {
  loadSquadLocal, loadFormationLocal, loadPositionsLocal, loadSubLogLocal, loadPlayTimeLocal, loadClockLocal,
  saveMatchData,
} from './storage'
import { saveClockToCloud } from './firebase'

const TABS = [
  { id: 'kampdag', label: 'Kampdag' },
  { id: 'squad',   label: 'Tropp'   },
]

function emptyTeamState(teamId) {
  const pt    = loadPlayTimeLocal(teamId)
  const clock = loadClockLocal(teamId)
  return {
    squad:             loadSquadLocal(teamId),
    formation:         loadFormationLocal(teamId),
    positionsByFormation: loadPositionsLocal(teamId),
    subLog:            loadSubLogLocal(teamId),
    playMinutes:       pt.playMinutes,
    fieldStartMinute:  pt.fieldStartMinute,
    clockRunning:      clock.running,
    clockVirtualStart: clock.virtualStart,
    clockElapsed:      clock.elapsed,
  }
}

export default function App() {
  const [teams, setTeams] = useState(loadTeams)
  const [activeTeam, setActiveTeam] = useState(() => teams[0]?.id ?? null)
  const [manageTeams, setManageTeams] = useState(false)
  const [tab, setTab]               = useState('kampdag')
  const [teamData, setTeamData]     = useState(() => Object.fromEntries(teams.map(t => [t.id, emptyTeamState(t.id)])))
  const [minute, setMinute]         = useState(0)
  const [saveError, setSaveError] = useState('')

  const selectedTeam = teams.find(t => t.id === activeTeam)
  const team = selectedTeam ? { ...selectedTeam, ...TEAM_COLORS[selectedTeam.color] } : null
  const { squad, formation, positionsByFormation, subLog, playMinutes, fieldStartMinute,
          clockRunning, clockVirtualStart, clockElapsed } = teamData[activeTeam] ?? {}
  const positions = positionsByFormation?.[formation] ?? {}

  function handleTeamsChange(nextTeams) {
    saveTeams(nextTeams)
    setTeamData(prev => ({
      ...prev,
      ...Object.fromEntries(nextTeams.filter(t => !prev[t.id]).map(t => [t.id, emptyTeamState(t.id)])),
    }))
    setTeams(nextTeams)
    if (!nextTeams.some(t => t.id === activeTeam)) {
      const nextId = nextTeams[0]?.id ?? null
      setActiveTeam(nextId)
      const nextClock = nextId ? teamData[nextId] : null
      const seconds = nextClock?.clockRunning && nextClock.clockVirtualStart != null
        ? Math.max(0, Math.floor((Date.now() - nextClock.clockVirtualStart) / 1000))
        : nextClock?.clockElapsed ?? 0
      setMinute(Math.floor(seconds / 60))
    }
  }

  function updateTeam(teamId, patch) {
    setTeamData(prev => ({ ...prev, [teamId]: { ...prev[teamId], ...patch } }))
  }

  function persist(save) {
    try { save(); setSaveError(''); return true }
    catch { setSaveError('Kunne ikke lagre endringen på denne enheten. Endringen er ikke utført. Frigjør lagringsplass eller sjekk nettleserens lagring og prøv igjen.'); return false }
  }

  function handleSwitchTeam(event) {
    const teamId = event.currentTarget.dataset.teamId
    setActiveTeam(teamId)
    const { clockRunning: r, clockVirtualStart: vs, clockElapsed: ce } = teamData[teamId]
    const secs = r && vs != null ? Math.floor((Date.now() - vs) / 1000) : ce ?? 0
    setMinute(Math.floor(secs / 60))
  }

  // ── Squad ──────────────────────────────────────────────────────

  function handleSquadChange(newSquad) {
    const ids = new Set(newSquad.map(p => p.id))
    const cleanedPBF = Object.fromEntries(
      Object.entries(positionsByFormation ?? {}).map(([f, pos]) => [
        f,
        Object.fromEntries(Object.entries(pos).filter(([, pid]) => ids.has(pid))),
      ])
    )
    if (!persist(() => saveMatchData(activeTeam, { squad: newSquad, positions: cleanedPBF }))) return
    updateTeam(activeTeam, { squad: newSquad, positionsByFormation: cleanedPBF })
  }

  // ── Formation ─────────────────────────────────────────────────

  function handleFormationChange(f) {
    if (f === formation) return

    const oldOnField = new Set(Object.values(positions))
    const newOnField = new Set(Object.values(positionsByFormation?.[f] ?? {}))

    const newPlayMinutes      = { ...playMinutes }
    const newFieldStartMinute = { ...fieldStartMinute }

    for (const id of oldOnField) {
      if (!newOnField.has(id)) {
        newPlayMinutes[id] = (newPlayMinutes[id] ?? 0) + (minute - (newFieldStartMinute[id] ?? 0))
        delete newFieldStartMinute[id]
      }
    }
    for (const id of newOnField) {
      if (!oldOnField.has(id)) newFieldStartMinute[id] = minute
    }

    if (!persist(() => saveMatchData(activeTeam, { formation: f, playMinutes: newPlayMinutes, fieldStartMinute: newFieldStartMinute }))) return
    updateTeam(activeTeam, { formation: f, playMinutes: newPlayMinutes, fieldStartMinute: newFieldStartMinute })
  }

  // ── Positions ─────────────────────────────────────────────────

  function handlePositionsChange(newPos, substitution = null) {
    const oldOnField = new Set(Object.values(positions))
    const newOnField = new Set(Object.values(newPos))
    const newPlayMinutes      = { ...playMinutes }
    const newFieldStartMinute = { ...fieldStartMinute }

    for (const id of oldOnField) {
      if (!newOnField.has(id)) {
        newPlayMinutes[id] = (newPlayMinutes[id] ?? 0) + (minute - (newFieldStartMinute[id] ?? 0))
        delete newFieldStartMinute[id]
      }
    }
    for (const id of newOnField) {
      if (!oldOnField.has(id)) newFieldStartMinute[id] = minute
    }

    const newPBF = { ...positionsByFormation, [formation]: newPos }
    const newLog = substitution ? [...subLog, { minute, ...substitution }] : subLog
    if (!persist(() => saveMatchData(activeTeam, {
      positions: newPBF, playMinutes: newPlayMinutes,
      fieldStartMinute: newFieldStartMinute, subLog: newLog,
    }))) return
    updateTeam(activeTeam, {
      positionsByFormation: newPBF, playMinutes: newPlayMinutes,
      fieldStartMinute: newFieldStartMinute, subLog: newLog,
    })
  }

  // ── Reset ─────────────────────────────────────────────────────

  function handleResetOppsett() {
    const newPlayMinutes = { ...playMinutes }
    for (const id of Object.values(positions)) {
      newPlayMinutes[id] = (newPlayMinutes[id] ?? 0) + (minute - (fieldStartMinute[id] ?? 0))
    }
    const newPBF = { ...positionsByFormation, [formation]: {} }
    if (!persist(() => saveMatchData(activeTeam, { positions: newPBF, playMinutes: newPlayMinutes, fieldStartMinute: {} }))) return
    updateTeam(activeTeam, { positionsByFormation: newPBF, playMinutes: newPlayMinutes, fieldStartMinute: {} })
  }

  function handleResetSpilletid() {
    if (!persist(() => saveMatchData(activeTeam, { playMinutes: {}, fieldStartMinute: {}, subLog: [] }))) return
    updateTeam(activeTeam, { playMinutes: {}, fieldStartMinute: {}, subLog: [] })
  }

  // ── Clock ─────────────────────────────────────────────────────

  function handleClockStart() {
    const elapsed     = teamData[activeTeam].clockElapsed ?? 0
    const virtualStart = Date.now() - elapsed * 1000
    const state       = { running: true, virtualStart, elapsed }
    if (!persist(() => saveClockToCloud(activeTeam, state))) return
    updateTeam(activeTeam, { clockRunning: true, clockVirtualStart: virtualStart })
  }

  function handleClockPause(currentElapsed) {
    const state = { running: false, virtualStart: null, elapsed: currentElapsed }
    if (!persist(() => saveClockToCloud(activeTeam, state))) return
    updateTeam(activeTeam, { clockRunning: false, clockVirtualStart: null, clockElapsed: currentElapsed })
  }

  function handleClockReset() {
    const state = { running: false, virtualStart: null, elapsed: 0 }
    if (!persist(() => saveClockToCloud(activeTeam, state))) return
    updateTeam(activeTeam, { clockRunning: false, clockVirtualStart: null, clockElapsed: 0 })
    setMinute(0)
  }

  return (
    <div className="app-shell bg-gray-950 text-white">
      {teams.map(t => <TeamSync key={t.id} teamId={t.id} setTeamData={setTeamData} />)}

      {team && <header className="app-header bg-gray-900">
        <div className="clock-bar">
        <MatchClock
          key={activeTeam}
          compact
          running={clockRunning ?? false}
          virtualStart={clockVirtualStart ?? null}
          elapsed={clockElapsed ?? 0}
          onStart={handleClockStart}
          onPause={handleClockPause}
          onReset={handleClockReset}
          onMinute={setMinute}
        />
        </div>
        <nav aria-label="Visning" className={`app-nav ${team.navBg}`}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              aria-current={tab === t.id ? 'page' : undefined}
              className={`flex-1 text-xs font-bold transition-colors ${
                tab === t.id
                  ? `${team.textColor} border-b-2 ${team.borderColor}`
                  : 'text-gray-500'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <SyncStatus teamId={activeTeam} compact />
      </header>}

      <main className={team && tab === 'kampdag' ? 'match-area' : 'squad-area'}>
        {saveError && <div role="alert" className="save-error bg-red-950 border border-red-700 rounded-xl p-3 text-sm text-red-200">
          <p>{saveError}</p>
          <button type="button" onClick={() => setSaveError('')} className="mt-2 rounded bg-red-900 px-3 py-1">Lukk varsel</button>
        </div>}
        {team && tab === 'kampdag' && (
          <div className="match-surface">
            <FormationView
              key={`${activeTeam}-${formation}`}
              formation={formation}
              positions={positions}
              squad={squad}
              subLog={subLog}
              minute={minute}
              playMinutes={playMinutes}
              fieldStartMinute={fieldStartMinute}
              onPositionsChange={handlePositionsChange}
              onResetOppsett={handleResetOppsett}
              onResetSpilletid={handleResetSpilletid}
            />
          </div>
        )}

        {(tab === 'squad' || !team) && <>
          <div className="bg-gray-900 border-b border-gray-800 flex flex-wrap gap-2 px-4 py-2">
            {teams.map(t => (
              <button key={t.id} data-team-id={t.id} onClick={handleSwitchTeam}
                className={`flex-1 py-2 rounded-xl font-bold text-sm ${activeTeam === t.id ? `${TEAM_COLORS[t.color].activeColor} text-white` : 'bg-gray-800 text-gray-400'}`}>
                {t.name}
              </button>
            ))}
            <button type="button" onClick={() => setManageTeams(value => !value)} aria-expanded={manageTeams || !team}
              className="w-full py-2 rounded-lg text-sm text-gray-300 bg-gray-800">
              {manageTeams && team ? 'Lukk lagadministrasjon' : 'Administrer lag'}
            </button>
          </div>
          {(manageTeams || !team) && <TeamManager teams={teams} onTeamsChange={handleTeamsChange} />}
          {team && <>
            <section className="px-4 pt-4 max-w-lg mx-auto" aria-label="Formasjon">
              <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">Formasjon</h2>
              <div className="flex gap-2">
                {FORMATION_KEYS.map(f => (
                  <button key={f} onClick={() => handleFormationChange(f)} aria-pressed={formation === f}
                    className={`flex-1 py-2 rounded-xl font-bold text-sm ${formation === f ? `${team.formBg} text-white` : 'bg-gray-800 text-gray-300'}`}>
                    {f}
                  </button>
                ))}
              </div>
            </section>
            <SquadManager key={activeTeam} squad={squad} onSquadChange={handleSquadChange} />
          </>}
        </>}
      </main>
    </div>
  )
}

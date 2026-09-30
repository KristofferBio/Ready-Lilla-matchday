import { saveToCloud, syncQueue } from './firebase'
import { FORMATION_KEYS } from './formations'

function validFormation(f) {
  return FORMATION_KEYS.includes(f) ? f : FORMATION_KEYS[0]
}

function keys(teamId) {
  return {
    SQUAD:           `kampstotte_${teamId}_squad`,
    FORMATION:       `kampstotte_${teamId}_formation`,
    POSITIONS:       `kampstotte_${teamId}_positions`,
    SUBLOG:          `kampstotte_${teamId}_sublog`,
    PLAY_MINUTES:    `kampstotte_${teamId}_play_minutes`,
    FIELD_START_MIN: `kampstotte_${teamId}_field_start_min`,
  }
}

// ── Local fallbacks ────────────────────────────────────────────

export function loadSubLogLocal(teamId) {
  const pending = syncQueue.snapshot(`teams/${teamId}`)
  if (pending?.subLog !== undefined) return pending.subLog
  try { return JSON.parse(localStorage.getItem(keys(teamId).SUBLOG)) ?? [] } catch { return [] }
}

export function loadPlayTimeLocal(teamId) {
  try {
    const k = keys(teamId)
    const pending = syncQueue.snapshot(`teams/${teamId}`)
    return {
      playMinutes: pending?.playMinutes ?? JSON.parse(localStorage.getItem(k.PLAY_MINUTES)) ?? {},
      fieldStartMinute: pending?.fieldStartMinute ?? JSON.parse(localStorage.getItem(k.FIELD_START_MIN)) ?? {},
    }
  } catch { return { playMinutes: {}, fieldStartMinute: {} } }
}

export function loadSquadLocal(teamId) {
  const pending = syncQueue.snapshot(`teams/${teamId}`)
  if (pending?.squad !== undefined) return pending.squad
  try { return JSON.parse(localStorage.getItem(keys(teamId).SQUAD)) ?? [] } catch { return [] }
}
export function loadFormationLocal(teamId) {
  try { return validFormation(syncQueue.snapshot(`teams/${teamId}`)?.formation ?? localStorage.getItem(keys(teamId).FORMATION)) }
  catch { return FORMATION_KEYS[0] }
}
export function loadPositionsLocal(teamId) {
  const pending = syncQueue.snapshot(`teams/${teamId}`)
  if (pending?.positions !== undefined) return pending.positions
  try { return JSON.parse(localStorage.getItem(keys(teamId).POSITIONS)) ?? {} } catch { return {} }
}

function localMatchSnapshot(teamId) {
  return {
    squad: loadSquadLocal(teamId), formation: loadFormationLocal(teamId),
    positions: loadPositionsLocal(teamId), subLog: loadSubLogLocal(teamId),
    ...loadPlayTimeLocal(teamId),
  }
}

// Only apply fields actually received; absent cloud fields must not reset
// locally stored state. Called only after TeamSync's pending-write guard.
export function cacheTeamFromCloud(teamId, data) {
  syncQueue.cache(`teams/${teamId}`, { ...localMatchSnapshot(teamId), ...data })
  const patch = {}
  for (const field of ['squad', 'subLog', 'playMinutes', 'fieldStartMinute']) {
    if (data[field] !== undefined) patch[field] = data[field]
  }
  if (data.formation !== undefined) patch.formation = validFormation(data.formation)
  if (data.positions !== undefined) patch.positionsByFormation = data.positions
  return patch
}

// ── Save ───────────────────────────────────────────────────────

export function saveMatchData(teamId, data) {
  // One atomic record contains both the local snapshot and the pending patch.
  saveToCloud(teamId, data, localMatchSnapshot(teamId))
}

// ── Clock (per-team, local only — cloud handled via subscribeToClockFromCloud) ──

export function loadClockLocal(teamId) {
  try {
    const saved = syncQueue.snapshot(`clock/${teamId}`) ?? JSON.parse(localStorage.getItem(`kampstotte_${teamId}_clock`))
    if (!saved) return { running: false, elapsed: 0, virtualStart: null }
    const elapsed = saved.running && saved.virtualStart != null
      ? Math.max(0, Math.floor((Date.now() - saved.virtualStart) / 1000))
      : saved.elapsed ?? 0
    if (elapsed >= 50 * 60) {
      localStorage.removeItem(`kampstotte_${teamId}_clock`)
      return { running: false, elapsed: 0, virtualStart: null }
    }
    return { running: saved.running ?? false, elapsed, virtualStart: saved.virtualStart ?? null }
  } catch { return { running: false, elapsed: 0, virtualStart: null } }
}

export function saveClockLocal(teamId, clockState) {
  syncQueue.cache(`clock/${teamId}`, clockState)
}

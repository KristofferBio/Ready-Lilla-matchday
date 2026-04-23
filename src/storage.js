import { loadFromCloud, saveToCloud } from './firebase'
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
  try { return JSON.parse(localStorage.getItem(keys(teamId).SUBLOG)) ?? [] } catch { return [] }
}

export function loadPlayTimeLocal(teamId) {
  try {
    const k = keys(teamId)
    return {
      playMinutes:     JSON.parse(localStorage.getItem(k.PLAY_MINUTES))    ?? {},
      fieldStartMinute: JSON.parse(localStorage.getItem(k.FIELD_START_MIN)) ?? {},
    }
  } catch { return { playMinutes: {}, fieldStartMinute: {} } }
}

export function loadSquadLocal(teamId) {
  try { return JSON.parse(localStorage.getItem(keys(teamId).SQUAD)) ?? [] } catch { return [] }
}
export function loadFormationLocal(teamId) {
  return localStorage.getItem(keys(teamId).FORMATION) ?? '3-3-2'
}
export function loadPositionsLocal(teamId) {
  try { return JSON.parse(localStorage.getItem(keys(teamId).POSITIONS)) ?? {} } catch { return {} }
}

function cacheLocally(teamId, data) {
  const k = keys(teamId)
  if (data.squad           !== undefined) localStorage.setItem(k.SQUAD,           JSON.stringify(data.squad))
  if (data.formation       !== undefined) localStorage.setItem(k.FORMATION,       data.formation)
  if (data.positions       !== undefined) localStorage.setItem(k.POSITIONS,       JSON.stringify(data.positions))
  if (data.subLog          !== undefined) localStorage.setItem(k.SUBLOG,          JSON.stringify(data.subLog))
  if (data.playMinutes     !== undefined) localStorage.setItem(k.PLAY_MINUTES,    JSON.stringify(data.playMinutes))
  if (data.fieldStartMinute !== undefined) localStorage.setItem(k.FIELD_START_MIN, JSON.stringify(data.fieldStartMinute))
}

// ── Cloud load ─────────────────────────────────────────────────

export async function loadAllFromCloud(teamId) {
  const data = await loadFromCloud(teamId)
  if (data) {
    cacheLocally(teamId, data)
    const local = loadPlayTimeLocal(teamId)
    return {
      squad:            data.squad                        ?? loadSquadLocal(teamId),
      formation:        validFormation(data.formation)    ?? loadFormationLocal(teamId),
      positions:        data.positions                    ?? loadPositionsLocal(teamId),
      subLog:           data.subLog                       ?? loadSubLogLocal(teamId),
      playMinutes:      data.playMinutes                  ?? local.playMinutes,
      fieldStartMinute: data.fieldStartMinute             ?? local.fieldStartMinute,
    }
  }
  const local = loadPlayTimeLocal(teamId)
  return {
    squad:            loadSquadLocal(teamId),
    formation:        validFormation(loadFormationLocal(teamId)),
    positions:        loadPositionsLocal(teamId),
    subLog:           loadSubLogLocal(teamId),
    playMinutes:      local.playMinutes,
    fieldStartMinute: local.fieldStartMinute,
  }
}

// ── Save ───────────────────────────────────────────────────────

export function saveSquad(teamId, squad) {
  localStorage.setItem(keys(teamId).SQUAD, JSON.stringify(squad))
  saveToCloud(teamId, { squad })
}

export function saveFormation(teamId, formation) {
  localStorage.setItem(keys(teamId).FORMATION, formation)
  saveToCloud(teamId, { formation })
}

export function savePositions(teamId, positions) {
  localStorage.setItem(keys(teamId).POSITIONS, JSON.stringify(positions))
  saveToCloud(teamId, { positions })
}

export function saveSubLog(teamId, log) {
  localStorage.setItem(keys(teamId).SUBLOG, JSON.stringify(log))
  saveToCloud(teamId, { subLog: log })
}

export function savePlayTime(teamId, { playMinutes, fieldStartMinute }) {
  const k = keys(teamId)
  localStorage.setItem(k.PLAY_MINUTES,    JSON.stringify(playMinutes))
  localStorage.setItem(k.FIELD_START_MIN, JSON.stringify(fieldStartMinute))
  saveToCloud(teamId, { playMinutes, fieldStartMinute })
}

import { loadFromCloud, saveToCloud } from './firebase'

function keys(teamId) {
  return {
    SQUAD:     `kampstotte_${teamId}_squad`,
    FORMATION: `kampstotte_${teamId}_formation`,
    POSITIONS: `kampstotte_${teamId}_positions`,
  }
}

// ── Local fallbacks ────────────────────────────────────────────

export function loadSquadLocal(teamId) {
  try { return JSON.parse(localStorage.getItem(keys(teamId).SQUAD)) ?? [] } catch { return [] }
}
export function loadFormationLocal(teamId) {
  return localStorage.getItem(keys(teamId).FORMATION) ?? '3-2-3'
}
export function loadPositionsLocal(teamId) {
  try { return JSON.parse(localStorage.getItem(keys(teamId).POSITIONS)) ?? {} } catch { return {} }
}

function cacheLocally(teamId, data) {
  const k = keys(teamId)
  if (data.squad     !== undefined) localStorage.setItem(k.SQUAD,     JSON.stringify(data.squad))
  if (data.formation !== undefined) localStorage.setItem(k.FORMATION, data.formation)
  if (data.positions !== undefined) localStorage.setItem(k.POSITIONS, JSON.stringify(data.positions))
}

// ── Cloud load ─────────────────────────────────────────────────

export async function loadAllFromCloud(teamId) {
  const data = await loadFromCloud(teamId)
  if (data) {
    cacheLocally(teamId, data)
    return {
      squad:     data.squad     ?? loadSquadLocal(teamId),
      formation: data.formation ?? loadFormationLocal(teamId),
      positions: data.positions ?? loadPositionsLocal(teamId),
    }
  }
  return {
    squad:     loadSquadLocal(teamId),
    formation: loadFormationLocal(teamId),
    positions: loadPositionsLocal(teamId),
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

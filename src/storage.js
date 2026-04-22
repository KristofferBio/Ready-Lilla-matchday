import { loadFromCloud, saveToCloud } from './firebase'

const KEYS = {
  SQUAD:     'kampstotte_squad',
  FORMATION: 'kampstotte_formation',
  POSITIONS: 'kampstotte_positions',
}

// ── Local (localStorage) ───────────────────────────────────────

export function loadSquadLocal() {
  try { return JSON.parse(localStorage.getItem(KEYS.SQUAD)) ?? [] } catch { return [] }
}
export function loadFormationLocal() {
  return localStorage.getItem(KEYS.FORMATION) ?? '3-2-3'
}
export function loadPositionsLocal() {
  try { return JSON.parse(localStorage.getItem(KEYS.POSITIONS)) ?? {} } catch { return {} }
}

function cacheLocally(data) {
  if (data.squad     !== undefined) localStorage.setItem(KEYS.SQUAD,     JSON.stringify(data.squad))
  if (data.formation !== undefined) localStorage.setItem(KEYS.FORMATION, data.formation)
  if (data.positions !== undefined) localStorage.setItem(KEYS.POSITIONS, JSON.stringify(data.positions))
}

// ── Cloud load (merges with local fallback) ────────────────────

export async function loadAllFromCloud() {
  const data = await loadFromCloud()
  if (data) {
    cacheLocally(data)
    return {
      squad:     data.squad     ?? loadSquadLocal(),
      formation: data.formation ?? loadFormationLocal(),
      positions: data.positions ?? loadPositionsLocal(),
    }
  }
  return {
    squad:     loadSquadLocal(),
    formation: loadFormationLocal(),
    positions: loadPositionsLocal(),
  }
}

// ── Individual save (local + cloud) ───────────────────────────

export function saveSquad(squad) {
  localStorage.setItem(KEYS.SQUAD, JSON.stringify(squad))
  saveToCloud({ squad })
}

export function saveFormation(formation) {
  localStorage.setItem(KEYS.FORMATION, formation)
  saveToCloud({ formation })
}

export function savePositions(positions) {
  localStorage.setItem(KEYS.POSITIONS, JSON.stringify(positions))
  saveToCloud({ positions })
}

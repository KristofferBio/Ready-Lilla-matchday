import { loadSquadFromCloud, saveSquadToCloud } from './firebase'

const KEYS = {
  SQUAD:     'kampstotte_squad',
  FORMATION: 'kampstotte_formation',
  POSITIONS: 'kampstotte_positions',
}

export function loadSquadLocal() {
  try {
    return JSON.parse(localStorage.getItem(KEYS.SQUAD)) ?? []
  } catch {
    return []
  }
}

export async function loadSquad() {
  const cloud = await loadSquadFromCloud()
  if (cloud !== null) {
    localStorage.setItem(KEYS.SQUAD, JSON.stringify(cloud))
    return cloud
  }
  return loadSquadLocal()
}

export function saveSquad(squad) {
  localStorage.setItem(KEYS.SQUAD, JSON.stringify(squad))
  saveSquadToCloud(squad)
}

export function loadFormation() {
  return localStorage.getItem(KEYS.FORMATION) ?? '3-2-3'
}

export function saveFormation(formation) {
  localStorage.setItem(KEYS.FORMATION, formation)
}

export function loadPositions() {
  try {
    return JSON.parse(localStorage.getItem(KEYS.POSITIONS)) ?? {}
  } catch {
    return {}
  }
}

export function savePositions(positions) {
  localStorage.setItem(KEYS.POSITIONS, JSON.stringify(positions))
}

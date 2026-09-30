export const TEAM_COLORS = {
  purple: { label: 'Lilla', activeColor: 'bg-purple-500', textColor: 'text-purple-300', navBg: 'bg-purple-950', borderColor: 'border-purple-400', formBg: 'bg-purple-600' },
  green: { label: 'Grønn', activeColor: 'bg-green-600', textColor: 'text-green-300', navBg: 'bg-green-950', borderColor: 'border-green-400', formBg: 'bg-green-600' },
  blue: { label: 'Blå', activeColor: 'bg-blue-600', textColor: 'text-blue-300', navBg: 'bg-blue-950', borderColor: 'border-blue-400', formBg: 'bg-blue-600' },
  orange: { label: 'Oransje', activeColor: 'bg-orange-600', textColor: 'text-orange-300', navBg: 'bg-orange-950', borderColor: 'border-orange-400', formBg: 'bg-orange-600' },
}

export const DEFAULT_TEAMS = [
  { id: 'ready-lilla', name: 'Ready Lilla', color: 'purple' },
  { id: 'ready-gronn', name: 'Ready Grønn', color: 'green' },
]

const STORAGE_KEY = 'kampstotte_teams'

export function loadTeams() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return DEFAULT_TEAMS
    const teams = JSON.parse(raw)
    if (!Array.isArray(teams)) return DEFAULT_TEAMS
    const ids = new Set()
    return teams.filter(team => {
      if (!team || typeof team.id !== 'string' || !/^[a-z0-9-]+$/.test(team.id) ||
          typeof team.name !== 'string' || !team.name.trim() || ids.has(team.id)) return false
      ids.add(team.id)
      return true
    }).map(team => ({ id: team.id, name: team.name.trim(), color: Object.hasOwn(TEAM_COLORS, team.color) ? team.color : 'purple' }))
  } catch {
    return DEFAULT_TEAMS
  }
}

export function saveTeams(teams) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(teams))
}

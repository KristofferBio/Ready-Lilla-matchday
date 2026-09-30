import { useState } from 'react'
import { TEAM_COLORS } from '../teams'

export default function TeamManager({ teams, onTeamsChange }) {
  const [name, setName] = useState('')
  const [color, setColor] = useState('purple')
  const [removing, setRemoving] = useState(null)
  const [error, setError] = useState('')

  function commit(next) {
    try {
      onTeamsChange(next)
      setError('')
      return true
    } catch {
      setError('Kunne ikke lagre laglisten på mobilen. Prøv igjen eller sjekk nettleserens lagring.')
      return false
    }
  }

  function handleAdd(e) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) { setError('Skriv inn et lagnavn.'); return }
    if (teams.some(team => team.name.toLocaleLowerCase('nb') === trimmed.toLocaleLowerCase('nb'))) {
      setError('Et lag med dette navnet finnes allerede.')
      return
    }
    if (commit([...teams, { id: `team-${crypto.randomUUID()}`, name: trimmed, color }])) setName('')
  }

  return (
    <section className="p-4 max-w-lg mx-auto space-y-4" aria-label="Administrer lag">
      <h2 className="text-xl font-bold">Administrer lag</h2>
      <p className="text-xs text-gray-400">Laglisten lagres på denne enheten. Fjerning sletter ikke lagets kampdata eller data i skyen.</p>
      {teams.length === 0 && <p className="text-gray-300">Ingen lag lagt til. Opprett et lag for å komme i gang.</p>}
      <ul className="space-y-2">
        {teams.map(team => (
          <li key={team.id} className="bg-gray-800 rounded-xl p-3">
            <div className="flex items-center gap-3">
              <span className={`w-4 h-4 rounded-full shrink-0 ${TEAM_COLORS[team.color].activeColor}`} />
              <span className="flex-1 font-bold break-words min-w-0">{team.name}</span>
              <button type="button" onClick={() => setRemoving(team.id)} aria-label={`Fjern ${team.name}`}
                className="bg-red-800 px-3 py-2 rounded-lg text-sm">Fjern</button>
            </div>
            {removing === team.id && (
              <div className="mt-3 space-y-2">
                <p className="text-sm text-red-200">Fjerne {team.name} fra laglisten på denne enheten?</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => { if (commit(teams.filter(t => t.id !== team.id))) setRemoving(null) }}
                    className="bg-red-600 px-3 py-2 rounded-lg text-sm font-bold">Ja, fjern laget</button>
                  <button type="button" onClick={() => setRemoving(null)} className="bg-gray-700 px-3 py-2 rounded-lg text-sm">Avbryt</button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
      <form onSubmit={handleAdd} className="bg-gray-800 rounded-xl p-3 space-y-3">
        <h3 className="font-bold">Nytt lag</h3>
        <label className="block text-sm">
          Lagnavn
          <input value={name} onChange={e => setName(e.target.value)} maxLength={60} required
            placeholder="For eksempel Ready Blå"
            className="mt-1 w-full bg-gray-700 rounded-lg px-3 py-2 text-white" />
        </label>
        <label className="block text-sm">
          Lagfarge
          <select value={color} onChange={e => setColor(e.target.value)} className="mt-1 w-full bg-gray-700 rounded-lg px-3 py-2 text-white">
            {Object.entries(TEAM_COLORS).map(([id, theme]) => <option key={id} value={id}>{theme.label}</option>)}
          </select>
        </label>
        <button type="submit" className="w-full bg-blue-700 rounded-lg py-3 font-bold">+ Legg til lag</button>
      </form>
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
    </section>
  )
}

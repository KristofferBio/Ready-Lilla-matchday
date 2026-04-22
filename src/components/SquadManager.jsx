import { useState } from 'react'

export default function SquadManager({ squad, onSquadChange }) {
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ number: '', name: '' })
  const [addMode, setAddMode] = useState(false)
  const [newForm, setNewForm] = useState({ number: '', name: '' })

  function startEdit(player) {
    setEditing(player.id)
    setForm({ number: player.number, name: player.name })
  }

  function saveEdit() {
    if (!form.number || !form.name.trim()) return
    onSquadChange(squad.map(p =>
      p.id === editing ? { ...p, number: Number(form.number), name: form.name.trim() } : p
    ))
    setEditing(null)
  }

  function deletePlayer(id) {
    onSquadChange(squad.filter(p => p.id !== id))
  }

  function addPlayer() {
    if (!newForm.number || !newForm.name.trim()) return
    if (squad.length >= 15) return
    const player = {
      id: Date.now().toString(),
      number: Number(newForm.number),
      name: newForm.name.trim(),
    }
    onSquadChange([...squad, player])
    setNewForm({ number: '', name: '' })
    setAddMode(false)
  }

  const sorted = [...squad].sort((a, b) => a.number - b.number)

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h2 className="text-xl font-bold mb-4 text-white">Spillerstamme ({squad.length}/15)</h2>

      <div className="space-y-2 mb-4">
        {sorted.map(player => (
          <div key={player.id} className="bg-gray-800 rounded-xl p-3 flex items-center gap-3">
            {editing === player.id ? (
              <>
                <input
                  type="number"
                  value={form.number}
                  onChange={e => setForm(f => ({ ...f, number: e.target.value }))}
                  className="w-16 bg-gray-700 text-white rounded-lg px-2 py-2 text-center text-lg font-bold"
                  min="1" max="99"
                />
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="flex-1 bg-gray-700 text-white rounded-lg px-3 py-2 text-lg"
                  placeholder="Fornavn"
                  onKeyDown={e => e.key === 'Enter' && saveEdit()}
                  autoFocus
                />
                <button onClick={saveEdit} className="bg-green-600 text-white px-3 py-2 rounded-lg font-bold">OK</button>
                <button onClick={() => setEditing(null)} className="bg-gray-600 text-white px-3 py-2 rounded-lg">Avbryt</button>
              </>
            ) : (
              <>
                <span className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white text-lg">
                  {player.number}
                </span>
                <span className="flex-1 text-white text-lg font-medium">{player.name}</span>
                <button onClick={() => startEdit(player)} className="bg-gray-700 text-white px-3 py-2 rounded-lg text-sm">Rediger</button>
                <button onClick={() => deletePlayer(player.id)} className="bg-red-800 text-white px-3 py-2 rounded-lg text-sm">Slett</button>
              </>
            )}
          </div>
        ))}
      </div>

      {addMode ? (
        <div className="bg-gray-800 rounded-xl p-3 flex items-center gap-3">
          <input
            type="number"
            value={newForm.number}
            onChange={e => setNewForm(f => ({ ...f, number: e.target.value }))}
            className="w-16 bg-gray-700 text-white rounded-lg px-2 py-2 text-center text-lg font-bold"
            placeholder="#"
            min="1" max="99"
            autoFocus
          />
          <input
            type="text"
            value={newForm.name}
            onChange={e => setNewForm(f => ({ ...f, name: e.target.value }))}
            className="flex-1 bg-gray-700 text-white rounded-lg px-3 py-2 text-lg"
            placeholder="Fornavn"
            onKeyDown={e => e.key === 'Enter' && addPlayer()}
          />
          <button onClick={addPlayer} className="bg-green-600 text-white px-3 py-2 rounded-lg font-bold">Legg til</button>
          <button onClick={() => setAddMode(false)} className="bg-gray-600 text-white px-3 py-2 rounded-lg">Avbryt</button>
        </div>
      ) : (
        squad.length < 15 && (
          <button
            onClick={() => setAddMode(true)}
            className="w-full py-3 rounded-xl bg-blue-700 text-white font-bold text-lg"
          >
            + Legg til spiller
          </button>
        )
      )}
    </div>
  )
}

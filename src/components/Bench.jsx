export default function Bench({ squad, positions, onDragStart, pendingSub, onSelectSub }) {
  const onField = new Set(Object.values(positions))
  const bench = squad.filter(p => !onField.has(p.id)).sort((a, b) => a.number - b.number)

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-3">
        Benk ({bench.length})
      </h3>
      {bench.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-4">Alle spillere er på banen</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {bench.map(player => (
            <div
              key={player.id}
              draggable
              onDragStart={() => onDragStart(player.id)}
              onClick={() => pendingSub && onSelectSub(player.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl cursor-grab active:cursor-grabbing transition-colors ${
                pendingSub
                  ? 'bg-green-700 border-2 border-green-400 text-white'
                  : 'bg-gray-800 border border-gray-700 text-white'
              }`}
            >
              <span className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-sm">
                {player.number}
              </span>
              <span className="font-medium">{player.name}</span>
            </div>
          ))}
        </div>
      )}

      {pendingSub && (
        <p className="mt-3 text-green-400 text-sm font-medium animate-pulse">
          Trykk på en spiller fra benken for å fullføre byttet
        </p>
      )}
    </div>
  )
}
